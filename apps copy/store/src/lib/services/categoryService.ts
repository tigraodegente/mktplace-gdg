export interface Subcategory {
	readonly id: string;
	readonly name: string;
	readonly slug: string;
	readonly product_count?: number;
}

export interface Category {
	readonly id: string;
	readonly name: string;
	readonly slug: string;
	readonly icon?: string;
	readonly subcategories: Subcategory[];
	readonly product_count?: number;
	readonly position?: number;
}

export interface CategoryResponse {
	readonly success: boolean;
	readonly data?: {
		readonly categories: Category[];
		readonly total: number;
	};
	readonly error?: {
		readonly message: string;
		readonly details?: string;
	};
}

// Constants
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const API_ENDPOINT = '/api/categories';
const DEFAULT_ICON_KEY = 'brinquedos';

// Icon definitions separadas para melhor manutenção
const CATEGORY_ICONS: Readonly<Record<string, string>> = {
	'bebes': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
	</svg>`,
	'meninas': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
	</svg>`,
	'meninos': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
	</svg>`,
	'brinquedos': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/>
	</svg>`,
	'maternidade': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
	</svg>`,
	'seguranca': `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
	</svg>`
};

// Cache interface para melhor tipagem
interface CacheEntry {
	data: Category[];
	timestamp: number;
}

// Error class customizada
export class CategoryServiceError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = 'CategoryServiceError';
	}
}

// Service class com melhor estrutura
class CategoryService {
	private cache: CacheEntry | null = null;
	private pendingRequest: Promise<Category[]> | null = null;

	/**
	 * Busca categorias com cache e deduplicação de requests
	 */
	async getCategories(includeCount: boolean = true): Promise<Category[]> {
		// Verificar cache válido
		if (this.isCacheValid()) {
			return this.cache!.data;
		}

		// Se já existe uma request em andamento, retornar ela
		if (this.pendingRequest) {
			return this.pendingRequest;
		}

		// Criar nova request
		this.pendingRequest = this.fetchCategories(includeCount)
			.finally(() => {
				this.pendingRequest = null;
			});

		return this.pendingRequest;
	}

	/**
	 * Limpa o cache de categorias
	 */
	clearCache(): void {
		this.cache = null;
		this.pendingRequest = null;
	}

	/**
	 * Retorna o ícone de uma categoria
	 */
	getCategoryIcon(category: Category): string {
		return category.icon || this.getDefaultIcon(category.slug);
	}

	/**
	 * Verifica se o cache é válido
	 */
	private isCacheValid(): boolean {
		if (!this.cache) return false;
		
		const now = Date.now();
		return now - this.cache.timestamp < CACHE_DURATION_MS;
	}

	/**
	 * Busca categorias da API
	 */
	private async fetchCategories(includeCount: boolean): Promise<Category[]> {
		let lastError: Error | null = null;
		const maxRetries = 3;
		
		// Retry logic para erros de conexão
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const url = new URL(API_ENDPOINT, window.location.origin);
				url.searchParams.set('includeCount', String(includeCount));

				console.log(`[CategoryService] Tentativa ${attempt}/${maxRetries} - URL: ${url.toString()}`);

				// Criar AbortController para timeout manual
				const controller = new AbortController();
				const timeoutId = setTimeout(() => {
					console.log(`[CategoryService] Timeout de 10s atingido na tentativa ${attempt}`);
					controller.abort();
				}, 10000); // Reduzido para 10s

				console.log(`[CategoryService] Iniciando fetch...`);
				const startTime = Date.now();

				const response = await fetch(url.toString(), {
					method: 'GET',
					headers: {
						'Accept': 'application/json',
					},
					signal: controller.signal
				});

				const fetchTime = Date.now() - startTime;
				console.log(`[CategoryService] Fetch completado em ${fetchTime}ms, status: ${response.status}`);

				clearTimeout(timeoutId); // Limpar timeout se a requisição completou

				if (!response.ok) {
					// Se for erro 500, tentar novamente após um delay
					if (response.status === 500 && attempt < maxRetries) {
						console.warn(`[CategoryService] Erro 500, tentativa ${attempt}/${maxRetries}`);
						await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Delay progressivo
						continue;
					}
					
					throw new CategoryServiceError(
						`Erro ao buscar categorias: ${response.statusText}`,
						'FETCH_ERROR',
						{ status: response.status }
					);
				}

				console.log(`[CategoryService] Parseando JSON...`);
				const data: CategoryResponse = await response.json();
				console.log(`[CategoryService] JSON parseado, success: ${data.success}, categorias: ${data.data?.categories?.length || 0}`);
				
				if (!data.success || !data.data) {
					throw new CategoryServiceError(
						data.error?.message || 'Resposta inválida da API',
						'INVALID_RESPONSE',
						data.error
					);
				}

				// Atualizar cache
				this.cache = {
					data: data.data.categories,
					timestamp: Date.now()
				};

				console.log(`[CategoryService] Cache atualizado com ${data.data.categories.length} categorias`);
				return data.data.categories;
			} catch (error) {
				lastError = error as Error;
				console.error(`[CategoryService] Erro na tentativa ${attempt}:`, error);
				
				// Se for erro de timeout ou conexão e não for a última tentativa, tentar novamente
				if (attempt < maxRetries && 
					(error instanceof TypeError || 
					 (error as any)?.name === 'AbortError' ||
					 (error instanceof CategoryServiceError && error.code === 'FETCH_ERROR'))) {
					console.warn(`[CategoryService] Erro de conexão/timeout, tentativa ${attempt}/${maxRetries}:`, error);
					await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
					continue;
				}
				
				// Re-throw se já for CategoryServiceError
				if (error instanceof CategoryServiceError) {
					throw error;
				}

				// Wrap outros erros
				console.error('[CategoryService] Erro ao buscar categorias:', error);
				throw new CategoryServiceError(
					'Erro ao buscar categorias',
					'UNKNOWN_ERROR',
					error
				);
			}
		}
		
		// Se chegou aqui, todas as tentativas falharam
		throw lastError || new CategoryServiceError(
			'Erro ao buscar categorias após múltiplas tentativas',
			'MAX_RETRIES_EXCEEDED'
		);
	}

	/**
	 * Retorna o ícone padrão para uma categoria
	 */
	private getDefaultIcon(slug: string): string {
		return CATEGORY_ICONS[slug] || CATEGORY_ICONS[DEFAULT_ICON_KEY];
	}
}

// Singleton instance
export const categoryService = new CategoryService(); 