import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Optimize all images in the output directory
 * Converts to WebP format and compresses for web performance
 */
export async function optimizeImages(outputDir: string): Promise<void> {
    const assetsDir = path.join(outputDir, 'assets');

    if (!fs.existsSync(assetsDir)) {
        return;
    }

    const files = fs.readdirSync(assetsDir);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif'];

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();

        if (!imageExtensions.includes(ext)) {
            continue;
        }

        const inputPath = path.join(assetsDir, file);
        const outputPath = path.join(assetsDir, `${path.basename(file, ext)}.webp`);

        try {
            await sharp(inputPath)
                .webp({ quality: 85 })
                .toFile(outputPath);

            // Remove original file after successful conversion
            fs.unlinkSync(inputPath);

            console.log(`Optimized: ${file} -> ${path.basename(outputPath)}`);
        } catch (error) {
            console.error(`Failed to optimize ${file}:`, error);
            // Keep original file if optimization fails
        }
    }
}

/**
 * Generate thumbnail for PDF preview
 */
export async function generateThumbnail(imagePath: string, outputPath: string, size: number = 300): Promise<string> {
    try {
        await sharp(imagePath)
            .resize(size, size, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({ quality: 80 })
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        console.error('Thumbnail generation failed:', error);
        throw error;
    }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
    const metadata = await sharp(imagePath).metadata();
    return {
        width: metadata.width || 0,
        height: metadata.height || 0
    };
}
