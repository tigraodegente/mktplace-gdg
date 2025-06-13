/**
 * Migration Monitor - Sistema de Monitoramento da Migração
 * 
 * Monitora o status da migração do cart store e coleta métricas
 * para garantir que a transição seja feita com segurança
 */

import { getCartStoreInfo, MIGRATION_CONFIG } from '$lib/features/cart';

// Tipos para metrics
interface MigrationMetrics {
  storeType: 'consolidated' | 'legacy';
  storeVersion: string;
  isWorking: boolean;
  features: string[];
  loadTime: number;
  errorCount: number;
  lastError?: string;
  userAgent: string;
  timestamp: number;
}

interface PerformanceEntry {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

class MigrationMonitor {
  private metrics: MigrationMetrics[] = [];
  private performanceEntries: PerformanceEntry[] = [];
  private errorLog: Array<{ error: string; timestamp: number; context: string }> = [];
  private maxLogSize = 100;

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined') return;

    // Log inicial do status
    this.logStoreStatus();

    // Monitorar erros globais relacionados ao cart
    this.setupErrorTracking();

    // Enviar métricas periodicamente (se configurado)
    if (MIGRATION_CONFIG.LOG_LEVEL === 'debug') {
      this.setupPeriodicReporting();
    }
  }

  private logStoreStatus() {
    try {
      const startTime = performance.now();
      const storeInfo = getCartStoreInfo();
      const loadTime = performance.now() - startTime;

      const metrics: MigrationMetrics = {
        storeType: storeInfo.type,
        storeVersion: storeInfo.version,
        isWorking: storeInfo.isWorking,
        features: storeInfo.features,
        loadTime,
        errorCount: this.errorLog.length,
        lastError: this.errorLog[this.errorLog.length - 1]?.error,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      this.metrics.push(metrics);
      this.trimLogs();

      // Log baseado no nível configurado
      this.logBasedOnLevel(metrics);

    } catch (error) {
      this.logError('Failed to log store status', error as Error, 'logStoreStatus');
    }
  }

  private logBasedOnLevel(metrics: MigrationMetrics) {
    const level = MIGRATION_CONFIG.LOG_LEVEL;

    switch (level) {
      case 'debug':
        console.debug('📊 Migration Metrics:', metrics);
        break;
      case 'info':
        console.log(`🔄 Cart Store: ${metrics.storeType} v${metrics.storeVersion} (${metrics.loadTime.toFixed(2)}ms)`);
        break;
      case 'warn':
        if (!metrics.isWorking || metrics.errorCount > 0) {
          console.warn(`⚠️ Cart Store Issues: ${metrics.storeType} - Errors: ${metrics.errorCount}`);
        }
        break;
      case 'error':
        if (!metrics.isWorking) {
          console.error(`❌ Cart Store Not Working: ${metrics.storeType}`);
        }
        break;
    }
  }

  private setupErrorTracking() {
    if (typeof window === 'undefined') return;

    // Interceptar erros relacionados ao cart
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.toLowerCase().includes('cart') || 
          message.toLowerCase().includes('store') ||
          message.toLowerCase().includes('checkout')) {
        this.logError(message, new Error(message), 'console.error');
      }
      originalError.apply(console, args);
    };

    // Interceptar erros não capturados
    window.addEventListener('error', (event) => {
      if (event.message.toLowerCase().includes('cart') ||
          event.filename?.includes('cart')) {
        this.logError(event.message, event.error, 'window.error');
      }
    });

