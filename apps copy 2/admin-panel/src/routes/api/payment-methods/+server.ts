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
			whereClause = 'WHERE pm.name ILIKE $1 OR pm.code ILIKE $1 OR pm.description ILIKE $1';
			countQuery = `
				SELECT COUNT(*) as total 
				FROM payment_methods pm 
				${whereClause}
			`;
			searchParams = [`%${search}%`];
		} else {
			countQuery = 'SELECT COUNT(*) as total FROM payment_methods';
		}
		
		// Buscar total de registros
		const totalResult = await db.query(countQuery, searchParams);
		const total = parseInt(totalResult[0]?.total || '0');
		const totalPages = Math.ceil(total / limit);
		
		// Query principal com paginação
		const mainQuery = `
			SELECT pm.*
			FROM payment_methods pm
			${whereClause}
			ORDER BY pm.name ASC
			LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
		`;
		
		const params = [...searchParams, limit, offset];
		const paymentMethods = await db.query(mainQuery, params);
		
		return json({
			success: true,
			data: {
				paymentMethods,
				pagination: {
					currentPage: page,
					totalPages,
					total,
					limit,
					hasNext: page < totalPages,
					hasPrev: page > 1
				}
			}
		});
		
	} catch (error) {
		console.error('❌ Erro na query:', error);
		return json({
			success: false,
			error: 'Erro ao buscar métodos de pagamento'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		console.log('🔌 Dev: NEON');
		
		const db = getDatabase();
		const data = await request.json();
		
		// Validação
		if (!data.name || !data.code) {
			return json({
				success: false,
				error: 'Nome e código são obrigatórios'
			}, { status: 400 });
		}
		
		// Verificar se código já existe
		const existingMethod = await db.query(
			'SELECT id FROM payment_methods WHERE code = $1',
			[data.code]
		);
		
		if (existingMethod.length > 0) {
			return json({
				success: false,
				error: 'Código já existe'
			}, { status: 400 });
		}
		
		// Inserir novo método
		const result = await db.query(
			`INSERT INTO payment_methods (name, code, description, icon_url, is_active, fee_percentage, fee_fixed, min_amount, max_amount, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
			 RETURNING *`,
			[
				data.name,
				data.code,
				data.description || null,
				data.icon_url || null,
				data.is_active ?? true,
				data.fee_percentage || 0,
				data.fee_fixed || 0,
				data.min_amount || 0,
				data.max_amount || null
			]
		);
		
		return json({
			success: true,
			data: result[0],
			message: 'Método de pagamento criado com sucesso'
		});
		
	} catch (error) {
		console.error('❌ Erro ao criar método de pagamento:', error);
		return json({
			success: false,
			error: 'Erro ao criar método de pagamento'
		}, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		console.log('🔌 Dev: NEON');
		
		const db = getDatabase();
		const data = await request.json();
		
		// Validação
		if (!data.id || !data.name || !data.code) {
			return json({
				success: false,
				error: 'ID, nome e código são obrigatórios'
			}, { status: 400 });
		}
		
		// Verificar se método existe
		const existingMethod = await db.query(
			'SELECT id FROM payment_methods WHERE id = $1',
			[data.id]
		);
		
		if (existingMethod.length === 0) {
			return json({
				success: false,
				error: 'Método de pagamento não encontrado'
			}, { status: 404 });
		}
		
		// Verificar se código já existe (exceto para o próprio método)
		const codeCheck = await db.query(
			'SELECT id FROM payment_methods WHERE code = $1 AND id != $2',
			[data.code, data.id]
		);
		
		if (codeCheck.length > 0) {
			return json({
				success: false,
				error: 'Código já existe'
			}, { status: 400 });
		}
		
		// Atualizar método
		const result = await db.query(
			`UPDATE payment_methods 
			 SET name = $1, code = $2, description = $3, icon_url = $4, 
			     is_active = $5, fee_percentage = $6, fee_fixed = $7, 
			     min_amount = $8, max_amount = $9, updated_at = NOW()
			 WHERE id = $10
			 RETURNING *`,
			[
				data.name,
				data.code,
				data.description || null,
				data.icon_url || null,
				data.is_active ?? true,
				data.fee_percentage || 0,
				data.fee_fixed || 0,
				data.min_amount || 0,
				data.max_amount || null,
				data.id
			]
		);
		
		return json({
			success: true,
			data: result[0],
			message: 'Método de pagamento atualizado com sucesso'
		});
		
	} catch (error) {
		console.error('❌ Erro ao atualizar método de pagamento:', error);
		return json({
			success: false,
			error: 'Erro ao atualizar método de pagamento'
		}, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		console.log('🔌 Dev: NEON');
		
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.id) {
			return json({
				success: false,
				error: 'ID do método é obrigatório'
			}, { status: 400 });
		}
		
		// Verificar se método existe
		const existingMethod = await db.query(
			'SELECT id, name FROM payment_methods WHERE id = $1',
			[data.id]
		);
		
		if (existingMethod.length === 0) {
			return json({
				success: false,
				error: 'Método de pagamento não encontrado'
			}, { status: 404 });
		}
		
		// Verificar se há pedidos usando este método
		const ordersCount = await db.query(
			'SELECT COUNT(*) as count FROM orders WHERE payment_method_id = $1',
			[data.id]
		);
		
		if (parseInt(ordersCount[0]?.count || '0') > 0) {
			return json({
				success: false,
				error: 'Não é possível excluir método que possui pedidos associados'
			}, { status: 400 });
		}
		
		// Excluir método
		await db.query('DELETE FROM payment_methods WHERE id = $1', [data.id]);
		
		return json({
			success: true,
			message: `Método "${existingMethod[0].name}" excluído com sucesso`
		});
		
	} catch (error) {
		console.error('❌ Erro ao excluir método de pagamento:', error);
		return json({
			success: false,
			error: 'Erro ao excluir método de pagamento'
		}, { status: 500 });
	}
}; 