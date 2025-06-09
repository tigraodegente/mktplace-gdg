import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Lista simplificada de sellers para dropdowns
export const GET: RequestHandler = async () => {
	try {
		const db = getDatabase();
		
		// Buscar sellers ativos com dados mínimos
		const sellers = await db.query(`
			SELECT 
				s.id,
				s.company_name as name,
				s.slug,
				u.email
			FROM sellers s
			JOIN users u ON u.id = s.user_id
			WHERE s.is_active = true
			ORDER BY s.company_name ASC
		`);
		
		await db.close();
		
		return json({
			success: true,
			data: sellers
		});
		
	} catch (error) {
		console.error('❌ Erro ao buscar sellers:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 