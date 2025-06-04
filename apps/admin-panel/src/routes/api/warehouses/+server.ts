import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Listar todos os armazéns
export async function GET({ url, platform }) {
	try {
		const search = url.searchParams.get('search') || '';
		const active = url.searchParams.get('active') || 'true';
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		return await withDatabase(platform, async (db) => {
			let query = `
				SELECT 
					w.id,
					w.name,
					w.code,
					w.type,
					w.address,
					w.city,
					w.state,
					w.country,
					w.postal_code,
					w.phone,
					w.email,
					w.is_active,
					w.is_default,
					w.created_at,
					w.updated_at,
					COUNT(ps.product_id) as product_count
				FROM warehouses w
				LEFT JOIN product_stocks ps ON ps.warehouse_id = w.id
			`;
			
			const params: any[] = [];
			const conditions: string[] = [];
			
			if (search) {
				conditions.push(`(w.name ILIKE $${params.length + 1} OR w.code ILIKE $${params.length + 1} OR w.city ILIKE $${params.length + 1})`);
				params.push(`%${search}%`);
			}
			
			if (active !== 'all') {
				conditions.push(`w.is_active = $${params.length + 1}`);
				params.push(active === 'true');
			}
			
			if (conditions.length > 0) {
				query += ` WHERE ${conditions.join(' AND ')}`;
			}
			
			query += ` GROUP BY w.id ORDER BY w.is_default DESC, w.name ASC`;
			query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
			params.push(limit, offset);
			
			const warehouses = await db.query(query, params);
			
			// Buscar total de registros
			let countQuery = 'SELECT COUNT(*) as total FROM warehouses w';
			const countParams: any[] = [];
			
			if (search || active !== 'all') {
				const countConditions: string[] = [];
				
				if (search) {
					countConditions.push(`(w.name ILIKE $${countParams.length + 1} OR w.code ILIKE $${countParams.length + 1} OR w.city ILIKE $${countParams.length + 1})`);
					countParams.push(`%${search}%`);
				}
				
				if (active !== 'all') {
					countConditions.push(`w.is_active = $${countParams.length + 1}`);
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
				data: warehouses,
				meta: {
					total,
					limit,
					offset,
					hasMore: offset + limit < total
				}
			});
		});
	} catch (error) {
		console.error('Erro ao buscar armazéns:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Criar novo armazém
export async function POST({ request, platform }) {
	try {
		const {
			name,
			code,
			type = 'main',
			address,
			city,
			state,
			country = 'BR',
			postal_code,
			phone,
			email,
			is_active = true,
			is_default = false,
			notes
		} = await request.json();
		
		if (!name || !code) {
			return json({
				success: false,
				error: 'Nome e código do armazém são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			// Se é o armazém padrão, remover flag dos outros
			if (is_default) {
				await db.query(`UPDATE warehouses SET is_default = false`);
			}

			const query = `
				INSERT INTO warehouses (
					name, code, type, address, city, state, country, 
					postal_code, phone, email, is_active, 
					is_default
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				RETURNING *
			`;
			
			const result = await db.query(query, [
				name, code, type, address, city, state, country,
				postal_code, phone, email, is_active, 
				is_default
			]);
			
			return json({
				success: true,
				data: result[0],
				message: 'Armazém criado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao criar armazém:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Atualizar armazém
export async function PUT({ request, platform }) {
	try {
		const {
			id,
			name,
			code,
			type,
			address,
			city,
			state,
			country,
			postal_code,
			phone,
			email,
			is_active,
			is_default,
			notes
		} = await request.json();
		
		if (!id) {
			return json({
				success: false,
				error: 'ID do armazém é obrigatório'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			// Se é o armazém padrão, remover flag dos outros
			if (is_default) {
				await db.query(`UPDATE warehouses SET is_default = false WHERE id != $1`, [id]);
			}

			const query = `
				UPDATE warehouses 
				SET name = $2, code = $3, type = $4, address = $5, city = $6, 
				    state = $7, country = $8, postal_code = $9, phone = $10, 
				    email = $11, is_active = $12, 
				    is_default = $13, updated_at = NOW()
				WHERE id = $1
				RETURNING *
			`;
			
			const result = await db.query(query, [
				id, name, code, type, address, city, state, country,
				postal_code, phone, email, is_active, 
				is_default
			]);
			
			if (!result[0]) {
				return json({
					success: false,
					error: 'Armazém não encontrado'
				}, { status: 404 });
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Armazém atualizado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar armazém:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover armazéns
export async function DELETE({ request, platform }) {
	try {
		const { ids } = await request.json();
		
		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return json({
				success: false,
				error: 'IDs dos armazéns são obrigatórios'
			}, { status: 400 });
		}
		
		return await withDatabase(platform, async (db) => {
			// Verificar se algum armazém tem estoque
			const stockQuery = `
				SELECT warehouse_id, COUNT(*) as stock_count
				FROM product_stocks 
				WHERE warehouse_id = ANY($1) AND quantity > 0
				GROUP BY warehouse_id
			`;
			const stockResult = await db.query(stockQuery, [ids]);
			
			if (stockResult.length > 0) {
				return json({
					success: false,
					error: 'Não é possível excluir armazéns que possuem estoque'
				}, { status: 400 });
			}

			// Remover estoques zerados primeiro
			await db.query(`DELETE FROM product_stocks WHERE warehouse_id = ANY($1)`, [ids]);
			
			// Remover os armazéns
			const query = `DELETE FROM warehouses WHERE id = ANY($1)`;
			await db.query(query, [ids]);
			
			return json({
				success: true,
				message: `${ids.length} armazém(ns) removido(s) com sucesso`
			});
		});
	} catch (error) {
		console.error('Erro ao remover armazéns:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 