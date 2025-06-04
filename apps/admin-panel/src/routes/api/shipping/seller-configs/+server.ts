import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar configurações de frete por seller
export const GET: RequestHandler = async ({ url }) => {
	try {
		const db = getDatabase();
		
		// Parâmetros de query
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const search = url.searchParams.get('search') || '';
		const sellerId = url.searchParams.get('sellerId') || '';
		const carrierId = url.searchParams.get('carrierId') || '';
		const isActive = url.searchParams.get('isActive');
		const sortBy = url.searchParams.get('sortBy') || 'created_at';
		const sortOrder = url.searchParams.get('sortOrder') || 'desc';
		
		const offset = (page - 1) * limit;
		
		// Construir WHERE clause
		const conditions = [];
		const params = [];
		let paramIndex = 1;
		
		if (search) {
			conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex + 1} OR sc.name ILIKE $${paramIndex + 2})`);
			params.push(`%${search}%`, `%${search}%`, `%${search}%`);
			paramIndex += 3;
		}
		
		if (sellerId) {
			conditions.push(`ssc.seller_id = $${paramIndex}`);
			params.push(sellerId);
			paramIndex++;
		}
		
		if (carrierId) {
			conditions.push(`ssc.carrier_id = $${paramIndex}`);
			params.push(carrierId);
			paramIndex++;
		}
		
		if (isActive !== null && isActive !== undefined) {
			conditions.push(`ssc.is_active = $${paramIndex}`);
			params.push(isActive === 'true');
			paramIndex++;
		}
		
		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		
		// Query principal com JOINs
		const configsQuery = `
			SELECT 
				ssc.id,
				ssc.seller_id,
				ssc.carrier_id,
				ssc.markup_percentage,
				ssc.free_shipping_threshold,
				ssc.handling_time_days,
				ssc.is_active,
				ssc.created_at,
				ssc.updated_at,
				u.name as seller_name,
				u.email as seller_email,
				sc.name as carrier_name,
				sc.type as carrier_type,
				sc.is_active as carrier_is_active,
				COUNT(sr.id) as available_rates
			FROM seller_shipping_configs ssc
			JOIN shipping_carriers sc ON ssc.carrier_id = sc.id
			JOIN users u ON ssc.seller_id = u.id
			LEFT JOIN shipping_rates sr ON sr.carrier_id = ssc.carrier_id
			${whereClause}
			GROUP BY ssc.id, u.name, u.email, sc.name, sc.type, sc.is_active
			ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		
		params.push(limit, offset);
		
		const configs = await db.query(configsQuery, params);
		
		// Count total
		const countQuery = `
			SELECT COUNT(*) as total
			FROM seller_shipping_configs ssc
			JOIN shipping_carriers sc ON ssc.carrier_id = sc.id
			JOIN users u ON ssc.seller_id = u.id
			${whereClause}
		`;
		
		const countResult = await db.query(countQuery, params.slice(0, -2));
		const total = parseInt(countResult[0]?.total || '0');
		
		// Estatísticas
		const statsQuery = `
			SELECT 
				COUNT(*) as total_configs,
				COUNT(CASE WHEN is_active = true THEN 1 END) as active_configs,
				COUNT(DISTINCT seller_id) as unique_sellers,
				COUNT(DISTINCT carrier_id) as unique_carriers,
				AVG(markup_percentage) as avg_markup,
				AVG(free_shipping_threshold) as avg_free_threshold,
				AVG(handling_time_days) as avg_handling_time
			FROM seller_shipping_configs
		`;
		
		const statsResult = await db.query(statsQuery);
		const stats = statsResult[0];
		
		// Buscar sellers e carriers para filtros
		const sellersQuery = `
			SELECT u.id, u.name, u.email 
			FROM users u 
			WHERE u.role = 'seller' 
			ORDER BY u.name
		`;
		
		const carriersQuery = 'SELECT id, name FROM shipping_carriers ORDER BY name';
		
		const [sellers, carriers] = await Promise.all([
			db.query(sellersQuery),
			db.query(carriersQuery)
		]);
		
		return json({
			success: true,
			data: {
				configs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit)
				},
				stats: {
					totalConfigs: parseInt(stats?.total_configs || '0'),
					activeConfigs: parseInt(stats?.active_configs || '0'),
					uniqueSellers: parseInt(stats?.unique_sellers || '0'),
					uniqueCarriers: parseInt(stats?.unique_carriers || '0'),
					avgMarkup: parseFloat(stats?.avg_markup || '0'),
					avgFreeThreshold: parseFloat(stats?.avg_free_threshold || '0'),
					avgHandlingTime: parseFloat(stats?.avg_handling_time || '0')
				},
				filters: {
					sellers,
					carriers
				}
			}
		});
		
	} catch (error) {
		console.error('Erro ao buscar configurações de frete:', error);
		
		// Fallback em caso de erro
		return json({
			success: true,
			data: {
				configs: [],
				pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
				stats: { totalConfigs: 0, activeConfigs: 0, uniqueSellers: 0, uniqueCarriers: 0, avgMarkup: 0, avgFreeThreshold: 0, avgHandlingTime: 0 },
				filters: { sellers: [], carriers: [] }
			},
			source: 'fallback'
		});
	}
};

