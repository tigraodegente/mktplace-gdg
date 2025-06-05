import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = getDatabase(platform);

		// Query para estatísticas dos envios
		const [stats] = await db.query`
			SELECT 
				COUNT(*) as total_shipments,
				COUNT(*) FILTER (WHERE status = 'pending') as pending_shipments,
				COUNT(*) FILTER (WHERE status = 'shipped') as shipped_shipments,
				COUNT(*) FILTER (WHERE status = 'delivered') as delivered_shipments,
				COUNT(*) FILTER (WHERE status = 'failed') as failed_shipments,
				COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit_shipments
			FROM shipments
		`;

		await db.close();

		return json({
			success: true,
			data: {
				total_shipments: parseInt(stats.total_shipments || 0),
				pending_shipments: parseInt(stats.pending_shipments || 0),
				shipped_shipments: parseInt(stats.shipped_shipments || 0),
				delivered_shipments: parseInt(stats.delivered_shipments || 0),
				failed_shipments: parseInt(stats.failed_shipments || 0),
				in_transit_shipments: parseInt(stats.in_transit_shipments || 0)
			}
		});

	} catch (error) {
		console.error('Error fetching shipments stats:', error);
		return json({
			success: false,
			error: 'Erro ao buscar estatísticas dos envios'
		}, { status: 500 });
	}
}; 