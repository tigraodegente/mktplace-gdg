import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar todas as transportadoras
export const GET: RequestHandler = async ({ url }) => {
	try {
		const db = getDatabase();
		
		// Parâmetros de query
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const search = url.searchParams.get('search') || '';
		const status = url.searchParams.get('status') || 'all';
		const sortBy = url.searchParams.get('sortBy') || 'name';
		const sortOrder = url.searchParams.get('sortOrder') || 'asc';
		
		const offset = (page - 1) * limit;
		
		// Construir WHERE clause
		const conditions = [];
		const params = [];
		let paramIndex = 1;
		
		if (search) {
			const paramIndex = params.length + 1;
			conditions.push(`name ILIKE $${paramIndex}`);
			params.push(`%${search}%`);
		}
		
		if (status !== 'all') {
			conditions.push(`is_active = $${paramIndex}`);
			params.push(status === 'active');
			paramIndex++;
		}
		
		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		
		// Query principal
		const carriersQuery = `
			SELECT 
				id,
				name,
				type,
				api_endpoint,
				api_credentials,
				is_active,
				settings,
				created_at,
				updated_at,
				(SELECT COUNT(*) FROM seller_shipping_configs WHERE carrier_id = sc.id) as total_sellers
			FROM shipping_carriers sc
			${whereClause}
			ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		
		params.push(limit, offset);
		
		const carriers = await db.query(carriersQuery, params);
		
		// Count total
		const countQuery = `
			SELECT COUNT(*) as total
			FROM shipping_carriers sc
			${whereClause}
		`;
		
		const countResult = await db.query(countQuery, params.slice(0, -2));
		const total = parseInt(countResult[0]?.total || '0');
		
		// Estatísticas
		const statsQuery = `
			SELECT 
				COUNT(*) as total_carriers,
				COUNT(*) FILTER (WHERE is_active = true) as active_carriers,
				COUNT(*) FILTER (WHERE type = 'api') as api_carriers,
				COUNT(*) FILTER (WHERE type = 'table') as table_carriers,
				COUNT(*) FILTER (WHERE type = 'manual') as manual_carriers,
				COUNT(*) FILTER (WHERE type = 'correios') as correios_count,
				COUNT(*) FILTER (WHERE type = 'frenet') as frenet_count
			FROM shipping_carriers
		`;
		
		const statsResult = await db.query(statsQuery);
		const stats = statsResult[0];
		
		return json({
			success: true,
			data: {
				carriers,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit)
				},
				stats: {
					totalCarriers: parseInt(stats?.total_carriers || '0'),
					activeCarriers: parseInt(stats?.active_carriers || '0'),
					correiosCount: parseInt(stats?.correios_count || '0'),
					frenetCount: parseInt(stats?.frenet_count || '0')
				}
			}
		});
		
	} catch (error) {
		console.error('Erro ao buscar transportadoras:', error);
		
		// Fallback em caso de erro
		return json({
			success: true,
			data: {
				carriers: [],
				pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
				stats: { totalCarriers: 0, activeCarriers: 0, correiosCount: 0, frenetCount: 0 }
			},
			source: 'fallback'
		});
	}
};

// POST - Criar nova transportadora
export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		// Validação básica
		if (!data.name || !data.type) {
			return json({
				success: false,
				error: {
					code: 'INVALID_REQUEST',
					message: 'Nome e tipo são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Verificar se já existe uma transportadora com o mesmo nome
		const existsQuery = 'SELECT id FROM shipping_carriers WHERE name = $1';
		const existsResult = await db.query(existsQuery, [data.name]);
		
		if (existsResult.length > 0) {
			return json({
				success: false,
				error: {
					code: 'DUPLICATE_ERROR',
					message: 'Já existe uma transportadora com este nome'
				}
			}, { status: 409 });
		}
		
		// Inserir nova transportadora
		const insertQuery = `
			INSERT INTO shipping_carriers (
				name, 
				type, 
				api_endpoint, 
				api_credentials, 
				settings, 
				is_active
			) 
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *
		`;
		
		const result = await db.query(insertQuery, [
			data.name,
			data.type,
			data.api_endpoint || null,
			data.api_credentials || {},
			data.settings || {},
			data.is_active !== false
		]);
		
		const carrier = result[0];
		
		return json({
			success: true,
			data: { carrier },
			message: 'Transportadora criada com sucesso!'
		}, { status: 201 });
		
	} catch (error) {
		console.error('Erro ao criar transportadora:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// PUT - Atualizar transportadora
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'ID da transportadora é obrigatório'
				}
			}, { status: 400 });
		}
		
		// Verificar se a transportadora existe
		const existsQuery = 'SELECT id FROM shipping_carriers WHERE id = $1';
		const existsResult = await db.query(existsQuery, [data.id]);
		
		if (existsResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'NOT_FOUND',
					message: 'Transportadora não encontrada'
				}
			}, { status: 404 });
		}
		
		// Atualizar transportadora
		const updateQuery = `
			UPDATE shipping_carriers 
			SET 
				name = $2,
				type = $3,
				api_endpoint = $4,
				api_credentials = $5,
				settings = $6,
				is_active = $7,
				updated_at = NOW()
			WHERE id = $1
			RETURNING *
		`;
		
		const result = await db.query(updateQuery, [
			data.id,
			data.name,
			data.type,
			data.api_endpoint,
			data.api_credentials,
			data.settings,
			data.is_active
		]);
		
		const carrier = result[0];
		
		return json({
			success: true,
			data: { carrier },
			message: 'Transportadora atualizada com sucesso!'
		});
		
	} catch (error) {
		console.error('Erro ao atualizar transportadora:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// DELETE - Excluir transportadoras
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'IDs das transportadoras são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Verificar se alguma transportadora está sendo usada
		const usageQuery = `
			SELECT carrier_id, COUNT(*) as usage_count
			FROM seller_shipping_configs 
			WHERE carrier_id = ANY($1)
			GROUP BY carrier_id
		`;
		
		const usageResult = await db.query(usageQuery, [data.ids]);
		
		if (usageResult.length > 0) {
			return json({
				success: false,
				error: {
					code: 'CONSTRAINT_ERROR',
					message: 'Não é possível excluir transportadoras que estão sendo utilizadas por sellers'
				}
			}, { status: 409 });
		}
		
		// Excluir transportadoras
		const deleteQuery = 'DELETE FROM shipping_carriers WHERE id = ANY($1) RETURNING id, name';
		const result = await db.query(deleteQuery, [data.ids]);
		
		const deletedCarriers = result;
		
		return json({
			success: true,
			data: { deletedCarriers },
			message: `${deletedCarriers.length} transportadora(s) excluída(s) com sucesso!`
		});
		
	} catch (error) {
		console.error('Erro ao excluir transportadoras:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
}; 