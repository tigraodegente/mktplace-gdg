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
    const category = url.searchParams.get('category');

    const result = await withDatabase(platform, async (db) => {
      // Query base
      let query = `
        SELECT 
          t.id,
          t.ticket_number,
          t.subject,
          t.status,
          t.priority,
          t.category,
          t.order_id,
          t.description,
          t.created_at,
          t.updated_at,
          COUNT(tm.id) as message_count,
          MAX(tm.created_at) as last_message_at
        FROM support_tickets t
        LEFT JOIN support_ticket_messages tm ON tm.ticket_id = t.id
        WHERE t.user_id = $1
      `;
      
      const params = [userId];
      let paramIndex = 2;

      // Filtros opcionais
      if (status) {
        query += ` AND t.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        query += ` AND t.category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` GROUP BY t.id ORDER BY t.created_at DESC`;

      // Count total
      const countQuery = query.replace(
        'SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.category, t.order_id, t.description, t.created_at, t.updated_at, COUNT(tm.id) as message_count, MAX(tm.created_at) as last_message_at',
        'SELECT COUNT(DISTINCT t.id) as total'
      ).replace(/ GROUP BY.*$/, '');
      
      const [countResult, ticketsResult] = await Promise.all([
        db.query(countQuery, params),
        db.query(query + ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params)
      ]);

      const total = parseInt(countResult[0]?.total || '0');
      const tickets = ticketsResult.map((ticket: any) => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: parseInt(ticket.priority),
        category: ticket.category,
        order_id: ticket.order_id,
        description: ticket.description,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        message_count: parseInt(ticket.message_count),
        last_message_at: ticket.last_message_at
      }));

      return {
        success: true,
        data: {
          tickets,
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
    console.error('❌ Erro ao buscar tickets:', err);
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