// POST - Criar nova configuração de frete
export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		// Validação básica
		if (!data.seller_id || !data.carrier_id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Seller e transportadora são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Verificar se seller existe e é válido
		const sellerQuery = 'SELECT id, role FROM users WHERE id = $1 AND role = $2';
		const sellerResult = await db.query(sellerQuery, [data.seller_id, 'seller']);
		
		if (sellerResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Seller não encontrado ou inválido'
				}
			}, { status: 400 });
		}
		
		// Verificar se transportadora existe e está ativa
		const carrierQuery = 'SELECT id, is_active FROM shipping_carriers WHERE id = $1';
		const carrierResult = await db.query(carrierQuery, [data.carrier_id]);
		
		if (carrierResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Transportadora não encontrada'
				}
			}, { status: 400 });
		}
		
		// Verificar se já existe configuração para este seller + carrier
		const existsQuery = 'SELECT id FROM seller_shipping_configs WHERE seller_id = $1 AND carrier_id = $2';
		const existsResult = await db.query(existsQuery, [data.seller_id, data.carrier_id]);
		
		if (existsResult.length > 0) {
			return json({
				success: false,
				error: {
					code: 'CONFLICT_ERROR',
					message: 'Já existe configuração para este seller e transportadora'
				}
			}, { status: 409 });
		}
		
		// Inserir nova configuração
		const insertQuery = `
			INSERT INTO seller_shipping_configs (
				seller_id, carrier_id, markup_percentage, free_shipping_threshold,
				handling_time_days, is_active
			) VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *
		`;
		
		const result = await db.query(insertQuery, [
			data.seller_id,
			data.carrier_id,
			data.markup_percentage || 0,
			data.free_shipping_threshold || null,
			data.handling_time_days || 1,
			data.is_active !== false // default true
		]);
		
		const config = result[0];
		
		return json({
			success: true,
			data: { config },
			message: 'Configuração de frete criada com sucesso!'
		}, { status: 201 });
		
	} catch (error) {
		console.error('Erro ao criar configuração de frete:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// PUT - Atualizar configuração de frete
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'ID da configuração é obrigatório'
				}
			}, { status: 400 });
		}
		
		// Verificar se a configuração existe
		const existsQuery = 'SELECT * FROM seller_shipping_configs WHERE id = $1';
		const existsResult = await db.query(existsQuery, [data.id]);
		
		if (existsResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'NOT_FOUND',
					message: 'Configuração de frete não encontrada'
				}
			}, { status: 404 });
		}
		
		// Se mudou seller ou carrier, verificar conflitos
		if (data.seller_id || data.carrier_id) {
			const existing = existsResult[0];
			const newSellerId = data.seller_id || existing.seller_id;
			const newCarrierId = data.carrier_id || existing.carrier_id;
			
			const conflictQuery = `
				SELECT id FROM seller_shipping_configs 
				WHERE seller_id = $1 AND carrier_id = $2 AND id != $3
			`;
			
			const conflictResult = await db.query(conflictQuery, [newSellerId, newCarrierId, data.id]);
			
			if (conflictResult.length > 0) {
				return json({
					success: false,
					error: {
						code: 'CONFLICT_ERROR',
						message: 'Já existe configuração para este seller e transportadora'
					}
				}, { status: 409 });
			}
		}
		
		// Atualizar configuração
		const updateQuery = `
			UPDATE seller_shipping_configs SET
				seller_id = COALESCE($2, seller_id),
				carrier_id = COALESCE($3, carrier_id),
				markup_percentage = COALESCE($4, markup_percentage),
				free_shipping_threshold = COALESCE($5, free_shipping_threshold),
				handling_time_days = COALESCE($6, handling_time_days),
				is_active = COALESCE($7, is_active),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
			RETURNING *
		`;
		
		const result = await db.query(updateQuery, [
			data.id,
			data.seller_id,
			data.carrier_id,
			data.markup_percentage,
			data.free_shipping_threshold,
			data.handling_time_days,
			data.is_active
		]);
		
		const config = result[0];
		
		return json({
			success: true,
			data: { config },
			message: 'Configuração de frete atualizada com sucesso!'
		});
		
	} catch (error) {
		console.error('Erro ao atualizar configuração de frete:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// DELETE - Excluir configurações de frete
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'IDs das configurações são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Excluir configurações
		const deleteQuery = `
			DELETE FROM seller_shipping_configs 
			WHERE id = ANY($1) 
			RETURNING id, seller_id, carrier_id
		`;
		const result = await db.query(deleteQuery, [data.ids]);
		
		const deletedConfigs = result;
		
		return json({
			success: true,
			data: { deletedConfigs },
			message: `${deletedConfigs.length} configuração(ões) de frete excluída(s) com sucesso!`
		});
		
	} catch (error) {
		console.error('Erro ao excluir configurações de frete:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
}; 