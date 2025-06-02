import { withDatabase } from '$lib/db';

// Cache em memória para queries frequentes
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const MAX_MEMORY_CACHE_SIZE = 100;

// Limpar cache antigo
function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > MEMORY_CACHE_TTL) {
      memoryCache.delete(key);
    }
  }
  
  // Limitar tamanho
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, entries.length - MAX_MEMORY_CACHE_SIZE).forEach(([key]) => {
      memoryCache.delete(key);
    });
  }
}

export async function getOptimizedProductCounts(platform?: App.Platform) {
  const cacheKey = 'product-counts';
  
  // Verificar cache em memória
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
    return cached.data;
  }
  
  const counts = await withDatabase(platform, async (db) => {
    const result = await db.query('SELECT * FROM product_counts LIMIT 1');
    return result[0] || null;
  });
  
  // Armazenar no cache
  memoryCache.set(cacheKey, { data: counts, timestamp: Date.now() });
  cleanMemoryCache();
  
  return counts;
}

export async function getOptimizedCategoryFacets(
  filters: Record<string, any>,
  platform?: App.Platform
) {
  const cacheKey = `category-facets:${JSON.stringify(filters)}`;
  
  // Verificar cache em memória
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
    return cached.data;
  }
  
  const facets = await withDatabase(platform, async (db) => {
    // Primeiro tentar buscar do cache de facetas
    const cachedResult = await db.query(
      `SELECT facet_data FROM facet_cache 
       WHERE cache_key = $1 AND expires_at > NOW()`,
      cacheKey
    );
    
    if (cachedResult.length > 0) {
      // Incrementar hit count
      await db.query(
        'UPDATE facet_cache SET hit_count = hit_count + 1 WHERE cache_key = $1',
        cacheKey
      );
      return cachedResult[0].facet_data;
    }
    
    // Se não tem cache, usar a view materializada
    const categories = await db.query(`
      SELECT 
        c.*,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sub.category_id,
                'name', sub.category_name,
                'slug', sub.category_slug,
                'count', sub.product_count
              ) ORDER BY sub.product_count DESC
            )
            FROM category_product_counts sub
            WHERE sub.parent_id = c.category_id
          ),
          '[]'::json
        ) as subcategories
      FROM category_product_counts c
      WHERE c.parent_id IS NULL
      ORDER BY c.product_count DESC
    `);
    
    // Salvar no cache
    await db.query(
      `INSERT INTO facet_cache (cache_key, facet_type, facet_data, query_params)
       VALUES ($1, 'category', $2, $3)
       ON CONFLICT (cache_key) 
       DO UPDATE SET 
         facet_data = EXCLUDED.facet_data,
         hit_count = facet_cache.hit_count + 1,
         created_at = NOW(),
         expires_at = NOW() + INTERVAL '1 hour'`,
      cacheKey,
      JSON.stringify(categories),
      JSON.stringify(filters)
    );
    
    return categories;
  });
  
  // Armazenar no cache em memória
  memoryCache.set(cacheKey, { data: facets, timestamp: Date.now() });
  cleanMemoryCache();
  
  return facets;
}

