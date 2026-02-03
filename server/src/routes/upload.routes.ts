import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads/pdfs');
const previewDir = path.join(__dirname, '../../uploads/previews');
const outputDir = path.join(__dirname, '../../uploads/output');

[uploadDir, previewDir, outputDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const jobId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${jobId}${ext}`);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB default
    }
});

// Store job information in memory (in production, use Redis or DB)
const jobs: Map<string, {
    id: string;
    originalName: string;
    filePath: string;
    status: 'uploaded' | 'processing' | 'completed' | 'failed';
    pageCount?: number;
    title?: string;
    error?: string;
    createdAt: Date;
    outputPath?: string;
}> = new Map();

// Upload PDF endpoint
router.post('/', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const jobId = path.basename(req.file.filename, path.extname(req.file.filename));

        const jobInfo = {
            id: jobId,
            originalName: req.file.originalname,
            filePath: req.file.path,
            status: 'uploaded' as const,
            createdAt: new Date()
        };

        jobs.set(jobId, jobInfo);

        res.json({
            success: true,
            jobId,
            originalName: req.file.originalname,
            size: req.file.size,
            message: 'PDF uploaded successfully. Ready for conversion.'
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get job status
router.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
});

// Serve PDF file for client-side rendering
router.get('/file/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (!fs.existsSync(job.filePath)) {
        return res.status(404).json({ error: 'PDF file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${job.originalName}"`);
    fs.createReadStream(job.filePath).pipe(res);
});

// Get all jobs
router.get('/jobs', (req, res) => {
    const jobList = Array.from(jobs.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(jobList);
});

// Delete a job and its files
router.delete('/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    try {
        // Delete PDF file
        if (fs.existsSync(job.filePath)) {
            fs.unlinkSync(job.filePath);
        }

        // Delete output directory if exists
        const jobOutputDir = path.join(outputDir, jobId);
        if (fs.existsSync(jobOutputDir)) {
            fs.rmSync(jobOutputDir, { recursive: true });
        }

        jobs.delete(jobId);
        res.json({ success: true, message: 'Job deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export { jobs };
export default router;
