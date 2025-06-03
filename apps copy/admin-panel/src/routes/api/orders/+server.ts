import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar pedidos
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const vendorId = locals.user?.role === 'vendor' ? locals.user.seller_id : url.searchParams.get('vendor_id');
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(o.order_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`o.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (dateFrom) {
      conditions.push(`o.created_at >= $${paramIndex}`);
      params.push(new Date(dateFrom));
      paramIndex++;
    }
    
    if (dateTo) {
      conditions.push(`o.created_at <= $${paramIndex}`);
      params.push(new Date(dateTo));
      paramIndex++;
    }
    
    if (vendorId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM order_items oi 
        INNER JOIN products p ON p.id = oi.product_id 
        WHERE oi.order_id = o.id AND p.seller_id = $${paramIndex}
      )`);
      params.push(vendorId);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      WITH order_stats AS (
        SELECT 
          o.id,
          o.order_number,
          o.user_id,
          o.status,
          o.subtotal,
          o.shipping_cost,
          o.discount_amount,
          o.total,
          o.payment_method,
          o.payment_status,
          o.notes,
          o.created_at,
          o.updated_at,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          COUNT(*) OVER() as total_count,
          (
            SELECT COUNT(*) 
            FROM order_items oi 
            WHERE oi.order_id = o.id
          ) as item_count,
          (
            SELECT json_agg(
              json_build_object(
                'id', oi.id,
                'product_name', p.name,
                'product_image', pi.url,
                'quantity', oi.quantity,
                'price', oi.price,
                'total', oi.total
              )
            )
            FROM order_items oi
            INNER JOIN products p ON p.id = oi.product_id
            LEFT JOIN LATERAL (
              SELECT url FROM product_images 
              WHERE product_id = p.id 
              ORDER BY position ASC 
              LIMIT 1
            ) pi ON true
            WHERE oi.order_id = o.id
            LIMIT 3
          ) as items_preview
        FROM orders o
        INNER JOIN users c ON c.id = o.user_id
        ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT * FROM order_stats
    `;
    
    params.push(limit, offset);
    
    const orders = await db.query(query, ...params);
    const totalCount = orders[0]?.total_count || 0;
    
    // Buscar estatísticas gerais
    let statsQuery: string;
    let statsParams: any[] = [];
    
    if (vendorId) {
      statsQuery = `
        SELECT 
          COUNT(DISTINCT o.id) as total,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'pending') as pending,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'processing') as processing,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'shipped') as shipped,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as delivered,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') as completed,
          COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled') as cancelled,
          COALESCE(SUM(oi.total), 0) as total_revenue
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.id
        INNER JOIN products p ON p.id = oi.product_id
        WHERE p.seller_id = $1
      `;
      statsParams = [vendorId];
    } else {
      statsQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COALESCE(SUM(total), 0) as total_revenue
        FROM orders
      `;
    }
    
    const [stats] = await db.query(statsQuery, ...statsParams);
    
    await db.close();
    
    return json({
      success: true,
      data: {
        orders: orders.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          customer: {
            id: o.user_id,
            name: o.customer_name,
            email: o.customer_email,
            phone: o.customer_phone
          },
          status: o.status,
          paymentStatus: o.payment_status,
          paymentMethod: o.payment_method,
          subtotal: Number(o.subtotal),
          shippingCost: Number(o.shipping_cost),
          discount: Number(o.discount_amount),
          total: Number(o.total),
          itemCount: o.item_count || 0,
          itemsPreview: o.items_preview || [],
          notes: o.notes,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          total: stats.total || 0,
          pending: stats.pending || 0,
          processing: stats.processing || 0,
          shipped: stats.shipped || 0,
          delivered: stats.delivered || 0,
          completed: stats.completed || 0,
          cancelled: stats.cancelled || 0,
          totalRevenue: Number(stats.total_revenue || 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    return json({
      success: false,
      error: 'Erro ao buscar pedidos'
    }, { status: 500 });
  }
};

// POST - Criar pedido (geralmente vem do checkout da loja)
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações básicas
    if (!data.userId || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return json({
        success: false,
        error: 'Cliente e itens são obrigatórios'
      }, { status: 400 });
    }
    
    // Gerar número do pedido
    const orderNumber = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Calcular totais
    let subtotal = 0;
    for (const item of data.items) {
      subtotal += item.price * item.quantity;
    }
    
    const shippingCost = data.shippingCost || 0;
    const discountAmount = data.discountAmount || 0;
    const totalAmount = subtotal + shippingCost - discountAmount;
    
    // Criar pedido
    const [order] = await db.query`
      INSERT INTO orders (
        order_number, user_id, status,
        subtotal, shipping_cost, discount_amount, total_amount,
        payment_method, payment_status,
        shipping_method, shipping_status, shipping_address_id,
        notes
      ) VALUES (
        ${orderNumber}, ${data.userId}, 'pending',
        ${subtotal}, ${shippingCost}, ${discountAmount}, ${totalAmount},
        ${data.paymentMethod || 'pending'}, 'pending',
        ${data.shippingMethod || null}, 'pending', ${data.shippingAddressId || null},
        ${data.notes || null}
      ) RETURNING id
    `;
    
    // Inserir itens do pedido
    for (const item of data.items) {
      await db.query`
        INSERT INTO order_items (
          order_id, product_id, seller_id,
          quantity, price, total
        ) VALUES (
          ${order.id}, ${item.productId}, ${item.sellerId},
          ${item.quantity}, ${item.price}, ${item.price * item.quantity}
        )
      `;
      
      // Atualizar estoque
      await db.query`
        UPDATE products 
        SET quantity = quantity - ${item.quantity}
        WHERE id = ${item.productId} AND quantity >= ${item.quantity}
      `;
    }
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: order.id,
        orderNumber,
        message: 'Pedido criado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    return json({
      success: false,
      error: 'Erro ao criar pedido'
    }, { status: 500 });
  }
};

