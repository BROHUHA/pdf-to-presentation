/**
 * Analytics Service for Heatmap Tracking
 * Generates tracking scripts and handles analytics data
 */

/**
 * Analytics event types
 */
interface AnalyticsEvent {
    type: 'pageview' | 'scroll' | 'time' | 'hotspot_click' | 'form_submit';
    pageIndex: number;
    timestamp: number;
    data?: Record<string, any>;
}

interface PageAnalytics {
    pageIndex: number;
    views: number;
    avgTimeSpent: number;
    scrollDepth: number;
    hotspotClicks: number;
}

interface DocumentAnalytics {
    documentId: string;
    totalViews: number;
    uniqueVisitors: number;
    avgPagesViewed: number;
    dropOffPage: number;
    topPages: PageAnalytics[];
    conversionRate: number;
}

/**
 * Generate the analytics tracking script to embed in generated HTML
 */
export function generateAnalyticsScript(
    documentId: string,
    webhookUrl?: string
): string {
    return `
<!-- PDF Slideshow Analytics -->
<script>
(function() {
  const DOC_ID = '${documentId}';
  const WEBHOOK = ${webhookUrl ? `'${webhookUrl}'` : 'null'};
  const SESSION_ID = 'sess_' + Math.random().toString(36).substr(2, 9);
  
  const analytics = {
    events: [],
    currentPage: 0,
    pageStartTime: Date.now(),
    maxScroll: 0,
    
    init() {
      this.trackPageView(0);
      this.setupScrollTracking();
      this.setupHotspotTracking();
      this.setupUnloadHandler();
      this.setupNavigationTracking();
    },
    
    track(type, pageIndex, data = {}) {
      const event = {
        type,
        pageIndex,
        timestamp: Date.now(),
        data: { ...data, sessionId: SESSION_ID }
      };
      this.events.push(event);
      
      // Send to webhook if configured
      if (WEBHOOK && (type === 'hotspot_click' || type === 'form_submit')) {
        this.sendToWebhook([event]);
      }
    },
    
    trackPageView(pageIndex) {
      // Record time on previous page
      if (this.currentPage !== pageIndex) {
        const timeSpent = Date.now() - this.pageStartTime;
        if (timeSpent > 1000) { // Only record if > 1 second
          this.track('time', this.currentPage, { duration: timeSpent });
        }
      }
      
      this.currentPage = pageIndex;
      this.pageStartTime = Date.now();
      this.track('pageview', pageIndex);
    },
    
    setupScrollTracking() {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollPercent = Math.round(
              (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            if (scrollPercent > this.maxScroll) {
              this.maxScroll = scrollPercent;
              if (scrollPercent % 25 === 0) { // Track at 25%, 50%, 75%, 100%
                this.track('scroll', this.currentPage, { depth: scrollPercent });
              }
            }
            ticking = false;
          });
          ticking = true;
        }
      });
    },
    
    setupHotspotTracking() {
      document.addEventListener('click', (e) => {
        const hotspot = e.target.closest('.hotspot-link');
        if (hotspot) {
          this.track('hotspot_click', this.currentPage, {
            url: hotspot.href,
            label: hotspot.title || hotspot.getAttribute('data-label')
          });
        }
      });
    },
    
    setupNavigationTracking() {
      // Override to track page navigation (for presentation/flipbook)
      const self = this;
      
      // Watch for slide changes via mutation observer
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.classList?.contains('active') && target.classList?.contains('slide')) {
              const index = parseInt(target.dataset?.index || '0');
              self.trackPageView(index);
            }
          }
        }
      });
      
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class']
      });
    },
    
    setupUnloadHandler() {
      const self = this;
      window.addEventListener('beforeunload', () => {
        // Record final time on page
        const timeSpent = Date.now() - self.pageStartTime;
        self.track('time', self.currentPage, { duration: timeSpent, final: true });
        
        // Send remaining events
        self.sendToWebhook(self.events);
      });
    },
    
    sendToWebhook(events) {
      if (!WEBHOOK || events.length === 0) return;
      
      const payload = {
        documentId: DOC_ID,
        sessionId: SESSION_ID,
        events
      };
      
      // Use sendBeacon for reliability on unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(WEBHOOK, JSON.stringify(payload));
      } else {
        fetch(WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    },
    
    getStats() {
      const pageViews = {};
      const pageTimes = {};
      
      for (const event of this.events) {
        if (event.type === 'pageview') {
          pageViews[event.pageIndex] = (pageViews[event.pageIndex] || 0) + 1;
        }
        if (event.type === 'time' && event.data?.duration) {
          if (!pageTimes[event.pageIndex]) {
            pageTimes[event.pageIndex] = [];
          }
          pageTimes[event.pageIndex].push(event.data.duration);
        }
      }
      
      return { pageViews, pageTimes, maxScroll: this.maxScroll };
    }
  };
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => analytics.init());
  } else {
    analytics.init();
  }
  
  // Expose for debugging
  window.__pdfAnalytics = analytics;
})();
</script>
`;
}

