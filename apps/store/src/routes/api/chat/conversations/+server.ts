import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  try {
    // Verificar autenticação usando helper padrão
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return error(401, 'Usuário não autenticado');
    }

    const userId = authResult.user!.id;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status') || 'active';

    const result = await withDatabase(platform, async (db) => {
      // Construir query com filtros
      let whereConditions = [`$1 = ANY(c.participants)`, `c.status = $2`];
      let params = [userId, status];
      let paramIndex = 3;

      if (type) {
        whereConditions.push(`c.type = $${paramIndex}`);
        params.push(type);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Buscar conversas com última mensagem
      const conversationsQuery = `
        SELECT 
          c.id,
          c.type,
          c.title,
          c.participants,
          c.order_id,
          c.seller_id,
          c.status,
          c.created_at,
          c.last_message_at,
          (
            SELECT json_build_object(
              'content', m.content,
              'sender_name', u.name,
              'created_at', m.created_at
            )
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT COUNT(*)
            FROM chat_messages m
            LEFT JOIN chat_message_reads r ON m.id = r.message_id AND r.user_id = $1
            WHERE m.conversation_id = c.id 
            AND m.sender_id != $1
            AND r.id IS NULL
          ) as unread_count
        FROM chat_conversations c
        WHERE ${whereClause}
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit.toString(), ((page - 1) * limit).toString());

      // Buscar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM chat_conversations c
        WHERE ${whereClause}
      `;

      const [conversations, countResult] = await Promise.all([
        db.client.unsafe(conversationsQuery, params),
        db.client.unsafe(countQuery, params.slice(0, -2)) // Remove limit e offset
      ]);

      const total = parseInt(countResult[0]?.total || '0');

      return {
        conversations: conversations || [],
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    });

    console.log(`✅ Conversas carregadas: ${result.conversations.length} para usuário ${userId}`);

    return json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('Erro ao buscar conversas:', err);
    return error(500, 'Erro interno do servidor');
  }
};

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return error(401, 'Usuário não autenticado');
    }

    const userId = authResult.user!.id;
    const { type, title, participants, order_id, seller_id } = await request.json();

    if (!type || !participants || participants.length === 0) {
      return error(400, 'Dados incompletos para criar conversa');
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar se já existe uma conversa similar
      let existingQuery = `
        SELECT id FROM chat_conversations
        WHERE type = $1
        AND $2 = ANY(participants)
        AND status = 'active'
      `;
      let existingParams = [type, userId];
      let paramIndex = 3;

      if (order_id) {
        existingQuery += ` AND order_id = $${paramIndex}`;
        existingParams.push(order_id);
        paramIndex++;
      }

      if (seller_id) {
        existingQuery += ` AND seller_id = $${paramIndex}`;
        existingParams.push(seller_id);
        paramIndex++;
      }

      existingQuery += ' LIMIT 1';

      const existing = await db.client.unsafe(existingQuery, existingParams);

      if (existing && existing.length > 0) {
        return {
          conversation_id: existing[0].id,
          message: 'Conversa já existe'
        };
      }

      // Criar nova conversa
      const newConversation = await db.client.unsafe(`
        INSERT INTO chat_conversations (
          type, title, participants, order_id, seller_id, created_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `, [type, title || `Conversa ${type}`, participants, order_id, seller_id, userId]);

      if (newConversation && newConversation.length > 0) {
        console.log('✅ Nova conversa criada no banco');
        return {
          conversation: newConversation[0],
          message: 'Conversa criada com sucesso'
        };
      }

      throw new Error('Falha ao criar conversa');
    });

    return json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('Erro ao criar conversa:', err);
    return error(500, 'Erro interno do servidor');
  }
}; 