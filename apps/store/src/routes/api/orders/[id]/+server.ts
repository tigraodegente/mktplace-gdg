import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
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
          WHERE order_number = ${orderId} AND user_id = ${userId}
        LIMIT 1
      `;
      
      if (!orders.length) {
        return null;
      }
      
      const order = orders[0];
      
        // STEP 2: Buscar itens do pedido (query separada)
        const items = await db.query`
          SELECT 
            oi.id, 
            oi.product_id, 
            oi.quantity, 
            oi.price, 
            oi.total, 
            oi.created_at,
            oi.selected_color,
            oi.selected_size,
            oi.seller_id,
            -- Dados do produto (JOIN)
            p.name as product_name,
            p.slug as product_slug,
            p.is_active as product_active,
            -- Primeira imagem do produto (JOIN com product_images)
            pi.url as product_image_url,
            -- Dados do vendedor (JOIN)
            s.company_name as seller_name,
            s.slug as seller_slug
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          LEFT JOIN sellers s ON oi.seller_id = s.id
          LEFT JOIN LATERAL (
            SELECT url 
            FROM product_images 
            WHERE product_id = oi.product_id 
            ORDER BY position ASC 
            LIMIT 1
          ) pi ON true
          WHERE oi.order_id = ${order.id}
          ORDER BY oi.created_at
          LIMIT 20
        `;
      
        // STEP 3: Buscar histórico de status (opcional)
      let statusHistory = [];
      try {
          statusHistory = await db.query`
            SELECT notes, created_at
          FROM order_status_history
            WHERE order_id = ${order.id}
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
        items: result.items.map((item: any) => {
          // Usar imagem da query ou placeholder
          const productImage = item.product_image_url || '/api/placeholder/300/300';
          
          return {
            id: item.id,
            productId: item.product_id,
            productName: item.product_name || 'Produto',
            productImage,
            productSlug: item.product_slug,
            productActive: item.product_active,
            quantity: item.quantity,
            price: Number(item.price),
            total: Number(item.total),
            selectedColor: item.selected_color,
            selectedSize: item.selected_size,
            sellerId: item.seller_id,
            sellerName: item.seller_name || 'Marketplace GDG',
            sellerSlug: item.seller_slug,
            createdAt: item.created_at
          };
        }),
        statusHistory: result.statusHistory.map((history: any) => ({
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
      console.log(`⚠️ Erro orders [id]: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar o pedido',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
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