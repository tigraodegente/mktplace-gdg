import { json } from '@sveltejs/kit';
import { withDatabase, getCacheStats } from '$lib/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  const startTime = Date.now();
  
  try {
    // Teste 1: Query simples sem cache
    const directStart = Date.now();
    const directResult = await withDatabase(platform, async (db) => {
      return await db.query`SELECT COUNT(*) as total FROM products WHERE status = 'active'`;
    });
    const directTime = Date.now() - directStart;
    
    // Teste 2: Mesma query com cache
    const cachedStart = Date.now();
    const cachedResult = await withDatabase(platform, async (db) => {
      return await db.query`SELECT COUNT(*) as total FROM products WHERE status = 'active'`;
    }, 'products-count', 60);
    const cachedTime = Date.now() - cachedStart;
    
    // Teste 3: Query complexa com cache
    const complexStart = Date.now();
    const complexResult = await withDatabase(platform, async (db) => {
      return await db.query`
        SELECT 
          c.name as category_name,
          COUNT(p.id) as product_count,
          AVG(p.price) as avg_price
        FROM categories c 
        LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
        GROUP BY c.id, c.name 
        ORDER BY product_count DESC 
        LIMIT 5
      `;
    }, 'categories-stats', 300); // Cache por 5 minutos
    const complexTime = Date.now() - complexStart;
    
    const totalTime = Date.now() - startTime;
    const cacheStats = getCacheStats();
    
    return json({
      success: true,
      timestamp: new Date().toISOString(),
      performance: {
        total_time_ms: totalTime,
        direct_query_ms: directTime,
        cached_query_ms: cachedTime,
        complex_query_ms: complexTime,
        cache_benefit: directTime > 0 ? `${Math.round((1 - cachedTime/directTime) * 100)}%` : 'N/A'
      },
      cache_stats: cacheStats,
      database_info: {
        provider: 'neon',
        region: 'sa-east-1 (São Paulo)',
        connection_type: 'TCP Direct',
        pool_size: 5,
        ssl: true
      },
      results: {
        products_count: directResult[0]?.total || 0,
        categories_with_products: complexResult.length
      },
      hyperdrive_status: {
        enabled: false,
        reason: 'Timeout issues with external PostgreSQL',
        alternative: 'In-memory cache + TCP connection pooling'
      }
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      performance: {
        total_time_ms: Date.now() - startTime,
        status: 'failed'
      }
    }, { status: 500 });
  }
}; 