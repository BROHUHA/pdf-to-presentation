import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { jobs } from './upload.routes';
import { generateTemplate } from '../services/template.service';
import { deployToVercel, updateVercelDeployment } from '../services/vercel.service';

const router = Router();

// Generate final HTML with selected template
router.post('/generate/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const {
        template = 'presentation',
        hotspots = [],
        leadGen = { enabled: false, freePages: 3 },
        title,
        customCss,
        pageCount: requestedPageCount
    } = req.body;

    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Job not ready for export' });
    }

    try {
        const outputDir = path.join(__dirname, '../../uploads/output', jobId);
        const assetsDir = path.join(outputDir, 'assets');

        // Determine page count: use request body, then job data, then auto-detect from files
        let finalPageCount = requestedPageCount || job.pageCount;

        // Auto-detect from files if still not set or equals 1
        if (!finalPageCount || finalPageCount === 1) {
            if (fs.existsSync(assetsDir)) {
                const pageImages = fs.readdirSync(assetsDir).filter(f => f.match(/^page\d+\.png$/));
                if (pageImages.length > 0) {
                    finalPageCount = pageImages.length;
                    console.log(`Auto-detected ${finalPageCount} pages from assets folder`);
                }
            }
        }

        // Fallback to 1 if nothing found
        finalPageCount = finalPageCount || 1;

        await generateTemplate({
            jobId,
            outputDir,
            template,
            title: title || job.title || 'Presentation',
            pageCount: finalPageCount,
            hotspots,
            leadGen,
            customCss
        });

        res.json({
            success: true,
            message: 'Template generated successfully',
            previewUrl: `/output/${jobId}/index.html`,
            pageCount: finalPageCount
        });
    } catch (error: any) {
        console.error('Template generation failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download as ZIP
router.get('/download/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Job not ready for download' });
    }

    const outputDir = path.join(__dirname, '../../uploads/output', jobId);
    const indexPath = path.join(outputDir, 'index.html');

    if (!fs.existsSync(indexPath)) {
        return res.status(400).json({
            error: 'Template not generated yet. Generate template first.'
        });
    }

    try {
        const zipFilename = `${job.title || 'presentation'}-${jobId.slice(0, 8)}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(res);

        // Add all files from output directory
        archive.directory(outputDir, false);

        await archive.finalize();
    } catch (error: any) {
        console.error('ZIP creation failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deploy to Vercel
router.post('/deploy/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { projectName, projectId } = req.body;

    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Job not ready for deployment' });
    }

    const outputDir = path.join(__dirname, '../../uploads/output', jobId);
    const indexPath = path.join(outputDir, 'index.html');

    if (!fs.existsSync(indexPath)) {
        return res.status(400).json({
            error: 'Template not generated yet. Generate template first.'
        });
    }

    try {
        let deployResult;

        // If projectId provided, update existing deployment (version control)
        if (projectId) {
            deployResult = await updateVercelDeployment(projectId, outputDir);
        } else {
            deployResult = await deployToVercel(outputDir, projectName || job.title);
        }

        res.json({
            success: true,
            ...deployResult
        });
    } catch (error: any) {
        console.error('Vercel deployment failed:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
