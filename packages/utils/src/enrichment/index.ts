// Tipos base para enriquecimento
export interface EnrichmentField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'json';
  required?: boolean;
  maxLength?: number;
  options?: string[];
}

export interface EnrichmentProvider {
  name: string;
  priority: number;
  canEnrich(field: string, entityType: string): boolean;
  enrich(field: string, context: EnrichmentContext): Promise<EnrichmentResult>;
}

export interface EnrichmentContext {
  entityType: 'product' | 'category' | 'brand' | 'seller';
  entityId: string;
  field: string;
  currentValue?: any;
  relatedData?: Record<string, any>;
  sku?: string;
  name?: string;
  category?: string;
  description?: string;
}

export interface EnrichmentResult {
  success: boolean;
  value?: any;
  confidence?: number;
  source: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface EnrichmentConfig {
  providers: EnrichmentProvider[];
  fieldMappings: Record<string, EnrichmentField[]>;
  aiApiKey?: string;
  mongoConnectionString?: string;
  enableMongo?: boolean;
}

// Serviço principal de enriquecimento
export class EnrichmentService {
  private providers: EnrichmentProvider[] = [];
  private config: EnrichmentConfig;

  constructor(config: EnrichmentConfig) {
    this.config = config;
    this.providers = config.providers.sort((a, b) => b.priority - a.priority);
  }

  // Enriquecer um campo específico
  async enrichField(context: EnrichmentContext): Promise<EnrichmentResult> {
    for (const provider of this.providers) {
      if (provider.canEnrich(context.field, context.entityType)) {
        try {
          const result = await provider.enrich(context.field, context);
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.error(`Erro no provider ${provider.name}:`, error);
          continue;
        }
      }
    }

    return {
      success: false,
      error: 'Nenhum provider disponível para este campo',
      source: 'none'
    };
  }

  // Enriquecer entidade completa
  async enrichEntity(context: Omit<EnrichmentContext, 'field'>): Promise<Record<string, EnrichmentResult>> {
    const entityFields = this.config.fieldMappings[context.entityType] || [];
    const results: Record<string, EnrichmentResult> = {};

    const promises = entityFields.map(async (field) => {
      const fieldContext: EnrichmentContext = {
        ...context,
        field: field.name,
        currentValue: context.relatedData?.[field.name]
      };

      const result = await this.enrichField(fieldContext);
      results[field.name] = result;
    });

    await Promise.all(promises);
    return results;
  }

  // Obter campos disponíveis para enriquecimento
  getEnrichableFields(entityType: string): EnrichmentField[] {
    return this.config.fieldMappings[entityType] || [];
  }

  // Verificar se um campo pode ser enriquecido
  canEnrichField(field: string, entityType: string): boolean {
    return this.providers.some(provider => 
      provider.canEnrich(field, entityType)
    );
  }
}

// Factory para criar o serviço
export function createEnrichmentService(config: Partial<EnrichmentConfig>): EnrichmentService {
  const fullConfig: EnrichmentConfig = {
    providers: [],
    fieldMappings: getDefaultFieldMappings(),
    ...config
  };

  return new EnrichmentService(fullConfig);
}

// Mapeamentos padrão de campos por entidade
function getDefaultFieldMappings(): Record<string, EnrichmentField[]> {
  return {
    product: [
      { name: 'name', label: 'Nome do Produto', type: 'text', required: true, maxLength: 255 },
      { name: 'description', label: 'Descrição', type: 'textarea', maxLength: 2000 },
      { name: 'short_description', label: 'Descrição Curta', type: 'textarea', maxLength: 500 },
      { name: 'technical_specifications', label: 'Especificações Técnicas', type: 'json' },
      { name: 'materials', label: 'Materiais', type: 'multiselect' },
      { name: 'care_instructions', label: 'Instruções de Cuidado', type: 'textarea' },
      { name: 'warranty', label: 'Garantia', type: 'text' },
      { name: 'age_group', label: 'Faixa Etária', type: 'select', options: ['0-2 anos', '3-5 anos', '6-8 anos', '9-12 anos', '13+ anos'] },
      { name: 'safety_certifications', label: 'Certificações de Segurança', type: 'multiselect' },
      { name: 'seo_title', label: 'Título SEO', type: 'text', maxLength: 60 },
      { name: 'seo_description', label: 'Descrição SEO', type: 'textarea', maxLength: 160 },
      { name: 'seo_keywords', label: 'Palavras-chave SEO', type: 'text' }
    ],
    category: [
      { name: 'name', label: 'Nome da Categoria', type: 'text', required: true },
      { name: 'description', label: 'Descrição', type: 'textarea' },
      { name: 'seo_title', label: 'Título SEO', type: 'text' },
      { name: 'seo_description', label: 'Descrição SEO', type: 'textarea' },
      { name: 'seo_keywords', label: 'Palavras-chave SEO', type: 'text' }
    ]
  };
} 