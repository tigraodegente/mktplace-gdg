export interface FormTab {
  id: string;
  label: string;
  icon: string;
  component: string;
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
    entityName: 'produto',
    
    // API endpoints
    createEndpoint: '/api/products',
    updateEndpoint: (id: string) => `/api/products/${id}`,
    loadEndpoint: (id: string) => `/api/products/${id}`,
    
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
    aiEndpoint: '/api/ai/enrich',
    
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

  // ============ VENDEDORES ============
  vendedores: {
    entityName: 'vendedor',
    title: 'Vendedor',
    subtitle: 'Gerencie informações dos vendedores parceiros',
    
    // 🤖 HABILITAR IA PARA VENDEDORES
    aiEnabled: true,
    
    listRoute: '/vendedores',
    createEndpoint: '/api/sellers',
    updateEndpoint: (id: string) => `/api/sellers/${id}`,
    loadEndpoint: (id: string) => `/api/sellers/${id}`,
    
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
        component: 'BasicTab'
      },
      {
        id: 'address',
        label: 'Endereço',
        icon: 'MapPin', 
        component: 'AddressTab'
      },
      {
        id: 'financial',
        label: 'Dados Financeiros',
        icon: 'CreditCard',
        component: 'FinancialTab'
      },
      {
        id: 'documents',
        label: 'Documentos',
        icon: 'FileText',
        component: 'DocumentsTab'
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