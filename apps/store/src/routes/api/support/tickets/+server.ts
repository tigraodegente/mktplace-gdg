import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock data expandido para demonstração
const mockTickets = [
  {
    id: 'ticket-1',
    ticket_number: 'SP001',
    subject: 'Produto chegou com defeito',
    status: 'open',
    priority: 3,
    created_at: new Date().toISOString(),
    category: 'Produtos',
    order_id: 'MP1748645252590OLW',
    description: 'O produto chegou com um defeito na costura. Gostaria de solicitar a troca.'
  },
  {
    id: 'ticket-2', 
    ticket_number: 'SP002',
    subject: 'Dúvida sobre prazo de entrega',
    status: 'resolved',
    priority: 2,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    category: 'Pedidos',
    order_id: null,
    description: 'Gostaria de saber quando meu pedido será entregue.'
  },
  {
    id: 'ticket-3',
    ticket_number: 'SP003', 
    subject: 'Problema com pagamento PIX',
    status: 'in_progress',
    priority: 4,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    category: 'Pagamentos',
    order_id: 'MP1748643319033AHP',
    description: 'Fiz o pagamento via PIX mas o pedido ainda consta como pendente.'
  },
  {
    id: 'ticket-4',
    ticket_number: 'SP004',
    subject: 'Como alterar meu endereço?',
    status: 'waiting_customer',
    priority: 1,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    category: 'Outros',
    order_id: null,
    description: 'Preciso alterar meu endereço de entrega para pedidos futuros.'
  }
];

export const GET: RequestHandler = async ({ url, cookies }) => {
  try {
    // Verificar autenticação
    const sessionToken = cookies.get('session_token');
    if (!sessionToken) {
      return error(401, 'Usuário não autenticado');
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');

    // Filtrar tickets baseado nos parâmetros
    let filteredTickets = [...mockTickets];
    
    if (status) {
      filteredTickets = filteredTickets.filter(t => t.status === status);
    }
    
    if (category) {
      filteredTickets = filteredTickets.filter(t => t.category === category);
    }

    const total = filteredTickets.length;
    const offset = (page - 1) * limit;
    const tickets = filteredTickets.slice(offset, offset + limit);

    return json({
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
    });
  } catch (err) {
    console.error('Erro ao buscar tickets:', err);
    return error(500, 'Erro interno do servidor');
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // Verificar autenticação
    const sessionToken = cookies.get('session_token');
    if (!sessionToken) {
      return error(401, 'Usuário não autenticado');
    }

    const { subject, category_id, order_id, message, attachments } = await request.json();

    if (!subject || !message) {
      return error(400, 'Assunto e mensagem são obrigatórios');
    }

    // Criar novo ticket mock
    const newTicket = {
      id: `ticket-${Date.now()}`,
      ticket_number: `SP${String(Date.now()).slice(-3).padStart(3, '0')}`,
      subject,
      category: category_id || 'Outros',
      order_id,
      status: 'open',
      priority: 3,
      created_at: new Date().toISOString(),
      description: message,
      messages: [
        {
          id: `msg-${Date.now()}`,
          message,
          attachments: attachments || [],
          is_internal: false,
          created_at: new Date().toISOString(),
          user_name: 'Você'
        }
      ]
    };

    return json({
      success: true,
      data: newTicket,
      message: 'Ticket criado com sucesso'
    });

  } catch (err) {
    console.error('Erro ao criar ticket:', err);
    return error(500, 'Erro interno do servidor');
  }
}; 