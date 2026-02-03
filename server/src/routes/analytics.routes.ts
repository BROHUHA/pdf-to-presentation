/**
 * Analytics API Routes
 * Handles analytics webhook and dashboard data
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { calculateDocumentAnalytics } from '../services/analytics.service';

const router = Router();
const ANALYTICS_DIR = path.join(__dirname, '../../data/analytics');

// Ensure analytics directory exists
if (!fs.existsSync(ANALYTICS_DIR)) {
    fs.mkdirSync(ANALYTICS_DIR, { recursive: true });
}

// Webhook to receive analytics events
router.post('/webhook', (req, res) => {
    const { documentId, sessionId, events } = req.body;

    if (!documentId || !events) {
        return res.status(400).json({ error: 'documentId and events are required' });
    }

    try {
        const analyticsFile = path.join(ANALYTICS_DIR, `${documentId}.json`);

        let existingData: any[] = [];
        if (fs.existsSync(analyticsFile)) {
            existingData = JSON.parse(fs.readFileSync(analyticsFile, 'utf-8'));
        }

        // Add new events with session info
        const newEvents = events.map((event: any) => ({
            ...event,
            sessionId,
            receivedAt: new Date().toISOString()
        }));

        existingData.push(...newEvents);

        // Keep only last 10000 events to prevent file from growing too large
        if (existingData.length > 10000) {
            existingData = existingData.slice(-10000);
        }

        fs.writeFileSync(analyticsFile, JSON.stringify(existingData, null, 2));

        res.json({ success: true, eventsRecorded: events.length });
    } catch (error: any) {
        console.error('Analytics webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get analytics for a document
router.get('/:documentId', (req, res) => {
    const { documentId } = req.params;
    const analyticsFile = path.join(ANALYTICS_DIR, `${documentId}.json`);

    if (!fs.existsSync(analyticsFile)) {
        return res.json({
            documentId,
            totalViews: 0,
            uniqueVisitors: 0,
            avgPagesViewed: 0,
            dropOffPage: 0,
            topPages: [],
            conversionRate: 0
        });
    }

    try {
        const events = JSON.parse(fs.readFileSync(analyticsFile, 'utf-8'));
        const analytics = calculateDocumentAnalytics(events);
        analytics.documentId = documentId;

        res.json(analytics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get analytics summary for all documents (dashboard)
router.get('/', (req, res) => {
    try {
        const files = fs.readdirSync(ANALYTICS_DIR).filter(f => f.endsWith('.json'));

        const summary = files.map(file => {
            const documentId = file.replace('.json', '');
            const filePath = path.join(ANALYTICS_DIR, file);
            const events = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            const analytics = calculateDocumentAnalytics(events);
            analytics.documentId = documentId;

            return analytics;
        });

        res.json({ documents: summary });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Clear analytics for a document
router.delete('/:documentId', (req, res) => {
    const { documentId } = req.params;
    const analyticsFile = path.join(ANALYTICS_DIR, `${documentId}.json`);

    if (fs.existsSync(analyticsFile)) {
        fs.unlinkSync(analyticsFile);
    }

    res.json({ success: true, message: 'Analytics cleared' });
});

export default router;
