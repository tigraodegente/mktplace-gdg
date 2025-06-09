import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Gerar relatórios de estoque
export async function GET({ url, platform }) {
	try {
		const reportType = url.searchParams.get('type') || 'summary';
		const warehouseId = url.searchParams.get('warehouse_id');
		const categoryId = url.searchParams.get('category_id');
		const startDate = url.searchParams.get('start_date');
		const endDate = url.searchParams.get('end_date');

		return await withDatabase(platform, async (db) => {
			let report = {};

			switch (reportType) {
				case 'summary':
					report = await generateSummaryReport(db, { warehouseId, categoryId });
					break;
				case 'low_stock':
					report = await generateLowStockReport(db, { warehouseId, categoryId });
					break;
				case 'movements':
					report = await generateMovementsReport(db, { warehouseId, startDate, endDate });
					break;
				case 'valuation':
					report = await generateValuationReport(db, { warehouseId, categoryId });
					break;
				case 'turnover':
					report = await generateTurnoverReport(db, { warehouseId, categoryId, startDate, endDate });
					break;
				case 'forecast':
					report = await generateForecastReport(db, { warehouseId, categoryId });
					break;
				default:
					return json({
						success: false,
						error: 'Tipo de relatório inválido'
					}, { status: 400 });
			}

			return json({
				success: true,
				data: report,
				generated_at: new Date().toISOString()
			});
		});
	} catch (error) {
		console.error('Erro ao gerar relatório:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// Relatório Resumo Geral
async function generateSummaryReport(db: any, filters: any) {
	const { warehouseId, categoryId } = filters;
	
	let whereConditions = [];
	let params: any[] = [];
	let paramIndex = 1;

	if (warehouseId) {
		whereConditions.push(`ps.warehouse_id = $${paramIndex}`);
		params.push(warehouseId);
		paramIndex++;
	}

	if (categoryId) {
		whereConditions.push(`p.category_id = $${paramIndex}`);
		params.push(categoryId);
		paramIndex++;
	}

	const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

	// Estatísticas gerais
	const generalStats = await db.query(`
		SELECT 
			COUNT(DISTINCT p.id) as total_products,
			COUNT(DISTINCT ps.warehouse_id) as total_warehouses,
			SUM(ps.quantity) as total_quantity,
			SUM(ps.quantity * p.cost) as total_value,
			COUNT(*) FILTER (WHERE ps.quantity <= 0) as out_of_stock_count,
			COUNT(*) FILTER (WHERE ps.quantity <= ps.low_stock_alert) as low_stock_count,
			AVG(ps.quantity) as avg_quantity_per_product
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		${whereClause}
	`, params);

	// Top produtos por valor
	const topValueProducts = await db.query(`
		SELECT 
			p.id,
			p.name,
			p.sku,
			ps.quantity,
			p.cost,
			(ps.quantity * p.cost) as total_value
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		${whereClause}
		ORDER BY (ps.quantity * p.cost) DESC
		LIMIT 10
	`, params);

	// Produtos em falta crítica
	const criticalProducts = await db.query(`
		SELECT 
			p.id,
			p.name,
			p.sku,
			ps.quantity,
			ps.low_stock_alert,
			w.name as warehouse_name
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		LEFT JOIN warehouses w ON w.id = ps.warehouse_id
		${whereClause}
		AND ps.quantity <= 0
		ORDER BY p.name
		LIMIT 20
	`, params);

	return {
		type: 'summary',
		general_stats: generalStats[0],
		top_value_products: topValueProducts,
		critical_products: criticalProducts
	};
}

// Relatório de Estoque Baixo
async function generateLowStockReport(db: any, filters: any) {
	const { warehouseId, categoryId } = filters;
	
	let whereConditions = ['ps.quantity <= ps.low_stock_alert'];
	let params: any[] = [];
	let paramIndex = 1;

	if (warehouseId) {
		whereConditions.push(`ps.warehouse_id = $${paramIndex}`);
		params.push(warehouseId);
		paramIndex++;
	}

	if (categoryId) {
		whereConditions.push(`p.category_id = $${paramIndex}`);
		params.push(categoryId);
		paramIndex++;
	}

	const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

	const products = await db.query(`
		SELECT 
			p.id,
			p.name,
			p.sku,
			p.price,
			p.cost,
			ps.quantity,
			ps.low_stock_alert,
			ps.reserved_quantity,
			ps.available_quantity,
			w.name as warehouse_name,
			c.name as category_name,
			-- Calcular urgência
			CASE 
				WHEN ps.quantity <= 0 THEN 'critical'
				WHEN ps.quantity <= (ps.low_stock_alert * 0.5) THEN 'high'
				ELSE 'medium'
			END as urgency,
			-- Valor total do estoque restante
			(ps.quantity * p.cost) as remaining_value,
			-- Estimativa de reposição
			sf.reorder_point,
			sf.suggested_order_quantity,
			sf.next_stockout_date
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		LEFT JOIN warehouses w ON w.id = ps.warehouse_id
		LEFT JOIN categories c ON c.id = p.category_id
		LEFT JOIN stock_forecasts sf ON sf.product_id = p.id AND sf.warehouse_id = ps.warehouse_id
		${whereClause}
		ORDER BY 
			CASE 
				WHEN ps.quantity <= 0 THEN 1
				WHEN ps.quantity <= (ps.low_stock_alert * 0.5) THEN 2
				ELSE 3
			END,
			ps.quantity ASC
	`, params);

	// Resumo por urgência
	const summary = await db.query(`
		SELECT 
			CASE 
				WHEN ps.quantity <= 0 THEN 'critical'
				WHEN ps.quantity <= (ps.low_stock_alert * 0.5) THEN 'high'
				ELSE 'medium'
			END as urgency,
			COUNT(*) as count,
			SUM(ps.quantity * p.cost) as total_value
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		${whereClause}
		GROUP BY urgency
		ORDER BY urgency
	`, params);

	return {
		type: 'low_stock',
		products,
		summary,
		total_products: products.length
	};
}

// Relatório de Movimentações
async function generateMovementsReport(db: any, filters: any) {
	const { warehouseId, startDate, endDate } = filters;
	
	let whereConditions = [];
	let params: any[] = [];
	let paramIndex = 1;

	if (warehouseId) {
		whereConditions.push(`sm.warehouse_id = $${paramIndex}`);
		params.push(warehouseId);
		paramIndex++;
	}

	if (startDate) {
		whereConditions.push(`sm.created_at >= $${paramIndex}`);
		params.push(startDate);
		paramIndex++;
	}

	if (endDate) {
		whereConditions.push(`sm.created_at <= $${paramIndex}`);
		params.push(endDate);
		paramIndex++;
	}

	const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

	// Resumo por tipo de movimentação
	const movementSummary = await db.query(`
		SELECT 
			movement_type,
			COUNT(*) as count,
			SUM(ABS(quantity_change)) as total_quantity,
			SUM(COALESCE(total_cost, 0)) as total_value
		FROM stock_movements sm
		${whereClause}
		GROUP BY movement_type
		ORDER BY movement_type
	`, params);

	// Movimentações diárias
	const dailyMovements = await db.query(`
		SELECT 
			DATE(created_at) as movement_date,
			movement_type,
			COUNT(*) as count,
			SUM(ABS(quantity_change)) as total_quantity
		FROM stock_movements sm
		${whereClause}
		GROUP BY DATE(created_at), movement_type
		ORDER BY movement_date DESC, movement_type
		LIMIT 100
	`, params);

	// Produtos mais movimentados
	const topProducts = await db.query(`
		SELECT 
			p.id,
			p.name,
			p.sku,
			COUNT(sm.id) as movement_count,
			SUM(ABS(sm.quantity_change)) as total_quantity_moved,
			SUM(COALESCE(sm.total_cost, 0)) as total_value_moved
		FROM products p
		INNER JOIN stock_movements sm ON sm.product_id = p.id
		${whereClause.replace('sm.', 'sm.')}
		GROUP BY p.id, p.name, p.sku
		ORDER BY movement_count DESC
		LIMIT 20
	`, params);

	return {
		type: 'movements',
		movement_summary: movementSummary,
		daily_movements: dailyMovements,
		top_products: topProducts,
		period: { start_date: startDate, end_date: endDate }
	};
}

// Relatório de Valorização
async function generateValuationReport(db: any, filters: any) {
	const { warehouseId, categoryId } = filters;
	
	let whereConditions = [];
	let params: any[] = [];
	let paramIndex = 1;

	if (warehouseId) {
		whereConditions.push(`ps.warehouse_id = $${paramIndex}`);
		params.push(warehouseId);
		paramIndex++;
	}

	if (categoryId) {
		whereConditions.push(`p.category_id = $${paramIndex}`);
		params.push(categoryId);
		paramIndex++;
	}

	const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

	const valuation = await db.query(`
		SELECT 
			p.id,
			p.name,
			p.sku,
			p.cost,
			p.price,
			ps.quantity,
			(ps.quantity * p.cost) as cost_value,
			(ps.quantity * p.price) as sell_value,
			((ps.quantity * p.price) - (ps.quantity * p.cost)) as potential_profit,
			CASE 
				WHEN p.cost > 0 THEN ((p.price - p.cost) / p.cost * 100)
				ELSE 0
			END as margin_percent,
			c.name as category_name,
			w.name as warehouse_name
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		LEFT JOIN categories c ON c.id = p.category_id
		LEFT JOIN warehouses w ON w.id = ps.warehouse_id
		${whereClause}
		AND ps.quantity > 0
		ORDER BY cost_value DESC
	`, params);

	// Totais
	const totals = await db.query(`
		SELECT 
			COUNT(*) as total_products,
			SUM(ps.quantity) as total_quantity,
			SUM(ps.quantity * p.cost) as total_cost_value,
			SUM(ps.quantity * p.price) as total_sell_value,
			SUM((ps.quantity * p.price) - (ps.quantity * p.cost)) as total_potential_profit
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		${whereClause}
		AND ps.quantity > 0
	`, params);

	return {
		type: 'valuation',
		products: valuation,
		totals: totals[0]
	};
}

// Relatório de Giro de Estoque
async function generateTurnoverReport(db: any, filters: any) {
	const { warehouseId, categoryId, startDate, endDate } = filters;
	
	// Por simplicidade, vou criar um relatório básico
	// Em produção, seria necessário dados históricos de vendas
	const products = await db.query(`
		SELECT 
			p.id,
			p.name,
			p.sku,
			ps.quantity as current_stock,
			-- Simulação de vendas (seria baseado em dados reais)
			COALESCE(sales.total_sold, 0) as units_sold,
			CASE 
				WHEN ps.quantity > 0 AND COALESCE(sales.total_sold, 0) > 0 
				THEN ROUND(COALESCE(sales.total_sold, 0)::DECIMAL / ps.quantity, 2)
				ELSE 0
			END as turnover_ratio
		FROM products p
		LEFT JOIN product_stocks ps ON ps.product_id = p.id
		LEFT JOIN (
			SELECT 
				product_id,
				SUM(ABS(quantity_change)) as total_sold
			FROM stock_movements 
			WHERE movement_type = 'sale'
			AND created_at >= COALESCE($1, NOW() - INTERVAL '30 days')
			AND created_at <= COALESCE($2, NOW())
			GROUP BY product_id
		) sales ON sales.product_id = p.id
		WHERE ps.quantity > 0
		ORDER BY turnover_ratio DESC
	`, [startDate, endDate]);

	return {
		type: 'turnover',
		products,
		period: { start_date: startDate, end_date: endDate }
	};
}

// Relatório de Previsões
async function generateForecastReport(db: any, filters: any) {
	const { warehouseId, categoryId } = filters;
	
	let whereConditions = [];
	let params: any[] = [];
	let paramIndex = 1;

	if (warehouseId) {
		whereConditions.push(`sf.warehouse_id = $${paramIndex}`);
		params.push(warehouseId);
		paramIndex++;
	}

	if (categoryId) {
		whereConditions.push(`p.category_id = $${paramIndex}`);
		params.push(categoryId);
		paramIndex++;
	}

	const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

	const forecasts = await db.query(`
		SELECT 
			p.id,
			p.name,
			p.sku,
			sf.current_stock,
			sf.daily_sales_avg,
			sf.lead_time_days,
			sf.safety_stock,
			sf.reorder_point,
			sf.suggested_order_quantity,
			sf.next_stockout_date,
			sf.confidence_level,
			w.name as warehouse_name,
			-- Dias até stockout
			CASE 
				WHEN sf.next_stockout_date IS NOT NULL 
				THEN EXTRACT(days FROM sf.next_stockout_date - NOW())
				ELSE NULL
			END as days_to_stockout
		FROM stock_forecasts sf
		LEFT JOIN products p ON p.id = sf.product_id
		LEFT JOIN warehouses w ON w.id = sf.warehouse_id
		${whereClause}
		ORDER BY sf.next_stockout_date ASC NULLS LAST
	`, params);

	return {
		type: 'forecast',
		forecasts,
		generated_at: new Date().toISOString()
	};
} 