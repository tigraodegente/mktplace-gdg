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
  // ============ PRODUTOS ============
  produtos: {
    title: 'Produto',
    entityName: 'products',
    
    // API endpoints
    createEndpoint: '/products',
    updateEndpoint: (id: string) => `/products/${id}`,
    loadEndpoint: (id: string) => `/products/${id}`,
    
    // Configurações de abas
    tabs: [
      {
        id: 'basic',
        label: 'Básico',
        icon: 'Package',
        component: 'BasicTab',
        description: 'Informações fundamentais'
      },
      {
        id: 'pricing',
        label: 'Preços',
        icon: 'DollarSign',
        component: 'PricingTab',
        description: 'Valores e margens'
      },
      {
        id: 'attributes',
        label: 'Atributos',
        icon: 'Settings',
        component: 'AttributesSection',
        description: 'Características do produto'
      },
      {
        id: 'variants',
        label: 'Variações',
        icon: 'Layers',
        component: 'VariantsTab',
        description: 'Cores, tamanhos, etc'
      },
      {
        id: 'inventory',
        label: 'Estoque',
        icon: 'Package',
        component: 'InventoryTab',
        description: 'Inventário e dimensões'
      },
      {
        id: 'media',
        label: 'Mídia',
        icon: 'Image',
        component: 'MediaTab',
        description: 'Imagens e vídeos'
      },
      {
        id: 'shipping',
        label: 'Frete',
        icon: 'Truck',
        component: 'ShippingTab',
        description: 'Configurações de envio'
      },
      {
        id: 'seo',
        label: 'SEO',
        icon: 'Search',
        component: 'SeoTab',
        description: 'Otimização para buscadores'
      },
      {
        id: 'advanced',
        label: 'Avançado',
        icon: 'Settings',
        component: 'AdvancedTab',
        description: 'Configurações extras'
      }
    ],
    
    defaultTab: 'basic',
    
    // Validação
    requiredFields: ['name', 'sku'],
    
    // Dados padrão
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
      published_at: '', // Data vazia por padrão
      status: 'draft' // Status padrão
    },
    
    // IA habilitada
    aiEnabled: true,
    aiEndpoint: '/ai/enrich',
    
    // Interface
    showHistory: true,
    showDuplicate: true,
    showPreview: false,
    
    // Navegação
    listRoute: '/produtos',
    createRoute: '/produtos/novo',
    
    // Breadcrumbs
    breadcrumbs: [
      { label: 'Produtos', href: '/produtos' },
      { label: 'Editar' }
    ],
    
    // Callbacks customizados
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
  },

  // ============ BANNERS ============
  banners: {
    entityName: 'banner',
    title: 'Banner',
    subtitle: 'Gerencie banners promocionais da loja',
    
    listRoute: '/banners',
    createEndpoint: '/banners',
    updateEndpoint: (id: string) => `/banners/${id}`,
    loadEndpoint: (id: string) => `/banners/${id}`,
    
    defaultTab: 'basic',
    requiredFields: ['title', 'image'],
    
    defaultFormData: {
      title: '',
      subtitle: '',
      image: '',
      link: '',
      order: 0,
      is_active: true,
      start_date: '',
      end_date: '',
      target: '_self'
    },
    
    tabs: [
      {
        id: 'basic',
        label: 'Informações Básicas',
        icon: 'Image',
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
            help: 'Tamanho recomendado: 1920x600px'
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
    ],
    
    showHistory: true,
    showDuplicate: true,
    showPreview: true,
    previewUrl: (id: string) => `/preview/banner/${id}`
  },

  // ============ VENDEDORES ============
  vendedores: {
    entityName: 'vendedor',
    title: 'Vendedor',
    subtitle: 'Gerencie informações dos vendedores parceiros',
    
    // 🤖 HABILITAR IA PARA VENDEDORES
    aiEnabled: true,
    
    listRoute: '/vendedores',
    createEndpoint: '/sellers',
    updateEndpoint: (id: string) => `/sellers/${id}`,
    loadEndpoint: (id: string) => `/sellers/${id}`,
    
    defaultTab: 'basic',
    requiredFields: ['company_name', 'email'],
    
    defaultFormData: {
      company_name: '',
      trading_name: '',
      cnpj: '',
      email: '',
      phone: '',
      description: '',
      category: '',
      website: '',
      social_media: {
        instagram: '',
        facebook: '',
        whatsapp: ''
      },
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: ''
      },
      bank_info: {
        bank: '',
        agency: '',
        account: '',
        account_type: ''
      },
      documents: {
        rg: '',
        cpf_responsible: '',
        birth_date: ''
      },
      is_active: true
    },
    
    tabs: [
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
              pattern: '\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}',
              custom: (value: string) => {
                // Aqui poderia chamar validationService.validateCNPJ(value)
                return null;
              }
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
            type: 'rich-text',
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
    ],
    
    showHistory: true,
    showDuplicate: false
  }
};

/**
 * Função helper para buscar configuração de formulário
 */
export function getFormConfig(formName: string): FormConfig | undefined {
  return FormConfigs[formName];
} 