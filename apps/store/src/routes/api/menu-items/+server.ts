import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';
import type { MenuData, FeaturedItem, CategoryWithChildren, MenuResponse } from '$lib/types/menu';

/**
 * Optimized Menu Items API
 * Returns all menu data in a single request with proper performance optimization
 */
export const GET: RequestHandler = async ({ platform }) => {
  console.log('[SERVER] [INFO][api_menu_items] Menu Items API iniciada');
  console.log('🔌 Dev: NEON');

  try {
    const db = getDatabase(platform);

    // Single optimized query to get all menu data
    const [featuredCategoriesResult, featuredPagesResult, allCategoriesResult] = await Promise.all([
      // Featured categories with product counts
      db.query`
        SELECT 
          c.id,
          c.name,
          c.slug,
          c.image_url,
          c.menu_order,
          'category' as type,
          COALESCE(
            (SELECT COUNT(DISTINCT p.id)::int 
             FROM products p 
             WHERE p.category_id = c.id 
             OR p.category_id IN (
               SELECT id FROM categories WHERE parent_id = c.id
             )
             OR p.category_id IN (
               SELECT id FROM categories WHERE parent_id IN (
                 SELECT id FROM categories WHERE parent_id = c.id
               )
             )
            ), 0
          ) as product_count
        FROM categories c
        WHERE c.is_featured = true
        ORDER BY c.menu_order ASC, c.name ASC
      `,
      
      // Featured pages
      db.query`
        SELECT 
          p.id,
          p.title as name,
          p.slug,
          p.menu_order,
          'page' as type,
          0 as product_count
        FROM pages p
        WHERE p.is_featured = true
        ORDER BY p.menu_order ASC, p.title ASC
      `,
      
      // All categories for mega menu (optimized with recursive count)
      db.query`
        WITH RECURSIVE category_tree AS (
          -- Base case: main categories
          SELECT 
            c.id,
            c.name,
            c.slug,
            c.parent_id,
            c.image_url,
            1 as level,
            COALESCE(
              (SELECT COUNT(DISTINCT p.id)::int 
               FROM products p 
               WHERE p.category_id = c.id
              ), 0
            ) as direct_product_count
          FROM categories c
          WHERE c.parent_id IS NULL
          
          UNION ALL
          
          -- Recursive case: subcategories
          SELECT 
            c.id,
            c.name,
            c.slug,
            c.parent_id,
            c.image_url,
            ct.level + 1,
            COALESCE(
              (SELECT COUNT(DISTINCT p.id)::int 
               FROM products p 
               WHERE p.category_id = c.id
              ), 0
            ) as direct_product_count
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          WHERE ct.level < 3  -- Limit to 3 levels for performance
        )
        SELECT 
          ct.id,
          ct.name,
          ct.slug,
          ct.parent_id,
          ct.image_url,
          ct.level,
          -- Calculate total product count (direct + children + grandchildren)
          COALESCE(
            ct.direct_product_count + 
            (SELECT COALESCE(SUM(
              (SELECT COUNT(DISTINCT p.id)::int 
               FROM products p 
               WHERE p.category_id = child.id
              )
            ), 0)
            FROM categories child 
            WHERE child.parent_id = ct.id
            ) +
            (SELECT COALESCE(SUM(
              (SELECT COUNT(DISTINCT p.id)::int 
               FROM products p 
               WHERE p.category_id = grandchild.id
              )
            ), 0)
            FROM categories grandchild 
            WHERE grandchild.parent_id IN (
              SELECT id FROM categories WHERE parent_id = ct.id
            )
            ), 0
          ) as product_count
        FROM category_tree ct
        ORDER BY ct.level ASC, ct.name ASC
      `
    ]);

    // Process featured items (categories + pages combined)
    const featuredItems: FeaturedItem[] = [
      ...featuredCategoriesResult.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        type: 'category' as const,
        href: `/busca?categoria=${cat.slug}`,
        menu_order: cat.menu_order || 0,
        image_url: cat.image_url,
        product_count: cat.product_count
      })),
      ...featuredPagesResult.map((page: any) => ({
        id: page.id,
        name: page.name,
        slug: page.slug,
        type: 'page' as const,
        href: `/${page.slug}`,
        menu_order: page.menu_order || 999,
        product_count: 0
      }))
    ].sort((a, b) => {
      if (a.menu_order !== b.menu_order) {
        return a.menu_order - b.menu_order;
      }
      return a.name.localeCompare(b.name);
    });

    // Process all categories for mega menu
    const allCategories: CategoryWithChildren[] = allCategoriesResult.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent_id,
      image_url: cat.image_url,
      product_count: Number(cat.product_count) > 0 ? Number(cat.product_count) : 0
    }));

    // Build response data
    const menuData: MenuData = {
      featuredItems,
      allCategories,
      stats: {
        featuredCount: featuredItems.length,
        totalCategories: allCategories.length,
        totalPages: featuredPagesResult.length
      }
    };

    const response: MenuResponse = {
      success: true,
      data: menuData
    };

    console.log(`[SERVER] [INFO][api_menu_items] ✅ Menu carregado: ${featuredCategoriesResult.length} categorias, ${featuredPagesResult.length} páginas, ${allCategories.length} categorias totais`);

    return json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[SERVER] [ERROR][api_menu_items] Erro ao buscar dados do menu:', error);
    
    const errorResponse: MenuResponse = {
      success: false,
      data: {
        featuredItems: [],
        allCategories: [],
        stats: {
          featuredCount: 0,
          totalCategories: 0,
          totalPages: 0
        }
      },
      error: {
        code: 'MENU_FETCH_ERROR',
        message: 'Erro ao carregar dados do menu',
        details: error instanceof Error ? error.message : String(error)
      }
    };

    return json(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 