    // Interceptar promisses rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.toString() || 'Unknown rejection';
      if (reason.toLowerCase().includes('cart')) {
        this.logError(`Unhandled Promise Rejection: ${reason}`, new Error(reason), 'unhandledrejection');
      }
    });
  }

  private setupPeriodicReporting() {
    // Relatório a cada 5 minutos em modo debug
    setInterval(() => {
      this.generateReport();
    }, 5 * 60 * 1000);

    // Relatório ao sair da página
    window.addEventListener('beforeunload', () => {
      this.generateReport();
    });
  }

  public logError(message: string, error: Error, context: string) {
    this.errorLog.push({
      error: `${message}: ${error.message}`,
      timestamp: Date.now(),
      context
    });

    this.trimLogs();

    // Re-verificar store após erro
    setTimeout(() => {
      this.logStoreStatus();
    }, 100);
  }

  public logOperation(operation: string, startTime: number, success: boolean, error?: string) {
    const entry: PerformanceEntry = {
      operation,
      duration: performance.now() - startTime,
      success,
      error,
      timestamp: Date.now()
    };

    this.performanceEntries.push(entry);
    this.trimLogs();

    // Log operações lentas
    if (entry.duration > 100) {
      console.warn(`🐌 Slow operation: ${operation} (${entry.duration.toFixed(2)}ms)`);
    }

    // Log operações com erro
    if (!success && error) {
      console.error(`❌ Failed operation: ${operation} - ${error}`);
    }
  }

  private trimLogs() {
    // Manter apenas os últimos registros
    if (this.metrics.length > this.maxLogSize) {
      this.metrics = this.metrics.slice(-this.maxLogSize);
    }
    
    if (this.performanceEntries.length > this.maxLogSize) {
      this.performanceEntries = this.performanceEntries.slice(-this.maxLogSize);
    }
    
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  public generateReport(): MigrationReport {
    const currentMetrics = this.metrics[this.metrics.length - 1];
    const totalErrors = this.errorLog.length;
    const recentErrors = this.errorLog.filter(e => Date.now() - e.timestamp < 60000); // Últimos 1min
    
    const avgLoadTime = this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length;
    const successRate = this.performanceEntries.length > 0 
      ? (this.performanceEntries.filter(e => e.success).length / this.performanceEntries.length) * 100
      : 100;

    const report: MigrationReport = {
      timestamp: Date.now(),
      storeType: currentMetrics?.storeType || 'unknown',
      storeVersion: currentMetrics?.storeVersion || 'unknown',
      isStable: totalErrors === 0 && (currentMetrics?.isWorking ?? false),
      phase: MIGRATION_CONFIG.PHASE,
      enabled: MIGRATION_CONFIG.ENABLED,
      
      performance: {
        avgLoadTime,
        successRate,
        totalOperations: this.performanceEntries.length
      },
      
      errors: {
        total: totalErrors,
        recent: recentErrors.length,
        lastError: this.errorLog[this.errorLog.length - 1]?.error
      },
      
      features: currentMetrics?.features || [],
      
      recommendations: this.generateRecommendations(currentMetrics, totalErrors, successRate)
    };

    // Log do relatório
    if (MIGRATION_CONFIG.LOG_LEVEL === 'debug') {
      console.log('📋 Migration Report:', report);
    }

    return report;
  }

  private generateRecommendations(
    currentMetrics: MigrationMetrics | undefined, 
    totalErrors: number, 
    successRate: number
  ): string[] {
    const recommendations: string[] = [];

    if (!currentMetrics?.isWorking) {
      recommendations.push('⚠️ Store não está funcionando - verificar fallback');
    }

    if (totalErrors > 10) {
      recommendations.push('🔴 Muitos erros detectados - considerar rollback');
    }

    if (successRate < 95) {
      recommendations.push('📉 Taxa de sucesso baixa - investigar problemas');
    }

    if (currentMetrics?.loadTime && currentMetrics.loadTime > 50) {
      recommendations.push('🐌 Tempo de carregamento alto - otimizar');
    }

    if (currentMetrics?.storeType === 'legacy' && MIGRATION_CONFIG.PHASE as string === '3') {
      recommendations.push('🔄 Store legacy ativo na fase 3 - verificar configuração');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Sistema estável - prosseguir com migração');
    }

    return recommendations;
  }

  // Métodos públicos para acesso aos dados
  public getMetrics(): MigrationMetrics[] {
    return [...this.metrics];
  }

  public getErrors(): Array<{ error: string; timestamp: number; context: string }> {
    return [...this.errorLog];
  }

  public getPerformanceEntries(): PerformanceEntry[] {
    return [...this.performanceEntries];
  }

  public isStable(): boolean {
    const report = this.generateReport();
    return report.isStable && report.performance.successRate > 98;
  }
}

// Tipos para o relatório
interface MigrationReport {
  timestamp: number;
  storeType: string;
  storeVersion: string;
  isStable: boolean;
  phase: string;
  enabled: boolean;
  performance: {
    avgLoadTime: number;
    successRate: number;
    totalOperations: number;
  };
  errors: {
    total: number;
    recent: number;
    lastError?: string;
  };
  features: string[];
  recommendations: string[];
}

// Instância global
export const migrationMonitor = new MigrationMonitor();

// Função helper para monitorar operações
export function monitorOperation<T>(
  operation: string, 
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return fn()
    .then(result => {
      migrationMonitor.logOperation(operation, startTime, true);
      return result;
    })
    .catch(error => {
      migrationMonitor.logOperation(operation, startTime, false, error.message);
      throw error;
    });
}

// Função helper para monitorar operações síncronas
export function monitorSyncOperation<T>(
  operation: string,
  fn: () => T
): T {
  const startTime = performance.now();
  
  try {
    const result = fn();
    migrationMonitor.logOperation(operation, startTime, true);
    return result;
  } catch (error) {
    migrationMonitor.logOperation(operation, startTime, false, (error as Error).message);
    throw error;
  }
}

// Export de tipos
export type { MigrationReport, MigrationMetrics, PerformanceEntry }; 