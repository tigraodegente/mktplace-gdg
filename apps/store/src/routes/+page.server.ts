import type { PageServerLoad } from './$types';
import type { Product } from '@mktplace/shared-types';

// Por enquanto vamos usar uma query SQL direta
// Depois podemos migrar para o Xata client quando estiver funcionando
export const load: PageServerLoad = async () => {
	// Simulando dados do banco por enquanto
	// TODO: Conectar com o banco real via Xata ou SQL direto
	
	const featuredProducts: Product[] = [
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
			stock: 15,
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
			stock: 10,
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
			stock: 30,
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
	
	const categories = [
		{ name: 'Bebê', icon: '👶', count: 234 },
		{ name: 'Infantil', icon: '🧸', count: 567 },
		{ name: 'Quarto', icon: '🛏️', count: 189 },
		{ name: 'Banheiro', icon: '🛁', count: 123 },
		{ name: 'Organização', icon: '📦', count: 89 },
		{ name: 'Decoração', icon: '🎨', count: 156 }
	];
	
	return {
		featuredProducts,
		categories
	};
}; 