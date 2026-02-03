/**
 * Project API Routes
 * Handles project CRUD and version control
 */

import { Router } from 'express';
import {
    createProject,
    getProject,
    listProjects,
    updateProjectVersion,
    updateProjectDeployment,
    updateProjectSettings,
    deleteProject,
    getProjectVersions
} from '../services/project.service';

const router = Router();

// List all projects
router.get('/', (req, res) => {
    const projects = listProjects();
    res.json({ projects });
});

// Get project by ID
router.get('/:projectId', (req, res) => {
    const { projectId } = req.params;
    const project = getProject(projectId);

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
});

// Create new project
router.post('/', (req, res) => {
    const { name, jobId, settings } = req.body;

    if (!name || !jobId) {
        return res.status(400).json({ error: 'Name and jobId are required' });
    }

    try {
        const project = createProject(name, jobId, settings || {
            template: 'presentation',
            leadGen: { enabled: false, freePages: 3 },
            seoEnabled: true,
            analyticsEnabled: true,
            reflowEnabled: false
        });

        res.status(201).json({ success: true, project });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update project with new version (re-upload)
router.post('/:projectId/versions', (req, res) => {
    const { projectId } = req.params;
    const { jobId, changeDescription } = req.body;

    if (!jobId) {
        return res.status(400).json({ error: 'jobId is required' });
    }

    const project = updateProjectVersion(projectId, jobId, changeDescription);

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
        success: true,
        message: 'Project updated - URL remains the same',
        project
    });
});

// Get project version history
router.get('/:projectId/versions', (req, res) => {
    const { projectId } = req.params;
    const versions = getProjectVersions(projectId);

    res.json({ versions });
});

// Update project deployment info
router.put('/:projectId/deployment', (req, res) => {
    const { projectId } = req.params;
    const { vercelProjectId, vercelDeploymentUrl } = req.body;

    const project = updateProjectDeployment(projectId, vercelProjectId, vercelDeploymentUrl);

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, project });
});

// Update project settings
router.put('/:projectId/settings', (req, res) => {
    const { projectId } = req.params;
    const settings = req.body;

    const project = updateProjectSettings(projectId, settings);

    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, project });
});

// Delete project
router.delete('/:projectId', (req, res) => {
    const { projectId } = req.params;
    const deleted = deleteProject(projectId);

    if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, message: 'Project deleted' });
});

export default router;
