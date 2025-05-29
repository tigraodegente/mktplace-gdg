import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const { slug } = params;
    
    const result = await withDatabase(platform, async (db) => {
      // Query para buscar o produto com informações relacionadas
      const query = `
        WITH product_images_agg AS (
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
        LEFT JOIN product_images_agg pi ON pi.product_id = p.id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        WHERE p.slug = $1 AND p.is_active = true
        LIMIT 1
      `;
      
      const products = await db.query(query, slug);
      
      if (products.length === 0) {
        return null;
      }
      
      const product = products[0];
      
      // Formatar o produto
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        original_price: product.original_price ? Number(product.original_price) : undefined,
        discount_percentage: product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : undefined,
        images: Array.isArray(product.images) ? product.images : [],
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '/api/placeholder/800/800',
        category_id: product.category_id,
        category_name: product.category_name,
        brand_id: product.brand_id,
        brand_name: product.brand_name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        is_active: product.is_active,
        stock: product.quantity,
        rating: product.rating_average ? Number(product.rating_average) : 4.5,
        reviews_count: product.rating_count || 0,
        sales_count: product.sales_count || 0,
        sold_count: product.sales_count || 0,
        tags: Array.isArray(product.tags) ? product.tags : [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_featured: product.featured || false,
        sku: product.sku,
        weight: product.weight || 0.5,
        brand: product.brand_name,
        model: product.model,
        condition: product.condition || 'new',
        has_free_shipping: product.has_free_shipping !== false,
        delivery_days: product.delivery_days || 7
      };
    });
    
    if (!result) {
      return json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Produto não encontrado'
        }
      }, { status: 404 });
    }
    
    return json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro ao buscar produto'
      }
    }, { status: 500 });
  }
}; 