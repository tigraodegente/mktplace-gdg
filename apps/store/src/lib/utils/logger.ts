// Sistema de logging otimizado para produção
interface LogLevel {
	ERROR: 'error';
	WARN: 'warn';
	INFO: 'info';
	DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
	ERROR: 'error',
	WARN: 'warn',
	INFO: 'info',
	DEBUG: 'debug'
};

interface LogContext {
	operation?: string;
	userId?: string;
	sessionId?: string;
	requestId?: string;
	duration?: number;
	metadata?: Record<string, any>;
}

class Logger {
	private isDev = import.meta.env.DEV;
	private isClient = typeof window !== 'undefined';
	private context: LogContext = {};
	
	// Configurar contexto para requests/operações
	setContext(context: LogContext) {
		this.context = { ...this.context, ...context };
		return this;
	}
	
	// Limpar contexto
	clearContext() {
		this.context = {};
		return this;
	}
	
	private formatMessage(level: string, message: string, data?: any): string {
		const timestamp = new Date().toISOString();
		const env = this.isClient ? 'CLIENT' : 'SERVER';
		const contextStr = this.context.operation ? `[${this.context.operation}]` : '';
		
		return `[${timestamp}] [${env}] [${level.toUpperCase()}]${contextStr} ${message}`;
	}
	
	// Log de erros críticos (sempre logado)
	error(message: string, data?: any) {
		const formatted = this.formatMessage(LOG_LEVELS.ERROR, message);
		console.error(formatted, this.sanitizeData({ ...data, context: this.context }));
		
		// Em produção, enviar para serviço de monitoramento
		if (!this.isDev && this.isClient) {
			this.sendToErrorService(formatted, data);
		}
	}
	
	// Log de warnings (apenas em desenvolvimento)
	warn(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.WARN, message);
			console.warn(formatted, this.sanitizeData({ ...data, context: this.context }));
		}
	}
	
	// Log de informações (apenas em desenvolvimento)
	info(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.INFO, message);
			console.log(formatted, this.sanitizeData({ ...data, context: this.context }));
		}
	}
	
	// Log de debug (apenas em desenvolvimento)
	debug(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message);
			console.log(formatted, this.sanitizeData({ ...data, context: this.context }));
		}
	}
	
	// Log de operações importantes (produção = apenas sucesso, dev = tudo)
	operation(success: boolean, message: string, data?: any) {
		if (success) {
			// Sucessos sempre são logados (mas apenas em dev com detalhes)
			if (this.isDev) {
				this.info(`✅ ${message}`, data);
			}
		} else {
			// Falhas sempre são logadas como erro
			this.error(`❌ ${message}`, data);
		}
	}
	
	// Log de performance (apenas em desenvolvimento)
	performance(label: string, startTime: number, metadata?: any) {
		if (this.isDev) {
			const duration = performance.now() - startTime;
			this.debug(`⚡ Performance [${label}]: ${duration.toFixed(2)}ms`, { 
				duration, 
				...metadata 
			});
		}
	}
	
	// Log de autenticação (com dados sanitizados)
	auth(action: string, success: boolean, data?: any) {
		const sanitized = this.sanitizeAuthData(data);
		if (success) {
			this.info(`🔐 Auth ${action} success`, sanitized);
		} else {
			this.warn(`🔐 Auth ${action} failed`, sanitized);
		}
	}
	
	// Log de API calls
	api(method: string, endpoint: string, status: number, duration?: number, data?: any) {
		const isSuccess = status >= 200 && status < 300;
		const emoji = isSuccess ? '✅' : status >= 500 ? '💥' : '⚠️';
		const level = isSuccess ? 'info' : status >= 500 ? 'error' : 'warn';
		
		const message = `${emoji} API ${method} ${endpoint} → ${status}${duration ? ` (${duration}ms)` : ''}`;
		
		if (level === 'error') {
			this.error(message, this.sanitizeData(data));
		} else if (level === 'warn') {
			this.warn(message, this.sanitizeData(data));
		} else {
			this.info(message, this.sanitizeData(data));
		}
	}
	
	// Remover dados sensíveis dos logs
	private sanitizeData(data: any): any {
		if (!data || typeof data !== 'object') return data;
		
		const sensitiveFields = [
			'password', 'password_hash', 'token', 'session_token', 
			'secret', 'key', 'auth', 'authorization', 'cookie',
			'credit_card', 'card_number', 'cvv', 'cpf', 'email'
		];
		
		const sanitized = { ...data };
		
		for (const field of sensitiveFields) {
			if (field in sanitized) {
				if (typeof sanitized[field] === 'string' && sanitized[field].length > 4) {
					sanitized[field] = `${sanitized[field].substring(0, 4)}****`;
				} else {
					sanitized[field] = '****';
				}
			}
		}
		
		return sanitized;
	}
	
	// Sanitizar especificamente dados de auth
	private sanitizeAuthData(data: any): any {
		if (!data) return data;
		
		return {
			...this.sanitizeData(data),
			// Manter apenas dados não sensíveis
			email: data.email ? `${data.email.substring(0, 3)}****` : undefined,
			userId: data.userId,
			role: data.role,
			sessionLength: data.sessionLength
		};
	}
	
	private sendToErrorService(message: string, data?: any) {
		// TODO: Implementar integração com serviço de monitoramento
		// Ex: Sentry, LogRocket, etc.
		if (typeof window !== 'undefined' && window.gtag) {
			window.gtag('event', 'exception', {
				description: message,
				fatal: false
			});
		}
	}
}

// Instância singleton
export const logger = new Logger();

// Helper functions para facilitar uso
export const logAuth = (action: string, success: boolean, data?: any) => 
	logger.auth(action, success, data);

export const logAPI = (method: string, endpoint: string, status: number, duration?: number, data?: any) => 
	logger.api(method, endpoint, status, duration, data);

export const logOperation = (success: boolean, message: string, data?: any) => 
	logger.operation(success, message, data);

export const logPerformance = (label: string, startTime: number, metadata?: any) => 
	logger.performance(label, startTime, metadata);

export default logger;
