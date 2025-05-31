import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { requireAuth } from '$lib/utils/auth';

export const GET: RequestHandler = async ({ params, url, cookies, platform }) => {
  try {
    const { id: conversationId } = params;
    
    // Verificar autenticação usando helper padrão
    const authResult = await requireAuth(cookies, platform);
    if (!authResult.success) {
      return error(401, 'Usuário não autenticado');
    }

    const userId = authResult.user!.id;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const result = await withDatabase(platform, async (db) => {
      // Verificar se usuário tem acesso à conversa
      const accessCheck = await db.query(`
        SELECT id FROM chat_conversations
        WHERE id = $1 AND $2 = ANY(participants)
      `, [conversationId, userId]);

      if (!accessCheck || accessCheck.length === 0) {
        throw new Error('Sem acesso a esta conversa');
      }

      // Buscar mensagens
      const messagesQuery = `
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.message_type,
          m.content,
          m.attachments,
          m.metadata,
          m.created_at,
          u.name as sender_name,
          u.avatar as sender_avatar,
          CASE WHEN m.sender_id = $1 THEN true ELSE false END as is_own_message
        FROM chat_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $2
        ORDER BY m.created_at ASC
        LIMIT $3 OFFSET $4
      `;

      const [messages, countResult] = await Promise.all([
        db.query(messagesQuery, userId, conversationId, limit, (page - 1) * limit),
        db.query(`
          SELECT COUNT(*) as total
          FROM chat_messages
          WHERE conversation_id = $1
        `, conversationId)
      ]);

      const total = parseInt(countResult[0]?.total || '0');

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
        is_own_message: msg.is_own_message,
        created_at: msg.created_at
      }));

      // Marcar mensagens como lidas
      if (formattedMessages.length > 0) {
        await db.query(`
          INSERT INTO chat_message_reads (message_id, user_id)
          SELECT m.id, $1
          FROM chat_messages m
          LEFT JOIN chat_message_reads r ON m.id = r.message_id AND r.user_id = $1
          WHERE m.conversation_id = $2
          AND m.sender_id != $1
          AND r.id IS NULL
          ON CONFLICT (message_id, user_id) DO NOTHING
        `, userId, conversationId);
      }

      return {
        messages: formattedMessages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    });

    console.log(`✅ Mensagens carregadas: ${result.messages.length} para conversa ${conversationId}`);

    return json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('Erro ao buscar mensagens:', err);
    return error(500, 'Erro interno do servidor');
  }
};

export const POST: RequestHandler = async ({ params, request, cookies, platform }) => {
  try {
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

    const result = await withDatabase(platform, async (db) => {
      // Verificar acesso à conversa
      const accessCheck = await db.query(`
        SELECT id FROM chat_conversations
        WHERE id = $1 AND $2 = ANY(participants)
      `, [conversationId, userId]);

      if (!accessCheck || accessCheck.length === 0) {
        throw new Error('Sem acesso a esta conversa');
      }

      // Inserir nova mensagem
      const newMessage = await db.query(`
        INSERT INTO chat_messages (
          conversation_id, sender_id, message_type, content, attachments, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [conversationId, userId, message_type, content, JSON.stringify(attachments), JSON.stringify(metadata)]);

      if (newMessage && newMessage.length > 0) {
        // Atualizar timestamp da conversa
        await db.query(`
          UPDATE chat_conversations 
          SET last_message_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [conversationId]);

        // Buscar dados do remetente
        const senderData = await db.query(`
          SELECT name, avatar FROM users WHERE id = $1
        `, [userId]);

        const message = newMessage[0];
        const sender = senderData[0] || {};

        return {
          id: message.id,
          conversation_id: message.conversation_id,
          sender_id: message.sender_id,
          sender_name: sender.name || 'Usuário',
          sender_avatar: sender.avatar || '/api/placeholder/40/40',
          message_type: message.message_type,
          content: message.content,
          attachments: Array.isArray(message.attachments) ? message.attachments : [],
          metadata: typeof message.metadata === 'object' ? message.metadata : {},
          is_own_message: true,
          created_at: message.created_at
        };
      }

      throw new Error('Falha ao criar mensagem');
    });

    console.log(`✅ Nova mensagem criada na conversa ${conversationId}`);

    return json({
      success: true,
      data: result,
      message: 'Mensagem enviada com sucesso'
    });

  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    return error(500, 'Erro interno do servidor');
  }
}; 