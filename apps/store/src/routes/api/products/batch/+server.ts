import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const { identifiers, include_relations = false } = await request.json();
    
    if (!Array.isArray(identifiers) || identifiers.length === 0) {
      return json({
        success: false,
        error: { message: 'identifiers deve ser um array não vazio' }
      }, { status: 400 });
    }
    
    // Limitar a 50 produtos por batch para evitar sobrecarga
    if (identifiers.length > 50) {
      return json({
        success: false,
        error: { message: 'Máximo de 50 produtos por batch' }
      }, { status: 400 });
    }
    
    const result = await withDatabase(platform, async (db) => {
      // Separar IDs e slugs
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ids = identifiers.filter(id => isUUID.test(id));
      const slugs = identifiers.filter(slug => !isUUID.test(slug));
      
      let products: any[] = [];
      
      // Query base
      const baseQuery = `
        WITH product_images_agg AS (
          SELECT 
            pi.product_id,
            array_agg(pi.url ORDER BY pi.position) as images
          FROM product_images pi
          GROUP BY pi.product_id
        )
        SELECT 
          p.*,
          COALESCE(pi.images, ARRAY[]::text[]) as images
          ${include_relations ? `,
          c.name as category_name,
          c.slug as category_slug,
          b.name as brand_name,
          b.slug as brand_slug,
          s.company_name as seller_name,
          s.slug as seller_slug` : ''}
        FROM products p
        LEFT JOIN product_images_agg pi ON pi.product_id = p.id
        ${include_relations ? `
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id` : ''}
        WHERE p.is_active = true
      `;
      
      // Buscar por IDs
      if (ids.length > 0) {
        const idProducts = await db.query(`
          ${baseQuery}
          AND p.id = ANY($1)
        `, [ids]);
        products.push(...idProducts);
      }
      
      // Buscar por slugs
      if (slugs.length > 0) {
        const slugProducts = await db.query(`
          ${baseQuery}
          AND p.slug = ANY($1)
        `, [slugs]);
        products.push(...slugProducts);
      }
      
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
        images: Array.isArray(product.images) ? product.images : [],
        image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '/api/placeholder/800/800',
        category_id: product.category_id,
        category_name: product.category_name,
        category_slug: product.category_slug,
        brand_id: product.brand_id,
        brand_name: product.brand_name,
        brand_slug: product.brand_slug,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        seller_slug: product.seller_slug,
        is_active: product.is_active,
        stock: product.quantity,
        rating: product.rating_average ? Number(product.rating_average) : undefined,
        reviews_count: product.rating_count,
        sold_count: product.sales_count,
        tags: Array.isArray(product.tags) ? product.tags : [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_featured: product.featured || false,
        sku: product.sku,
        pieces: product.pieces,
        is_black_friday: product.is_black_friday || false,
        has_fast_delivery: product.has_fast_delivery !== false
      }));
      
      // Criar mapa de resultados por identificador
      const resultMap: Record<string, any> = {};
      
      formattedProducts.forEach(product => {
        // Mapear tanto por ID quanto por slug
        resultMap[product.id] = product;
        resultMap[product.slug] = product;
      });
      
      return {
        data: resultMap,
        found: formattedProducts.length,
        requested: identifiers.length
      };
    });
    
    return json({
      success: true,
      data: result.data,
      meta: {
        found: result.found,
        requested: result.requested,
        cached: false
      }
    });
    
  } catch (error) {
    console.error('Erro no batch de produtos:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}; 