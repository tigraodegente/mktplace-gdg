import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { logger, logAPI, logOperation, logPerformance } from '$lib/utils/logger';

// Types
interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  position?: number | null;
  parent_id?: string | null;
  subcategories: CategoryData[];
  product_count: number;
}

export const GET: RequestHandler = async ({ url, setHeaders, platform }) => {
  const startTime = performance.now();
  
  try {
    const includeCount = url.searchParams.get('includeCount') === 'true';
    const parentOnly = url.searchParams.get('parentOnly') === 'true';
    
    // Configurar contexto do logger
    logger.setContext({ 
      operation: 'api_categories',
      metadata: { includeCount, parentOnly }
    });
    
    logger.info('Categories API - Estratégia híbrida iniciada');
    
    // Set cache headers
    setHeaders({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'Vary': 'Accept-Encoding'
    });
    
    // Tentar buscar dados reais do banco com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // Query com contagens reais de produtos - FILTRADA PARA INCLUIR APENAS CATEGORIAS COM PRODUTOS
        let categoriesQuery = `
          SELECT 
            c.id,
            c.name,
            c.slug,
            c.parent_id,
            c.description,
            c.position,
            COALESCE(
              (SELECT COUNT(DISTINCT pc.product_id) 
               FROM product_categories pc 
               INNER JOIN products p ON p.id = pc.product_id 
               INNER JOIN categories cat ON cat.id = pc.category_id
               WHERE (cat.id = c.id OR cat.parent_id = c.id) 
               AND p.is_active = true), 
              0
            ) as product_count
          FROM categories c
          WHERE c.is_active = true
        `;
        
        // Se includeCount=true, filtrar apenas categorias com produtos
        if (includeCount) {
          console.log('🎯 Filtrando apenas categorias com produtos para menu');
          categoriesQuery += `
            AND (
              EXISTS (
                SELECT 1 FROM product_categories pc
                INNER JOIN products p ON p.id = pc.product_id
                WHERE pc.category_id = c.id 
                AND p.is_active = true
              )
              OR EXISTS (
                SELECT 1 FROM categories sub
                WHERE sub.parent_id = c.id
                AND EXISTS (
                  SELECT 1 FROM product_categories pc
                  INNER JOIN products p ON p.id = pc.product_id
                  WHERE pc.category_id = sub.id 
                  AND p.is_active = true
                )
              )
            )
          `;
        }
        
        categoriesQuery += `
          ORDER BY c.position ASC NULLS LAST, c.name ASC
        `;
        
        logger.debug(includeCount ? 'Executando query de categorias com contagens reais (filtrada)' : 'Executando query de categorias com contagens reais');
        const categories = await db.query(categoriesQuery);
        logger.debug('Categorias carregadas com contagens reais', { 
          count: categories.length, 
          filtered: includeCount 
        });
        
        return categories;
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const categories = await Promise.race([queryPromise, timeoutPromise]) as any[];
      
      logOperation(true, 'Categories loaded from database', { count: categories.length });
      
      // Build hierarchy com contagens reais do banco
      const { categoryMap, rootCategories } = buildCategoryHierarchy(categories);
      
      sortSubcategories(rootCategories);
      
      const finalResult = parentOnly 
        ? rootCategories.map(({ subcategories, ...cat }) => cat)
        : rootCategories;
      
      logPerformance('categories_api', startTime, { 
        source: 'database', 
        count: finalResult.length 
      });
      
      logAPI('GET', '/api/categories', 200, performance.now() - startTime);
      
      return json({
        success: true,
        data: {
          categories: finalResult,
          total: rootCategories.length
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro ao buscar categorias: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar as categorias',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }
    
  } catch (error) {
    logger.error('Critical categories API error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    logAPI('GET', '/api/categories', 500, performance.now() - startTime);
    
    return json({
      success: false,
      error: {
        message: 'Erro ao buscar categorias',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  } finally {
    logger.clearContext();
  }
};

/**
 * Build category hierarchy from flat list
 */
function buildCategoryHierarchy(categories: any[]): {
  categoryMap: Map<string, CategoryData>;
  rootCategories: CategoryData[];
} {
  const categoryMap = new Map<string, CategoryData>();
  const rootCategories: CategoryData[] = [];
  
  // First pass: create all category objects
  for (const cat of categories) {
    const productCount = parseInt(cat.product_count) || 0; // Usar contagem real do banco
    
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      position: cat.position,
      parent_id: cat.parent_id,
      subcategories: [],
      product_count: productCount
    });
  }
  
  // Second pass: build hierarchy
  for (const cat of categories) {
    const category = categoryMap.get(cat.id);
    if (!category) continue;
    
    if (!cat.parent_id) {
      rootCategories.push(category);
    } else {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.subcategories.push(category);
      }
    }
  }
  
  // Third pass: Update parent product counts to include subcategories
  for (const rootCategory of rootCategories) {
    updateParentProductCount(rootCategory);
  }
  
  return { categoryMap, rootCategories };
}

/**
 * Update parent product count to include all subcategories
 * Agora não precisa mais somar, pois a query já inclui subcategorias
 */
function updateParentProductCount(category: CategoryData): number {
  // A query já calcula incluindo subcategorias, então só precisamos
  // processar recursivamente para manter a estrutura
  for (const subcat of category.subcategories) {
    updateParentProductCount(subcat);
  }
  
  // Retornar a contagem já calculada pelo banco
  return category.product_count || 0;
}

/**
 * Sort subcategories by position
 */
function sortSubcategories(categories: CategoryData[]): void {
  for (const category of categories) {
    if (category.subcategories.length > 0) {
      category.subcategories.sort((a, b) => 
        (a.position ?? 999) - (b.position ?? 999)
      );
      sortSubcategories(category.subcategories);
    }
  }
} 