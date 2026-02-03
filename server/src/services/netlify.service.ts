import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { createHash } from 'crypto';

const NETLIFY_API_URL = 'https://api.netlify.com/api/v1';

interface DeployResult {
    siteId: string;
    siteName: string;
    siteUrl: string;
    deployId: string;
    deployUrl: string;
}

interface NetlifySite {
    id: string;
    name: string;
    url: string;
    ssl_url?: string;
}

interface NetlifyDeploy {
    id: string;
    url: string;
    ssl_url?: string;
    required?: string[];
    required_functions?: string[];
}

/**
 * Deploy a directory to Netlify
 */
export async function deployToNetlify(
    outputDir: string,
    siteName?: string
): Promise<DeployResult> {
    const accessToken = process.env.NETLIFY_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('Netlify access token not configured. Set NETLIFY_ACCESS_TOKEN in environment.');
    }

    // Generate a unique site name
    const uniqueSiteName = siteName
        ? siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30)
        : `pdf-slideshow-${Date.now().toString(36)}`;

    try {
        // Create a new site
        const siteResponse = await fetch(`${NETLIFY_API_URL}/sites`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: uniqueSiteName
            })
        });

        if (!siteResponse.ok) {
            const error = await siteResponse.text();
            throw new Error(`Failed to create Netlify site: ${error}`);
        }

        const site = await siteResponse.json() as NetlifySite;

        // Get file hashes for deployment
        const files = await getFileHashes(outputDir);

        // Create deploy with file listing
        const deployResponse = await fetch(`${NETLIFY_API_URL}/sites/${site.id}/deploys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files
            })
        });

        if (!deployResponse.ok) {
            const error = await deployResponse.text();
            throw new Error(`Failed to create deploy: ${error}`);
        }

        const deploy = await deployResponse.json() as NetlifyDeploy;

        // Upload required files
        const requiredFiles = deploy.required || [];

        for (const fileHash of requiredFiles) {
            const filePath = findFileByHash(outputDir, fileHash, files);
            if (filePath) {
                const content = fs.readFileSync(filePath);
                const uploadPath = path.relative(outputDir, filePath).replace(/\\/g, '/');

                await fetch(`${NETLIFY_API_URL}/deploys/${deploy.id}/files/${uploadPath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    body: content
                });
            }
        }

        return {
            siteId: site.id,
            siteName: site.name,
            siteUrl: site.ssl_url || site.url,
            deployId: deploy.id,
            deployUrl: deploy.ssl_url || deploy.url
        };
    } catch (error: any) {
        console.error('Netlify deployment error:', error);
        throw error;
    }
}

/**
 * Get SHA1 hashes for all files in a directory
 */
async function getFileHashes(dir: string, basePath: string = ''): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = basePath ? `${basePath}/${entry}` : entry;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            Object.assign(files, await getFileHashes(fullPath, relativePath));
        } else {
            const content = fs.readFileSync(fullPath);
            const hash = createHash('sha1').update(content).digest('hex');
            files[`/${relativePath}`] = hash;
        }
    }

    return files;
}

/**
 * Find a file by its hash
 */
function findFileByHash(
    dir: string,
    hash: string,
    hashMap: Record<string, string>,
    basePath: string = ''
): string | null {
    for (const [filePath, fileHash] of Object.entries(hashMap)) {
        if (fileHash === hash) {
            return path.join(dir, filePath.slice(1)); // Remove leading /
        }
    }
    return null;
}

/**
 * Check if Netlify access token is configured
 */
export function isNetlifyConfigured(): boolean {
    return !!process.env.NETLIFY_ACCESS_TOKEN;
}
