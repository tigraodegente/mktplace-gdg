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
        key: 'min_days',
        label: 'Prazo',
        sortable: true,
        align: 'center',
        hideOnMobile: true,
        render: (value: number, row: any) => {
          const minDays = row.min_days || 0;
          const maxDays = row.max_days || minDays;
          if (minDays === maxDays) {
            return `<span class="text-sm font-medium">${minDays} dia${minDays !== 1 ? 's' : ''}</span>`;
          }
          return `<span class="text-sm">${minDays}-${maxDays} dias</span>`;
        }
      },
      {
        key: 'zone_name',
        label: 'Zona',
        sortable: true,
        hideOnMobile: true,
        render: (value: string, row: any) => {
          if (!value) return '<span class="text-gray-500">-</span>';
          return `<a href="/zonas?name=${encodeURIComponent(value)}" class="text-blue-600 hover:text-blue-800 hover:underline transition-colors">${value}</a>`;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean) => 
          value 
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inativo</span>'
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
        icon: 'location',
        variant: 'secondary',
        onclick: () => window.location.href = `/zonas?frete_id=${frete.id}`
      });
      
      // Ação específica: testar cálculo
      actions.push({
        label: 'Testar Cálculo',
        icon: 'settings',
        variant: 'secondary',
        onclick: () => console.log('Testando cálculo de frete:', frete.name)
      });
      
      // Duplicar modalidade
      actions.push({
        label: 'Duplicar',
        icon: 'Plus',
        variant: 'secondary',
        onclick: () => console.log('Duplicando modalidade:', frete.name)
      });
      
      return actions;
    }
  },

  // ============ MODALIDADES DE FRETE ============
  'modalidades-frete': {
    title: 'Modalidades de Frete',
    entityName: 'modalidade',
    entityNamePlural: 'modalidades',
    newItemRoute: '/modalidades-frete/nova',
    editItemRoute: (id: string) => `/modalidades-frete/${id}`,
    
    // API endpoints
    apiEndpoint: '/shipping-modalities',
    statsEndpoint: '/shipping-modalities/stats',
    
    // Colunas específicas
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
        key: 'delivery_days_min',
        label: 'Prazo',
        sortable: true,
        align: 'center',
        render: (value: number, row: any) => {
          const min = row.delivery_days_min || 0;
          const max = row.delivery_days_max || min;
          if (min === max) {
            return `<span class="font-medium">${min} dia${min !== 1 ? 's' : ''}</span>`;
          }
          return `<span>${min}-${max} dias</span>`;
        }
      },
      {
        key: 'price_multiplier',
        label: 'Multiplicador',
        sortable: true,
        align: 'center',
        hideOnMobile: true,
        render: (value: any) => {
          const multiplier = parseFloat(value) || 1.000;
          const text = multiplier === 1 ? 'Padrão' : `${multiplier.toFixed(3)}x`;
          return `<span class="font-medium">${text}</span>`;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean, row: any) => {
          const isDefault = row.is_default;
          if (value) {
            return isDefault 
              ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Padrão</span>'
              : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>';
          }
          return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inativo</span>';
        }
      }
    ],
    
    // Estatísticas
    statsConfig: {
      total: 'total_modalities',
      active: 'active_modalities',
      pending: 'inactive_modalities',
      lowStock: 'default_modalities'
    },
    
    searchPlaceholder: 'Buscar modalidades...',
    searchFields: ['name', 'description', 'code']
  },

  // ============ TRANSPORTADORAS ============
  transportadoras: {
    title: 'Transportadoras',
    entityName: 'transportadora',
    entityNamePlural: 'transportadoras',
    newItemRoute: '/transportadoras/nova',
    editItemRoute: (id: string) => `/transportadoras/${id}`,
    
    // API endpoints
    apiEndpoint: '/shipping-carriers',
    statsEndpoint: '/shipping-carriers/stats',
    
    // Colunas específicas de transportadoras
    columns: [
      {
        key: 'name',
        label: 'Transportadora',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900">${value || 'Sem nome'}</div>
            <div class="text-sm text-gray-500">${row.description || 'Sem descrição'}</div>
          </div>
        `
      },
      {
        key: 'cnpj',
        label: 'CNPJ',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          if (!value) return '<span class="text-gray-500">Não informado</span>';
          // Formatar CNPJ
          const formatted = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          return `<span class="text-sm font-mono">${formatted}</span>`;
        }
      },
      {
        key: 'contact_email',
        label: 'Contato',
        sortable: true,
        hideOnMobile: true,
        render: (value: string, row: any) => {
          if (!value) return '<span class="text-gray-500">Sem contato</span>';
          return `
            <div>
              <div class="text-sm">${value}</div>
              ${row.contact_phone ? `<div class="text-xs text-gray-500">${row.contact_phone}</div>` : ''}
            </div>
          `;
        }
      },
      {
        key: 'api_integration',
        label: 'Integração API',
        sortable: true,
        align: 'center',
        render: (value: boolean) => {
          const text = value ? 'Integrada' : 'Manual';
          const colorClass = value ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${text}</span>`;
        }
      },
      {
        key: 'methods_count',
        label: 'Modalidades',
        align: 'center',
        render: (value: any, row: any) => {
          // Simulação (será implementado com join real)
          const count = Math.floor(Math.random() * 8) + 1;
          // 🔗 LINK INTELIGENTE para modalidades de frete
          return `<a href="/frete?transportadora_id=${row.id}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">${count} modalidade${count !== 1 ? 's' : ''}</a>`;
        }
      },
      {
        key: 'coverage_percentage',
        label: 'Cobertura',
        align: 'center',
        hideOnMobile: true,
        render: (value: any, row: any) => {
          // Simulação de cobertura
          const percentage = Math.floor(Math.random() * 40) + 60; // 60-100%
          const colorClass = percentage >= 90 ? 'text-green-600' : percentage >= 70 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="text-sm font-medium ${colorClass}">${percentage}%</span>`;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean) => {
          const text = value ? 'Ativa' : 'Inativa';
          const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${text}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Cadastrada em',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          const date = new Date(value);
          return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    // Estatísticas de transportadoras
    statsConfig: {
      total: 'total_carriers',
      active: 'active_carriers',
      pending: 'inactive_carriers',
      lowStock: 'no_api_integration'
    },
    
    searchPlaceholder: 'Buscar transportadoras...',
    searchFields: ['name', 'cnpj', 'contact_email'],
    
    // 🎯 FILTROS CUSTOMIZADOS ESPECÍFICOS PARA TRANSPORTADORAS
    customFilters: [
      {
        key: 'integration_type',
        label: 'Tipo de Integração',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'api', label: 'API Integrada' },
          { value: 'manual', label: 'Manual' },
          { value: 'webhook', label: 'Webhook' }
        ]
      },
      {
        key: 'coverage_range',
        label: 'Cobertura',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'national', label: 'Nacional' },
          { value: 'regional', label: 'Regional' },
          { value: 'local', label: 'Local' }
        ]
      },
      {
        key: 'company_size',
        label: 'Porte da Empresa',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'large', label: 'Grande Porte' },
          { value: 'medium', label: 'Médio Porte' },
          { value: 'small', label: 'Pequeno Porte' }
        ]
      }
    ],
    
    // Ações específicas para transportadoras
    customActions: (transportadora: any) => {
      const actions = [];
      
      // Configurar API
      actions.push({
        label: 'Configurar API',
        icon: 'Settings',
        variant: 'secondary',
        onclick: () => console.log('Configurando API para:', transportadora.name)
      });
      
      // Ver modalidades
      actions.push({
        label: 'Ver Modalidades',
        icon: 'truck',
        variant: 'secondary',
        onclick: () => console.log('Vendo modalidades de:', transportadora.name)
      });
      
      // Testar conexão
      actions.push({
        label: 'Testar Conexão',
        icon: 'Check',
        variant: 'secondary',
        onclick: () => console.log('Testando conexão com:', transportadora.name)
      });
      
      return actions;
    }
  },

  // ============ ZONAS DE FRETE ============
  zonas: {
    title: 'Zonas de Frete',
    entityName: 'zona de frete',
    entityNamePlural: 'zonas de frete',
    newItemRoute: '/zonas/nova',
    editItemRoute: (id: string) => `/zonas/${id}`,
    
    // API endpoints
    apiEndpoint: '/shipping-zones',
    statsEndpoint: '/shipping-zones/stats',
    
    // Colunas específicas de zonas
    columns: [
      {
        key: 'name',
        label: 'Nome da Zona',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900">${value || 'Sem nome'}</div>
            <div class="text-sm text-gray-500">${row.description || 'Sem descrição'}</div>
          </div>
        `
      },
      {
        key: 'states',
        label: 'Estados/Regiões',
        sortable: true,
        render: (value: any, row: any) => {
          // Simulação de estados
          const states = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC'];
          const selected = states.slice(0, Math.floor(Math.random() * 3) + 1);
          return `<span class="text-sm">${selected.join(', ')}</span>`;
        }
      },
      {
        key: 'cep_ranges',
        label: 'Faixas de CEP',
        hideOnMobile: true,
        render: (value: any, row: any) => {
          // Simulação de faixas de CEP
          const ranges = ['01000-000 a 05999-999', '08000-000 a 08999-999'];
          return `<span class="text-xs text-gray-600">${ranges[0]}</span>`;
        }
      },
      {
        key: 'carriers_count',
        label: 'Transportadoras',
        align: 'center',
        render: (value: any, row: any) => {
          const count = Math.floor(Math.random() * 5) + 1;
          // 🔗 LINK INTELIGENTE para transportadoras que atendem esta zona
          return `<a href="/transportadoras?zona_id=${row.id}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">${count} ativa${count !== 1 ? 's' : ''}</a>`;
        }
      },
      {
        key: 'avg_delivery_time',
        label: 'Prazo Médio',
        align: 'center',
        render: (value: any, row: any) => {
          const days = Math.floor(Math.random() * 7) + 2;
          return `<span class="text-sm">${days} dia${days !== 1 ? 's' : ''}</span>`;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean) => {
          const text = value ? 'Ativa' : 'Inativa';
          const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${text}</span>`;
        }
      }
    ],
    
    statsConfig: {
      total: 'total_zones',
      active: 'active_zones',
      pending: 'inactive_zones',
      lowStock: 'uncovered_regions'
    },
    
    searchPlaceholder: 'Buscar zonas de frete...',
    searchFields: ['name', 'states', 'cep_ranges'],
    
    customFilters: [
      {
        key: 'region',
        label: 'Região',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'north', label: 'Norte' },
          { value: 'northeast', label: 'Nordeste' },
          { value: 'center_west', label: 'Centro-Oeste' },
          { value: 'southeast', label: 'Sudeste' },
          { value: 'south', label: 'Sul' }
        ]
      },
      {
        key: 'coverage_type',
        label: 'Tipo de Cobertura',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'full_state', label: 'Estado Completo' },
          { value: 'partial_state', label: 'Parcial' },
          { value: 'metropolitan', label: 'Região Metropolitana' }
        ]
      }
    ]
  },

  // ============ TARIFAS BASE ============
  tarifas: {
    title: 'Tarifas Base',
    entityName: 'tarifa base',
    entityNamePlural: 'tarifas base',
    newItemRoute: '/tarifas/nova',
    editItemRoute: (id: string) => `/tarifas/${id}`,
    
    apiEndpoint: '/shipping-base-rates',
    statsEndpoint: '/shipping-base-rates/stats',
    
    columns: [
      {
        key: 'zone_name',
        label: 'Zona',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900">
              <a href="/zonas?name=${encodeURIComponent(value || 'Zona não definida')}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">${value || 'Zona não definida'}</a>
            </div>
            <div class="text-sm text-gray-500">${row.zone_states || 'Estados não definidos'}</div>
          </div>
        `
      },
      {
        key: 'weight_range',
        label: 'Faixa de Peso',
        sortable: true,
        render: (value: any, row: any) => {
          const min = parseFloat(row.min_weight) || 0;
          const max = parseFloat(row.max_weight) || 30;
          return `<span class="text-sm">${min}kg - ${max}kg</span>`;
        }
      },
      {
        key: 'base_price',
        label: 'Preço Base',
        sortable: true,
        align: 'right',
        render: (value: any, row: any) => {
          const price = parseFloat(row.base_price) || parseFloat(value) || (Math.floor(Math.random() * 50) + 10);
          return `<span class="font-medium">R$ ${price.toFixed(2)}</span>`;
        }
      },
      {
        key: 'price_per_kg',
        label: 'Por Kg Adicional',
        sortable: true,
        align: 'right',
        hideOnMobile: true,
        render: (value: any, row: any) => {
          const pricePerKg = parseFloat(row.price_per_kg) || parseFloat(value) || (Math.floor(Math.random() * 10) + 2);
          return `<span class="text-sm">R$ ${pricePerKg.toFixed(2)}</span>`;
        }
      },
      {
        key: 'carrier_name',
        label: 'Transportadora',
        sortable: true,
        hideOnMobile: true,
        render: (value: string, row: any) => {
          const carriers = ['Correios', 'Jadlog', 'Total Express', 'Loggi'];
          const carrier = carriers[Math.floor(Math.random() * carriers.length)];
          // 🔗 LINK INTELIGENTE para transportadora
          return `<a href="/transportadoras?name=${encodeURIComponent(carrier)}" class="text-blue-600 hover:text-blue-800 hover:underline transition-colors">${carrier}</a>`;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean) => {
          const text = value ? 'Ativa' : 'Inativa';
          const colorClass = value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${text}</span>`;
        }
      }
    ],
    
    statsConfig: {
      total: 'total_rates',
      active: 'active_rates',
      pending: 'inactive_rates',
      lowStock: 'outdated_rates'
    },
    
    searchPlaceholder: 'Buscar tarifas...',
    searchFields: ['zone_name', 'carrier_name'],
    
    customFilters: [
      {
        key: 'weight_category',
        label: 'Categoria de Peso',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'light', label: 'Leve (até 5kg)' },
          { value: 'medium', label: 'Médio (5-15kg)' },
          { value: 'heavy', label: 'Pesado (15kg+)' }
        ]
      },
      {
        key: 'price_range',
        label: 'Faixa de Preço',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'cheap', label: 'Até R$ 20' },
          { value: 'medium', label: 'R$ 20-50' },
          { value: 'expensive', label: 'Acima R$ 50' }
        ]
      }
    ]
  },

  // ============ ENVIOS ============
  envios: {
    title: 'Envios',
    entityName: 'envio',
    entityNamePlural: 'envios',
    newItemRoute: '/envios/novo',
    editItemRoute: (id: string) => `/envios/${id}`,
    
    apiEndpoint: '/shipments',
    statsEndpoint: '/shipments/stats',
    
    columns: [
      {
        key: 'tracking_code',
        label: 'Código de Rastreio',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900 font-mono">${value || 'BR123456789BR'}</div>
            <div class="text-sm text-gray-500">Pedido #${row.order_id || Math.floor(Math.random() * 10000)}</div>
          </div>
        `
      },
      {
        key: 'customer_name',
        label: 'Cliente',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900">${value || 'Cliente Exemplo'}</div>
            <div class="text-sm text-gray-500">${row.destination_city || 'São Paulo'}, ${row.destination_state || 'SP'}</div>
          </div>
        `
      },
      {
        key: 'shipping_method',
        label: 'Modalidade',
        sortable: true,
        render: (value: string, row: any) => {
          const methods = ['PAC', 'SEDEX', 'Expressa', 'Econômica'];
          const method = methods[Math.floor(Math.random() * methods.length)];
          // 🔗 LINK INTELIGENTE para modalidade de frete
          return `<a href="/frete?name=${encodeURIComponent(method)}" class="text-blue-600 hover:text-blue-800 hover:underline transition-colors">${method}</a>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string) => {
          const statuses = [
            { key: 'preparing', label: 'Preparando', color: 'yellow' },
            { key: 'shipped', label: 'Enviado', color: 'blue' },
            { key: 'in_transit', label: 'Em Trânsito', color: 'indigo' },
            { key: 'delivered', label: 'Entregue', color: 'green' },
            { key: 'returned', label: 'Devolvido', color: 'red' }
          ];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800">${status.label}</span>`;
        }
      },
      {
        key: 'estimated_delivery',
        label: 'Previsão de Entrega',
        sortable: true,
        hideOnMobile: true,
        render: () => {
          const date = new Date();
          date.setDate(date.getDate() + Math.floor(Math.random() * 10) + 1);
          return `<span class="text-sm">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        hideOnMobile: true,
        render: () => {
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 30));
          return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    statsConfig: {
      total: 'total_envios',
      active: 'em_transito',
      pending: 'preparando',
      lowStock: 'atrasados'
    },
    
    searchPlaceholder: 'Buscar por código de rastreio, cliente...',
    searchFields: ['tracking_code', 'customer_name', 'destination_city'],
    
    customFilters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'preparing', label: 'Preparando' },
          { value: 'shipped', label: 'Enviado' },
          { value: 'in_transit', label: 'Em Trânsito' },
          { value: 'delivered', label: 'Entregue' },
          { value: 'returned', label: 'Devolvido' }
        ]
      },
      {
        key: 'shipping_method',
        label: 'Método de Envio',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'pac', label: 'PAC' },
          { value: 'sedex', label: 'SEDEX' },
          { value: 'expressa', label: 'Expressa' },
          { value: 'economica', label: 'Econômica' }
        ]
      },
      {
        key: 'date_range',
        label: 'Período',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'today', label: 'Hoje' },
          { value: 'week', label: 'Esta Semana' },
          { value: 'month', label: 'Este Mês' },
          { value: 'quarter', label: 'Último Trimestre' }
        ]
      }
    ]
  },

  // ============ CONFIGURAÇÕES DE FRETE POR SELLER ============
  'configuracoes-frete': {
    title: 'Configurações de Frete por Seller',
    entityName: 'configuração de frete',
    entityNamePlural: 'configurações de frete',
    newItemRoute: '/configuracoes-frete/nova',
    editItemRoute: (id: string) => `/configuracoes-frete/${id}`,
    
    // API endpoints
    apiEndpoint: '/shipping/seller-configs',
    statsEndpoint: '/shipping/seller-configs/stats',
    
    // Colunas específicas de configurações de frete
    columns: [
      {
        key: 'seller_name',
        label: 'Seller',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900">${value || 'Nome do Seller'}</div>
            <div class="text-sm text-gray-500">${row.seller_email || 'email@seller.com'}</div>
          </div>
        `
      },
      {
        key: 'carrier_name',
        label: 'Transportadora',
        sortable: true,
        render: (value: string, row: any) => `
          <div class="flex items-center gap-2">
            <div>
              <div class="font-medium text-gray-900">${value || 'Transportadora'}</div>
              <div class="text-xs text-gray-500 capitalize">${row.carrier_type || 'frenet'}</div>
            </div>
            ${row.carrier_is_active ? 
              '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativa</span>' : 
              '<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inativa</span>'
            }
          </div>
        `
      },
      {
        key: 'markup_percentage',
        label: 'Markup (%)',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const markup = value || 0;
          const color = markup === 0 ? 'text-gray-500' : markup <= 10 ? 'text-green-600' : markup <= 20 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${markup.toFixed(1)}%</span>`;
        }
      },
      {
        key: 'free_shipping_threshold',
        label: 'Frete Grátis (R$)',
        sortable: true,
        align: 'right',
        render: (value: number) => {
          if (!value) return '<span class="text-gray-500">Sem frete grátis</span>';
          const threshold = parseFloat(value.toString());
          const color = threshold <= 100 ? 'text-green-600' : threshold <= 200 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">R$ ${threshold.toFixed(2)}</span>`;
        }
      },
      {
        key: 'handling_time_days',
        label: 'Prazo Prep. (dias)',
        sortable: true,
        align: 'center',
        hideOnMobile: true,
        render: (value: number) => {
          const days = value || 1;
          const color = days <= 1 ? 'text-green-600' : days <= 3 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${days} dia${days !== 1 ? 's' : ''}</span>`;
        }
      },
      {
        key: 'available_rates',
        label: 'Tarifas',
        sortable: true,
        align: 'center',
        hideOnMobile: true,
        render: (value: number) => {
          const rates = value || 0;
          const color = rates > 0 ? 'text-green-600' : 'text-gray-500';
          return `<span class="font-medium ${color}">${rates} tarifa${rates !== 1 ? 's' : ''}</span>`;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean) => 
          value 
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inativo</span>'
      }
    ],
    
    // Estatísticas de configurações de frete
    statsConfig: {
      total: 'totalConfigs',
      active: 'activeConfigs', 
      pending: 'inactiveConfigs',
      lowStock: 'uniqueSellers'
    },
    
    searchPlaceholder: 'Buscar por seller, transportadora...',
    searchFields: ['seller_name', 'seller_email', 'carrier_name'],
    
    // Filtros customizados específicos para configurações de frete
    customFilters: [
      {
        key: 'sellerId',
        label: 'Seller',
        type: 'select',
        options: [] // Será preenchido dinamicamente
      },
      {
        key: 'carrierId',
        label: 'Transportadora',
        type: 'select',
        options: [] // Será preenchido dinamicamente
      },
      {
        key: 'isActive',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' }
        ]
      },
      {
        key: 'markup_range',
        label: 'Faixa de Markup',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'no_markup', label: 'Sem markup (0%)' },
          { value: 'low', label: 'Baixo (1-10%)' },
          { value: 'medium', label: 'Médio (11-20%)' },
          { value: 'high', label: 'Alto (21%+)' }
        ]
      },
      {
        key: 'threshold_range',
        label: 'Faixa Frete Grátis',
        type: 'select',
        options: [
          { value: 'all', label: 'Todos' },
          { value: 'none', label: 'Sem frete grátis' },
          { value: 'low', label: 'Até R$ 100' },
          { value: 'medium', label: 'R$ 101-200' },
          { value: 'high', label: 'R$ 201-500' },
          { value: 'very_high', label: 'Acima R$ 500' }
        ]
      }
    ],
    
    // Ações personalizadas para configurações de frete
    customActions: (config: any) => {
      const actions = [];
      
      // Ação: Editar threshold rapidamente
      actions.push({
        label: 'Editar Threshold',
        icon: 'edit',
        variant: 'primary',
        onclick: () => {
          const newThreshold = prompt('Novo valor para frete grátis (R$):', config.free_shipping_threshold || '0');
          if (newThreshold && !isNaN(parseFloat(newThreshold))) {
            console.log(`Atualizando threshold do seller ${config.seller_name} para R$ ${newThreshold}`);
            // Aqui faria a chamada para API
          }
        }
      });
      
      // Ação: Ver detalhes do seller
      actions.push({
        label: 'Ver Seller',
        icon: 'user',
        variant: 'secondary',
        onclick: () => window.location.href = `/vendedores?sellerId=${config.seller_id}`
      });
      
      // Ação: Configurar tarifas
      actions.push({
        label: 'Configurar Tarifas',
        icon: 'settings',
        variant: 'secondary',
        onclick: () => window.location.href = `/tarifas?sellerId=${config.seller_id}&carrierId=${config.carrier_id}`
      });
      
      return actions;
    },
    
    // Ações em massa específicas
    bulkActions: [
      {
        label: 'Ativar Selecionados',
        icon: 'check',
        variant: 'success',
        action: 'bulk_activate'
      },
      {
        label: 'Desativar Selecionados',
        icon: 'x',
        variant: 'danger',
        action: 'bulk_deactivate'
      },
      {
        label: 'Atualizar Threshold em Massa',
        icon: 'edit',
        variant: 'primary',
        action: 'bulk_update_threshold'
      }
    ]
  },

  // ============ COTAÇÕES ============
  cotacoes: {
    title: 'Cotações de Frete',
    entityName: 'cotação',
    entityNamePlural: 'cotações',
    newItemRoute: '/cotacoes/nova',
    editItemRoute: (id: string) => `/cotacoes/${id}`,
    
    apiEndpoint: '/shipping-quotes',
    statsEndpoint: '/shipping-quotes/stats',
    
    columns: [
      {
        key: 'quote_id',
        label: 'Cotação',
        sortable: true,
        render: (value: string, row: any) => `
          <div>
            <div class="font-medium text-gray-900 font-mono">#${value || Math.floor(Math.random() * 100000)}</div>
            <div class="text-sm text-gray-500">${row.customer_email || 'cliente@exemplo.com'}</div>
          </div>
        `
      },
      {
        key: 'origin_destination',
        label: 'Origem → Destino',
        sortable: true,
        render: (value: any, row: any) => `
          <div class="text-sm">
            <div><span class="text-gray-600">De:</span> ${row.origin_cep || '01000-000'}</div>
            <div><span class="text-gray-600">Para:</span> ${row.destination_cep || '04000-000'}</div>
          </div>
        `
      },
      {
        key: 'total_weight',
        label: 'Peso Total',
        sortable: true,
        align: 'center',
        render: (value: number, row: any) => {
          const weight = row.total_weight || Math.floor(Math.random() * 20) + 1;
          return `<span class="text-sm">${weight}kg</span>`;
        }
      },
      {
        key: 'best_price',
        label: 'Melhor Preço',
        sortable: true,
        align: 'right',
        render: (value: number, row: any) => {
          const price = row.best_price || Math.floor(Math.random() * 100) + 15;
          return `<span class="font-medium text-green-600">R$ ${price.toFixed(2)}</span>`;
        }
      },
      {
        key: 'options_count',
        label: 'Opções',
        align: 'center',
        render: (value: any, row: any) => {
          const count = Math.floor(Math.random() * 5) + 2;
          // 🔗 LINK INTELIGENTE para ver opções de frete desta cotação
          return `<a href="/frete?cotacao_id=${row.id || Math.floor(Math.random() * 1000)}" class="text-blue-600 hover:text-blue-800 hover:underline transition-colors">${count} opçõe${count !== 1 ? 's' : ''}</a>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string, row: any) => {
          const statuses = [
            { key: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
            { key: 'quoted', label: 'Cotada', color: 'bg-blue-100 text-blue-800' },
            { key: 'selected', label: 'Selecionada', color: 'bg-green-100 text-green-800' },
            { key: 'expired', label: 'Expirada', color: 'bg-gray-100 text-gray-800' }
          ];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${status.color}">${status.label}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Cotada em',
        sortable: true,
        hideOnMobile: true,
        render: (value: string, row: any) => {
          const date = new Date();
          date.setHours(date.getHours() - Math.floor(Math.random() * 48));
          return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    statsConfig: {
      total: 'total_quotes',
      active: 'pending_quotes',
      pending: 'expired_quotes',
      lowStock: 'failed_quotes'
    },
    
    searchPlaceholder: 'Buscar cotações...',
    searchFields: ['quote_id', 'customer_email', 'origin_cep', 'destination_cep'],
    
    customFilters: [
      {
        key: 'quote_status',
        label: 'Status da Cotação',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'pending', label: 'Pendente' },
          { value: 'quoted', label: 'Cotada' },
          { value: 'selected', label: 'Selecionada' },
          { value: 'expired', label: 'Expirada' }
        ]
      },
      {
        key: 'weight_range',
        label: 'Faixa de Peso',
        type: 'select',
        options: [
          { value: 'all', label: 'Todas' },
          { value: 'light', label: 'Até 5kg' },
          { value: 'medium', label: '5-15kg' },
          { value: 'heavy', label: 'Acima 15kg' }
        ]
      }
    ]
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