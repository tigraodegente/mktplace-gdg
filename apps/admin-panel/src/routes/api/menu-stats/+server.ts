import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		console.log('🔌 Dev: NEON');
		
		const db = getDatabase();
		
		// Buscar contagens em paralelo para melhor performance
		const [
			productsResult,
			ordersResult, 
			usersResult,
			reviewsResult,
			returnsResult,
			couponsResult,
			categoriesResult,
			pagesResult,
			wishlistsResult,
			brandsResult,
			sellersResult,
			paymentMethodsResult
		] = await Promise.all([
			// Produtos
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active,
					   COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending
				FROM products p
			`),
			
			// Pedidos  
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending
				FROM orders o
			`),
			
			// Usuários
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN u.role = 'customer' THEN 1 END) as customers,
					   COUNT(CASE WHEN u.role = 'vendor' THEN 1 END) as vendors
				FROM users u
			`),
			
			// Avaliações
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending
				FROM reviews r
			`).catch(() => [{ total: 0, pending: 0 }]),
			
			// Devoluções
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending
				FROM returns r
			`).catch(() => [{ total: 0, pending: 0 }]),
			
			// Cupons
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active
				FROM coupons c
			`).catch(() => [{ total: 0, active: 0 }]),
			
			// Categorias
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN c.is_active = true THEN 1 END) as active
				FROM categories c
			`),
			
			// Páginas
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN p.status = 'published' THEN 1 END) as published
				FROM pages p
			`).catch(() => [{ total: 0, published: 0 }]),
			
			// Wishlists
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN w.is_public = true THEN 1 END) as public
				FROM wishlists w
			`).catch(() => [{ total: 0, public: 0 }]),
			
			// Marcas
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN b.is_active = true THEN 1 END) as active
				FROM brands b
			`).catch(() => [{ total: 0, active: 0 }]),
			
			// Vendedores
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active
				FROM sellers s
			`).catch(() => [{ total: 0, active: 0 }]),
			
			// Métodos de Pagamento
			db.query(`
				SELECT COUNT(*) as total,
					   COUNT(CASE WHEN pm.is_active = true THEN 1 END) as active
				FROM payment_methods pm
			`).catch(() => [{ total: 0, active: 0 }])
		]);

		const stats = {
			products: {
				total: parseInt(productsResult[0]?.total || '0'),
				active: parseInt(productsResult[0]?.active || '0'),
				pending: parseInt(productsResult[0]?.pending || '0')
			},
			orders: {
				total: parseInt(ordersResult[0]?.total || '0'),
				pending: parseInt(ordersResult[0]?.pending || '0')
			},
			users: {
				total: parseInt(usersResult[0]?.total || '0'),
				customers: parseInt(usersResult[0]?.customers || '0'),
				vendors: parseInt(usersResult[0]?.vendors || '0')
			},
			reviews: {
				total: parseInt(reviewsResult[0]?.total || '0'),
				pending: parseInt(reviewsResult[0]?.pending || '0')
			},
			returns: {
				total: parseInt(returnsResult[0]?.total || '0'),
				pending: parseInt(returnsResult[0]?.pending || '0')
			},
			coupons: {
				total: parseInt(couponsResult[0]?.total || '0'),
				active: parseInt(couponsResult[0]?.active || '0')
			},
			categories: {
				total: parseInt(categoriesResult[0]?.total || '0'),
				active: parseInt(categoriesResult[0]?.active || '0')
			},
			pages: {
				total: parseInt(pagesResult[0]?.total || '0'),
				published: parseInt(pagesResult[0]?.published || '0')
			},
			wishlists: {
				total: parseInt(wishlistsResult[0]?.total || '0'),
				public: parseInt(wishlistsResult[0]?.public || '0')
			},
			brands: {
				total: parseInt(brandsResult[0]?.total || '0'),
				active: parseInt(brandsResult[0]?.active || '0')
			},
			sellers: {
				total: parseInt(sellersResult[0]?.total || '0'),
				active: parseInt(sellersResult[0]?.active || '0')
			},
			payment_methods: {
				total: parseInt(paymentMethodsResult[0]?.total || '0'),
				active: parseInt(paymentMethodsResult[0]?.active || '0')
			}
		};

		console.log('📊 Menu stats carregadas:', stats);

		return json({
			success: true,
			data: stats
		});

	} catch (error) {
		console.error('❌ Erro ao buscar estatísticas do menu:', error);
		
		// Retornar estatísticas zeradas em caso de erro
		const fallbackStats = {
			products: { total: 0, active: 0, pending: 0 },
			orders: { total: 0, pending: 0 },
			users: { total: 0, customers: 0, vendors: 0 },
			reviews: { total: 0, pending: 0 },
			returns: { total: 0, pending: 0 },
			coupons: { total: 0, active: 0 },
			categories: { total: 0, active: 0 },
			pages: { total: 0, published: 0 },
			wishlists: { total: 0, public: 0 },
			brands: { total: 0, active: 0 },
			sellers: { total: 0, active: 0 },
			payment_methods: { total: 0, active: 0 }
		};
		
		return json({
			success: true, // Não quebrar a interface, apenas retornar zeros
			data: fallbackStats
		});
	}
}; 