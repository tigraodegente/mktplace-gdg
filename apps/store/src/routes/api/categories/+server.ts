import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';
import type { Category, Subcategory } from '$lib/services/categoryService';

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

interface CategoryCount {
  categoryId: string;
  count: number;
}

// Constants
const MAX_CATEGORIES = 100;
const CACHE_MAX_AGE = 300; // 5 minutes
const STALE_WHILE_REVALIDATE = 60; // 1 minute

export const GET: RequestHandler = async ({ url, setHeaders }) => {
  try {
    const xata = getXataClient();
    
    // Parse query parameters
    const includeCount = url.searchParams.get('includeCount') === 'true';
    const parentOnly = url.searchParams.get('parentOnly') === 'true';
    
    // Set cache headers for better performance
    setHeaders({
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      'Vary': 'Accept-Encoding'
    });
    
    // Fetch all active categories with optimized query
    const categories = await xata.db.categories
      .filter({ is_active: true })
      .select(['id', 'name', 'slug', 'parent_id', 'description', 'position'])
      .sort('position', 'asc')
      .getMany({ pagination: { size: MAX_CATEGORIES } });
    
    // Build category hierarchy
    const { categoryMap, rootCategories } = buildCategoryHierarchy(categories);
    
    // Add product counts if requested
    if (includeCount) {
      await addProductCounts(xata, categoryMap);
    }
    
    // Sort subcategories by position
    sortSubcategories(rootCategories);
    
    // Prepare final result
    const result = parentOnly 
      ? rootCategories.map(({ subcategories, ...cat }) => cat)
      : rootCategories;
    
    return json({
      success: true,
      data: {
        categories: result,
        total: rootCategories.length
      }
    });
    
  } catch (error) {
    console.error('[Categories API] Error:', error);
    
    // Return appropriate error response
    return json({
      success: false,
      error: {
        message: 'Erro ao buscar categorias',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
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
      product_count: 0
    });
  }
  
  // Second pass: build hierarchy
  for (const cat of categories) {
    const category = categoryMap.get(cat.id);
    if (!category) continue;
    
    if (!cat.parent_id) {
      // Root category
      rootCategories.push(category);
    } else {
      // Subcategory
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.subcategories.push(category);
      }
    }
  }
  
  return { categoryMap, rootCategories };
}

/**
 * Add product counts to categories
 */
async function addProductCounts(
  xata: ReturnType<typeof getXataClient>,
  categoryMap: Map<string, CategoryData>
): Promise<void> {
  const categoryIds = Array.from(categoryMap.keys());
  
  // Batch count products - more efficient than individual queries
  const countPromises = categoryIds.map(async (catId): Promise<CategoryCount> => {
    const result = await xata.db.products
      .filter({
        is_active: true,
        category_id: catId,
        quantity: { $gt: 0 }
      })
      .summarize({
        summaries: { count: { count: '*' } }
      });
    
    return {
      categoryId: catId,
      count: result.summaries[0]?.count || 0
    };
  });
  
  // Execute all counts in parallel
  const counts = await Promise.all(countPromises);
  
  // Apply counts to categories
  for (const { categoryId, count } of counts) {
    const category = categoryMap.get(categoryId);
    if (category) {
      category.product_count = count;
    }
  }
  
  // Propagate counts to parent categories
  for (const category of categoryMap.values()) {
    if (category.subcategories.length > 0) {
      category.product_count += category.subcategories.reduce(
        (sum, sub) => sum + sub.product_count,
        0
      );
    }
  }
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
      // Recursively sort nested subcategories
      sortSubcategories(category.subcategories);
    }
  }
} 