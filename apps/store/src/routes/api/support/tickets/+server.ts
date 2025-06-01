import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase, getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    console.log('🎫 Support Tickets - Estratégia híbrida iniciada');
    
    const userId = url.searchParams.get('user_id');
    const status = url.searchParams.get('status');

    // Tentar buscar tickets com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        let baseQuery = `
          SELECT id, user_id, subject, status, priority, category,
                 created_at, updated_at
          FROM support_tickets
          WHERE 1=1
        `;
        let queryParams = [];
        let paramIndex = 1;

        if (userId) {
          baseQuery += ` AND user_id = $${paramIndex}`;
          queryParams.push(userId);
          paramIndex++;
        }

        if (status) {
          baseQuery += ` AND status = $${paramIndex}`;
          queryParams.push(status);
        }

        baseQuery += ` ORDER BY created_at DESC LIMIT 50`;

        const tickets = await db.query(baseQuery, ...queryParams);
        return { success: true, tickets };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      return json({ ...result, source: 'database' });
      
    } catch (error) {
      // FALLBACK: Tickets mock
      const mockTickets = [
        {
          id: 'ticket-1',
          user_id: userId || 'user-1',
          subject: 'Problema com entrega',
          status: 'open',
          priority: 'medium',
          category: 'shipping',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      return json({
        success: true,
        tickets: mockTickets.filter(t => !status || t.status === status),
        source: 'fallback'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro tickets:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, platform, url }) => {
  try {
    // Verificar autenticação
    const userId = await getUserFromRequest(platform, url);
    if (!userId) {
      return error(401, 'Usuário não autenticado');
    }

    const { subject, category, order_id, message, priority } = await request.json();

    if (!subject || !message) {
      return error(400, 'Assunto e mensagem são obrigatórios');
    }

    const result = await withDatabase(platform, async (db) => {
      // Criar ticket
      const ticketNumber = `SP${Date.now().toString().slice(-6)}`;
      
      const ticketInsert = await db.query(`
        INSERT INTO support_tickets (
          user_id, ticket_number, subject, category, order_id, 
          description, status, priority, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, ticket_number, subject, category, order_id, status, priority, created_at
      `, [
        userId,
        ticketNumber,
        subject,
        category || 'Outros',
        order_id || null,
        message,
        'open',
        priority || 3
      ]);

      const ticket = ticketInsert[0];

      // Criar primeira mensagem
      await db.query(`
        INSERT INTO support_ticket_messages (
          ticket_id, user_id, message, is_internal, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [ticket.id, userId, message, false]);

      return {
        success: true,
        data: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          category: ticket.category,
          order_id: ticket.order_id,
          status: ticket.status,
          priority: parseInt(ticket.priority),
          created_at: ticket.created_at,
          description: message
        },
        message: 'Ticket criado com sucesso'
      };
    });

    return json(result);

  } catch (err) {
    console.error('❌ Erro ao criar ticket:', err);
    return error(500, 'Erro interno do servidor');
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