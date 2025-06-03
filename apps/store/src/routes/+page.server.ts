import type { PageServerLoad } from './$types';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import { getDatabase } from '$lib/db';

// Interface otimizada baseada na estrutura real do banco
interface Product {
	id: string;
	name: string;
	slug: string;
	description?: string;
	price: number;
	original_price?: number;
	discount?: number;
	image?: string;
	images?: string[];
	category_id: string;
	category_name?: string;
	seller_id: string;
	seller_name?: string;
	sku?: string;
	rating?: number;
	reviews_count?: number;
	sold_count?: number;
	is_black_friday?: boolean;
	has_fast_delivery?: boolean;
	tags?: string[];
	stock?: number;
	created_at?: string;
	updated_at?: string;
}

// Cache simples em memória para desenvolvimento
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCached<T>(key: string): T | null {
	const cached = cache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.data;
	}
	cache.delete(key);
	return null;
}

function setCache<T>(key: string, data: T): void {
	cache.set(key, { data, timestamp: Date.now() });
}

export const load: PageServerLoad = async ({ platform, fetch, setHeaders }) => {
	console.log('🏠 Carregando dados da página principal - Estratégia híbrida...');
	
	// Headers de cache otimizados
	setHeaders({
		'cache-control': 'public, max-age=300, s-maxage=600', // 5min client, 10min CDN
		'vary': 'Accept-Encoding'
	});
	
	try {
		// Usar cache para dados que mudam menos frequentemente
		const cacheKey = 'homepage-data';
		const cachedData = getCached<any>(cacheKey);
		
		if (cachedData) {
			console.log('📋 Dados da página principal vindos do cache');
			return cachedData;
		}
		
		// Buscar todos os dados em paralelo com timeout
		const [featuredProducts, categoriesData, statsData]: [Product[], any[], any] = await Promise.all([
			// Produtos em destaque - query simplificada
			(async (): Promise<Product[]> => {
				try {
					const db = getDatabase(platform);
					
					const queryPromise = (async () => {
						// Query simplificada sem WITH/CTE
				const products = await db.query`
					SELECT 
						p.id,
						p.name,
						p.slug,
						p.description,
						p.price,
						p.original_price,
						p.quantity as stock,
						p.sku,
						p.sales_count,
						p.rating_average,
						p.rating_count,
						p.tags,
						p.is_active,
						p.featured,
						p.created_at,
						p.updated_at,
						c.name as category_name,
						c.slug as category_slug,
						b.name as brand_name,
								s.company_name as seller_name
					FROM products p
					LEFT JOIN categories c ON c.id = p.category_id
					LEFT JOIN brands b ON b.id = p.brand_id
					LEFT JOIN sellers s ON s.id = p.seller_id
					WHERE 
						p.is_active = true 
						AND p.featured = true 
						AND p.quantity > 0
							ORDER BY p.sales_count DESC NULLS LAST, p.rating_average DESC NULLS LAST
					LIMIT 8
				`;
						
						// Buscar imagens separadamente para evitar array_agg complexo
						const productIds = products.map(p => p.id);
						let images: any[] = [];
						
						if (productIds.length > 0) {
							try {
								images = await db.query`
									SELECT 
										product_id,
										url,
										position
									FROM product_images
									WHERE product_id = ANY(${productIds})
									ORDER BY position ASC
								`;
							} catch (imgError) {
								console.log('⚠️ Erro ao buscar imagens, continuando sem elas');
								images = [];
							}
						}
						
						// Mapear imagens para produtos
						const imageMap = new Map();
						images.forEach(img => {
							if (!imageMap.has(img.product_id)) {
								imageMap.set(img.product_id, []);
							}
							imageMap.get(img.product_id).push(img.url);
						});
				
				return products.map((product: any): Product => ({
					id: product.id,
					name: product.name,
					slug: product.slug,
					description: product.description,
					price: Number(product.price),
					original_price: product.original_price ? Number(product.original_price) : undefined,
					discount: product.original_price && product.price < product.original_price
						? Math.round(((product.original_price - product.price) / product.original_price) * 100)
						: undefined,
							images: imageMap.get(product.id) || [],
							image: (imageMap.get(product.id) || [])[0] || '/api/placeholder/300/400?text=Produto&bg=f0f0f0&color=333',
					category_id: product.category_id,
					category_name: product.category_name,
					seller_id: product.seller_id,
					seller_name: product.seller_name,
					stock: product.stock,
					sku: product.sku,
					tags: product.tags || [],
					rating: product.rating_average ? Number(product.rating_average) : undefined,
					reviews_count: product.rating_count,
					sold_count: product.sales_count,
							is_black_friday: product.original_price && product.price < product.original_price
								&& ((product.original_price - product.price) / product.original_price) >= 0.3,
							has_fast_delivery: (product.tags || []).some((tag: string) => 
								['entrega-rapida', 'frete-gratis'].includes(tag)),
					created_at: product.created_at?.toISOString(),
					updated_at: product.updated_at?.toISOString()
				}));
					})();

					const timeoutPromise = new Promise<never>((_, reject) => 
						setTimeout(() => reject(new Error('Timeout products')), 5000)
					);
					
					return await Promise.race([queryPromise, timeoutPromise]);
				} catch (error) {
					console.log('⚠️ Erro ao buscar produtos:', error);
					throw new Error('Não foi possível carregar os produtos');
				}
			})(),
			
			// Categorias - query simplificada
			(async (): Promise<any[]> => {
				try {
					const db = getDatabase(platform);
					
					const queryPromise = (async () => {
				const categories = await db.query`
					SELECT 
						c.id,
						c.name,
						c.slug,
						c.description,
								COUNT(p.id) as product_count
					FROM categories c
					LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true AND p.quantity > 0
					WHERE c.is_active = true
					GROUP BY c.id, c.name, c.slug, c.description
							HAVING COUNT(p.id) > 0
							ORDER BY COUNT(p.id) DESC
					LIMIT 6
				`;
				
				return categories.map((cat: any) => ({
					id: cat.id,
					name: cat.name,
					slug: cat.slug,
					icon: getCategoryIcon(cat.slug || cat.name),
					count: parseInt(cat.product_count) || 0
				}));
					})();

					const timeoutPromise = new Promise<never>((_, reject) => 
						setTimeout(() => reject(new Error('Timeout categories')), 3000)
					);
					
					return await Promise.race([queryPromise, timeoutPromise]);
				} catch (error) {
					console.log('⚠️ Erro ao buscar categorias:', error);
					throw new Error('Não foi possível carregar as categorias');
				}
			})(),
			
			// Estatísticas - query simples
			(async (): Promise<any> => {
				try {
					const db = getDatabase(platform);
					
					const queryPromise = (async () => {
						// Queries separadas em vez de subqueries complexas
						const [products, categories, sellers, featured] = await Promise.all([
							db.queryOne`SELECT COUNT(*) as count FROM products WHERE is_active = true AND quantity > 0`,
							db.queryOne`SELECT COUNT(*) as count FROM categories WHERE is_active = true`,
							db.queryOne`SELECT COUNT(*) as count FROM sellers WHERE is_active = true`,
							db.queryOne`SELECT COUNT(*) as count FROM products WHERE featured = true AND is_active = true`
						]);
				
				return {
							totalProducts: parseInt(products?.count || '0'),
							totalCategories: parseInt(categories?.count || '0'),
							totalSellers: parseInt(sellers?.count || '0'),
							featuredProducts: parseInt(featured?.count || '0')
						};
					})();

					const timeoutPromise = new Promise<never>((_, reject) => 
						setTimeout(() => reject(new Error('Timeout stats')), 3000)
					);
					
					return await Promise.race([queryPromise, timeoutPromise]);
				} catch (error) {
					console.log('⚠️ Erro ao buscar estatísticas:', error);
					throw new Error('Não foi possível carregar as estatísticas');
				}
			})()
		]);
		
		const result = {
			featuredProducts,
			categories: categoriesData,
			stats: statsData,
			dataSource: 'database',
			meta: {
				loadTime: Date.now(),
				cached: false
			}
		};
		
		// Armazenar no cache apenas se temos dados reais
		setCache(cacheKey, result);
		
		console.log(`✅ Página principal carregada: ${featuredProducts.length} produtos, ${categoriesData.length} categorias`);
		return result;
		
	} catch (error) {
		console.error('❌ Erro ao carregar página principal:', error);
		
		// Retornar erro ao invés de dados mockados
		return {
			featuredProducts: [],
			categories: [],
			stats: {
				totalProducts: 0,
				totalCategories: 0,
				totalSellers: 0,
				featuredProducts: 0
			},
			dataSource: 'error',
			error: 'Desculpe, estamos com problemas técnicos. Por favor, tente novamente em alguns instantes.',
			meta: {
				loadTime: Date.now(),
				cached: false
			}
		};
	}
};

// Função auxiliar otimizada para ícones de categoria
function getCategoryIcon(categorySlug: string): string {
	const iconMap: Record<string, string> = {
		'bebe': '👶',
		'baby': '👶',
		'infantil': '🧸',
		'kids': '🧸',
		'children': '🧸',
		'criancas': '🧸',
		'quarto': '🛏️',
		'bedroom': '🛏️',
		'banheiro': '🛁',
		'bathroom': '🛁',
		'organizacao': '📦',
		'organization': '📦',
		'decoracao': '🎨',
		'decoration': '🎨',
		'roupas': '👕',
		'clothes': '👕',
		'vestuario': '👕',
		'brinquedos': '🎮',
		'toys': '🎮',
		'casa': '🏠',
		'home': '🏠',
		'cozinha': '🍳',
		'kitchen': '🍳',
		'higiene': '🧴',
		'cuidados': '💊',
		'alimentacao': '🍼',
		'mobiliario': '🪑',
		'enxoval': '🧺'
	};
	
	const slug = categorySlug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	return iconMap[slug] || '📦';
} 