import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar cotações
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
			conditions.push(`(sq.quote_code ILIKE $${paramIndex} OR sq.customer_name ILIKE $${paramIndex} OR sq.customer_email ILIKE $${paramIndex} OR sq.origin_city ILIKE $${paramIndex} OR sq.destination_city ILIKE $${paramIndex})`);
			params.push(`%${search}%`);
			paramIndex++;
		}

		// Filtro de status
		if (status !== 'all') {
			conditions.push(`sq.status = $${paramIndex}`);
			params.push(status);
			paramIndex++;
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		const offset = (page - 1) * limit;

		// Validar campo de ordenação
		const validSortFields = ['quote_code', 'customer_name', 'best_price', 'status', 'quoted_at', 'expires_at', 'created_at'];
		const sortField = validSortFields.includes(sortBy) ? `sq.${sortBy}` : 'sq.created_at';
		const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

		// Query principal com JOINs
		const query = `
			SELECT 
				sq.id, sq.quote_code, sq.customer_email, sq.customer_name, sq.customer_phone,
				sq.origin_cep, sq.origin_city, sq.origin_state,
				sq.destination_cep, sq.destination_city, sq.destination_state,
				sq.total_weight, sq.total_value, sq.package_count, sq.dimensions_info,
				sq.quoted_methods, sq.best_price, sq.status, sq.expires_at, sq.quoted_at, sq.selected_at,
				sq.ip_address, sq.session_id, sq.is_active, sq.created_at, sq.updated_at,
				sm_best.name as best_method_name,
				sm_selected.name as selected_method_name,
				COUNT(*) OVER() as total_count
			FROM shipping_quotes sq
			LEFT JOIN shipping_methods sm_best ON sq.best_method_id = sm_best.id
			LEFT JOIN shipping_methods sm_selected ON sq.selected_method_id = sm_selected.id
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
				quote_code: row.quote_code,
				customer_email: row.customer_email,
				customer_name: row.customer_name,
				customer_phone: row.customer_phone,
				origin_cep: row.origin_cep,
				origin_city: row.origin_city,
				origin_state: row.origin_state,
				destination_cep: row.destination_cep,
				destination_city: row.destination_city,
				destination_state: row.destination_state,
				total_weight: Number(row.total_weight || 0),
				total_value: Number(row.total_value || 0),
				package_count: row.package_count || 1,
				dimensions_info: row.dimensions_info,
				quoted_methods: row.quoted_methods,
				best_price: Number(row.best_price || 0),
				best_method_name: row.best_method_name,
				selected_method_name: row.selected_method_name,
				status: row.status,
				expires_at: row.expires_at,
				quoted_at: row.quoted_at,
				selected_at: row.selected_at,
				ip_address: row.ip_address,
				session_id: row.session_id,
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
		console.error('Error fetching shipping quotes:', error);
		return json({
			success: false,
			error: 'Erro ao buscar cotações'
		}, { status: 500 });
	}
};

// POST - Criar cotação
export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDatabase(platform);
		const data = await request.json();

		// Validações
		if (!data.customer_email || !data.origin_cep || !data.destination_cep || !data.total_weight) {
			return json({
				success: false,
				error: 'Email, CEPs de origem/destino e peso total são obrigatórios'
			}, { status: 400 });
		}

		// Gerar código único da cotação
		const quoteCode = data.quote_code || `COT${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

		// Calcular data de expiração (24 horas)
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 24);

		// Inserir nova cotação
		const [result] = await db.query`
			INSERT INTO shipping_quotes (
				quote_code, customer_email, customer_name, customer_phone,
				origin_cep, origin_city, origin_state,
				destination_cep, destination_city, destination_state,
				total_weight, total_value, package_count, dimensions_info,
				quoted_methods, best_price, best_method_id, selected_method_id,
				status, expires_at, quoted_at, selected_at,
				ip_address, user_agent, session_id, is_active
			) VALUES (
				${quoteCode}, ${data.customer_email}, ${data.customer_name || null}, ${data.customer_phone || null},
				${data.origin_cep}, ${data.origin_city || null}, ${data.origin_state || null},
				${data.destination_cep}, ${data.destination_city || null}, ${data.destination_state || null},
				${data.total_weight}, ${data.total_value || null}, ${data.package_count || 1}, ${JSON.stringify(data.dimensions_info || null)},
				${JSON.stringify(data.quoted_methods || [])}, ${data.best_price || null}, ${data.best_method_id || null}, ${data.selected_method_id || null},
				${data.status || 'pending'}, ${expiresAt.toISOString()}, ${data.quoted_at || null}, ${data.selected_at || null},
				${data.ip_address || null}, ${data.user_agent || null}, ${data.session_id || null}, ${data.is_active !== false}
			) RETURNING id
		`;

		await db.close();

		return json({
			success: true,
			data: { id: result.id, quote_code: quoteCode },
			message: 'Cotação criada com sucesso!'
		});

	} catch (error) {
		console.error('Error creating shipping quote:', error);
		return json({
			success: false,
			error: 'Erro ao criar cotação'
		}, { status: 500 });
	}
};

// DELETE - Excluir cotações
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
		const query = `DELETE FROM shipping_quotes WHERE id IN (${placeholders})`;

		await db.query(query, ...ids);
		await db.close();

		return json({
			success: true,
			message: `${ids.length} cotação(ões) excluída(s) com sucesso!`
		});

	} catch (error) {
		console.error('Error deleting shipping quotes:', error);
		return json({
			success: false,
			error: 'Erro ao excluir cotações'
		}, { status: 500 });
	}
}; 