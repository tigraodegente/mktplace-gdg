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
        // Query com contagens reais de produtos
        const categoriesQuery = `
          SELECT 
            c.id,
            c.name,
            c.slug,
            c.parent_id,
            c.description,
            c.position,
            COALESCE(
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true), 
              0
            ) as product_count
          FROM categories c
          WHERE c.is_active = true
          ORDER BY c.position ASC NULLS LAST, c.name ASC
        `;
        
        logger.debug('Executando query de categorias com contagens reais');
        const categories = await db.query(categoriesQuery);
        logger.debug('Categorias carregadas com contagens reais', { count: categories.length });
        
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
      logger.warn('Database timeout/error - using fallback', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // FALLBACK: Categorias mock baseadas em dados reais do marketplace
      const mockCategories = [
        {
          id: '1',
          name: 'Smartphones',
          slug: 'smartphones',
          description: 'Celulares e smartphones das melhores marcas',
          position: 1,
          parent_id: null,
          subcategories: [
            {
              id: '11',
              name: 'Samsung',
              slug: 'smartphones-samsung',
              description: 'Smartphones Samsung Galaxy',
              position: 1,
              parent_id: '1',
              subcategories: [],
              product_count: 12
            },
            {
              id: '12',
              name: 'Xiaomi',
              slug: 'smartphones-xiaomi', 
              description: 'Smartphones Xiaomi Redmi e Mi',
              position: 2,
              parent_id: '1',
              subcategories: [],
              product_count: 15
            }
          ],
          product_count: 27
        },
        {
          id: '2',
          name: 'TVs e Áudio',
          slug: 'tvs-audio',
          description: 'Televisores, soundbars e equipamentos de áudio',
          position: 2,
          parent_id: null,
          subcategories: [
            {
              id: '21',
              name: 'Smart TVs',
              slug: 'smart-tvs',
              description: 'Smart TVs de todas as marcas e tamanhos',
              position: 1,
              parent_id: '2',
              subcategories: [],
              product_count: 8
            }
          ],
          product_count: 8
        },
        {
          id: '3',
          name: 'Informática',
          slug: 'informatica',
          description: 'Notebooks, desktops e acessórios',
          position: 3,
          parent_id: null,
          subcategories: [
            {
              id: '31',
              name: 'Notebooks',
              slug: 'notebooks',
              description: 'Notebooks para trabalho e jogos',
              position: 1,
              parent_id: '3',
              subcategories: [],
              product_count: 6
            }
          ],
          product_count: 6
        },
        {
          id: '4',
          name: 'Casa e Decoração',
          slug: 'casa-decoracao',
          description: 'Móveis e itens para decoração',
          position: 4,
          parent_id: null,
          subcategories: [],
          product_count: 5
        }
      ].slice(0, parentOnly ? 4 : 20); // Limitar se parentOnly
      
      // Remover subcategorias se parentOnly
      const finalResult = parentOnly 
        ? mockCategories.map(({ subcategories, ...cat }) => cat)
        : mockCategories;
      
      logPerformance('categories_api', startTime, { 
        source: 'fallback', 
        count: finalResult.length 
      });
      
      logAPI('GET', '/api/categories', 200, performance.now() - startTime);
      
      return json({
        success: true,
        data: {
          categories: finalResult,
          total: finalResult.length
        },
        source: 'fallback'
      });
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
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      position: cat.position,
      parent_id: cat.parent_id,
      subcategories: [],
      product_count: parseInt(cat.product_count) || 0 // Usar contagem real do banco
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
  
  return { categoryMap, rootCategories };
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