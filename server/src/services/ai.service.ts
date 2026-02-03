/**
 * AI Service for PDF Chat and Mobile Reflow
 * Uses Gemini API for intelligent text processing
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

interface PageContent {
    pageIndex: number;
    text: string;
    headings?: string[];
}

interface SearchResult {
    pageIndex: number;
    relevantText: string;
    confidence: number;
}

interface ReflowContent {
    pageIndex: number;
    elements: {
        type: 'heading' | 'paragraph' | 'image' | 'list';
        content: string;
        level?: number;
    }[];
}

/**
 * Extract structured text from HTML pages for AI processing
 */
export function extractTextFromPages(pagesDir: string): PageContent[] {
    const fs = require('fs');
    const path = require('path');

    const pages: PageContent[] = [];

    if (!fs.existsSync(pagesDir)) {
        return pages;
    }

    const files = fs.readdirSync(pagesDir)
        .filter((f: string) => f.endsWith('.html'))
        .sort((a: string, b: string) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
            return numA - numB;
        });

    files.forEach((file: string, index: number) => {
        // Check if there is a corresponding text file first (created by client-side rendering)
        const txtFile = file.replace('.html', '.txt');
        const txtPath = path.join(pagesDir, txtFile);

        let text = '';
        const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');

        if (fs.existsSync(txtPath)) {
            // Use the extracted text directly
            text = fs.readFileSync(txtPath, 'utf-8').trim();
        } else {
            // Fallback: Remove HTML tags but preserve text
            text = content
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Extract headings (larger font sizes often used)
        const headingMatches = content.match(/<(?:h[1-6]|div[^>]*font-size:\s*(?:1[8-9]|[2-9]\d))/gi) || [];

        pages.push({
            pageIndex: index,
            text,
            headings: headingMatches
        });
    });

    return pages;
}

/**
 * Ask a question about the PDF content using Gemini
 */
export async function askPdfQuestion(
    question: string,
    pageContents: PageContent[],
    conversationHistory: ChatMessage[] = []
): Promise<{ answer: string; relevantPages: number[]; highlights: string[] }> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in environment.');
    }

    // Build context from PDF content
    const context = pageContents
        .map(p => `[Page ${p.pageIndex + 1}]: ${p.text.slice(0, 2000)}`)
        .join('\n\n');

    const systemPrompt = `You are an AI assistant helping users understand a PDF document. 
You have access to the following document content:

${context}

When answering questions:
1. Reference specific page numbers when possible
2. Quote relevant text from the document
3. Be concise but comprehensive
4. If the answer isn't in the document, say so clearly`;

    const messages = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...conversationHistory.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: question }] }
    ];

    try {
        const response = await fetch(
            `${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: messages,
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${error}`);
        }

        const data = await response.json() as any;
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response.';

        // Extract page references from answer
        const pageRefs = answer.match(/page\s*(\d+)/gi) || [];
        const relevantPages = Array.from(new Set(pageRefs.map((ref: string) => {
            const num = parseInt(ref.match(/\d+/)?.[0] || '0');
            return num - 1; // Convert to 0-indexed
        }))).filter((p): p is number => typeof p === 'number' && p >= 0 && p < pageContents.length);

        // Extract quoted text for highlighting
        const quotes = answer.match(/"([^"]+)"/g) || [];
        const highlights = quotes.map((q: string) => q.replace(/"/g, ''));

        return {
            answer,
            relevantPages: relevantPages as number[],
            highlights
        };
    } catch (error: any) {
        console.error('AI chat error:', error);
        throw error;
    }
}

/**
 * Generate mobile-friendly reflow layout from PDF content
 */
export async function generateReflowContent(
    pageContents: PageContent[]
): Promise<ReflowContent[]> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Fallback: Simple text extraction without AI
        return pageContents.map(page => ({
            pageIndex: page.pageIndex,
            elements: [{ type: 'paragraph' as const, content: page.text }]
        }));
    }

    const reflowedPages: ReflowContent[] = [];

    for (const page of pageContents) {
        if (page.text.length < 50) {
            // Skip nearly empty pages
            reflowedPages.push({
                pageIndex: page.pageIndex,
                elements: [{ type: 'paragraph', content: page.text }]
            });
            continue;
        }

        try {
            const response = await fetch(
                `${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{
                                text: `Analyze this PDF page text and structure it for mobile reading.
                
Text: ${page.text.slice(0, 5000)}

Return a JSON array of content elements. Each element should have:
- type: "heading" | "paragraph" | "list"
- content: the text
- level: (for headings only) 1-3

Focus on identifying headings, breaking long paragraphs, and structuring lists.
Return ONLY valid JSON, no explanation.`
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 2048
                        }
                    })
                }
            );

            if (response.ok) {
                const data = await response.json() as any;
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                // Try to parse JSON from response
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const elements = JSON.parse(jsonMatch[0]);
                    reflowedPages.push({
                        pageIndex: page.pageIndex,
                        elements
                    });
                    continue;
                }
            }
        } catch (e) {
            console.error(`Reflow error for page ${page.pageIndex}:`, e);
        }

        // Fallback for failed pages
        reflowedPages.push({
            pageIndex: page.pageIndex,
            elements: [{ type: 'paragraph', content: page.text }]
        });
    }

    return reflowedPages;
}

/**
 * Search PDF content for relevant sections
 */
export function searchPdfContent(
    query: string,
    pageContents: PageContent[]
): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    for (const page of pageContents) {
        const pageText = page.text.toLowerCase();

        // Count matching terms
        const matchCount = queryTerms.filter(term => pageText.includes(term)).length;

        if (matchCount > 0) {
            // Find most relevant sentence
            const sentences = page.text.split(/[.!?]+/).filter(s => s.trim().length > 20);
            let bestSentence = '';
            let bestScore = 0;

            for (const sentence of sentences) {
                const sentenceLower = sentence.toLowerCase();
                const score = queryTerms.filter(term => sentenceLower.includes(term)).length;
                if (score > bestScore) {
                    bestScore = score;
                    bestSentence = sentence.trim();
                }
            }

            results.push({
                pageIndex: page.pageIndex,
                relevantText: bestSentence || page.text.slice(0, 200),
                confidence: matchCount / queryTerms.length
            });
        }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Check if AI features are available
 */
export function isAiConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
}
