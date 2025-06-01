import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

interface OrderCreateRequest {
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    seller_id?: string;
    selectedColor?: string;
    selectedSize?: string;
  }>;
  shipping_address: {
    name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postal_code: string;
  };
  billing_address?: object;
  payment_method: string;
  installments?: number;
  coupon_code?: string;
  notes?: string;
  user_id: string;
}

interface OrderResponse {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    total: number;
    status: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('🛒 Orders Create - Estratégia híbrida iniciada');
    
    const body = await request.json() as OrderCreateRequest;
    
    // Validações básicas
    if (!body.items || body.items.length === 0) {
      return json({
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: 'Carrinho está vazio'
        }
      } as OrderResponse, { status: 400 });
    }

    if (!body.user_id) {
      return json({
        success: false,
        error: {
          code: 'MISSING_USER',
          message: 'Usuário não identificado'
        }
      } as OrderResponse, { status: 400 });
    }

    // Tentar criar pedido com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 8 segundos para operação crítica
      const queryPromise = (async () => {
        console.log('🔄 Iniciando criação de pedido...');

        // STEP 1: Validar produtos (query simplificada)
        let subtotal = 0;
        for (const item of body.items) {
          const products = await db.query`
            SELECT id, name, price, quantity
            FROM products 
            WHERE id = ${item.product_id} AND is_active = true
            LIMIT 1
          `;

          const product = products[0];
          if (!product) {
            throw new Error(`Produto não encontrado: ${item.product_id}`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(`Estoque insuficiente para ${product.name}`);
          }

          subtotal += item.price * item.quantity;
        }

        // STEP 2: Calcular totais (simplificado)
        const shipping = subtotal > 100 ? 0 : 15.90;
        let discount = 0;
        
        if (body.coupon_code) {
          const coupons = await db.query`
            SELECT value, type FROM coupons 
            WHERE code = ${body.coupon_code} AND is_active = true
            LIMIT 1
          `;
          
          if (coupons.length > 0) {
            const coupon = coupons[0];
            if (coupon.type === 'percentage') {
              discount = subtotal * (coupon.value / 100);
            } else if (coupon.type === 'fixed') {
              discount = coupon.value;
            }
          }
        }

        const total = subtotal + shipping - discount;

        // STEP 3: Gerar número do pedido
        const orderNumber = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // STEP 4: Criar pedido
        const orders = await db.query`
          INSERT INTO orders (
            user_id, order_number, status, payment_status, payment_method,
            subtotal, shipping_cost, discount_amount, total,
            shipping_address, billing_address, notes,
            created_at, updated_at
          ) VALUES (
            ${body.user_id}, ${orderNumber}, 'pending', 'pending', ${body.payment_method},
            ${subtotal}, ${shipping}, ${discount}, ${total},
            ${JSON.stringify(body.shipping_address)}, ${JSON.stringify(body.billing_address || null)}, 
            ${body.notes || null}, NOW(), NOW()
          )
          RETURNING id, order_number, total, status
        `;

        const order = orders[0];
        console.log(`✅ Pedido criado: ${order.order_number}`);

        // STEP 5: Criar itens do pedido
        for (const item of body.items) {
          await db.query`
            INSERT INTO order_items (
              order_id, product_id, seller_id, quantity, price, total,
              created_at
            ) VALUES (
              ${order.id}, ${item.product_id}, ${item.seller_id || 'seller-1'}, 
              ${item.quantity}, ${item.price}, ${item.quantity * item.price},
              NOW()
            )
          `;
        }

        // STEP 6: Operações async (não travar resposta)
        setTimeout(async () => {
          try {
            // Atualizar estoque
            for (const item of body.items) {
              await db.query`
                UPDATE products 
                SET quantity = quantity - ${item.quantity}, updated_at = NOW()
                WHERE id = ${item.product_id}
              `;
            }

            // Registrar movimentações de estoque
            for (const item of body.items) {
              await db.query`
                INSERT INTO stock_movements (
                  product_id, type, quantity, reason, reference_id, created_at
                ) VALUES (
                  ${item.product_id}, 'out', ${item.quantity}, 
                  'order_created', ${order.id}, NOW()
                )
              `;
            }

            // Aplicar cupom
            if (body.coupon_code && discount > 0) {
              await db.query`
                UPDATE coupons 
                SET used_count = used_count + 1
                WHERE code = ${body.coupon_code}
              `;
            }
          } catch (e) {
            console.log('Updates async failed:', e);
          }
        }, 100);

        return {
          success: true,
          order: {
            id: order.id,
            order_number: order.order_number,
            total: parseFloat(order.total),
            status: order.status
          }
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Pedido criado com sucesso: ${result.order.order_number}`);
      
      return json({
        ...result,
        source: 'database'
      } as OrderResponse);
      
    } catch (error) {
      console.log(`⚠️ Erro orders create: ${error instanceof Error ? error.message : 'Erro'}`);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // FALLBACK SEGURO: NUNCA criar pedido inválido
      // Em caso de timeout ou erro crítico, sempre falhar
      
      // Retornar erro específico se for validação
      if (errorMessage.includes('Produto') || errorMessage.includes('Estoque') || errorMessage.includes('Timeout')) {
        return json({
          success: false,
          error: {
            code: errorMessage.includes('Timeout') ? 'TIMEOUT_ERROR' : 'VALIDATION_ERROR',
            message: errorMessage.includes('Timeout') 
              ? 'Erro temporário no servidor. Tente novamente em alguns instantes.'
              : errorMessage
          }
        } as OrderResponse, { status: errorMessage.includes('Timeout') ? 503 : 400 });
      }

      return json({
        success: false,
        error: {
          code: 'ORDER_CREATION_FAILED',
          message: 'Erro interno do servidor. Tente novamente.'
        }
      } as OrderResponse, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Erro crítico orders create:', error);
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro ao processar pedido'
      }
    } as OrderResponse, { status: 500 });
  }
}; 