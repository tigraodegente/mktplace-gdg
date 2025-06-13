import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { sanitizeEmail, isValidEmail, checkRateLimit } from '$lib/utils/security';

export const GET: RequestHandler = async ({ params, url, platform, request }) => {
  try {
    // 🔒 APLICAR RATE LIMITING
    const clientIP = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for') || 
                     'unknown';
    
    if (!checkRateLimit(`guest-order:${clientIP}`, 20, 300000)) { // 20 requests per 5 minutes
      return json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas consultas. Tente novamente em alguns minutos.'
        }
      }, { status: 429 });
    }
    
    const orderNumber = params.number;
    const rawEmail = url.searchParams.get('email');
    
    // 🔒 SANITIZAR EMAIL
    const guestEmail = rawEmail ? sanitizeEmail(rawEmail) : null;
    
    
    // Validações básicas
    if (!orderNumber) {
      return json({
        success: false,
        error: {
          code: 'MISSING_ORDER_NUMBER',
          message: 'Número do pedido é obrigatório'
        }
      }, { status: 400 });
    }
    
    if (!guestEmail) {
      return json({
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email é obrigatório para verificação'
        }
      }, { status: 400 });
    }
    
    // 🔒 VALIDAR EMAIL
    if (!guestEmail || !isValidEmail(guestEmail)) {
      return json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Formato de email inválido'
        }
      }, { status: 400 });
    }
    
    // Buscar pedido de convidado com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar pedido básico (APENAS GUESTS)
        const orders = await db.query`
          SELECT id, order_number, status, total, shipping_cost, discount_amount,
                 payment_method, shipping_address, notes, created_at, updated_at,
                 guest_email, guest_name, guest_phone, guest_accepts_marketing
          FROM orders
          WHERE order_number = ${orderNumber} 
            AND guest_email = ${guestEmail}
            AND user_id IS NULL
          LIMIT 1
        `;
        
        if (!orders.length) {
          return null;
        }
        
        const order = orders[0];
        
        // STEP 2: Buscar itens do pedido
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
            SELECT notes, created_at, new_status
            FROM order_status_history
            WHERE order_id = ${order.id}
            ORDER BY created_at ASC
            LIMIT 10
          `;
        } catch (e) {
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
        return json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Pedido não encontrado ou email incorreto'
          }
        }, { status: 404 });
      }
      
      // Formatar resposta (similar à API de usuários logados)
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
        
        // Dados específicos do guest (sem expor dados sensíveis)
        guestInfo: {
          name: result.order.guest_name,
          email: result.order.guest_email,
          // Não retornar telefone por segurança
          acceptsMarketing: result.order.guest_accepts_marketing
        },
        
        items: result.items.map((item: any) => {
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
          status: history.new_status,
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
      
      
      return json({
        success: true,
        data: formattedOrder,
        source: 'database',
        isGuest: true
      });
      
    } catch (error) {
      
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
    console.error('❌ Erro crítico order guest [number]:', error);
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