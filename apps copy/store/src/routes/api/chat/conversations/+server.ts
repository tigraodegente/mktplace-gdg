import { json, error } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  try {
    console.log('💬 Chat Conversations GET - Estratégia híbrida iniciada');
    
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

    // Tentar buscar conversas com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar conversas básicas (simplificado)
        let baseQuery = `
          SELECT id, type, title, participants, order_id, seller_id,
                 status, created_at, last_message_at
          FROM chat_conversations
          WHERE $1 = ANY(participants) AND status = $2
        `;
        let queryParams = [userId, status];
      let paramIndex = 3;

      if (type) {
          baseQuery += ` AND type = $${paramIndex}`;
          queryParams.push(type);
        paramIndex++;
      }

        baseQuery += ` ORDER BY last_message_at DESC NULLS LAST, created_at DESC
                       LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

        const conversations = await db.query(baseQuery, ...queryParams);

        // STEP 2: Para cada conversa, buscar dados adicionais (simplificado)
        const enrichedConversations = [];
        for (const conv of conversations) {
          try {
            // Última mensagem
            const lastMessages = await db.query`
              SELECT m.content, m.created_at, u.name as sender_name
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
              WHERE m.conversation_id = ${conv.id}
            ORDER BY m.created_at DESC
            LIMIT 1
            `;

            // Contagem não lidas  
            const unreadCounts = await db.query`
              SELECT COUNT(*) as unread
            FROM chat_messages m
              LEFT JOIN chat_message_reads r ON m.id = r.message_id AND r.user_id = ${userId}
              WHERE m.conversation_id = ${conv.id} AND m.sender_id != ${userId} AND r.id IS NULL
            `;

            enrichedConversations.push({
              ...conv,
              last_message: lastMessages[0] || null,
              unread_count: parseInt(unreadCounts[0]?.unread || '0')
            });
          } catch (e) {
            // Adicionar com dados básicos se der erro
            enrichedConversations.push({
              ...conv,
              last_message: null,
              unread_count: 0
            });
          }
        }

      return {
          conversations: enrichedConversations,
        pagination: {
          page,
          limit,
            total: enrichedConversations.length,
            pages: Math.ceil(enrichedConversations.length / limit)
        }
      };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
    });

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Conversas carregadas: ${result.conversations.length}`);

    return json({
      success: true,
        data: result,
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro conversations GET: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar as conversas',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (err) {
    console.error('❌ Erro crítico conversations GET:', err);
    return error(500, 'Erro interno do servidor');
  }
};

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    console.log('💬 Chat Conversations POST - Estratégia híbrida iniciada');
    
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

    // Tentar criar conversa com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 2 segundos
      const queryPromise = (async () => {
        // STEP 1: Verificar se já existe conversa similar (simplificado)
        let checkQuery = `
        SELECT id FROM chat_conversations
          WHERE type = $1 AND $2 = ANY(participants) AND status = 'active'
      `;
        let checkParams = [type, userId];

      if (order_id) {
          checkQuery += ` AND order_id = $3`;
          checkParams.push(order_id);
      }

        checkQuery += ' LIMIT 1';

        const existing = await db.query(checkQuery, ...checkParams);

        if (existing.length > 0) {
        return {
          conversation_id: existing[0].id,
          message: 'Conversa já existe'
        };
      }

        // STEP 2: Criar nova conversa
        const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newConversations = await db.query`
        INSERT INTO chat_conversations (
            id, type, title, participants, order_id, seller_id, 
            created_by, status, created_at
          ) VALUES (
            ${conversationId}, ${type}, ${title || `Conversa ${type}`}, 
            ${participants}, ${order_id}, ${seller_id}, ${userId}, 
            'active', NOW()
          )
        RETURNING *
        `;

        return {
          conversation: newConversations[0],
          message: 'Conversa criada com sucesso'
        };
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
    });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    return json({
      success: true,
        data: result,
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro conversations POST: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível criar a conversa',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (err) {
    console.error('❌ Erro crítico conversations POST:', err);
    return error(500, 'Erro interno do servidor');
  }
}; 