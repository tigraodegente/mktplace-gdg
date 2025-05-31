import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url, setHeaders }) => {
	// Headers de cache otimizados para notificações
	setHeaders({
		'cache-control': 'private, max-age=60', // 1 minuto para dados pessoais
		'vary': 'Cookie, Authorization'
	});

	try {
		// Verificar autenticação
		const userId = await getUserFromRequest(platform, url);
		if (!userId) {
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

		const result = await withDatabase(platform, async (db) => {
			// Construir query dinamicamente baseada nos filtros
			let query = `
				SELECT 
					id,
					type,
					title,
					message,
					data,
					read_at,
					created_at,
					updated_at
				FROM notifications
				WHERE user_id = $1
			`;
			let params: any[] = [userId];
			let paramIndex = 2;

			if (unreadOnly) {
				query += ` AND read_at IS NULL`;
			}

			if (type) {
				query += ` AND type = $${paramIndex}`;
				params.push(type);
				paramIndex++;
			}

			query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

			// Buscar notificações
			const notifications = await db.query(query, params);

			// Contar total
			let countQuery = `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`;
			let countParams = [userId];
			let countIndex = 2;

			if (unreadOnly) {
				countQuery += ` AND read_at IS NULL`;
			}

			if (type) {
				countQuery += ` AND type = $${countIndex}`;
				countParams.push(type);
			}

			const totalResult = await db.query(countQuery, countParams);
			const total = parseInt(totalResult[0]?.total || '0');

			// Formatar notificações
			const formattedNotifications = notifications.map((notif: any) => ({
				id: notif.id,
				type: notif.type,
				title: notif.title,
				message: notif.message,
				data: notif.data ? JSON.parse(notif.data) : null,
				read: !!notif.read_at,
				createdAt: notif.created_at,
				readAt: notif.read_at
			}));

			return {
				notifications: formattedNotifications,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					hasNext: offset + limit < total,
					hasPrev: page > 1
				}
			};
		});

		console.log(`✅ Notificações carregadas: ${result.notifications.length} para usuário ${userId}`);

		return json({
			success: true,
			data: result
		});

	} catch (error) {
		console.error('❌ Erro ao buscar notificações:', error);
		return json({
			success: false,
			error: { 
				message: 'Erro interno do servidor',
				details: error instanceof Error ? error.message : 'Erro desconhecido'
			}
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ platform, url, request }) => {
	try {
		// Verificar autenticação
		const userId = await getUserFromRequest(platform, url);
		if (!userId) {
			return json({
				success: false,
				error: { message: 'Usuário não autenticado' }
			}, { status: 401 });
		}

		const { action, notificationIds } = await request.json();

		const result = await withDatabase(platform, async (db) => {
			if (action === 'markAsRead') {
				if (notificationIds && Array.isArray(notificationIds)) {
					// Marcar notificações específicas como lidas
					await db.query`
						UPDATE notifications 
						SET read_at = NOW(), updated_at = NOW()
						WHERE id = ANY(${notificationIds}) AND user_id = ${userId}
					`;
				} else {
					// Marcar todas como lidas
					await db.query`
						UPDATE notifications 
						SET read_at = NOW(), updated_at = NOW()
						WHERE user_id = ${userId} AND read_at IS NULL
					`;
				}

				return { updated: true };
			}

			if (action === 'delete') {
				if (notificationIds && Array.isArray(notificationIds)) {
					await db.query`
						DELETE FROM notifications 
						WHERE id = ANY(${notificationIds}) AND user_id = ${userId}
					`;
				}

				return { deleted: true };
			}

			throw new Error('Ação não suportada');
		});

		console.log(`✅ Ação '${action}' executada nas notificações do usuário ${userId}`);

		return json({
			success: true,
			data: result
		});

	} catch (error) {
		console.error('❌ Erro ao processar notificações:', error);
		return json({
			success: false,
			error: { 
				message: 'Erro ao processar notificações',
				details: error instanceof Error ? error.message : 'Erro desconhecido'
			}
		}, { status: 500 });
	}
};

// Função auxiliar para extrair usuário da requisição
async function getUserFromRequest(platform: any, url: URL): Promise<string | null> {
	try {
		// Verificar com API de autenticação interna
		const authResponse = await fetch(`${url.origin}/api/auth/me`, {
			headers: {
				'Cookie': url.searchParams.get('cookie') || ''
			}
		});

		if (authResponse.ok) {
			const authData = await authResponse.json();
			return authData.success ? authData.data?.user?.id : null;
		}

		return null;
	} catch {
		return null;
	}
} 