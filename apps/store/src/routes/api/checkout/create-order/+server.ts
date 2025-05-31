import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
  }>;
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  couponCode?: string;
  notes?: string;
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    console.log('🛒 create-order: Iniciando criação de pedido...');
    
    // Verificar autenticação
    console.log('🔐 create-order: Verificando autenticação...');
    const authResult = await requireAuth(cookies, platform);
    
      success: authResult.success,
      hasUser: !!authResult.user,
      userId: authResult.user?.id,
      error: authResult.error?.message
    });
    
    if (!authResult.success) {
      console.log('❌ create-order: Autenticação falhou:', authResult.error);
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    console.log('✅ create-order: Autenticação bem-sucedida para usuário:', authResult.user?.email);

    const orderData: CreateOrderRequest = await request.json();

    // Validar dados obrigatórios
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return json({
        success: false,
        error: { message: 'Itens do pedido são obrigatórios' }
      }, { status: 400 });
    }

    if (!orderData.shippingAddress || !orderData.paymentMethod) {
      return json({
        success: false,
        error: { message: 'Endereço de entrega e método de pagamento são obrigatórios' }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // 🔧 CORRIGIR: Usar método transaction da classe Database
      return await db.transaction(async (sql) => {
        console.log('🔄 create-order: Iniciando transação...');
        
        // 1. Validar e calcular totais
        let subtotal = 0;
        let discount = 0;
        const orderItems = [];

        // Validar cada item e calcular subtotal
        for (const item of orderData.items) {
          const products = await sql<any>`
            SELECT 
              id, 
              name, 
              price, 
              quantity,
              status,
              attributes
            FROM products 
            WHERE id = ${item.productId} 
            AND status = 'active'
          `;
          
          const product = products[0];

          if (!product) {
            throw new Error(`Produto ${item.productId} não encontrado ou inativo`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}`);
          }

          const itemPrice = parseFloat(product.price);
          const itemTotal = itemPrice * item.quantity;
          subtotal += itemTotal;

          orderItems.push({
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: itemPrice,
            totalPrice: itemTotal,
            productSnapshot: {
              name: product.name,
              price: itemPrice,
              attributes: product.attributes,
              id: product.id
            }
          });
        }

        // 2. Calcular frete (simulação)
        const shippingCost = subtotal > 100 ? 0 : 15.90; // Frete grátis acima de R$ 100

        // 3. Aplicar cupom se fornecido
        if (orderData.couponCode) {
          const coupons = await sql<any>`
            SELECT 
              id, 
              code, 
              type, 
              value, 
              minimum_order_value,
              max_uses,
              used_count,
              expires_at,
              is_active
            FROM coupons 
            WHERE code = ${orderData.couponCode} 
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
          `;
          
          const coupon = coupons[0];

          if (!coupon) {
            throw new Error('Cupom inválido ou expirado');
          }

          if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
            throw new Error('Cupom esgotado');
          }

          if (coupon.minimum_order_value && subtotal < coupon.minimum_order_value) {
            throw new Error(`Valor mínimo para este cupom: R$ ${parseFloat(coupon.minimum_order_value).toFixed(2)}`);
          }

          // Calcular desconto
          if (coupon.type === 'percentage') {
            discount = (subtotal * parseFloat(coupon.value)) / 100;
          } else if (coupon.type === 'fixed') {
            discount = parseFloat(coupon.value);
          } else if (coupon.type === 'free_shipping') {
            discount = shippingCost;
          }

          // Garantir que desconto não seja maior que subtotal + frete
          discount = Math.min(discount, subtotal + shippingCost);
        }

        const total = subtotal + shippingCost - discount;

        // 4. Gerar número do pedido único
        const orderNumber = `MP${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

        console.log('📦 create-order: Criando pedido:', orderNumber);

        // 5. Criar o pedido
        const orders = await sql<any>`
          INSERT INTO orders (
            user_id,
            order_number,
            status,
            payment_status,
            payment_method,
            subtotal,
            shipping_cost,
            discount_amount,
            total,
            shipping_address,
            coupon_code,
            notes
          ) VALUES (
            ${authResult.user!.id},
            ${orderNumber},
            'pending',
            'pending',
            ${orderData.paymentMethod},
            ${subtotal},
            ${shippingCost},
            ${discount},
            ${total},
            ${JSON.stringify(orderData.shippingAddress)},
            ${orderData.couponCode || null},
            ${orderData.notes || null}
          ) RETURNING id, order_number, total, created_at
        `;
        
        const order = orders[0];

        console.log('📝 create-order: Adicionando itens do pedido...');

        // 6. Adicionar itens do pedido
        for (const item of orderItems) {
          await sql`
            INSERT INTO order_items (
              order_id,
              product_id,
              quantity,
              price,
              total,
              status
            ) VALUES (
              ${order.id},
              ${item.productId},
              ${item.quantity},
              ${item.unitPrice},
              ${item.totalPrice},
              'pending'
            )
          `;

          // Reduzir estoque
          await sql`
            UPDATE products 
            SET quantity = quantity - ${item.quantity}
            WHERE id = ${item.productId}
          `;
        }

        // 7. Incrementar uso do cupom se aplicado
        if (orderData.couponCode) {
          await sql`
            UPDATE coupons 
            SET used_count = used_count + 1
            WHERE code = ${orderData.couponCode}
          `;
        }

        // 8. Adicionar log de histórico
        await sql`
          INSERT INTO order_status_history (
            order_id,
            previous_status,
            new_status,
            created_by,
            created_by_type,
            notes
          ) VALUES (
            ${order.id},
            null,
            'pending',
            ${authResult.user!.id},
            'user',
            'Pedido criado através do checkout'
          )
        `;

        // 9. Adicionar email à fila
        await sql`
          INSERT INTO email_queue (
            to_email,
            to_name,
            subject,
            template,
            template_data
          ) VALUES (
            ${authResult.user!.email},
            ${authResult.user!.name},
            ${`Pedido ${orderNumber} criado - Marketplace GDG`},
            'order_created',
            ${JSON.stringify({
              order_number: orderNumber,
              total: total,
              payment_method: orderData.paymentMethod,
              items_count: orderItems.length
            })}
          )
        `;

        console.log('✅ create-order: Pedido criado com sucesso!');

        // Retornar resultado (transação será commitada automaticamente)
        return {
          order: {
            id: order.id,
            orderNumber: order.order_number,
            total: parseFloat(order.total),
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: orderData.paymentMethod,
            createdAt: order.created_at
          },
          totals: {
            subtotal,
            shipping: shippingCost,
            discount,
            total
          },
          items: orderItems.map(item => ({
            productId: item.productId,
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.totalPrice
          }))
        };
      }); // Transação será commitada automaticamente aqui
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Retornar erro específico se for uma validação
    if (errorMessage.includes('Produto') || errorMessage.includes('Cupom') || errorMessage.includes('Estoque')) {
      return json({
        success: false,
        error: { message: errorMessage }
      }, { status: 400 });
    }

    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 