import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/db';
import { withDatabase } from '$lib/db';

// Interface local do produto para a página principal
interface Product {
	id: string;
	name: string;
	slug: string;
	description: string;
	price: number;
	original_price?: number;
	discount?: number;
	images: string[];
	image: string;
	category_id: string;
	seller_id: string;
	is_active: boolean;
	stock: number;
	stock_alert_threshold?: number;
	sku: string;
	tags: string[];
	pieces?: number;
	is_featured?: boolean;
	is_black_friday?: boolean;
	has_fast_delivery?: boolean;
	created_at: Date;
	updated_at: Date;
}

export const load: PageServerLoad = async ({ platform, fetch }) => {
	console.log('🏠 Carregando dados da página principal...');
	
	try {
		// Buscar produtos em destaque diretamente do banco (não via fetch)
		let featuredProducts: Product[] = [];
		
		try {
			const productsFromDb = await withDatabase(platform, async (db) => {
				const products = await db.query`
					WITH product_images AS (
						SELECT 
							pi.product_id,
							array_agg(pi.url ORDER BY pi.position) as images
						FROM product_images pi
						GROUP BY pi.product_id
					)
					SELECT 
						p.*,
						COALESCE(pi.images, ARRAY[]::text[]) as images,
						c.name as category_name,
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
					ORDER BY p.sales_count DESC
					LIMIT 8
				`;
				
				return products.map((product: any) => ({
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
					seller_id: product.seller_id,
					is_active: product.is_active,
					stock: product.quantity,
					stock_alert_threshold: product.stock_alert_threshold,
					sku: product.sku,
					tags: product.tags || [],
					pieces: product.pieces,
					is_featured: true,
					is_black_friday: false,
					has_fast_delivery: true,
					created_at: product.created_at,
					updated_at: product.updated_at
				}));
			});
			
			featuredProducts = productsFromDb;
			console.log(`✅ ${featuredProducts.length} produtos em destaque carregados do banco`);
			
		} catch (error) {
			console.error('❌ Erro ao carregar produtos do banco:', error);
		}
		
		// Fallback para dados mock se não conseguir do banco
		if (featuredProducts.length === 0) {
			console.log('⚠️ Usando dados mock para produtos em destaque');
			featuredProducts = [
				{
					id: '1',
					name: 'Kit Berço Completo Ursinhos',
					slug: 'kit-berco-completo-ursinhos',
					description: 'Kit completo para berço com tema de ursinhos',
					price: 299.99,
					original_price: 399.99,
					discount: 25,
					images: ['/api/placeholder/300/400?text=Kit+Berço&bg=FFE5E5&color=333'],
					image: '/api/placeholder/300/400?text=Kit+Berço&bg=FFE5E5&color=333',
					category_id: 'baby',
					seller_id: 'seller1',
					is_active: true,
					stock: 3,
					stock_alert_threshold: 5,
					sku: 'KB-URS-001',
					tags: ['100% ALGODÃO'],
					pieces: 8,
					is_featured: true,
					is_black_friday: true,
					has_fast_delivery: true,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: '2',
					name: 'Jogo de Lençol Infantil Dinossauros',
					slug: 'jogo-lencol-infantil-dinossauros',
					description: 'Jogo de lençol com estampa de dinossauros',
					price: 149.99,
					original_price: 189.99,
					discount: 21,
					images: ['/api/placeholder/300/400?text=Lençol&bg=E5F5FF&color=333'],
					image: '/api/placeholder/300/400?text=Lençol&bg=E5F5FF&color=333',
					category_id: 'kids',
					seller_id: 'seller2',
					is_active: true,
					stock: 25,
					stock_alert_threshold: 10,
					sku: 'JL-DIN-002',
					tags: ['MICROFIBRA'],
					pieces: 3,
					is_featured: true,
					is_black_friday: false,
					has_fast_delivery: true,
					created_at: new Date(),
					updated_at: new Date()
				}
			];
		}
		
		// Buscar categorias do banco
		const categoriesResponse = await fetch('/api/categories/tree');
		let categories: any[] = [];
		
		if (categoriesResponse.ok) {
			const categoriesData = await categoriesResponse.json();
			if (categoriesData.success && categoriesData.data) {
				// Mapear para formato esperado pela página principal
				categories = categoriesData.data.slice(0, 6).map((cat: any) => ({
					name: cat.name,
					icon: getCategoryIcon(cat.slug || cat.name),
					count: cat.productCount || 0, // Usar productCount ao invés de product_count
					slug: cat.slug,
					id: cat.id
				}));
				console.log(`✅ ${categories.length} categorias carregadas do banco`);
			}
		}
		
		// Fallback para categorias mock se não conseguir do banco
		if (categories.length === 0) {
			console.log('⚠️ Usando dados mock para categorias');
			categories = [
				{ name: 'Bebê', icon: '👶', count: 234, slug: 'bebe', id: 'bebe-categoria-001' },
				{ name: 'Infantil', icon: '🧸', count: 567, slug: 'infantil', id: 'infantil-categoria-002' },
				{ name: 'Quarto', icon: '🛏️', count: 189, slug: 'quarto', id: 'quarto-categoria-003' },
				{ name: 'Banheiro', icon: '🛁', count: 123, slug: 'banheiro', id: 'banheiro-categoria-004' },
				{ name: 'Organização', icon: '📦', count: 89, slug: 'organizacao', id: 'organizacao-categoria-004' },
				{ name: 'Decoração', icon: '🎨', count: 156, slug: 'decoracao', id: 'decoracao-categoria-006' }
			];
		}
		
		// Buscar estatísticas gerais
		let stats = {
			totalProducts: featuredProducts.length,
			totalCategories: categories.length,
			totalSellers: 0
		};
		
		// Tentar buscar estatísticas reais do banco
		try {
			if (platform) {
				const db = getDatabase(platform);
				if (db) {
					const statsResult = await db.query(`
						SELECT 
							(SELECT COUNT(*) FROM products WHERE is_active = true) as total_products,
							(SELECT COUNT(*) FROM categories WHERE is_active = true) as total_categories,
							(SELECT COUNT(*) FROM sellers WHERE is_active = true) as total_sellers
					`);
					
					if (statsResult && statsResult.length > 0) {
						stats = {
							totalProducts: parseInt(statsResult[0].total_products) || 0,
							totalCategories: parseInt(statsResult[0].total_categories) || 0,
							totalSellers: parseInt(statsResult[0].total_sellers) || 0
						};
						console.log('✅ Estatísticas carregadas do banco:', stats);
					}
				}
			}
		} catch (error) {
			console.log('⚠️ Erro ao carregar estatísticas, usando dados calculados');
		}
		
		console.log('🏠 Página principal carregada com sucesso!');
		return {
			featuredProducts,
			categories,
			stats,
			dataSource: {
				products: featuredProducts.length > 2 ? 'database' : 'mock', // Só marca como database se temos produtos reais
				categories: categories.length > 0 ? 'database' : 'mock'
			}
		};
		
	} catch (error) {
		console.error('❌ Erro ao carregar página principal:', error);
		
		// Fallback completo para dados mock em caso de erro
		return {
			featuredProducts: [
				{
					id: '1',
					name: 'Kit Berço Completo Ursinhos',
					slug: 'kit-berco-completo-ursinhos',
					description: 'Kit completo para berço com tema de ursinhos',
					price: 299.99,
					original_price: 399.99,
					discount: 25,
					images: ['/api/placeholder/300/400?text=Kit+Berço&bg=FFE5E5&color=333'],
					image: '/api/placeholder/300/400?text=Kit+Berço&bg=FFE5E5&color=333',
					category_id: 'baby',
					seller_id: 'seller1',
					is_active: true,
					stock: 3,
					stock_alert_threshold: 5,
					sku: 'KB-URS-001',
					tags: ['100% ALGODÃO'],
					pieces: 8,
					is_featured: true,
					is_black_friday: true,
					has_fast_delivery: true,
					created_at: new Date(),
					updated_at: new Date()
				}
			],
			categories: [
				{ name: 'Bebê', icon: '👶', count: 234, slug: 'bebe', id: 'bebe-categoria-001' },
				{ name: 'Infantil', icon: '🧸', count: 567, slug: 'infantil', id: 'infantil-categoria-002' }
			],
			stats: {
				totalProducts: 1,
				totalCategories: 2,
				totalSellers: 1
			},
			dataSource: {
				products: 'mock',
				categories: 'mock'
			}
		};
	}
};

// Função auxiliar para mapear ícones de categoria
function getCategoryIcon(categorySlug: string): string {
	const iconMap: Record<string, string> = {
		'bebe': '👶',
		'baby': '👶',
		'infantil': '🧸',
		'kids': '🧸',
		'children': '🧸',
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
		'brinquedos': '🎮',
		'toys': '🎮',
		'casa': '🏠',
		'home': '🏠',
		'cozinha': '🍳',
		'kitchen': '🍳'
	};
	
	const slug = categorySlug.toLowerCase();
	return iconMap[slug] || '📦';
} 