import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const db = getDatabase();
		
		// Extrair parâmetros de query
		const period = url.searchParams.get('period') || '30';
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		
		// Calcular data de início baseada no período
		let dateFilter = '';
		let ordersDateFilter = '';
		let productsDateFilter = '';
		let usersDateFilter = '';
		let reviewsDateFilter = '';
		let returnsDateFilter = '';
		let couponsDateFilter = '';
		let sellersDateFilter = '';
		let wishlistsDateFilter = '';
		
		if (startDate && endDate) {
			dateFilter = `AND created_at BETWEEN '${startDate}' AND '${endDate}'`;
			ordersDateFilter = `AND o.created_at BETWEEN '${startDate}' AND '${endDate}'`;
			productsDateFilter = `AND p.created_at BETWEEN '${startDate}' AND '${endDate}'`;
			usersDateFilter = `AND u.created_at BETWEEN '${startDate}' AND '${endDate}'`;
			reviewsDateFilter = `AND r.created_at BETWEEN '${startDate}' AND '${endDate}'`;
			returnsDateFilter = `AND r.created_at BETWEEN '${startDate}' AND '${endDate}'`;
			couponsDateFilter = `AND c.created_at BETWEEN '${startDate}' AND '${endDate}'`;
			sellersDateFilter = `AND s.created_at BETWEEN '${startDate}' AND '${endDate}'`;
			wishlistsDateFilter = `AND w.created_at BETWEEN '${startDate}' AND '${endDate}'`;
		} else {
			const daysAgo = parseInt(period);
			dateFilter = `AND created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			ordersDateFilter = `AND o.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			productsDateFilter = `AND p.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			usersDateFilter = `AND u.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			reviewsDateFilter = `AND r.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			returnsDateFilter = `AND r.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			couponsDateFilter = `AND c.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			sellersDateFilter = `AND s.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
			wishlistsDateFilter = `AND w.created_at >= NOW() - INTERVAL '${daysAgo} days'`;
		}

		// Estatísticas básicas
		const [
			totalProducts,
			activeProducts,
			totalOrders,
			totalRevenue,
			totalUsers,
			totalReviews,
			totalReturns,
			totalCoupons,
			totalSellers,
			totalWishlists
		] = await Promise.all([
			// Total de produtos
			db.query(`
				SELECT COUNT(*) as count 
				FROM products p
				WHERE 1=1 ${productsDateFilter}
			`),
			
			// Produtos ativos (corrigido: products tem coluna status)
			db.query(`
				SELECT COUNT(*) as count 
				FROM products p
				WHERE p.status = 'active' ${productsDateFilter}
			`),
			
			// Total de pedidos
			db.query(`
				SELECT COUNT(*) as count 
				FROM orders o
				WHERE 1=1 ${ordersDateFilter}
			`),
			
			// Receita total
			db.query(`
				SELECT COALESCE(SUM(total), 0) as total 
				FROM orders o
				WHERE o.status = 'completed' ${ordersDateFilter}
			`),
			
			// Total de usuários
			db.query(`
				SELECT COUNT(*) as count 
				FROM users u
				WHERE 1=1 ${usersDateFilter}
			`),
			
			// Total de avaliações (corrigido: reviews NÃO tem coluna status)
			db.query(`
				SELECT COUNT(*) as count 
				FROM reviews r
				WHERE 1=1 ${reviewsDateFilter}
			`),
			
			// Total de devoluções (corrigido: returns TEM coluna status)
			db.query(`
				SELECT COUNT(*) as count 
				FROM returns r
				WHERE r.status != 'cancelled' ${returnsDateFilter}
			`),
			
			// Total de cupons ativos (corrigido: coupons usa is_active)
			db.query(`
				SELECT COUNT(*) as count 
				FROM coupons c
				WHERE c.is_active = true ${couponsDateFilter}
			`),
			
			// Total de vendedores ativos (corrigido: sellers usa is_active)
			db.query(`
				SELECT COUNT(*) as count 
				FROM sellers s
				WHERE s.is_active = true ${sellersDateFilter}
			`),
			
			// Total de wishlists (corrigido: wishlists NÃO tem is_public)
			db.query(`
				SELECT COUNT(*) as count 
				FROM wishlists w
				WHERE 1=1 ${wishlistsDateFilter}
			`)
		]);

		// Calcular variações (últimos 30 dias vs período anterior)
		const previousPeriod = parseInt(period) * 2;
		let previousProductsDateFilter = '';
		let previousOrdersDateFilter = '';
		let previousUsersDateFilter = '';
		
		if (startDate && endDate) {
			// Para períodos customizados, calcular período anterior do mesmo tamanho
			const start = new Date(startDate);
			const end = new Date(endDate);
			const diff = end.getTime() - start.getTime();
			const prevEnd = new Date(start.getTime() - 1);
			const prevStart = new Date(prevEnd.getTime() - diff);
			
			previousProductsDateFilter = `AND p.created_at BETWEEN '${prevStart.toISOString().split('T')[0]}' AND '${prevEnd.toISOString().split('T')[0]}'`;
			previousOrdersDateFilter = `AND o.created_at BETWEEN '${prevStart.toISOString().split('T')[0]}' AND '${prevEnd.toISOString().split('T')[0]}'`;
			previousUsersDateFilter = `AND u.created_at BETWEEN '${prevStart.toISOString().split('T')[0]}' AND '${prevEnd.toISOString().split('T')[0]}'`;
		} else {
			previousProductsDateFilter = `AND p.created_at >= NOW() - INTERVAL '${previousPeriod} days' AND p.created_at < NOW() - INTERVAL '${period} days'`;
			previousOrdersDateFilter = `AND o.created_at >= NOW() - INTERVAL '${previousPeriod} days' AND o.created_at < NOW() - INTERVAL '${period} days'`;
			previousUsersDateFilter = `AND u.created_at >= NOW() - INTERVAL '${previousPeriod} days' AND u.created_at < NOW() - INTERVAL '${period} days'`;
		}

		const [
			previousProducts,
			previousOrders,
			previousRevenue,
			previousUsers
		] = await Promise.all([
			db.query(`
				SELECT COUNT(*) as count 
				FROM products p
				WHERE 1=1 ${previousProductsDateFilter}
			`),
			db.query(`
				SELECT COUNT(*) as count 
				FROM orders o
				WHERE 1=1 ${previousOrdersDateFilter}
			`),
			db.query(`
				SELECT COALESCE(SUM(o.total), 0) as total 
				FROM orders o
				WHERE o.status = 'completed' ${previousOrdersDateFilter}
			`),
			db.query(`
				SELECT COUNT(*) as count 
				FROM users u
				WHERE 1=1 ${previousUsersDateFilter}
			`)
		]);

		// Calcular percentuais de mudança
		const calculateChange = (current: number, previous: number) => {
			if (previous === 0) return current > 0 ? 100 : 0;
			return ((current - previous) / previous) * 100;
		};

		const currentProductCount = totalProducts[0]?.count || 0;
		const currentOrderCount = totalOrders[0]?.count || 0;
		const currentRevenue = totalRevenue[0]?.total || 0;
		const currentUserCount = totalUsers[0]?.count || 0;

		const prevProductCount = previousProducts[0]?.count || 0;
		const prevOrderCount = previousOrders[0]?.count || 0;
		const prevRevenue = previousRevenue[0]?.total || 0;
		const prevUserCount = previousUsers[0]?.count || 0;

		// Estatísticas de vendas por dia (últimos 7 dias)
		const salesByDay = await db.query(`
			SELECT 
				DATE(o.created_at) as date,
				COUNT(*) as orders,
				COALESCE(SUM(o.total), 0) as revenue
			FROM orders o
			WHERE o.created_at >= NOW() - INTERVAL '7 days'
				AND o.status = 'completed'
			GROUP BY DATE(o.created_at)
			ORDER BY date DESC
			LIMIT 7
		`);

		// Top produtos mais vendidos
		const topProducts = await db.query(`
			SELECT 
				p.name,
				p.slug,
				SUM(oi.quantity) as sold_quantity,
				SUM(oi.quantity * oi.price) as revenue
			FROM products p
			JOIN order_items oi ON p.id = oi.product_id
			JOIN orders o ON oi.order_id = o.id
			WHERE o.status = 'completed' ${ordersDateFilter}
			GROUP BY p.id, p.name, p.slug
			ORDER BY sold_quantity DESC
			LIMIT 5
		`);

		// Categorias mais populares
		const topCategories = await db.query(`
			SELECT 
				c.name,
				c.slug,
				COUNT(p.id) as product_count,
				COALESCE(SUM(oi.quantity), 0) as items_sold
			FROM categories c
			LEFT JOIN products p ON c.id = p.category_id
			LEFT JOIN order_items oi ON p.id = oi.product_id
			LEFT JOIN orders o ON oi.order_id = o.id
			WHERE (o.status = 'completed' OR o.status IS NULL) ${ordersDateFilter.replace('AND o.created_at', 'AND (o.created_at')}${ordersDateFilter ? ')' : ''}
			GROUP BY c.id, c.name, c.slug
			ORDER BY items_sold DESC
			LIMIT 5
		`);

		return json({
			success: true,
			data: {
				// Estatísticas principais
				totalProducts: Number(currentProductCount),
				activeProducts: Number(activeProducts[0]?.count || 0),
				totalOrders: Number(currentOrderCount),
				totalRevenue: Number(currentRevenue),
				totalUsers: Number(currentUserCount),
				totalReviews: Number(totalReviews[0]?.count || 0),
				totalReturns: Number(totalReturns[0]?.count || 0),
				totalCoupons: Number(totalCoupons[0]?.count || 0),
				totalSellers: Number(totalSellers[0]?.count || 0),
				totalWishlists: Number(totalWishlists[0]?.count || 0),

				// Variações percentuais
				changes: {
					products: calculateChange(Number(currentProductCount), Number(prevProductCount)),
					orders: calculateChange(Number(currentOrderCount), Number(prevOrderCount)),
					revenue: calculateChange(Number(currentRevenue), Number(prevRevenue)),
					users: calculateChange(Number(currentUserCount), Number(prevUserCount))
				},

				// Dados para gráficos
				salesByDay: salesByDay.map((record: any) => ({
					date: record.date,
					orders: Number(record.orders),
					revenue: Number(record.revenue)
				})),

				topProducts: topProducts.map((record: any) => ({
					name: record.name,
					slug: record.slug,
					soldQuantity: Number(record.sold_quantity),
					revenue: Number(record.revenue)
				})),

				topCategories: topCategories.map((record: any) => ({
					name: record.name,
					slug: record.slug,
					productCount: Number(record.product_count),
					itemsSold: Number(record.items_sold)
				}))
			}
		});

	} catch (error) {
		console.error('Erro na query:', error);
		return json({
			success: false,
			error: 'Erro ao buscar estatísticas do menu'
		}, { status: 500 });
	}
}; 