import type { PageServerLoad } from './$types';
import { withDatabase } from '$lib/db';

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
	console.log('🏠 Carregando dados da página principal...');
	
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
			return cachedData;
		}
		
		// Buscar todos os dados em paralelo para melhor performance
		const [featuredProducts, categoriesData, statsData] = await Promise.all([
			// Produtos em destaque - query otimizada
			withDatabase(platform, async (db) => {
				const products = await db.query`
					WITH product_images AS (
						SELECT 
							pi.product_id,
							array_agg(pi.url ORDER BY pi.position) as images,
							pi.url as primary_image
						FROM product_images pi
						WHERE pi.position = 1 OR pi.position IS NULL
						GROUP BY pi.product_id, pi.url
					)
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
						COALESCE(pi.images, ARRAY[]::text[]) as images,
						c.name as category_name,
						c.slug as category_slug,
						b.name as brand_name,
						s.company_name as seller_name
					FROM products p
					LEFT JOIN product_images pi ON pi.product_id = p.id
					LEFT JOIN categories c ON c.id = p.category_id
					LEFT JOIN brands b ON b.id = p.brand_id
					LEFT JOIN sellers s ON s.id = p.seller_id
					WHERE 
						p.is_active = true 
						AND p.featured = true 
						AND p.quantity > 0
					ORDER BY p.sales_count DESC, p.rating_average DESC NULLS LAST
					LIMIT 8
				`;
				
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
					images: product.images || [],
					image: product.images?.[0] || '/api/placeholder/300/400?text=Produto&bg=f0f0f0&color=333',
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
					is_black_friday: false, // Implementar lógica de promoções depois
					has_fast_delivery: true, // Implementar lógica de entrega depois
					created_at: product.created_at?.toISOString(),
					updated_at: product.updated_at?.toISOString()
				}));
			}),
			
			// Categorias - buscar diretamente do banco
			withDatabase(platform, async (db) => {
				const categories = await db.query`
					SELECT 
						c.id,
						c.name,
						c.slug,
						c.description,
						COUNT(DISTINCT p.id) as product_count
					FROM categories c
					LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true AND p.quantity > 0
					WHERE c.is_active = true
					GROUP BY c.id, c.name, c.slug, c.description
					HAVING COUNT(DISTINCT p.id) > 0
					ORDER BY COUNT(DISTINCT p.id) DESC
					LIMIT 6
				`;
				
				return categories.map((cat: any) => ({
					id: cat.id,
					name: cat.name,
					slug: cat.slug,
					icon: getCategoryIcon(cat.slug || cat.name),
					count: parseInt(cat.product_count) || 0
				}));
			}),
			
			// Estatísticas - query otimizada
			withDatabase(platform, async (db) => {
				const stats = await db.queryOne`
					SELECT 
						(SELECT COUNT(*) FROM products WHERE is_active = true AND quantity > 0) as total_products,
						(SELECT COUNT(*) FROM categories WHERE is_active = true) as total_categories,
						(SELECT COUNT(*) FROM sellers WHERE is_active = true) as total_sellers,
						(SELECT COUNT(*) FROM products WHERE featured = true AND is_active = true) as featured_products
				`;
				
				return {
					totalProducts: parseInt(stats?.total_products || '0'),
					totalCategories: parseInt(stats?.total_categories || '0'),
					totalSellers: parseInt(stats?.total_sellers || '0'),
					featuredProducts: parseInt(stats?.featured_products || '0')
				};
			})
		]);
		
		const result = {
			featuredProducts,
			categories: categoriesData,
			stats: statsData,
			dataSource: {
				products: 'database',
				categories: 'database',
				stats: 'database'
			},
			meta: {
				loadTime: Date.now(),
				cached: false
			}
		};
		
		// Armazenar no cache
		setCache(cacheKey, result);
		
		console.log(`✅ Página principal carregada: ${featuredProducts.length} produtos, ${categoriesData.length} categorias`);
		return result;
		
	} catch (error) {
		console.error('❌ Erro crítico ao carregar página principal:', error);
		
		// Em caso de erro, retornar estrutura mínima sem dados mock
		return {
			featuredProducts: [],
			categories: [],
			stats: {
				totalProducts: 0,
				totalCategories: 0,
				totalSellers: 0,
				featuredProducts: 0
			},
			dataSource: {
				products: 'error',
				categories: 'error',
				stats: 'error'
			},
			error: 'Erro ao conectar com o banco de dados',
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