import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, params, url, setHeaders }) => {
	// Headers de cache otimizados para rastreamento
	setHeaders({
		'cache-control': 'private, max-age=300', // 5 minutos para dados pessoais
		'vary': 'Cookie, Authorization'
	});

	try {
		const orderId = params.id;
		if (!orderId) {
			return json({
				success: false,
				error: { message: 'ID do pedido é obrigatório' }
			}, { status: 400 });
		}

		// Verificar autenticação e autorização
		const userId = await getUserFromRequest(platform, url);
		if (!userId) {
			return json({
				success: false,
				error: { message: 'Usuário não autenticado' }
			}, { status: 401 });
		}

		const result = await withDatabase(platform, async (db) => {
			// Verificar se o pedido pertence ao usuário
			const orderCheck = await db.query(`
				SELECT id, order_number, status, tracking_code
				FROM orders 
				WHERE id = $1 AND user_id = $2
			`, [orderId, userId]);

			if (!orderCheck || orderCheck.length === 0) {
				throw new Error('Pedido não encontrado ou não autorizado');
			}

			const order = orderCheck[0];

			// Buscar eventos de rastreamento do banco
			const trackingEvents = await db.query(`
				SELECT 
					id,
					event_type,
					status,
					description,
					location,
					date_time,
					created_at
				FROM order_tracking_events
				WHERE order_id = $1
				ORDER BY date_time DESC, created_at DESC
			`, [orderId]);

			// Se tem código de rastreamento, buscar atualizações dos Correios
			let externalTracking = null;
			if (order.tracking_code) {
				try {
					externalTracking = await fetchCorreiosTracking(order.tracking_code);
				} catch (trackingError) {
					console.warn(`Falha ao buscar rastreamento externo para ${order.tracking_code}:`, trackingError);
				}
			}

			// Combinar eventos do banco com dados externos
			const allEvents = [
				...trackingEvents.map((event: any) => ({
					id: event.id,
					type: event.event_type,
					status: event.status,
					description: event.description,
					location: event.location,
					dateTime: event.date_time,
					source: 'internal'
				})),
				...(externalTracking?.events || []).map((event: any, index: number) => ({
					id: `ext-${index}`,
					type: 'correios',
					status: event.status,
					description: event.description,
					location: event.location,
					dateTime: event.dateTime,
					source: 'correios'
				}))
			].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

			// Determinar status atual
			const currentStatus = determineCurrentStatus(allEvents, order.status);

			return {
				order: {
					id: order.id,
					orderNumber: order.order_number,
					status: order.status,
					trackingCode: order.tracking_code,
					currentStatus
				},
				tracking: {
					events: allEvents,
					lastUpdate: allEvents[0]?.dateTime || order.created_at,
					estimatedDelivery: calculateEstimatedDelivery(allEvents, order),
					canTrackExternal: !!order.tracking_code
				}
			};
		});

		console.log(`✅ Rastreamento carregado para pedido ${orderId}`);

		return json({
			success: true,
			data: result
		});

	} catch (error) {
		console.error('❌ Erro ao buscar rastreamento:', error);
		return json({
			success: false,
			error: { 
				message: 'Erro ao buscar dados de rastreamento',
				details: error instanceof Error ? error.message : 'Erro desconhecido'
			}
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ platform, params, request, url }) => {
	try {
		const orderId = params.id;
		if (!orderId) {
			return json({
				success: false,
				error: { message: 'ID do pedido é obrigatório' }
			}, { status: 400 });
		}

		// Verificar se é uma requisição administrativa (webhook ou admin)
		const isAdminRequest = await verifyAdminAccess(platform, url, request);
		if (!isAdminRequest) {
			return json({
				success: false,
				error: { message: 'Acesso não autorizado' }
			}, { status: 403 });
		}

		const { eventType, status, description, location, trackingCode } = await request.json();

		const result = await withDatabase(platform, async (db) => {
			// Inserir novo evento de rastreamento
			const newEvent = await db.query(`
				INSERT INTO order_tracking_events (
					order_id, event_type, status, description, location, date_time
				) VALUES ($1, $2, $3, $4, $5, NOW())
				RETURNING *
			`, [orderId, eventType, status, description, location]);

			// Atualizar código de rastreamento se fornecido
			if (trackingCode) {
				await db.query(`
					UPDATE orders 
					SET tracking_code = $1, updated_at = NOW()
					WHERE id = $2
				`, [trackingCode, orderId]);
			}

			// Atualizar status do pedido se necessário
			if (shouldUpdateOrderStatus(status)) {
				await db.query(`
					UPDATE orders 
					SET status = $1, updated_at = NOW()
					WHERE id = $2
				`, [status, orderId]);
			}

			return { event: newEvent[0] };
		});

		console.log(`✅ Evento de rastreamento adicionado para pedido ${orderId}`);

		return json({
			success: true,
			data: result
		});

	} catch (error) {
		console.error('❌ Erro ao atualizar rastreamento:', error);
		return json({
			success: false,
			error: { 
				message: 'Erro ao atualizar rastreamento',
				details: error instanceof Error ? error.message : 'Erro desconhecido'
			}
		}, { status: 500 });
	}
};

// Função para buscar dados dos Correios
async function fetchCorreiosTracking(trackingCode: string) {
	try {
		// Implementação real da API dos Correios
		const response = await fetch(`https://api.correios.com.br/sro/v1/objetos/${trackingCode}`, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'MarketplaceGDG/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`Correios API error: ${response.status}`);
		}

		const data = await response.json();
		
		return {
			trackingCode,
			events: data.objetos?.[0]?.eventos?.map((evento: any) => ({
				status: evento.status,
				description: evento.descricao,
				location: `${evento.unidade?.nome}, ${evento.unidade?.endereco?.cidade}-${evento.unidade?.endereco?.uf}`,
				dateTime: new Date(`${evento.dtHrCriado}T${evento.dtHrCriado}`).toISOString()
			})) || []
		};
	} catch (error) {
		console.warn('Falha ao consultar Correios:', error);
		// Fallback para simulação em desenvolvimento
		if (process.env.NODE_ENV === 'development') {
			return generateMockCorreiosData(trackingCode);
		}
		throw error;
	}
}

// Dados simulados dos Correios para desenvolvimento
function generateMockCorreiosData(trackingCode: string) {
	const now = new Date();
	return {
		trackingCode,
		events: [
			{
				status: 'OBJETO_ENTREGUE',
				description: 'Objeto entregue ao destinatário',
				location: 'São Paulo-SP',
				dateTime: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
			},
			{
				status: 'OBJETO_SAIU_PARA_ENTREGA',
				description: 'Objeto saiu para entrega ao destinatário',
				location: 'São Paulo-SP',
				dateTime: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
			},
			{
				status: 'OBJETO_EM_TRANSITO',
				description: 'Objeto em trânsito - por favor aguarde',
				location: 'São Paulo-SP',
				dateTime: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
			}
		]
	};
}

// Determinar status atual baseado nos eventos
function determineCurrentStatus(events: any[], orderStatus: string) {
	if (events.length === 0) return orderStatus;

	const latestEvent = events[0];
	const statusMap: Record<string, string> = {
		'OBJETO_ENTREGUE': 'delivered',
		'OBJETO_SAIU_PARA_ENTREGA': 'out_for_delivery',
		'OBJETO_EM_TRANSITO': 'shipped',
		'OBJETO_POSTADO': 'shipped'
	};

	return statusMap[latestEvent.status] || orderStatus;
}

// Calcular entrega estimada
function calculateEstimatedDelivery(events: any[], order: any) {
	// Buscar evento de postagem
	const postedEvent = events.find(e => 
		e.status === 'OBJETO_POSTADO' || e.type === 'shipped'
	);

	if (!postedEvent) return null;

	// Estimar 7 dias úteis a partir da postagem
	const postedDate = new Date(postedEvent.dateTime);
	const estimatedDate = new Date(postedDate);
	estimatedDate.setDate(estimatedDate.getDate() + 7);

	return estimatedDate.toISOString();
}

// Verificar se deve atualizar status do pedido
function shouldUpdateOrderStatus(trackingStatus: string): boolean {
	const statusesToUpdate = [
		'OBJETO_ENTREGUE',
		'OBJETO_SAIU_PARA_ENTREGA',
		'OBJETO_EM_TRANSITO'
	];
	
	return statusesToUpdate.includes(trackingStatus);
}

// Funções auxiliares
async function getUserFromRequest(platform: any, url: URL): Promise<string | null> {
	try {
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

async function verifyAdminAccess(platform: any, url: URL, request: Request): Promise<boolean> {
	try {
		// Verificar header de webhook dos Correios
		const webhookKey = request.headers.get('x-webhook-key');
		if (webhookKey === process.env.CORREIOS_WEBHOOK_KEY) {
			return true;
		}

		// Verificar se é admin autenticado
		const authResponse = await fetch(`${url.origin}/api/auth/me`, {
			headers: request.headers
		});

		if (authResponse.ok) {
			const authData = await authResponse.json();
			return authData.success && authData.data?.user?.role === 'admin';
		}

		return false;
	} catch {
		return false;
	}
} 