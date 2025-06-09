import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar configurações de frete por seller
export const GET: RequestHandler = async ({ url }) => {
	try {
		const db = getDatabase();
		
		// Parâmetros de query
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');
		const offset = (page - 1) * limit;
		
		// Buscar configurações básicas (sem JOINs)
		const basicConfigsResult = await db.query(`
			SELECT * FROM seller_shipping_configs 
			ORDER BY created_at DESC
			LIMIT $1 OFFSET $2
		`, [limit, offset]);
		
		const totalResult = await db.query('SELECT COUNT(*) as count FROM seller_shipping_configs');
		const total = parseInt(totalResult[0].count);
		
		// Enriquecer dados buscando sellers e carriers separadamente
		const configs = [];
		
		for (const config of basicConfigsResult) {
			// Buscar dados do seller
			let sellerName = 'N/A';
			let sellerEmail = 'N/A';
			
			try {
				const sellerResult = await db.query(
					'SELECT name, email FROM users WHERE id = $1', 
					[config.seller_id]
				);
				if (sellerResult[0]) {
					sellerName = sellerResult[0].name || 'N/A';
					sellerEmail = sellerResult[0].email || 'N/A';
				}
			} catch (e) {
				console.log(`Erro ao buscar seller ${config.seller_id}:`, e);
			}
			
			// Buscar dados do carrier
			let carrierName = 'N/A';
			let carrierType = 'N/A';
			let carrierIsActive = false;
			
			try {
				const carrierResult = await db.query(
					'SELECT name, type, is_active FROM shipping_carriers WHERE id = $1',
					[config.carrier_id]
				);
				if (carrierResult[0]) {
					carrierName = carrierResult[0].name || 'N/A';
					carrierType = carrierResult[0].type || 'N/A';
					carrierIsActive = carrierResult[0].is_active || false;
				}
			} catch (e) {
				console.log(`Erro ao buscar carrier ${config.carrier_id}:`, e);
			}
			
			configs.push({
				...config,
				seller_name: sellerName,
				seller_email: sellerEmail,
				carrier_name: carrierName,
				carrier_type: carrierType,
				carrier_is_active: carrierIsActive,
				available_rates: 0
			});
		}
		
		// Estatísticas reais
		const statsResult = await db.query(`
			SELECT 
				COUNT(*) as total_configs,
				COUNT(CASE WHEN is_active = true THEN 1 END) as active_configs,
				COUNT(DISTINCT seller_id) as unique_sellers,
				COUNT(DISTINCT carrier_id) as unique_carriers,
				COALESCE(AVG(markup_percentage), 0) as avg_markup,
				COALESCE(AVG(free_shipping_threshold), 0) as avg_free_threshold,
				COALESCE(AVG(priority), 0) as avg_priority
			FROM seller_shipping_configs
		`);
		
		const stats = statsResult[0] || {
			total_configs: '0',
			active_configs: '0', 
			unique_sellers: '0',
			unique_carriers: '0',
			avg_markup: '0',
			avg_free_threshold: '0',
			avg_priority: '0'
		};
		
		// Filtros simplificados
		const sellers: any[] = [];
		const carriers: any[] = [];
		
		return json({
			success: true,
			data: {
				configs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit)
				},
				stats: {
					totalConfigs: parseInt(stats?.total_configs || '0'),
					activeConfigs: parseInt(stats?.active_configs || '0'),
					uniqueSellers: parseInt(stats?.unique_sellers || '0'),
					uniqueCarriers: parseInt(stats?.unique_carriers || '0'),
					avgMarkup: parseFloat(stats?.avg_markup || '0'),
					avgFreeThreshold: parseFloat(stats?.avg_free_threshold || '0'),
					avgPriority: parseFloat(stats?.avg_priority || '0')
				},
				filters: {
					sellers,
					carriers
				}
			}
		});
		
	} catch (error) {
		console.error('Erro ao buscar configurações de frete:', error);
		if (error instanceof Error) {
			console.error('Error details:', error.message);
			console.error('Stack trace:', error.stack);
		}
		
		// Fallback em caso de erro
		return json({
			success: true,
			data: {
				configs: [],
				pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
				stats: { totalConfigs: 0, activeConfigs: 0, uniqueSellers: 0, uniqueCarriers: 0, avgMarkup: 0, avgFreeThreshold: 0, avgPriority: 0 },
				filters: { sellers: [], carriers: [] }
			},
			source: 'fallback'
		});
	}
};

