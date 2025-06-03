import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar envios
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const carrier = url.searchParams.get('carrier') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(s.tracking_code ILIKE $${paramIndex} OR o.order_number ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`s.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (carrier !== 'all') {
      conditions.push(`s.carrier = $${paramIndex}`);
      params.push(carrier);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      SELECT 
        s.id, s.tracking_code, s.carrier, s.status, s.shipping_cost,
        s.estimated_delivery, s.actual_delivery, s.notes,
        s.created_at, s.updated_at,
        o.id as order_id, o.order_number, o.total_amount,
        u.id as user_id, u.name as user_name, u.email as user_email,
        sa.street, sa.number, sa.complement, sa.neighborhood,
        sa.city, sa.state, sa.postal_code, sa.country,
        COUNT(*) OVER() as total_count
      FROM shipments s
      INNER JOIN orders o ON o.id = s.order_id
      INNER JOIN users u ON u.id = o.user_id
      LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const shipments = await db.query(query, ...params);
    const totalCount = shipments[0]?.total_count || 0;
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
        COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        AVG(shipping_cost) as avg_cost,
        COUNT(*) FILTER (WHERE carrier = 'correios') as correios,
        COUNT(*) FILTER (WHERE carrier = 'fedex') as fedex,
        COUNT(*) FILTER (WHERE carrier = 'dhl') as dhl
      FROM shipments
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        shipments: shipments.map((s: any) => ({
          id: s.id,
          trackingCode: s.tracking_code,
          carrier: s.carrier,
          status: s.status,
          shippingCost: Number(s.shipping_cost || 0),
          estimatedDelivery: s.estimated_delivery,
          actualDelivery: s.actual_delivery,
          notes: s.notes,
          order: {
            id: s.order_id,
            orderNumber: s.order_number,
            totalAmount: Number(s.total_amount)
          },
          user: {
            id: s.user_id,
            name: s.user_name,
            email: s.user_email
          },
          address: {
            street: s.street,
            number: s.number,
            complement: s.complement,
            neighborhood: s.neighborhood,
            city: s.city,
            state: s.state,
            postalCode: s.postal_code,
            country: s.country
          },
          createdAt: s.created_at,
          updatedAt: s.updated_at
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
          shipped: stats.shipped || 0,
          inTransit: stats.in_transit || 0,
          delivered: stats.delivered || 0,
          failed: stats.failed || 0,
          averageCost: Number(stats.avg_cost || 0),
          carriers: {
            correios: stats.correios || 0,
            fedex: stats.fedex || 0,
            dhl: stats.dhl || 0
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return json({
      success: false,
      error: 'Erro ao buscar envios'
    }, { status: 500 });
  }
};

// POST - Criar envio
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.orderId || !data.carrier) {
      return json({
        success: false,
        error: 'ID do pedido e transportadora são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar se pedido existe e não tem envio
    const [order] = await db.query`
      SELECT o.id, s.id as shipment_id
      FROM orders o
      LEFT JOIN shipments s ON s.order_id = o.id
      WHERE o.id = ${data.orderId}
    `;
    
    if (!order) {
      await db.close();
      return json({
        success: false,
        error: 'Pedido não encontrado'
      }, { status: 404 });
    }
    
    if (order.shipment_id) {
      await db.close();
      return json({
        success: false,
        error: 'Pedido já possui envio cadastrado'
      }, { status: 400 });
    }
    
    // Inserir envio
    const [shipment] = await db.query`
      INSERT INTO shipments (
        order_id, tracking_code, carrier, status,
        shipping_cost, estimated_delivery, notes
      ) VALUES (
        ${data.orderId}, ${data.trackingCode || null}, ${data.carrier},
        ${data.status || 'pending'}, ${data.shippingCost || 0},
        ${data.estimatedDelivery || null}, ${data.notes || null}
      ) RETURNING id
    `;
    
    // Atualizar status do pedido
    await db.query`
      UPDATE orders SET
        status = 'shipped',
        updated_at = NOW()
      WHERE id = ${data.orderId}
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: shipment.id,
        message: 'Envio criado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating shipment:', error);
    return json({
      success: false,
      error: 'Erro ao criar envio'
    }, { status: 500 });
  }
};

// PUT - Atualizar envio
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID do envio é obrigatório'
      }, { status: 400 });
    }
    
    // Preparar campos de update
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (data.trackingCode !== undefined) {
      updates.push(`tracking_code = $${paramIndex}`);
      params.push(data.trackingCode);
      paramIndex++;
    }
    
    if (data.carrier) {
      updates.push(`carrier = $${paramIndex}`);
      params.push(data.carrier);
      paramIndex++;
    }
    
    if (data.status) {
      updates.push(`status = $${paramIndex}`);
      params.push(data.status);
      paramIndex++;
    }
    
    if (data.shippingCost !== undefined) {
      updates.push(`shipping_cost = $${paramIndex}`);
      params.push(data.shippingCost);
      paramIndex++;
    }
    
    if (data.estimatedDelivery !== undefined) {
      updates.push(`estimated_delivery = $${paramIndex}`);
      params.push(data.estimatedDelivery);
      paramIndex++;
    }
    
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(data.notes);
      paramIndex++;
    }
    
    // Se status mudou para entregue, registrar data
    if (data.status === 'delivered') {
      updates.push('actual_delivery = NOW()');
    }
    
    updates.push('updated_at = NOW()');
    params.push(data.id);
    
    const query = `
      UPDATE shipments 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    await db.query(query, ...params);
    
    // Se entregue, atualizar pedido
    if (data.status === 'delivered') {
      const [shipment] = await db.query`
        SELECT order_id FROM shipments WHERE id = ${data.id}
      `;
      
      if (shipment) {
        await db.query`
          UPDATE orders SET
            status = 'completed',
            updated_at = NOW()
          WHERE id = ${shipment.order_id}
        `;
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Envio atualizado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating shipment:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar envio'
    }, { status: 500 });
  }
}; 