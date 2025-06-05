import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar tarifas base
export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		const db = getDatabase(platform);
		
		// Parâmetros da requisição
		const searchParams = url.searchParams;
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '20');
		const search = searchParams.get('search') || '';
		const status = searchParams.get('status') || 'all';
		const sortBy = searchParams.get('sortBy') || 'created_at';
		const sortOrder = searchParams.get('sortOrder') || 'desc';

		// Construir condições WHERE
		const conditions: string[] = [];
		const params: any[] = [];
		let paramIndex = 1;

		// Filtro de busca (por zona ou transportadora)
		if (search) {
			conditions.push(`(z.name ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR sm.name ILIKE $${paramIndex})`);
			params.push(`%${search}%`);
			paramIndex++;
		}

		// Filtro de status
		if (status !== 'all') {
			if (status === 'active') {
				conditions.push(`sbr.is_active = $${paramIndex}`);
				params.push(true);
			} else if (status === 'inactive') {
				conditions.push(`sbr.is_active = $${paramIndex}`);
				params.push(false);
			}
			paramIndex++;
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		const offset = (page - 1) * limit;

		// Validar campo de ordenação
		const validSortFields = ['base_price', 'price_per_kg', 'min_weight', 'max_weight', 'priority', 'created_at'];
		const sortField = validSortFields.includes(sortBy) ? `sbr.${sortBy}` : 'sbr.created_at';
		const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

		// Query principal com JOINs
		const query = `
			SELECT 
				sbr.id, sbr.min_weight, sbr.max_weight,
				sbr.base_price, sbr.price_per_kg,
				sbr.min_delivery_days, sbr.max_delivery_days,
				sbr.priority, sbr.is_active,
				sbr.created_at, sbr.updated_at,
				z.name as zone_name, z.region as zone_region, z.states as zone_states,
				c.name as carrier_name, c.coverage_type,
				sm.name as method_name,
				COUNT(*) OVER() as total_count
			FROM shipping_base_rates sbr
			LEFT JOIN shipping_zones z ON sbr.zone_id = z.id
			LEFT JOIN shipping_carriers c ON sbr.carrier_id = c.id
			LEFT JOIN shipping_methods sm ON sbr.shipping_method_id = sm.id
			${whereClause}
			ORDER BY ${sortField} ${sortDirection}
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;

		params.push(limit, offset);

		const results = await db.query(query, ...params);
		const totalCount = results[0]?.total_count || 0;

		await db.close();

		return json({
			success: true,
			data: results.map((row: any) => ({
				id: row.id,
				min_weight: Number(row.min_weight || 0),
				max_weight: Number(row.max_weight || 30),
				base_price: Number(row.base_price || 0),
				price_per_kg: Number(row.price_per_kg || 0),
				min_delivery_days: row.min_delivery_days || 1,
				max_delivery_days: row.max_delivery_days || 7,
				priority: row.priority || 0,
				is_active: row.is_active,
				zone_name: row.zone_name,
				zone_region: row.zone_region,
				zone_states: row.zone_states,
				carrier_name: row.carrier_name,
				method_name: row.method_name,
				coverage_type: row.coverage_type,
				created_at: row.created_at,
				updated_at: row.updated_at
			})),
			meta: {
				total: parseInt(totalCount),
				page,
				limit,
				totalPages: Math.ceil(totalCount / limit)
			}
		});

	} catch (error) {
		console.error('Error fetching shipping base rates:', error);
		return json({
			success: false,
			error: 'Erro ao buscar tarifas base'
		}, { status: 500 });
	}
};

// POST - Criar tarifa base
export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDatabase(platform);
		const data = await request.json();

		// Validações
		if (!data.zone_id || !data.carrier_id || !data.shipping_method_id) {
			return json({
				success: false,
				error: 'Zona, transportadora e método de frete são obrigatórios'
			}, { status: 400 });
		}

		if (!data.base_price || data.base_price < 0) {
			return json({
				success: false,
				error: 'Preço base deve ser maior que zero'
			}, { status: 400 });
		}

		// Verificar se já existe tarifa para esta combinação
		const [existing] = await db.query`
			SELECT id FROM shipping_base_rates 
			WHERE zone_id = ${data.zone_id} 
				AND carrier_id = ${data.carrier_id} 
				AND shipping_method_id = ${data.shipping_method_id}
				AND min_weight = ${data.min_weight || 0}
				AND max_weight = ${data.max_weight || 30}
		`;

		if (existing) {
			return json({
				success: false,
				error: 'Já existe uma tarifa para esta combinação'
			}, { status: 400 });
		}

		// Inserir nova tarifa
		const [result] = await db.query`
			INSERT INTO shipping_base_rates (
				zone_id, carrier_id, shipping_method_id,
				min_weight, max_weight, base_price, price_per_kg,
				min_delivery_days, max_delivery_days, priority, is_active
			) VALUES (
				${data.zone_id}, ${data.carrier_id}, ${data.shipping_method_id},
				${data.min_weight || 0}, ${data.max_weight || 30},
				${data.base_price}, ${data.price_per_kg || 0},
				${data.min_delivery_days || 1}, ${data.max_delivery_days || 7},
				${data.priority || 0}, ${data.is_active !== false}
			) RETURNING id
		`;

		await db.close();

		return json({
			success: true,
			data: { id: result.id },
			message: 'Tarifa base criada com sucesso!'
		});

	} catch (error) {
		console.error('Error creating shipping base rate:', error);
		return json({
			success: false,
			error: 'Erro ao criar tarifa base'
		}, { status: 500 });
	}
};

// DELETE - Excluir tarifas
export const DELETE: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDatabase(platform);
		const { ids } = await request.json();

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return json({
				success: false,
				error: 'IDs são obrigatórios'
			}, { status: 400 });
		}

		// Construir query para exclusão em lote
		const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
		const query = `DELETE FROM shipping_base_rates WHERE id IN (${placeholders})`;

		await db.query(query, ...ids);
		await db.close();

		return json({
			success: true,
			message: `${ids.length} tarifa(s) base excluída(s) com sucesso!`
		});

	} catch (error) {
		console.error('Error deleting shipping base rates:', error);
		return json({
			success: false,
			error: 'Erro ao excluir tarifas base'
		}, { status: 500 });
	}
}; 