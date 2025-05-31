import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock data expandido para demonstração
const mockReturns = [
  {
    id: 'return-1',
    return_number: 'DV001',
    order_id: 'MP1748645252590OLW',
    type: 'return',
    status: 'requested',
    reason: 'Produto diferente do anunciado',
    total_amount: 199.90,
    refund_amount: 199.90,
    created_at: new Date().toISOString(),
    estimated_refund_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: '1',
        product_name: 'Camiseta Polo Azul',
        quantity: 1,
        unit_price: 199.90,
        image: '/api/placeholder/100/100',
        condition: 'new'
      }
    ]
  },
  {
    id: 'return-2',
    return_number: 'DV002', 
    order_id: 'MP1748643319033AHP',
    type: 'exchange',
    status: 'approved',
    reason: 'Tamanho incorreto',
    total_amount: 299.90,
    refund_amount: 0,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    estimated_refund_date: null,
    items: [
      {
        id: '2',
        product_name: 'Vestido Floral M',
        quantity: 1, 
        unit_price: 299.90,
        image: '/api/placeholder/100/100',
        condition: 'new'
      }
    ]
  },
  {
    id: 'return-3',
    return_number: 'DV003',
    order_id: 'MP17486431276973LZ',
    type: 'return',
    status: 'processed',
    reason: 'Defeito de fabricação',
    total_amount: 149.90,
    refund_amount: 149.90,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    estimated_refund_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: '3',
        product_name: 'Tênis Esportivo',
        quantity: 1,
        unit_price: 149.90,
        image: '/api/placeholder/100/100',
        condition: 'defective'
      }
    ]
  },
  {
    id: 'return-4',
    return_number: 'DV004',
    order_id: 'MP17486426872884ZB',
    type: 'return',
    status: 'completed',
    reason: 'Não gostei do produto',
    total_amount: 89.90,
    refund_amount: 89.90,
    created_at: new Date(Date.now() - 518400000).toISOString(),
    estimated_refund_date: null,
    items: [
      {
        id: '4',
        product_name: 'Bolsa de Couro',
        quantity: 1,
        unit_price: 89.90,
        image: '/api/placeholder/100/100',
        condition: 'used'
      }
    ]
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
    const type = url.searchParams.get('type');

    // Filtrar devoluções baseado nos parâmetros
    let filteredReturns = [...mockReturns];
    
    if (status) {
      filteredReturns = filteredReturns.filter(r => r.status === status);
    }
    
    if (type) {
      filteredReturns = filteredReturns.filter(r => r.type === type);
    }

    const total = filteredReturns.length;
    const offset = (page - 1) * limit;
    const returns = filteredReturns.slice(offset, offset + limit);

    return json({
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
    });
  } catch (err) {
    console.error('Erro ao buscar devoluções:', err);
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

    const { order_id, type, reason_id, custom_reason, items, photos } = await request.json();

    if (!order_id || !type || !reason_id) {
      return error(400, 'Dados incompletos para solicitação de devolução');
    }

    // Mapear reason_id para texto
    const reasonMap: Record<string, string> = {
      '1': 'Defeito de fabricação',
      '2': 'Produto diferente do anunciado',
      '3': 'Tamanho incorreto',
      '4': 'Não gostei do produto',
      '5': 'Chegou danificado',
      '6': 'Erro na compra'
    };

    const reason = reasonMap[reason_id] || custom_reason || 'Outros motivos';

    // Calcular valor total (mock)
    const total_amount = 199.90; // Valor de exemplo

    // Criar nova devolução mock
    const newReturn = {
      id: `return-${Date.now()}`,
      return_number: `DV${String(Date.now()).slice(-3).padStart(3, '0')}`,
      order_id,
      type,
      status: 'requested',
      reason,
      total_amount,
      refund_amount: type === 'return' ? total_amount : 0,
      created_at: new Date().toISOString(),
      estimated_refund_date: type === 'return' 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      items: [
        {
          id: Date.now().toString(),
          product_name: 'Produto Exemplo',
          quantity: 1,
          unit_price: total_amount,
          image: '/api/placeholder/100/100',
          condition: 'new'
        }
      ],
      photos: photos || [],
      custom_reason: custom_reason || null
    };

    return json({
      success: true,
      data: newReturn,
      message: `Solicitação de ${type === 'return' ? 'devolução' : 'troca'} criada com sucesso`
    });

  } catch (err) {
    console.error('Erro ao criar devolução:', err);
    return error(500, 'Erro interno do servidor');
  }
}; 