import type { FormConfig, FormField, FormTab } from './formConfigs';

export interface BaseFormOptions {
  entityName: string;
  title: string;
  subtitle?: string;
  fields?: FormField[];
  customTabs?: FormTab[];
  aiEnabled?: boolean;
  showPreview?: boolean;
  previewUrl?: (id: string) => string;
  requiredFields?: string[];
  defaultFormData?: any;
  specificCallbacks?: {
    onBeforeSave?: (data: any) => any;
    onAfterSave?: (data: any, result: any) => void;
    onBeforeLoad?: (id: string) => void;
    onAfterLoad?: (data: any) => any;
  };
}

export function createFormConfig(options: BaseFormOptions): FormConfig {
  const entityPlural = options.entityName.endsWith('s') ? options.entityName : `${options.entityName}s`;
  
  return {
    // ⭐ CONFIGURAÇÕES AUTOMÁTICAS
    title: options.title,
    subtitle: options.subtitle,
    entityName: options.entityName,
    
    // ⭐ ENDPOINTS AUTOMÁTICOS - CORRIGIDO: sem /api (ApiService adiciona automaticamente)
    listRoute: `/${entityPlural}`,
    createEndpoint: `/${entityPlural}`,
    updateEndpoint: (id: string) => `/${entityPlural}/${id}`,
    loadEndpoint: (id: string) => `/${entityPlural}/${id}`,
    
    // ⭐ CONFIGURAÇÕES PADRÃO
    defaultTab: 'basic',
    showHistory: true,
    showDuplicate: true,
    showPreview: options.showPreview || false,
    previewUrl: options.previewUrl,
    
    // ⭐ IA CONFIGURÁVEL
    aiEnabled: options.aiEnabled || false,
    aiEndpoint: options.aiEnabled ? '/ai/enrich' : undefined,
    
    // ⭐ VALIDAÇÃO
    requiredFields: options.requiredFields || [],
    
    // ⭐ ABAS DINÂMICAS
    tabs: options.customTabs || [
      {
        id: 'basic',
        label: 'Básico',
        icon: 'Settings',
        fields: options.fields || []
      }
    ],
    
    // ⭐ DADOS PADRÃO
    defaultFormData: options.defaultFormData || generateDefaultData(options.fields || []),
    
    // ⭐ CALLBACKS DINÂMICOS
    onBeforeSave: options.specificCallbacks?.onBeforeSave || defaultOnBeforeSave,
    onAfterSave: options.specificCallbacks?.onAfterSave,
    onBeforeLoad: options.specificCallbacks?.onBeforeLoad,
    onAfterLoad: options.specificCallbacks?.onAfterLoad || defaultOnAfterLoad,
    
    // ⭐ BREADCRUMBS AUTOMÁTICO
    breadcrumbs: [
      { label: options.title + 's', href: `/${entityPlural}` },
      { label: 'Editar' }
    ]
  };
}

/**
 * Gera dados padrão baseado nos campos definidos
 */
function generateDefaultData(fields: FormField[]): any {
  const defaultData: any = {};
  
  fields.forEach(field => {
    switch (field.type) {
      case 'boolean':
        defaultData[field.name] = false;
        break;
      case 'number':
        defaultData[field.name] = 0;
        break;
      case 'multiselect':
        defaultData[field.name] = [];
        break;
      case 'select':
        defaultData[field.name] = field.options?.[0]?.value || '';
        break;
      case 'json':
        defaultData[field.name] = {};
        break;
      default:
        defaultData[field.name] = '';
    }
  });
  
  return defaultData;
}

/**
 * Callback padrão para antes de salvar
 */
function defaultOnBeforeSave(data: any): any {
  // Lógica comum de limpeza
  const cleanData = { ...data };
  
  Object.keys(cleanData).forEach(key => {
    // Converter strings vazias para null
    if (cleanData[key] === '') {
      cleanData[key] = null;
    }
    
    // Limpar campos temporários que começam com underscore
    if (key.startsWith('_')) {
      delete cleanData[key];
    }
  });
  
  return cleanData;
}

/**
 * Callback padrão para depois de carregar
 */
function defaultOnAfterLoad(data: any): any {
  // Lógica comum de preparação
  const preparedData = { ...data };
  
  Object.keys(preparedData).forEach(key => {
    // Converter null para string vazia para inputs
    if (preparedData[key] === null) {
      preparedData[key] = '';
    }
  });
  
  return preparedData;
}

/**
 * Helper para criar configurações específicas de produto
 */
export function createProductFormConfig(options: Omit<BaseFormOptions, 'customTabs'> & {
  customTabs?: FormTab[];
}): FormConfig {
  return createFormConfig({
    ...options,
    aiEnabled: true, // Produtos sempre têm IA
    showPreview: false,
    customTabs: options.customTabs || [
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
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'BarChart3',
        component: 'AnalyticsTab',
        description: 'Métricas e performance'
      }
    ]
  });
} 