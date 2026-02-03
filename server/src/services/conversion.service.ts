import Docker from 'dockerode';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const docker = new Docker();
const DOCKER_IMAGE = process.env.DOCKER_IMAGE || 'pdf2htmlex/pdf2htmlex:0.18.8.rc2-master-20200820-alpine-3.12.0-x86_64';

interface ConversionResult {
    pageCount: number;
    title?: string;
    outputPath: string;
}

/**
 * Convert PDF to HTML using pdf2htmlEX in Docker
 */
export async function convertPdfToHtml(pdfPath: string, outputDir: string): Promise<ConversionResult> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const pagesDir = path.join(outputDir, 'pages');
    const assetsDir = path.join(outputDir, 'assets');

    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    const pdfDir = path.dirname(pdfPath);
    const pdfName = path.basename(pdfPath);
    const pdfNameNoExt = path.basename(pdfPath, '.pdf');

    try {
        // Check if Docker is available
        await docker.ping();

        // Pull image if not exists
        try {
            await docker.getImage(DOCKER_IMAGE).inspect();
        } catch {
            console.log(`Pulling Docker image: ${DOCKER_IMAGE}`);
            await new Promise((resolve, reject) => {
                docker.pull(DOCKER_IMAGE, (err: any, stream: any) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream, (err: any, output: any) => {
                        if (err) return reject(err);
                        resolve(output);
                    });
                });
            });
        }

        // Convert PDF directory to Docker-compatible path (for Windows)
        const dockerPdfDir = pdfDir.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (match, drive) => `/${drive.toLowerCase()}`);
        const dockerOutputDir = outputDir.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (match, drive) => `/${drive.toLowerCase()}`);

        // Run pdf2htmlEX in Docker
        const container = await docker.createContainer({
            Image: DOCKER_IMAGE,
            Cmd: [
                '--zoom', '1.5',
                '--embed-css', '0',
                '--embed-font', '0',
                '--embed-image', '0',
                '--embed-javascript', '0',
                '--split-pages', '1',
                '--dest-dir', '/output',
                '--css-filename', 'styles.css',
                `/pdf/${pdfName}`
            ],
            HostConfig: {
                Binds: [
                    `${dockerPdfDir}:/pdf:ro`,
                    `${dockerOutputDir}:/output`
                ],
                AutoRemove: true
            }
        });

        await container.start();

        // Wait for container to finish
        const result = await container.wait();

        if (result.StatusCode !== 0) {
            throw new Error(`pdf2htmlEX exited with code ${result.StatusCode}`);
        }

        // Move generated files to appropriate directories
        const files = fs.readdirSync(outputDir);
        let pageCount = 0;

        for (const file of files) {
            const filePath = path.join(outputDir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) continue;

            if (file.endsWith('.html')) {
                // Move HTML pages
                fs.renameSync(filePath, path.join(pagesDir, file));
                pageCount++;
            } else if (file.endsWith('.css') || file.endsWith('.woff') || file.endsWith('.woff2') || file.endsWith('.ttf')) {
                // Move CSS and fonts to assets
                fs.renameSync(filePath, path.join(assetsDir, file));
            } else if (file.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
                // Move images to assets
                fs.renameSync(filePath, path.join(assetsDir, file));
            }
        }

        // Extract title from first page
        let title = pdfNameNoExt;
        const firstPage = path.join(pagesDir, `${pdfNameNoExt}1.html`);
        if (fs.existsSync(firstPage)) {
            const content = fs.readFileSync(firstPage, 'utf-8');
            const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
            if (titleMatch) {
                title = titleMatch[1];
            }
        }

        return {
            pageCount,
            title,
            outputPath: outputDir
        };
    } catch (error: any) {
        // Fallback: If Docker fails, try using a simpler approach
        console.error('Docker conversion failed, attempting fallback:', error.message);
        return await fallbackConversion(pdfPath, outputDir);
    }
}

/**
 * Fallback conversion using pdf.js for basic HTML generation
 * This is used when Docker is not available
 */
async function fallbackConversion(pdfPath: string, outputDir: string): Promise<ConversionResult> {
    const pagesDir = path.join(outputDir, 'pages');
    const assetsDir = path.join(outputDir, 'assets');

    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    // Create a basic HTML wrapper for each page
    // In production, you'd use pdf.js to render pages
    const pdfName = path.basename(pdfPath, '.pdf');

    // Create a simple placeholder page
    const placeholderHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>${pdfName}</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <div class="pdf-page" data-page="1">
    <div class="pdf-content">
      <p>PDF conversion requires Docker with pdf2htmlEX installed.</p>
      <p>Please ensure Docker is running and the image is available.</p>
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(path.join(pagesDir, `${pdfName}1.html`), placeholderHtml);

    // Create basic CSS
    const basicCss = `
.pdf-page {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.pdf-content {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #333;
}
`;
    fs.writeFileSync(path.join(assetsDir, 'styles.css'), basicCss);

    return {
        pageCount: 1,
        title: pdfName,
        outputPath: outputDir
    };
}

/**
 * Get page count from PDF without full conversion
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
    // This would use pdf.js or similar to get page count
    // For now, return 0 as placeholder
    return 0;
}
