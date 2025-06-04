import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar todas as zonas de entrega
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
			conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`);
			params.push(`%${search}%`, `%${search}%`);
			paramIndex += 2;
		}
		
		if (status !== 'all') {
			conditions.push(`is_active = $${paramIndex}`);
			params.push(status === 'active');
			paramIndex++;
		}
		
		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		
		// Query principal
		const zonesQuery = `
			SELECT 
				sz.id,
				sz.name,
				sz.description,
				sz.zip_code_patterns,
				sz.states,
				sz.is_active,
				sz.created_at,
				sz.updated_at,
				(SELECT COUNT(*) FROM shipping_rates WHERE zone_id = sz.id) as total_rates,
				(SELECT COUNT(DISTINCT seller_id) FROM seller_shipping_configs WHERE zone_id = sz.id) as total_sellers
			FROM shipping_zones sz
			${whereClause}
			ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		
		params.push(limit, offset);
		
		const zones = await db.query(zonesQuery, params);
		
		// Count total
		const countQuery = `
			SELECT COUNT(*) as total
			FROM shipping_zones sz
			${whereClause}
		`;
		
		const countResult = await db.query(countQuery, params.slice(0, -2));
		const total = parseInt(countResult[0]?.total || '0');
		
		// Estatísticas
		const statsQuery = `
			SELECT 
				COUNT(*) as total_zones,
				COUNT(*) FILTER (WHERE is_active = true) as active_zones,
				COUNT(*) FILTER (WHERE 'SP' = ANY(states)) as sp_zones,
				COUNT(*) FILTER (WHERE 'RJ' = ANY(states)) as rj_zones
			FROM shipping_zones
		`;
		
		const statsResult = await db.query(statsQuery);
		const stats = statsResult[0];
		
		return json({
			success: true,
			data: {
				zones,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit)
				},
				stats: {
					totalZones: parseInt(stats?.total_zones || '0'),
					activeZones: parseInt(stats?.active_zones || '0'),
					spZones: parseInt(stats?.sp_zones || '0'),
					rjZones: parseInt(stats?.rj_zones || '0')
				}
			}
		});
		
	} catch (error) {
		console.error('Erro ao buscar zonas:', error);
		
		// Fallback em caso de erro
		return json({
			success: true,
			data: {
				zones: [],
				pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
				stats: { totalZones: 0, activeZones: 0, spZones: 0, rjZones: 0 }
			},
			source: 'fallback'
		});
	}
};

// POST - Criar nova zona de entrega
export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		// Validação básica
		if (!data.name) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Nome da zona é obrigatório'
				}
			}, { status: 400 });
		}
		
		if (!data.states || !Array.isArray(data.states) || data.states.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Pelo menos um estado deve ser selecionado'
				}
			}, { status: 400 });
		}
		
		// Verificar se já existe uma zona com o mesmo nome
		const existsQuery = 'SELECT id FROM shipping_zones WHERE name = $1';
		const existsResult = await db.query(existsQuery, [data.name]);
		
		if (existsResult.length > 0) {
			return json({
				success: false,
				error: {
					code: 'DUPLICATE_ERROR',
					message: 'Já existe uma zona com este nome'
				}
			}, { status: 409 });
		}
		
		// Inserir nova zona
		const insertQuery = `
			INSERT INTO shipping_zones (
				name, description, zip_code_patterns, states, is_active
			) VALUES ($1, $2, $3, $4, $5)
			RETURNING *
		`;
		
		const result = await db.query(insertQuery, [
			data.name,
			data.description || null,
			data.zip_code_patterns ? JSON.stringify(data.zip_code_patterns) : null,
			data.states, // Array PostgreSQL
			data.is_active !== false
		]);
		
		const zone = result[0];
		
		return json({
			success: true,
			data: { zone },
			message: 'Zona de entrega criada com sucesso!'
		}, { status: 201 });
		
	} catch (error) {
		console.error('Erro ao criar zona:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// PUT - Atualizar zona de entrega
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'ID da zona é obrigatório'
				}
			}, { status: 400 });
		}
		
		// Verificar se a zona existe
		const existsQuery = 'SELECT id FROM shipping_zones WHERE id = $1';
		const existsResult = await db.query(existsQuery, [data.id]);
		
		if (existsResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'NOT_FOUND',
					message: 'Zona de entrega não encontrada'
				}
			}, { status: 404 });
		}
		
		// Atualizar zona
		const updateQuery = `
			UPDATE shipping_zones SET
				name = COALESCE($2, name),
				description = COALESCE($3, description),
				zip_code_patterns = COALESCE($4, zip_code_patterns),
				states = COALESCE($5, states),
				is_active = COALESCE($6, is_active),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
			RETURNING *
		`;
		
		const result = await db.query(updateQuery, [
			data.id,
			data.name,
			data.description,
			data.zip_code_patterns ? JSON.stringify(data.zip_code_patterns) : null,
			data.states,
			data.is_active
		]);
		
		const zone = result[0];
		
		return json({
			success: true,
			data: { zone },
			message: 'Zona de entrega atualizada com sucesso!'
		});
		
	} catch (error) {
		console.error('Erro ao atualizar zona:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// DELETE - Excluir zonas de entrega
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'IDs das zonas são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Verificar se alguma zona está sendo usada
		const usageQuery = `
			SELECT zone_id, COUNT(*) as usage_count
			FROM shipping_rates 
			WHERE zone_id = ANY($1)
			GROUP BY zone_id
			UNION ALL
			SELECT zone_id, COUNT(*) as usage_count
			FROM seller_shipping_configs 
			WHERE zone_id = ANY($1)
			GROUP BY zone_id
		`;
		
		const usageResult = await db.query(usageQuery, [data.ids]);
		
		if (usageResult.length > 0) {
			return json({
				success: false,
				error: {
					code: 'CONSTRAINT_ERROR',
					message: 'Não é possível excluir zonas que possuem preços ou configurações vinculadas'
				}
			}, { status: 409 });
		}
		
		// Excluir zonas
		const deleteQuery = 'DELETE FROM shipping_zones WHERE id = ANY($1) RETURNING id, name';
		const result = await db.query(deleteQuery, [data.ids]);
		
		const deletedZones = result;
		
		return json({
			success: true,
			data: { deletedZones },
			message: `${deletedZones.length} zona(s) excluída(s) com sucesso!`
		});
		
	} catch (error) {
		console.error('Erro ao excluir zonas:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
}; 