import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async () => {
	try {
		console.log('🔌 Dev: NEON - Buscando estatísticas de pedidos');
		
		const db = getDatabase();
		
		// Query para buscar todas as estatísticas em uma só consulta
		const statsQuery = `
			SELECT 
				COUNT(*) as total,
				COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
				COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
				COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
				COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
				COALESCE(SUM(total), 0) as total_revenue
			FROM orders
		`;
		
		const result = await db.query(statsQuery);
		const stats = result[0];
		
		console.log('✅ Estatísticas de pedidos:', stats);
		
		return json({
			success: true,
			data: {
				total_orders: parseInt(stats.total) || 0,
				pending_orders: parseInt(stats.pending) || 0,
				processing_orders: parseInt(stats.processing) || 0,
				delivered_orders: parseInt(stats.delivered) || 0,
				cancelled_orders: parseInt(stats.cancelled) || 0,
				total_revenue: parseFloat(stats.total_revenue) || 0
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao buscar estatísticas de pedidos:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 