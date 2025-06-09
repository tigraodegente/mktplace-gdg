import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDatabase(platform);
		
		// Estatísticas básicas
		const statsQuery = `
			SELECT 
				COUNT(*) as total_configs,
				COUNT(CASE WHEN is_active = true THEN 1 END) as active_configs,
				COUNT(DISTINCT seller_id) as unique_sellers,
				COUNT(DISTINCT carrier_id) as unique_carriers,
				AVG(markup_percentage) as avg_markup,
				AVG(free_shipping_threshold) as avg_free_threshold
			FROM seller_shipping_configs
		`;

		const result = await db.query(statsQuery);
		const stats = result[0];

		return json({
			success: true,
			data: {
				totalConfigs: parseInt(stats?.total_configs || '0'),
				activeConfigs: parseInt(stats?.active_configs || '0'),
				inactiveConfigs: parseInt(stats?.total_configs || '0') - parseInt(stats?.active_configs || '0'),
				uniqueSellers: parseInt(stats?.unique_sellers || '0'),
				uniqueCarriers: parseInt(stats?.unique_carriers || '0'),
				avgMarkup: parseFloat(stats?.avg_markup || '0'),
				avgFreeThreshold: parseFloat(stats?.avg_free_threshold || '0'),
				coverage: {
					withConfig: parseInt(stats?.unique_sellers || '0'),
					withoutConfig: 0 // Calculado se necessário
				}
			}
		});

	} catch (error) {
		console.error('Erro ao buscar estatísticas de frete:', error);
		
		return json({
			success: true,
			data: {
				totalConfigs: 0,
				activeConfigs: 0,
				inactiveConfigs: 0,
				uniqueSellers: 0,
				uniqueCarriers: 0,
				avgMarkup: 0,
				avgFreeThreshold: 0,
				coverage: {
					withConfig: 0,
					withoutConfig: 0
				}
			}
		});
	}
}; 