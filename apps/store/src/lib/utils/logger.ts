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

class Logger {
	private isDev = import.meta.env.DEV;
	private isClient = typeof window !== 'undefined';
	
	private formatMessage(level: string, message: string, data?: any): string {
		const timestamp = new Date().toISOString();
		const context = this.isClient ? 'CLIENT' : 'SERVER';
		return `[${timestamp}] [${context}] [${level.toUpperCase()}] ${message}`;
	}
	
	error(message: string, data?: any) {
		const formatted = this.formatMessage(LOG_LEVELS.ERROR, message);
		console.error(formatted, data);
		
		// Em produção, enviar para serviço de monitoramento
		if (!this.isDev && this.isClient) {
			this.sendToErrorService(formatted, data);
		}
	}
	
	warn(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.WARN, message);
			console.warn(formatted, data);
		}
	}
	
	info(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.INFO, message);
			console.log(formatted, data);
		}
	}
	
	debug(message: string, data?: any) {
		if (this.isDev) {
			const formatted = this.formatMessage(LOG_LEVELS.DEBUG, message);
			console.log(formatted, data);
		}
	}
	
	performance(label: string, startTime: number) {
		if (this.isDev) {
			const duration = performance.now() - startTime;
			this.debug(`Performance [${label}]: ${duration.toFixed(2)}ms`);
		}
	}
	
	private sendToErrorService(message: string, data?: any) {
		// TODO: Implementar integração com serviço de monitoramento
		// Ex: Sentry, LogRocket, etc.
	}
}

export const logger = new Logger();
export default logger;
