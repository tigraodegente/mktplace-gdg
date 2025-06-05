import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDatabase(platform);

		// Query para estatísticas das transportadoras
		const [stats] = await db.query`
			SELECT 
				COUNT(*) as total_carriers,
				COUNT(*) FILTER (WHERE is_active = true) as active_carriers,
				COUNT(*) FILTER (WHERE is_active = false) as inactive_carriers,
				COUNT(*) FILTER (WHERE api_integration = false) as no_api_integration
			FROM shipping_carriers
		`;

		await db.close();

		return json({
			success: true,
			data: {
				total_carriers: parseInt(stats.total_carriers || 0),
				active_carriers: parseInt(stats.active_carriers || 0),
				inactive_carriers: parseInt(stats.inactive_carriers || 0),
				no_api_integration: parseInt(stats.no_api_integration || 0)
			}
		});

	} catch (error) {
		console.error('Error fetching shipping carriers stats:', error);
		return json({
			success: false,
			error: 'Erro ao buscar estatísticas das transportadoras'
		}, { status: 500 });
	}
}; 