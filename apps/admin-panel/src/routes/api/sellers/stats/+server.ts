import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async () => {
	try {
		console.log('🔌 Dev: NEON - Buscando estatísticas de vendedores');
		
		const db = getDatabase();
		
		// Query para buscar todas as estatísticas em uma só consulta
		const statsQuery = `
			SELECT 
				COUNT(*) as total,
				COUNT(CASE WHEN is_active = true THEN 1 END) as active,
				COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
				COUNT(CASE WHEN is_verified = true THEN 1 END) as verified,
				COUNT(CASE WHEN is_verified = false THEN 1 END) as unverified
			FROM sellers
		`;
		
		const result = await db.query(statsQuery);
		const stats = result[0];
		
		console.log('✅ Estatísticas de vendedores:', stats);
		
		return json({
			success: true,
			data: {
				total: parseInt(stats.total) || 0,
				active: parseInt(stats.active) || 0,
				inactive: parseInt(stats.inactive) || 0,
				verified: parseInt(stats.verified) || 0,
				unverified: parseInt(stats.unverified) || 0
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao buscar estatísticas de vendedores:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 