// POST - Criar nova configuração de frete
export const POST: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		// Validação básica
		if (!data.seller_id || !data.carrier_id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Seller e transportadora são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Verificar se seller existe e é válido
		const sellerQuery = 'SELECT id, role FROM users WHERE id = $1 AND role = $2';
		const sellerResult = await db.query(sellerQuery, [data.seller_id, 'seller']);
		
		if (sellerResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Seller não encontrado ou inválido'
				}
			}, { status: 400 });
		}
		
		// Verificar se transportadora existe e está ativa
		const carrierQuery = 'SELECT id, is_active FROM shipping_carriers WHERE id = $1';
		const carrierResult = await db.query(carrierQuery, [data.carrier_id]);
		
		if (carrierResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Transportadora não encontrada'
				}
			}, { status: 400 });
		}
		
		// Verificar se já existe configuração para este seller + carrier
		const existsQuery = 'SELECT id FROM seller_shipping_configs WHERE seller_id = $1 AND carrier_id = $2';
		const existsResult = await db.query(existsQuery, [data.seller_id, data.carrier_id]);
		
		if (existsResult.length > 0) {
			return json({
				success: false,
				error: {
					code: 'CONFLICT_ERROR',
					message: 'Já existe configuração para este seller e transportadora'
				}
			}, { status: 409 });
		}
		
		// Inserir nova configuração
		const insertQuery = `
			INSERT INTO seller_shipping_configs (
				seller_id, carrier_id, markup_percentage, free_shipping_threshold,
				priority, is_active
			) VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING *
		`;
		
		const result = await db.query(insertQuery, [
			data.seller_id,
			data.carrier_id,
			data.markup_percentage || 0,
			data.free_shipping_threshold || null,
			data.priority || 1,
			data.is_active !== false // default true
		]);
		
		const config = result[0];
		
		return json({
			success: true,
			data: { config },
			message: 'Configuração de frete criada com sucesso!'
		}, { status: 201 });
		
	} catch (error) {
		console.error('Erro ao criar configuração de frete:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// PUT - Atualizar configuração de frete
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.id) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'ID da configuração é obrigatório'
				}
			}, { status: 400 });
		}
		
		// Verificar se a configuração existe
		const existsQuery = 'SELECT * FROM seller_shipping_configs WHERE id = $1';
		const existsResult = await db.query(existsQuery, [data.id]);
		
		if (existsResult.length === 0) {
			return json({
				success: false,
				error: {
					code: 'NOT_FOUND',
					message: 'Configuração de frete não encontrada'
				}
			}, { status: 404 });
		}
		
		// Se mudou seller ou carrier, verificar conflitos
		if (data.seller_id || data.carrier_id) {
			const existing = existsResult[0];
			const newSellerId = data.seller_id || existing.seller_id;
			const newCarrierId = data.carrier_id || existing.carrier_id;
			
			const conflictQuery = `
				SELECT id FROM seller_shipping_configs 
				WHERE seller_id = $1 AND carrier_id = $2 AND id != $3
			`;
			
			const conflictResult = await db.query(conflictQuery, [newSellerId, newCarrierId, data.id]);
			
			if (conflictResult.length > 0) {
				return json({
					success: false,
					error: {
						code: 'CONFLICT_ERROR',
						message: 'Já existe configuração para este seller e transportadora'
					}
				}, { status: 409 });
			}
		}
		
		// Atualizar configuração
		const updateQuery = `
			UPDATE seller_shipping_configs SET
				seller_id = COALESCE($2, seller_id),
				carrier_id = COALESCE($3, carrier_id),
				markup_percentage = COALESCE($4, markup_percentage),
				free_shipping_threshold = COALESCE($5, free_shipping_threshold),
				priority = COALESCE($6, priority),
				is_active = COALESCE($7, is_active)
			WHERE id = $1
			RETURNING *
		`;
		
		const result = await db.query(updateQuery, [
			data.id,
			data.seller_id,
			data.carrier_id,
			data.markup_percentage,
			data.free_shipping_threshold,
			data.priority,
			data.is_active
		]);
		
		const config = result[0];
		
		return json({
			success: true,
			data: { config },
			message: 'Configuração de frete atualizada com sucesso!'
		});
		
	} catch (error) {
		console.error('Erro ao atualizar configuração de frete:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

// DELETE - Excluir configurações de frete
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const db = getDatabase();
		const data = await request.json();
		
		if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
			return json({
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'IDs das configurações são obrigatórios'
				}
			}, { status: 400 });
		}
		
		// Excluir configurações
		const deleteQuery = `
			DELETE FROM seller_shipping_configs 
			WHERE id = ANY($1) 
			RETURNING id, seller_id, carrier_id
		`;
		const result = await db.query(deleteQuery, [data.ids]);
		
		const deletedConfigs = result;
		
		return json({
			success: true,
			data: { deletedConfigs },
			message: `${deletedConfigs.length} configuração(ões) de frete excluída(s) com sucesso!`
		});
		
	} catch (error) {
		console.error('Erro ao excluir configurações de frete:', error);
		return json({
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
}; 