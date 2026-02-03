/**
 * AI API Routes
 * Handles AI chat, search, and mobile reflow features
 */

import { Router } from 'express';
import path from 'path';
import { jobs } from './upload.routes';
import {
    extractTextFromPages,
    askPdfQuestion,
    searchPdfContent,
    generateReflowContent,
    isAiConfigured
} from '../services/ai.service';

const router = Router();

// Check AI availability
router.get('/status', (req, res) => {
    res.json({
        available: isAiConfigured(),
        features: {
            chat: isAiConfigured(),
            search: true, // Basic search works without AI
            reflow: isAiConfigured()
        }
    });
});

// Chat with PDF (Ask this PDF)
router.post('/chat/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { question, history = [] } = req.body;

    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    const job = jobs.get(jobId);
    if (!job || job.status !== 'completed') {
        return res.status(404).json({ error: 'Job not found or not ready' });
    }

    try {
        const pagesDir = path.join(__dirname, '../../uploads/output', jobId, 'pages');
        const pageContents = extractTextFromPages(pagesDir);

        if (pageContents.length === 0) {
            return res.status(400).json({ error: 'No content extracted from PDF' });
        }

        const result = await askPdfQuestion(question, pageContents, history);

        res.json({
            success: true,
            answer: result.answer,
            relevantPages: result.relevantPages,
            highlights: result.highlights
        });
    } catch (error: any) {
        console.error('AI chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search PDF content
router.get('/search/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
    }

    const job = jobs.get(jobId);
    if (!job || job.status !== 'completed') {
        return res.status(404).json({ error: 'Job not found or not ready' });
    }

    try {
        const pagesDir = path.join(__dirname, '../../uploads/output', jobId, 'pages');
        const pageContents = extractTextFromPages(pagesDir);
        const results = searchPdfContent(q, pageContents);

        res.json({
            success: true,
            query: q,
            results
        });
    } catch (error: any) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate mobile reflow content
router.post('/reflow/:jobId', async (req, res) => {
    const { jobId } = req.params;

    const job = jobs.get(jobId);
    if (!job || job.status !== 'completed') {
        return res.status(404).json({ error: 'Job not found or not ready' });
    }

    try {
        const pagesDir = path.join(__dirname, '../../uploads/output', jobId, 'pages');
        const pageContents = extractTextFromPages(pagesDir);
        const reflowedContent = await generateReflowContent(pageContents);

        res.json({
            success: true,
            pages: reflowedContent
        });
    } catch (error: any) {
        console.error('Reflow error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
