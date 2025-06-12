import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar envios
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

		// Filtro de busca
		if (search) {
			conditions.push(`(s.tracking_code ILIKE $${paramIndex} OR s.customer_name ILIKE $${paramIndex} OR s.customer_email ILIKE $${paramIndex} OR s.destination_city ILIKE $${paramIndex})`);
			params.push(`%${search}%`);
			paramIndex++;
		}

		// Filtro de status
		if (status !== 'all') {
			conditions.push(`s.status = $${paramIndex}`);
			params.push(status);
			paramIndex++;
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		const offset = (page - 1) * limit;

		// Validar campo de ordenação
		const validSortFields = ['tracking_code', 'customer_name', 'status', 'shipped_at', 'estimated_delivery', 'created_at'];
		const sortField = validSortFields.includes(sortBy) ? `s.${sortBy}` : 's.created_at';
		const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

		// Query principal com JOINs
		const query = `
			SELECT 
				s.id, s.tracking_code, s.order_id,
				s.customer_name, s.customer_email, s.customer_phone,
				s.destination_address, s.destination_city, s.destination_state, s.destination_cep,
				s.origin_city, s.origin_state, s.origin_cep,
				s.weight, s.declared_value, s.status,
				s.shipped_at, s.estimated_delivery, s.delivered_at,
				s.shipping_cost, s.insurance_cost, s.total_cost,
				s.notes, s.is_active, s.created_at, s.updated_at,
				sm.name as shipping_method_name,
				c.name as carrier_name,
				COUNT(*) OVER() as total_count
			FROM shipments s
			LEFT JOIN shipping_methods sm ON s.shipping_method_id = sm.id
			LEFT JOIN shipping_carriers c ON s.carrier_id = c.id::text
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
				tracking_code: row.tracking_code,
				order_id: row.order_id,
				customer_name: row.customer_name,
				customer_email: row.customer_email,
				customer_phone: row.customer_phone,
				destination_address: row.destination_address,
				destination_city: row.destination_city,
				destination_state: row.destination_state,
				destination_cep: row.destination_cep,
				origin_city: row.origin_city,
				origin_state: row.origin_state,
				origin_cep: row.origin_cep,
				weight: Number(row.weight || 0),
				declared_value: Number(row.declared_value || 0),
				status: row.status,
				shipped_at: row.shipped_at,
				estimated_delivery: row.estimated_delivery,
				delivered_at: row.delivered_at,
				shipping_cost: Number(row.shipping_cost || 0),
				insurance_cost: Number(row.insurance_cost || 0),
				total_cost: Number(row.total_cost || 0),
				shipping_method_name: row.shipping_method_name,
				carrier_name: row.carrier_name,
				notes: row.notes,
				is_active: row.is_active,
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
		console.error('Error fetching shipments:', error);
		return json({
			success: false,
			error: 'Erro ao buscar envios'
		}, { status: 500 });
	}
};

// POST - Criar envio
export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDatabase(platform);
		const data = await request.json();

		// Validações
		if (!data.customer_name || !data.destination_address) {
			return json({
				success: false,
				error: 'Nome do cliente e endereço de destino são obrigatórios'
			}, { status: 400 });
		}

		// Gerar código de rastreamento único
		const trackingCode = data.tracking_code || `BR${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}BR`;

		// Verificar se código de rastreamento já existe
		const [existing] = await db.query`
			SELECT id FROM shipments WHERE tracking_code = ${trackingCode}
		`;

		if (existing) {
			return json({
				success: false,
				error: 'Código de rastreamento já existe'
			}, { status: 400 });
		}

		// Inserir novo envio
		const [result] = await db.query`
			INSERT INTO shipments (
				tracking_code, order_id, customer_name, customer_email, customer_phone,
				shipping_method_id, carrier_id,
				origin_address, origin_city, origin_state, origin_cep,
				destination_address, destination_city, destination_state, destination_cep,
				weight, dimensions_length, dimensions_width, dimensions_height, declared_value,
				status, shipped_at, estimated_delivery,
				shipping_cost, insurance_cost, total_cost, notes, is_active
			) VALUES (
				${trackingCode}, ${data.order_id || null}, ${data.customer_name}, ${data.customer_email || null}, ${data.customer_phone || null},
				${data.shipping_method_id || null}, ${data.carrier_id || null},
				${data.origin_address || null}, ${data.origin_city || null}, ${data.origin_state || null}, ${data.origin_cep || null},
				${data.destination_address}, ${data.destination_city || null}, ${data.destination_state || null}, ${data.destination_cep || null},
				${data.weight || null}, ${data.dimensions_length || null}, ${data.dimensions_width || null}, ${data.dimensions_height || null}, ${data.declared_value || null},
				${data.status || 'pending'}, ${data.shipped_at || null}, ${data.estimated_delivery || null},
				${data.shipping_cost || null}, ${data.insurance_cost || 0}, ${data.total_cost || null},
				${data.notes || null}, ${data.is_active !== false}
			) RETURNING id
		`;

		await db.close();

		return json({
			success: true,
			data: { id: result.id, tracking_code: trackingCode },
			message: 'Envio criado com sucesso!'
		});

	} catch (error) {
		console.error('Error creating shipment:', error);
		return json({
			success: false,
			error: 'Erro ao criar envio'
		}, { status: 500 });
	}
};

// DELETE - Excluir envios
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
		const query = `DELETE FROM shipments WHERE id IN (${placeholders})`;

		await db.query(query, ...ids);
		await db.close();

		return json({
			success: true,
			message: `${ids.length} envio(s) excluído(s) com sucesso!`
		});

	} catch (error) {
		console.error('Error deleting shipments:', error);
		return json({
			success: false,
			error: 'Erro ao excluir envios'
		}, { status: 500 });
	}
}; 