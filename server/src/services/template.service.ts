import path from 'path';
import fs from 'fs';

interface Hotspot {
    id: string;
    pageIndex: number;
    top: number;
    left: number;
    width: number;
    height: number;
    url: string;
    label?: string;
}

interface LeadGenConfig {
    enabled: boolean;
    freePages: number;
    fields?: {
        name: boolean;
        email: boolean;
        company: boolean;
        phone: boolean;
    };
    webhookUrl?: string;
}

interface TemplateOptions {
    jobId: string;
    outputDir: string;
    template: 'presentation' | 'flipbook' | 'documentation';
    title: string;
    pageCount: number;
    hotspots: Hotspot[];
    leadGen: LeadGenConfig;
    customCss?: string;
}

/**
 * Generate the final HTML output with the selected template
 */
export async function generateTemplate(options: TemplateOptions): Promise<void> {
    const { jobId, outputDir, template, title, pageCount, hotspots, leadGen, customCss } = options;

    const pagesDir = path.join(outputDir, 'pages');
    const assetsDir = path.join(outputDir, 'assets');
    const jsDir = path.join(outputDir, 'js');

    // Ensure js directory exists
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir, { recursive: true });
    }

    // Read page contents
    const pages: { index: number; content: string; hotspots: Hotspot[] }[] = [];

    for (let i = 1; i <= pageCount; i++) {
        const pagePath = path.join(pagesDir, `page${i}.html`);
        let content = '';

        if (fs.existsSync(pagePath)) {
            content = fs.readFileSync(pagePath, 'utf-8');
            // Extract body content only
            const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (bodyMatch) {
                content = bodyMatch[1];
            }
        } else {
            // Try alternative naming conventions
            const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
            if (files[i - 1]) {
                content = fs.readFileSync(path.join(pagesDir, files[i - 1]), 'utf-8');
                const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                if (bodyMatch) {
                    content = bodyMatch[1];
                }
            }
        }

        const pageHotspots = hotspots.filter(h => h.pageIndex === i - 1);

        pages.push({
            index: i,
            content,
            hotspots: pageHotspots
        });
    }

    // Generate template-specific assets
    switch (template) {
        case 'presentation':
            await generatePresentationTemplate(outputDir, pages, title, leadGen, customCss);
            break;
        case 'flipbook':
            await generateFlipbookTemplate(outputDir, pages, title, leadGen, customCss);
            break;
        case 'documentation':
            await generateDocumentationTemplate(outputDir, pages, title, leadGen, customCss);
            break;
        default:
            await generatePresentationTemplate(outputDir, pages, title, leadGen, customCss);
    }
}

/**
 * Generate Presentation template (Reveal.js style)
 */
