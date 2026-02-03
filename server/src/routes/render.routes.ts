/**
 * Routes for client-side rendered PDF pages
 * Receives base64 images from client and stores them
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { jobs } from './upload.routes';

const router = Router();

// Receive rendered page images from client
router.post('/pages/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { pages, title } = req.body;

    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    try {
        const outputDir = path.join(__dirname, '../../uploads/output', jobId);
        const pagesDir = path.join(outputDir, 'pages');
        const assetsDir = path.join(outputDir, 'assets');

        fs.mkdirSync(pagesDir, { recursive: true });
        fs.mkdirSync(assetsDir, { recursive: true });

        // Save each page as image and create HTML wrapper
        for (let i = 0; i < pages.length; i++) {
            const pageData = pages[i];
            const pageNum = i + 1;

            // Save image
            const imageData = pageData.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(imageData, 'base64');
            const imageName = `page${pageNum}.png`;
            fs.writeFileSync(path.join(assetsDir, imageName), imageBuffer);

            // Create HTML wrapper for page
            const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'Page'} - Page ${pageNum}</title>
  <link rel="stylesheet" href="../assets/styles.css">
  <style>
    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
    .page-container { max-width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .page-container img { display: block; max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="page-container" data-page="${pageNum}">
    <img src="../assets/${imageName}" alt="Page ${pageNum}" />
  </div>
</body>
</html>`;

            const pdfName = job.originalName?.replace('.pdf', '') || 'document';
            fs.writeFileSync(path.join(pagesDir, `${pdfName}${pageNum}.html`), pageHtml);
        }

        // Create basic CSS
        const basicCss = `
.pdf-page {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}
.page-container {
  background: white;
}
.page-container img {
  display: block;
  width: 100%;
  height: auto;
}
`;
        fs.writeFileSync(path.join(assetsDir, 'styles.css'), basicCss);

        // Update job status
        job.status = 'completed';
        job.pageCount = pages.length;
        job.title = title;

        res.json({
            success: true,
            pageCount: pages.length,
            message: 'Pages saved successfully'
        });
    } catch (error: any) {
        console.error('Error saving pages:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
