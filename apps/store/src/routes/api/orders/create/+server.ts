import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

interface OrderCreateRequest {
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    seller_id: string;
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

    const result = await withDatabase(platform, async (db) => {
      console.log('🔄 Iniciando criação de pedido...');

      // 1. Validar e reservar estoque de todos os produtos
      const stockValidation = await validateAndReserveStock(db, body.items);
      if (!stockValidation.success) {
        throw new Error(`STOCK_ERROR: ${stockValidation.error}`);
      }

      // 2. Calcular totais
      const totals = await calculateOrderTotals(db, body.items, body.coupon_code);

      // 3. Gerar número do pedido único
      const orderNumber = await generateOrderNumber(db);

      // 4. Validar/criar usuário se for guest
      const userId = await validateOrCreateUser(db, body.user_id);

      // 5. Criar o pedido principal
      const orderResult = await db.query`
        INSERT INTO orders (
          user_id, order_number, status, payment_status, payment_method,
          subtotal, shipping_cost, discount_amount, total,
          shipping_address, billing_address, notes, metadata,
          created_at, updated_at
        ) VALUES (
          ${userId}, ${orderNumber}, 'pending', 'pending', ${body.payment_method},
          ${totals.subtotal}, ${totals.shipping}, ${totals.discount}, ${totals.total},
          ${JSON.stringify(body.shipping_address)}, ${JSON.stringify(body.billing_address || null)}, 
          ${body.notes || null}, ${JSON.stringify({ installments: body.installments || 1 })},
          NOW(), NOW()
        )
        RETURNING id, order_number, total, status
      `;

      const order = orderResult[0];
      console.log(`✅ Pedido criado: ${order.order_number}`);

      // 6. Criar itens do pedido
      for (const item of body.items) {
        await db.query`
          INSERT INTO order_items (
            order_id, product_id, seller_id, quantity, price, total,
            created_at
          ) VALUES (
            ${order.id}, ${item.product_id}, ${item.seller_id}, 
            ${item.quantity}, ${item.price}, ${item.quantity * item.price},
            NOW()
          )
        `;
      }

      // 7. Atualizar estoque definitivamente
      await updateProductStock(db, body.items);

      // 8. Registrar movimentações de estoque
      await recordStockMovements(db, body.items, order.id, 'order_created');

      // 9. Aplicar cupom se fornecido
      if (body.coupon_code) {
        await applyCouponToOrder(db, order.id, body.coupon_code, totals.discount);
      }

      console.log(`🎉 Pedido ${order.order_number} criado com sucesso!`);

      return {
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          total: order.total,
          status: order.status
        }
      };
    });

    return json(result as OrderResponse);

  } catch (err: any) {
    console.error('❌ Erro ao criar pedido:', err);
    
    // Tratar diferentes tipos de erro
    if (err.message.startsWith('STOCK_ERROR:')) {
      return json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: err.message.replace('STOCK_ERROR: ', ''),
        }
      } as OrderResponse, { status: 400 });
    }

    return json({
      success: false,
      error: {
        code: 'ORDER_CREATION_FAILED',
        message: 'Erro interno do servidor. Tente novamente.',
        details: err.message
      }
    } as OrderResponse, { status: 500 });
  }
};

// ===== FUNÇÕES AUXILIARES =====

async function validateAndReserveStock(db: any, items: OrderCreateRequest['items']) {
  
  for (const item of items) {
    // Buscar produto para validação de estoque
    const productResult = await db.query`
      SELECT id, name, quantity, track_inventory, allow_backorder
      FROM products 
      WHERE id = ${item.product_id}
    `;

    if (productResult.length === 0) {
      return {
        success: false,
        error: `Produto não encontrado: ${item.product_id}`
      };
    }

    const product = productResult[0];

    // Verificar se controla estoque
    if (product.track_inventory) {
      if (product.quantity < item.quantity) {
        if (!product.allow_backorder) {
          return {
            success: false,
            error: `Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}, Solicitado: ${item.quantity}`
          };
        }
      }
    }
  }

  return { success: true };
}

async function calculateOrderTotals(db: any, items: OrderCreateRequest['items'], couponCode?: string) {
  let subtotal = 0;

  // Calcular subtotal
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }

  // TODO: Calcular frete real aqui
  const shipping = 0; // Por enquanto grátis

  // Calcular desconto do cupom
  let discount = 0;
  if (couponCode) {
    discount = await calculateCouponDiscount(db, couponCode, subtotal);
  }

  const total = subtotal + shipping - discount;

  return {
    subtotal,
    shipping,
    discount,
    total
  };
}

async function generateOrderNumber(db: any): Promise<string> {
  const prefix = 'ORD';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

async function updateProductStock(db: any, items: OrderCreateRequest['items']) {
  console.log('📦 Atualizando estoque...');
  
  for (const item of items) {
    await db.query`
      UPDATE products 
      SET 
        quantity = quantity - ${item.quantity},
        updated_at = NOW()
      WHERE id = ${item.product_id}
      AND track_inventory = true
    `;
  }
}

async function recordStockMovements(db: any, items: OrderCreateRequest['items'], orderId: string, reason: string) {
  console.log('📝 Registrando movimentações...');
  
  for (const item of items) {
    await db.query`
      INSERT INTO stock_movements (
        product_id, type, quantity, reason, reference_id, created_at
      ) VALUES (
        ${item.product_id}, 'out', ${item.quantity}, 
        ${reason}, ${orderId}, NOW()
      )
    `;
  }
}

async function calculateCouponDiscount(db: any, couponCode: string, subtotal: number): Promise<number> {
  // TODO: Implementar lógica de cupons
  return 0;
}

async function applyCouponToOrder(db: any, orderId: string, couponCode: string, discount: number) {
  // TODO: Implementar aplicação de cupom
}

async function validateOrCreateUser(db: any, userId: string): Promise<string> {
  // Se for guest-user, criar um usuário temporário
  if (userId === 'guest-user' || !userId) {
    const guestResult = await db.query`
      INSERT INTO users (
        name, email, password_hash, created_at, updated_at
      ) VALUES (
        'Usuário Convidado', 'guest@temp.com', 'temp-guest-hash', NOW(), NOW()
      )
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `;
    
    return guestResult[0].id;
  }

  // Verificar se o usuário existe
  const userCheck = await db.query`
    SELECT id FROM users WHERE id = ${userId}
  `;

  if (userCheck.length === 0) {
    // Se o usuário não existe, criar um usuário guest
    const newUserResult = await db.query`
      INSERT INTO users (
        name, email, password_hash, created_at, updated_at
      ) VALUES (
        'Usuário Convidado', 'guest-' || gen_random_uuid()::text || '@temp.com', 'temp-guest-hash', NOW(), NOW()
      )
      RETURNING id
    `;
    
    return newUserResult[0].id;
  }

  return userId;
} 