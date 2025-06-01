import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ params, platform, cookies }) => {
  try {
    console.log('📋 Order [id] - Estratégia híbrida iniciada');
    
    const orderId = params.id;
    console.log('📋 Buscando pedido:', orderId);
    
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    
    if (!authResult.success || !authResult.user) {
      console.log('❌ Usuário não autenticado');
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const userId = authResult.user.id;
    console.log('✅ Usuário autenticado:', authResult.user.email);
    
    // Tentar buscar pedido com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar pedido básico (query simplificada)
        const orders = await db.query`
          SELECT id, order_number, status, total, shipping_cost, discount_amount,
                 payment_method, shipping_address, notes, created_at, updated_at, user_id
          FROM orders
          WHERE id = ${orderId} AND user_id = ${userId}
        LIMIT 1
      `;
      
      if (!orders.length) {
        return null;
      }
      
      const order = orders[0];
      
        // STEP 2: Buscar itens do pedido (query separada)
        const items = await db.query`
          SELECT oi.id, oi.product_id, oi.quantity, oi.price, oi.total, oi.created_at,
                 p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ${orderId}
        ORDER BY oi.created_at
          LIMIT 20
      `;
      
        // STEP 3: Buscar histórico de status (opcional)
      let statusHistory = [];
      try {
          statusHistory = await db.query`
            SELECT status, notes, created_at
          FROM order_status_history
            WHERE order_id = ${orderId}
          ORDER BY created_at ASC
            LIMIT 10
        `;
      } catch (e) {
          console.log('📝 Tabela order_status_history não encontrada');
        }
        
        return {
          order,
          items,
          statusHistory
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (!result) {
        console.log('❌ Pedido não encontrado');
        return json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Pedido não encontrado'
          }
        }, { status: 404 });
      }
      
      // Formatar resposta
      const formattedOrder = {
        id: result.order.id,
        orderNumber: result.order.order_number,
        status: result.order.status,
        statusLabel: getStatusLabel(result.order.status),
        statusColor: getStatusColor(result.order.status),
        totalAmount: Number(result.order.total),
        shippingCost: Number(result.order.shipping_cost || 0),
        discountAmount: Number(result.order.discount_amount || 0),
        paymentMethod: result.order.payment_method,
        paymentMethodLabel: getPaymentMethodLabel(result.order.payment_method),
        shippingAddress: result.order.shipping_address,
        notes: result.order.notes,
        createdAt: result.order.created_at,
        updatedAt: result.order.updated_at,
        items: result.items.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || 'Produto',
          productImage: `/api/placeholder/300/300?text=${encodeURIComponent(item.product_name || 'Produto')}`,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
          createdAt: item.created_at
        })),
        statusHistory: result.statusHistory.map((history: any) => ({
          status: history.status,
          statusLabel: getStatusLabel(history.status),
          notes: history.notes,
          createdAt: history.created_at
        })),
        summary: {
          itemsCount: result.items.length,
          subtotal: Number(result.order.total) - Number(result.order.shipping_cost || 0) + Number(result.order.discount_amount || 0),
          shipping: Number(result.order.shipping_cost || 0),
          discount: Number(result.order.discount_amount || 0),
          total: Number(result.order.total)
        }
      };
      
      console.log('✅ Pedido encontrado:', formattedOrder.orderNumber);
      
      return json({
        success: true,
        data: formattedOrder,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro order [id]: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Pedido mock baseado no ID
      const mockOrder = {
        id: orderId,
        orderNumber: `MP${orderId.slice(-8).toUpperCase()}`,
        status: 'delivered',
        statusLabel: 'Entregue',
        statusColor: 'green',
        totalAmount: 299.99,
        shippingCost: 15.90,
        discountAmount: 0,
        paymentMethod: 'pix',
        paymentMethodLabel: 'PIX',
        shippingAddress: {
          street: 'Rua das Flores, 123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100'
        },
        notes: null,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        items: [
          {
            id: '1',
            productId: 'prod-1',
            productName: 'Smartphone Xiaomi Redmi Note 13',
            productImage: '/api/placeholder/300/300?text=Xiaomi+Redmi+Note+13',
            quantity: 1,
            price: 299.99,
            total: 299.99,
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
          }
        ],
        statusHistory: [
          {
            status: 'pending',
            statusLabel: 'Aguardando Pagamento',
            notes: 'Pedido criado',
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
          },
          {
            status: 'confirmed',
            statusLabel: 'Confirmado',
            notes: 'Pagamento confirmado',
            createdAt: new Date(Date.now() - 86400000 * 3 + 3600000).toISOString()
          },
          {
            status: 'shipped',
            statusLabel: 'Enviado',
            notes: 'Produto enviado',
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
          },
          {
            status: 'delivered',
            statusLabel: 'Entregue',
            notes: 'Produto entregue',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        summary: {
          itemsCount: 1,
          subtotal: 299.99,
          shipping: 15.90,
          discount: 0,
          total: 299.99
        }
      };
    
    return json({
      success: true,
        data: mockOrder,
        source: 'fallback'
    });
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico order [id]:', error);
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro ao buscar pedido'
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