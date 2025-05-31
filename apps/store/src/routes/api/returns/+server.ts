import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    // Verificar autenticação
    const userId = await getUserFromRequest(platform, url);
    if (!userId) {
      return error(401, 'Usuário não autenticado');
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');

    const result = await withDatabase(platform, async (db) => {
      // Query base para devoluções
      let query = `
        SELECT 
          r.id,
          r.order_id,
          r.status,
          r.reason,
          r.description,
          r.refund_amount,
          r.return_number,
          r.created_at,
          r.updated_at,
          o.order_number,
          oi.product_id,
          oi.product_name,
          oi.product_image,
          oi.quantity,
          oi.price
        FROM returns r
        INNER JOIN orders o ON o.id = r.order_id
        INNER JOIN order_items oi ON oi.order_id = o.id
        WHERE r.user_id = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;

      // Filtros opcionais
      if (status) {
        query += ` AND r.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY r.created_at DESC`;

      // Count total
      const countQuery = `
        SELECT COUNT(DISTINCT r.id) as total 
        FROM returns r 
        WHERE r.user_id = $1 
        ${status ? ` AND r.status = $2` : ''}
      `;
      const countParams = status ? [userId, status] : [userId];
      
      const [countResult, returnsResult] = await Promise.all([
        db.query(countQuery, countParams),
        db.query(query + ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params)
      ]);

      const total = parseInt(countResult[0]?.total || '0');
      
      // Agrupar produtos por devolução
      const returnsMap = new Map();
      
      returnsResult.forEach((row: any) => {
        if (!returnsMap.has(row.id)) {
          returnsMap.set(row.id, {
            id: row.id,
            order_id: row.order_id,
            order_number: row.order_number,
            return_number: row.return_number,
            status: row.status,
            reason: row.reason,
            description: row.description,
            refund_amount: parseFloat(row.refund_amount || '0'),
            created_at: row.created_at,
            updated_at: row.updated_at,
            items: []
          });
        }
        
        returnsMap.get(row.id).items.push({
          product_id: row.product_id,
          product_name: row.product_name,
          product_image: row.product_image,
          quantity: parseInt(row.quantity),
          price: parseFloat(row.price)
        });
      });

      const returns = Array.from(returnsMap.values());

      return {
        success: true,
        data: {
          returns,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    });

    return json(result);

  } catch (err) {
    console.error('❌ Erro ao buscar devoluções:', err);
    return error(500, 'Erro interno do servidor');
  }
};

export const POST: RequestHandler = async ({ request, platform, url }) => {
  try {
    // Verificar autenticação
    const userId = await getUserFromRequest(platform, url);
    if (!userId) {
      return error(401, 'Usuário não autenticado');
    }

    const { order_id, reason, description, items, refund_type } = await request.json();

    if (!order_id || !reason || !items || items.length === 0) {
      return error(400, 'Order ID, motivo e itens são obrigatórios');
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar se o pedido pertence ao usuário
      const orderCheck = await db.query(`
        SELECT id, total_amount FROM orders 
        WHERE id = $1 AND user_id = $2
      `, [order_id, userId]);

      if (orderCheck.length === 0) {
        throw new Error('Pedido não encontrado ou não autorizado');
      }

      // Calcular valor do reembolso
      const refundAmount = items.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.price) * parseInt(item.quantity)), 0
      );

      // Gerar número da devolução
      const returnNumber = `DV${Date.now().toString().slice(-6)}`;

      // Criar devolução
      const returnInsert = await db.query(`
        INSERT INTO returns (
          user_id, order_id, return_number, status, reason, 
          description, refund_amount, refund_type, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, return_number, status, created_at
      `, [
        userId,
        order_id,
        returnNumber,
        'requested',
        reason,
        description || '',
        refundAmount,
        refund_type || 'original_payment'
      ]);

      const returnRecord = returnInsert[0];

      // Criar itens da devolução
      for (const item of items) {
        await db.query(`
          INSERT INTO return_items (
            return_id, product_id, quantity, price, reason, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          returnRecord.id,
          item.product_id,
          item.quantity,
          item.price,
          item.item_reason || reason
        ]);
      }

      return {
        success: true,
        data: {
          id: returnRecord.id,
          return_number: returnRecord.return_number,
          status: returnRecord.status,
          refund_amount: refundAmount,
          created_at: returnRecord.created_at
        },
        message: 'Devolução solicitada com sucesso'
      };
    });

    return json(result);

  } catch (err) {
    console.error('❌ Erro ao criar devolução:', err);
    return error(500, err instanceof Error ? err.message : 'Erro interno do servidor');
  }
};

// Função auxiliar para extrair usuário da requisição
async function getUserFromRequest(platform: any, url: URL): Promise<string | null> {
  try {
    // Verificar com API de autenticação interna
    const authResponse = await fetch(`${url.origin}/api/auth/me`, {
      headers: {
        'Cookie': url.searchParams.get('cookie') || ''
      }
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      return authData.success ? authData.data?.user?.id : null;
    }

    return null;
  } catch {
    return null;
  }
} 