// Sistema de monitoramento de performance para desenvolvimento
class PerformanceMonitor {
	private static instance: PerformanceMonitor;
	private metrics: Map<string, any[]> = new Map();
	private observers: Map<string, PerformanceObserver> = new Map();
	
	static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor();
		}
		return PerformanceMonitor.instance;
	}
	
	// Medir tempo de carregamento de páginas
	measurePageLoad(pageName: string) {
		if (typeof window === 'undefined') return;
		
		const startTime = performance.now();
		
		// Usar requestIdleCallback se disponível
		const callback = () => {
			const endTime = performance.now();
			const loadTime = endTime - startTime;
			
			this.logMetric('pageLoad', {
				page: pageName,
				loadTime,
				timestamp: new Date().toISOString(),
				userAgent: navigator.userAgent,
				connection: (navigator as any).connection?.effectiveType || 'unknown'
			});
		};
		
		if ('requestIdleCallback' in window) {
			(window as any).requestIdleCallback(callback);
		} else {
			setTimeout(callback, 0);
		}
	}
	
	// Medir performance de APIs
	measureApiCall(endpoint: string, startTime: number, success: boolean, dataSize?: number) {
		const endTime = performance.now();
		const duration = endTime - startTime;
		
		this.logMetric('apiCall', {
			endpoint,
			duration,
			success,
			dataSize,
			timestamp: new Date().toISOString()
		});
	}
	
	// Medir performance de componentes
	measureComponentRender(componentName: string, renderTime: number) {
		this.logMetric('componentRender', {
			component: componentName,
			renderTime,
			timestamp: new Date().toISOString()
		});
	}
	
	// Observar Core Web Vitals
	observeWebVitals() {
		if (typeof window === 'undefined') return;
		
		// Largest Contentful Paint (LCP)
		this.createObserver('largest-contentful-paint', (entries) => {
			const lcp = entries[entries.length - 1];
			this.logMetric('webVitals', {
				metric: 'LCP',
				value: lcp.startTime,
				timestamp: new Date().toISOString()
			});
		});
		
		// First Input Delay (FID)
		this.createObserver('first-input', (entries) => {
			entries.forEach(entry => {
				this.logMetric('webVitals', {
					metric: 'FID',
					value: entry.processingStart - entry.startTime,
					timestamp: new Date().toISOString()
				});
			});
		});
		
		// Cumulative Layout Shift (CLS)
		this.createObserver('layout-shift', (entries) => {
			let clsValue = 0;
			entries.forEach(entry => {
				if (!entry.hadRecentInput) {
					clsValue += entry.value;
				}
			});
			
			if (clsValue > 0) {
				this.logMetric('webVitals', {
					metric: 'CLS',
					value: clsValue,
					timestamp: new Date().toISOString()
				});
			}
		});
	}
	
	private createObserver(type: string, callback: (entries: any[]) => void) {
		try {
			const observer = new PerformanceObserver((list) => {
				callback(list.getEntries());
			});
			
			observer.observe({ type, buffered: true });
			this.observers.set(type, observer);
		} catch (error) {
			console.log(`Observer for ${type} not supported`);
		}
	}
	
	private logMetric(category: string, data: any) {
		if (!this.metrics.has(category)) {
			this.metrics.set(category, []);
		}
		
		const metrics = this.metrics.get(category)!;
		metrics.push(data);
		
		// Manter apenas os últimos 100 registros por categoria
		if (metrics.length > 100) {
			metrics.shift();
		}
		
		// Log no console apenas em desenvolvimento
		if (import.meta.env.DEV) {
		}
	}
	
	// Gerar relatório de performance
	generateReport(): PerformanceReport {
		const report: PerformanceReport = {
			timestamp: new Date().toISOString(),
			summary: {},
			details: {}
		};
		
		this.metrics.forEach((metrics, category) => {
			if (metrics.length === 0) return;
			
			report.details[category] = metrics;
			
			switch (category) {
				case 'pageLoad':
					const avgLoadTime = metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length;
					report.summary[category] = {
						average: Math.round(avgLoadTime),
						count: metrics.length,
						fastest: Math.round(Math.min(...metrics.map(m => m.loadTime))),
						slowest: Math.round(Math.max(...metrics.map(m => m.loadTime)))
					};
					break;
					
				case 'apiCall':
					const successRate = metrics.filter(m => m.success).length / metrics.length * 100;
					const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
					report.summary[category] = {
						successRate: Math.round(successRate),
						averageDuration: Math.round(avgDuration),
						totalCalls: metrics.length
					};
					break;
					
				case 'webVitals':
					const vitals = metrics.reduce((acc, m) => {
						if (!acc[m.metric]) acc[m.metric] = [];
						acc[m.metric].push(m.value);
						return acc;
					}, {} as Record<string, number[]>);
					
					Object.keys(vitals).forEach(metric => {
						const values = vitals[metric];
						report.summary[`webVitals_${metric}`] = {
							average: Math.round(values.reduce((sum: number, v: number) => sum + v, 0) / values.length),
							latest: Math.round(values[values.length - 1])
						};
					});
					break;
			}
		});
		
		return report;
	}
	
	// Limpar métricas
	clear() {
		this.metrics.clear();
	}
	
	// Cleanup observers
	destroy() {
		this.observers.forEach(observer => observer.disconnect());
		this.observers.clear();
		this.metrics.clear();
	}
}

interface PerformanceReport {
	timestamp: string;
	summary: Record<string, any>;
	details: Record<string, any[]>;
}

// Utilitários para medição
export function measureAsync<T>(
	name: string,
	asyncFn: () => Promise<T>
): Promise<T> {
	const monitor = PerformanceMonitor.getInstance();
	const startTime = performance.now();
	
	return asyncFn()
		.then(result => {
			monitor.measureApiCall(name, startTime, true);
			return result;
		})
		.catch(error => {
			monitor.measureApiCall(name, startTime, false);
			throw error;
		});
}

export function measureSync<T>(
	name: string,
	syncFn: () => T
): T {
	const monitor = PerformanceMonitor.getInstance();
	const startTime = performance.now();
	
	try {
		const result = syncFn();
		const endTime = performance.now();
		monitor.measureComponentRender(name, endTime - startTime);
		return result;
	} catch (error) {
		const endTime = performance.now();
		monitor.measureComponentRender(name, endTime - startTime);
		throw error;
	}
}

// Hook para monitoramento automático em componentes Svelte
export function usePerformanceMonitoring(componentName: string) {
	const monitor = PerformanceMonitor.getInstance();
	
	// Medir tempo de montagem do componente
	const mountStart = performance.now();
	
	// Retornar funções úteis
	return {
		markMounted: () => {
			const mountTime = performance.now() - mountStart;
			monitor.measureComponentRender(`${componentName}_mount`, mountTime);
		},
		
		measureAction: <T>(actionName: string, fn: () => T): T => {
			return measureSync(`${componentName}_${actionName}`, fn);
		},
		
		measureAsyncAction: <T>(actionName: string, fn: () => Promise<T>): Promise<T> => {
			return measureAsync(`${componentName}_${actionName}`, fn);
		}
	};
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-inicializar observadores em ambiente de desenvolvimento
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	performanceMonitor.observeWebVitals();
	
	// Exibir relatório no console a cada 30 segundos
	setInterval(() => {
		const report = performanceMonitor.generateReport();
		if (Object.keys(report.summary).length > 0) {
			console.table(report.summary);
		}
	}, 30000);
} 