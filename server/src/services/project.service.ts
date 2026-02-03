/**
 * Project Storage Service for Version Control
 * Manages persistent project data for live-link updating
 */

import fs from 'fs';
import path from 'path';

const PROJECTS_FILE = path.join(__dirname, '../../data/projects.json');

interface ProjectVersion {
    versionId: string;
    uploadedAt: string;
    changeDescription?: string;
}

interface Project {
    id: string;
    name: string;
    slug: string;
    vercelProjectId?: string;
    vercelDeploymentUrl?: string;
    currentJobId: string;
    createdAt: string;
    updatedAt: string;
    versions: ProjectVersion[];
    settings: {
        template: string;
        leadGen: { enabled: boolean; freePages: number };
        seoEnabled: boolean;
        analyticsEnabled: boolean;
        reflowEnabled: boolean;
    };
}

interface ProjectsData {
    projects: Project[];
}

/**
 * Ensure data directory exists
 */
function ensureDataDir(): void {
    const dataDir = path.dirname(PROJECTS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(PROJECTS_FILE)) {
        fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects: [] }, null, 2));
    }
}

/**
 * Load all projects
 */
export function loadProjects(): Project[] {
    ensureDataDir();
    try {
        const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
        const parsed = JSON.parse(data) as ProjectsData;
        return parsed.projects || [];
    } catch {
        return [];
    }
}

/**
 * Save all projects
 */
function saveProjects(projects: Project[]): void {
    ensureDataDir();
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2));
}

/**
 * Create a new project
 */
export function createProject(
    name: string,
    jobId: string,
    settings: Project['settings']
): Project {
    const projects = loadProjects();

    // Generate unique slug
    const baseSlug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);

    let slug = baseSlug;
    let counter = 1;
    while (projects.some(p => p.slug === slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    const project: Project = {
        id: `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        slug,
        currentJobId: jobId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [{
            versionId: `v1_${Date.now().toString(36)}`,
            uploadedAt: new Date().toISOString(),
            changeDescription: 'Initial version'
        }],
        settings
    };

    projects.push(project);
    saveProjects(projects);

    return project;
}

/**
 * Update project with new version (re-upload)
 */
export function updateProjectVersion(
    projectId: string,
    newJobId: string,
    changeDescription?: string
): Project | null {
    const projects = loadProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return null;
    }

    project.currentJobId = newJobId;
    project.updatedAt = new Date().toISOString();
    project.versions.push({
        versionId: `v${project.versions.length + 1}_${Date.now().toString(36)}`,
        uploadedAt: new Date().toISOString(),
        changeDescription
    });

    saveProjects(projects);
    return project;
}

/**
 * Update project deployment info
 */
export function updateProjectDeployment(
    projectId: string,
    vercelProjectId: string,
    vercelDeploymentUrl: string
): Project | null {
    const projects = loadProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return null;
    }

    project.vercelProjectId = vercelProjectId;
    project.vercelDeploymentUrl = vercelDeploymentUrl;
    project.updatedAt = new Date().toISOString();

    saveProjects(projects);
    return project;
}

/**
 * Get project by ID
 */
export function getProject(projectId: string): Project | null {
    const projects = loadProjects();
    return projects.find(p => p.id === projectId) || null;
}

/**
 * Get project by slug
 */
export function getProjectBySlug(slug: string): Project | null {
    const projects = loadProjects();
    return projects.find(p => p.slug === slug) || null;
}

/**
 * Delete a project
 */
export function deleteProject(projectId: string): boolean {
    const projects = loadProjects();
    const index = projects.findIndex(p => p.id === projectId);

    if (index === -1) {
        return false;
    }

    projects.splice(index, 1);
    saveProjects(projects);
    return true;
}

/**
 * Update project settings
 */
export function updateProjectSettings(
    projectId: string,
    settings: Partial<Project['settings']>
): Project | null {
    const projects = loadProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return null;
    }

    project.settings = { ...project.settings, ...settings };
    project.updatedAt = new Date().toISOString();

    saveProjects(projects);
    return project;
}

/**
 * List all projects
 */
export function listProjects(): Project[] {
    return loadProjects();
}

/**
 * Get project version history
 */
export function getProjectVersions(projectId: string): ProjectVersion[] {
    const project = getProject(projectId);
    return project?.versions || [];
}