async function generatePresentationTemplate(
    outputDir: string,
    pages: { index: number; content: string; hotspots: Hotspot[] }[],
    title: string,
    leadGen: LeadGenConfig,
    customCss?: string
): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/template.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
      overflow: hidden;
    }
    
    .presentation-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .slides-wrapper {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    
    .slide {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s ease, transform 0.5s ease;
      transform: translateX(50px);
    }
    
    .slide.active {
      opacity: 1;
      pointer-events: all;
      transform: translateX(0);
    }
    
    .slide.prev {
      transform: translateX(-50px);
    }
    
    .slide-content {
      position: relative;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 25px 80px rgba(0,0,0,0.4);
      max-width: 90vw;
      max-height: 85vh;
      overflow: auto;
      color: #333;
    }
    
    .slide-content .pdf-page {
      padding: 40px;
    }
    
    .hotspot-link {
      position: absolute;
      background: rgba(59, 130, 246, 0.1);
      border: 2px solid rgba(59, 130, 246, 0.5);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .hotspot-link:hover {
      background: rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.8);
    }
    
    .navigation {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 24px;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      backdrop-filter: blur(10px);
    }
    
    .nav-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.1);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-size: 20px;
    }
    
    .nav-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.2);
      transform: scale(1.1);
    }
    
    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .progress-indicator {
      display: flex;
      gap: 8px;
    }
    
    .progress-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .progress-dot.active {
      background: #3b82f6;
      transform: scale(1.2);
    }
    
    .progress-dot:hover {
      background: rgba(255,255,255,0.5);
    }
    
    .slide-counter {
      font-size: 14px;
      opacity: 0.7;
    }
    
    /* Lead Gen Overlay */
    .lead-gen-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(20px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .lead-gen-overlay.active {
      display: flex;
    }
    
    .lead-gen-form {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 24px;
      padding: 48px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 25px 80px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .lead-gen-form h2 {
      font-size: 28px;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .lead-gen-form p {
      color: rgba(255,255,255,0.6);
      margin-bottom: 32px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group input {
      width: 100%;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #fff;
      font-size: 16px;
      transition: all 0.3s ease;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #3b82f6;
      background: rgba(255,255,255,0.1);
    }
    
    .form-group input::placeholder {
      color: rgba(255,255,255,0.4);
    }
    
    .submit-btn {
      width: 100%;
      padding: 18px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 40px rgba(59, 130, 246, 0.4);
    }
    
    .locked-blur {
      filter: blur(20px);
      pointer-events: none;
    }
    
    ${customCss || ''}
  </style>
</head>
<body>
  <div class="presentation-container">
    <div class="slides-wrapper">
      ${pages.map((page, idx) => `
        <div class="slide${idx === 0 ? ' active' : ''}" data-index="${idx}">
          <div class="slide-content${leadGen.enabled && idx >= leadGen.freePages ? ' locked-blur' : ''}">
            ${page.content || `<div class="pdf-page"><p>Page ${page.index}</p></div>`}
            ${page.hotspots.map(h => `
              <a href="${escapeHtml(h.url)}" 
                 class="hotspot-link" 
                 target="_blank"
                 style="top: ${h.top}%; left: ${h.left}%; width: ${h.width}%; height: ${h.height}%;"
                 title="${escapeHtml(h.label || h.url)}"></a>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="navigation">
      <button class="nav-btn" id="prevBtn" ${pages.length <= 1 ? 'disabled' : ''}>←</button>
      <div class="progress-indicator">
        ${pages.map((_, idx) => `
          <div class="progress-dot${idx === 0 ? ' active' : ''}" data-index="${idx}"></div>
        `).join('')}
      </div>
      <span class="slide-counter"><span id="currentSlide">1</span> / ${pages.length}</span>
      <button class="nav-btn" id="nextBtn" ${pages.length <= 1 ? 'disabled' : ''}>→</button>
    </div>
  </div>
  
  ${leadGen.enabled ? `
  <div class="lead-gen-overlay" id="leadGenOverlay">
    <div class="lead-gen-form">
      <h2>Unlock Full Access</h2>
      <p>Fill in your details to view all ${pages.length} pages</p>
      <form id="leadGenForm">
        <div class="form-group">
          <input type="text" name="name" placeholder="Your Name" required>
        </div>
        <div class="form-group">
          <input type="email" name="email" placeholder="Email Address" required>
        </div>
        <div class="form-group">
          <input type="text" name="company" placeholder="Company (Optional)">
        </div>
        <button type="submit" class="submit-btn">Get Access</button>
      </form>
    </div>
  </div>
  ` : ''}
  
  <script src="js/navigation.js"></script>
</body>
</html>`;

    // Write main HTML
    fs.writeFileSync(path.join(outputDir, 'index.html'), html);

    // Write navigation JS
    const navJs = `
(function() {
  let currentIndex = 0;
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.progress-dot');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const counter = document.getElementById('currentSlide');
  const leadGenEnabled = ${leadGen.enabled};
  const freePages = ${leadGen.freePages};
  let unlocked = localStorage.getItem('unlocked') === 'true';
  
  function goToSlide(index) {
    if (index < 0 || index >= slides.length) return;
    
    // Check if lead gen gate applies
    if (leadGenEnabled && !unlocked && index >= freePages) {
      document.getElementById('leadGenOverlay').classList.add('active');
      return;
    }
    
    slides[currentIndex].classList.remove('active');
    slides[currentIndex].classList.add('prev');
    dots[currentIndex].classList.remove('active');
    
    currentIndex = index;
    
    slides.forEach((slide, i) => {
      slide.classList.remove('prev');
      if (i < currentIndex) slide.classList.add('prev');
    });
    
    slides[currentIndex].classList.add('active');
    dots[currentIndex].classList.add('active');
    counter.textContent = currentIndex + 1;
    
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === slides.length - 1;
  }
  
  prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
  nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
  
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goToSlide(i));
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      goToSlide(currentIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      goToSlide(currentIndex + 1);
    }
  });
  
  // Touch swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  
  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
    }
  });
  
  // Lead gen form handling
  if (leadGenEnabled) {
    const form = document.getElementById('leadGenForm');
    const overlay = document.getElementById('leadGenOverlay');
    
    if (unlocked) {
      document.querySelectorAll('.locked-blur').forEach(el => el.classList.remove('locked-blur'));
    }
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      console.log('Lead captured:', data);
      
      // Store unlock state
      localStorage.setItem('unlocked', 'true');
      unlocked = true;
      
      // Remove blur from all pages
      document.querySelectorAll('.locked-blur').forEach(el => el.classList.remove('locked-blur'));
      
      // Close overlay
      overlay.classList.remove('active');
      
      // Optional: Send to webhook
      ${leadGen.webhookUrl ? `
      fetch('${leadGen.webhookUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(console.error);
      ` : ''}
    });
  }
})();
`;

    fs.writeFileSync(path.join(outputDir, 'js', 'navigation.js'), navJs);

    // Write template CSS
    const templateCss = `
