import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar zonas de frete
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
			conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR region ILIKE $${paramIndex})`);
			params.push(`%${search}%`);
			paramIndex++;
		}

		// Filtro de status
		if (status !== 'all') {
			if (status === 'active') {
				conditions.push(`is_active = $${paramIndex}`);
				params.push(true);
			} else if (status === 'inactive') {
				conditions.push(`is_active = $${paramIndex}`);
				params.push(false);
			}
			paramIndex++;
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		const offset = (page - 1) * limit;

		// Validar campo de ordenação
		const validSortFields = ['name', 'region', 'coverage_percentage', 'is_active', 'created_at'];
		const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
		const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

		// Query principal
		const query = `
			SELECT 
				id, name, description, states, cep_ranges,
				region, coverage_percentage, is_active,
				created_at, updated_at,
				COUNT(*) OVER() as total_count
			FROM shipping_zones
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
				name: row.name,
				description: row.description,
				states: row.states || [],
				cep_ranges: row.cep_ranges || [],
				region: row.region,
				coverage_percentage: row.coverage_percentage || 100,
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
		console.error('Error fetching shipping zones:', error);
		return json({
			success: false,
			error: 'Erro ao buscar zonas de frete'
		}, { status: 500 });
	}
};

// POST - Criar zona de frete
export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const db = getDatabase(platform);
		const data = await request.json();

		// Validações
		if (!data.name) {
			return json({
				success: false,
				error: 'Nome é obrigatório'
			}, { status: 400 });
		}

		if (!data.states || !Array.isArray(data.states) || data.states.length === 0) {
			return json({
				success: false,
				error: 'Estados são obrigatórios'
			}, { status: 400 });
		}

		// Inserir nova zona
		const [result] = await db.query`
			INSERT INTO shipping_zones (
				name, description, states, cep_ranges,
				region, coverage_percentage, is_active
			) VALUES (
				${data.name}, ${data.description || null}, ${data.states},
				${data.cep_ranges || []}, ${data.region || null},
				${data.coverage_percentage || 100}, ${data.is_active !== false}
			) RETURNING id
		`;

		await db.close();

		return json({
			success: true,
			data: { id: result.id },
			message: 'Zona de frete criada com sucesso!'
		});

	} catch (error) {
		console.error('Error creating shipping zone:', error);
		return json({
			success: false,
			error: 'Erro ao criar zona de frete'
		}, { status: 500 });
	}
};

// DELETE - Excluir zonas
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
		const query = `DELETE FROM shipping_zones WHERE id IN (${placeholders})`;

		await db.query(query, ...ids);
		await db.close();

		return json({
			success: true,
			message: `${ids.length} zona(s) de frete excluída(s) com sucesso!`
		});

	} catch (error) {
		console.error('Error deleting shipping zones:', error);
		return json({
			success: false,
			error: 'Erro ao excluir zonas de frete'
		}, { status: 500 });
	}
}; 