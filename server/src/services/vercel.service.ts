import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const VERCEL_API_URL = 'https://api.vercel.com';

interface DeployResult {
    projectId: string;
    projectName: string;
    deploymentId: string;
    deploymentUrl: string;
    readyState: string;
}

interface VercelProject {
    id: string;
    name: string;
}

interface VercelDeployment {
    id: string;
    url: string;
    readyState: string;
}

interface FileUpload {
    file: string;
    sha: string;
    size: number;
}

/**
 * Deploy a directory to Vercel
 */
export async function deployToVercel(
    outputDir: string,
    projectName?: string
): Promise<DeployResult> {
    const accessToken = process.env.VERCEL_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('Vercel access token not configured. Set VERCEL_ACCESS_TOKEN in environment.');
    }

    // Generate a unique project name
    const uniqueName = projectName
        ? projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50)
        : `pdf-slideshow-${Date.now().toString(36)}`;

    try {
        // Get all files with their hashes
        const files = await getAllFiles(outputDir);

        // Create deployment
        const deploymentPayload = {
            name: uniqueName,
            files: files.map(f => ({
                file: f.file,
                sha: f.sha,
                size: f.size
            })),
            projectSettings: {
                framework: null // Static deployment
            }
        };

        const deployResponse = await fetch(`${VERCEL_API_URL}/v13/deployments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(deploymentPayload)
        });

        if (!deployResponse.ok) {
            const errorText = await deployResponse.text();
            throw new Error(`Vercel deployment failed: ${errorText}`);
        }

        const deployment = await deployResponse.json() as VercelDeployment & {
            projectId: string;
            name: string;
        };

        // Upload any missing files
        if ((deployment as any).missing) {
            for (const missingFile of (deployment as any).missing) {
                const fileInfo = files.find(f => f.sha === missingFile.sha);
                if (fileInfo) {
                    const filePath = path.join(outputDir, fileInfo.file);
                    const content = fs.readFileSync(filePath);

                    await fetch(`${VERCEL_API_URL}/v2/files`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/octet-stream',
                            'x-vercel-digest': fileInfo.sha
                        },
                        body: content
                    });
                }
            }
        }

        return {
            projectId: deployment.projectId || deployment.id,
            projectName: deployment.name || uniqueName,
            deploymentId: deployment.id,
            deploymentUrl: `https://${deployment.url}`,
            readyState: deployment.readyState
        };
    } catch (error: any) {
        console.error('Vercel deployment error:', error);
        throw error;
    }
}

/**
 * Update an existing Vercel deployment (for version control)
 */
export async function updateVercelDeployment(
    projectId: string,
    outputDir: string
): Promise<DeployResult> {
    const accessToken = process.env.VERCEL_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('Vercel access token not configured.');
    }

    const files = await getAllFiles(outputDir);

    const deployResponse = await fetch(`${VERCEL_API_URL}/v13/deployments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: projectId, // Use existing project
            files: files.map(f => ({
                file: f.file,
                sha: f.sha,
                size: f.size
            })),
            target: 'production' // Always deploy to production for same URL
        })
    });

    if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Vercel update failed: ${errorText}`);
    }

    const deployment = await deployResponse.json() as VercelDeployment & {
        projectId: string;
        name: string;
    };

    // Upload missing files
    if ((deployment as any).missing) {
        for (const missingFile of (deployment as any).missing) {
            const fileInfo = files.find(f => f.sha === missingFile.sha);
            if (fileInfo) {
                const filePath = path.join(outputDir, fileInfo.file);
                const content = fs.readFileSync(filePath);

                await fetch(`${VERCEL_API_URL}/v2/files`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/octet-stream',
                        'x-vercel-digest': fileInfo.sha
                    },
                    body: content
                });
            }
        }
    }

    return {
        projectId: deployment.projectId || projectId,
        projectName: deployment.name,
        deploymentId: deployment.id,
        deploymentUrl: `https://${deployment.url}`,
        readyState: deployment.readyState
    };
}

/**
 * Get all files in a directory with SHA1 hashes
 */
async function getAllFiles(dir: string, basePath: string = ''): Promise<FileUpload[]> {
    const files: FileUpload[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = basePath ? `${basePath}/${entry}` : entry;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...await getAllFiles(fullPath, relativePath));
        } else {
            const content = fs.readFileSync(fullPath);
            const sha = createHash('sha1').update(content).digest('hex');
            files.push({
                file: relativePath,
                sha,
                size: stat.size
            });
        }
    }

    return files;
}

/**
 * Check if Vercel access token is configured
 */
export function isVercelConfigured(): boolean {
    return !!process.env.VERCEL_ACCESS_TOKEN;
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(deploymentId: string): Promise<string> {
    const accessToken = process.env.VERCEL_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('Vercel access token not configured.');
    }

    const response = await fetch(`${VERCEL_API_URL}/v13/deployments/${deploymentId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to get deployment status');
    }

    const data = await response.json() as { readyState: string };
    return data.readyState;
}
