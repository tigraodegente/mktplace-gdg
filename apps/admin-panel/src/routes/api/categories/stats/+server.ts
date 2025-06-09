import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async () => {
	try {
		console.log('🔌 Dev: NEON - Buscando estatísticas de categorias');
		
		const db = getDatabase();
		
		// Query para buscar todas as estatísticas em uma só consulta
		const statsQuery = `
			SELECT 
				COUNT(*) as total,
				COUNT(CASE WHEN is_active = true THEN 1 END) as active,
				COUNT(CASE WHEN is_active = false THEN 1 END) as inactive,
				COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_categories,
				COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as subcategories
			FROM categories
		`;
		
		const result = await db.query(statsQuery);
		const stats = result[0];
		
		// Buscar categorias sem produtos
		const emptyQuery = `
			SELECT COUNT(*) as without_products
			FROM categories c
			LEFT JOIN product_categories pc ON pc.category_id = c.id
			WHERE pc.category_id IS NULL
		`;
		
		const emptyResult = await db.query(emptyQuery);
		const withoutProducts = parseInt(emptyResult[0]?.without_products || '0');
		
		console.log('✅ Estatísticas de categorias:', stats);
		
		return json({
			success: true,
			data: {
				total_categories: parseInt(stats.total) || 0,
				active_categories: parseInt(stats.active) || 0,
				inactive_categories: parseInt(stats.inactive) || 0,
				without_products: withoutProducts,
				root_categories: parseInt(stats.root_categories) || 0,
				subcategories: parseInt(stats.subcategories) || 0
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao buscar estatísticas de categorias:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 