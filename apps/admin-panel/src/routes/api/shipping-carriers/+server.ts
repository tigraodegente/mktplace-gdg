import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar transportadoras
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
			conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR cnpj ILIKE $${paramIndex} OR contact_email ILIKE $${paramIndex})`);
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
		const validSortFields = ['name', 'cnpj', 'contact_email', 'coverage_type', 'api_integration', 'is_active', 'created_at'];
		const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
		const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

		// Query principal
		const query = `
			SELECT 
				id, name, description, cnpj,
				contact_email, contact_phone,
				api_integration, api_url, coverage_type,
				is_active, created_at, updated_at,
				COUNT(*) OVER() as total_count
			FROM shipping_carriers
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
				cnpj: row.cnpj,
				contact_email: row.contact_email,
				contact_phone: row.contact_phone,
				api_integration: row.api_integration,
				api_url: row.api_url,
				coverage_type: row.coverage_type,
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
		console.error('Error fetching shipping carriers:', error);
		return json({
			success: false,
			error: 'Erro ao buscar transportadoras'
		}, { status: 500 });
	}
};

// POST - Criar transportadora
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

		// Verificar se CNPJ já existe
		if (data.cnpj) {
			const [existing] = await db.query`
				SELECT id FROM shipping_carriers WHERE cnpj = ${data.cnpj}
			`;
			
			if (existing) {
				return json({
					success: false,
					error: 'CNPJ já cadastrado'
				}, { status: 400 });
			}
		}

		// Inserir nova transportadora
		const [result] = await db.query`
			INSERT INTO shipping_carriers (
				name, description, cnpj,
				contact_email, contact_phone,
				api_integration, api_url, coverage_type,
				is_active
			) VALUES (
				${data.name}, ${data.description || null}, ${data.cnpj || null},
				${data.contact_email || null}, ${data.contact_phone || null},
				${data.api_integration || false}, ${data.api_url || null}, ${data.coverage_type || 'regional'},
				${data.is_active !== false}
			) RETURNING id
		`;

		await db.close();

		return json({
			success: true,
			data: { id: result.id },
			message: 'Transportadora criada com sucesso!'
		});

	} catch (error) {
		console.error('Error creating shipping carrier:', error);
		return json({
			success: false,
			error: 'Erro ao criar transportadora'
		}, { status: 500 });
	}
};

// DELETE - Excluir transportadoras
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
		const query = `DELETE FROM shipping_carriers WHERE id IN (${placeholders})`;

		await db.query(query, ...ids);
		await db.close();

		return json({
			success: true,
			message: `${ids.length} transportadora(s) excluída(s) com sucesso!`
		});

	} catch (error) {
		console.error('Error deleting shipping carriers:', error);
		return json({
			success: false,
			error: 'Erro ao excluir transportadoras'
		}, { status: 500 });
	}
}; 