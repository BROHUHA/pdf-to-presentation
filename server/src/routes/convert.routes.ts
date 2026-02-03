import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { jobs } from './upload.routes';
import { convertPdfToHtml } from '../services/conversion.service';
import { optimizeImages } from '../services/image.service';

const router = Router();

// Start conversion
router.post('/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'processing') {
        return res.status(400).json({ error: 'Job is already being processed' });
    }

    if (job.status === 'completed') {
        return res.status(400).json({ error: 'Job has already been converted' });
    }

    try {
        // Update status to processing
        job.status = 'processing';
        jobs.set(jobId, job);

        // Start conversion in background
        res.json({
            success: true,
            message: 'Conversion started',
            jobId
        });

        // Perform conversion
        const outputDir = path.join(__dirname, '../../uploads/output', jobId);

        const result = await convertPdfToHtml(job.filePath, outputDir);

        // Optimize images
        await optimizeImages(outputDir);

        // Update job with results
        job.status = 'completed';
        job.pageCount = result.pageCount;
        job.title = result.title || path.basename(job.originalName, '.pdf');
        job.outputPath = outputDir;
        jobs.set(jobId, job);

        console.log(`Job ${jobId} completed successfully`);
    } catch (error: any) {
        console.error(`Conversion failed for job ${jobId}:`, error);
        job.status = 'failed';
        job.error = error.message;
        jobs.set(jobId, job);
    }
});

// Get conversion preview data
router.get('/preview/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
        return res.status(400).json({
            error: 'Job not completed yet',
            status: job.status
        });
    }

    const outputDir = path.join(__dirname, '../../uploads/output', jobId);

    try {
        // Read the pages info
        const pagesDir = path.join(outputDir, 'pages');
        const pages: string[] = [];

        if (fs.existsSync(pagesDir)) {
            const files = fs.readdirSync(pagesDir)
                .filter(f => f.endsWith('.html'))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                    return numA - numB;
                });

            files.forEach(file => {
                pages.push(`/output/${jobId}/pages/${file}`);
            });
        }

        res.json({
            jobId,
            title: job.title,
            pageCount: job.pageCount,
            pages,
            assetsPath: `/output/${jobId}/assets`
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
