import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDatabase(platform);

		// Query para estatísticas das zonas
		const [stats] = await db.query`
			SELECT 
				COUNT(*) as total_zones,
				COUNT(*) FILTER (WHERE is_active = true) as active_zones,
				COUNT(*) FILTER (WHERE is_active = false) as inactive_zones,
				COUNT(*) FILTER (WHERE region IS NULL) as uncovered_regions
			FROM shipping_zones
		`;

		await db.close();

		return json({
			success: true,
			data: {
				total_zones: parseInt(stats.total_zones || 0),
				active_zones: parseInt(stats.active_zones || 0),
				inactive_zones: parseInt(stats.inactive_zones || 0),
				uncovered_regions: parseInt(stats.uncovered_regions || 0)
			}
		});

	} catch (error) {
		console.error('Error fetching shipping zones stats:', error);
		return json({
			success: false,
			error: 'Erro ao buscar estatísticas das zonas de frete'
		}, { status: 500 });
	}
}; 