import OpenAI from 'openai';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category_name: string;
  helpful_count: number;
  view_count: number;
}

interface AIAnalysisResult {
  matches: Array<{
    faq_id: string;
    relevance_score: number;
    reasoning: string;
    matched_concepts: string[];
    intent_category: string;
  }>;
  query_intent: string;
  suggested_keywords: string[];
  confidence_level: number;
}

export class FAQAIService {
  private openai: OpenAI;
  private cache: Map<string, AIAnalysisResult> = new Map();

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Análise semântica completa da query do usuário
   */
  async analyzeUserQuery(query: string, faqs: FAQItem[]): Promise<AIAnalysisResult> {
    // Verificar cache primeiro
    const cacheKey = this.generateCacheKey(query, faqs.length);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const systemPrompt = `
Você é um assistente especializado em análise semântica para FAQ de um marketplace de produtos alimentícios chamado "Grão de Gente".

Sua tarefa é analisar perguntas dos usuários e encontrar as FAQ mais relevantes.

CONTEXTO DO NEGÓCIO:
- Marketplace de grãos, cereais, produtos orgânicos
- Vendas online com entrega
- Foco em qualidade e produtos frescos
- Sistema de pedidos, pagamentos, entregas

INSTRUÇÕES:
1. Analise a intenção por trás da pergunta do usuário
2. Identifique conceitos-chave e palavras relacionadas
3. Compare semanticamente com as FAQ disponíveis
4. Calcule relevância baseada em:
   - Similaridade semântica (40%)
   - Intenção do usuário (30%)
   - Contexto do negócio (20%)
   - Popularidade da FAQ (10%)

5. Retorne APENAS JSON válido no formato especificado
`;

    const userPrompt = `
PERGUNTA DO USUÁRIO: "${query}"

FAQ DISPONÍVEIS:
${faqs.map(faq => `
ID: ${faq.id}
Pergunta: ${faq.question}
Categoria: ${faq.category_name}
Popularidade: ${faq.view_count} visualizações, ${faq.helpful_count} votos úteis
---`).join('\n')}

Retorne um JSON com esta estrutura EXATA:
{
  "matches": [
    {
      "faq_id": "id_da_faq",
      "relevance_score": 0.95,
      "reasoning": "Explicação clara de por que esta FAQ é relevante",
      "matched_concepts": ["conceito1", "conceito2"],
      "intent_category": "categoria_da_intencao"
    }
  ],
  "query_intent": "intenção_principal_detectada",
  "suggested_keywords": ["palavra1", "palavra2"],
  "confidence_level": 0.87
}

IMPORTANTE:
- Ordene por relevance_score (maior primeiro)
- Inclua apenas FAQ com score >= 0.3
- Maximum 5 matches
- reasoning deve ser específico e útil
- intent_category: "informacao", "problema", "procedimento", "suporte"
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Mais barato e rápido
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1, // Mais determinístico
        max_tokens: 1500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validar e sanitizar resultado
      const validatedResult = this.validateAndSanitizeResult(result, faqs);
      
      // Cache do resultado
      this.cache.set(cacheKey, validatedResult);
      
      return validatedResult;

    } catch (error) {
      console.error('🤖 Erro na análise de IA:', error);
      throw new Error('Falha na análise semântica');
    }
  }

  /**
   * Gerar análise de intenção para melhorar futuras buscas
   */
  async generateQueryInsights(query: string, selectedFAQ?: string): Promise<{
    intent: string;
    complexity: number;
    suggestions: string[];
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `
Analise esta pergunta de FAQ: "${query}"
${selectedFAQ ? `\nUsuário selecionou FAQ: ${selectedFAQ}` : ''}

Retorne JSON:
{
  "intent": "intenção_principal",
  "complexity": 0.8,
  "suggestions": ["sugestão1", "sugestão2"]
}
`
        }],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 300
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('🔍 Erro na análise de insights:', error);
      return {
        intent: 'unknown',
        complexity: 0.5,
        suggestions: []
      };
    }
  }

  /**
   * Validar e sanitizar resultado da IA
   */
  private validateAndSanitizeResult(result: any, faqs: FAQItem[]): AIAnalysisResult {
    const faqIds = new Set(faqs.map(f => f.id));
    
    return {
      matches: (result.matches || [])
        .filter((match: any) => 
          match.faq_id && 
          faqIds.has(match.faq_id) && 
          typeof match.relevance_score === 'number' &&
          match.relevance_score >= 0.3
        )
        .slice(0, 5),
      query_intent: result.query_intent || 'unknown',
      suggested_keywords: Array.isArray(result.suggested_keywords) ? result.suggested_keywords : [],
      confidence_level: typeof result.confidence_level === 'number' ? result.confidence_level : 0.5
    };
  }

  /**
   * Gerar chave de cache baseada na query e contexto
   */
  private generateCacheKey(query: string, faqCount: number): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return `${normalized}_${faqCount}`;
  }

  /**
   * Limpar cache antigo (executar periodicamente)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Estatísticas do cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
} 