export async function searchProductsOptimized(
  query: string,
  filters: Record<string, any>,
  page: number = 1,
  limit: number = 20,
  platform?: App.Platform
) {
  const offset = (page - 1) * limit;
  
  return await withDatabase(platform, async (db) => {
    // Usar a tabela search_index para busca otimizada
    let conditions = ['si.product_id IS NOT NULL'];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (query) {
      conditions.push(`(
        si.search_vector @@ plainto_tsquery('portuguese', $${paramIndex})
        OR si.name_metaphone ILIKE $${paramIndex + 1}
        OR $${paramIndex + 2} = ANY(si.tags_array)
      )`);
      params.push(query, `%${query}%`, query);
      paramIndex += 3;
    }
    
    // Adicionar outros filtros
    if (filters.priceRange) {
      conditions.push(`si.price_range = $${paramIndex}`);
      params.push(filters.priceRange);
      paramIndex++;
    }
    
    if (filters.categories?.length > 0) {
      conditions.push(`si.category_path && $${paramIndex}`);
      params.push(filters.categories);
      paramIndex++;
    }
    
    if (filters.brands?.length > 0) {
      conditions.push(`si.brand_name = ANY($${paramIndex})`);
      params.push(filters.brands);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Query otimizada usando search_index + rankings
    const productsQuery = `
      WITH ranked_products AS (
        SELECT 
          p.*,
          pr.overall_score,
          pr.popularity_score,
          pr.trending_score,
          ARRAY_AGG(pi.url ORDER BY pi.position) as images
        FROM search_index si
        JOIN products p ON p.id = si.product_id
        LEFT JOIN product_rankings pr ON pr.product_id = p.id
        LEFT JOIN product_images pi ON pi.product_id = p.id
        WHERE ${whereClause}
        GROUP BY p.id, pr.overall_score, pr.popularity_score, pr.trending_score
        ORDER BY 
          ${query ? 'ts_rank(si.search_vector, plainto_tsquery(\'portuguese\', $1)) DESC,' : ''}
          COALESCE(pr.overall_score, 0) DESC,
          p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT * FROM ranked_products
    `;
    
    params.push(limit, offset);
    
    // Usar contagem aproximada para queries grandes
    const countQuery = filters.categories?.length || filters.brands?.length || query
      ? `SELECT COUNT(*) as total FROM search_index si WHERE ${whereClause}`
      : `SELECT total_active as total FROM product_counts LIMIT 1`;
    
    const [products, countResult] = await Promise.all([
      db.query(productsQuery, ...params),
      query || filters.categories?.length || filters.brands?.length
        ? db.query(countQuery, ...params.slice(0, -2))
        : db.query(countQuery)
    ]);
    
    return {
      products: products.map((p: any) => ({
        ...p,
        images: p.images || [],
        image: p.images?.[0] || '/api/placeholder/800/800'
      })),
      totalCount: parseInt(countResult[0]?.total || '0'),
      page,
      limit
    };
  });
}

// Função para pré-aquecer o cache
export async function warmUpCache(platform?: App.Platform) {
  try {
    // Carregar contagens gerais
    await getOptimizedProductCounts(platform);
    
    // Carregar categorias principais
    await getOptimizedCategoryFacets({}, platform);
    
    // Atualizar rankings se necessário
    await withDatabase(platform, async (db) => {
      const lastUpdate = await db.query(`
        SELECT MAX(last_calculated) as last_update 
        FROM product_rankings
      `);
      
      const hoursSinceUpdate = lastUpdate[0]?.last_update 
        ? (Date.now() - new Date(lastUpdate[0].last_update).getTime()) / (1000 * 60 * 60)
        : 24;
      
      // Atualizar se faz mais de 6 horas
      if (hoursSinceUpdate > 6) {
        await db.query('SELECT calculate_product_rankings()');
      }
    });
    
    console.log('✅ Cache aquecido com sucesso');
  } catch (error) {
    console.error('❌ Erro ao aquecer cache:', error);
  }
}

// Função para busca com cursor (paginação eficiente)
export async function searchWithCursor(
  cursor: string | null,
  limit: number = 20,
  filters: Record<string, any>,
  platform?: App.Platform
) {
  return await withDatabase(platform, async (db) => {
    let conditions = ['p.is_active = true'];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Decodificar cursor se existir
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
        conditions.push(`(pr.overall_score, p.id) < ($${paramIndex}, $${paramIndex + 1})`);
        params.push(decoded.score, decoded.id);
        paramIndex += 2;
      } catch (e) {
        console.error('Invalid cursor:', e);
      }
    }
    
    // Adicionar outros filtros...
    
    const whereClause = conditions.join(' AND ');
    
    const products = await db.query(`
      SELECT 
        p.*,
        pr.overall_score,
        ARRAY_AGG(pi.url ORDER BY pi.position) as images
      FROM products p
      LEFT JOIN product_rankings pr ON pr.product_id = p.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE ${whereClause}
      GROUP BY p.id, pr.overall_score
      ORDER BY COALESCE(pr.overall_score, 0) DESC, p.id DESC
      LIMIT $${paramIndex}
    `, ...params, limit + 1); // +1 para saber se tem próxima página
    
    const hasMore = products.length > limit;
    const items = products.slice(0, limit);
    
    // Criar cursor para próxima página
    const nextCursor = hasMore && items.length > 0
      ? Buffer.from(JSON.stringify({
          score: items[items.length - 1].overall_score || 0,
          id: items[items.length - 1].id
        })).toString('base64')
      : null;
    
    return {
      items,
      nextCursor,
      hasMore
    };
  });
} 