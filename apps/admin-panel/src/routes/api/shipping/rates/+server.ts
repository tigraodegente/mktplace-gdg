import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar todas as tabelas de preços
export const GET: RequestHandler = async ({ url }) => {
	try {
		const db = getDatabase();
		
		// Parâmetros de query
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const search = url.searchParams.get('search') || '';
		const carrierId = url.searchParams.get('carrierId') || '';
		const zoneId = url.searchParams.get('zoneId') || '';
		const sortBy = url.searchParams.get('sortBy') || 'weight_from';
		const sortOrder = url.searchParams.get('sortOrder') || 'asc';
		
		const offset = (page - 1) * limit;
		
		// Construir WHERE clause
		const conditions = [];
		const params = [];
		let paramIndex = 1;
		
		if (search) {
			conditions.push(`(sc.name ILIKE $${paramIndex} OR sz.name ILIKE $${paramIndex + 1})`);
			params.push(`%${search}%`, `%${search}%`);
			paramIndex += 2;
		}
		
		if (carrierId) {
			conditions.push(`sr.carrier_id = $${paramIndex}`);
			params.push(carrierId);
			paramIndex++;
		}
		
		if (zoneId) {
			conditions.push(`sr.zone_id = $${paramIndex}`);
			params.push(zoneId);
			paramIndex++;
		}
		
		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		
		// Query principal com JOINs
		const ratesQuery = `
			SELECT 
				sr.id,
				sr.carrier_id,
				sr.zone_id,
				sr.weight_from,
				sr.weight_to,
				sr.price,
				sr.delivery_time_min,
				sr.delivery_time_max,
				sr.created_at,
				sr.updated_at,
				sz.name as zone_name,
				sz.uf,
				sz.cities,
				sc.name as carrier_name,
				sc.type as carrier_type,
				sr.base_price,
				sr.price_per_kg
			FROM shipping_rates sr
			LEFT JOIN shipping_carriers sc ON sc.id::text = sr.carrier_id
			LEFT JOIN shipping_zones sz ON sz.id = sr.zone_id
			${whereClause}
			ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		
		params.push(limit, offset);
		
		const rates = await db.query(ratesQuery, params);
		
		// Count total
		const countQuery = `
			SELECT COUNT(*) as total
			FROM shipping_rates sr
			LEFT JOIN shipping_carriers sc ON sc.id::text = sr.carrier_id
			LEFT JOIN shipping_zones sz ON sz.id = sr.zone_id
			${whereClause}
		`;
		
		const countResult = await db.query(countQuery, params.slice(0, -2));
		const total = parseInt(countResult[0]?.total || '0');
		
		// Estatísticas
		const statsQuery = `
			SELECT 
				COUNT(*) as total_rates,
				COUNT(DISTINCT carrier_id) as unique_carriers,
				COUNT(DISTINCT zone_id) as unique_zones,
				AVG(price) as avg_price,
				MIN(price) as min_price,
				MAX(price) as max_price,
				AVG((delivery_time_min + delivery_time_max) / 2.0) as avg_delivery_time
			FROM shipping_rates
		`;
		
		const statsResult = await db.query(statsQuery);
		const stats = statsResult[0];
		
		// Buscar carriers e zones para filtros
		const carriersQuery = 'SELECT id, name FROM shipping_carriers WHERE is_active = true ORDER BY name';
		const zonesQuery = 'SELECT id, name FROM shipping_zones WHERE is_active = true ORDER BY name';
		
		const [carriers, zones] = await Promise.all([
			db.query(carriersQuery),
			db.query(zonesQuery)
		]);
		
		return json({
			success: true,
			data: {
				rates,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit)
				},
				stats: {
					totalRates: parseInt(stats?.total_rates || '0'),
					uniqueCarriers: parseInt(stats?.unique_carriers || '0'),
					uniqueZones: parseInt(stats?.unique_zones || '0'),
					avgPrice: parseFloat(stats?.avg_price || '0'),
					minPrice: parseFloat(stats?.min_price || '0'),
					maxPrice: parseFloat(stats?.max_price || '0'),
					avgDeliveryTime: parseFloat(stats?.avg_delivery_time || '0')
				},
				filters: {
					carriers,
					zones
				}
			}
		});
		
	} catch (error) {
		console.error('Erro ao buscar tabelas de preços:', error);
		
		// Fallback em caso de erro
		return json({
			success: true,
			data: {
				rates: [],
				pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
				stats: { totalRates: 0, uniqueCarriers: 0, uniqueZones: 0, avgPrice: 0, minPrice: 0, maxPrice: 0, avgDeliveryTime: 0 },
				filters: { carriers: [], zones: [] }
			},
			source: 'fallback'
		});
	}
};

// POST - Criar nova tabela de preços
export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		// Validação básica
		if (!data.carrier_id || !data.zone_id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Transportadora e zona são obrigatórios'
				}
			}, { status: 400 });
		}
		
		if (!data.weight_from || !data.weight_to || !data.price) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Peso inicial, final e preço são obrigatórios'
				}
			}, { status: 400 });
		}
		
		if (data.weight_from >= data.weight_to) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Peso inicial deve ser menor que o peso final'
				}
			}, { status: 400 });
		}
		
		// Verificar se já existe uma faixa de peso conflitante
		const conflictQuery = `
			SELECT id FROM shipping_rates 
			WHERE carrier_id = $1 AND zone_id = $2 
			AND (
				(weight_from <= $3 AND weight_to > $3) OR
				(weight_from < $4 AND weight_to >= $4) OR
				(weight_from >= $3 AND weight_to <= $4)
			)
		`;
		
		const conflictResult = await db.query(conflictQuery, [
			data.carrier_id,
			data.zone_id,
			data.weight_from,
			data.weight_to
		]);
		
		if (conflictResult.length > 0) {
			return json({
				success: false,
				error: {
					code: 'CONFLICT_ERROR',
					message: 'Já existe uma faixa de peso que sobrepõe com a informada'
				}
			}, { status: 409 });
		}
		
		// Inserir nova tabela de preços
		const insertQuery = `
			INSERT INTO shipping_rates (
				carrier_id, zone_id, weight_from, weight_to, price,
				delivery_time_min, delivery_time_max
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING *
		`;
		
		const result = await db.query(insertQuery, [
			data.carrier_id,
			data.zone_id,
			data.weight_from,
			data.weight_to,
			data.price,
			data.delivery_time_min || 1,
			data.delivery_time_max || 7
		]);
		
		const rate = result[0];
		
		return json({
			success: true,
			data: { rate },
			message: 'Tabela de preços criada com sucesso!'
		}, { status: 201 });
		
	} catch (error) {
		console.error('Erro ao criar tabela de preços:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// PUT - Atualizar tabela de preços
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'ID da tabela de preços é obrigatório'
				}
			}, { status: 400 });
		}
		
		// Verificar se a tabela existe
		const existsQuery = 'SELECT * FROM shipping_rates WHERE id = $1';
		const existsResult = await db.query(existsQuery, [data.id]);
		
		if (existsResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'NOT_FOUND',
					message: 'Tabela de preços não encontrada'
				}
			}, { status: 404 });
		}
		
		const existingRate = existsResult[0];
		
		// Se mudou peso, verificar conflitos
		if (data.weight_from || data.weight_to) {
			const newWeightFrom = data.weight_from || existingRate.weight_from;
			const newWeightTo = data.weight_to || existingRate.weight_to;
			
			if (newWeightFrom >= newWeightTo) {
				return json({
					success: false,
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Peso inicial deve ser menor que o peso final'
					}
				}, { status: 400 });
			}
			
			const conflictQuery = `
				SELECT id FROM shipping_rates 
				WHERE carrier_id = $1 AND zone_id = $2 AND id != $3
				AND (
					(weight_from <= $4 AND weight_to > $4) OR
					(weight_from < $5 AND weight_to >= $5) OR
					(weight_from >= $4 AND weight_to <= $5)
				)
			`;
			
			const conflictResult = await db.query(conflictQuery, [
				data.carrier_id || existingRate.carrier_id,
				data.zone_id || existingRate.zone_id,
				data.id,
				newWeightFrom,
				newWeightTo
			]);
			
			if (conflictResult.length > 0) {
				return json({
					success: false,
					error: {
						code: 'CONFLICT_ERROR',
						message: 'Já existe uma faixa de peso que sobrepõe com a informada'
					}
				}, { status: 409 });
			}
		}
		
		// Atualizar tabela de preços
		const updateQuery = `
			UPDATE shipping_rates SET
				carrier_id = COALESCE($2, carrier_id),
				zone_id = COALESCE($3, zone_id),
				weight_from = COALESCE($4, weight_from),
				weight_to = COALESCE($5, weight_to),
				price = COALESCE($6, price),
				delivery_time_min = COALESCE($7, delivery_time_min),
				delivery_time_max = COALESCE($8, delivery_time_max),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $1
			RETURNING *
		`;
		
		const result = await db.query(updateQuery, [
			data.id,
			data.carrier_id,
			data.zone_id,
			data.weight_from,
			data.weight_to,
			data.price,
			data.delivery_time_min,
			data.delivery_time_max
		]);
		
		const rate = result[0];
		
		return json({
			success: true,
			data: { rate },
			message: 'Tabela de preços atualizada com sucesso!'
		});
		
	} catch (error) {
		console.error('Erro ao atualizar tabela de preços:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// DELETE - Excluir tabelas de preços
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'IDs das tabelas de preços são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Excluir tabelas de preços
		const deleteQuery = `
			DELETE FROM shipping_rates 
			WHERE id = ANY($1) 
			RETURNING id, weight_from, weight_to, price
		`;
		const result = await db.query(deleteQuery, [data.ids]);
		
		const deletedRates = result;
		
		return json({
			success: true,
			data: { deletedRates },
			message: `${deletedRates.length} tabela(s) de preços excluída(s) com sucesso!`
		});
		
	} catch (error) {
		console.error('Erro ao excluir tabelas de preços:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
}; 