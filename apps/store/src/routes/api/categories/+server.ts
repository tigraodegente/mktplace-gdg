import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

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

// Constants
const CACHE_MAX_AGE = 300; // 5 minutes
const STALE_WHILE_REVALIDATE = 60; // 1 minute

export const GET: RequestHandler = async ({ url, setHeaders, platform }) => {
  try {
    // Parse query parameters
    const includeCount = url.searchParams.get('includeCount') === 'true';
    const parentOnly = url.searchParams.get('parentOnly') === 'true';
    
    // Set cache headers for better performance
    setHeaders({
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      'Vary': 'Accept-Encoding'
    });
    
    const result = await withDatabase(platform, async (db) => {
      // Fetch all active categories
      const categories = await db.query<{
        id: string;
        name: string;
        slug: string;
        parent_id: string | null;
        description: string | null;
        position: number | null;
      }>`
        SELECT id, name, slug, parent_id, description, position
        FROM categories
        WHERE is_active = true
        ORDER BY position ASC, name ASC
      `;
      
      // Build category hierarchy
      const { categoryMap, rootCategories } = buildCategoryHierarchy(categories);
      
      // Add product counts if requested
      if (includeCount) {
        await addProductCounts(db, categoryMap);
      }
      
      // Sort subcategories by position
      sortSubcategories(rootCategories);
      
      // Prepare final result
      const finalResult = parentOnly 
        ? rootCategories.map(({ subcategories, ...cat }) => cat)
        : rootCategories;
      
      return {
        categories: finalResult,
        total: rootCategories.length
      };
    });
    
    return json({
      success: true,
      data: result
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
  db: any,
  categoryMap: Map<string, CategoryData>
): Promise<void> {
  const categoryIds = Array.from(categoryMap.keys());
  
  if (categoryIds.length === 0) return;
  
  // Get product counts for all categories in one query
  const counts = await db.query(`
    SELECT 
      category_id,
      COUNT(*)::text as count
    FROM products
    WHERE 
      is_active = true 
      AND quantity > 0
      AND category_id = ANY($1)
    GROUP BY category_id
  `, categoryIds);
  
  // Apply counts to categories
  for (const { category_id, count } of counts) {
    const category = categoryMap.get(category_id);
    if (category) {
      category.product_count = parseInt(count);
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