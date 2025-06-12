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
  onBulkDelete?: (ids: string[]) => Promise<void>;
  
  // Ações em massa customizadas
  bulkActions?: Array<{
    label: string;
    icon: string;
    variant: string;
    action: string;
  }>;
}

/**
 * Configurações para todas as páginas do sistema
 */
export const PageConfigs: Record<string, PageConfig> = {
  // ============ PRODUTOS ============
  produtos: {
    title: 'Gestão de Produtos',
    entityName: 'produto',
    entityNamePlural: 'produtos',
    newItemRoute: '/produtos/novo',
    editItemRoute: (id: string) => `/produtos/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/products',
    deleteEndpoint: '/api/products',
    statsEndpoint: '/api/products/stats',
    categoriesEndpoint: '/api/categories',
    brandsEndpoint: '/api/brands',
    
    // Colunas específicas de produtos com renders complexos
    columns: [
      {
        key: 'image',
        label: 'Produto',
        width: '250px',
        render: (value: string, row: any) => {
          const imageUrl = row.images?.[0] || row.image || `/api/placeholder/80/80?text=${encodeURIComponent(row.name)}`;
          return `
            <div class="flex items-center space-x-3">
              <img src="${imageUrl}" 
                alt="${row.name}" 
                class="w-12 h-12 lg:w-16 lg:h-16 rounded-lg object-cover flex-shrink-0 shadow-sm"
                onerror="this.src='/api/placeholder/80/80?text=${encodeURIComponent(row.name)}'"
              />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-900 text-sm lg:text-base truncate">${row.name}</div>
                <div class="text-xs lg:text-sm text-gray-500 mt-1">SKU: ${row.sku}</div>
                <div class="text-xs text-gray-400 lg:hidden">${row.category || 'Sem categoria'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'category',
        label: 'Categoria',
        sortable: true,
        hideOnMobile: true,
        render: (value: string, row: any) => {
          return `<span class="text-sm text-gray-600">${row.category || 'Sem categoria'}</span>`;
        }
      },
      {
        key: 'price',
        label: 'Preço',
        sortable: true,
        align: 'right',
        render: (value: number, row: any) => {
          const hasDiscount = row.original_price && row.original_price > value;
          return `
            <div class="text-right">
              <div class="font-semibold text-gray-900 text-sm lg:text-base">R$ ${value.toFixed(2)}</div>
              ${hasDiscount ? `<div class="text-xs text-gray-500 line-through">R$ ${row.original_price!.toFixed(2)}</div>` : ''}
            </div>
          `;
        }
      },
      {
        key: 'quantity',
        label: 'Estoque',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const bgColor = value === 0 ? 'bg-red-100 text-red-800' : value < 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
          return `
            <div class="text-center">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}">
                ${value}
              </span>
            </div>
          `;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: any, row: any) => {
          const isActive = Boolean(row.is_active);
          const bgClass = isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
          const status = isActive ? 'Ativo' : 'Inativo';
          return `
            <div class="text-center">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgClass}">
                ${status}
              </span>
            </div>
          `;
        }
      }
    ],
    
    // Estatísticas de produtos
    statsConfig: {
      total: 'total',
      active: 'active',
      pending: 'inactive',
      lowStock: 'low_stock'
    },
    
    searchPlaceholder: 'Buscar produtos, SKUs, descrições...',
    searchFields: ['name', 'sku', 'description'],
    
    // Filtros customizados específicos para produtos
    customFilters: [
      {
        key: 'featured',
        label: 'Produtos em Destaque',
        type: 'select',
        options: [
          { value: '', label: 'Todos os produtos' },
          { value: 'true', label: 'Em destaque' },
          { value: 'false', label: 'Não destacados' }
        ]
      },
      {
        key: 'stock_status',
        label: 'Status do Estoque',
        type: 'select',
        options: [
          { value: '', label: 'Todos os estoques' },
          { value: 'in_stock', label: 'Em estoque' },
          { value: 'low_stock', label: 'Estoque baixo' },
          { value: 'out_of_stock', label: 'Sem estoque' }
        ]
      },
      {
        key: 'has_images',
        label: 'Produtos com Imagens',
        type: 'select',
        options: [
          { value: '', label: 'Todos os produtos' },
          { value: 'true', label: 'Com imagens' },
          { value: 'false', label: 'Sem imagens' }
        ]
      }
    ],
    
    // Transformação de dados recebidos da API
    onDataLoad: (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      
      return data.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: Number(product.price || 0),
        original_price: product.originalPrice ? Number(product.originalPrice) : undefined,
        cost: product.cost ? Number(product.cost) : undefined,
        quantity: Number(product.stock || product.quantity || 0),
        category: product.category || product.category_name,
        category_id: product.category_id,
        brand: product.brand || product.brand_name,
        brand_id: product.brand_id,
        images: product.images || (product.image ? [product.image] : []),
        image: product.image,
        is_active: product.is_active !== false,
        featured: product.featured || false,
        created_at: product.createdAt || product.created_at,
        updated_at: product.updatedAt || product.updated_at
      }));
    },
    
    // Transformação de estatísticas da API
    onStatsLoad: (rawStats: any) => {
      return {
        total: rawStats.total || 0,
        active: rawStats.active || 0,
        inactive: rawStats.inactive || 0,
        low_stock: rawStats.low_stock || 0
      };
    },
    
    // Ações customizadas para produtos
    customActions: (row: any) => {
      return [
        {
          label: 'Editar',
          icon: 'edit',
          onclick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = `/produtos/${row.id}`;
            }
          }
        },
        {
          label: 'Duplicar',
          icon: 'copy',
          onclick: async () => {
            if (typeof window === 'undefined') return;
            
            const confirmed = confirm(`Deseja duplicar o produto "${row.name}"?`);
            if (!confirmed) return;
            
            try {
              const response = await fetch(`/api/products/${row.id}/duplicate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: `${row.name} - Cópia`,
                  sku: `${row.sku}-COPY-${Date.now()}`,
                  slug: `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-copy-${Date.now()}`
                })
              });
              
              const result = await response.json();
              
              if (response.ok && result.success) {
                alert(result.message || 'Produto duplicado com sucesso!');
                window.location.href = `/produtos/${result.data.id}`;
              } else {
                throw new Error(result.error || 'Erro ao duplicar produto');
              }
            } catch (error) {
              console.error('Erro ao duplicar produto:', error);
              alert('Erro ao duplicar produto. Tente novamente.');
            }
          }
        },
        {
          label: 'Histórico',
          icon: 'history',
          onclick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = `/produtos/${row.id}?tab=history`;
            }
          }
        },
        {
          label: 'Ver na Loja',
          icon: 'preview',
          onclick: () => {
            if (typeof window !== 'undefined') {
              const storeUrl = window.location.origin.replace(':5174', ':5173');
              window.open(`${storeUrl}/produtos/${row.id}`, '_blank');
            }
          }
        },
        {
          label: 'Excluir',
          icon: 'trash',
          onclick: async () => {
            if (typeof window === 'undefined') return;
            
            const confirmed = confirm(`Tem certeza que deseja EXCLUIR o produto "${row.name}"? Esta ação é irreversível!`);
            if (!confirmed) return;
            
            try {
              const response = await fetch(`/api/products/${row.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                throw new Error('Erro ao excluir produto');
              }
              
              window.location.reload();
            } catch (error) {
              console.error('Erro ao excluir produto:', error);
              alert('Erro ao excluir produto. Tente novamente.');
            }
          }
        }
      ];
    },
    
    // Ação em lote para produtos
    onBulkDelete: async (ids: string[]) => {
      if (typeof window === 'undefined') return;
      
      const confirmed = confirm(`Tem certeza que deseja EXCLUIR ${ids.length} produto(s)? Esta ação é irreversível!`);
      if (!confirmed) return;
      
      try {
        const response = await fetch('/api/products/bulk-delete', {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ ids })
        });
        
        if (!response.ok) {
          throw new Error('Erro ao excluir produtos');
        }
      } catch (error) {
        console.error('Erro na ação em lote:', error);
        throw error;
      }
    }
  },

  // ============ AVALIACOES ============
  avaliacoes: {
    title: 'Avaliações',
    entityName: 'avaliação',
    entityNamePlural: 'avaliações',
    newItemRoute: '/avaliacoes/nova',
    editItemRoute: (id: string) => `/avaliacoes/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/reviews',
    deleteEndpoint: '/api/reviews',
    statsEndpoint: '/api/reviews/stats',
    
    // Colunas específicas de avaliações
    columns: [
      {
        key: 'product',
        label: 'Produto',
        sortable: true,
        render: (value: any, row: any) => {
          const productName = row.product_name || value?.name || 'Produto removido';
          const productSku = row.product_sku || value?.sku || 'N/A';
          return `
            <div class="flex items-center space-x-3">
              <img src="${row.product_image || '/api/placeholder/40/40'}" 
                alt="${productName}" 
                class="w-10 h-10 rounded object-cover flex-shrink-0"
                onerror="this.src='/api/placeholder/40/40'"
              />
              <div>
                <div class="font-medium text-gray-900 text-sm">${productName}</div>
                <div class="text-xs text-gray-500">SKU: ${productSku}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'customer',
        label: 'Cliente',
        sortable: true,
        render: (value: any, row: any) => {
          const customerName = row.customer_name || value?.name || 'Cliente anônimo';
          const customerEmail = row.customer_email || value?.email || 'Email não informado';
          return `
            <div>
              <div class="font-medium text-gray-900">${customerName}</div>
              <div class="text-xs text-gray-500">${customerEmail}</div>
            </div>
          `;
        }
      },
      {
        key: 'rating',
        label: 'Avaliação',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const rating = value || 0;
          const stars = Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆').join('');
          const color = rating >= 4 ? 'text-green-600' : rating >= 3 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${stars} ${rating}/5</span>`;
        }
      },
      {
        key: 'comment',
        label: 'Comentário',
        render: (value: string) => {
          if (!value) return '<span class="text-gray-500 italic">Sem comentário</span>';
          const truncated = value.length > 60 ? value.slice(0, 60) + '...' : value;
          return `<span class="text-sm text-gray-600" title="${value}">${truncated}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string) => {
          const statuses = {
            pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
            approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
            rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
            flagged: { label: 'Sinalizado', color: 'bg-orange-100 text-orange-800' }
          };
          const status = statuses[value as keyof typeof statuses] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${status.color}">${status.label}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Data',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          const date = new Date(value);
          return `
            <div>
              <div class="text-sm text-gray-900">${date.toLocaleDateString('pt-BR')}</div>
              <div class="text-xs text-gray-500">${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
            </div>
          `;
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
    searchFields: ['product_name', 'customer_name', 'comment'],
    
    // Filtros customizados específicos para avaliações
    customFilters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'pending', label: 'Pendente' },
          { value: 'approved', label: 'Aprovado' },
          { value: 'rejected', label: 'Rejeitado' },
          { value: 'flagged', label: 'Sinalizado' }
        ]
      },
      {
        key: 'rating',
        label: 'Avaliação',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: '5', label: '5 estrelas' },
          { value: '4', label: '4 estrelas' },
          { value: '3', label: '3 estrelas' },
          { value: '2', label: '2 estrelas' },
          { value: '1', label: '1 estrela' }
        ]
      }
    ],
    
    // Ações específicas para avaliações
    customActions: (review: any) => {
      const actions = [];
      
      if (review.status === 'pending') {
        actions.push({
          label: 'Aprovar',
          icon: 'Check',
          variant: 'secondary',
          onclick: () => console.log('Aprovando avaliação:', review.id)
        });
        
        actions.push({
          label: 'Rejeitar',
          icon: 'X',
          variant: 'danger',
          onclick: () => console.log('Rejeitando avaliação:', review.id)
        });
      }
      
      if (review.status === 'approved') {
        actions.push({
          label: 'Sinalizar',
          icon: 'Flag',
          variant: 'warning',
          onclick: () => console.log('Sinalizando avaliação:', review.id)
        });
      }
      
      return actions;
    }
  },

  // ============ DEVOLUCOES ============
  devolucoes: {
    title: 'Devoluções',
    entityName: 'devolução',
    entityNamePlural: 'devoluções',
    newItemRoute: '/devolucoes/nova',
    editItemRoute: (id: string) => `/devolucoes/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/returns',
    deleteEndpoint: '/api/returns',
    statsEndpoint: '/api/returns/stats',
    
    // Colunas específicas de devoluções
    columns: [
      {
        key: 'order',
        label: 'Pedido',
        sortable: true,
        render: (value: any, row: any) => {
          const orderId = row.order_id || value?.id || 'N/A';
          const orderDate = row.order_date ? new Date(row.order_date).toLocaleDateString('pt-BR') : 'N/A';
          return `
            <div>
              <div class="font-medium text-gray-900">#${orderId}</div>
              <div class="text-xs text-gray-500">${orderDate}</div>
            </div>
          `;
        }
      },
      {
        key: 'customer',
        label: 'Cliente',
        sortable: true,
        render: (value: any, row: any) => {
          const customerName = row.customer_name || value?.name || 'Cliente não informado';
          const customerEmail = row.customer_email || value?.email || '';
          return `
            <div>
              <div class="font-medium text-gray-900">${customerName}</div>
              ${customerEmail ? `<div class="text-xs text-gray-500">${customerEmail}</div>` : ''}
            </div>
          `;
        }
      },
      {
        key: 'reason',
        label: 'Motivo',
        sortable: true,
        render: (value: string) => {
          const reasons = {
            defective: { label: 'Produto Defeituoso', color: 'bg-red-100 text-red-800' },
            wrong_item: { label: 'Item Errado', color: 'bg-orange-100 text-orange-800' },
            not_as_described: { label: 'Não Conforme', color: 'bg-yellow-100 text-yellow-800' },
            changed_mind: { label: 'Desistência', color: 'bg-blue-100 text-blue-800' },
            damaged: { label: 'Danificado', color: 'bg-purple-100 text-purple-800' }
          };
          const reason = reasons[value as keyof typeof reasons] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${reason.color}">${reason.label}</span>`;
        }
      },
      {
        key: 'amount',
        label: 'Valor',
        sortable: true,
        align: 'right',
        render: (value: number) => {
          const amount = value || 0;
          return `<span class="font-bold text-red-600">R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string) => {
          const statuses = {
            requested: { label: 'Solicitado', color: 'bg-yellow-100 text-yellow-800' },
            approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
            processing: { label: 'Processando', color: 'bg-blue-100 text-blue-800' },
            completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
            rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' }
          };
          const status = statuses[value as keyof typeof statuses] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${status.color}">${status.label}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Data Solicitação',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          const date = new Date(value);
          return `<span class="text-sm text-gray-600">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    // Estatísticas de devoluções
    statsConfig: {
      total: 'total_returns',
      active: 'processing_returns',
      pending: 'requested_returns',
      lowStock: 'rejected_returns'
    },
    
    searchPlaceholder: 'Buscar devoluções...',
    searchFields: ['order_id', 'customer_name', 'reason'],
    
    // Filtros customizados específicos para devoluções
    customFilters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'requested', label: 'Solicitado' },
          { value: 'approved', label: 'Aprovado' },
          { value: 'processing', label: 'Processando' },
          { value: 'completed', label: 'Concluído' },
          { value: 'rejected', label: 'Rejeitado' }
        ]
      },
      {
        key: 'reason',
        label: 'Motivo',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'defective', label: 'Produto Defeituoso' },
          { value: 'wrong_item', label: 'Item Errado' },
          { value: 'not_as_described', label: 'Não Conforme' },
          { value: 'changed_mind', label: 'Desistência' },
          { value: 'damaged', label: 'Danificado' }
        ]
      }
    ]
  },

  // ============ MARCAS ============
  marcas: {
    title: 'Marcas',
    entityName: 'marca',
    entityNamePlural: 'marcas',
    newItemRoute: '/marcas/nova',
    editItemRoute: (id: string) => `/marcas/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/brands',
    deleteEndpoint: '/api/brands',
    statsEndpoint: '/api/brands/stats',
    
    // Colunas específicas de marcas
    columns: [
      {
        key: 'logo',
        label: 'Marca',
        width: '250px',
        render: (value: string, row: any) => {
          const logoUrl = row.logo_url || value || `/api/placeholder/60/60?text=${encodeURIComponent(row.name)}`;
          return `
            <div class="flex items-center space-x-3">
              <img src="${logoUrl}" 
                alt="${row.name}" 
                class="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-sm"
                onerror="this.src='/api/placeholder/60/60?text=${encodeURIComponent(row.name)}'"
              />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-900">${row.name}</div>
                <div class="text-xs text-gray-500">${row.slug || 'slug-gerado'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'products_count',
        label: 'Produtos',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const count = value || 0;
          const color = count > 50 ? 'text-green-600' : count > 10 ? 'text-blue-600' : 'text-gray-600';
          return `<span class="font-medium ${color}">${count.toLocaleString()}</span>`;
        }
      },
      {
        key: 'description',
        label: 'Descrição',
        render: (value: string) => {
          if (!value) return '<span class="text-gray-500 italic">Sem descrição</span>';
          const truncated = value.length > 50 ? value.slice(0, 50) + '...' : value;
          return `<span class="text-sm text-gray-600" title="${value}">${truncated}</span>`;
        }
      },
      {
        key: 'is_featured',
        label: 'Destaque',
        sortable: true,
        align: 'center',
        render: (value: boolean) => 
          value 
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⭐ Destaque</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Normal</span>'
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
    
    // Estatísticas de marcas
    statsConfig: {
      total: 'total_brands',
      active: 'active_brands',
      pending: 'inactive_brands',
      lowStock: 'empty_brands'
    },
    
    searchPlaceholder: 'Buscar marcas...',
    searchFields: ['name', 'description', 'slug'],
    
    // Filtros customizados específicos para marcas
    customFilters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' }
        ]
      },
      {
        key: 'featured',
        label: 'Destaque',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'featured', label: 'Em Destaque' },
          { value: 'normal', label: 'Normal' }
        ]
      },
      {
        key: 'products_range',
        label: 'Produtos',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'empty', label: 'Sem produtos' },
          { value: 'few', label: '1-10 produtos' },
          { value: 'medium', label: '11-50 produtos' },
          { value: 'many', label: '50+ produtos' }
        ]
      }
    ]
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
  },

  // ============ NEWSLETTER ============
  newsletter: {
    title: 'Gestão de Newsletter',
    entityName: 'assinante',
    entityNamePlural: 'assinantes',
    newItemRoute: '/newsletter/novo',
    editItemRoute: (id: string) => `/newsletter/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/newsletter/subscribers',
    deleteEndpoint: '/api/newsletter/subscribers',
    statsEndpoint: '/api/newsletter/stats',
    
    // Colunas específicas de newsletter
    columns: [
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (value: string, row: any) => {
          return `
            <div>
              <div class="font-medium text-gray-900">${value}</div>
              <div class="text-xs text-gray-500">
                Inscrito em ${new Date(row.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          `;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const statuses = {
            active: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
            inactive: { label: 'Inativo', color: 'bg-red-100 text-red-800' },
            pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' }
          };
          const status = statuses[value as keyof typeof statuses] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${status.color}">${status.label}</span>`;
        }
      },
      {
        key: 'source',
        label: 'Origem',
        sortable: true,
        render: (value: string) => {
          const sources = {
            website: { label: 'Site', color: 'bg-blue-100 text-blue-800' },
            popup: { label: 'Pop-up', color: 'bg-purple-100 text-purple-800' },
            checkout: { label: 'Checkout', color: 'bg-green-100 text-green-800' },
            manual: { label: 'Manual', color: 'bg-gray-100 text-gray-800' }
          };
          const source = sources[value as keyof typeof sources] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${source.color}">${source.label}</span>`;
        }
      },
      {
        key: 'engagement_score',
        label: 'Engajamento',
        sortable: true,
        render: (value: number) => {
          const score = value || 0;
          const color = score > 70 ? 'text-green-600' : score > 40 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${score}%</span>`;
        }
      }
    ],
    
    // Estatísticas de newsletter
    statsConfig: {
      total: 'total_subscribers',
      active: 'active_subscribers',
      pending: 'pending_subscribers',
      lowStock: 'unsubscribed_today'
    },
    
    searchPlaceholder: 'Buscar por email...',
    searchFields: ['email'],
    
    // Filtros customizados específicos para newsletter
    customFilters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' },
          { value: 'pending', label: 'Pendente' }
        ]
      },
      {
        key: 'source',
        label: 'Origem',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: 'website', label: 'Site' },
          { value: 'popup', label: 'Pop-up' },
          { value: 'checkout', label: 'Checkout' },
          { value: 'manual', label: 'Manual' }
        ]
      }
    ]
  },

  // ============ BANNERS ============
  banners: {
    title: 'Gestão de Banners',
    entityName: 'banner',
    entityNamePlural: 'banners',
    newItemRoute: '/banners/novo',
    editItemRoute: (id: string) => `/banners/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/banners',
    deleteEndpoint: '/api/banners',
    statsEndpoint: '/api/banners/stats',
    
    // Colunas específicas de banners
    columns: [
      {
        key: 'image',
        label: 'Banner',
        width: '200px',
        render: (value: string, row: any) => {
          const imageUrl = row.image_url || `/api/placeholder/150/80?text=${encodeURIComponent(row.title)}`;
          return `
            <div class="flex items-center space-x-3">
              <img src="${imageUrl}" 
                alt="${row.title}" 
                class="w-16 h-10 rounded object-cover flex-shrink-0 shadow-sm"
                onerror="this.src='/api/placeholder/150/80?text=${encodeURIComponent(row.title)}'"
              />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-900 text-sm truncate">${row.title}</div>
                <div class="text-xs text-gray-500">${row.position || 'Home'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'position',
        label: 'Posição',
        sortable: true,
        render: (value: string) => {
          const positions = {
            home: { label: 'Home', color: 'bg-blue-100 text-blue-800' },
            category: { label: 'Categoria', color: 'bg-green-100 text-green-800' },
            delivery: { label: 'Entrega', color: 'bg-purple-100 text-purple-800' }
          };
          const position = positions[value as keyof typeof positions] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${position.color}">${position.label}</span>`;
        }
      },
      {
        key: 'countdown_info',
        label: 'Countdown',
        width: '180px',
        render: (value: any, row: any) => {
          if (!row.countdown_text || !row.countdown_end_time) {
            return '<span class="text-gray-400 text-xs">Sem countdown</span>';
          }
          
          const endTime = new Date(row.countdown_end_time);
          const isActive = endTime > new Date();
          const statusColor = isActive ? 'text-green-600' : 'text-red-600';
          const statusText = isActive ? 'Ativo' : 'Expirado';
          
          return `
            <div class="text-xs">
              <div class="font-medium ${statusColor}">${statusText}</div>
              <div class="text-gray-600 truncate">${row.countdown_text || 'Sem texto'}</div>
              <div class="text-gray-500">${endTime.toLocaleDateString('pt-BR')} ${endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `;
        }
      },
      {
        key: 'display_duration_minutes',
        label: 'Duração',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const duration = value || 60;
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          const color = duration >= 120 ? 'text-blue-600' : duration >= 60 ? 'text-green-600' : 'text-yellow-600';
          
          if (hours > 0) {
            return `<span class="font-medium ${color}">${hours}h${minutes > 0 ? ` ${minutes}m` : ''}</span>`;
          } else {
            return `<span class="font-medium ${color}">${minutes}m</span>`;
          }
        }
      },
      {
        key: 'clicks',
        label: 'Cliques',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const clicks = value || 0;
          const color = clicks > 100 ? 'text-green-600' : clicks > 50 ? 'text-yellow-600' : 'text-gray-600';
          return `<span class="font-medium ${color}">${clicks.toLocaleString()}</span>`;
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
      },
      {
        key: 'expires_at',
        label: 'Expira em',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          if (!value) return '<span class="text-gray-500">Sem expiração</span>';
          const date = new Date(value);
          const isExpired = date < new Date();
          const color = isExpired ? 'text-red-600' : 'text-gray-600';
          return `<span class="text-sm ${color}">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    // Estatísticas de banners
    statsConfig: {
      total: 'total_banners',
      active: 'active_banners',
      pending: 'inactive_banners',
      lowStock: 'expiring_banners'
    },
    
    searchPlaceholder: 'Buscar banners...',
    searchFields: ['title', 'description'],
    
    // Filtros customizados específicos para banners
    customFilters: [
      {
        key: 'position',
        label: 'Posição',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: 'home', label: 'Home' },
          { value: 'category', label: 'Categoria' },
          { value: 'delivery', label: 'Entrega' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' }
        ]
      },
      {
        key: 'countdown_status',
        label: 'Countdown',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'with_countdown', label: 'Com Countdown' },
          { value: 'without_countdown', label: 'Sem Countdown' },
          { value: 'active_countdown', label: 'Countdown Ativo' },
          { value: 'expired_countdown', label: 'Countdown Expirado' }
        ]
      },
      {
        key: 'auto_rotate',
        label: 'Rotação',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'true', label: 'Auto-rotação' },
          { value: 'false', label: 'Fixo' }
        ]
      }
    ]
  },

  // ============ ANALYTICS VENDEDORES ============
  'analytics-vendedores': {
    title: 'Analytics de Vendedores',
    entityName: 'vendedor',
    entityNamePlural: 'vendedores',
    newItemRoute: '/vendedores/novo',
    editItemRoute: (id: string) => `/vendedores/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/sellers/analytics',
    statsEndpoint: '/api/sellers/analytics/stats',
    
    // Colunas específicas de analytics de vendedores
    columns: [
      {
        key: 'seller',
        label: 'Vendedor',
        sortable: true,
        render: (value: any, row: any) => {
          const medal = row.ranking <= 3 ? (row.ranking === 1 ? '🥇' : row.ranking === 2 ? '🥈' : '🥉') : '';
          return `
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center text-white font-bold text-sm">
                ${row.seller_name?.charAt(0) || 'V'}
              </div>
              <div>
                <div class="font-medium text-gray-900 flex items-center gap-1">
                  ${medal} ${row.seller_name || 'Vendedor'}
                </div>
                <div class="text-xs text-gray-500">Ranking #${row.ranking || '?'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'revenue',
        label: 'Receita',
        sortable: true,
        align: 'right',
        render: (value: number) => {
          const revenue = value || 0;
          return `<span class="font-bold text-green-600">R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
      },
      {
        key: 'orders',
        label: 'Pedidos',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const orders = value || 0;
          return `<span class="font-medium text-blue-600">${orders.toLocaleString()}</span>`;
        }
      },
      {
        key: 'conversion_rate',
        label: 'Conversão',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const rate = value || 0;
          const color = rate > 5 ? 'text-green-600' : rate > 2 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${rate.toFixed(1)}%</span>`;
        }
      },
      {
        key: 'growth',
        label: 'Crescimento',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const growth = value || 0;
          const isPositive = growth >= 0;
          const color = isPositive ? 'text-green-600' : 'text-red-600';
          const icon = isPositive ? '↗️' : '↘️';
          return `<span class="font-medium ${color}">${icon} ${Math.abs(growth).toFixed(1)}%</span>`;
        }
      }
    ],
    
    // Estatísticas de analytics
    statsConfig: {
      total: 'total_sellers',
      active: 'active_sellers',
      pending: 'low_performance',
      lowStock: 'new_sellers'
    },
    
    searchPlaceholder: 'Buscar vendedores...',
    searchFields: ['seller_name', 'seller_email'],
    
    // Filtros customizados específicos para analytics de vendedores
    customFilters: [
      {
        key: 'performance',
        label: 'Performance',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'high', label: 'Alta Performance' },
          { value: 'medium', label: 'Média Performance' },
          { value: 'low', label: 'Baixa Performance' }
        ]
      },
      {
        key: 'period',
        label: 'Período',
        type: 'select',
        options: [
          { value: '7d', label: 'Últimos 7 dias' },
          { value: '30d', label: 'Últimos 30 dias' },
          { value: '90d', label: 'Últimos 90 dias' },
          { value: '1y', label: 'Último ano' }
        ]
      }
    ]
  },

  // ============ DASHBOARD FINANCEIRO ============
  'dashboard-financeiro': {
    title: 'Dashboard Financeiro',
    entityName: 'transação',
    entityNamePlural: 'transações',
    newItemRoute: '/financeiro/nova',
    editItemRoute: (id: string) => `/financeiro/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/financial/dashboard',
    statsEndpoint: '/api/financial/stats',
    
    // Colunas específicas de dashboard financeiro
    columns: [
      {
        key: 'date',
        label: 'Data',
        sortable: true,
        render: (value: string) => {
          const date = new Date(value);
          return `
            <div>
              <div class="font-medium text-gray-900">${date.toLocaleDateString('pt-BR')}</div>
              <div class="text-xs text-gray-500">${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
            </div>
          `;
        }
      },
      {
        key: 'revenue',
        label: 'Receita',
        sortable: true,
        align: 'right',
        render: (value: number) => {
          const revenue = value || 0;
          return `<span class="font-bold text-green-600">R$ ${revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
      },
      {
        key: 'expenses',
        label: 'Despesas',
        sortable: true,
        align: 'right',
        render: (value: number) => {
          const expenses = value || 0;
          return `<span class="font-medium text-red-600">R$ ${expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
      },
      {
        key: 'profit',
        label: 'Lucro',
        sortable: true,
        align: 'right',
        render: (value: number, row: any) => {
          const profit = (row.revenue || 0) - (row.expenses || 0);
          const color = profit >= 0 ? 'text-green-600' : 'text-red-600';
          return `<span class="font-bold ${color}">R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
      },
      {
        key: 'margin',
        label: 'Margem',
        sortable: true,
        align: 'center',
        render: (value: number, row: any) => {
          const revenue = row.revenue || 0;
          const expenses = row.expenses || 0;
          const margin = revenue > 0 ? ((revenue - expenses) / revenue * 100) : 0;
          const color = margin > 20 ? 'text-green-600' : margin > 10 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${margin.toFixed(1)}%</span>`;
        }
      }
    ],
    
    // Estatísticas do dashboard financeiro
    statsConfig: {
      total: 'total_revenue',
      active: 'profit_margin',
      pending: 'pending_transactions',
      lowStock: 'overdue_payments'
    },
    
    searchPlaceholder: 'Buscar transações...',
    searchFields: ['description', 'reference'],
    
    // Filtros customizados específicos para dashboard financeiro
    customFilters: [
      {
        key: 'period',
        label: 'Período',
        type: 'select',
        options: [
          { value: 'week', label: 'Esta Semana' },
          { value: 'month', label: 'Este Mês' },
          { value: 'quarter', label: 'Este Trimestre' },
          { value: 'year', label: 'Este Ano' }
        ]
      },
      {
        key: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'revenue', label: 'Receita' },
          { value: 'expense', label: 'Despesa' }
        ]
      }
    ]
  },

  // ============ LOGS ============
  logs: {
    title: 'Logs & Auditoria',
    entityName: 'log',
    entityNamePlural: 'logs',
    newItemRoute: '', // Logs são read-only
    editItemRoute: (id: string) => `/logs/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/logs',
    statsEndpoint: '/api/logs/stats',
    
    // Colunas específicas de logs
    columns: [
      {
        key: 'timestamp',
        label: 'Data/Hora',
        sortable: true,
        render: (value: string) => {
          const date = new Date(value);
          return `
            <div>
              <div class="font-medium text-gray-900 text-xs">${date.toLocaleDateString('pt-BR')}</div>
              <div class="text-xs text-gray-500">${date.toLocaleTimeString('pt-BR')}</div>
            </div>
          `;
        }
      },
      {
        key: 'action',
        label: 'Ação',
        sortable: true,
        render: (value: string, row: any) => {
          const actions = {
            login: { label: 'Login', color: 'bg-blue-100 text-blue-800' },
            logout: { label: 'Logout', color: 'bg-gray-100 text-gray-800' },
            create: { label: 'Criar', color: 'bg-green-100 text-green-800' },
            update: { label: 'Editar', color: 'bg-yellow-100 text-yellow-800' },
            delete: { label: 'Excluir', color: 'bg-red-100 text-red-800' }
          };
          const action = actions[value as keyof typeof actions] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `
            <div>
              <span class="px-2 py-1 text-xs font-medium rounded-full ${action.color}">${action.label}</span>
              <div class="text-xs text-gray-500 mt-1">${row.entity || ''}</div>
            </div>
          `;
        }
      },
      {
        key: 'user',
        label: 'Usuário',
        sortable: true,
        render: (value: any, row: any) => {
          return `
            <div>
              <div class="font-medium text-gray-900 text-sm">${row.user_name || 'Sistema'}</div>
              <div class="text-xs text-gray-500">${row.user_email || row.ip_address}</div>
            </div>
          `;
        }
      },
      {
        key: 'details',
        label: 'Detalhes',
        render: (value: string, row: any) => {
          const details = value || row.description || 'Sem detalhes';
          const truncated = details.length > 50 ? details.slice(0, 50) + '...' : details;
          return `<span class="text-sm text-gray-600" title="${details}">${truncated}</span>`;
        }
      },
      {
        key: 'ip_address',
        label: 'IP',
        hideOnMobile: true,
        render: (value: string) => {
          return `<span class="text-xs text-gray-500 font-mono">${value || 'N/A'}</span>`;
        }
      }
    ],
    
    // Estatísticas de logs
    statsConfig: {
      total: 'total_logs',
      active: 'logs_today',
      pending: 'critical_logs',
      lowStock: 'failed_actions'
    },
    
    searchPlaceholder: 'Buscar logs...',
    searchFields: ['action', 'user_name', 'details'],
    
    // Filtros customizados específicos para logs
    customFilters: [
      {
        key: 'action',
        label: 'Ação',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: 'login', label: 'Login' },
          { value: 'logout', label: 'Logout' },
          { value: 'create', label: 'Criar' },
          { value: 'update', label: 'Editar' },
          { value: 'delete', label: 'Excluir' }
        ]
      },
      {
        key: 'period',
        label: 'Período',
        type: 'select',
        options: [
          { value: 'today', label: 'Hoje' },
          { value: 'week', label: 'Esta Semana' },
          { value: 'month', label: 'Este Mês' },
          { value: 'quarter', label: 'Este Trimestre' }
        ]
      }
    ]
  },

  // ============ FINANCEIRO ============
  financeiro: {
    title: 'Financeiro',
    entityName: 'transação',
    entityNamePlural: 'transações',
    newItemRoute: '/financeiro/nova',
    editItemRoute: (id: string) => `/financeiro/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/financial/transactions',
    deleteEndpoint: '/api/financial/transactions',
    statsEndpoint: '/api/financial/stats',
    
    // Colunas específicas de financeiro
    columns: [
      {
        key: 'date',
        label: 'Data',
        sortable: true,
        render: (value: string) => {
          const date = new Date(value);
          return `
            <div>
              <div class="font-medium text-gray-900">${date.toLocaleDateString('pt-BR')}</div>
              <div class="text-xs text-gray-500">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `;
        }
      },
      {
        key: 'type',
        label: 'Tipo',
        sortable: true,
        render: (value: string) => {
          const types = {
            revenue: { label: 'Receita', color: 'bg-green-100 text-green-800' },
            expense: { label: 'Despesa', color: 'bg-red-100 text-red-800' },
            transfer: { label: 'Transferência', color: 'bg-blue-100 text-blue-800' },
            commission: { label: 'Comissão', color: 'bg-purple-100 text-purple-800' }
          };
          const type = types[value as keyof typeof types] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${type.color}">${type.label}</span>`;
        }
      },
      {
        key: 'category',
        label: 'Categoria',
        sortable: true,
        render: (value: string) => {
          return `<span class="text-sm text-gray-600">${value || 'Sem categoria'}</span>`;
        }
      },
      {
        key: 'amount',
        label: 'Valor',
        sortable: true,
        align: 'right',
        render: (value: number, row: any) => {
          const amount = value || 0;
          const isPositive = row.type === 'revenue' || row.type === 'commission';
          const color = isPositive ? 'text-green-600' : 'text-red-600';
          const prefix = isPositive ? '+' : '-';
          return `<span class="font-bold ${color}">${prefix} R$ ${Math.abs(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
      },
      {
        key: 'description',
        label: 'Descrição',
        render: (value: string) => {
          if (!value) return '<span class="text-gray-500 italic">Sem descrição</span>';
          const truncated = value.length > 40 ? value.slice(0, 40) + '...' : value;
          return `<span class="text-sm text-gray-600" title="${value}">${truncated}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string) => {
          const statuses = {
            pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
            confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800' },
            cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
          };
          const status = statuses[value as keyof typeof statuses] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${status.color}">${status.label}</span>`;
        }
      }
    ],
    
    // Estatísticas de financeiro
    statsConfig: {
      total: 'total_transactions',
      active: 'confirmed_transactions',
      pending: 'pending_transactions',
      lowStock: 'cancelled_transactions'
    },
    
    searchPlaceholder: 'Buscar transações...',
    searchFields: ['description', 'category', 'reference'],
    
    // Filtros customizados específicos para financeiro
    customFilters: [
      {
        key: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'revenue', label: 'Receita' },
          { value: 'expense', label: 'Despesa' },
          { value: 'transfer', label: 'Transferência' },
          { value: 'commission', label: 'Comissão' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'pending', label: 'Pendente' },
          { value: 'confirmed', label: 'Confirmado' },
          { value: 'cancelled', label: 'Cancelado' }
        ]
      }
    ]
  },

  // ============ ARMAZENS ============
  armazens: {
    title: 'Armazéns',
    entityName: 'armazém',
    entityNamePlural: 'armazéns',
    newItemRoute: '/armazens/novo',
    editItemRoute: (id: string) => `/armazens/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/warehouses',
    deleteEndpoint: '/api/warehouses',
    statsEndpoint: '/api/warehouses/stats',
    
    // Colunas específicas de armazéns
    columns: [
      {
        key: 'name',
        label: 'Nome',
        sortable: true,
        render: (value: string, row: any) => {
          return `
            <div>
              <div class="font-medium text-gray-900">${value}</div>
              <div class="text-xs text-gray-500">${row.code || 'Código não definido'}</div>
            </div>
          `;
        }
      },
      {
        key: 'location',
        label: 'Localização',
        sortable: true,
        render: (value: any, row: any) => {
          const city = row.city || value?.city || '';
          const state = row.state || value?.state || '';
          return `
            <div>
              <div class="text-sm text-gray-900">${city}</div>
              <div class="text-xs text-gray-500">${state}</div>
            </div>
          `;
        }
      },
      {
        key: 'capacity',
        label: 'Capacidade',
        sortable: true,
        align: 'center',
        render: (value: number, row: any) => {
          const current = row.current_stock || 0;
          const total = value || 0;
          const percentage = total > 0 ? (current / total * 100) : 0;
          const color = percentage > 90 ? 'text-red-600' : percentage > 70 ? 'text-yellow-600' : 'text-green-600';
          return `
            <div>
              <div class="font-medium ${color}">${current.toLocaleString()} / ${total.toLocaleString()}</div>
              <div class="text-xs text-gray-500">${percentage.toFixed(1)}% ocupado</div>
            </div>
          `;
        }
      },
      {
        key: 'manager',
        label: 'Responsável',
        sortable: true,
        render: (value: any, row: any) => {
          const name = row.manager_name || value?.name || 'Não definido';
          const email = row.manager_email || value?.email || '';
          return `
            <div>
              <div class="text-sm text-gray-900">${name}</div>
              ${email ? `<div class="text-xs text-gray-500">${email}</div>` : ''}
            </div>
          `;
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
    
    // Estatísticas de armazéns
    statsConfig: {
      total: 'total_warehouses',
      active: 'active_warehouses',
      pending: 'inactive_warehouses',
      lowStock: 'full_warehouses'
    },
    
    searchPlaceholder: 'Buscar armazéns...',
    searchFields: ['name', 'code', 'city', 'manager_name'],
    
    // Filtros customizados específicos para armazéns
    customFilters: [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' }
        ]
      },
      {
        key: 'capacity',
        label: 'Ocupação',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: 'low', label: 'Até 50%' },
          { value: 'medium', label: '50-80%' },
          { value: 'high', label: 'Acima 80%' }
        ]
      }
    ]
  },

  // ============ LISTAS PRESENTES ============
  'listas-presentes': {
    title: 'Listas de Presentes',
    entityName: 'lista',
    entityNamePlural: 'listas',
    newItemRoute: '/listas-presentes/nova',
    editItemRoute: (id: string) => `/listas-presentes/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/gift-lists',
    deleteEndpoint: '/api/gift-lists',
    statsEndpoint: '/api/gift-lists/stats',
    
    // Colunas específicas de listas de presentes
    columns: [
      {
        key: 'name',
        label: 'Nome da Lista',
        sortable: true,
        render: (value: string, row: any) => {
          const eventDate = row.event_date ? new Date(row.event_date).toLocaleDateString('pt-BR') : '';
          return `
            <div>
              <div class="font-medium text-gray-900">${value}</div>
              <div class="text-xs text-gray-500">${row.event_type || 'Evento'} ${eventDate ? `- ${eventDate}` : ''}</div>
            </div>
          `;
        }
      },
      {
        key: 'owner',
        label: 'Proprietário',
        sortable: true,
        render: (value: any, row: any) => {
          const name = row.owner_name || value?.name || 'Não informado';
          const email = row.owner_email || value?.email || '';
          return `
            <div>
              <div class="font-medium text-gray-900">${name}</div>
              ${email ? `<div class="text-xs text-gray-500">${email}</div>` : ''}
            </div>
          `;
        }
      },
      {
        key: 'items_count',
        label: 'Itens',
        sortable: true,
        align: 'center',
        render: (value: number, row: any) => {
          const total = value || 0;
          const purchased = row.purchased_items || 0;
          const percentage = total > 0 ? (purchased / total * 100) : 0;
          const color = percentage === 100 ? 'text-green-600' : percentage > 50 ? 'text-blue-600' : 'text-gray-600';
          return `
            <div>
              <div class="font-medium ${color}">${purchased}/${total}</div>
              <div class="text-xs text-gray-500">${percentage.toFixed(0)}% comprado</div>
            </div>
          `;
        }
      },
      {
        key: 'total_value',
        label: 'Valor Total',
        sortable: true,
        align: 'right',
        render: (value: number) => {
          const amount = value || 0;
          return `<span class="font-medium text-gray-900">R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
      },
      {
        key: 'privacy',
        label: 'Privacidade',
        sortable: true,
        align: 'center',
        render: (value: string) => {
          const privacies = {
            public: { label: 'Pública', color: 'bg-green-100 text-green-800' },
            private: { label: 'Privada', color: 'bg-red-100 text-red-800' },
            friends: { label: 'Amigos', color: 'bg-blue-100 text-blue-800' }
          };
          const privacy = privacies[value as keyof typeof privacies] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${privacy.color}">${privacy.label}</span>`;
        }
      },
      {
        key: 'created_at',
        label: 'Criada em',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          const date = new Date(value);
          return `<span class="text-sm text-gray-600">${date.toLocaleDateString('pt-BR')}</span>`;
        }
      }
    ],
    
    // Estatísticas de listas de presentes
    statsConfig: {
      total: 'total_lists',
      active: 'public_lists',
      pending: 'private_lists',
      lowStock: 'completed_lists'
    },
    
    searchPlaceholder: 'Buscar listas...',
    searchFields: ['name', 'owner_name', 'event_type'],
    
    // Filtros customizados específicos para listas de presentes
    customFilters: [
      {
        key: 'privacy',
        label: 'Privacidade',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: 'public', label: 'Pública' },
          { value: 'private', label: 'Privada' },
          { value: 'friends', label: 'Amigos' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todas' },
          { value: 'active', label: 'Ativa' },
          { value: 'completed', label: 'Concluída' },
          { value: 'expired', label: 'Expirada' }
        ]
      }
    ]
  },



  // ============ METODOS PAGAMENTO ============
  'metodos-pagamento': {
    title: 'Métodos de Pagamento',
    entityName: 'método',
    entityNamePlural: 'métodos',
    newItemRoute: '/metodos-pagamento/novo',
    editItemRoute: (id: string) => `/metodos-pagamento/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/payment-methods',
    deleteEndpoint: '/api/payment-methods',
    statsEndpoint: '/api/payment-methods/stats',
    
    // Colunas específicas de métodos de pagamento
    columns: [
      {
        key: 'name',
        label: 'Método',
        sortable: true,
        render: (value: string, row: any) => {
          const icon = row.icon || '💳';
          return `
            <div class="flex items-center space-x-3">
              <div class="text-2xl">${icon}</div>
              <div>
                <div class="font-medium text-gray-900">${value}</div>
                <div class="text-xs text-gray-500">${row.provider || 'Provedor não definido'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'type',
        label: 'Tipo',
        sortable: true,
        render: (value: string) => {
          const types = {
            credit_card: { label: 'Cartão de Crédito', color: 'bg-blue-100 text-blue-800' },
            debit_card: { label: 'Cartão de Débito', color: 'bg-green-100 text-green-800' },
            pix: { label: 'PIX', color: 'bg-purple-100 text-purple-800' },
            bank_slip: { label: 'Boleto', color: 'bg-orange-100 text-orange-800' },
            digital_wallet: { label: 'Carteira Digital', color: 'bg-indigo-100 text-indigo-800' }
          };
          const type = types[value as keyof typeof types] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${type.color}">${type.label}</span>`;
        }
      },
      {
        key: 'fee_percentage',
        label: 'Taxa (%)',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const fee = value || 0;
          const color = fee === 0 ? 'text-green-600' : fee < 3 ? 'text-blue-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${fee.toFixed(2)}%</span>`;
        }
      },
      {
        key: 'installments',
        label: 'Parcelas',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const max = value || 1;
          return `<span class="text-sm text-gray-600">até ${max}x</span>`;
        }
      },
      {
        key: 'usage_count',
        label: 'Uso',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const count = value || 0;
          return `<span class="font-medium text-gray-900">${count.toLocaleString()}</span>`;
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
    
    // Estatísticas de métodos de pagamento
    statsConfig: {
      total: 'total_methods',
      active: 'active_methods',
      pending: 'inactive_methods',
      lowStock: 'high_fee_methods'
    },
    
    searchPlaceholder: 'Buscar métodos...',
    searchFields: ['name', 'provider', 'type'],
    
    // Filtros customizados específicos para métodos de pagamento
    customFilters: [
      {
        key: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'credit_card', label: 'Cartão de Crédito' },
          { value: 'debit_card', label: 'Cartão de Débito' },
          { value: 'pix', label: 'PIX' },
          { value: 'bank_slip', label: 'Boleto' },
          { value: 'digital_wallet', label: 'Carteira Digital' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' }
        ]
      }
    ]
  },

  // ============ INTEGRACOES ============
  integracoes: {
    title: 'Integrações',
    entityName: 'integração',
    entityNamePlural: 'integrações',
    newItemRoute: '/integracoes/nova',
    editItemRoute: (id: string) => `/integracoes/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/integrations',
    deleteEndpoint: '/api/integrations',
    statsEndpoint: '/api/integrations/stats',
    
    // Colunas específicas de integrações
    columns: [
      {
        key: 'name',
        label: 'Integração',
        sortable: true,
        render: (value: string, row: any) => {
          const icon = row.icon || '🔗';
          return `
            <div class="flex items-center space-x-3">
              <div class="text-2xl">${icon}</div>
              <div>
                <div class="font-medium text-gray-900">${value}</div>
                <div class="text-xs text-gray-500">${row.provider || 'Provedor'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'type',
        label: 'Tipo',
        sortable: true,
        render: (value: string) => {
          const types = {
            payment: { label: 'Pagamento', color: 'bg-green-100 text-green-800' },
            shipping: { label: 'Frete', color: 'bg-blue-100 text-blue-800' },
            erp: { label: 'ERP', color: 'bg-purple-100 text-purple-800' },
            analytics: { label: 'Analytics', color: 'bg-orange-100 text-orange-800' },
            marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-800' },
            crm: { label: 'CRM', color: 'bg-indigo-100 text-indigo-800' }
          };
          const type = types[value as keyof typeof types] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${type.color}">${type.label}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string) => {
          const statuses = {
            active: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
            inactive: { label: 'Inativo', color: 'bg-red-100 text-red-800' },
            error: { label: 'Erro', color: 'bg-red-100 text-red-800' },
            testing: { label: 'Teste', color: 'bg-yellow-100 text-yellow-800' }
          };
          const status = statuses[value as keyof typeof statuses] || { label: value, color: 'bg-gray-100 text-gray-800' };
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${status.color}">${status.label}</span>`;
        }
      },
      {
        key: 'last_sync',
        label: 'Última Sync',
        sortable: true,
        hideOnMobile: true,
        render: (value: string) => {
          if (!value) return '<span class="text-gray-500">Nunca</span>';
          const date = new Date(value);
          const now = new Date();
          const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
          const color = diffHours < 1 ? 'text-green-600' : diffHours < 24 ? 'text-yellow-600' : 'text-red-600';
          return `
            <div>
              <div class="text-sm ${color}">${date.toLocaleDateString('pt-BR')}</div>
              <div class="text-xs text-gray-500">${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `;
        }
      },
      {
        key: 'health_score',
        label: 'Saúde',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const score = value || 0;
          const color = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-600';
          return `<span class="font-medium ${color}">${score}%</span>`;
        }
      }
    ],
    
    // Estatísticas de integrações
    statsConfig: {
      total: 'total_integrations',
      active: 'active_integrations',
      pending: 'error_integrations',
      lowStock: 'testing_integrations'
    },
    
    searchPlaceholder: 'Buscar integrações...',
    searchFields: ['name', 'provider', 'type'],
    
    // Filtros customizados específicos para integrações
    customFilters: [
      {
        key: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'payment', label: 'Pagamento' },
          { value: 'shipping', label: 'Frete' },
          { value: 'erp', label: 'ERP' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'marketing', label: 'Marketing' },
          { value: 'crm', label: 'CRM' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'active', label: 'Ativo' },
          { value: 'inactive', label: 'Inativo' },
          { value: 'error', label: 'Erro' },
          { value: 'testing', label: 'Teste' }
        ]
      }
    ]
  },

  // ============ VARIACOES ============
  variacoes: {
    title: 'Variações de Produtos',
    entityName: 'variação',
    entityNamePlural: 'variações',
    newItemRoute: '/variacoes/nova',
    editItemRoute: (id: string) => `/variacoes/${id}`,
    
    // API endpoints - mesmos dos produtos
    apiEndpoint: '/api/variations',
    deleteEndpoint: '/api/variations',
    statsEndpoint: '/api/variations/stats',
    categoriesEndpoint: '/api/categories',
    brandsEndpoint: '/api/brands',
    
    // Colunas herdadas dos produtos + específicas das variações
    columns: [
      {
        key: 'image',
        label: 'Variação',
        width: '250px',
        render: (value: string, row: any) => {
          const imageUrl = row.product?.images?.[0] || row.product?.image || row.images?.[0] || row.image || `/api/placeholder/80/80?text=${encodeURIComponent(row.name || row.sku)}`;
          return `
            <div class="flex items-center space-x-3">
              <img src="${imageUrl}" 
                alt="${row.name || row.sku}" 
                class="w-12 h-12 lg:w-16 lg:h-16 rounded-lg object-cover flex-shrink-0 shadow-sm"
                onerror="this.src='/api/placeholder/80/80?text=${encodeURIComponent(row.name || row.sku)}'"
              />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-900 text-sm lg:text-base truncate">${row.name || `${row.product?.name || 'Produto'} - ${row.sku}`}</div>
                <div class="text-xs lg:text-sm text-gray-500 mt-1">SKU: ${row.sku}</div>
                <div class="text-xs text-gray-400 lg:hidden">${row.product?.name || 'Produto'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'product_base',
        label: 'Produto Base',
        sortable: true,
        hideOnMobile: true,
        render: (value: string, row: any) => {
          const productName = row.product?.name || row.product_name || 'Produto não encontrado';
          const categoryName = row.product?.category || row.category || 'Sem categoria';
          return `
            <div>
              <div class="font-medium text-gray-900 text-sm">${productName}</div>
              <div class="text-xs text-gray-500">${categoryName}</div>
            </div>
          `;
        }
      },
      {
        key: 'options',
        label: 'Opções',
        render: (value: any[], row: any) => {
          const options = Array.isArray(value) ? value : [];
          if (options.length === 0) {
            return '<span class="text-xs text-gray-500 italic">Sem opções</span>';
          }
          
          const displayOptions = options.slice(0, 2);
          const remaining = options.length - 2;
          
          return `
            <div class="flex flex-wrap gap-1">
              ${displayOptions.map(opt => {
                const optionName = opt.option_name || opt.name || 'Opção';
                const optionValue = opt.display_value || opt.option_value || opt.value || 'Valor';
                return `<span class="px-2 py-1 bg-[#00BFB3]/10 text-[#00BFB3] text-xs rounded border border-[#00BFB3]/20 font-medium transition-all duration-200 hover:bg-[#00BFB3]/20" title="${optionName}: ${optionValue}">${optionValue}</span>`;
              }).join('')}
              ${remaining > 0 ? `<span class="px-2 py-1 bg-[#00BFB3] text-white text-xs rounded font-medium transition-all duration-200 hover:bg-[#00A89D]">+${remaining}</span>` : ''}
            </div>
          `;
        }
      },
      {
        key: 'price',
        label: 'Preço',
        sortable: true,
        align: 'right',
        render: (value: number, row: any) => {
          const price = Number(value || 0);
          const hasDiscount = row.original_price && row.original_price > price;
          return `
            <div class="text-right">
              <div class="font-semibold text-gray-900 text-sm lg:text-base">R$ ${price.toFixed(2)}</div>
              ${hasDiscount ? `<div class="text-xs text-gray-500 line-through">R$ ${Number(row.original_price).toFixed(2)}</div>` : ''}
            </div>
          `;
        }
      },
      {
        key: 'quantity',
        label: 'Estoque',
        sortable: true,
        align: 'center',
        render: (value: number) => {
          const stock = Number(value || 0);
          const bgColor = stock === 0 ? 'bg-gray-100 text-gray-600 border-gray-200' : stock < 10 ? 'bg-[#00BFB3]/20 text-[#00A89D] border-[#00BFB3]/30' : 'bg-[#00BFB3]/10 text-[#00BFB3] border-[#00BFB3]/20';
          return `
            <div class="text-center">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-200 ${bgColor}">
                ${stock}
              </span>
            </div>
          `;
        }
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: any, row: any) => {
          const isActive = Boolean(row.is_active);
          const bgClass = isActive ? 'bg-[#00BFB3]/10 text-[#00BFB3] border-[#00BFB3]/20' : 'bg-gray-100 text-gray-800 border-gray-200';
          const status = isActive ? 'Ativa' : 'Inativa';
          const icon = isActive ? '✓' : '⏸';
          return `
            <div class="text-center">
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-200 ${bgClass}">
                <span class="text-[10px]">${icon}</span>
                ${status}
              </span>
            </div>
          `;
        }
      }
    ],
    
    // Estatísticas herdadas dos produtos
    statsConfig: {
      total: 'total',
      active: 'active',
      pending: 'inactive',
      lowStock: 'low_stock'
    },
    
    searchPlaceholder: 'Buscar variações, SKUs, produtos...',
    searchFields: ['name', 'sku', 'product_name'],
    
    // Filtros customizados herdados dos produtos + específicos
    customFilters: [
      {
        key: 'featured',
        label: 'Variações em Destaque',
        type: 'select',
        options: [
          { value: '', label: 'Todas as variações' },
          { value: 'true', label: 'Em destaque' },
          { value: 'false', label: 'Não destacadas' }
        ]
      },
      {
        key: 'stock_status',
        label: 'Status do Estoque',
        type: 'select',
        options: [
          { value: '', label: 'Todos os estoques' },
          { value: 'in_stock', label: 'Em estoque' },
          { value: 'low_stock', label: 'Estoque baixo' },
          { value: 'out_of_stock', label: 'Sem estoque' }
        ]
      },
      {
        key: 'has_images',
        label: 'Variações com Imagens',
        type: 'select',
        options: [
          { value: '', label: 'Todas as variações' },
          { value: 'true', label: 'Com imagens' },
          { value: 'false', label: 'Sem imagens' }
        ]
      }
    ],
    
    // Transformação de dados recebidos da API
    onDataLoad: (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      
      return data.map((variation: any) => ({
        id: variation.id,
        name: variation.name || `${variation.product?.name || 'Produto'} - ${variation.sku}`,
        sku: variation.sku,
        price: Number(variation.price || 0),
        original_price: variation.original_price ? Number(variation.original_price) : undefined,
        cost: variation.cost ? Number(variation.cost) : undefined,
        quantity: Number(variation.quantity || 0),
        product: variation.product,
        product_id: variation.product?.id || variation.product_id,
        product_name: variation.product?.name || variation.product_name,
        category: variation.product?.category || variation.category,
        brand: variation.product?.brand || variation.brand,
        images: variation.product?.images || variation.images || [],
        image: variation.product?.image || variation.image,
        options: variation.options || [],
        is_active: variation.is_active !== false,
        featured: variation.featured || false,
        created_at: variation.created_at,
        updated_at: variation.updated_at
      }));
    },
    
    // Transformação de estatísticas da API
    onStatsLoad: (rawStats: any) => {
      return {
        total: rawStats.total_variations || rawStats.total || 0,
        active: rawStats.active_variations || rawStats.active || 0,
        inactive: rawStats.inactive_variations || rawStats.inactive || 0,
        low_stock: rawStats.low_stock_variations || rawStats.low_stock || 0
      };
    },
    
    // Ações customizadas herdadas dos produtos + específicas
    customActions: (row: any) => {
      return [
        {
          label: 'Editar',
          icon: 'edit',
          onclick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = `/variacoes/${row.id}`;
            }
          }
        },
        {
          label: 'Ver Produto Base',
          icon: 'package',
          onclick: () => {
            if (typeof window !== 'undefined') {
              window.location.href = `/produtos/${row.product?.id || row.product_id}`;
            }
          }
        },
        {
          label: 'Duplicar',
          icon: 'copy',
          onclick: async () => {
            if (typeof window === 'undefined') return;
            
            const confirmed = confirm(`Deseja duplicar a variação "${row.name}"?`);
            if (!confirmed) return;
            
            try {
              const response = await fetch(`/api/variations/${row.id}/duplicate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  sku: `${row.sku}-COPY-${Date.now()}`
                })
              });
              
              const result = await response.json();
              
              if (response.ok && result.success) {
                alert(result.message || 'Variação duplicada com sucesso!');
                window.location.href = `/variacoes/${result.data.id}`;
              } else {
                throw new Error(result.error || 'Erro ao duplicar variação');
              }
            } catch (error) {
              console.error('Erro ao duplicar variação:', error);
              alert('Erro ao duplicar variação. Tente novamente.');
            }
          }
        },
        {
          label: 'Ver na Loja',
          icon: 'preview',
          onclick: () => {
            if (typeof window !== 'undefined') {
              const storeUrl = window.location.origin.replace(':5174', ':5173');
              window.open(`${storeUrl}/produtos/${row.product?.id || row.product_id}?variant=${row.sku}`, '_blank');
            }
          }
        },
        {
          label: 'Excluir',
          icon: 'trash',
          onclick: async () => {
            if (typeof window === 'undefined') return;
            
            const confirmed = confirm(`Tem certeza que deseja EXCLUIR a variação "${row.name}"? Esta ação é irreversível!`);
            if (!confirmed) return;
            
            try {
              const response = await fetch(`/api/variations/${row.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!response.ok) {
                throw new Error('Erro ao excluir variação');
              }
              
              window.location.reload();
            } catch (error) {
              console.error('Erro ao excluir variação:', error);
              alert('Erro ao excluir variação. Tente novamente.');
            }
          }
        }
      ];
    },
    
    // Ação em lote herdada dos produtos
    onBulkDelete: async (ids: string[]) => {
      if (typeof window === 'undefined') return;
      
      const confirmed = confirm(`Tem certeza que deseja EXCLUIR ${ids.length} variação(ões)? Esta ação é irreversível!`);
      if (!confirmed) return;
      
      try {
        const response = await fetch('/api/variations/bulk-delete', {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ ids })
        });
        
        if (!response.ok) {
          throw new Error('Erro ao excluir variações');
        }
      } catch (error) {
        console.error('Erro na ação em lote:', error);
        throw error;
      }
    }
  },

     // ============ CUPONS ============
  cupons: {
    title: 'Gestão de Cupons',
    entityName: 'cupom',
    entityNamePlural: 'cupons',
    newItemRoute: '/cupons/novo',
    editItemRoute: (id: string) => `/cupons/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/coupons',
    deleteEndpoint: '/api/coupons',
    statsEndpoint: '/api/coupons/stats',
    
    // Colunas específicas de cupons
    columns: [
      {
        key: 'code',
        label: 'Código',
        sortable: true,
        render: (value: string, row: any) => `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              ${row.type === 'percentage' ? '%' : row.type === 'fixed' ? 'R$' : '🚚'}
            </div>
            <div>
              <div class="font-medium text-gray-900">${value}</div>
              <div class="text-sm text-gray-500">${row.type === 'percentage' ? 'Percentual' : row.type === 'fixed' ? 'Valor Fixo' : 'Frete Grátis'}</div>
            </div>
          </div>
        `
      },
      {
        key: 'description',
        label: 'Descrição',
        sortable: true,
        render: (value: string) => `<div class="max-w-xs truncate font-medium text-gray-900">${value}</div>`
      },
      {
        key: 'value',
        label: 'Valor',
        sortable: true,
        align: 'center',
        render: (value: number, row: any) => {
          if (row.type === 'percentage') return `<span class="font-medium text-green-600">${value}%</span>`;
          if (row.type === 'fixed') return `<span class="font-medium text-green-600">R$ ${value.toFixed(2)}</span>`;
          return `<span class="font-medium text-blue-600">Frete Grátis</span>`;
        }
      },
      {
        key: 'usage_stats',
        label: 'Uso',
        align: 'center',
        render: (value: any, row: any) => {
          const usageText = row.usage_limit ? `${row.usage_count}/${row.usage_limit}` : `${row.usage_count}`;
          return `<div class="text-center font-medium text-gray-900">${usageText}</div>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: string, row: any) => {
          const now = new Date();
          const start = new Date(row.start_date);
          const end = new Date(row.end_date);
          let status = 'active';
          
          if (!row.is_active) status = 'inactive';
          else if (now < start) status = 'scheduled';
          else if (now > end) status = 'expired';
          else if (row.usage_limit && row.usage_count >= row.usage_limit) status = 'exhausted';
          
          const statusMap = {
            active: { color: 'green', label: 'Ativo' },
            scheduled: { color: 'blue', label: 'Agendado' },
            expired: { color: 'yellow', label: 'Expirado' },
            exhausted: { color: 'red', label: 'Esgotado' },
            inactive: { color: 'gray', label: 'Inativo' }
          };
          const config = statusMap[status] || statusMap.inactive;
          return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${config.color}-100 text-${config.color}-800">${config.label}</span>`;
        }
      }
    ],
    
    // Configurações de busca e filtros
    searchPlaceholder: 'Buscar cupons...',
    searchFields: ['code', 'description'],
    
    // Configurações de estatísticas
    statsConfig: {
      total: 'total_coupons',
      active: 'active_coupons', 
      pending: 'scheduled_coupons',
      lowStock: 'expired_coupons'
    },
    
    // Filtros personalizados
    customFilters: [
      {
        key: 'type',
        label: 'Tipo de Cupom',
        type: 'select',
        options: [
          { value: '', label: 'Todos os Tipos' },
          { value: 'percentage', label: 'Percentual' },
          { value: 'fixed', label: 'Valor Fixo' },
          { value: 'free_shipping', label: 'Frete Grátis' }
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: '', label: 'Todos' },
          { value: 'active', label: 'Ativos' },
          { value: 'scheduled', label: 'Agendados' },
          { value: 'expired', label: 'Expirados' },
          { value: 'exhausted', label: 'Esgotados' },
          { value: 'inactive', label: 'Inativos' }
        ]
      }
    ]
  },

  // ============ PAGINAS CMS ============
  paginas: {
     title: 'Páginas CMS',
     entityName: 'página',
     entityNamePlural: 'páginas',
     newItemRoute: '/paginas/nova',
     editItemRoute: (id: string) => `/paginas/${id}`,
     
     // API endpoints
     apiEndpoint: '/api/pages',
     deleteEndpoint: '/api/pages',
     statsEndpoint: '/api/pages/stats',
     
     // Colunas específicas de páginas
     columns: [
       {
         key: 'title',
         label: 'Título',
         sortable: true,
         render: (value: string, row: any) => `
           <div>
             <div class="font-medium text-gray-900">${value}</div>
             <div class="text-sm text-gray-500">/${row.slug}</div>
           </div>
         `
       },
       {
         key: 'isPublished',
         label: 'Status',
         sortable: true,
         align: 'center',
         render: (value: boolean) => {
           const status = value ? 'Publicada' : 'Rascunho';
           const color = value ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800';
           return `<span class="px-2 py-1 text-xs font-medium rounded-full ${color}">${status}</span>`;
         }
       },
       {
         key: 'createdAt',
         label: 'Criado em',
         sortable: true,
         render: (value: string) => {
           const date = new Date(value);
           return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
         }
       },
       {
         key: 'updatedAt',
         label: 'Atualizado em',
         sortable: true,
         render: (value: string) => {
           const date = new Date(value);
           return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
         }
       }
     ],
     
     // Estatísticas de páginas
     statsConfig: {
       total: 'total',
       active: 'published',
       pending: 'draft',
       lowStock: 'blog_posts'
     },
     
     searchPlaceholder: 'Buscar páginas...',
     searchFields: ['title', 'slug', 'content'],
     
     // Filtros customizados específicos para páginas
     customFilters: [
       {
         key: 'status',
         label: 'Status',
         type: 'select',
         options: [
           { value: '', label: 'Todos os Status' },
           { value: 'published', label: 'Publicadas' },
           { value: 'draft', label: 'Rascunho' }
         ]
       }
     ],
     
     // Ações customizadas para páginas
     customActions: (row: any) => [
       {
         label: 'Editar',
         icon: 'Edit',
         onclick: () => window.location.href = `/paginas/${row.id}`
       },
       {
         label: 'Visualizar',
         icon: 'Eye',
         onclick: () => window.open(`/${row.slug}`, '_blank')
       },
       {
         label: 'Excluir',
         icon: 'Trash',
         onclick: () => {
           if (confirm(`Tem certeza que deseja excluir a página "${row.title}"?`)) {
             // Implementar exclusão via API
             window.location.reload();
           }
         }
       }
     ],
     
     // Transformação de dados
     onDataLoad: (data: any[]) => {
       if (!data || !Array.isArray(data)) return [];
       
       return data.map((page: any) => ({
         id: page.id,
         title: page.title,
         slug: page.slug,
         content: page.content,
         isPublished: Boolean(page.isPublished),
         createdAt: page.createdAt,
         updatedAt: page.updatedAt
       }));
     },
     
     // Transformação de estatísticas
     onStatsLoad: (rawStats: any) => {
       return {
         total: rawStats.total || 0,
         active: rawStats.published || 0,
         pending: rawStats.draft || 0,
         lowStock: rawStats.blog_posts || 0
       };
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