/* Template-specific styles */
`;
    fs.writeFileSync(path.join(outputDir, 'assets', 'template.css'), templateCss);
}

/**
 * Generate Flipbook template (3D page turning)
 */
async function generateFlipbookTemplate(
    outputDir: string,
    pages: { index: number; content: string; hotspots: Hotspot[] }[],
    title: string,
    leadGen: LeadGenConfig,
    customCss?: string
): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="assets/styles.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .flipbook-title {
      color: #fff;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 24px;
      text-align: center;
      text-shadow: 0 2px 20px rgba(0,0,0,0.3);
    }
    
    .flipbook-container {
      perspective: 2500px;
      width: 100%;
      max-width: 1000px;
    }
    
    .flipbook {
      position: relative;
      width: 100%;
      height: 600px;
      transform-style: preserve-3d;
    }
    
    .page {
      position: absolute;
      width: 50%;
      height: 100%;
      right: 0;
      transform-origin: left center;
      transition: transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1);
      transform-style: preserve-3d;
      cursor: pointer;
      background: #fff;
      box-shadow: 0 5px 30px rgba(0,0,0,0.3);
      border-radius: 0 8px 8px 0;
    }
    
    .page.flipped {
      transform: rotateY(-180deg);
    }
    
    .page-front, .page-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      overflow: hidden;
      padding: 30px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    
    .page-back {
      transform: rotateY(180deg);
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }
    
    .page-content {
      width: 100%;
      height: 100%;
      overflow: auto;
    }
    
    .page-number {
      position: absolute;
      bottom: 15px;
      font-size: 12px;
      color: #666;
    }
    
    .page-front .page-number { right: 20px; }
    .page-back .page-number { left: 20px; }
    
    .navigation {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 30px;
    }
    
    .nav-btn {
      padding: 14px 32px;
      border-radius: 50px;
      border: none;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }
    
    .nav-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.2);
      transform: translateY(-2px);
    }
    
    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .page-indicator {
      color: rgba(255,255,255,0.7);
      font-size: 14px;
      display: flex;
      align-items: center;
    }
    
    .hotspot-link {
      position: absolute;
      background: rgba(139, 92, 246, 0.1);
      border: 2px solid rgba(139, 92, 246, 0.5);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 10;
    }
    
    .hotspot-link:hover {
      background: rgba(139, 92, 246, 0.3);
    }
    
    .locked-blur {
      filter: blur(15px);
    }
    
    /* Lead Gen */
    .lead-gen-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(20px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .lead-gen-overlay.active { display: flex; }
    
    .lead-gen-form {
      background: linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 100%);
      border-radius: 24px;
      padding: 48px;
      max-width: 480px;
      width: 90%;
      border: 1px solid rgba(255,255,255,0.1);
    }
    
    .lead-gen-form h2 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #fff;
    }
    
    .lead-gen-form p {
      color: rgba(255,255,255,0.6);
      margin-bottom: 32px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group input {
      width: 100%;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #fff;
      font-size: 16px;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #8b5cf6;
    }
    
    .submit-btn {
      width: 100%;
      padding: 18px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
    }
    
    ${customCss || ''}
  </style>
</head>
<body>
  <h1 class="flipbook-title">${escapeHtml(title)}</h1>
  
  <div class="flipbook-container">
    <div class="flipbook" id="flipbook">
      ${pages.map((page, idx) => `
        <div class="page" data-index="${idx}" style="z-index: ${pages.length - idx};">
          <div class="page-front${leadGen.enabled && idx >= leadGen.freePages ? ' locked-blur' : ''}">
            <div class="page-content">
              ${page.content || `<p>Page ${page.index}</p>`}
            </div>
            <span class="page-number">${page.index}</span>
            ${page.hotspots.map(h => `
              <a href="${escapeHtml(h.url)}" 
                 class="hotspot-link" 
                 target="_blank"
                 style="top: ${h.top}%; left: ${h.left}%; width: ${h.width}%; height: ${h.height}%;"></a>
            `).join('')}
          </div>
          <div class="page-back">
            <span class="page-number">${page.index}</span>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  
  <div class="navigation">
    <button class="nav-btn" id="prevBtn">← Previous</button>
    <span class="page-indicator"><span id="currentPage">1</span> of ${pages.length}</span>
    <button class="nav-btn" id="nextBtn">Next →</button>
  </div>
  
  ${leadGen.enabled ? `
  <div class="lead-gen-overlay" id="leadGenOverlay">
    <div class="lead-gen-form">
      <h2>Continue Reading</h2>
      <p>Enter your details to unlock all pages</p>
      <form id="leadGenForm">
        <div class="form-group">
          <input type="text" name="name" placeholder="Your Name" required>
        </div>
        <div class="form-group">
          <input type="email" name="email" placeholder="Email Address" required>
        </div>
        <button type="submit" class="submit-btn">Unlock Now</button>
      </form>
    </div>
  </div>
  ` : ''}
  
  <script src="js/flipbook.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'index.html'), html);

    // Flipbook navigation JS
    const flipbookJs = `
(function() {
  let currentPage = 0;
  const pages = document.querySelectorAll('.page');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const counter = document.getElementById('currentPage');
  const leadGenEnabled = ${leadGen.enabled};
  const freePages = ${leadGen.freePages};
  let unlocked = localStorage.getItem('unlocked') === 'true';
  
  function updateButtons() {
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === pages.length - 1;
    counter.textContent = currentPage + 1;
  }
  
  function flipTo(index) {
    if (index < 0 || index >= pages.length) return;
    
    if (leadGenEnabled && !unlocked && index >= freePages) {
      document.getElementById('leadGenOverlay').classList.add('active');
      return;
    }
    
    if (index > currentPage) {
      for (let i = currentPage; i < index; i++) {
        pages[i].classList.add('flipped');
      }
    } else {
      for (let i = currentPage - 1; i >= index; i--) {
        pages[i].classList.remove('flipped');
      }
    }
    
    currentPage = index;
    updateButtons();
  }
  
  prevBtn.addEventListener('click', () => flipTo(currentPage - 1));
  nextBtn.addEventListener('click', () => flipTo(currentPage + 1));
  
  pages.forEach((page, i) => {
    page.addEventListener('click', () => flipTo(i + 1));
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') flipTo(currentPage + 1);
    if (e.key === 'ArrowLeft') flipTo(currentPage - 1);
  });
  
  if (leadGenEnabled) {
    const form = document.getElementById('leadGenForm');
    const overlay = document.getElementById('leadGenOverlay');
    
    if (unlocked) {
      document.querySelectorAll('.locked-blur').forEach(el => el.classList.remove('locked-blur'));
    }
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('unlocked', 'true');
      unlocked = true;
      document.querySelectorAll('.locked-blur').forEach(el => el.classList.remove('locked-blur'));
      overlay.classList.remove('active');
    });
  }
  
  updateButtons();
})();
`;

    fs.writeFileSync(path.join(outputDir, 'js', 'flipbook.js'), flipbookJs);
}

