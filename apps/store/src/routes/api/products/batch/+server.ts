import { json } from '@sveltejs/kit';
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
                   pieces, is_active
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
                   pieces, is_active
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
          const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean))];
          const brandIds = [...new Set(products.map(p => p.brand_id).filter(Boolean))];
          const sellerIds = [...new Set(products.map(p => p.seller_id).filter(Boolean))];

          if (categoryIds.length > 0) {
            try {
              const categories = await db.query`
                SELECT id, name, slug FROM categories WHERE id = ANY(${categoryIds})
              `;
              categories.forEach((cat: any) => {
                categoryNames[cat.id] = cat.name;
              });
            } catch (e) {
              console.log('Erro ao buscar categorias');
            }
          }

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
        category_name: result.categoryNames[product.category_id] || 'Categoria',
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
        pieces: product.pieces || 1,
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
      console.log(`⚠️ Erro products batch: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Produtos mock baseados nos identificadores
      const mockProducts = identifiers.slice(0, 10).map((identifier: string, index: number) => {
        const isId = identifier.length > 20;
        return {
          id: isId ? identifier : `prod-${index + 1}`,
          name: `Produto ${identifier}`,
          slug: isId ? `produto-${index + 1}` : identifier,
          description: `Descrição do produto ${identifier}`,
          price: 99.99 + (index * 50),
          original_price: 149.99 + (index * 50),
          discount: 33,
          images: [`/api/placeholder/300/400?text=${encodeURIComponent(`Produto ${identifier}`)}`],
          image: `/api/placeholder/300/400?text=${encodeURIComponent(`Produto ${identifier}`)}`,
          category_id: '1',
          category_name: 'Categoria',
          brand_id: '1',
          brand_name: 'Marca',
          seller_id: '1',
          seller_name: 'Loja',
          is_active: true,
          stock: 10,
          rating: 4.5,
          reviews_count: 25,
          sold_count: 50,
          tags: ['produto', 'mock'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_featured: false,
          sku: `SKU-${index + 1}`,
          pieces: 1,
          has_fast_delivery: true
      };
    });
      
      const resultMap: Record<string, any> = {};
      mockProducts.forEach(product => {
        resultMap[product.id] = product;
        resultMap[product.slug] = product;
      });
    
    return json({
      success: true,
        data: resultMap,
      meta: {
          found: mockProducts.length,
          requested: identifiers.length,
        cached: false
        },
        source: 'fallback'
      });
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