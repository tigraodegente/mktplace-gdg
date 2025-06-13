/**
 * Universal Page Configuration System
 * Enhanced configuration that leverages universal CRUD capabilities
 */

import { PageColumnSets } from '../utils/columnTemplates';
import type { TableColumn } from '../utils/columnTemplates';
import type { UniversalActionConfig } from '../services/universalCrudService';

export interface UniversalPageConfig {
  // Basic configuration
  title: string;
  entityName: string;
  entityNamePlural: string;
  entityType: string; // Used for universal APIs
  
  // Routes
  newItemRoute: string;
  editItemRoute: (id: string) => string;
  
  // API endpoints
  apiEndpoint: string;
  deleteEndpoint?: string;
  statsEndpoint?: string;
  categoriesEndpoint?: string;
  brandsEndpoint?: string;
  
  // Table configuration
  columns: TableColumn[];
  
  // Statistics configuration
  statsConfig?: {
    total: string;
    active: string;
    pending: string;
    lowStock: string;
  };
  
  // Search configuration
  searchPlaceholder?: string;
  searchFields?: string[];
  
  // Filters
  customFilters?: Array<{
    key: string;
    label: string;
    type: 'select' | 'input' | 'range' | 'date';
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  
  // Universal Actions Configuration
  universalActions: UniversalActionConfig;
  
  // Data transformation functions
  onDataLoad?: (data: any[]) => any[];
  onStatsLoad?: (stats: any) => any;
  
  // Bulk actions
  bulkActions?: Array<{
    label: string;
    icon: string;
    variant: string;
    action: string;
  }>;
  
  // Feature flags
  features?: {
    search?: boolean;
    filters?: boolean;
    stats?: boolean;
    bulkActions?: boolean;
    export?: boolean;
    import?: boolean;
  };
}

/**
 * Universal Page Configurations
 */
export const UniversalPageConfigs: Record<string, UniversalPageConfig> = {
  // ============ PRODUTOS ============
  produtos: {
    title: 'Gestão de Produtos',
    entityName: 'produto',
    entityNamePlural: 'produtos',
    entityType: 'products',
    
    newItemRoute: '/produtos/novo',
    editItemRoute: (id: string) => `/produtos/${id}`,
    
    // API endpoints
    apiEndpoint: '/api/products',
    deleteEndpoint: '/api/products', // Will use universal delete
    statsEndpoint: '/api/products/stats',
    categoriesEndpoint: '/api/categories',
    brandsEndpoint: '/api/brands',
    
    // Universal Actions - leveraging new system
    universalActions: {
      edit: true,
      duplicate: true,
      history: true,
      delete: true,
      export: true,
      preview: {
        enabled: true,
        url_template: '/produto/{slug}'
      },
      custom: [
        {
          label: 'Enriquecer com IA',
          icon: 'sparkles',
          variant: 'secondary',
          action: 'enrichWithAI("{id}")',
          condition: 'description.length < 50' // Show only for products with short descriptions
        },
        {
          label: 'Gerenciar Estoque',
          icon: 'package',
          variant: 'secondary',
          action: '/produtos/{id}?tab=estoque'
        }
      ]
    },
    
    // Enhanced columns using universal system
    columns: [
      {
        key: 'name',
        label: 'Produto',
        sortable: true,
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
        render: (value: string, row: any) => `<span class="text-sm text-gray-600">${row.category || 'Sem categoria'}</span>`
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
    
    statsConfig: {
      total: 'total',
      active: 'active',
      pending: 'inactive',
      lowStock: 'low_stock'
    },
    
    searchPlaceholder: 'Buscar produtos, SKUs, descrições...',
    searchFields: ['name', 'sku', 'description'],
    
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
      }
    ],
    
    onDataLoad: (data: any[]) => {
      return data.map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: Number(product.price || 0),
        original_price: product.originalPrice ? Number(product.originalPrice) : undefined,
        quantity: Number(product.stock || product.quantity || 0),
        category: product.category || product.category_name,
        images: product.images || (product.image ? [product.image] : []),
        is_active: product.is_active !== false,
        created_at: product.createdAt || product.created_at,
        updated_at: product.updatedAt || product.updated_at
      }));
    },
    
    features: {
      search: true,
      filters: true,
      stats: true,
      bulkActions: true,
      export: true,
      import: false
    }
  },

  // ============ BANNERS ============
  banners: {
    title: 'Gestão de Banners',
    entityName: 'banner',
    entityNamePlural: 'banners',
    entityType: 'banners',
    
    newItemRoute: '/banners/novo',
    editItemRoute: (id: string) => `/banners/${id}`,
    
    apiEndpoint: '/api/banners',
    deleteEndpoint: '/api/banners', // Universal delete
    statsEndpoint: '/api/banners/stats',
    
    universalActions: {
      edit: true,
      duplicate: true,
      history: true,
      delete: true,
      export: true,
      preview: {
        enabled: true,
        url_template: '/preview/banner/{id}'
      }
    },
    
    columns: [
      {
        key: 'title',
        label: 'Banner',
        sortable: true,
        render: (value: string, row: any) => {
          const imageUrl = row.image_url || '/api/placeholder/200/100?text=Banner';
          return `
            <div class="flex items-center space-x-3">
              <img src="${imageUrl}" 
                alt="${row.title}" 
                class="w-16 h-8 lg:w-20 lg:h-10 rounded object-cover flex-shrink-0 shadow-sm"
                onerror="this.src='/api/placeholder/200/100?text=Banner'"
              />
              <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-900 text-sm lg:text-base truncate">${row.title}</div>
                <div class="text-xs text-gray-500 mt-1">${row.type || 'Banner'}</div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'position',
        label: 'Posição',
        sortable: true,
        align: 'center'
      },
      {
        key: 'is_active',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (value: boolean) => {
          const bgClass = value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
          const status = value ? 'Ativo' : 'Inativo';
          return `<span class="px-2 py-1 text-xs font-medium rounded-full ${bgClass}">${status}</span>`;
        }
      }
    ],
    
    searchPlaceholder: 'Buscar banners...',
    searchFields: ['title', 'description'],
    
    features: {
      search: true,
      filters: false,
      stats: true,
      bulkActions: true,
      export: false
    }
  }
};

/**
 * Get universal page configuration
 */
export function getUniversalPageConfig(pageName: string): UniversalPageConfig | undefined {
  return UniversalPageConfigs[pageName];
}

/**
 * Generate JavaScript functions for universal actions
 */
export function generateUniversalActionHandlers(): string {
  return `
    // Universal Action Handlers
    window.duplicateEntity = async function(entityType, entityId) {
      try {
        const response = await fetch(\`/api/universal/\${entityType}/duplicate\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${localStorage.getItem('access_token')}\`
          },
          body: JSON.stringify({ entity_id: entityId })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(result.message || 'Item duplicado com sucesso!');
          window.location.reload();
        } else {
          alert('Erro ao duplicar: ' + result.error);
        }
      } catch (error) {
        alert('Erro ao duplicar item');
        console.error(error);
      }
    };
    
    window.showHistory = function(entityType, entityId) {
      // Open history modal or navigate to history page
      window.open(\`/api/universal/\${entityType}/history?entity_id=\${entityId}\`, '_blank');
    };
    
    window.exportHistory = function(entityType, entityId) {
      const url = \`/api/universal/\${entityType}/history/export?entity_id=\${entityId}&format=csv\`;
      window.open(url, '_blank');
    };
    
    window.deleteEntity = async function(entityType, entityId, entityName) {
      if (!confirm(\`Tem certeza que deseja excluir "\${entityName}"?\`)) return;
      
      try {
        const response = await fetch(\`/api/universal/\${entityType}/delete\`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${localStorage.getItem('access_token')}\`
          },
          body: JSON.stringify({ entity_id: entityId })
        });
        
        if (response.ok) {
          alert('Item excluído com sucesso!');
          window.location.reload();
        } else {
          alert('Erro ao excluir item');
        }
      } catch (error) {
        alert('Erro ao excluir item');
        console.error(error);
      }
    };
  `;
} 