/**
 * Generate Documentation template (vertical scroll with ToC)
 */
async function generateDocumentationTemplate(
    outputDir: string,
    pages: { index: number; content: string; hotspots: Hotspot[] }[],
    title: string,
    leadGen: LeadGenConfig,
    customCss?: string
): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="assets/styles.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    
    .doc-container {
      display: flex;
      min-height: 100vh;
    }
    
    .sidebar {
      width: 280px;
      background: #1e293b;
      color: #fff;
      padding: 24px;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      box-shadow: 4px 0 20px rgba(0,0,0,0.1);
    }
    
    .sidebar-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .sidebar-subtitle {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 16px;
      margin-top: 24px;
    }
    
    .toc-list {
      list-style: none;
    }
    
    .toc-item {
      margin-bottom: 4px;
    }
    
    .toc-link {
      display: block;
      padding: 10px 16px;
      color: rgba(255,255,255,0.7);
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s ease;
      font-size: 14px;
    }
    
    .toc-link:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    
    .toc-link.active {
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
    }
    
    .content {
      flex: 1;
      margin-left: 280px;
      padding: 48px 64px;
      max-width: 1200px;
    }
    
    .doc-header {
      margin-bottom: 48px;
      padding-bottom: 32px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .doc-header h1 {
      font-size: 42px;
      font-weight: 800;
      background: linear-gradient(90deg, #1e293b, #475569);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    
    .doc-header p {
      font-size: 18px;
      color: #64748b;
    }
    
    .section {
      margin-bottom: 64px;
      scroll-margin-top: 24px;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 24px;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-number {
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
    }
    
    .page-content {
      position: relative;
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e2e8f0;
    }
    
    .hotspot-link {
      position: absolute;
      background: rgba(59, 130, 246, 0.1);
      border: 2px solid rgba(59, 130, 246, 0.4);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .hotspot-link:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
    }
    
    .locked-section {
      position: relative;
    }
    
    .locked-section .page-content {
      filter: blur(10px);
    }
    
    .lock-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    
    .lock-message {
      background: #fff;
      padding: 32px 48px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    }
    
    .lock-message h3 {
      margin-bottom: 8px;
      color: #1e293b;
    }
    
    .lock-message p {
      color: #64748b;
      margin-bottom: 16px;
    }
    
    .unlock-btn {
      padding: 12px 32px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    
    /* Lead Gen Modal */
    .lead-gen-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .lead-gen-overlay.active { display: flex; }
    
    .lead-gen-form {
      background: #fff;
      border-radius: 24px;
      padding: 48px;
      max-width: 480px;
      width: 90%;
    }
    
    .lead-gen-form h2 {
      font-size: 28px;
      margin-bottom: 8px;
      color: #1e293b;
    }
    
    .lead-gen-form p {
      color: #64748b;
      margin-bottom: 32px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group input {
      width: 100%;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 16px;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    
    .submit-btn {
      width: 100%;
      padding: 18px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
    }
    
    @media (max-width: 768px) {
      .sidebar {
        display: none;
      }
      .content {
        margin-left: 0;
        padding: 24px;
      }
    }
    
    ${customCss || ''}
  </style>
</head>
<body>
  <div class="doc-container">
    <aside class="sidebar">
      <h2 class="sidebar-title">${escapeHtml(title)}</h2>
      <p class="sidebar-subtitle">Contents</p>
      <nav>
        <ul class="toc-list">
          ${pages.map((page, idx) => `
            <li class="toc-item">
              <a href="#section-${idx}" class="toc-link${idx === 0 ? ' active' : ''}" data-index="${idx}">
                Page ${page.index}
              </a>
            </li>
          `).join('')}
        </ul>
      </nav>
    </aside>
    
    <main class="content">
      <header class="doc-header">
        <h1>${escapeHtml(title)}</h1>
        <p>${pages.length} pages</p>
      </header>
      
      ${pages.map((page, idx) => `
        <div class="section${leadGen.enabled && idx >= leadGen.freePages ? ' locked-section' : ''}" id="section-${idx}">
          <h2 class="section-title">
            <span class="section-number">${page.index}</span>
            Page ${page.index}
          </h2>
          <div class="page-content">
            ${page.content || `<p>Page content ${page.index}</p>`}
            ${page.hotspots.map(h => `
              <a href="${escapeHtml(h.url)}" 
                 class="hotspot-link" 
                 target="_blank"
                 style="top: ${h.top}%; left: ${h.left}%; width: ${h.width}%; height: ${h.height}%;"></a>
            `).join('')}
          </div>
          ${leadGen.enabled && idx >= leadGen.freePages ? `
            <div class="lock-overlay">
              <div class="lock-message">
                <h3>🔒 Content Locked</h3>
                <p>Fill in your details to unlock</p>
                <button class="unlock-btn" onclick="document.getElementById('leadGenOverlay').classList.add('active')">
                  Unlock Now
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </main>
  </div>
  
  ${leadGen.enabled ? `
  <div class="lead-gen-overlay" id="leadGenOverlay">
    <div class="lead-gen-form">
      <h2>Get Full Access</h2>
      <p>Enter your details to unlock all content</p>
      <form id="leadGenForm">
        <div class="form-group">
          <input type="text" name="name" placeholder="Your Name" required>
        </div>
        <div class="form-group">
          <input type="email" name="email" placeholder="Email Address" required>
        </div>
        <button type="submit" class="submit-btn">Unlock Content</button>
      </form>
    </div>
  </div>
  ` : ''}
  
  <script src="js/documentation.js"></script>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, 'index.html'), html);

    // Documentation navigation JS
    const docJs = `
(function() {
  const links = document.querySelectorAll('.toc-link');
  const sections = document.querySelectorAll('.section');
  const leadGenEnabled = ${leadGen.enabled};
  let unlocked = localStorage.getItem('unlocked') === 'true';
  
  // Smooth scroll and active state
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
  
  // Update active state on scroll
  function updateActiveLink() {
    let current = '';
    sections.forEach((section, i) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 100) {
        current = 'section-' + i;
      }
    });
    
    links.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }
  
  window.addEventListener('scroll', updateActiveLink);
  
  // Lead gen
  if (leadGenEnabled) {
    const form = document.getElementById('leadGenForm');
    const overlay = document.getElementById('leadGenOverlay');
    
    if (unlocked) {
      document.querySelectorAll('.locked-section').forEach(el => {
        el.classList.remove('locked-section');
        const lockOverlay = el.querySelector('.lock-overlay');
        if (lockOverlay) lockOverlay.remove();
      });
    }
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      localStorage.setItem('unlocked', 'true');
      unlocked = true;
      document.querySelectorAll('.locked-section').forEach(el => {
        el.classList.remove('locked-section');
        const lockOverlay = el.querySelector('.lock-overlay');
        if (lockOverlay) lockOverlay.remove();
      });
      overlay.classList.remove('active');
    });
  }
})();
`;

    fs.writeFileSync(path.join(outputDir, 'js', 'documentation.js'), docJs);
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
