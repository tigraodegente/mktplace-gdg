export class RealUserMonitoring {
  private static instance: RealUserMonitoring;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new RealUserMonitoring();
    }
    return this.instance;
  }
  
  init() {
    if (typeof window === 'undefined') return;
    
    this.trackPerformance();
    this.trackErrors();
    this.trackUserBehavior();
    this.trackConnectivity();
  }
  
  private trackPerformance() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        // Page Load Time
        const loadTime = Math.round(navigation.loadEventEnd - navigation.fetchStart);
        if (typeof gtag !== 'undefined') {
          gtag('event', 'timing_complete', {
            name: 'page_load',
            value: loadTime
          });
        }
        
        // DOM Content Loaded
        const domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart);
        if (typeof gtag !== 'undefined') {
          gtag('event', 'timing_complete', {
            name: 'dom_content_loaded',
            value: domContentLoaded
          });
        }
        
        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        
        if (fcp && typeof gtag !== 'undefined') {
          gtag('event', 'timing_complete', {
            name: 'first_contentful_paint',
            value: Math.round(fcp.startTime)
          });
        }
        
        console.log('📊 Performance metrics tracked');
      }, 0);
    });
  }
  
  private trackErrors() {
    // JavaScript Errors
    window.addEventListener('error', (event) => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'exception', {
          description: `${event.filename}:${event.lineno} - ${event.message}`,
          fatal: false
        });
      }
      console.error('JS Error tracked:', event.message);
    });
    
    // Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'exception', {
          description: `Unhandled Promise: ${event.reason}`,
          fatal: false
        });
      }
      console.error('Promise rejection tracked:', event.reason);
    });
  }
  
  private trackUserBehavior() {
    let maxScroll = 0;
    let scrollTracked = {
      '25': false,
      '50': false,
      '75': false,
      '90': false
    };
    
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        if (maxScroll >= 25 && !scrollTracked['25']) {
          scrollTracked['25'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 25 });
          }
        } else if (maxScroll >= 50 && !scrollTracked['50']) {
          scrollTracked['50'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 50 });
          }
        } else if (maxScroll >= 75 && !scrollTracked['75']) {
          scrollTracked['75'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 75 });
          }
        } else if (maxScroll >= 90 && !scrollTracked['90']) {
          scrollTracked['90'] = true;
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll', { percent: 90 });
          }
        }
      }
    });
    
    // Time on page
    const startTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      if (typeof gtag !== 'undefined') {
        gtag('event', 'timing_complete', {
          name: 'time_on_page',
          value: timeOnPage
        });
      }
    });
  }
  
  private trackConnectivity() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (typeof gtag !== 'undefined') {
        gtag('event', 'connectivity', {
          effective_type: connection.effectiveType,
          downlink: connection.downlink,
          save_data: connection.saveData
        });
      }
    }
  }
}

// Auto-init
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    RealUserMonitoring.getInstance().init();
  });
}

// Declaração de tipos para gtag
declare global {
  function gtag(...args: any[]): void;
} 