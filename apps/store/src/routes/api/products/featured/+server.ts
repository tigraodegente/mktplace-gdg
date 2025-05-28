import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    const result = await withDatabase(platform, async (db) => {
      // Buscar produtos em destaque com imagens
      const products = await db.query`
        WITH product_images AS (
          SELECT 
            pi.product_id,
            array_agg(pi.url ORDER BY pi.position) as images
          FROM product_images pi
          GROUP BY pi.product_id
        )
        SELECT 
          p.*,
          COALESCE(pi.images, ARRAY[]::text[]) as images,
          c.name as category_name,
          b.name as brand_name,
          s.company_name as seller_name
        FROM products p
        LEFT JOIN product_images pi ON pi.product_id = p.id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        WHERE 
          p.is_active = true 
          AND p.featured = true 
          AND p.quantity > 0
        ORDER BY p.sales_count DESC
        LIMIT 12
      `;
      
      // Formatar produtos
      const formattedProducts = products.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        original_price: product.original_price ? Number(product.original_price) : undefined,
        discount: product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : undefined,
        images: product.images || [],
        image: product.images?.[0] || '',
        category_id: product.category_id,
        category_name: product.category_name,
        brand_id: product.brand_id,
        brand_name: product.brand_name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        is_active: product.is_active,
        stock: product.quantity,
        rating: product.rating_average ? Number(product.rating_average) : undefined,
        reviews_count: product.rating_count,
        sold_count: product.sales_count,
        tags: product.tags || [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_featured: true
      }));
      
      return {
        products: formattedProducts,
        total: formattedProducts.length
      };
    });
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar produtos em destaque' }
    }, { status: 500 });
  }
}; 