import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ url, platform, cookies }) => {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return json({ success: false, error: authResult.error }, { status: 401 });
    }

    // Parâmetros de paginação e filtros
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    const status = url.searchParams.get('status');
    const paymentStatus = url.searchParams.get('paymentStatus');
    const orderBy = url.searchParams.get('orderBy') || 'created_at';
    const order = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;

    const result = await withDatabase(platform, async (db) => {
      // Contar total de pedidos
      let countQuery = `
        SELECT COUNT(*) as total
        FROM orders o
        WHERE o.user_id = $1
      `;
      
      const queryParams = [authResult.user!.id];
      let paramIndex = 1;
      
      if (status) {
        paramIndex++;
        countQuery += ` AND o.status = $${paramIndex}`;
        queryParams.push(status);
      }
      
      if (paymentStatus) {
        paramIndex++;
        countQuery += ` AND o.payment_status = $${paramIndex}`;
        queryParams.push(paymentStatus);
      }

      const countResult = await db.queryOne(countQuery, queryParams);
      const total = parseInt(countResult.total);

      // Buscar pedidos com paginação
      let ordersQuery = `
        SELECT 
          o.id,
          o.order_number,
          o.status,
          o.payment_status,
          o.payment_method,
          o.subtotal,
          o.shipping_cost,
          o.discount_amount,
          o.total,
          o.shipping_address,
          o.coupon_code,
          o.notes,
          o.created_at,
          o.updated_at,
          COUNT(oi.id) as items_count,
          p.id as payment_id,
          p.status as payment_status_detail,
          p.payment_data
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN payments p ON o.id = p.order_id
        WHERE o.user_id = $1
      `;

      const ordersParams = [authResult.user!.id];
      let ordersParamIndex = 1;

      if (status) {
        ordersParamIndex++;
        ordersQuery += ` AND o.status = $${ordersParamIndex}`;
        ordersParams.push(status);
      }
      
      if (paymentStatus) {
        ordersParamIndex++;
        ordersQuery += ` AND o.payment_status = $${ordersParamIndex}`;
        ordersParams.push(paymentStatus);
      }

      ordersQuery += ` GROUP BY o.id, p.id ORDER BY o.${orderBy} ${order}`;
      ordersParamIndex++;
      ordersQuery += ` LIMIT $${ordersParamIndex}`;
      ordersParams.push(limit.toString());
      ordersParamIndex++;
      ordersQuery += ` OFFSET $${ordersParamIndex}`;
      ordersParams.push(offset.toString());

      const orders = await db.query(ordersQuery, ordersParams);

      // Buscar itens para cada pedido
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await db.query`
            SELECT 
              oi.id,
              oi.product_id,
              oi.quantity,
              oi.price,
              oi.total,
              oi.status,
              p.name as product_name,
              p.images as product_images
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ${order.id}
            ORDER BY oi.created_at
          `;

          return {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
            paymentStatus: order.payment_status,
            paymentMethod: order.payment_method,
            totals: {
              subtotal: parseFloat(order.subtotal),
              shipping: parseFloat(order.shipping_cost || 0),
              discount: parseFloat(order.discount_amount || 0),
              total: parseFloat(order.total)
            },
            shippingAddress: order.shipping_address,
            couponCode: order.coupon_code,
            notes: order.notes,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            itemsCount: parseInt(order.items_count),
            items: items.map(item => ({
              id: item.id,
              productId: item.product_id,
              productName: item.product_name,
              quantity: item.quantity,
              price: parseFloat(item.price),
              total: parseFloat(item.total),
              status: item.status,
              image: item.product_images?.[0] || null
            })),
            payment: order.payment_id ? {
              id: order.payment_id,
              status: order.payment_status_detail,
              data: order.payment_data
            } : null
          };
        })
      );

      return {
        orders: ordersWithItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: {
          status,
          paymentStatus,
          orderBy,
          order
        }
      };
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 