import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/db';

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
		// Buscar produtos em destaque do banco
		const featuredResponse = await fetch('/api/products/featured?limit=8');
		let featuredProducts: Product[] = [];
		
		if (featuredResponse.ok) {
			const featuredData = await featuredResponse.json();
			if (featuredData.success && featuredData.data) {
				featuredProducts = featuredData.data;
				console.log(`✅ ${featuredProducts.length} produtos em destaque carregados do banco`);
			}
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
				},
				{
					id: '3',
					name: 'Organizador de Brinquedos MDF',
					slug: 'organizador-brinquedos-mdf',
					description: 'Organizador colorido para brinquedos',
					price: 189.99,
					original_price: 249.99,
					discount: 24,
					images: ['/api/placeholder/300/400?text=Organizador&bg=FFE5F5&color=333'],
					image: '/api/placeholder/300/400?text=Organizador&bg=FFE5F5&color=333',
					category_id: 'organization',
					seller_id: 'seller1',
					is_active: true,
					stock: 2,
					stock_alert_threshold: 5,
					sku: 'ORG-MDF-003',
					tags: ['MDF'],
					pieces: 1,
					is_featured: true,
					is_black_friday: true,
					has_fast_delivery: false,
					created_at: new Date(),
					updated_at: new Date()
				},
				{
					id: '4',
					name: 'Tapete Infantil Educativo ABC',
					slug: 'tapete-infantil-educativo-abc',
					description: 'Tapete educativo com letras e números',
					price: 129.99,
					original_price: 169.99,
					discount: 24,
					images: ['/api/placeholder/300/400?text=Tapete&bg=E5FFE5&color=333'],
					image: '/api/placeholder/300/400?text=Tapete&bg=E5FFE5&color=333',
					category_id: 'kids',
					seller_id: 'seller3',
					is_active: true,
					stock: 5,
					stock_alert_threshold: 10,
					sku: 'TAP-ABC-004',
					tags: ['EVA'],
					pieces: 26,
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
					count: cat.product_count || 0,
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
				{ name: 'Bebê', icon: '👶', count: 234 },
				{ name: 'Infantil', icon: '🧸', count: 567 },
				{ name: 'Quarto', icon: '🛏️', count: 189 },
				{ name: 'Banheiro', icon: '🛁', count: 123 },
				{ name: 'Organização', icon: '📦', count: 89 },
				{ name: 'Decoração', icon: '🎨', count: 156 }
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
				products: featuredProducts.length > 4 ? 'database' : 'mock',
				categories: categories.length > 6 ? 'database' : 'mock'
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
				{ name: 'Bebê', icon: '👶', count: 234 },
				{ name: 'Infantil', icon: '🧸', count: 567 }
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