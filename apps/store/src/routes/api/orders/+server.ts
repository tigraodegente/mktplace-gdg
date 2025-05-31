import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  try {
    console.log('📋 orders: Buscando pedidos do usuário...');
    
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    
    if (!authResult.success || !authResult.user) {
      console.log('❌ orders: Usuário não autenticado');
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const userId = authResult.user.id;
    console.log('✅ orders: Usuário autenticado:', authResult.user.email);
    
    // Parâmetros de paginação
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;
    
    // Status para filtrar
    const status = url.searchParams.get('status');
    
    const result = await withDatabase(platform, async (db) => {
      // Construir filtros
      const conditions = ['o.user_id = $1'];
      const params = [userId];
      let paramIndex = 2;
      
      if (status) {
        conditions.push(`o.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Query principal com itens do pedido
      const ordersQuery = `
        WITH order_items_agg AS (
          SELECT 
            oi.order_id,
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'product_name', p.name,
                'product_image', COALESCE(
                  (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1),
                  '/api/placeholder/300/300'
                ),
                'quantity', oi.quantity,
                'price', oi.price,
                'total', oi.total
              ) ORDER BY oi.created_at
            ) as items
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          GROUP BY oi.order_id
        )
        SELECT 
          o.id,
          o.order_number,
          o.status,
          o.total as total_amount,
          o.shipping_cost,
          o.discount_amount,
          o.payment_method,
          CASE 
            WHEN o.metadata->>'shipping_address' IS NOT NULL 
            THEN o.metadata->'shipping_address'
            ELSE o.shipping_address
          END as shipping_address,
          o.notes,
          o.created_at,
          o.updated_at,
          COALESCE(oia.items, '[]'::json) as items
        FROM orders o
        LEFT JOIN order_items_agg oia ON oia.order_id = o.id
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit.toString(), offset.toString());
      
      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        WHERE ${whereClause}
      `;
      
      // Executar queries em paralelo
      const [orders, countResult] = await Promise.all([
        db.query(ordersQuery, ...params.map(String)),
        db.query(countQuery, ...params.slice(0, -2).map(String)) // Remove limit e offset
      ]);
      
      const totalCount = parseInt(countResult[0].total);
      
      // Formatar pedidos
      const formattedOrders = orders.map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        statusLabel: getStatusLabel(order.status),
        statusColor: getStatusColor(order.status),
        totalAmount: Number(order.total_amount),
        shippingCost: Number(order.shipping_cost || 0),
        discountAmount: Number(order.discount_amount || 0),
        paymentMethod: order.payment_method,
        shippingAddress: order.shipping_address,
        notes: order.notes,
        items: Array.isArray(order.items) ? order.items.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productImage: item.product_image || '/api/placeholder/300/300',
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total)
        })) : [],
        itemsCount: Array.isArray(order.items) ? order.items.length : 0,
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));
      
      return {
        orders: formattedOrders,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
    });
    
    console.log(`✅ orders: ${result.orders.length} pedidos encontrados`);
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('❌ orders: Erro ao buscar pedidos:', error);
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Erro: ${error?.message || 'Erro desconhecido'}`
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