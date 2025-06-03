import type { EnrichmentProvider, EnrichmentContext, EnrichmentResult } from '../index.js';

export interface AIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIEnrichmentProvider implements EnrichmentProvider {
  name = 'AI Provider (OpenAI/Claude)';
  priority = 5; // Prioridade média, usado quando MongoDB não tem dados

  private config: AIConfig;

  constructor(config: AIConfig = {}) {
    this.config = {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 500,
      ...config
    };
  }

  canEnrich(field: string, entityType: string): boolean {
    // IA pode enriquecer a maioria dos campos de texto
    const enrichableFields = [
      'name', 'description', 'short_description',
      'technical_specifications', 'materials', 
      'care_instructions', 'warranty', 'age_group',
      'safety_certifications', 'seo_title', 
      'seo_description', 'seo_keywords'
    ];
    
    return entityType === 'product' && enrichableFields.includes(field);
  }

  async enrich(field: string, context: EnrichmentContext): Promise<EnrichmentResult> {
    try {
      if (!this.config.apiKey) {
        return {
          success: false,
          error: 'API Key da IA não configurada',
          source: this.name
        };
      }

      const prompt = this.buildPrompt(field, context);
      const aiResponse = await this.callAI(prompt);
      
      if (!aiResponse) {
        return {
          success: false,
          error: 'IA não retornou resposta válida',
          source: this.name
        };
      }

      const processedValue = this.processAIResponse(field, aiResponse);

      return {
        success: true,
        value: processedValue,
        confidence: 0.7, // Confiança média para conteúdo gerado por IA
        source: this.name,
        metadata: {
          model: this.config.model,
          prompt: prompt,
          rawResponse: aiResponse
        }
      };

    } catch (error) {
      console.error('Erro na IA:', error);
      return {
        success: false,
        error: `Erro IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        source: this.name
      };
    }
  }

  private buildPrompt(field: string, context: EnrichmentContext): string {
    const baseInfo = [
      context.name && `Nome: ${context.name}`,
      context.sku && `SKU: ${context.sku}`,
      context.category && `Categoria: ${context.category}`,
      context.description && `Descrição atual: ${context.description}`
    ].filter(Boolean).join('\n');

    const prompts: Record<string, string> = {
      'name': `
        Melhore este nome de produto para marketplace brasileiro de produtos infantis:
        ${baseInfo}
        
        Retorne apenas o nome melhorado, sem explicações.
      `,

      'description': `
        Crie uma descrição detalhada e atrativa para este produto infantil brasileiro:
        ${baseInfo}
        
        A descrição deve ter 150-300 palavras, ser persuasiva e incluir benefícios.
        Retorne apenas a descrição, sem título.
      `,

      'short_description': `
        Crie uma descrição curta (máximo 100 caracteres) para este produto:
        ${baseInfo}
        
        Seja conciso e atrativo. Retorne apenas a descrição curta.
      `,

      'technical_specifications': `
        Crie especificações técnicas realistas para este produto infantil:
        ${baseInfo}
        
        Retorne um JSON com campos como: material, dimensões, peso, cor, etc.
        Exemplo: {"material": "100% Algodão", "dimensões": "40x30cm", "peso": "200g"}
      `,

      'materials': `
        Liste os materiais mais prováveis para este produto infantil:
        ${baseInfo}
        
        Retorne uma lista separada por vírgulas. Ex: Algodão, Poliéster, Fibra sintética
      `,

      'care_instructions': `
        Crie instruções de cuidado apropriadas para este produto infantil:
        ${baseInfo}
        
        Inclua lavagem, secagem, armazenamento. Seja prático e claro.
      `,

      'warranty': `
        Sugira uma garantia apropriada para este produto infantil:
        ${baseInfo}
        
        Retorne apenas o período e tipo. Ex: "6 meses contra defeitos de fabricação"
      `,

      'age_group': `
        Determine a faixa etária apropriada para este produto:
        ${baseInfo}
        
        Retorne apenas uma opção: "0-2 anos", "3-5 anos", "6-8 anos", "9-12 anos", ou "13+ anos"
      `,

      'safety_certifications': `
        Liste certificações de segurança apropriadas para este produto infantil brasileiro:
        ${baseInfo}
        
        Retorne lista separada por vírgulas. Ex: INMETRO, CE, OEKO-TEX
      `,

      'seo_title': `
        Crie um título SEO otimizado (máximo 60 caracteres) para este produto:
        ${baseInfo}
        
        Inclua palavras-chave relevantes. Retorne apenas o título.
      `,

      'seo_description': `
        Crie uma meta descrição SEO (máximo 160 caracteres) para este produto:
        ${baseInfo}
        
        Seja persuasivo e inclua call-to-action. Retorne apenas a descrição.
      `,

      'seo_keywords': `
        Liste palavras-chave SEO relevantes para este produto:
        ${baseInfo}
        
        Retorne 5-10 palavras separadas por vírgulas. Foque em termos de busca brasileiros.
      `
    };

    return prompts[field] || `Enriqueça o campo "${field}" para este produto: ${baseInfo}`;
  }

  private async callAI(prompt: string): Promise<string> {
    // Por enquanto, usar mock responses para desenvolvimento
    // Depois implementar chamada real para OpenAI/Claude
    return this.getMockAIResponse(prompt);
  }

  private processAIResponse(field: string, response: string): any {
    const cleanResponse = response.trim();

    switch (field) {
      case 'technical_specifications':
        try {
          return JSON.parse(cleanResponse);
        } catch {
          return { description: cleanResponse };
        }

      case 'materials':
      case 'safety_certifications':
        return cleanResponse.split(',').map(s => s.trim()).filter(Boolean);

      case 'seo_keywords':
        return cleanResponse.split(',').map(s => s.trim()).filter(Boolean).join(', ');

      default:
        return cleanResponse;
    }
  }

  // Mock responses para desenvolvimento
  private getMockAIResponse(prompt: string): string {
    if (prompt.includes('technical_specifications')) {
      return '{"material": "100% Algodão", "dimensões": "40x30cm", "peso": "300g", "cor": "Multicolorido"}';
    }
    
    if (prompt.includes('materials')) {
      return 'Algodão, Poliéster, Fibra antialérgica';
    }
    
    if (prompt.includes('care_instructions')) {
      return 'Lavar à máquina em água fria (máximo 30°C). Não usar alvejante. Secar à sombra. Passar em temperatura baixa se necessário.';
    }
    
    if (prompt.includes('warranty')) {
      return '6 meses contra defeitos de fabricação';
    }
    
    if (prompt.includes('age_group')) {
      return '3-5 anos';
    }
    
    if (prompt.includes('safety_certifications')) {
      return 'INMETRO, OEKO-TEX';
    }
    
    if (prompt.includes('seo_title')) {
      return 'Produto Infantil Premium - Qualidade Garantida';
    }
    
    if (prompt.includes('seo_description')) {
      return 'Produto infantil de alta qualidade com materiais seguros. Perfeito para crianças. Compre agora com frete grátis!';
    }
    
    if (prompt.includes('seo_keywords')) {
      return 'produto infantil, criança, seguro, qualidade, brasil';
    }
    
    if (prompt.includes('short_description')) {
      return 'Produto infantil de qualidade premium com materiais seguros e design atrativo.';
    }
    
    if (prompt.includes('description')) {
      return 'Este produto infantil foi desenvolvido especialmente para proporcionar segurança, conforto e diversão para as crianças. Confeccionado com materiais de alta qualidade e seguindo rigorosos padrões de segurança, é a escolha perfeita para pais que buscam o melhor para seus filhos. O design atrativo e funcional garante durabilidade e satisfação.';
    }
    
    return 'Conteúdo gerado por IA para o campo solicitado.';
  }
} 