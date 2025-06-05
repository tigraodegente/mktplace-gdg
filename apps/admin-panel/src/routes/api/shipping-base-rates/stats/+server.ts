import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDatabase(platform);

		// Query para estatísticas das tarifas
		const [stats] = await db.query`
			SELECT 
				COUNT(*) as total_rates,
				COUNT(*) FILTER (WHERE is_active = true) as active_rates,
				COUNT(*) FILTER (WHERE is_active = false) as inactive_rates,
				COUNT(*) FILTER (WHERE base_price = 0) as outdated_rates
			FROM shipping_base_rates
		`;

		await db.close();

		return json({
			success: true,
			data: {
				total_rates: parseInt(stats.total_rates || 0),
				active_rates: parseInt(stats.active_rates || 0),
				inactive_rates: parseInt(stats.inactive_rates || 0),
				outdated_rates: parseInt(stats.outdated_rates || 0)
			}
		});

	} catch (error) {
		console.error('Error fetching shipping base rates stats:', error);
		return json({
			success: false,
			error: 'Erro ao buscar estatísticas das tarifas base'
		}, { status: 500 });
	}
}; 