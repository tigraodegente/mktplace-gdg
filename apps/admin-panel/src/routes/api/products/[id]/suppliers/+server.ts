import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Buscar fornecedores de um produto específico
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
					ps.supplier_id,
					ps.supplier_sku,
					ps.cost,
					ps.currency,
					ps.lead_time_days,
					ps.minimum_order_quantity,
					ps.is_primary,
					ps.is_active,
					ps.notes,
					ps.created_at,
					ps.updated_at,
					s.name as supplier_name,
					s.email as supplier_email,
					s.phone as supplier_phone
				FROM product_suppliers ps
				LEFT JOIN suppliers s ON s.id = ps.supplier_id
				WHERE ps.product_id = $1
				ORDER BY ps.is_primary DESC, ps.cost ASC
			`;
			
			const suppliers = await db.query(query, [productId]);
			
			return json({
				success: true,
				data: suppliers
			});
		});
	} catch (error) {
		console.error('Erro ao buscar fornecedores do produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Adicionar fornecedor ao produto
export async function POST({ params, request, platform }) {
	try {
		const { id: productId } = params;
		const {
			supplier_id,
			supplier_name,
			supplier_sku,
			cost,
			currency = 'BRL',
			lead_time_days,
			minimum_order_quantity = 1,
			is_primary = false,
			notes
		} = await request.json();

		if (!productId) {
			return json({
				success: false,
				error: 'ID do produto é obrigatório'
			}, { status: 400 });
		}

		if (!supplier_name || !cost) {
			return json({
				success: false,
				error: 'Nome do fornecedor e custo são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			// Se é o fornecedor primário, remover flag dos outros
			if (is_primary) {
				await db.query(`
					UPDATE product_suppliers 
					SET is_primary = false 
					WHERE product_id = $1
				`, [productId]);
			}

			const insertQuery = `
				INSERT INTO product_suppliers (
					product_id, supplier_id, supplier_name, supplier_sku,
					cost, currency, lead_time_days, minimum_order_quantity,
					is_primary, notes
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
				RETURNING *
			`;
			
			const result = await db.query(insertQuery, [
				productId, supplier_id, supplier_name, supplier_sku,
				cost, currency, lead_time_days, minimum_order_quantity,
				is_primary, notes
			]);
			
			return json({
				success: true,
				data: result[0],
				message: 'Fornecedor adicionado ao produto com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao adicionar fornecedor ao produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Atualizar fornecedor do produto
export async function PUT({ params, request, platform }) {
	try {
		const { id: productId } = params;
		const {
			supplier_id,
			supplier_name,
			supplier_sku,
			cost,
			currency,
			lead_time_days,
			minimum_order_quantity,
			is_primary,
			notes
		} = await request.json();

		if (!productId || !supplier_id) {
			return json({
				success: false,
				error: 'ID do produto e ID do fornecedor são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			// Se é o fornecedor primário, remover flag dos outros
			if (is_primary) {
				await db.query(`
					UPDATE product_suppliers 
					SET is_primary = false 
					WHERE product_id = $1 AND supplier_id != $2
				`, [productId, supplier_id]);
			}

			const updateQuery = `
				UPDATE product_suppliers 
				SET supplier_name = $3, supplier_sku = $4, cost = $5, 
				    currency = $6, lead_time_days = $7, minimum_order_quantity = $8,
				    is_primary = $9, notes = $10, updated_at = NOW()
				WHERE product_id = $1 AND supplier_id = $2
				RETURNING *
			`;
			
			const result = await db.query(updateQuery, [
				productId, supplier_id, supplier_name, supplier_sku, cost,
				currency, lead_time_days, minimum_order_quantity, is_primary, notes
			]);
			
			if (!result[0]) {
				return json({
					success: false,
					error: 'Fornecedor não encontrado para este produto'
				}, { status: 404 });
			}
			
			return json({
				success: true,
				data: result[0],
				message: 'Fornecedor do produto atualizado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar fornecedor do produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover fornecedor do produto
export async function DELETE({ params, url, platform }) {
	try {
		const { id: productId } = params;
		const supplierId = url.searchParams.get('supplierId');

		if (!productId || !supplierId) {
			return json({
				success: false,
				error: 'ID do produto e ID do fornecedor são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				DELETE FROM product_suppliers 
				WHERE product_id = $1 AND supplier_id = $2
			`;
			
			await db.query(query, [productId, supplierId]);
			
			return json({
				success: true,
				message: 'Fornecedor removido do produto com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao remover fornecedor do produto:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 