import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';

// GET - Listar todas as configurações
export const GET: RequestHandler = async ({ url, platform }) => {
	try {
		// TODO: Adicionar verificação de autenticação
		const db = getDatabase(platform);
		
		// Parâmetros de filtro
		const configKey = url.searchParams.get('key');
		const categoryId = url.searchParams.get('category_id');
		const sellerId = url.searchParams.get('seller_id');
		const userSegment = url.searchParams.get('user_segment');
		const isActive = url.searchParams.get('active');
		const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
		const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
		
		// Construir query com filtros
		const conditions: string[] = [];
		const params: any[] = [];
		let paramIndex = 1;
		
		if (configKey) {
			conditions.push(`config_key ILIKE $${paramIndex}`);
			params.push(`%${configKey}%`);
			paramIndex++;
		}
		
		if (categoryId) {
			conditions.push(`category_id = $${paramIndex}`);
			params.push(parseInt(categoryId));
			paramIndex++;
		}
		
		if (sellerId) {
			conditions.push(`seller_id = $${paramIndex}`);
			params.push(sellerId);
			paramIndex++;
		}
		
		if (userSegment) {
			conditions.push(`user_segment = $${paramIndex}`);
			params.push(userSegment);
			paramIndex++;
		}
		
		if (isActive !== null) {
			conditions.push(`is_active = $${paramIndex}`);
			params.push(isActive === 'true');
			paramIndex++;
		}
		
		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		
		// Query principal
		const query = `
			SELECT 
				id,
				config_key,
				config_value,
				category_id,
				seller_id,
				user_segment,
				valid_from,
				valid_until,
				is_active,
				priority,
				created_at,
				updated_at,
				created_by,
				updated_by,
				-- Join com categoria para nome
				c.name as category_name
			FROM pricing_configs pc
			LEFT JOIN categories c ON c.id = pc.category_id
			${whereClause}
			ORDER BY 
				CASE WHEN category_id IS NULL AND seller_id IS NULL THEN 0 ELSE 1 END,
				config_key ASC,
				priority DESC,
				created_at DESC
			LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
		`;
		
		params.push(limit, (page - 1) * limit);
		
		// Query de contagem
		const countQuery = `
			SELECT COUNT(*) as total
			FROM pricing_configs pc
			${whereClause}
		`;
		
		const [results, countResult] = await Promise.all([
			db.query(query, params),
			db.query(countQuery, params.slice(0, -2)) // Remove limit e offset
		]);
		
		const total = parseInt(countResult[0]?.total || '0');
		const totalPages = Math.ceil(total / limit);
		
		return json({
			success: true,
			data: results,
			meta: {
				page,
				limit,
				total,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1
			}
		});
		
	} catch (error) {
		console.error('Erro ao buscar configurações:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
};

// POST - Criar nova configuração
export const POST: RequestHandler = async ({ request, platform, locals }) => {
	try {
		// Verificar autenticação
		const authResult = await requireAuth(locals);
		if (!authResult.success) {
			return json({ success: false, error: 'Não autorizado' }, { status: 401 });
		}
		
		const body = await request.json();
		const {
			config_key,
			config_value,
			category_id,
			seller_id,
			user_segment,
			valid_from,
			valid_until,
			is_active = true,
			priority = 0
		} = body;
		
		// Validações
		if (!config_key || config_value === undefined) {
			return json({
				success: false,
				error: 'config_key e config_value são obrigatórios'
			}, { status: 400 });
		}
		
		// Validar formato do valor (deve ser JSON válido)
		let parsedValue;
		try {
			parsedValue = typeof config_value === 'string' 
				? JSON.parse(config_value) 
				: config_value;
		} catch (e) {
			return json({
				success: false,
				error: 'config_value deve ser um JSON válido'
			}, { status: 400 });
		}
		
		const db = getDatabase(platform);
		
		// Inserir nova configuração
		const query = `
			INSERT INTO pricing_configs (
				config_key,
				config_value,
				category_id,
				seller_id,
				user_segment,
				valid_from,
				valid_until,
				is_active,
				priority,
				created_by,
				updated_by
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING *
		`;
		
		const result = await db.query(query, [
			config_key,
			JSON.stringify(parsedValue),
			category_id || null,
			seller_id || null,
			user_segment || null,
			valid_from || null,
			valid_until || null,
			is_active,
			priority,
			authResult.user.email,
			authResult.user.email
		]);
		
		return json({
			success: true,
			data: result[0],
			message: 'Configuração criada com sucesso'
		});
		
	} catch (error) {
		console.error('Erro ao criar configuração:', error);
		
		// Erro de constraint única
		if (error.code === '23505') {
			return json({
				success: false,
				error: 'Já existe uma configuração com essa chave e escopo'
			}, { status: 409 });
		}
		
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
};

// PUT - Atualizar configuração existente
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
	try {
		// Verificar autenticação
		const authResult = await requireAuth(locals);
		if (!authResult.success) {
			return json({ success: false, error: 'Não autorizado' }, { status: 401 });
		}
		
		const body = await request.json();
		const {
			id,
			config_key,
			config_value,
			category_id,
			seller_id,
			user_segment,
			valid_from,
			valid_until,
			is_active,
			priority
		} = body;
		
		// Validações
		if (!id) {
			return json({
				success: false,
				error: 'ID é obrigatório para atualização'
			}, { status: 400 });
		}
		
		// Validar formato do valor se fornecido
		let parsedValue;
		if (config_value !== undefined) {
			try {
				parsedValue = typeof config_value === 'string' 
					? JSON.parse(config_value) 
					: config_value;
			} catch (e) {
				return json({
					success: false,
					error: 'config_value deve ser um JSON válido'
				}, { status: 400 });
			}
		}
		
		const db = getDatabase(platform);
		
		// Construir query de atualização dinâmica
		const updates: string[] = [];
		const params: any[] = [];
		let paramIndex = 1;
		
		if (config_key !== undefined) {
			updates.push(`config_key = $${paramIndex}`);
			params.push(config_key);
			paramIndex++;
		}
		
		if (config_value !== undefined) {
			updates.push(`config_value = $${paramIndex}`);
			params.push(JSON.stringify(parsedValue));
			paramIndex++;
		}
		
		if (category_id !== undefined) {
			updates.push(`category_id = $${paramIndex}`);
			params.push(category_id || null);
			paramIndex++;
		}
		
		if (seller_id !== undefined) {
			updates.push(`seller_id = $${paramIndex}`);
			params.push(seller_id || null);
			paramIndex++;
		}
		
		if (user_segment !== undefined) {
			updates.push(`user_segment = $${paramIndex}`);
			params.push(user_segment || null);
			paramIndex++;
		}
		
		if (valid_from !== undefined) {
			updates.push(`valid_from = $${paramIndex}`);
			params.push(valid_from || null);
			paramIndex++;
		}
		
		if (valid_until !== undefined) {
			updates.push(`valid_until = $${paramIndex}`);
			params.push(valid_until || null);
			paramIndex++;
		}
		
		if (is_active !== undefined) {
			updates.push(`is_active = $${paramIndex}`);
			params.push(is_active);
			paramIndex++;
		}
		
		if (priority !== undefined) {
			updates.push(`priority = $${paramIndex}`);
			params.push(priority);
			paramIndex++;
		}
		
		// Sempre atualizar updated_by
		updates.push(`updated_by = $${paramIndex}`);
		params.push(authResult.user.email);
		paramIndex++;
		
		// ID no final
		params.push(id);
		
		const query = `
			UPDATE pricing_configs 
			SET ${updates.join(', ')}
			WHERE id = $${paramIndex}
			RETURNING *
		`;
		
		const result = await db.query(query, params);
		
		if (result.length === 0) {
			return json({
				success: false,
				error: 'Configuração não encontrada'
			}, { status: 404 });
		}
		
		return json({
			success: true,
			data: result[0],
			message: 'Configuração atualizada com sucesso'
		});
		
	} catch (error) {
		console.error('Erro ao atualizar configuração:', error);
		
		// Erro de constraint única
		if (error.code === '23505') {
			return json({
				success: false,
				error: 'Já existe uma configuração com essa chave e escopo'
			}, { status: 409 });
		}
		
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
};

// DELETE - Remover configuração
export const DELETE: RequestHandler = async ({ url, platform, locals }) => {
	try {
		// Verificar autenticação
		const authResult = await requireAuth(locals);
		if (!authResult.success) {
			return json({ success: false, error: 'Não autorizado' }, { status: 401 });
		}
		
		const id = url.searchParams.get('id');
		
		if (!id) {
			return json({
				success: false,
				error: 'ID é obrigatório'
			}, { status: 400 });
		}
		
		const db = getDatabase(platform);
		
		// Verificar se existe
		const existsQuery = `SELECT id, config_key FROM pricing_configs WHERE id = $1`;
		const existsResult = await db.query(existsQuery, [parseInt(id)]);
		
		if (existsResult.length === 0) {
			return json({
				success: false,
				error: 'Configuração não encontrada'
			}, { status: 404 });
		}
		
		// Remover
		const deleteQuery = `DELETE FROM pricing_configs WHERE id = $1`;
		await db.query(deleteQuery, [parseInt(id)]);
		
		return json({
			success: true,
			message: `Configuração ${existsResult[0].config_key} removida com sucesso`
		});
		
	} catch (error) {
		console.error('Erro ao remover configuração:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 