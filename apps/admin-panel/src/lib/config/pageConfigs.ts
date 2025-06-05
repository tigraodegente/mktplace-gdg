/**
 * Configurações centralizadas para todas as páginas administrativas
 * Centraliza TODAS as configurações específicas de cada página
 */

import { PageColumnSets } from '../utils/columnTemplates';
import type { TableColumn } from '../utils/columnTemplates';

export interface PageConfig {
  title: string;
  entityName: string;
  entityNamePlural: string;
  newItemRoute: string;
  editItemRoute: (id: string) => string;
  
  // API endpoints
  apiEndpoint: string;
  deleteEndpoint?: string;
  statsEndpoint?: string;
  categoriesEndpoint?: string;
  brandsEndpoint?: string;
  
  // Colunas da tabela
  columns: TableColumn[];
  
  // Configurações de estatísticas
  statsConfig?: {
    total: string;
    active: string;
    pending: string;
    lowStock: string;
  };
  
  // Configurações de busca
  searchPlaceholder?: string;
  searchFields?: string[];
  
  // Filtros customizados específicos da página
  customFilters?: Array<{
    key: string;
    label: string;
    type: 'select' | 'input' | 'range' | 'date';
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  
  // Ações customizadas
  customActions?: (row: any) => any[];
  
  // Transformações de dados
  onDataLoad?: (data: any[]) => any[];
  onStatsLoad?: (stats: any) => any;
}

/**
 * Configurações para todas as páginas do sistema
 */
export const PageConfigs: Record<string, PageConfig> = {
  // ============ PRODUTOS ============
  produtos: {
    title: 'Produtos',
    entityName: 'produto',
    entityNamePlural: 'produtos',
    newItemRoute: '/produtos/novo',
    editItemRoute: (id: string) => `/produtos/${id}`,
    
    // API endpoints
    apiEndpoint: '/products',
    statsEndpoint: '/products/stats',
    categoriesEndpoint: '/categories',
    brandsEndpoint: '/brands',
    
    // Colunas específicas de produtos
    columns: PageColumnSets.produtos,
    
    // Estatísticas de produtos
    statsConfig: {
      total: 'total_products',
      active: 'active_products',
      pending: 'inactive_products',
      lowStock: 'low_stock_products'
    },
    
    searchPlaceholder: 'Buscar produtos...',
    searchFields: ['name', 'sku', 'description']
  },

  // ============ PEDIDOS ============
  pedidos: {
    title: 'Pedidos',
    entityName: 'pedido',
    entityNamePlural: 'pedidos',
    newItemRoute: '/pedidos/novo',
    editItemRoute: (id: string) => `/pedidos/${id}`,
    
    // API endpoints
    apiEndpoint: '/orders',
    statsEndpoint: '/orders/stats',
    
    // Colunas específicas de pedidos
    columns: PageColumnSets.pedidos,
    
    // Estatísticas de pedidos
    statsConfig: {
      total: 'total_orders',
      active: 'processing_orders',
      pending: 'pending_orders',
      lowStock: 'cancelled_orders'
    },
    
    searchPlaceholder: 'Buscar pedidos...',
    searchFields: ['id', 'customer_name', 'customer_email'],
    
    // Ações específicas de pedidos
    customActions: (pedido: any) => {
      const actions = [];
      
      if (pedido.status === 'pending') {
        actions.push({
          label: 'Aprovar',
          icon: 'check',
          variant: 'secondary',
          onclick: () => console.log('Aprovando pedido:', pedido.id)
        });
      }
      
      if (pedido.status === 'processing') {
        actions.push({
          label: 'Enviar',
          icon: 'truck',
          variant: 'secondary',
          onclick: () => console.log('Enviando pedido:', pedido.id)
        });
      }
      
      return actions;
    },
    
    // Transformação dos dados de pedidos
    onDataLoad: (orders: any[]) => {
      return orders.map(order => ({
        ...order,
        customer: {
          name: order.customer_name || 'Cliente não informado',
          email: order.customer_email || 'Email não informado'
        }
      }));
    }
  },

  // ============ USUÁRIOS ============
  usuarios: {
    title: 'Usuários',
    entityName: 'usuário',
    entityNamePlural: 'usuários',
    newItemRoute: '/usuarios/novo',
    editItemRoute: (id: string) => `/usuarios/${id}`,
    
    // API endpoints
    apiEndpoint: '/users',
    statsEndpoint: '/users/stats',
    
    // Colunas específicas de usuários
    columns: PageColumnSets.usuarios,
    
    // Estatísticas de usuários
    statsConfig: {
      total: 'total_users',
      active: 'active_users',
      pending: 'inactive_users',
      lowStock: 'new_users_month'
    },
    
    searchPlaceholder: 'Buscar usuários...',
    searchFields: ['name', 'email', 'phone']
  },

  // ============ CATEGORIAS ============
  categorias: {
    title: 'Categorias',
    entityName: 'categoria',
    entityNamePlural: 'categorias',
    newItemRoute: '/categorias/nova',
    editItemRoute: (id: string) => `/categorias/${id}`,
    
    // API endpoints
    apiEndpoint: '/categories',
    statsEndpoint: '/categories/stats',
    
    // Colunas específicas de categorias
    columns: PageColumnSets.categorias,
    
    // Estatísticas de categorias
    statsConfig: {
      total: 'total_categories',
      active: 'active_categories',
      pending: 'inactive_categories',
      lowStock: 'empty_categories'
    },
    
    searchPlaceholder: 'Buscar categorias...',
    searchFields: ['name', 'description']
  },

  // ============ MARCAS ============
  marcas: {
    title: 'Marcas',
    entityName: 'marca',
    entityNamePlural: 'marcas',
    newItemRoute: '/marcas/nova',
    editItemRoute: (id: string) => `/marcas/${id}`,
    
    // API endpoints
    apiEndpoint: '/brands',
    statsEndpoint: '/brands/stats',
    
    // Colunas específicas de marcas
    columns: PageColumnSets.marcas,
    
    // Estatísticas de marcas
    statsConfig: {
      total: 'total_brands',
      active: 'active_brands',
      pending: 'inactive_brands',
      lowStock: 'empty_brands'
    },
    
    searchPlaceholder: 'Buscar marcas...',
    searchFields: ['name', 'description']
  },

  // ============ CUPONS ============
  cupons: {
    title: 'Cupons de Desconto',
    entityName: 'cupom',
    entityNamePlural: 'cupons',
    newItemRoute: '/cupons/novo',
    editItemRoute: (id: string) => `/cupons/${id}`,
    
    // API endpoints
    apiEndpoint: '/coupons',
    statsEndpoint: '/coupons/stats',
    
    // Colunas específicas de cupons
    columns: PageColumnSets.cupons,
    
    // Estatísticas de cupons
    statsConfig: {
      total: 'total_coupons',
      active: 'active_coupons',
      pending: 'expired_coupons',
      lowStock: 'used_coupons'
    },
    
    searchPlaceholder: 'Buscar cupons...',
    searchFields: ['code', 'name']
  },

  // ============ VENDEDORES ============
  vendedores: {
    title: 'Vendedores',
    entityName: 'vendedor',
    entityNamePlural: 'vendedores',
    newItemRoute: '/vendedores/novo',
    editItemRoute: (id: string) => `/vendedores/${id}`,
    
    // API endpoints
    apiEndpoint: '/sellers',
    statsEndpoint: '/sellers/stats',
    
    // Colunas baseadas em usuários mas customizadas
    columns: PageColumnSets.usuarios.map(col => {
      // Customizar a coluna de role para vendedores
      if (col.key === 'role') {
        return {
          ...col,
          render: (value: string) => {
            const roleNames = {
              seller: 'Vendedor',
              manager: 'Gerente de Vendas',
              admin: 'Administrador'
            };
            const roleColors = {
              seller: 'bg-blue-100 text-blue-800',
              manager: 'bg-purple-100 text-purple-800',
              admin: 'bg-red-100 text-red-800'
            };
            const name = (roleNames as any)[value] || value;
            const color = (roleColors as any)[value] || 'bg-gray-100 text-gray-800';
            return `<span class="px-2 py-1 text-xs font-medium rounded-full ${color}">${name}</span>`;
          }
        };
      }
      return col;
    }),
    
    // Estatísticas de vendedores
    statsConfig: {
      total: 'total_sellers',
      active: 'active_sellers',
      pending: 'inactive_sellers',
      lowStock: 'new_sellers_month'
    },
    
    searchPlaceholder: 'Buscar vendedores...',
    searchFields: ['name', 'email', 'phone', 'company']
  },

  // ============ AVALIAÇÕES ============
  avaliacoes: {
    title: 'Avaliações',
    entityName: 'avaliação',
    entityNamePlural: 'avaliações',
    newItemRoute: '/avaliacoes/nova',
    editItemRoute: (id: string) => `/avaliacoes/${id}`,
    
    // API endpoints
    apiEndpoint: '/reviews',
    statsEndpoint: '/reviews/stats',
    
    // Colunas específicas de avaliações
    columns: [
      {
        key: 'product',
        label: 'Produto',
        sortable: true,
        render: (value: any) => `
          <div>
            <div class="font-medium text-gray-900">${value?.name || 'Produto removido'}</div>
            <div class="text-sm text-gray-500">SKU: ${value?.sku || 'N/A'}</div>
          </div>
        `
      },
      {
        key: 'customer',
        label: 'Cliente',
        sortable: true,
        render: (value: any) => `
          <div>
            <div class="font-medium text-gray-900">${value?.name || 'Cliente anônimo'}</div>
            <div class="text-sm text-gray-500">${value?.email || 'Email não informado'}</div>
          </div>
        `
      },
      {
        key: 'rating',
        label: 'Avaliação',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const stars = Array.from({ length: 5 }, (_, i) => i < value ? '★' : '☆').join('');
          return `<span class="text-yellow-500">${stars} ${value}/5</span>`;
        }
      },
      {
        key: 'comment',
        label: 'Comentário',
        render: (value: string) => {
          const truncated = value?.length > 50 ? value.slice(0, 50) + '...' : value || 'Sem comentário';
          return `<span class="text-sm text-gray-600">${truncated}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string) => {
          const configs = {
            pending: { class: 'bg-yellow-100 text-yellow-800', label: 'Pendente' },
            approved: { class: 'bg-green-100 text-green-800', label: 'Aprovado' },
            rejected: { class: 'bg-red-100 text-red-800', label: 'Rejeitado' }
          };
          const config = (configs as any)[value] || configs.pending;
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${config.class}">${config.label}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Data',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          const date = new Date(value);
          return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    // Estatísticas de avaliações
    statsConfig: {
      total: 'total_reviews',
      active: 'approved_reviews',
      pending: 'pending_reviews',
      lowStock: 'rejected_reviews'
    },
    
    searchPlaceholder: 'Buscar avaliações...',
    searchFields: ['product_name', 'customer_name', 'comment']
  },

  // ============ FRETE ============
  frete: {
    title: 'Modalidades de Frete',
    entityName: 'modalidade de frete',
    entityNamePlural: 'modalidades de frete',
    newItemRoute: '/frete/nova',
    editItemRoute: (id: string) => `/frete/${id}`,
    
    // API endpoints
    apiEndpoint: '/shipping',
    statsEndpoint: '/shipping/stats',
    
    // Colunas específicas de frete
    columns: [
      {
        key: 'name',
        label: 'Modalidade',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900">${value || 'Sem nome'}</div>
            <div class="text-sm text-gray-500">${row.description || 'Sem descrição'}</div>
          </div>
        `
      },
      {
        key: 'base_cost',
        label: 'Custo Base',
        sortable: true,
        align: 'right',
        render: (value: number, row: any) => {
          // Usar base_cost diretamente da API
          const cost = row.base_cost || 0;
          if (cost === 0) return '<span class="text-green-600 font-medium">Grátis</span>';
          return `<span class="font-medium">R$ ${cost.toFixed(2)}</span>`;
        }
      },
      {
        key: 'cost_per_kg',
        label: 'Por Kg',
        sortable: true,
        align: 'right',
        hideOnMobile: true,
        render: (value: number, row: any) => {
          // Usar cost_per_kg diretamente da API
          const costPerKg = row.cost_per_kg || 0;
          if (costPerKg === 0) return '<span class="text-gray-500">R$ 0,00</span>';
          return `<span class="text-sm">R$ ${costPerKg.toFixed(2)}</span>`;
        }
      },
      {
        key: 'delivery_time',
        label: 'Prazo',
        sortable: true,
        align: 'center',
        render: (value: any, row: any) => {
          const min = row.min_delivery_days || 0;
          const max = row.max_delivery_days || 0;
          if (min === 0 && max === 0) return '<span class="text-sm text-green-600">Imediato</span>';
          if (min === max) return `<span class="text-sm">${min} ${min === 1 ? 'dia' : 'dias'}</span>`;
          return `<span class="text-sm">${min}-${max} dias</span>`;
        }
      },
      {
        key: 'zones_count',
        label: 'Zonas',
        align: 'center',
        hideOnMobile: true,
        render: (value: any, row: any) => {
          // Simulação baseada no ID (será implementado com join real depois)
          const count = Math.floor(Math.random() * 5) + 1;
          return `<span class="text-sm text-blue-600">${count} zona${count !== 1 ? 's' : ''}</span>`;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean) => {
          const text = value ? 'Ativo' : 'Inativo';
          const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${text}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          const date = new Date(value);
          return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    // Estatísticas de frete
    statsConfig: {
      total: 'total_shipping_methods',
      active: 'active_shipping_methods',
      pending: 'inactive_shipping_methods',
      lowStock: 'no_coverage_regions'
    },
    
    searchPlaceholder: 'Buscar modalidades de frete...',
    searchFields: ['name', 'description'],
    
    // 🎯 FILTROS CUSTOMIZADOS ESPECÍFICOS PARA FRETE
    customFilters: [
      {
        key: 'carrier',
        label: 'Transportadora',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'correios', label: 'Correios' },
          { value: 'jadlog', label: 'Jadlog' },
          { value: 'total', label: 'Total Express' },
          { value: 'transportadora', label: 'Outras' }
        ]
      },
      {
        key: 'delivery_range',
        label: 'Prazo de Entrega',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'same_day', label: 'Mesmo dia' },
          { value: 'fast', label: '1-3 dias' },
          { value: 'normal', label: '4-7 dias' },
          { value: 'slow', label: '8+ dias' }
        ]
      },
      {
        key: 'cost_range',
        label: 'Faixa de Custo',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'free', label: 'Grátis' },
          { value: 'cheap', label: 'Até R$ 20' },
          { value: 'medium', label: 'R$ 20-50' },
          { value: 'expensive', label: 'Acima R$ 50' }
        ]
      },
      {
        key: 'has_zones',
        label: 'Cobertura',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'with_zones', label: 'Com zonas' },
          { value: 'without_zones', label: 'Sem zonas' }
        ]
      }
    ],
    
    // Ações específicas para frete
    customActions: (frete: any) => {
      const actions = [];
      
      // Ação específica: configurar zonas
      actions.push({
        label: 'Configurar Zonas',
        icon: 'map',
        variant: 'secondary',
        onclick: () => console.log('Configurando zonas para:', frete.name)
      });
      
      // Ação específica: testar cálculo
      actions.push({
        label: 'Testar Cálculo',
        icon: 'calculator',
        variant: 'secondary',
        onclick: () => console.log('Testando cálculo de frete:', frete.name)
      });
      
      // Duplicar modalidade
      actions.push({
        label: 'Duplicar',
        icon: 'copy',
        variant: 'secondary',
        onclick: () => console.log('Duplicando modalidade:', frete.name)
      });
      
      return actions;
    }
  }
};

/**
 * Função helper para buscar configuração de página
 */
export function getPageConfig(pageName: string): PageConfig | undefined {
  return PageConfigs[pageName];
}

/**
 * Lista de todas as páginas disponíveis
 */
export const availablePages = Object.keys(PageConfigs); 