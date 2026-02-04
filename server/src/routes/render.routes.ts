/**
 * Routes for client-side rendered PDF pages
 * Receives base64 images from client and stores them
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { jobs } from './upload.routes';

const router = Router();

// Receive rendered page images from client
router.post('/pages/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { pages, textContent, title } = req.body;

  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  try {
    const outputDir = path.join(__dirname, '../../uploads/output', jobId);
    const pagesDir = path.join(outputDir, 'pages');
    const assetsDir = path.join(outputDir, 'assets');

    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    // Save each page as image and create HTML wrapper
    for (let i = 0; i < pages.length; i++) {
      const pageData = pages[i];
      const pageNum = i + 1;

      // Save image
      const imageData = pageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(imageData, 'base64');
      const imageName = `page${pageNum}.png`;
      fs.writeFileSync(path.join(assetsDir, imageName), imageBuffer);

      // Save text content if available
      if (textContent && textContent[i]) {
        fs.writeFileSync(path.join(pagesDir, `page${pageNum}.txt`), textContent[i]);
      }

      // Create HTML wrapper for page with image embedded
      const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'Page'} - Page ${pageNum}</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <div class="pdf-page" data-page="${pageNum}">
    <img src="../assets/${imageName}" alt="Page ${pageNum}" style="width:100%;height:auto;" />
  </div>
</body>
</html>`;

      // Save with page{N}.html format (primary - for template service)
      fs.writeFileSync(path.join(pagesDir, `page${pageNum}.html`), pageHtml);

      // Also save with document name format for backwards compatibility
      const pdfName = job.originalName?.replace('.pdf', '') || 'document';
      fs.writeFileSync(path.join(pagesDir, `${pdfName}${pageNum}.html`), pageHtml);
    }

    // Create basic CSS
    const basicCss = `
.pdf-page {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}
.page-container {
  background: white;
}
.page-container img {
  display: block;
  width: 100%;
  height: auto;
}
`;
    fs.writeFileSync(path.join(assetsDir, 'styles.css'), basicCss);

    // Update job status
    job.status = 'completed';
    job.pageCount = pages.length;
    job.title = title;

    res.json({
      success: true,
      pageCount: pages.length,
      message: 'Pages saved successfully'
    });
  } catch (error: any) {
    console.error('Error saving pages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream a single page (for memory-constrained environments like Render)
router.post('/page/:jobId/:pageNum', async (req, res) => {
  const { jobId, pageNum } = req.params;
  const { pageData, textContent, title } = req.body;

  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  try {
    const outputDir = path.join(__dirname, '../../uploads/output', jobId);
    const pagesDir = path.join(outputDir, 'pages');
    const assetsDir = path.join(outputDir, 'assets');

    fs.mkdirSync(pagesDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    const pageNumber = parseInt(pageNum);

    // Save image
    const imageData = pageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(imageData, 'base64');
    const imageName = `page${pageNumber}.png`;
    fs.writeFileSync(path.join(assetsDir, imageName), imageBuffer);

    // Save text content if available
    if (textContent) {
      fs.writeFileSync(path.join(pagesDir, `page${pageNumber}.txt`), textContent);
    }

    // Create HTML wrapper for page
    const pageHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title || 'Page'} - Page ${pageNumber}</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <div class="pdf-page" data-page="${pageNumber}">
    <img src="../assets/${imageName}" alt="Page ${pageNumber}" style="width:100%;height:auto;" />
  </div>
</body>
</html>`;

    fs.writeFileSync(path.join(pagesDir, `page${pageNumber}.html`), pageHtml);

    // Also save with document name format
    const pdfName = job.originalName?.replace('.pdf', '') || 'document';
    fs.writeFileSync(path.join(pagesDir, `${pdfName}${pageNumber}.html`), pageHtml);

    // Create CSS if first page
    if (pageNumber === 1) {
      const basicCss = `
.pdf-page {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}
.page-container {
  background: white;
}
.page-container img {
  display: block;
  width: 100%;
  height: auto;
}
`;
      fs.writeFileSync(path.join(assetsDir, 'styles.css'), basicCss);
    }

    // Update job title if provided
    if (title) {
      job.title = title;
    }

    res.json({ success: true, page: pageNumber });
  } catch (error: any) {
    console.error('Error saving page:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete streaming upload - finalize job
router.post('/complete/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { pageCount, title } = req.body;

  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  try {
    job.status = 'completed';
    job.pageCount = pageCount;
    if (title) job.title = title;

    res.json({
      success: true,
      pageCount,
      message: 'PDF processing completed'
    });
  } catch (error: any) {
    console.error('Error completing job:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
