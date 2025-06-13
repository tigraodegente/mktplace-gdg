/**
 * Logger estruturado para produção
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: any;
  userId?: string;
  sessionId?: string;
  orderId?: string;
  ip?: string;
  userAgent?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
}

class ProductionLogger {
  private isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  private minLevel: LogLevel = this.isDevelopment ? 'debug' : 'warn';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private getLevelPriority(level: LogLevel): number {
    const priorities = { debug: 0, info: 1, warn: 2, error: 3 };
    return priorities[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) >= this.getLevelPriority(this.minLevel);
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    return entry;
  }

  private storeLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Em desenvolvimento, também fazer console.log
    if (this.isDevelopment) {
      const consoleMethod = entry.level === 'debug' ? 'log' : entry.level;
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context || '');
    }
  }

  private async sendToServer(entry: LogEntry) {
    // Só enviar erros e warnings para o servidor em produção
    if (!this.isDevelopment && (entry.level === 'error' || entry.level === 'warn')) {
      try {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      } catch (error) {
        // Falhou ao enviar log - não fazer nada para evitar loop
      }
    }
  }

  debug(message: string, context?: LogContext) {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.createLogEntry('debug', message, context);
    this.storeLog(entry);
  }

  info(message: string, context?: LogContext) {
    if (!this.shouldLog('info')) return;
    
    const entry = this.createLogEntry('info', message, context);
    this.storeLog(entry);
    this.sendToServer(entry);
  }

  warn(message: string, context?: LogContext) {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.createLogEntry('warn', message, context);
    this.storeLog(entry);
    this.sendToServer(entry);
  }

  error(message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog('error')) return;
    
    const entry = this.createLogEntry('error', message, context, error);
    this.storeLog(entry);
    this.sendToServer(entry);
  }

  // Métodos específicos para checkout
  checkoutStarted(context: LogContext) {
    this.info('Checkout iniciado', {
      ...context,
      action: 'checkout_started'
    });
  }

  checkoutCompleted(orderId: string, context: LogContext) {
    this.info('Checkout concluído', {
      ...context,
      orderId,
      action: 'checkout_completed'
    });
  }

  checkoutFailed(reason: string, context: LogContext, error?: Error) {
    this.error('Checkout falhou', {
      ...context,
      reason,
      action: 'checkout_failed'
    }, error);
  }

  paymentProcessed(orderId: string, method: string, context: LogContext) {
    this.info('Pagamento processado', {
      ...context,
      orderId,
      paymentMethod: method,
      action: 'payment_processed'
    });
  }

  // Capturar erro global
  captureException(error: Error, context?: LogContext) {
    this.error('Erro capturado globalmente', context, error);
  }

  // Obter logs para debug
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Limpar logs
  clearLogs() {
    this.logs = [];
  }

  // Métricas básicas
  getMetrics() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const recent = this.logs.filter(log => new Date(log.timestamp).getTime() > last24h);
    
    return {
      total: this.logs.length,
      last24h: recent.length,
      errors: recent.filter(log => log.level === 'error').length,
      warnings: recent.filter(log => log.level === 'warn').length
    };
  }
}

// Instância singleton
export const logger = new ProductionLogger();

// Helper para capturar contexto de requisição
export function getRequestContext(request?: Request): LogContext {
  if (!request) return {};
  
  return {
    ip: request.headers.get('cf-connecting-ip') || 
        request.headers.get('x-forwarded-for') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  };
}

// Helper para capturar contexto do usuário
export function getUserContext(user?: any): LogContext {
  if (!user) return {};
  
  return {
    userId: user.id,
    userEmail: user.email
  };
} 