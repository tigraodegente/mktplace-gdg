import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('📦 Products Batch - Estratégia híbrida iniciada');
    
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
    
    // Tentar buscar produtos em lote com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 6 segundos
      const queryPromise = (async () => {
      // Separar IDs e slugs
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ids = identifiers.filter(id => isUUID.test(id));
      const slugs = identifiers.filter(slug => !isUUID.test(slug));
      
      let products: any[] = [];
      
        // STEP 1: Buscar produtos básicos por IDs
        if (ids.length > 0) {
          const idProducts = await db.query`
            SELECT id, name, slug, description, price, original_price, category_id,
                   brand_id, seller_id, quantity, rating_average, rating_count,
                   sales_count, tags, created_at, updated_at, featured, sku,
                   is_active
            FROM products
            WHERE id = ANY(${ids}) AND is_active = true
          `;
        products.push(...idProducts);
      }
      
        // STEP 2: Buscar produtos básicos por slugs
      if (slugs.length > 0) {
          const slugProducts = await db.query`
            SELECT id, name, slug, description, price, original_price, category_id,
                   brand_id, seller_id, quantity, rating_average, rating_count,
                   sales_count, tags, created_at, updated_at, featured, sku,
                   is_active
            FROM products
            WHERE slug = ANY(${slugs}) AND is_active = true
          `;
        products.push(...slugProducts);
      }

        // STEP 3: Buscar imagens para cada produto (separadamente)
        const productImages: Record<string, string[]> = {};
        for (const product of products) {
          try {
            const images = await db.query`
              SELECT url FROM product_images 
              WHERE product_id = ${product.id} 
              ORDER BY position 
              LIMIT 5
            `;
            productImages[product.id] = images.map((img: any) => img.url);
          } catch (e) {
            productImages[product.id] = [];
          }
        }

        // STEP 4: Buscar relações se solicitado (queries simplificadas separadas)
        const categoryNames: Record<string, string> = {};
        const brandNames: Record<string, string> = {};
        const sellerNames: Record<string, string> = {};

        if (include_relations) {
          // Buscar categorias através da tabela product_categories
          const productIds = products.map(p => p.id);
          if (productIds.length > 0) {
            try {
              const categoryRelations = await db.query`
                SELECT pc.product_id, c.id, c.name, c.slug 
                FROM product_categories pc
                INNER JOIN categories c ON c.id = pc.category_id
                WHERE pc.product_id = ANY(${productIds}) AND pc.is_primary = true
              `;
              categoryRelations.forEach((rel: any) => {
                categoryNames[rel.product_id] = rel.name;
                // Também adicionar pelo category_id para compatibilidade
                categoryNames[rel.id] = rel.name;
              });
            } catch (e) {
              console.log('Erro ao buscar categorias');
            }
          }

          const brandIds = [...new Set(products.map(p => p.brand_id).filter(Boolean))];
          const sellerIds = [...new Set(products.map(p => p.seller_id).filter(Boolean))];

          if (brandIds.length > 0) {
            try {
              const brands = await db.query`
                SELECT id, name, slug FROM brands WHERE id = ANY(${brandIds})
              `;
              brands.forEach((brand: any) => {
                brandNames[brand.id] = brand.name;
              });
            } catch (e) {
              console.log('Erro ao buscar marcas');
            }
          }

          if (sellerIds.length > 0) {
            try {
              const sellers = await db.query`
                SELECT id, company_name, slug FROM sellers WHERE id = ANY(${sellerIds})
              `;
              sellers.forEach((seller: any) => {
                sellerNames[seller.id] = seller.company_name;
              });
            } catch (e) {
              console.log('Erro ao buscar vendedores');
            }
          }
        }

        return { products, productImages, categoryNames, brandNames, sellerNames };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 6000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      // Formatar produtos
      const formattedProducts = result.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        original_price: product.original_price ? Number(product.original_price) : undefined,
        discount: product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : undefined,
        images: result.productImages[product.id] || [],
        image: result.productImages[product.id]?.[0] || `/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`,
        category_id: product.category_id,
        category_name: result.categoryNames[product.id] || 'Categoria',
        brand_id: product.brand_id,
        brand_name: result.brandNames[product.brand_id] || 'Marca',
        seller_id: product.seller_id,
        seller_name: result.sellerNames[product.seller_id] || 'Loja',
        is_active: product.is_active,
        stock: product.quantity,
        rating: product.rating_average ? Number(product.rating_average) : 4.5,
        reviews_count: product.rating_count || 0,
        sold_count: product.sales_count || 0,
        tags: Array.isArray(product.tags) ? product.tags : [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_featured: product.featured || false,
        sku: product.sku,
        pieces: 1,
        has_fast_delivery: true
      }));
      
      // Criar mapa de resultados por identificador
      const resultMap: Record<string, any> = {};
      formattedProducts.forEach((product: any) => {
        resultMap[product.id] = product;
        resultMap[product.slug] = product;
      });
      
      console.log(`✅ Batch encontrou ${formattedProducts.length}/${identifiers.length} produtos`);
      
      return json({
        success: true,
        data: resultMap,
        meta: {
        found: formattedProducts.length,
          requested: identifiers.length,
          cached: false
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro batch: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar os produtos',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico products batch:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
}; 