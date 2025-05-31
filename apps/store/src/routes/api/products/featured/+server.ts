import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const limit = Number(url.searchParams.get('limit')) || 12;
    
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
        LIMIT ${limit}
      `;
      
      // Formatar produtos para o formato esperado pela página principal
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
        image: product.images?.[0] || '/api/placeholder/300/400?text=Produto&bg=f0f0f0&color=333',
        category_id: product.category_id,
        category_name: product.category_name,
        brand_id: product.brand_id,
        brand_name: product.brand_name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        is_active: product.is_active,
        stock: product.quantity,
        stock_alert_threshold: product.stock_alert_threshold,
        sku: product.sku,
        tags: product.tags || [],
        pieces: product.pieces,
        is_featured: true,
        is_black_friday: false, // Pode ser dinâmico baseado em promoções
        has_fast_delivery: true, // Pode ser dinâmico baseado na localização
        rating: product.rating_average ? Number(product.rating_average) : undefined,
        reviews_count: product.rating_count,
        sold_count: product.sales_count,
        created_at: product.created_at,
        updated_at: product.updated_at
      }));
      
      return formattedProducts;
    });
    
    console.log(`✅ API featured products: ${result.length} produtos retornados`);
    
    return json({
      success: true,
      data: {
        products: result,
        total: result.length
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na API de produtos em destaque:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro ao buscar produtos em destaque',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
}; 