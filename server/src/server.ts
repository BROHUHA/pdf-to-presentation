import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import uploadRoutes from './routes/upload.routes';
import convertRoutes from './routes/convert.routes';
import exportRoutes from './routes/export.routes';
import aiRoutes from './routes/ai.routes';
import projectRoutes from './routes/project.routes';
import analyticsRoutes from './routes/analytics.routes';
import renderRoutes from './routes/render.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: true, // Allow all origins for client-side rendering to work
    credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static files for previews
app.use('/previews', express.static(path.join(__dirname, '../uploads/previews')));
app.use('/output', express.static(path.join(__dirname, '../uploads/output')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/convert', convertRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/render', renderRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
