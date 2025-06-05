import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDatabase(platform);

		// Query para estatísticas das modalidades
		const [stats] = await db.query`
			SELECT 
				COUNT(*) as total_modalities,
				COUNT(*) FILTER (WHERE is_active = true) as active_modalities,
				COUNT(*) FILTER (WHERE is_active = false) as inactive_modalities,
				COUNT(*) FILTER (WHERE is_default = true) as default_modalities,
				COUNT(*) FILTER (WHERE pricing_type = 'per_shipment') as per_shipment_pricing,
				COUNT(*) FILTER (WHERE pricing_type = 'per_item') as per_item_pricing,
				AVG(price_multiplier)::DECIMAL(5,3) as avg_price_multiplier,
				AVG(days_multiplier)::DECIMAL(5,3) as avg_days_multiplier,
				MIN(delivery_days_min) as fastest_delivery,
				MAX(delivery_days_max) as slowest_delivery,
				MIN(min_price) as lowest_min_price,
				MAX(max_price) as highest_max_price
			FROM shipping_modalities
		`;

		// Query para modalidades mais populares (baseado em prioridade)
		const topModalities = await db.query`
			SELECT 
				name, code, description,
				delivery_days_min, delivery_days_max,
				price_multiplier, days_multiplier,
				is_active, is_default, priority
			FROM shipping_modalities 
			WHERE is_active = true
			ORDER BY priority ASC, delivery_days_min ASC
			LIMIT 5
		`;

		// Query para modalidades por tipo de preço
		const pricingBreakdown = await db.query`
			SELECT 
				pricing_type,
				COUNT(*) as count,
				AVG(price_multiplier)::DECIMAL(5,3) as avg_multiplier
			FROM shipping_modalities
			WHERE is_active = true
			GROUP BY pricing_type
			ORDER BY count DESC
		`;

		// Query para distribuição de prazo de entrega
		const deliveryBreakdown = await db.query`
			SELECT 
				CASE 
					WHEN delivery_days_min <= 1 THEN 'Express (até 1 dia)'
					WHEN delivery_days_min <= 3 THEN 'Rápido (2-3 dias)'
					WHEN delivery_days_min <= 7 THEN 'Normal (4-7 dias)'
					ELSE 'Longo (8+ dias)'
				END as delivery_category,
				COUNT(*) as count,
				AVG(price_multiplier)::DECIMAL(5,3) as avg_price_multiplier
			FROM shipping_modalities
			WHERE is_active = true
			GROUP BY delivery_category
			ORDER BY MIN(delivery_days_min)
		`;

		await db.close();

		return json({
			success: true,
			stats: {
				...stats,
				top_modalities: topModalities,
				pricing_breakdown: pricingBreakdown,
				delivery_breakdown: deliveryBreakdown
			}
		});

	} catch (error) {
		console.error('Erro ao buscar estatísticas de modalidades:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 