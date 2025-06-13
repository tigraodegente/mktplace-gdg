import { createFormConfig, createProductFormConfig } from './baseFormConfig';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'number' | 'date' | 'image' | 'file' | 'rich-text' | 'color' | 'url' | 'email' | 'password' | 'json';
  required?: boolean;
  placeholder?: string;
  help?: string;
  fullWidth?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
  conditional?: {
    field: string;
    value: any;
    operator?: 'equals' | 'not-equals' | 'contains' | 'greater' | 'less';
  };
}

export interface FormTab {
  id: string;
  label: string;
  icon: string;
  component?: string;
  fields?: FormField[];
  description?: string;
  badge?: () => number;
}

export interface FormConfig {
  title: string;
  subtitle?: string;
  entityName: string;
  
  // Configurações de salvamento
  createEndpoint: string;
  updateEndpoint: (id: string) => string;
  loadEndpoint?: (id: string) => string;
  
  // Configurações de abas
  tabs: FormTab[];
  defaultTab: string;
  
  // Configurações de validação
  requiredFields?: string[];
  
  // Configurações de dados
  defaultFormData?: any;
  
  // Configurações de IA
  aiEnabled?: boolean;
  aiEndpoint?: string;
  
  // Callbacks customizados
  onBeforeSave?: (data: any) => any;
  onAfterSave?: (data: any, result: any) => void;
  onBeforeLoad?: (id: string) => void;
  onAfterLoad?: (data: any) => any;
  
  // Configurações de interface
  showHistory?: boolean;
  showDuplicate?: boolean;
  showPreview?: boolean;
  previewUrl?: (id: string) => string;
  
  // Rotas de navegação
  listRoute: string;
  createRoute?: string;
  
