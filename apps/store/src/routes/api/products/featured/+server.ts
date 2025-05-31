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
        ),
        active_campaigns AS (
          SELECT DISTINCT product_id
          FROM coupons c
          WHERE c.is_active = true 
          AND (c.expires_at IS NULL OR c.expires_at > NOW())
          AND c.type IN ('percentage', 'fixed')
          AND c.value >= 20 -- Desconto mínimo de 20% ou R$20 para ser considerado Black Friday
        )
        SELECT 
          p.*,
          COALESCE(pi.images, ARRAY[]::text[]) as images,
          c.name as category_name,
          b.name as brand_name,
          s.company_name as seller_name,
          -- Lógica para Black Friday
          CASE 
            WHEN ac.product_id IS NOT NULL THEN true -- Produto em campanha ativa
            WHEN p.original_price > 0 AND p.price < p.original_price 
              AND ((p.original_price - p.price) / p.original_price) >= 0.3 THEN true -- Desconto >= 30%
            WHEN 'black-friday' = ANY(p.tags) THEN true -- Tag específica
            ELSE false
          END as is_black_friday_dynamic,
          -- Lógica para entrega rápida
          CASE 
            WHEN p.delivery_days <= 2 THEN true -- Entrega em até 2 dias
            WHEN p.has_free_shipping = true AND p.delivery_days <= 5 THEN true -- Frete grátis em até 5 dias
            WHEN s.state IN ('SP', 'RJ', 'MG') AND p.delivery_days <= 3 THEN true -- Estados principais com entrega rápida
            ELSE false
          END as has_fast_delivery_dynamic
        FROM products p
        LEFT JOIN product_images pi ON pi.product_id = p.id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        LEFT JOIN active_campaigns ac ON ac.product_id = p.id
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
        // Lógica real implementada baseada em dados do banco
        is_black_friday: Boolean(product.is_black_friday_dynamic),
        has_fast_delivery: Boolean(product.has_fast_delivery_dynamic),
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