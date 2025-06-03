// Sistema de monitoramento de performance
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  // Medir tempo de carregamento de API
  async measureApiCall<T>(
    name: string, 
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      this.recordMetric(`api_${name}`, duration);
      
      if (duration > 1000) {
        console.warn(`⚠️ API lenta detectada: ${name} levou ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`api_${name}_error`, duration);
      throw error;
    }
  }
  
  // Medir tempo de renderização de componente
  measureRender(componentName: string, renderFn: () => void): void {
    const startTime = performance.now();
    renderFn();
    const duration = performance.now() - startTime;
    
    this.recordMetric(`render_${componentName}`, duration);
    
    if (duration > 16) { // 60fps = 16ms por frame
      console.warn(`⚠️ Renderização lenta: ${componentName} levou ${duration.toFixed(2)}ms`);
    }
  }
  
  // Gravar métrica
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Manter apenas os últimos 10 valores
    if (values.length > 10) {
      values.shift();
    }
  }
  
  // Obter estatísticas
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      stats[name] = {
        average: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: values.length
      };
    }
    
    return stats;
  }
  
  // Relatório de performance
  generateReport(): void {
    const stats = this.getStats();
    
    console.group('📊 Relatório de Performance');
    for (const [name, stat] of Object.entries(stats)) {
      console.log(`${name}:`, stat);
    }
    console.groupEnd();
  }
}

// Hook para usar em componentes Svelte
export function usePerformanceMonitor() {
  return PerformanceMonitor.getInstance();
}

// Medir vitals da página
export function measureWebVitals(): void {
  if (typeof window === 'undefined') return;
  
  // Largest Contentful Paint
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('🎯 LCP:', lastEntry.startTime);
  }).observe({ entryTypes: ['largest-contentful-paint'] });
  
  // First Input Delay
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    for (const entry of entries) {
      console.log('⚡ FID:', (entry as any).processingStart - entry.startTime);
    }
  }).observe({ entryTypes: ['first-input'] });
  
  // Cumulative Layout Shift
  new PerformanceObserver((entryList) => {
    let clsValue = 0;
    for (const entry of entryList.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    }
    console.log('📐 CLS:', clsValue);
  }).observe({ entryTypes: ['layout-shift'] });
}