// PUT - Atualizar status do pedido
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id || !data.status) {
      return json({
        success: false,
        error: 'ID e status são obrigatórios'
      }, { status: 400 });
    }
    
    // Validar transição de status
    const validTransitions: Record<string, string[]> = {
      'pending': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'cancelled'],
      'delivered': ['completed'],
      'completed': [],
      'cancelled': []
    };
    
    const [currentOrder] = await db.query`
      SELECT status FROM orders WHERE id = ${data.id}
    `;
    
    if (!currentOrder) {
      await db.close();
      return json({
        success: false,
        error: 'Pedido não encontrado'
      }, { status: 404 });
    }
    
    const allowedStatuses = validTransitions[currentOrder.status] || [];
    if (!allowedStatuses.includes(data.status)) {
      await db.close();
      return json({
        success: false,
        error: `Não é possível mudar de ${currentOrder.status} para ${data.status}`
      }, { status: 400 });
    }
    
    // Atualizar status baseado no tipo
    if (data.status === 'shipped') {
      await db.query`
        UPDATE orders 
        SET 
          status = ${data.status},
          shipping_status = 'shipped',
          updated_at = NOW()
        WHERE id = ${data.id}
      `;
    } else if (data.status === 'delivered') {
      await db.query`
        UPDATE orders 
        SET 
          status = ${data.status},
          shipping_status = 'delivered',
          updated_at = NOW()
        WHERE id = ${data.id}
      `;
    } else if (data.status === 'completed') {
      await db.query`
        UPDATE orders 
        SET 
          status = ${data.status},
          payment_status = 'paid',
          updated_at = NOW()
        WHERE id = ${data.id}
      `;
    } else {
      await db.query`
        UPDATE orders 
        SET 
          status = ${data.status},
          updated_at = NOW()
        WHERE id = ${data.id}
      `;
    }
    
    // Registrar histórico
    await db.query`
      INSERT INTO order_status_history (
        order_id, status, notes, created_by
      ) VALUES (
        ${data.id}, ${data.status}, ${data.notes || null}, ${data.userId || null}
      )
    `;
    
    // Se cancelado, devolver estoque
    if (data.status === 'cancelled') {
      const items = await db.query`
        SELECT product_id, quantity 
        FROM order_items 
        WHERE order_id = ${data.id}
      `;
      
      for (const item of items) {
        await db.query`
          UPDATE products 
          SET quantity = quantity + ${item.quantity}
          WHERE id = ${item.product_id}
        `;
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Status do pedido atualizado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating order:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar pedido'
    }, { status: 500 });
  }
}; 