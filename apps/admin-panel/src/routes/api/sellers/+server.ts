import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		console.log('🔌 Dev: NEON');
		
		const db = getDatabase();
		
		// Parâmetros de consulta
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const search = url.searchParams.get('search') || '';
		const offset = (page - 1) * limit;
		
		// Query base
		let whereClause = '';
		let countQuery = '';
		let searchParams: any[] = [];
		
		if (search) {
			whereClause = 'WHERE s.store_name ILIKE $1 OR s.store_slug ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1';
			countQuery = `
				SELECT COUNT(*) as total 
				FROM sellers s 
				JOIN users u ON u.id = s.user_id
				${whereClause}
			`;
			searchParams = [`%${search}%`];
		} else {
			countQuery = 'SELECT COUNT(*) as total FROM sellers';
		}
		
		// Buscar total de registros
		const totalResult = await db.query(countQuery, searchParams);
		const total = parseInt(totalResult[0]?.total || '0');
		const totalPages = Math.ceil(total / limit);
		
		// Query principal com paginação
		const mainQuery = `
			SELECT 
				s.*,
				u.name as user_name,
				u.email as user_email,
				COUNT(p.id) as product_count
			FROM sellers s
			JOIN users u ON u.id = s.user_id
			LEFT JOIN products p ON p.seller_id = s.id
			${whereClause}
			GROUP BY s.id, u.id
			ORDER BY s.created_at DESC
			LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
		`;
		
		const params = [...searchParams, limit, offset];
		const sellers = await db.query(mainQuery, params);
		
		return json({
			success: true,
			data: {
				sellers,
				pagination: {
					currentPage: page,
					totalPages,
					total,
					limit,
					hasNext: page < totalPages,
					hasPrev: page > 1
				}
			}
		});
		
	} catch (error) {
		console.error('❌ Erro na query:', error);
		return json({
			success: false,
			error: 'Erro ao buscar vendedores'
		}, { status: 500 });
	}
}; 