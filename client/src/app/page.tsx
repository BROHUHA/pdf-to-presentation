'use client';

import { useState, useCallback, useEffect } from 'react';
import styles from './page.module.css';
import Preloader from '../components/Preloader';
import {
  UploadIcon, DocumentIcon, TemplateIcon, FlipbookIcon, DocsIcon,
  DownloadIcon, RocketIcon, LinkIcon, CheckIcon, ArrowRightIcon, ArrowLeftIcon,
  HotspotIcon, LeadIcon, AIIcon, AnalyticsIcon, SEOIcon, MobileIcon
} from '../components/Icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Job {
  id: string;
  originalName: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  pageCount?: number;
  title?: string;
  error?: string;
}

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

type Template = 'presentation' | 'flipbook' | 'documentation';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'upload' | 'customize' | 'export'>('upload');
  const [job, setJob] = useState<Job | null>(null);
  const [template, setTemplate] = useState<Template>('presentation');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [leadGen, setLeadGen] = useState({ enabled: false, freePages: 3 });
  const [isUploading, setIsUploading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  // Advanced features
  const [seoEnabled, setSeoEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [mobileReflowEnabled, setMobileReflowEnabled] = useState(false);

  // Conversion timer
  const [conversionTime, setConversionTime] = useState(0);
  const [conversionProgress, setConversionProgress] = useState('');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConverting) {
      setConversionTime(0);
      interval = setInterval(() => {
        setConversionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConverting]);

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setJob({
        id: data.jobId,
        originalName: data.originalName,
        status: 'uploaded'
      });

      // Start conversion automatically
      await startConversion(data.jobId);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const startConversion = async (jobId: string) => {
    setIsConverting(true);

    try {
      // First try server-side conversion
      const serverResponse = await fetch(`${API_URL}/api/convert/${jobId}`, {
        method: 'POST'
      });

      // Poll for completion
      const pollStatus = async (): Promise<void> => {
        const response = await fetch(`${API_URL}/api/upload/status/${jobId}`);
        const status = await response.json();
        const fileName = status.originalName || job?.originalName || 'document.pdf';

        if (status.status === 'completed') {
          // Check if conversion actually worked (pageCount > 0)
          if (status.pageCount && status.pageCount > 0) {
            setJob(status);
            setCurrentStep('customize');
            setIsConverting(false);
          } else {
            // Server conversion failed (no Docker), fall back to client-side
            console.log('Server conversion incomplete, trying client-side rendering...');
            await clientSideRender(jobId, fileName);
          }
        } else if (status.status === 'failed' || status.pageCount === 0) {
          // Try client-side rendering as fallback
          console.log('Server conversion failed, trying client-side rendering...');
          await clientSideRender(jobId, fileName);
        } else if (status.status === 'processing') {
          setTimeout(pollStatus, 1000);
        } else {
          // Unknown status, try client-side
          console.log('Unknown status, trying client-side rendering...');
          await clientSideRender(jobId, fileName);
        }
      };

      setTimeout(pollStatus, 2000);
    } catch (error: any) {
      console.error('Conversion error:', error);
      // Try client-side as last resort
      try {
        await clientSideRender(jobId, job?.originalName || 'document.pdf');
      } catch (clientError: any) {
        alert(`Conversion failed: ${clientError.message}`);
        setIsConverting(false);
      }
    }
  };

  // Client-side PDF rendering using PDF.js 
  const clientSideRender = async (jobId: string, fileName: string) => {
    try {
      // Dynamically import PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      // Get the PDF file from server
      setConversionProgress('Fetching PDF...');
      const pdfResponse = await fetch(`${API_URL}/api/upload/file/${jobId}`);
      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF file');
      }
      const pdfBlob = await pdfResponse.blob();
      const arrayBuffer = await pdfBlob.arrayBuffer();

      // Load the PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      const title = fileName.replace('.pdf', '');

      setConversionProgress(`Processing ${pageCount} pages...`);

      // Render and upload each page individually (streaming to avoid memory issues)
      for (let i = 1; i <= pageCount; i++) {
        setConversionProgress(`Rendering page ${i} of ${pageCount}...`);
        setConversionTime(i);

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        } as any).promise;

        // Extract text content
        const textContentItem = await page.getTextContent();
        const pageText = textContentItem.items.map((item: any) => item.str).join(' ');

        // Convert canvas to base64 PNG
        const dataUrl = canvas.toDataURL('image/png', 0.85); // Slightly lower quality to save memory/bandwidth

        // Upload this page immediately (streaming)
        setConversionProgress(`Uploading page ${i} of ${pageCount}...`);
        const uploadResponse = await fetch(`${API_URL}/api/render/page/${jobId}/${i}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageData: dataUrl,
            textContent: pageText,
            title: title
          })
        });

        if (!uploadResponse.ok) {
          console.error(`Failed to upload page ${i}`);
        }

        // Clear canvas to free memory
        canvas.width = 0;
        canvas.height = 0;
      }

      // Finalize the job
      setConversionProgress('Finalizing...');
      const completeResponse = await fetch(`${API_URL}/api/render/complete/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageCount,
          title
        })
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to finalize PDF processing');
      }

      // Update job status
      setJob({
        id: jobId,
        originalName: fileName,
        status: 'completed',
        pageCount: pageCount,
        title: title
      });
      setCurrentStep('customize');
      setIsConverting(false);
    } catch (error: any) {
      console.error('Client-side rendering failed:', error);
      alert(`Rendering failed: ${error.message}`);
      setIsConverting(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const generateTemplate = async () => {
    if (!job) return;

    setIsExporting(true);

    try {
      const response = await fetch(`${API_URL}/api/export/generate/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          hotspots,
          leadGen,
          title: job.title,
          pageCount: job.pageCount || 1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate template');
      }

      setPreviewUrl(`${API_URL}${data.previewUrl}`);
      setCurrentStep('export');
    } catch (error: any) {
      console.error('Generate error:', error);
      alert(`Generation failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadZip = async () => {
    if (!job) return;

    window.open(`${API_URL}/api/export/download/${job.id}`, '_blank');
  };

  const deployToVercel = async () => {
    if (!job) return;

    setIsDeploying(true);

    try {
      const response = await fetch(`${API_URL}/api/export/deploy/${job.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: job.title || job.originalName?.replace('.pdf', '')
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed');
      }

      setDeployedUrl(data.deploymentUrl);
      alert(`🚀 Deployed successfully!\n\n${data.deploymentUrl}`);
    } catch (error: any) {
      console.error('Deploy error:', error);
      alert(`Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const renderUploadStep = () => (
    <div className={styles.uploadSection}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          Transform PDFs into
          <span className={styles.gradientText}> Interactive Slideshows</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Upload your PDF and convert it into pixel-perfect, interactive HTML presentations.
          Choose from professional templates perfect for portfolios, sales decks, and magazines.
        </p>
      </div>

      <div
        className={`${styles.uploadZone} ${dragOver ? styles.dragOver : ''} ${isUploading || isConverting ? styles.uploading : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading || isConverting ? (
          <div className={styles.uploadingContent}>
            <div className={styles.spinner}></div>
            <p>{isUploading ? 'Uploading PDF...' : 'Converting to HTML...'}</p>
            {isConverting && (
              <div className={styles.timerDisplay}>
                <span className={styles.timer}>
                  {Math.floor(conversionTime / 60).toString().padStart(2, '0')}:
                  {(conversionTime % 60).toString().padStart(2, '0')}
                </span>
                <span className={styles.timerLabel}>elapsed</span>
              </div>
            )}
            <span className={styles.uploadingHint}>
              {conversionProgress || 'Rendering pages with PDF.js...'}
            </span>
          </div>
        ) : (
          <>
            <div className={styles.uploadIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <p className={styles.uploadText}>
              Drag & drop your PDF here, or <span>browse</span>
            </p>
            <span className={styles.uploadHint}>Supports PDF files up to 50MB</span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className={styles.fileInput}
            />
          </>
        )}
      </div>

      <div className={styles.featuresGrid}>
        <div className={styles.featureCard}>
          <AIIcon size={48} className={styles.featureIcon} />
          <h3 className={styles.featureTitle}>AI-Powered Search</h3>
          <p className={styles.featureDesc}>Ask questions and get instant answers from your PDF</p>
        </div>
        <div className={styles.featureCard}>
          <MobileIcon size={48} className={styles.featureIcon} />
          <h3 className={styles.featureTitle}>Mobile Reflow</h3>
          <p className={styles.featureDesc}>Automatic responsive layout for all devices</p>
        </div>
        <div className={styles.featureCard}>
          <AnalyticsIcon size={48} className={styles.featureIcon} />
          <h3 className={styles.featureTitle}>Reading Analytics</h3>
          <p className={styles.featureDesc}>Track views, time spent, and engagement</p>
        </div>
        <div className={styles.featureCard}>
          <SEOIcon size={48} className={styles.featureIcon} />
          <h3 className={styles.featureTitle}>SEO Optimized</h3>
          <p className={styles.featureDesc}>Auto-generated meta tags for better rankings</p>
        </div>
        <div className={styles.featureCard}>
          <LinkIcon size={48} className={styles.featureIcon} />
          <h3 className={styles.featureTitle}>Live-Link Updates</h3>
          <p className={styles.featureDesc}>Update content without breaking links</p>
        </div>
        <div className={styles.featureCard}>
          <RocketIcon size={48} className={styles.featureIcon} />
          <h3 className={styles.featureTitle}>One-Click Deploy</h3>
          <p className={styles.featureDesc}>Instant deployment to Vercel</p>
        </div>
      </div>
    </div>
  );

  const renderCustomizeStep = () => (
    <div className={styles.customizeSection}>
      <div className={styles.sectionHeader}>
        <h2>Customize Your Presentation</h2>
        <p>Select a template style and configure your settings</p>
      </div>

      <div className={styles.jobInfo}>
        <span className={styles.jobBadge}>✓ Converted</span>
        <span>{job?.originalName}</span>
        <span className={styles.pageCount}>{job?.pageCount} pages</span>
      </div>

      <div className={styles.templateSection}>
        <h3>Choose a Template</h3>
        <div className={styles.templateGrid}>
          <div
            className={`${styles.templateCard} ${template === 'presentation' ? styles.active : ''}`}
            onClick={() => setTemplate('presentation')}
          >
            <div className={styles.templatePreview}>
              <div className={styles.previewPresentation}>
                <div className={styles.slide}></div>
                <div className={styles.slideNav}>
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
            <h4>The Presentation</h4>
            <p>Full-screen slides with keyboard navigation</p>
            <span className={styles.templateBadge}>Pitch Decks</span>
          </div>

          <div
            className={`${styles.templateCard} ${template === 'flipbook' ? styles.active : ''}`}
            onClick={() => setTemplate('flipbook')}
          >
            <div className={styles.templatePreview}>
              <div className={styles.previewFlipbook}>
                <div className={styles.pageLeft}></div>
                <div className={styles.pageRight}></div>
              </div>
            </div>
            <h4>The Flip-Book</h4>
            <p>3D page-turning animation</p>
            <span className={styles.templateBadge}>Magazines</span>
          </div>

          <div
            className={`${styles.templateCard} ${template === 'documentation' ? styles.active : ''}`}
            onClick={() => setTemplate('documentation')}
          >
            <div className={styles.templatePreview}>
              <div className={styles.previewDocumentation}>
                <div className={styles.sidebar}></div>
                <div className={styles.content}>
                  <div className={styles.line}></div>
                  <div className={styles.line}></div>
                  <div className={styles.line}></div>
                </div>
              </div>
            </div>
            <h4>The Documentation</h4>
            <p>Vertical scroll with sticky Table of Contents</p>
            <span className={styles.templateBadge}>Whitepapers</span>
          </div>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <h4>Lead Generation Gate</h4>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={leadGen.enabled}
                onChange={(e) => setLeadGen(prev => ({ ...prev, enabled: e.target.checked }))}
              />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          {leadGen.enabled && (
            <div className={styles.settingExpanded}>
              <label>
                Free pages before lock:
                <input
                  type="number"
                  min="1"
                  max={job?.pageCount || 10}
                  value={leadGen.freePages}
                  onChange={(e) => setLeadGen(prev => ({ ...prev, freePages: parseInt(e.target.value) || 3 }))}
                  className="input"
                />
              </label>
              <p className={styles.settingHint}>
                Viewers will see {leadGen.freePages} pages before being asked for contact info
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setCurrentStep('upload');
            setJob(null);
          }}
        >
          ← Start Over
        </button>
        <button
          className="btn btn-primary"
          onClick={generateTemplate}
          disabled={isExporting}
        >
          {isExporting ? 'Generating...' : 'Generate Preview →'}
        </button>
      </div>
    </div>
  );

  const renderExportStep = () => (
    <div className={styles.exportSection}>
      <div className={styles.sectionHeader}>
        <h2>Your Presentation is Ready!</h2>
        <p>Preview your creation and download or deploy it</p>
      </div>

      <div className={styles.previewContainer}>
        {previewUrl && (
          <iframe
            src={previewUrl}
            className={styles.previewFrame}
            title="Preview"
          />
        )}
      </div>

      {deployedUrl && (
        <div className={styles.deployedBanner}>
          <span>Live at:</span>
          <a href={deployedUrl} target="_blank" rel="noopener noreferrer">{deployedUrl}</a>
        </div>
      )}

      <div className={styles.exportActions}>
        <button className="btn btn-primary" onClick={downloadZip}>
          Download ZIP
        </button>
        <button
          className="btn btn-primary"
          onClick={deployToVercel}
          disabled={isDeploying}
        >
          {isDeploying ? 'Deploying...' : 'Deploy to Vercel'}
        </button>
        <button className="btn btn-secondary" onClick={() => window.open(previewUrl || '', '_blank')}>
          Open Full Preview
        </button>
      </div>

      <div className={styles.actions}>
        <button
          className="btn btn-secondary"
          onClick={() => setCurrentStep('customize')}
        >
          ← Back to Customize
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setCurrentStep('upload');
            setJob(null);
            setPreviewUrl(null);
            setDeployedUrl(null);
          }}
        >
          Start New Conversion
        </button>
      </div>
    </div>
  );

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="PDF Slideshow" className={styles.logoImg} />
          <span>PDF Slideshow</span>
        </div>
        <nav className={styles.nav}>
          <a href="#features">Features</a>
          <a href="#templates">Templates</a>
          <a href="https://github.com/BROHUHA/pdf-to-presentation" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </header>

      <div className={styles.stepIndicator}>
        <div className={`${styles.step} ${currentStep === 'upload' ? styles.active : ''} ${job ? styles.completed : ''}`}>
          <span className={styles.stepNumber}>1</span>
          <span className={styles.stepLabel}>Upload</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.step} ${currentStep === 'customize' ? styles.active : ''} ${previewUrl ? styles.completed : ''}`}>
          <span className={styles.stepNumber}>2</span>
          <span className={styles.stepLabel}>Customize</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.step} ${currentStep === 'export' ? styles.active : ''}`}>
          <span className={styles.stepNumber}>3</span>
          <span className={styles.stepLabel}>Export</span>
        </div>
      </div>

      <div className={styles.container}>
        {currentStep === 'upload' && renderUploadStep()}
        {currentStep === 'customize' && renderCustomizeStep()}
        {currentStep === 'export' && renderExportStep()}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <img src="/logo.png" alt="PDF Slideshow" className={styles.footerLogo} />
            <span>PDF Slideshow</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="#features">Features</a>
            <a href="#templates">Templates</a>
            <a href="https://github.com/BROHUHA/pdf-to-presentation" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <div className={styles.footerCopyright}>
            © 2024 PDF Slideshow. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
