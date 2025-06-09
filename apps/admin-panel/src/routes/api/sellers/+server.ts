import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		console.log('🔌 Dev: NEON');
		
		const db = getDatabase();
		
		// Parâmetros de consulta
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const search = url.searchParams.get('search') || '';
		const offset = (page - 1) * limit;
		
		// Query base
		let whereClause = '';
		let countQuery = '';
		let searchParams: any[] = [];
		
		if (search) {
			whereClause = 'WHERE s.company_name ILIKE $1 OR s.slug ILIKE $1 OR u.name ILIKE $1 OR u.email ILIKE $1';
			countQuery = `
				SELECT COUNT(*) as total 
				FROM sellers s 
				JOIN users u ON u.id = s.user_id
				${whereClause}
			`;
			searchParams = [`%${search}%`];
		} else {
			countQuery = 'SELECT COUNT(*) as total FROM sellers';
		}
		
		// Buscar total de registros
		const totalResult = await db.query(countQuery, searchParams);
		const total = parseInt(totalResult[0]?.total || '0');
		const totalPages = Math.ceil(total / limit);
		
		// Query principal com paginação
		const mainQuery = `
			SELECT 
				s.*,
				u.name as user_name,
				u.email as user_email,
				COUNT(p.id) as product_count
			FROM sellers s
			JOIN users u ON u.id = s.user_id
			LEFT JOIN products p ON p.seller_id = s.id
			${whereClause}
			GROUP BY s.id, u.id
			ORDER BY s.created_at DESC
			LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
		`;
		
		const params = [...searchParams, limit, offset];
		const sellers = await db.query(mainQuery, params);
		
		return json({
			success: true,
			data: sellers,
			meta: {
				page: page,
				pageSize: limit,
				total: total,
				totalPages: totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1
			}
		});
		
	} catch (error) {
		console.error('❌ Erro na query:', error);
		return json({
			success: false,
			error: 'Erro ao buscar vendedores'
		}, { status: 500 });
	}
};

// POST - Criar vendedor
export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		console.log('Criando vendedor:', data);
		
		// Validar campos obrigatórios
		if (!data.store_name || !data.store_slug || !data.email) {
			return json({
				success: false,
				error: 'Campos obrigatórios: store_name, store_slug, email'
			}, { status: 400 });
		}
		
		// Verificar se o slug já existe
		const existingSlug = await db.query(
			'SELECT id FROM sellers WHERE slug = $1',
			[data.store_slug]
		);
		
		if (existingSlug.length > 0) {
			return json({
				success: false,
				error: 'Slug da loja já existe'
			}, { status: 400 });
		}
		
		// Criar ou buscar usuário
		let userId = data.user_id;
		if (!userId) {
			// Verificar se usuário já existe com esse email
			const existingUser = await db.query(
				'SELECT id FROM users WHERE email = $1',
				[data.email]
			);
			
			if (existingUser.length > 0) {
				userId = existingUser[0].id;
			} else {
				// Criar novo usuário com senha temporária
				const newUser = await db.query(`
					INSERT INTO users (name, email, password_hash, role, is_active)
					VALUES ($1, $2, 'temp_hash_needs_reset', 'customer', true)
					RETURNING id
				`, [data.store_name, data.email]);
				
				userId = newUser[0].id;
			}
		}
		
		// Criar vendedor
		const seller = await db.query(`
			INSERT INTO sellers (
				user_id, company_name, slug, description, logo_url, is_verified, company_document
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING *
		`, [
			userId,
			data.store_name,
			data.store_slug,
			data.description || null,
			data.logo_url || null,
			data.is_verified || false,
			data.company_document || '00.000.000/0001-00' // CNPJ temporário
		]);
		
		console.log('✅ Vendedor criado:', seller[0].id);
		
		return json({
			success: true,
			data: seller[0]
		}, { status: 201 });
		
	} catch (error: any) {
		console.error('❌ Erro ao criar vendedor:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
};

// PUT - Atualizar vendedor
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		console.log('Atualizando vendedor:', data.id);
		
		if (!data.id) {
			return json({
				success: false,
				error: 'ID do vendedor é obrigatório'
			}, { status: 400 });
		}
		
		// Verificar se vendedor existe
		const existing = await db.query(
			'SELECT id FROM sellers WHERE id = $1',
			[data.id]
		);
		
		if (existing.length === 0) {
			return json({
				success: false,
				error: 'Vendedor não encontrado'
			}, { status: 404 });
		}
		
		// Atualizar vendedor
		const seller = await db.query(`
			UPDATE sellers SET
				company_name = $1,
				slug = $2,
				description = $3,
				logo_url = $4,
				is_verified = $5,
				updated_at = NOW()
			WHERE id = $6
			RETURNING *
		`, [
			data.store_name,
			data.store_slug,
			data.description || null,
			data.logo_url || null,
			data.is_verified || false,
			data.id
		]);
		
		console.log('✅ Vendedor atualizado:', data.id);
		
		return json({
			success: true,
			data: seller[0]
		});
		
	} catch (error) {
		console.error('❌ Erro ao atualizar vendedor:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
};

// DELETE - Excluir vendedor(es)
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const { id, ids } = await request.json();
		
		if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
			return json({
				success: false,
				error: 'ID(s) do(s) vendedor(es) são obrigatórios'
			}, { status: 400 });
		}
		
		const targetIds = id ? [id] : ids;
		
		// Soft delete - marcar como inativo
		await db.query(`
			UPDATE sellers 
			SET is_active = false, updated_at = NOW()
			WHERE id = ANY($1)
		`, [targetIds]);
		
		console.log('✅ Vendedor(es) excluído(s):', targetIds);
		
		return json({
			success: true,
			data: {
				message: `${targetIds.length} vendedor(es) excluído(s) com sucesso`
			}
		});
		
	} catch (error) {
		console.error('❌ Erro ao excluir vendedor:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}; 