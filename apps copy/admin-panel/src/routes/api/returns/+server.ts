import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar devoluções
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const reason = url.searchParams.get('reason') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(o.order_number ILIKE $${paramIndex} OR p.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`r.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (reason !== 'all') {
      conditions.push(`r.reason = $${paramIndex}`);
      params.push(reason);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      SELECT 
        r.id, r.reason, r.description, r.status, r.refund_amount,
        r.admin_notes, r.created_at, r.updated_at, r.processed_at,
        o.id as order_id, o.order_number, o.total_amount as order_total,
        oi.id as order_item_id, oi.quantity as ordered_quantity, 
        oi.price as item_price, oi.quantity as returned_quantity,
        p.id as product_id, p.name as product_name, p.slug as product_slug,
        u.id as user_id, u.name as user_name, u.email as user_email,
        COUNT(*) OVER() as total_count
      FROM returns r
      INNER JOIN order_items oi ON oi.id = r.order_item_id
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      INNER JOIN users u ON u.id = o.user_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const returns = await db.query(query, ...params);
    const totalCount = returns[0]?.total_count || 0;
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded,
        COALESCE(SUM(refund_amount), 0) as total_refunded,
        COUNT(*) FILTER (WHERE reason = 'defective') as defective,
        COUNT(*) FILTER (WHERE reason = 'not_as_described') as not_as_described,
        COUNT(*) FILTER (WHERE reason = 'changed_mind') as changed_mind,
        COUNT(*) FILTER (WHERE reason = 'damaged') as damaged
      FROM returns
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        returns: returns.map((r: any) => ({
          id: r.id,
          reason: r.reason,
          description: r.description,
          status: r.status,
          refundAmount: Number(r.refund_amount || 0),
          adminNotes: r.admin_notes,
          order: {
            id: r.order_id,
            orderNumber: r.order_number,
            totalAmount: Number(r.order_total)
          },
          orderItem: {
            id: r.order_item_id,
            orderedQuantity: r.ordered_quantity,
            returnedQuantity: r.returned_quantity,
            itemPrice: Number(r.item_price)
          },
          product: {
            id: r.product_id,
            name: r.product_name,
            slug: r.product_slug
          },
          user: {
            id: r.user_id,
            name: r.user_name,
            email: r.user_email
          },
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          processedAt: r.processed_at
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
          approved: stats.approved || 0,
          rejected: stats.rejected || 0,
          refunded: stats.refunded || 0,
          totalRefunded: Number(stats.total_refunded || 0),
          reasons: {
            defective: stats.defective || 0,
            notAsDescribed: stats.not_as_described || 0,
            changedMind: stats.changed_mind || 0,
            damaged: stats.damaged || 0
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching returns:', error);
    return json({
      success: false,
      error: 'Erro ao buscar devoluções'
    }, { status: 500 });
  }
};

// PUT - Processar devolução
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id || !data.status) {
      return json({
        success: false,
        error: 'ID e status da devolução são obrigatórios'
      }, { status: 400 });
    }
    
    // Preparar campos de update
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    updates.push(`status = $${paramIndex}`);
    params.push(data.status);
    paramIndex++;
    
    if (data.adminNotes) {
      updates.push(`admin_notes = $${paramIndex}`);
      params.push(data.adminNotes);
      paramIndex++;
    }
    
    if (data.refundAmount !== undefined) {
      updates.push(`refund_amount = $${paramIndex}`);
      params.push(data.refundAmount);
      paramIndex++;
    }
    
    if (data.status !== 'pending') {
      updates.push('processed_at = NOW()');
    }
    
    updates.push('updated_at = NOW()');
    params.push(data.id);
    
    const query = `
      UPDATE returns 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    await db.query(query, ...params);
    
    // Se aprovado, pode atualizar estoque
    if (data.status === 'approved' && data.restoreStock) {
      const [returnInfo] = await db.query`
        SELECT oi.product_id, oi.quantity
        FROM returns r
        INNER JOIN order_items oi ON oi.id = r.order_item_id
        WHERE r.id = ${data.id}
      `;
      
      if (returnInfo) {
        await db.query`
          UPDATE products 
          SET quantity = quantity + ${returnInfo.quantity}
          WHERE id = ${returnInfo.product_id}
        `;
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: `Devolução ${data.status === 'approved' ? 'aprovada' : data.status === 'rejected' ? 'rejeitada' : 'processada'} com sucesso`
      }
    });
    
  } catch (error) {
    console.error('Error processing return:', error);
    return json({
      success: false,
      error: 'Erro ao processar devolução'
    }, { status: 500 });
  }
};

// DELETE - Excluir devolução
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da devolução é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se pode ser excluída (apenas pendentes)
    const [returnStatus] = await db.query`
      SELECT status FROM returns WHERE id = ${id}
    `;
    
    if (!returnStatus) {
      await db.close();
      return json({
        success: false,
        error: 'Devolução não encontrada'
      }, { status: 404 });
    }
    
    if (returnStatus.status !== 'pending') {
      await db.close();
      return json({
        success: false,
        error: 'Apenas devoluções pendentes podem ser excluídas'
      }, { status: 400 });
    }
    
    // Excluir devolução
    await db.query`DELETE FROM returns WHERE id = ${id}`;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Devolução excluída com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error deleting return:', error);
    return json({
      success: false,
      error: 'Erro ao excluir devolução'
    }, { status: 500 });
  }
}; 