  // Configurações de breadcrumb
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export const FormConfigs: Record<string, FormConfig> = {
  // ============ PRODUTOS (mantido sistema existente) ============
  produtos: createProductFormConfig({
    entityName: 'products',
    title: 'Produto',
    requiredFields: ['name', 'sku'],
    defaultFormData: {
      name: '',
      sku: '',
      description: '',
      short_description: '',
      price: 0,
      cost: 0,
      weight: 0,
      is_active: true,
      featured: false,
      track_inventory: true,
      images: [],
      tags: [],
      meta_keywords: [],
      attributes: {},
      specifications: {},
      tags_input: '',
      meta_keywords_input: '',
      published_at: '',
      status: 'draft'
    },
    specificCallbacks: {
      onBeforeSave: (data: any) => {
        // Converter strings para arrays
        if (data.tags_input) {
          data.tags = data.tags_input.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
        if (data.meta_keywords_input) {
          data.meta_keywords = data.meta_keywords_input.split(',').map((k: string) => k.trim()).filter(Boolean);
        }
        
        // Mapear preços do PricingTab para o banco
        data.price = parseFloat(data.sale_price || data.price) || 0;
        data.original_price = data.regular_price ? parseFloat(data.regular_price) : null;
        data.cost = parseFloat(data.cost_price || data.cost) || 0;
        data.quantity = parseInt(data.quantity) || 0;
        data.weight = data.weight ? parseFloat(data.weight) : null;
        
        // Remover campos temporários
        delete data.tags_input;
        delete data.meta_keywords_input;
        delete data.category_name;
        delete data.brand_name;
        delete data.vendor_name;
        delete data.cost_price;
        delete data.sale_price;
        delete data.regular_price;
        delete data.categories;
        delete data.category_ids;
        
        return data;
      },
      
      onAfterLoad: (data: any) => {
        // Mapear campos de preço para o PricingTab
        data.cost_price = data.cost || 0;
        data.sale_price = data.price || 0;
        data.regular_price = data.original_price || 0;
        
        // Preparar campos especiais
        if (data.tags && Array.isArray(data.tags)) {
          data.tags_input = data.tags.join(', ');
        } else {
          data.tags = [];
          data.tags_input = '';
        }
        
        if (data.meta_keywords && Array.isArray(data.meta_keywords)) {
          data.meta_keywords_input = data.meta_keywords.join(', ');
        } else {
          data.meta_keywords = [];
          data.meta_keywords_input = '';
        }
        
        // Preparar imagens
        if (data.images && Array.isArray(data.images)) {
          data.images = data.images.map((img: any) => 
            typeof img === 'string' ? img : img.url
          );
        } else {
          data.images = [];
        }
        
        // Inicializar campos booleanos
        data.is_active = data.is_active ?? true;
        data.featured = data.featured ?? false;
        data.has_free_shipping = data.has_free_shipping ?? false;
        data.track_inventory = data.track_inventory ?? true;
        data.allow_backorder = data.allow_backorder ?? false;
        
        return data;
      }
    }
  }),

  // ============ BANNERS (sistema dinâmico) ============
  banners: createFormConfig({
    entityName: 'banners',
    title: 'Banner',
    subtitle: 'Gerencie banners promocionais da loja',
    showPreview: true,
    previewUrl: (id: string) => `/preview/banner/${id}`,
    requiredFields: ['title', 'image'],
    customTabs: [
      {
        id: 'basic',
        label: 'Informações Básicas',
        icon: 'Image',
        description: 'Dados principais do banner',
        fields: [
          {
            name: 'title',
            label: 'Título',
            type: 'text',
            required: true,
            placeholder: 'Título do banner'
          },
          {
            name: 'subtitle',
            label: 'Subtítulo',
            type: 'text',
            placeholder: 'Subtítulo opcional'
          },
          {
            name: 'image',
            label: 'Imagem',
            type: 'image',
            required: true,
            help: 'Tamanho recomendado: 1920x600px',
            fullWidth: true
          },
          {
            name: 'link',
            label: 'Link',
            type: 'url',
            placeholder: 'https://exemplo.com'
          },
          {
            name: 'target',
            label: 'Abrir link em',
            type: 'select',
            options: [
              { value: '_self', label: 'Mesma janela' },
              { value: '_blank', label: 'Nova janela' }
            ]
          },
          {
            name: 'is_active',
            label: 'Status',
            type: 'boolean'
          }
        ]
      },
      {
        id: 'scheduling',
        label: 'Agendamento',
        icon: 'Calendar',
        description: 'Controle de datas e ordem',
        fields: [
          {
            name: 'start_date',
            label: 'Data de início',
            type: 'date',
            help: 'Deixe vazio para ativar imediatamente'
          },
          {
            name: 'end_date',
            label: 'Data de fim',
            type: 'date',
            help: 'Deixe vazio para não ter fim'
          },
          {
            name: 'order',
            label: 'Ordem de exibição',
            type: 'number',
            help: 'Menor número aparece primeiro',
            validation: { min: 0 }
          }
        ]
      }
    ]
  }),

  // ============ VARIAÇÕES (sistema dinâmico) ============
  variacoes: createFormConfig({
    entityName: 'variations',
    title: 'Variação',
    subtitle: 'Gerencie variações de produtos',
    requiredFields: ['name', 'product_id'],
    customTabs: [
      {
        id: 'basic',
        label: 'Básico',
        icon: 'Package',
        description: 'Informações básicas da variação',
        fields: [
          {
            name: 'name',
            label: 'Nome da Variação',
            type: 'text',
            required: true,
            placeholder: 'Ex: Camiseta Azul P'
          },
          {
            name: 'product_id',
            label: 'Produto',
            type: 'select',
            required: true,
            options: [], // Será preenchido dinamicamente
            help: 'Produto ao qual esta variação pertence'
          },
          {
            name: 'sku',
            label: 'SKU',
            type: 'text',
            placeholder: 'Código único da variação'
          },
          {
            name: 'description',
            label: 'Descrição',
            type: 'textarea',
            fullWidth: true,
            placeholder: 'Detalhes específicos desta variação'
          },
          {
            name: 'is_active',
            label: 'Ativa',
            type: 'boolean'
          }
        ]
      },
      {
        id: 'pricing',
        label: 'Preços',
        icon: 'DollarSign',
        description: 'Valores específicos da variação',
        fields: [
          {
            name: 'price',
            label: 'Preço de Venda',
            type: 'number',
            required: true,
            validation: { min: 0 },
            help: 'Preço final ao consumidor'
          },
          {
            name: 'original_price',
            label: 'Preço Original',
            type: 'number',
            validation: { min: 0 },
            help: 'Preço antes do desconto (opcional)'
          },
          {
            name: 'cost',
            label: 'Custo',
            type: 'number',
            validation: { min: 0 },
            help: 'Custo de aquisição/produção'
          }
        ]
      },
      {
        id: 'inventory',
        label: 'Estoque',
        icon: 'Package',
        description: 'Controle de inventário',
        fields: [
          {
            name: 'quantity',
            label: 'Quantidade',
            type: 'number',
            validation: { min: 0 },
            help: 'Quantidade disponível em estoque'
          },
          {
            name: 'min_quantity',
            label: 'Estoque Mínimo',
            type: 'number',
            validation: { min: 0 },
            help: 'Alerta quando atingir este valor'
          },
          {
            name: 'track_inventory',
            label: 'Controlar Estoque',
            type: 'boolean',
            help: 'Rastrear movimentações de estoque'
          },
          {
            name: 'allow_backorder',
            label: 'Permitir Pré-venda',
            type: 'boolean',
            help: 'Aceitar pedidos mesmo sem estoque'
          }
        ]
      },
      {
        id: 'attributes',
        label: 'Atributos',
        icon: 'Settings',
        description: 'Características específicas',
        fields: [
          {
            name: 'color',
            label: 'Cor',
            type: 'text',
            placeholder: 'Ex: Azul Marinho'
          },
          {
            name: 'size',
            label: 'Tamanho',
            type: 'select',
            options: [
              { value: 'PP', label: 'PP' },
              { value: 'P', label: 'P' },
              { value: 'M', label: 'M' },
              { value: 'G', label: 'G' },
              { value: 'GG', label: 'GG' },
              { value: 'XG', label: 'XG' }
            ]
          },
          {
            name: 'material',
            label: 'Material',
            type: 'text',
            placeholder: 'Ex: 100% Algodão'
          },
          {
            name: 'weight',
            label: 'Peso (kg)',
            type: 'number',
            validation: { min: 0 },
            help: 'Peso para cálculo de frete'
          }
        ]
      }
    ]
  }),

  // ============ VENDEDORES (sistema dinâmico com IA) ============
  vendedores: createFormConfig({
    entityName: 'sellers',
    title: 'Vendedor',
    subtitle: 'Gerencie informações dos vendedores parceiros',
    aiEnabled: true,
    requiredFields: ['company_name', 'email'],
    customTabs: [
      {
        id: 'basic',
        label: 'Informações Básicas',
        icon: 'User',
        fields: [
          {
            name: 'company_name',
            label: 'Nome da Empresa',
            type: 'text',
            required: true
          },
          {
            name: 'trading_name',
            label: 'Nome Fantasia',
            type: 'text'
          },
          {
            name: 'cnpj',
            label: 'CNPJ',
            type: 'text',
            validation: {
              pattern: '\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}'
            }
          },
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            required: true
          },
          {
            name: 'phone',
            label: 'Telefone',
            type: 'text'
          },
          {
            name: 'is_active',
            label: 'Status',
            type: 'boolean'
          }
        ]
      },
      {
        id: 'description',
        label: 'Descrição',
        icon: 'FileText',
        fields: [
          {
            name: 'description',
            label: 'Descrição da Empresa',
            type: 'textarea',
            fullWidth: true,
            help: 'Descreva os produtos e serviços oferecidos'
          },
          {
            name: 'category',
            label: 'Categoria',
            type: 'select',
            options: [
              { value: 'eletronicos', label: 'Eletrônicos' },
              { value: 'moda', label: 'Moda e Beleza' },
              { value: 'casa', label: 'Casa e Jardim' },
              { value: 'esportes', label: 'Esportes' }
            ]
          },
          {
            name: 'website',
            label: 'Website',
            type: 'url'
          }
        ]
      }
    ]
  }),

  // ============ CATEGORIAS (exemplo de nova entidade simples) ============
  categorias: createFormConfig({
    entityName: 'categories',
    title: 'Categoria',
    subtitle: 'Gerencie categorias de produtos',
    requiredFields: ['name'],
    fields: [
      {
        name: 'name',
        label: 'Nome',
        type: 'text',
        required: true,
        placeholder: 'Nome da categoria'
      },
      {
        name: 'description',
        label: 'Descrição',
        type: 'textarea',
        fullWidth: true,
        placeholder: 'Descrição da categoria'
      },
      {
        name: 'image',
        label: 'Imagem',
        type: 'image',
        help: 'Imagem representativa da categoria'
      },
      {
        name: 'parent_id',
        label: 'Categoria Pai',
        type: 'select',
        options: [
          { value: '', label: 'Categoria principal' },
          { value: '1', label: 'Eletrônicos' },
          { value: '2', label: 'Moda' }
        ],
        help: 'Deixe vazio para categoria principal'
      },
      {
        name: 'is_active',
        label: 'Ativa',
        type: 'boolean'
      },
      {
        name: 'order',
        label: 'Ordem',
        type: 'number',
        validation: { min: 0 }
      }
    ]
  })
};

/**
 * Função helper para buscar configuração de formulário
 */
export function getFormConfig(formName: string): FormConfig | undefined {
  return FormConfigs[formName];
} 