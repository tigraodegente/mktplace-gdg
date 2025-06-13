/**
 * Test Monitor - Cart Store Validation
 * 
 * Sistema de monitoramento para testes manuais
 * Rastreia performance, erros e comportamento
 */

interface TestEvent {
  timestamp: Date;
  type: 'action' | 'error' | 'performance' | 'api';
  event: string;
  data?: any;
  duration?: number;
}

interface PerformanceMetrics {
  apiCalls: number;
  errors: number;
  averageResponseTime: number;
  memoryUsage: number;
  slowOperations: TestEvent[];
}

class CartTestMonitor {
  private events: TestEvent[] = [];
  private startTime: Date;
  private isActive = false;
  
  constructor() {
    this.startTime = new Date();
    this.setupEventListeners();
  }
  
  start() {
    this.isActive = true;
    this.events = [];
    this.startTime = new Date();
    
    console.group('🔍 MONITORAMENTO CART STORE INICIADO');
    console.log('📊 Versão ativa:', this.getActiveVersion());
    console.log('⏰ Início:', this.startTime.toLocaleTimeString());
    console.log('📝 Para ver relatório: window.__cartTestReport()');
    console.groupEnd();
    
    // Disponibilizar funções globalmente
    if (typeof window !== 'undefined') {
      (window as any).__cartTestReport = () => this.generateReport();
      (window as any).__cartTestStop = () => this.stop();
    }
  }
  
  stop() {
    this.isActive = false;
    const report = this.generateReport();
    
    console.group('🏁 MONITORAMENTO FINALIZADO');
    console.log(report);
    console.groupEnd();
    
    return report;
  }
  
  private log(type: TestEvent['type'], event: string, data?: any, duration?: number) {
    if (!this.isActive) return;
    
    const testEvent: TestEvent = {
      timestamp: new Date(),
      type,
      event,
      data,
      duration
    };
    
    this.events.push(testEvent);
    
    // Log crítico no console
    if (type === 'error') {
      console.error(`❌ [${type.toUpperCase()}] ${event}`, data);
    } else if (duration && duration > 1000) {
      console.warn(`⚠️ [SLOW] ${event} took ${duration}ms`, data);
    } else {
      console.log(`✅ [${type.toUpperCase()}] ${event}`, data);
    }
  }
  
  private setupEventListeners() {
    if (typeof window === 'undefined') return;
    
    // Interceptar erros
    window.addEventListener('error', (e) => {
      this.log('error', 'JavaScript Error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno
      });
    });
    
    // Interceptar promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      this.log('error', 'Unhandled Promise Rejection', {
        reason: e.reason
      });
    });
    
    // Interceptar fetch calls (API monitoring)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0].toString();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.log('api', `Fetch: ${url}`, {
          status: response.status,
          ok: response.ok,
          url
        }, duration);
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.log('error', `Fetch Failed: ${url}`, error, duration);
        throw error;
      }
    };
  }
  
  private getActiveVersion(): string {
    try {
      const cartStore = (window as any).__cartStoreVersion || 'unknown';
      return cartStore;
    } catch {
      return 'unknown';
    }
  }
  
  private generateReport(): PerformanceMetrics {
    const totalTime = new Date().getTime() - this.startTime.getTime();
    const apiCalls = this.events.filter(e => e.type === 'api').length;
    const errors = this.events.filter(e => e.type === 'error').length;
    const slowOperations = this.events.filter(e => e.duration && e.duration > 500);
    
    const responseTimes = this.events
      .filter(e => e.type === 'api' && e.duration)
      .map(e => e.duration!);
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const memoryUsage = (performance as any).memory 
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 
      : 0;
    
    const report: PerformanceMetrics = {
      apiCalls,
      errors,
      averageResponseTime: Math.round(averageResponseTime),
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      slowOperations
    };
    
    return report;
  }
  
  // Métodos para testar fluxos específicos
  trackCartAction(action: string, data?: any) {
    const startTime = performance.now();
    
    return {
      complete: (result?: any) => {
        const duration = performance.now() - startTime;
        this.log('action', `Cart: ${action}`, { ...data, result }, duration);
      },
      error: (error: any) => {
        const duration = performance.now() - startTime;
        this.log('error', `Cart: ${action} failed`, { ...data, error }, duration);
      }
    };
  }
}

// =============================================================================
// INSTANCE E HELPERS
// =============================================================================

let monitor: CartTestMonitor | null = null;

export function startCartMonitoring() {
  if (!monitor) {
    monitor = new CartTestMonitor();
  }
  monitor.start();
  return monitor;
}

export function stopCartMonitoring() {
  if (monitor) {
    return monitor.stop();
  }
  return null;
}

export function trackCartAction(action: string, data?: any) {
  if (monitor) {
    return monitor.trackCartAction(action, data);
  }
  return {
    complete: () => {},
    error: () => {}
  };
}

// Auto-start em desenvolvimento
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🔍 Cart Test Monitor disponível');
  console.log('▶️ Iniciar: window.__startCartMonitoring()');
  console.log('🛑 Parar: window.__stopCartMonitoring()');
  
  (window as any).__startCartMonitoring = startCartMonitoring;
  (window as any).__stopCartMonitoring = stopCartMonitoring;
} 