/**
 * Generate analytics dashboard HTML component
 */
export function generateAnalyticsDashboard(): string {
    return `
<div id="analytics-dashboard" style="display: none; position: fixed; top: 0; right: 0; width: 320px; height: 100vh; background: rgba(15,15,35,0.95); backdrop-filter: blur(10px); padding: 20px; z-index: 9999; overflow-y: auto; font-family: system-ui; color: #fff;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <h3 style="margin: 0; font-size: 18px;">📊 Analytics</h3>
    <button onclick="this.parentElement.parentElement.style.display='none'" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;">×</button>
  </div>
  
  <div id="analytics-content">
    <p style="color: rgba(255,255,255,0.6);">Loading analytics...</p>
  </div>
  
  <script>
    function updateAnalytics() {
      const stats = window.__pdfAnalytics?.getStats();
      if (!stats) return;
      
      const content = document.getElementById('analytics-content');
      const pageViews = stats.pageViews;
      const pageTimes = stats.pageTimes;
      
      let html = '<div style="margin-bottom: 20px;">';
      html += '<div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 8px;">';
      html += '<span style="opacity: 0.7;">Max Scroll</span><span style="font-weight: 600;">' + stats.maxScroll + '%</span></div>';
      
      html += '<h4 style="margin: 16px 0 8px; font-size: 14px; opacity: 0.7;">Page Views</h4>';
      
      Object.entries(pageViews).forEach(([page, views]) => {
        const avgTime = pageTimes[page] ? Math.round(pageTimes[page].reduce((a,b) => a+b, 0) / pageTimes[page].length / 1000) : 0;
        html += '<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">';
        html += '<span>Page ' + (parseInt(page) + 1) + '</span>';
        html += '<span style="opacity: 0.7;">' + views + ' views • ' + avgTime + 's avg</span></div>';
      });
      
      html += '</div>';
      content.innerHTML = html;
    }
    
    setInterval(updateAnalytics, 2000);
    updateAnalytics();
  </script>
</div>

<button onclick="document.getElementById('analytics-dashboard').style.display='block'" 
  style="position: fixed; bottom: 20px; right: 20px; width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; color: #fff; font-size: 20px; cursor: pointer; box-shadow: 0 4px 20px rgba(99,102,241,0.4); z-index: 9998;">
  📊
</button>
`;
}

/**
 * Calculate document analytics from events
 */
export function calculateDocumentAnalytics(events: AnalyticsEvent[]): DocumentAnalytics {
    const sessions = new Set<string>();
    const pageViewsByPage: Record<number, number> = {};
    const timeByPage: Record<number, number[]> = {};
    let totalViews = 0;
    let hotspotClicks = 0;
    let formSubmits = 0;
    let lastViewedPages: number[] = [];

    for (const event of events) {
        const sessionId = event.data?.sessionId;
        if (sessionId) sessions.add(sessionId);

        switch (event.type) {
            case 'pageview':
                totalViews++;
                pageViewsByPage[event.pageIndex] = (pageViewsByPage[event.pageIndex] || 0) + 1;
                lastViewedPages.push(event.pageIndex);
                break;
            case 'time':
                if (event.data?.duration) {
                    if (!timeByPage[event.pageIndex]) timeByPage[event.pageIndex] = [];
                    timeByPage[event.pageIndex].push(event.data.duration);
                }
                break;
            case 'hotspot_click':
                hotspotClicks++;
                break;
            case 'form_submit':
                formSubmits++;
                break;
        }
    }

    // Find drop-off page (most common last page viewed)
    const pageCounts: Record<number, number> = {};
    for (const page of lastViewedPages) {
        pageCounts[page] = (pageCounts[page] || 0) + 1;
    }
    const dropOffPage = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    // Calculate page analytics
    const topPages: PageAnalytics[] = Object.entries(pageViewsByPage)
        .map(([pageIndex, views]) => {
            const times = timeByPage[parseInt(pageIndex)] || [];
            const avgTime = times.length > 0
                ? times.reduce((a, b) => a + b, 0) / times.length
                : 0;

            return {
                pageIndex: parseInt(pageIndex),
                views,
                avgTimeSpent: Math.round(avgTime / 1000),
                scrollDepth: 0,
                hotspotClicks: 0
            };
        })
        .sort((a, b) => b.views - a.views);

    return {
        documentId: '',
        totalViews,
        uniqueVisitors: sessions.size,
        avgPagesViewed: sessions.size > 0 ? totalViews / sessions.size : 0,
        dropOffPage: parseInt(dropOffPage as string),
        topPages,
        conversionRate: totalViews > 0 ? (formSubmits / sessions.size) * 100 : 0
    };
}
