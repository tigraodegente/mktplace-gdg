import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Listar todos os fornecedores
export async function GET({ url, platform }) {
	try {
		const search = url.searchParams.get('search') || '';
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');
		const active = url.searchParams.get('active') || 'all';

		return await withDatabase(platform, async (db) => {
			let query = `
				SELECT 
					s.id,
					s.name,
					s.email,
					s.phone,
					s.document,
					s.address,
					s.city,
					s.state,
					s.country,
					s.postal_code,
					s.is_active,
					s.notes,
					s.created_at,
					s.updated_at,
					COUNT(ps.product_id) as product_count
				FROM suppliers s
				LEFT JOIN product_suppliers ps ON ps.supplier_id = s.id
			`;
			
			const params: any[] = [];
			const conditions: string[] = [];
			
			if (search) {
				conditions.push(`(s.name ILIKE $${params.length + 1} OR s.email ILIKE $${params.length + 1})`);
				params.push(`%${search}%`);
			}
			
			if (active !== 'all') {
				conditions.push(`s.is_active = $${params.length + 1}`);
				params.push(active === 'true');
			}
			
			if (conditions.length > 0) {
				query += ` WHERE ${conditions.join(' AND ')}`;
			}
			
			query += ` GROUP BY s.id ORDER BY s.name ASC`;
			query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
			params.push(limit, offset);
			
			const suppliers = await db.query(query, params);
			
			// Buscar total de registros
			let countQuery = 'SELECT COUNT(*) as total FROM suppliers s';
			const countParams: any[] = [];
			
			if (search || active !== 'all') {
				const countConditions: string[] = [];
				
				if (search) {
					countConditions.push(`(s.name ILIKE $${countParams.length + 1} OR s.email ILIKE $${countParams.length + 1})`);
					countParams.push(`%${search}%`);
				}
				
				if (active !== 'all') {
					countConditions.push(`s.is_active = $${countParams.length + 1}`);
					countParams.push(active === 'true');
				}
				
				if (countConditions.length > 0) {
					countQuery += ` WHERE ${countConditions.join(' AND ')}`;
				}
			}
			
			const totalResult = await db.query(countQuery, countParams);
			const total = parseInt(totalResult[0].total);
			
			return json({
				success: true,
				data: suppliers,
				meta: {
					total,
					limit,
					offset,
					hasMore: offset + limit < total
				}
			});
		});
	} catch (error) {
		console.error('Erro ao buscar fornecedores:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Criar novo fornecedor
export async function POST({ request, platform }) {
	try {
		const {
			name,
			email,
			phone,
			document,
			address,
			city,
			state,
			country = 'BR',
			postal_code,
			is_active = true,
			notes
		} = await request.json();
		
		if (!name) {
			return json({
				success: false,
				error: 'Nome do fornecedor é obrigatório'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			const query = `
				INSERT INTO suppliers (
					name, email, phone, document, address, city, state, 
					country, postal_code, is_active, notes
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				RETURNING *
			`;
			
			const result = await db.query(query, [
				name, email, phone, document, address, city, state,
				country, postal_code, is_active, notes
			]);
			
			return json({
				success: true,
				data: result[0],
				message: 'Fornecedor criado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao criar fornecedor:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Atualizar fornecedor
export async function PUT({ request, platform }) {
	try {
		const {
			id,
			name,
			email,
			phone,
			document,
			address,
			city,
			state,
			country,
			postal_code,
			is_active,
			notes
		} = await request.json();
		
		if (!id) {
			return json({
				success: false,
				error: 'ID do fornecedor é obrigatório'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			const query = `
				UPDATE suppliers 
				SET name = $2, email = $3, phone = $4, document = $5, 
				    address = $6, city = $7, state = $8, country = $9,
				    postal_code = $10, is_active = $11, notes = $12, 
				    updated_at = NOW()
				WHERE id = $1
				RETURNING *
			`;
			
			const result = await db.query(query, [
				id, name, email, phone, document, address, city, state,
				country, postal_code, is_active, notes
			]);
			
			if (!result[0]) {
				return json({
					success: false,
					error: 'Fornecedor não encontrado'
				}, { status: 404 });
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Fornecedor atualizado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar fornecedor:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover fornecedores
export async function DELETE({ request, platform }) {
	try {
		const { ids } = await request.json();
		
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return json({
				success: false,
				error: 'IDs dos fornecedores são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			// Remover associações com produtos primeiro
			await db.query(`DELETE FROM product_suppliers WHERE supplier_id = ANY($1)`, [ids]);
			
			// Remover os fornecedores
			const query = `DELETE FROM suppliers WHERE id = ANY($1)`;
			await db.query(query, [ids]);
			
			return json({
				success: true,
				message: `${ids.length} fornecedor(es) removido(s) com sucesso`
			});
		});
	} catch (error) {
		console.error('Erro ao remover fornecedores:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 