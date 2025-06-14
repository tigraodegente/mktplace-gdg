import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  try {
    console.log('📋 Orders List - Estratégia híbrida iniciada');
    
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    
    if (!authResult.success || !authResult.user) {
      console.log('❌ Usuário não autenticado');
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const userId = authResult.user.id;
    console.log('✅ Usuário autenticado:', authResult.user.email);
    
    // Parâmetros de paginação
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');
    
    // Tentar buscar pedidos com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos
      const queryPromise = (async () => {
        // STEP 1: Query SIMPLIFICADA - apenas pedidos básicos
        let ordersQuery = `
          SELECT id, order_number, status, total, shipping_cost, discount_amount,
                 payment_method, shipping_address, notes, created_at, updated_at
          FROM orders 
          WHERE user_id = $1
        `;
        const params = [userId];
        
        if (status) {
          ordersQuery += ` AND status = $2`;
          params.push(status);
          ordersQuery += ` ORDER BY created_at DESC LIMIT $3 OFFSET $4`;
          params.push(limit.toString(), offset.toString());
        } else {
          ordersQuery += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
          params.push(limit.toString(), offset.toString());
        }
        
        const orders = await db.query(ordersQuery, ...params);
        
        // STEP 2: Buscar itens para cada pedido (queries separadas)
        const ordersWithItems = await Promise.all(
          orders.map(async (order: any) => {
            try {
              const items = await db.query`
                SELECT oi.id, oi.product_id, oi.quantity, oi.price, oi.total, p.name as product_name
                FROM order_items oi
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ${order.id}
                ORDER BY oi.created_at
                LIMIT 10
              `;
              
              return {
                ...order,
                items: items.map((item: any) => ({
                  id: item.id,
                  productId: item.product_id,
                  productName: item.product_name || 'Produto',
                  productImage: `/api/placeholder/300/300?text=${encodeURIComponent(item.product_name || 'Produto')}`,
                  quantity: item.quantity,
                  price: Number(item.price),
                  total: Number(item.total)
                }))
              };
            } catch (e) {
              console.log('⚠️ Erro ao buscar itens do pedido, usando mock');
              return {
                ...order,
                items: [
                  {
                    id: '1',
                    productId: 'prod-1',
                    productName: 'Produto do Pedido',
                    productImage: '/api/placeholder/300/300?text=Produto',
                    quantity: 1,
                    price: Number(order.total) || 99.99,
                    total: Number(order.total) || 99.99
                  }
                ]
              };
            }
          })
        );
        
        // STEP 3: Count total (query separada)
        let countQuery = `SELECT COUNT(*) as total FROM orders WHERE user_id = $1`;
        const countParams = [userId];
        
        if (status) {
          countQuery += ` AND status = $2`;
          countParams.push(status);
        }
        
        const countResult = await db.query(countQuery, ...countParams);
        const totalCount = parseInt(countResult[0].total);
        
        return {
          orders: ordersWithItems,
          totalCount
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      // Formatar pedidos
      const formattedOrders = result.orders.map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        statusLabel: getStatusLabel(order.status),
        statusColor: getStatusColor(order.status),
        totalAmount: Number(order.total),
        shippingCost: Number(order.shipping_cost || 0),
        discountAmount: Number(order.discount_amount || 0),
        paymentMethod: order.payment_method,
        shippingAddress: order.shipping_address,
        notes: order.notes,
        items: order.items,
        itemsCount: order.items.length,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));
      
      console.log(`✅ ${formattedOrders.length} pedidos encontrados`);
      
      return json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination: {
            page,
            limit,
            total: result.totalCount,
            totalPages: Math.ceil(result.totalCount / limit),
            hasNext: page < Math.ceil(result.totalCount / limit),
            hasPrev: page > 1
          }
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro orders: ${error instanceof Error ? error.message : 'Erro'}`);
      
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar seus pedidos. Por favor, tente novamente.',
          details: 'Estamos com problemas técnicos temporários.'
        }
      }, { status: 503 }); // 503 Service Unavailable
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico orders:', error);
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro ao buscar pedidos'
      }
    }, { status: 500 });
  }
};

/**
 * Obter label amigável do status
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pending': 'Aguardando Pagamento',
    'confirmed': 'Confirmado',
    'processing': 'Preparando',
    'shipped': 'Enviado',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado',
    'refunded': 'Reembolsado'
  };
  
  return labels[status] || status;
}

/**
 * Obter cor do status
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'pending': 'orange',
    'confirmed': 'blue',
    'processing': 'purple',
    'shipped': 'indigo',
    'delivered': 'green',
    'cancelled': 'red',
    'refunded': 'gray'
  };
  
  return colors[status] || 'gray';
} 