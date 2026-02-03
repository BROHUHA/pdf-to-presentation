/**
 * SEO Service for generating meta tags and schema markup
 */

import fs from 'fs';
import path from 'path';

interface SeoMetadata {
    title: string;
    description: string;
    keywords: string[];
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
}

interface OpenGraphTags {
    title: string;
    description: string;
    type: string;
    url?: string;
    image?: string;
    siteName?: string;
}

interface SchemaMarkup {
    '@context': string;
    '@type': string;
    name: string;
    description: string;
    author?: { '@type': string; name: string };
    datePublished?: string;
    dateModified?: string;
    publisher?: { '@type': string; name: string };
    numberOfPages?: number;
}

/**
 * Extract SEO metadata from PDF content
 */
export function extractSeoMetadata(
    pdfTitle: string,
    pageContents: { text: string }[],
    pageCount: number
): SeoMetadata {
    // Get text from first few pages for analysis
    const combinedText = pageContents
        .slice(0, 3)
        .map(p => p.text)
        .join(' ')
        .slice(0, 5000);

    // Extract title (use PDF title or first heading-like text)
    let title = pdfTitle;
    const firstLineMatch = combinedText.match(/^[A-Z][^.!?]*[.!?]?/);
    if (firstLineMatch && firstLineMatch[0].length < 100) {
        title = title || firstLineMatch[0].trim();
    }

    // Generate description from first paragraph
    const sentences = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 30);
    const description = sentences.slice(0, 2).join('. ').trim().slice(0, 160);

    // Extract keywords using frequency analysis
    const words = combinedText
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4);

    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(['about', 'their', 'there', 'these', 'those', 'which', 'would', 'should', 'could']);

    for (const word of words) {
        if (!stopWords.has(word)) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    }

    const keywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

    return {
        title,
        description: description || `${pdfTitle} - ${pageCount} page document`,
        keywords,
        modifiedDate: new Date().toISOString()
    };
}

/**
 * Generate HTML meta tags string
 */
export function generateMetaTags(seo: SeoMetadata, og?: OpenGraphTags): string {
    const tags: string[] = [
        `<meta charset="UTF-8">`,
        `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
        `<title>${escapeHtml(seo.title)}</title>`,
        `<meta name="description" content="${escapeHtml(seo.description)}">`,
        `<meta name="keywords" content="${seo.keywords.join(', ')}">`,
    ];

    if (seo.author) {
        tags.push(`<meta name="author" content="${escapeHtml(seo.author)}">`);
    }

    // Open Graph tags
    if (og) {
        tags.push(`<meta property="og:title" content="${escapeHtml(og.title)}">`);
        tags.push(`<meta property="og:description" content="${escapeHtml(og.description)}">`);
        tags.push(`<meta property="og:type" content="${og.type}">`);

        if (og.url) {
            tags.push(`<meta property="og:url" content="${og.url}">`);
        }
        if (og.image) {
            tags.push(`<meta property="og:image" content="${og.image}">`);
        }
        if (og.siteName) {
            tags.push(`<meta property="og:site_name" content="${escapeHtml(og.siteName)}">`);
        }
    }

    // Twitter Card tags
    tags.push(`<meta name="twitter:card" content="summary_large_image">`);
    tags.push(`<meta name="twitter:title" content="${escapeHtml(seo.title)}">`);
    tags.push(`<meta name="twitter:description" content="${escapeHtml(seo.description)}">`);

    return tags.join('\n    ');
}

/**
 * Generate JSON-LD schema markup
 */
export function generateSchemaMarkup(
    seo: SeoMetadata,
    pageCount: number,
    url?: string
): string {
    const schema: SchemaMarkup = {
        '@context': 'https://schema.org',
        '@type': 'DigitalDocument',
        name: seo.title,
        description: seo.description,
        numberOfPages: pageCount,
        dateModified: seo.modifiedDate
    };

    if (seo.author) {
        schema.author = {
            '@type': 'Person',
            name: seo.author
        };
    }

    if (seo.publishedDate) {
        schema.datePublished = seo.publishedDate;
    }

    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/**
 * Generate a sitemap for multi-page documents
 */
export function generateSitemap(baseUrl: string, pageCount: number): string {
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`;

    for (let i = 1; i <= pageCount; i++) {
        xml += `
  <url>
    <loc>${baseUrl}#page-${i}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    xml += '\n</urlset>';
    return xml;
}

/**
 * Inject SEO elements into generated HTML
 */
export function injectSeoIntoHtml(
    html: string,
    seo: SeoMetadata,
    pageCount: number,
    baseUrl?: string
): string {
    const og: OpenGraphTags = {
        title: seo.title,
        description: seo.description,
        type: 'article',
        url: baseUrl
    };

    const metaTags = generateMetaTags(seo, og);
    const schema = generateSchemaMarkup(seo, pageCount, baseUrl);

    // Replace or insert meta tags in <head>
    if (html.includes('<head>')) {
        html = html.replace(
            /<head>/,
            `<head>\n    ${metaTags}\n    ${schema}`
        );
    }

    return html;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
