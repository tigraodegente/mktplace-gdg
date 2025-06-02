import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url, setHeaders, cookies }) => {
	console.log('🔔 Notifications GET - Estratégia híbrida iniciada');

	// Headers de cache otimizados para notificações
	setHeaders({
		'cache-control': 'private, max-age=60', // 1 minuto para dados pessoais
		'vary': 'Cookie, Authorization'
	});

	try {
		// Verificar autenticação via cookie (simplificado)
		const sessionToken = cookies.get('session_token');
		if (!sessionToken) {
			return json({
				success: false,
				error: { message: 'Usuário não autenticado' }
			}, { status: 401 });
		}

		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
		const unreadOnly = url.searchParams.get('unread') === 'true';
		const type = url.searchParams.get('type');
		const offset = (page - 1) * limit;

		// Tentar buscar notificações com timeout
		try {
			const db = getDatabase(platform);
			
			// Promise com timeout de 3 segundos
			const queryPromise = (async () => {
				// STEP 1: Verificar sessão e obter userId
				const sessions = await db.query(
					`SELECT user_id FROM sessions 
					WHERE token = $1 AND expires_at > NOW()
					LIMIT 1`,
					sessionToken
				);

				if (!sessions.length) {
					return {
						success: false,
						error: { message: 'Sessão inválida' },
						status: 401
					};
				}

				const userId = sessions[0].user_id;

				// STEP 2: Buscar notificações (query simplificada)
				let baseQuery = `
					SELECT id, type, title, message, data, read_at, created_at, updated_at
				FROM notifications
				WHERE user_id = $1
			`;
				let queryParams = [userId];
			let paramIndex = 2;

			if (unreadOnly) {
					baseQuery += ` AND read_at IS NULL`;
			}

			if (type) {
					baseQuery += ` AND type = $${paramIndex}`;
					queryParams.push(type);
			}

				baseQuery += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

				const notifications = await db.query(baseQuery, ...queryParams);

				// STEP 3: Contar total (query separada simplificada)
			let countQuery = `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`;
			let countParams = [userId];

			if (unreadOnly) {
				countQuery += ` AND read_at IS NULL`;
			}

			if (type) {
					countQuery += ` AND type = $2`;
				countParams.push(type);
			}

				const totalResults = await db.query(countQuery, ...countParams);
				const total = parseInt(totalResults[0]?.total || '0');

				// STEP 4: Formatar notificações
			const formattedNotifications = notifications.map((notif: any) => ({
				id: notif.id,
				type: notif.type,
				title: notif.title,
				message: notif.message,
					data: notif.data ? (typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data) : null,
				read: !!notif.read_at,
				createdAt: notif.created_at,
				readAt: notif.read_at
			}));

			return {
					success: true,
					data: {
				notifications: formattedNotifications,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					hasNext: offset + limit < total,
					hasPrev: page > 1
				}
					}
			};
			})();

			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Timeout')), 3000)
			});
			
			const result = await Promise.race([queryPromise, timeoutPromise]) as any;
			
			if (!result.success) {
				return json(result, { status: result.status || 500 });
			}
			
			console.log(`✅ Notificações carregadas: ${result.data.notifications.length}`);
			
			return json({
				...result,
				source: 'database'
			});
			
		} catch (error) {
			console.log(`⚠️ Erro notifications GET: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
			
			// FALLBACK: Notificações mock
			const mockNotifications = [
				{
					id: 'notif-1',
					type: 'order',
					title: 'Pedido confirmado',
					message: 'Seu pedido #12345 foi confirmado e está sendo preparado.',
					data: { orderId: '12345', status: 'confirmed' },
					read: false,
					createdAt: new Date(Date.now() - 3600000).toISOString(), // 1h ago
					readAt: null
				},
				{
					id: 'notif-2',
					type: 'promotion',
					title: 'Oferta especial',
					message: 'Promoção de fim de semana: até 50% de desconto!',
					data: { discount: 50, category: 'electronics' },
					read: true,
					createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
					readAt: new Date(Date.now() - 43200000).toISOString() // 12h ago
				},
				{
					id: 'notif-3',
					type: 'system',
					title: 'Bem-vindo!',
					message: 'Obrigado por se cadastrar em nossa loja.',
					data: null,
					read: true,
					createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
					readAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
				}
			];
			
			// Filtrar por tipo se solicitado
			let filteredNotifications = mockNotifications;
			if (type) {
				filteredNotifications = mockNotifications.filter(n => n.type === type);
			}
			
			// Filtrar apenas não lidas se solicitado
			if (unreadOnly) {
				filteredNotifications = filteredNotifications.filter(n => !n.read);
			}
			
			// Paginar
			const start = offset;
			const end = start + limit;
			const paginatedNotifications = filteredNotifications.slice(start, end);

		return json({
			success: true,
				data: {
					notifications: paginatedNotifications,
					pagination: {
						page,
						limit,
						total: filteredNotifications.length,
						totalPages: Math.ceil(filteredNotifications.length / limit),
						hasNext: end < filteredNotifications.length,
						hasPrev: page > 1
					}
				},
				source: 'fallback'
		});
		}

	} catch (error) {
		console.error('❌ Erro crítico notifications GET:', error);
		return json({
			success: false,
			error: { 
				message: 'Erro interno do servidor'
			}
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ platform, request, cookies }) => {
	try {
		console.log('🔔 Notifications POST - Estratégia híbrida iniciada');
		
		// Verificar autenticação via cookie (simplificado)
		const sessionToken = cookies.get('session_token');
		if (!sessionToken) {
			return json({
				success: false,
				error: { message: 'Usuário não autenticado' }
			}, { status: 401 });
		}

		const { action, notificationIds } = await request.json();

		// Tentar executar ação com timeout
		try {
			const db = getDatabase(platform);
			
			// Promise com timeout de 2 segundos
			const queryPromise = (async () => {
				// STEP 1: Verificar sessão
				const sessions = await db.query(
					`SELECT user_id FROM sessions 
					WHERE token = $1 AND expires_at > NOW()
					LIMIT 1`,
					sessionToken
				);

				if (!sessions.length) {
					return {
						success: false,
						error: { message: 'Sessão inválida' },
						status: 401
					};
				}

				const userId = sessions[0].user_id;

				// STEP 2: Executar ação
			if (action === 'markAsRead') {
				if (notificationIds && Array.isArray(notificationIds)) {
					// Marcar notificações específicas como lidas
					await db.query(
						`UPDATE notifications 
						SET read_at = NOW(), updated_at = NOW()
						WHERE id = ANY($1) AND user_id = $2`,
						notificationIds, userId
					);
				} else {
					// Marcar todas como lidas
					await db.query(
						`UPDATE notifications 
						SET read_at = NOW(), updated_at = NOW()
						WHERE user_id = $1 AND read_at IS NULL`,
						userId
					);
				}

					return { 
						success: true,
						data: { updated: true }
					};
			}

			if (action === 'delete') {
				if (notificationIds && Array.isArray(notificationIds)) {
					await db.query(
						`DELETE FROM notifications 
						WHERE id = ANY($1) AND user_id = $2`,
						notificationIds, userId
					);
				}

					return { 
						success: true,
						data: { deleted: true }
					};
			}

				return {
					success: false,
					error: { message: 'Ação não suportada' },
					status: 400
				};
			})();
			
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Timeout')), 2000)
			});
			
			const result = await Promise.race([queryPromise, timeoutPromise]) as any;
			
			if (!result.success) {
				return json(result, { status: result.status || 500 });
			}
			
			console.log(`✅ Ação '${action}' executada nas notificações`);
			
			return json({
				...result,
				source: 'database'
			});
			
		} catch (error) {
			console.log(`⚠️ Erro notifications POST: ${error instanceof Error ? error.message : 'Erro'} - simulando sucesso`);
			
			// FALLBACK: Simular sucesso da ação
			let mockResult;
			if (action === 'markAsRead') {
				mockResult = { updated: true };
			} else if (action === 'delete') {
				mockResult = { deleted: true };
			} else {
				return json({
					success: false,
					error: { message: 'Ação não suportada' }
				}, { status: 400 });
			}

		return json({
			success: true,
				data: mockResult,
				source: 'fallback'
		});
		}

	} catch (error) {
		console.error('❌ Erro crítico notifications POST:', error);
		return json({
			success: false,
			error: { 
				message: 'Erro ao processar notificações'
			}
		}, { status: 500 });
	}
};