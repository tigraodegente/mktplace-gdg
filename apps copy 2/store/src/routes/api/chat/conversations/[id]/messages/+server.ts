import { json, error } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ params, url, cookies, platform }) => {
  try {
    console.log('💬 Chat Messages GET - Estratégia híbrida iniciada');
    
    const { id: conversationId } = params;
    
    // Verificar autenticação usando helper padrão
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return error(401, 'Usuário não autenticado');
    }

    const userId = authResult.user!.id;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    // Tentar buscar mensagens com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        // Verificar acesso à conversa
        const accessCheck = await db.query`
        SELECT id FROM chat_conversations
          WHERE id = ${conversationId} AND ${userId} = ANY(participants)
          LIMIT 1
        `;

        if (!accessCheck.length) {
        throw new Error('Sem acesso a esta conversa');
      }

        // Buscar mensagens (simplificado)
        const messages = await db.query`
          SELECT m.id, m.conversation_id, m.sender_id, m.message_type,
                 m.content, m.attachments, m.metadata, m.created_at,
                 u.name as sender_name, u.avatar as sender_avatar
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
          WHERE m.conversation_id = ${conversationId}
        ORDER BY m.created_at ASC
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        `;

      // Formatar mensagens
      const formattedMessages = messages.map((msg: any) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        sender_avatar: msg.sender_avatar || '/api/placeholder/40/40',
        message_type: msg.message_type,
        content: msg.content,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        metadata: typeof msg.metadata === 'object' ? msg.metadata : {},
          is_own_message: msg.sender_id === userId,
        created_at: msg.created_at
      }));

      return {
        messages: formattedMessages,
        pagination: {
          page,
          limit,
            total: formattedMessages.length,
            pages: Math.ceil(formattedMessages.length / limit)
        }
      };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
    });

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    return json({
      success: true,
        data: result,
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro messages GET: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar as mensagens',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (err) {
    console.error('❌ Erro crítico messages GET:', err);
    return error(500, 'Erro interno do servidor');
  }
};

export const POST: RequestHandler = async ({ params, request, cookies, platform }) => {
  try {
    console.log('💬 Chat Messages POST - Estratégia híbrida iniciada');
    
    const { id: conversationId } = params;
    
    // Verificar autenticação
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return error(401, 'Usuário não autenticado');
    }

    const userId = authResult.user!.id;
    const { message_type = 'text', content, attachments = [], metadata = {} } = await request.json();

    if (!content || content.trim() === '') {
      return error(400, 'Conteúdo da mensagem é obrigatório');
    }

    // Tentar criar mensagem com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        // Verificar acesso
        const accessCheck = await db.query`
        SELECT id FROM chat_conversations
          WHERE id = ${conversationId} AND ${userId} = ANY(participants)
          LIMIT 1
        `;

        if (!accessCheck.length) {
        throw new Error('Sem acesso a esta conversa');
      }

      // Inserir nova mensagem
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newMessages = await db.query`
        INSERT INTO chat_messages (
            id, conversation_id, sender_id, message_type, content, 
            attachments, metadata, created_at
          ) VALUES (
            ${messageId}, ${conversationId}, ${userId}, ${message_type}, 
            ${content}, ${JSON.stringify(attachments)}, ${JSON.stringify(metadata)}, 
            NOW()
          )
        RETURNING *
        `;

        const message = newMessages[0];

        return {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          sender_name: 'Você',
          sender_avatar: '/api/placeholder/40/40',
          message_type: message.message_type,
          content: message.content,
          attachments: attachments,
          metadata: metadata,
          is_own_message: true,
          created_at: message.created_at
        };
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
    });

      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    return json({
      success: true,
      data: result,
        message: 'Mensagem enviada com sucesso',
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro messages POST: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível enviar a mensagem',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (err) {
    console.error('❌ Erro crítico messages POST:', err);
    return error(500, 'Erro interno do servidor');
  }
}; 