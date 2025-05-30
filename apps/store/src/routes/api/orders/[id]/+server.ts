import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ params, platform, cookies }) => {
  try {
    const orderId = params.id;
    console.log('📋 order-details: Buscando pedido:', orderId);
    
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    
    if (!authResult.success || !authResult.user) {
      console.log('❌ order-details: Usuário não autenticado');
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const userId = authResult.user.id;
    console.log('✅ order-details: Usuário autenticado:', authResult.user.email);
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar pedido com itens
      const orderQuery = `
        SELECT 
          o.id,
          o.order_number,
          o.status,
          o.total_amount,
          o.shipping_cost,
          o.discount_amount,
          o.payment_method,
          o.shipping_address,
          o.notes,
          o.created_at,
          o.updated_at,
          o.user_id
        FROM orders o
        WHERE o.id = $1 AND o.user_id = $2
        LIMIT 1
      `;
      
      const orders = await db.query(orderQuery, orderId, userId);
      
      if (!orders.length) {
        return null;
      }
      
      const order = orders[0];
      
      // Buscar itens do pedido
      const itemsQuery = `
        SELECT 
          oi.id,
          oi.product_id,
          oi.product_name,
          oi.product_image,
          oi.quantity,
          oi.price,
          oi.total,
          oi.created_at
        FROM order_items oi
        WHERE oi.order_id = $1
        ORDER BY oi.created_at
      `;
      
      const items = await db.query(itemsQuery, orderId);
      
      // Buscar histórico de status (se existir tabela)
      let statusHistory = [];
      try {
        const historyQuery = `
          SELECT 
            status,
            notes,
            created_at
          FROM order_status_history
          WHERE order_id = $1
          ORDER BY created_at ASC
        `;
        statusHistory = await db.query(historyQuery, orderId);
      } catch (e) {
        // Tabela não existe, continuar sem histórico
        console.log('📝 order-details: Tabela order_status_history não encontrada');
      }
      
      // Formatar resposta
      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        statusLabel: getStatusLabel(order.status),
        statusColor: getStatusColor(order.status),
        totalAmount: Number(order.total_amount),
        shippingCost: Number(order.shipping_cost || 0),
        discountAmount: Number(order.discount_amount || 0),
        paymentMethod: order.payment_method,
        paymentMethodLabel: getPaymentMethodLabel(order.payment_method),
        shippingAddress: order.shipping_address,
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: items.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productImage: item.product_image || '/api/placeholder/300/300',
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
          createdAt: item.created_at
        })),
        statusHistory: statusHistory.map((history: any) => ({
          status: history.status,
          statusLabel: getStatusLabel(history.status),
          notes: history.notes,
          createdAt: history.created_at
        })),
        summary: {
          itemsCount: items.length,
          subtotal: Number(order.total_amount) - Number(order.shipping_cost || 0) + Number(order.discount_amount || 0),
          shipping: Number(order.shipping_cost || 0),
          discount: Number(order.discount_amount || 0),
          total: Number(order.total_amount)
        }
      };
    });
    
    if (!result) {
      console.log('❌ order-details: Pedido não encontrado');
      return json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Pedido não encontrado'
        }
      }, { status: 404 });
    }
    
    console.log('✅ order-details: Pedido encontrado:', result.orderNumber);
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('❌ order-details: Erro ao buscar pedido:', error);
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

/**
 * Obter label do método de pagamento
 */
function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'pix': 'PIX',
    'boleto': 'Boleto Bancário',
    'bank_transfer': 'Transferência Bancária'
  };
  
  return labels[method] || method;
} 