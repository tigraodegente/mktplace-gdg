import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock data for product options
const mockProductOptions = [
  {
    id: '1',
    name: 'Cor',
    slug: 'cor',
    type: 'color',
    position: 1,
    is_required: false,
    is_active: true,
    values: [
      {
        id: '1-1',
        value: 'Azul',
        display_value: 'Azul',
        hex_color: '#3B82F6',
        position: 1,
        is_active: true
      },
      {
        id: '1-2',
        value: 'Rosa',
        display_value: 'Rosa',
        hex_color: '#EC4899',
        position: 2,
        is_active: true
      },
      {
        id: '1-3',
        value: 'Verde',
        display_value: 'Verde',
        hex_color: '#10B981',
        position: 3,
        is_active: true
      },
      {
        id: '1-4',
        value: 'Branco',
        display_value: 'Branco',
        hex_color: '#FFFFFF',
        position: 4,
        is_active: true
      },
      {
        id: '1-5',
        value: 'Cinza',
        display_value: 'Cinza',
        hex_color: '#6B7280',
        position: 5,
        is_active: true
      }
    ]
  },
  {
    id: '2',
    name: 'Tamanho',
    slug: 'tamanho',
    type: 'text',
    position: 2,
    is_required: false,
    is_active: true,
    values: [
      {
        id: '2-1',
        value: 'P',
        display_value: 'Pequeno (P)',
        position: 1,
        is_active: true
      },
      {
        id: '2-2',
        value: 'M',
        display_value: 'Médio (M)',
        position: 2,
        is_active: true
      },
      {
        id: '2-3',
        value: 'G',
        display_value: 'Grande (G)',
        position: 3,
        is_active: true
      },
      {
        id: '2-4',
        value: 'GG',
        display_value: 'Extra Grande (GG)',
        position: 4,
        is_active: true
      }
    ]
  },
  {
    id: '3',
    name: 'Material',
    slug: 'material',
    type: 'text',
    position: 3,
    is_required: false,
    is_active: true,
    values: [
      {
        id: '3-1',
        value: 'Algodão',
        display_value: 'Algodão 100%',
        position: 1,
        is_active: true
      },
      {
        id: '3-2',
        value: 'Poliéster',
        display_value: 'Poliéster',
        position: 2,
        is_active: true
      },
      {
        id: '3-3',
        value: 'Malha',
        display_value: 'Malha',
        position: 3,
        is_active: true
      }
    ]
  },
  {
    id: '4',
    name: 'Estilo',
    slug: 'estilo',
    type: 'text',
    position: 4,
    is_required: false,
    is_active: true,
    values: [
      {
        id: '4-1',
        value: 'Clássico',
        display_value: 'Clássico',
        position: 1,
        is_active: true
      },
      {
        id: '4-2',
        value: 'Moderno',
        display_value: 'Moderno',
        position: 2,
        is_active: true
      }
    ]
  },
  {
    id: '5',
    name: 'Voltagem',
    slug: 'voltagem',
    type: 'text',
    position: 5,
    is_required: false,
    is_active: true,
    values: [
      {
        id: '5-1',
        value: '110V',
        display_value: '110V',
        position: 1,
        is_active: true
      },
      {
        id: '5-2',
        value: '220V',
        display_value: '220V',
        position: 2,
        is_active: true
      },
      {
        id: '5-3',
        value: 'Bivolt',
        display_value: 'Bivolt (110V/220V)',
        position: 3,
        is_active: true
      }
    ]
  }
];

export const GET: RequestHandler = async ({ url }) => {
  try {
    const includeValues = url.searchParams.get('include_values') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    console.log('🔍 Buscando product-options:', { includeValues, limit, page });
    
    // Simular delay de API real
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let options: any[] = [...mockProductOptions];
    
    // Se não deve incluir valores, remover o array values
    if (!includeValues) {
      options = options.map(option => {
        const { values, ...optionWithoutValues } = option;
        return {
          ...optionWithoutValues,
          values_count: values.length
        };
      });
    }
    
    // Aplicar paginação
    const startIndex = (page - 1) * limit;
    const paginatedOptions = options.slice(startIndex, startIndex + limit);
    
    console.log('✅ Product-options encontradas:', paginatedOptions.length);
    
    return json({
      success: true,
      data: paginatedOptions,
      meta: {
        page,
        limit,
        total: mockProductOptions.length,
        totalPages: Math.ceil(mockProductOptions.length / limit),
        hasNextPage: page < Math.ceil(mockProductOptions.length / limit),
        hasPrevPage: page > 1,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar product-options:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar opções de produtos',
        details: (error as Error).message
      }
    }, { status: 500 });
  }
}; 