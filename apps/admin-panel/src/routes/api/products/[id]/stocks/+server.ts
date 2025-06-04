import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Buscar estoques de um produto específico
export async function GET({ params, platform }) {
	try {
		const { id: productId } = params;

		if (!productId) {
			return json({
				success: false,
				error: 'ID do produto é obrigatório'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				SELECT 
					ps.id,
					ps.warehouse_id,
					ps.quantity,
					ps.reserved_quantity,
					ps.available_quantity,
					ps.location,
					ps.low_stock_alert,
					ps.notes,
					ps.updated_at,
					ps.created_at,
					w.name as warehouse_name,
					w.code as warehouse_code,
					w.address as warehouse_address
				FROM product_stocks ps
				LEFT JOIN warehouses w ON w.id = ps.warehouse_id
				WHERE ps.product_id = $1
				ORDER BY w.name ASC, ps.location ASC
			`;
			
			const stocks = await db.query(query, [productId]);
			
			return json({
				success: true,
				data: stocks
			});
		});
	} catch (error) {
		console.error('Erro ao buscar estoques do produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Adicionar/atualizar estoque do produto
export async function POST({ params, request, platform }) {
	try {
		const { id: productId } = params;
		const {
			warehouse_id,
			quantity,
			reserved_quantity = 0,
			location,
			low_stock_alert = 10,
			notes
		} = await request.json();

		if (!productId || !warehouse_id) {
			return json({
				success: false,
				error: 'ID do produto e ID do armazém são obrigatórios'
			}, { status: 400 });
		}

		if (quantity === undefined || quantity < 0) {
			return json({
				success: false,
				error: 'Quantidade deve ser um número positivo'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			// Verificar se já existe estoque para este produto/armazém
			const existingQuery = `
				SELECT id FROM product_stocks 
				WHERE product_id = $1 AND warehouse_id = $2
			`;
			const existing = await db.query(existingQuery, [productId, warehouse_id]);

			let result;
			const available_quantity = quantity - reserved_quantity;

			if (existing.length > 0) {
				// Atualizar estoque existente
				const updateQuery = `
					UPDATE product_stocks 
					SET quantity = $3, reserved_quantity = $4, available_quantity = $5,
					    location = $6, low_stock_alert = $7, notes = $8, 
					    updated_at = NOW()
					WHERE product_id = $1 AND warehouse_id = $2
					RETURNING *
				`;
				
				result = await db.query(updateQuery, [
					productId, warehouse_id, quantity, reserved_quantity, 
					available_quantity, location, low_stock_alert, notes
				]);
			} else {
				// Criar novo registro de estoque
				const insertQuery = `
					INSERT INTO product_stocks (
						product_id, warehouse_id, quantity, reserved_quantity, 
						available_quantity, location, low_stock_alert, notes
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
					RETURNING *
				`;
				
				result = await db.query(insertQuery, [
					productId, warehouse_id, quantity, reserved_quantity,
					available_quantity, location, low_stock_alert, notes
				]);
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Estoque atualizado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar estoque do produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Atualizar estoque específico
export async function PUT({ params, request, platform }) {
	try {
		const { id: productId } = params;
		const {
			warehouse_id,
			quantity,
			reserved_quantity,
			location,
			low_stock_alert,
			notes
		} = await request.json();

		if (!productId || !warehouse_id) {
			return json({
				success: false,
				error: 'ID do produto e ID do armazém são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const available_quantity = quantity - (reserved_quantity || 0);
			
			const updateQuery = `
				UPDATE product_stocks 
				SET quantity = $3, reserved_quantity = $4, available_quantity = $5,
				    location = $6, low_stock_alert = $7, notes = $8, 
				    updated_at = NOW()
				WHERE product_id = $1 AND warehouse_id = $2
				RETURNING *
			`;
			
			const result = await db.query(updateQuery, [
				productId, warehouse_id, quantity, reserved_quantity || 0,
				available_quantity, location, low_stock_alert, notes
			]);
			
			if (!result[0]) {
				return json({
					success: false,
					error: 'Estoque não encontrado'
				}, { status: 404 });
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Estoque atualizado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar estoque:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover estoque de um armazém
export async function DELETE({ params, url, platform }) {
	try {
		const { id: productId } = params;
		const warehouseId = url.searchParams.get('warehouseId');

		if (!productId || !warehouseId) {
			return json({
				success: false,
				error: 'ID do produto e ID do armazém são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				DELETE FROM product_stocks 
				WHERE product_id = $1 AND warehouse_id = $2
			`;
			
			await db.query(query, [productId, warehouseId]);
			
			return json({
				success: true,
				message: 'Estoque removido do armazém com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao remover estoque:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 