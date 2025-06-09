import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

interface SearchAnalyticsEntry {
  query: string;
  results_count: number;
  filters_used: string[];
  user_agent?: string;
  timestamp: Date;
  session_id?: string;
  clicked_product_id?: string;
  click_position?: number;
}

/**
 * Analytics API para tracking de buscas
 * POST: Registrar evento de busca
 * GET: Obter estatísticas de busca
 */

export const POST: RequestHandler = async ({ request, platform, getClientAddress }) => {
  try {
    const data = await request.json();
    const {
      query,
      results_count,
      filters_used = [],
      clicked_product_id,
      click_position,
      session_id
    } = data;

    // Validações básicas
    if (!query || typeof query !== 'string') {
      return json({
        success: false,
        error: { message: 'Query é obrigatória' }
      }, { status: 400 });
    }

    const db = getDatabase(platform);
    const clientIP = getClientAddress();
    const userAgent = request.headers.get('user-agent') || '';

    // Tentar criar tabela se não existir (fallback)
    try {
      await db.query`
        CREATE TABLE IF NOT EXISTS search_analytics (
          id SERIAL PRIMARY KEY,
          query VARCHAR(500) NOT NULL,
          query_normalized VARCHAR(500),
          results_count INTEGER DEFAULT 0,
          filters_used JSONB DEFAULT '[]'::jsonb,
          user_agent TEXT,
          client_ip INET,
          session_id VARCHAR(100),
          clicked_product_id UUID,
          click_position INTEGER,
          timestamp TIMESTAMP DEFAULT NOW(),
          date_only DATE DEFAULT CURRENT_DATE,
          hour_only INTEGER DEFAULT EXTRACT(HOUR FROM NOW())
        );
        
        CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
        CREATE INDEX IF NOT EXISTS idx_search_analytics_date ON search_analytics(date_only);
        CREATE INDEX IF NOT EXISTS idx_search_analytics_normalized ON search_analytics(query_normalized);
      `;
    } catch (e) {
      console.warn('Tabela search_analytics já existe ou erro na criação');
    }

    // Normalizar query para analytics
    const queryNormalized = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Inserir registro de analytics
    await db.query`
      INSERT INTO search_analytics (
        query, query_normalized, results_count, filters_used,
        user_agent, client_ip, session_id, clicked_product_id, click_position
      ) VALUES (
        ${query}, ${queryNormalized}, ${results_count}, ${JSON.stringify(filters_used)},
        ${userAgent}, ${clientIP}, ${session_id}, ${clicked_product_id}, ${click_position}
      )
    `;

    console.log(`📊 Analytics: Query "${query}" registrada com ${results_count} resultados`);

    return json({
      success: true,
      data: { message: 'Analytics registrado com sucesso' }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar search analytics:', error);
    
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const period = url.searchParams.get('period') || '7d'; // 1d, 7d, 30d
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
    const type = url.searchParams.get('type') || 'top_searches'; // top_searches, trending, failed

    const db = getDatabase(platform);

    let whereClause = '';
    switch (period) {
      case '1d':
        whereClause = "WHERE timestamp >= NOW() - INTERVAL '1 day'";
        break;
      case '7d':
        whereClause = "WHERE timestamp >= NOW() - INTERVAL '7 days'";
        break;
      case '30d':
        whereClause = "WHERE timestamp >= NOW() - INTERVAL '30 days'";
        break;
      default:
        whereClause = "WHERE timestamp >= NOW() - INTERVAL '7 days'";
    }

    let analytics = {};

    if (type === 'top_searches') {
      // Top buscas por volume
      const topSearches = await db.query`
        SELECT 
          query_normalized as query,
          COUNT(*) as search_count,
          AVG(results_count)::INTEGER as avg_results,
          SUM(CASE WHEN clicked_product_id IS NOT NULL THEN 1 ELSE 0 END) as clicks,
          ROUND(
            (SUM(CASE WHEN clicked_product_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*))::numeric, 
            2
          ) as click_through_rate
        FROM search_analytics 
        ${whereClause}
        AND query_normalized != ''
        GROUP BY query_normalized
        ORDER BY search_count DESC
        LIMIT ${limit}
      `;

      analytics = { top_searches: topSearches };

    } else if (type === 'trending') {
      // Buscas em crescimento
      const trending = await db.query`
        WITH current_period AS (
          SELECT query_normalized, COUNT(*) as current_count
          FROM search_analytics 
          WHERE timestamp >= NOW() - INTERVAL '1 day'
          AND query_normalized != ''
          GROUP BY query_normalized
        ),
        previous_period AS (
          SELECT query_normalized, COUNT(*) as previous_count
          FROM search_analytics 
          WHERE timestamp >= NOW() - INTERVAL '2 days'
          AND timestamp < NOW() - INTERVAL '1 day'
          AND query_normalized != ''
          GROUP BY query_normalized
        )
        SELECT 
          c.query_normalized as query,
          c.current_count,
          COALESCE(p.previous_count, 0) as previous_count,
          CASE 
            WHEN COALESCE(p.previous_count, 0) = 0 THEN 999
            ELSE ROUND((c.current_count - COALESCE(p.previous_count, 0)) * 100.0 / p.previous_count, 2)
          END as growth_rate
        FROM current_period c
        LEFT JOIN previous_period p ON c.query_normalized = p.query_normalized
        WHERE c.current_count >= 2
        ORDER BY growth_rate DESC, c.current_count DESC
        LIMIT ${limit}
      `;

      analytics = { trending_searches: trending };

    } else if (type === 'failed') {
      // Buscas sem resultados
      const failedSearches = await db.query`
        SELECT 
          query_normalized as query,
          COUNT(*) as search_count,
          MAX(timestamp) as last_searched
        FROM search_analytics 
        ${whereClause}
        AND results_count = 0
        AND query_normalized != ''
        GROUP BY query_normalized
        ORDER BY search_count DESC, last_searched DESC
        LIMIT ${limit}
      `;

      analytics = { failed_searches: failedSearches };
    }

    // Estatísticas gerais
    const generalStats = await db.query`
      SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT query_normalized) as unique_queries,
        AVG(results_count)::INTEGER as avg_results_per_search,
        SUM(CASE WHEN clicked_product_id IS NOT NULL THEN 1 ELSE 0 END) as total_clicks,
        ROUND(
          (SUM(CASE WHEN clicked_product_id IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*))::numeric, 
          2
        ) as overall_click_through_rate,
        SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) as failed_searches
      FROM search_analytics 
      ${whereClause}
    `;

    return json({
      success: true,
      data: {
        period,
        stats: generalStats[0] || {},
        ...analytics
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar analytics:', error);
    
    return json({
      success: false,
      error: { message: 'Erro ao carregar analytics' }
    }, { status: 500 });
  }
}; 