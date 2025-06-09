import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Listar movimentações de estoque
export async function GET({ url, platform }) {
	try {
		const productId = url.searchParams.get('product_id');
		const warehouseId = url.searchParams.get('warehouse_id');
		const movementType = url.searchParams.get('movement_type');
		const startDate = url.searchParams.get('start_date');
		const endDate = url.searchParams.get('end_date');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const offset = (page - 1) * limit;

		return await withDatabase(platform, async (db) => {
			let whereConditions = [];
			let params: any[] = [];
			let paramIndex = 1;

			// Filtros dinâmicos
			if (productId) {
				whereConditions.push(`sm.product_id = $${paramIndex}`);
				params.push(productId);
				paramIndex++;
			}

			if (warehouseId) {
				whereConditions.push(`sm.warehouse_id = $${paramIndex}`);
				params.push(warehouseId);
				paramIndex++;
			}

			if (movementType) {
				whereConditions.push(`sm.movement_type = $${paramIndex}`);
				params.push(movementType);
				paramIndex++;
			}

			if (startDate) {
				whereConditions.push(`sm.created_at >= $${paramIndex}`);
				params.push(startDate);
				paramIndex++;
			}

			if (endDate) {
				whereConditions.push(`sm.created_at <= $${paramIndex}`);
				params.push(endDate);
				paramIndex++;
			}

			const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

			// Query principal
			const query = `
				SELECT 
					sm.id,
					sm.product_id,
					sm.warehouse_id,
					sm.movement_type,
					sm.quantity_before,
					sm.quantity_change,
					sm.quantity_after,
					sm.unit_cost,
					sm.total_cost,
					sm.reference_type,
					sm.reference_id,
					sm.user_id,
					sm.notes,
					sm.created_at,
					p.name as product_name,
					p.sku as product_sku,
					w.name as warehouse_name,
					w.code as warehouse_code,
					u.name as user_name
				FROM stock_movements sm
				LEFT JOIN products p ON p.id = sm.product_id
				LEFT JOIN warehouses w ON w.id = sm.warehouse_id
				LEFT JOIN users u ON u.id = sm.user_id
				${whereClause}
				ORDER BY sm.created_at DESC
				LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
			`;

			params.push(limit, offset);
			const movements = await db.query(query, params);

			// Query para total de registros
			const countQuery = `
				SELECT COUNT(*) as total
				FROM stock_movements sm
				${whereClause}
			`;
			const countParams = params.slice(0, -2); // Remove limit e offset
			const countResult = await db.query(countQuery, countParams);
			const total = parseInt(countResult[0]?.total || '0');

			// Estatísticas resumidas
			const statsQuery = `
				SELECT 
					movement_type,
					COUNT(*) as count,
					SUM(ABS(quantity_change)) as total_quantity,
					SUM(COALESCE(total_cost, 0)) as total_value
				FROM stock_movements sm
				${whereClause}
				GROUP BY movement_type
				ORDER BY movement_type
			`;
			const stats = await db.query(statsQuery, countParams);

			return json({
				success: true,
				data: {
					movements,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit)
					},
					stats
				}
			});
		});
	} catch (error) {
		console.error('Erro ao buscar movimentações:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Registrar nova movimentação de estoque
export async function POST({ request, platform }) {
	try {
		const {
			product_id,
			warehouse_id,
			movement_type,
			quantity_change,
			unit_cost,
			reference_type,
			reference_id,
			user_id,
			notes
		} = await request.json();

		// Validações
		if (!product_id || !movement_type || !quantity_change) {
			return json({
				success: false,
				error: 'Campos obrigatórios: product_id, movement_type, quantity_change'
			}, { status: 400 });
		}

		const validMovementTypes = ['purchase', 'sale', 'adjustment', 'transfer', 'return', 'loss', 'found'];
		if (!validMovementTypes.includes(movement_type)) {
			return json({
				success: false,
				error: 'Tipo de movimentação inválido'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			// Buscar estoque atual
			let currentQuantity = 0;
			if (warehouse_id) {
				const stockQuery = `SELECT quantity FROM product_stocks WHERE product_id = $1 AND warehouse_id = $2`;
				const stockResult = await db.query(stockQuery, [product_id, warehouse_id]);
				currentQuantity = stockResult[0]?.quantity || 0;
			} else {
				// Se não especificou warehouse, usar estoque principal do produto
				const productQuery = `SELECT stock_quantity FROM products WHERE id = $1`;
				const productResult = await db.query(productQuery, [product_id]);
				currentQuantity = productResult[0]?.stock_quantity || 0;
			}

			const quantityBefore = currentQuantity;
			const quantityAfter = currentQuantity + quantity_change;

			// Validar se quantidade final não fica negativa (exceto para ajustes)
			if (quantityAfter < 0 && movement_type !== 'adjustment') {
				return json({
					success: false,
					error: `Estoque insuficiente. Disponível: ${currentQuantity}, solicitado: ${Math.abs(quantity_change)}`
				}, { status: 400 });
			}

			// Iniciar transação
			await db.query('BEGIN');

			try {
				// 1. Registrar a movimentação
				const movementQuery = `
					INSERT INTO stock_movements (
						product_id, warehouse_id, movement_type, quantity_before, 
						quantity_change, quantity_after, unit_cost, reference_type, 
						reference_id, user_id, notes
					)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
					RETURNING *
				`;

				const movement = await db.query(movementQuery, [
					product_id, warehouse_id, movement_type, quantityBefore,
					quantity_change, quantityAfter, unit_cost, reference_type,
					reference_id, user_id, notes
				]);

				// 2. Atualizar estoque do produto
				if (warehouse_id) {
					// Atualizar estoque do armazém específico (available_quantity é calculada automaticamente)
					const updateStockQuery = `
						UPDATE product_stocks 
						SET quantity = $3,
						    last_updated = NOW()
						WHERE product_id = $1 AND warehouse_id = $2
					`;
					await db.query(updateStockQuery, [product_id, warehouse_id, quantityAfter]);
				} else {
					// Atualizar estoque principal do produto
					const updateProductQuery = `
						UPDATE products 
						SET stock_quantity = $2,
						    updated_at = NOW()
						WHERE id = $1
					`;
					await db.query(updateProductQuery, [product_id, quantityAfter]);
				}

				await db.query('COMMIT');

				return json({
					success: true,
					data: movement[0],
					message: 'Movimentação registrada com sucesso'
				});

			} catch (error) {
				await db.query('ROLLBACK');
				throw error;
			}
		});
	} catch (error) {
		console.error('Erro ao registrar movimentação:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 