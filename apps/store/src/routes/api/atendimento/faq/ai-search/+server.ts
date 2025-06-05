import { json, type RequestHandler } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';
import { FAQAIService } from '$lib/ai/faq-ai-service';
import { OPENAI_API_KEY } from '$env/static/private';

interface AISearchRequest {
  query: string;
  user_session?: string;
  max_results?: number;
}

interface AISearchResponse {
  success: boolean;
  data?: {
    results: Array<{
      id: string;
      question: string;
      answer: string;
      category_name: string;
      relevance_score: number;
      reasoning: string;
      matched_concepts: string[];
      intent_category: string;
      helpful_count: number;
      view_count: number;
    }>;
    query_analysis: {
      intent: string;
      confidence: number;
      suggested_keywords: string[];
    };
    search_metadata: {
      total_faqs_analyzed: number;
      processing_time_ms: number;
      ai_model_used: string;
      cache_hit: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

// Inicializar serviço de IA
let aiService: FAQAIService;
try {
  aiService = new FAQAIService(OPENAI_API_KEY);
} catch (error) {
  console.error('❌ Falha ao inicializar serviço de IA:', error);
}

export const POST: RequestHandler = async ({ request, platform }) => {
  const startTime = Date.now();
  
  try {
    // Validar entrada
    const body: AISearchRequest = await request.json();
    const { query, user_session, max_results = 5 } = body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Query deve ter pelo menos 2 caracteres'
        }
      }, { status: 400 });
    }

    if (!aiService) {
      return json({
        success: false,
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'Serviço de IA não disponível'
        }
      }, { status: 503 });
    }

    // Conectar ao banco
    const db = getDatabase(platform);

    // Buscar todas as FAQ disponíveis
    const faqsQuery = `
      SELECT 
        f.id,
        f.question,
        f.answer,
        c.name as category_name,
        COALESCE(f.helpful_count, 0) as helpful_count,
        COALESCE(f.view_count, 0) as view_count
      FROM faq_items f
      JOIN faq_categories c ON f.category_id = c.id
      WHERE f.is_active = true
      ORDER BY f.helpful_count DESC, f.view_count DESC
    `;

    const faqs = await db.query(faqsQuery);

    if (!faqs.length) {
      return json({
        success: false,
        error: {
          code: 'NO_FAQS_AVAILABLE',
          message: 'Nenhuma FAQ disponível para análise'
        }
      }, { status: 404 });
    }

    // Análise com IA
    const cacheKey = `${query.toLowerCase()}_${faqs.length}`;
    const cacheHit = aiService.getCacheStats().keys.includes(cacheKey);
    
    const aiAnalysis = await aiService.analyzeUserQuery(query, faqs);

    // Construir resultados com dados completos das FAQ
    const results = aiAnalysis.matches.map(match => {
      const faq = faqs.find((f: any) => f.id === match.faq_id);
      if (!faq) return null;

      return {
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category_name: faq.category_name,
        helpful_count: faq.helpful_count,
        view_count: faq.view_count,
        relevance_score: match.relevance_score,
        reasoning: match.reasoning,
        matched_concepts: match.matched_concepts,
        intent_category: match.intent_category
      };
    }).filter(Boolean).slice(0, max_results);

    // Registrar busca para analytics (opcional)
    if (user_session) {
      try {
        await db.query(`
          INSERT INTO faq_searches (session_id, query, results_count, ai_confidence, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, user_session, query, results.length, aiAnalysis.confidence_level);
      } catch (analyticsError) {
        console.warn('⚠️ Falha ao registrar analytics:', analyticsError);
      }
    }

    const processingTime = Date.now() - startTime;

    return json({
      success: true,
      data: {
        results,
        query_analysis: {
          intent: aiAnalysis.query_intent,
          confidence: aiAnalysis.confidence_level,
          suggested_keywords: aiAnalysis.suggested_keywords
        },
        search_metadata: {
          total_faqs_analyzed: faqs.length,
          processing_time_ms: processingTime,
          ai_model_used: 'gpt-4o-mini',
          cache_hit: cacheHit
        }
      }
    });

  } catch (error) {
    console.error('🤖 Erro na busca com IA:', error);
    
    return json({
      success: false,
      error: {
        code: 'AI_SEARCH_ERROR',
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
};

// Endpoint para limpar cache (admin)
export const DELETE: RequestHandler = async () => {
  try {
    if (aiService) {
      aiService.clearCache();
      return json({ success: true, message: 'Cache limpo com sucesso' });
    }
    
    return json({ 
      success: false, 
      error: 'Serviço de IA não disponível' 
    }, { status: 503 });
    
  } catch (error) {
    return json({ 
      success: false, 
      error: 'Erro ao limpar cache' 
    }, { status: 500 });
  }
};

// Stats do cache (admin)
export const GET: RequestHandler = async () => {
  try {
    if (aiService) {
      const stats = aiService.getCacheStats();
      return json({ 
        success: true, 
        data: stats 
      });
    }
    
    return json({ 
      success: false, 
      error: 'Serviço de IA não disponível' 
    }, { status: 503 });
    
  } catch (error) {
    return json({ 
      success: false, 
      error: 'Erro ao obter estatísticas' 
    }, { status: 500 });
  }
}; 