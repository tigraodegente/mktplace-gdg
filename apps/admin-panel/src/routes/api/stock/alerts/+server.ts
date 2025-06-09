import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

// GET - Listar alertas de estoque
export async function GET({ url, platform }) {
	try {
		const isActive = url.searchParams.get('active') === 'true';
		const alertType = url.searchParams.get('type');
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = (page - 1) * limit;

		return await withDatabase(platform, async (db) => {
			let whereConditions = [];
			let params: any[] = [];
			let paramIndex = 1;

			if (isActive) {
				whereConditions.push(`sa.is_active = $${paramIndex}`);
				params.push(true);
				paramIndex++;
			}

			if (alertType) {
				whereConditions.push(`sa.alert_type = $${paramIndex}`);
				params.push(alertType);
				paramIndex++;
			}

			const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

			// Query principal
			const query = `
				SELECT 
					sa.id,
					sa.product_id,
					sa.warehouse_id,
					sa.alert_type,
					sa.threshold_value,
					sa.current_value,
					sa.is_active,
					sa.last_sent_at,
					sa.resolved_at,
					sa.created_at,
					p.name as product_name,
					p.sku as product_sku,
					p.price as product_price,
					w.name as warehouse_name,
					w.code as warehouse_code,
					-- Calcular prioridade do alerta
					CASE 
						WHEN sa.alert_type = 'out_of_stock' THEN 'critical'
						WHEN sa.alert_type = 'low_stock' AND sa.current_value <= (sa.threshold_value * 0.5) THEN 'high'
						WHEN sa.alert_type = 'low_stock' THEN 'medium'
						ELSE 'low'
					END as priority,
					-- Calcular dias desde criação
					EXTRACT(days FROM NOW() - sa.created_at) as days_since_created
				FROM stock_alerts sa
				LEFT JOIN products p ON p.id = sa.product_id
				LEFT JOIN warehouses w ON w.id = sa.warehouse_id
				${whereClause}
				ORDER BY 
					CASE sa.alert_type 
						WHEN 'out_of_stock' THEN 1 
						WHEN 'low_stock' THEN 2 
						ELSE 3 
					END,
					sa.created_at DESC
				LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
			`;

			params.push(limit, offset);
			const alerts = await db.query(query, params);

			// Contar total
			const countQuery = `SELECT COUNT(*) as total FROM stock_alerts sa ${whereClause}`;
			const countParams = params.slice(0, -2);
			const countResult = await db.query(countQuery, countParams);
			const total = parseInt(countResult[0]?.total || '0');

			// Estatísticas por tipo
			const statsQuery = `
				SELECT 
					alert_type,
					COUNT(*) as count,
					COUNT(*) FILTER (WHERE is_active = true) as active_count,
					COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_count
				FROM stock_alerts
				GROUP BY alert_type
				ORDER BY alert_type
			`;
			const stats = await db.query(statsQuery);

			// Resumo geral
			const summaryQuery = `
				SELECT 
					COUNT(*) as total_alerts,
					COUNT(*) FILTER (WHERE is_active = true) as active_alerts,
					COUNT(*) FILTER (WHERE alert_type = 'out_of_stock' AND is_active = true) as out_of_stock,
					COUNT(*) FILTER (WHERE alert_type = 'low_stock' AND is_active = true) as low_stock,
					COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as alerts_today
				FROM stock_alerts
			`;
			const summary = await db.query(summaryQuery);

			return json({
				success: true,
				data: {
					alerts,
					pagination: {
						page,
						limit,
						total,
						totalPages: Math.ceil(total / limit)
					},
					stats,
					summary: summary[0]
				}
			});
		});
	} catch (error) {
		console.error('Erro ao buscar alertas:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// POST - Criar alerta manual
export async function POST({ request, platform }) {
	try {
		const {
			product_id,
			warehouse_id,
			alert_type,
			threshold_value,
			current_value
		} = await request.json();

		if (!product_id || !alert_type) {
			return json({
				success: false,
				error: 'Campos obrigatórios: product_id, alert_type'
			}, { status: 400 });
		}

		const validAlertTypes = ['low_stock', 'out_of_stock', 'overstock'];
		if (!validAlertTypes.includes(alert_type)) {
			return json({
				success: false,
				error: 'Tipo de alerta inválido'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			const query = `
				INSERT INTO stock_alerts (
					product_id, warehouse_id, alert_type, 
					threshold_value, current_value
				)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (product_id, warehouse_id, alert_type)
				DO UPDATE SET 
					threshold_value = EXCLUDED.threshold_value,
					current_value = EXCLUDED.current_value,
					is_active = true,
					resolved_at = NULL
				RETURNING *
			`;

			const result = await db.query(query, [
				product_id, warehouse_id, alert_type,
				threshold_value, current_value
			]);

			return json({
				success: true,
				data: result[0],
				message: 'Alerta criado com sucesso'
			});
		});
	} catch (error) {
		console.error('Erro ao criar alerta:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// PUT - Resolver alerta
export async function PUT({ request, platform }) {
	try {
		const { alert_ids, action } = await request.json();

		if (!alert_ids || !Array.isArray(alert_ids) || alert_ids.length === 0) {
			return json({
				success: false,
				error: 'IDs dos alertas são obrigatórios'
			}, { status: 400 });
		}

		return await withDatabase(platform, async (db) => {
			let query = '';
			let successMessage = '';

			if (action === 'resolve') {
				query = `
					UPDATE stock_alerts 
					SET is_active = false, resolved_at = NOW()
					WHERE id = ANY($1) AND is_active = true
					RETURNING id
				`;
				successMessage = 'Alertas resolvidos com sucesso';
			} else if (action === 'mark_sent') {
				query = `
					UPDATE stock_alerts 
					SET last_sent_at = NOW()
					WHERE id = ANY($1)
					RETURNING id
				`;
				successMessage = 'Alertas marcados como enviados';
			} else {
				return json({
					success: false,
					error: 'Ação inválida. Use "resolve" ou "mark_sent"'
				}, { status: 400 });
			}

			const result = await db.query(query, [alert_ids]);

			return json({
				success: true,
				data: {
					updated_count: result.length,
					updated_ids: result.map((r: any) => r.id)
				},
				message: successMessage
			});
		});
	} catch (error) {
		console.error('Erro ao atualizar alertas:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
}

// DELETE - Remover alertas resolvidos antigos
export async function DELETE({ url, platform }) {
	try {
		const daysOld = parseInt(url.searchParams.get('days_old') || '30');

		return await withDatabase(platform, async (db) => {
			const query = `
				DELETE FROM stock_alerts 
				WHERE is_active = false 
				AND resolved_at < NOW() - INTERVAL '${daysOld} days'
				RETURNING id
			`;

			const result = await db.query(query);

			return json({
				success: true,
				data: {
					deleted_count: result.length
				},
				message: `${result.length} alertas antigos removidos`
			});
		});
	} catch (error) {
		console.error('Erro ao remover alertas:', error);
		return json({
			success: false,
			error: 'Erro interno do servidor'
		}, { status: 500 });
	}
} 