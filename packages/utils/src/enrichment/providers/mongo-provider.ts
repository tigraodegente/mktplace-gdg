import type { EnrichmentProvider, EnrichmentContext, EnrichmentResult } from '../index.js';

export interface MongoConfig {
  connectionString: string;
  databaseName: string;
  collectionName: string;
}

export class MongoEnrichmentProvider implements EnrichmentProvider {
  name = 'MongoDB Provider (Temporário)';
  priority = 10; // Alta prioridade para dados já existentes

  private config: MongoConfig;
  private mongoClient: any = null;

  constructor(config: MongoConfig) {
    this.config = config;
  }

  canEnrich(field: string, entityType: string): boolean {
    // MongoDB pode enriquecer qualquer campo se estiver habilitado
    return entityType === 'product' && this.isAvailable();
  }

  private isAvailable(): boolean {
    return !!this.config.connectionString;
  }

  async enrich(field: string, context: EnrichmentContext): Promise<EnrichmentResult> {
    try {
      if (!context.sku) {
        return {
          success: false,
          error: 'SKU necessário para buscar no MongoDB',
          source: this.name
        };
      }

      const mongoData = await this.findProductBySku(context.sku);
      
      if (!mongoData) {
        return {
          success: false,
          error: 'Produto não encontrado no MongoDB',
          source: this.name
        };
      }

      const value = this.extractFieldValue(field, mongoData);
      
      if (value === null || value === undefined || value === '') {
        return {
          success: false,
          error: 'Campo vazio no MongoDB',
          source: this.name
        };
      }

      return {
        success: true,
        value,
        confidence: 0.9, // Alta confiança para dados já existentes
        source: this.name,
        metadata: {
          mongoId: mongoData._id,
          lastUpdated: mongoData.updated_at || mongoData.updatedAt
        }
      };

    } catch (error) {
      console.error('Erro ao buscar no MongoDB:', error);
      return {
        success: false,
        error: `Erro MongoDB: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        source: this.name
      };
    }
  }

  private async findProductBySku(sku: string): Promise<any> {
    // Implementação seria feita aqui
    // Por enquanto, simular busca
    const mockData = await this.getMockMongoData(sku);
    return mockData;
  }

  private extractFieldValue(field: string, mongoData: any): any {
    const fieldMappings: Record<string, string | string[]> = {
      'name': ['name', 'titulo', 'produto'],
      'description': ['description', 'descricao', 'desc'],
      'short_description': ['short_description', 'resumo'],
      'technical_specifications': ['specs', 'specifications', 'especificacoes'],
      'materials': ['materials', 'materiais', 'material'],
      'care_instructions': ['care', 'cuidados', 'instrucoes'],
      'warranty': ['warranty', 'garantia'],
      'age_group': ['age', 'idade', 'faixa_etaria'],
      'safety_certifications': ['certifications', 'certificacoes'],
      'seo_title': ['seo_title', 'meta_title'],
      'seo_description': ['seo_description', 'meta_description'],
      'seo_keywords': ['seo_keywords', 'keywords', 'palavras_chave']
    };

    const possibleFields = fieldMappings[field] || [field];
    
    for (const mongoField of possibleFields) {
      if (mongoData[mongoField] !== undefined && mongoData[mongoField] !== null) {
        return this.processFieldValue(field, mongoData[mongoField]);
      }
    }

    return null;
  }

  private processFieldValue(field: string, value: any): any {
    // Processar valores específicos por tipo de campo
    switch (field) {
      case 'technical_specifications':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return { description: value };
          }
        }
        return value;

      case 'materials':
      case 'safety_certifications':
        if (typeof value === 'string') {
          return value.split(',').map(s => s.trim()).filter(Boolean);
        }
        return Array.isArray(value) ? value : [value];

      case 'seo_title':
        return typeof value === 'string' ? value.substring(0, 60) : value;

      case 'seo_description':
        return typeof value === 'string' ? value.substring(0, 160) : value;

      default:
        return value;
    }
  }

  // Mock para testes (remover quando integrar MongoDB real)
  private async getMockMongoData(sku: string): Promise<any> {
    // Simular dados do MongoDB baseados no SKU
    const mockDatabase: Record<string, any> = {
      '176223': {
        _id: '507f1f77bcf86cd799439011',
        sku: '176223',
        name: 'Kit Berço Amiguinhos Harry Potter',
        description: 'Kit de berço completo com tema Harry Potter, incluindo lençol, fronha e protetor. Confeccionado em 100% algodão com estampas encantadoras dos personagens.',
        short_description: 'Kit berço Harry Potter 100% algodão',
        specs: {
          material: '100% Algodão',
          dimensoes: '130x70cm',
          peso: '800g',
          cor: 'Azul/Branco',
          estilo: 'Temático'
        },
        materials: ['Algodão'],
        care: 'Lavar à máquina em água fria. Não usar alvejante.',
        warranty: '3 meses contra defeitos de fabricação',
        age: '0-3 anos',
        certifications: ['INMETRO', 'OEKO-TEX'],
        seo_title: 'Kit Berço Harry Potter - Algodão Premium',
        seo_description: 'Kit berço temático Harry Potter 100% algodão. Lençol, fronha e protetor. Qualidade premium para o quarto do bebê.',
        keywords: 'kit berço, harry potter, algodão, bebê, enxoval'
      },
      '194747': {
        _id: '507f1f77bcf86cd799439012',
        sku: '194747',
        name: 'Almofada Decorativa Unicórnio',
        description: 'Almofada decorativa com estampa de unicórnio em tecido macio e enchimento antialérgico. Perfeita para quartos infantis.',
        short_description: 'Almofada unicórnio antialérgica',
        specs: {
          material: 'Poliéster',
          dimensoes: '40x40cm',
          peso: '300g',
          cor: 'Rosa/Branco',
          enchimento: 'Fibra siliconizada'
        },
        materials: ['Poliéster', 'Fibra siliconizada'],
        care: 'Lavar à mão ou máquina ciclo delicado',
        warranty: '6 meses',
        age: '3+ anos',
        certifications: ['INMETRO'],
        seo_title: 'Almofada Unicórnio Decorativa Infantil',
        seo_description: 'Almofada decorativa unicórnio com enchimento antialérgico. Ideal para decoração de quartos infantis.',
        keywords: 'almofada, unicórnio, decorativa, infantil, antialérgico'
      }
    };

    return mockDatabase[sku] || null;
  }

  // Método para desconectar do MongoDB
  async disconnect(): Promise<void> {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
    }
  }
} 