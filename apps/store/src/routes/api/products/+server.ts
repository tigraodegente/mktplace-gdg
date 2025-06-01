import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('🛒 Products List - Estratégia híbrida iniciada');
    
    // Parâmetros de busca simplificados
    const searchQuery = url.searchParams.get('q')?.trim() || '';
    const categories = url.searchParams.get('categoria')?.split(',').filter(Boolean) || [];
    const brands = url.searchParams.get('marca')?.split(',').filter(Boolean) || [];
    const priceMin = url.searchParams.get('preco_min') ? Number(url.searchParams.get('preco_min')) : undefined;
    const priceMax = url.searchParams.get('preco_max') ? Number(url.searchParams.get('preco_max')) : undefined;
    const hasDiscount = url.searchParams.get('promocao') === 'true';
    const inStock = url.searchParams.get('disponivel') !== 'false';
    const sortBy = url.searchParams.get('ordenar') || 'relevancia';
    const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('itens')) || 20));
    
    console.log(`📋 Params: q="${searchQuery}", page=${page}, limit=${limit}`);
    
    // Tentar buscar produtos com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 12 segundos para consulta
      const queryPromise = (async () => {
        // QUERY UNIFICADA E SIMPLIFICADA - SEM LOOPS DE QUERIES SEPARADAS
        const conditions: string[] = ['p.is_active = true'];
        const params: any[] = [];
        let paramIndex = 1;
        
        if (inStock) {
          conditions.push('p.quantity > 0');
        }
        
        if (categories.length > 0) {
          // Buscar por slug da categoria em vez de ID
          conditions.push(`EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND c.slug = ANY($${paramIndex}))`);
          params.push(categories);
          paramIndex++;
        }
        
        if (brands.length > 0) {
          conditions.push(`EXISTS (SELECT 1 FROM brands b WHERE b.id = p.brand_id AND b.slug = ANY($${paramIndex}))`);
          params.push(brands);
          paramIndex++;
        }
        
        if (priceMin !== undefined) {
          conditions.push(`p.price >= $${paramIndex}`);
          params.push(priceMin);
          paramIndex++;
        }
        
        if (priceMax !== undefined) {
          conditions.push(`p.price <= $${paramIndex}`);
          params.push(priceMax);
          paramIndex++;
        }
        
        if (hasDiscount) {
          conditions.push('p.original_price > 0 AND p.price < p.original_price');
        }
        
        if (searchQuery) {
          conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
          params.push(`%${searchQuery}%`);
          paramIndex++;
        }
        
        const whereClause = conditions.join(' AND ');
        
        // Ordenação simplificada
        let orderBy = 'p.featured DESC, p.sales_count DESC NULLS LAST';
        switch (sortBy) {
          case 'menor-preco':
            orderBy = 'p.price ASC';
            break;
          case 'maior-preco':
            orderBy = 'p.price DESC';
            break;
          case 'mais-vendidos':
            orderBy = 'p.sales_count DESC NULLS LAST';
            break;
          case 'melhor-avaliados':
            orderBy = 'p.rating_average DESC NULLS LAST';
            break;
          case 'lancamentos':
            orderBy = 'p.created_at DESC';
            break;
        }
        
        const offset = (page - 1) * limit;
        
        // QUERY ÚNICA COM LEFT JOINs SIMPLES - SEM SUBQUERIES COMPLEXAS
        const productsQuery = `
          SELECT 
            p.id, p.name, p.slug, p.description, p.price, p.original_price,
            p.category_id, p.brand_id, p.seller_id, p.quantity, p.rating_average,
            p.rating_count, p.sales_count, p.tags, p.sku, p.featured,
            p.is_active, p.created_at, p.updated_at, p.weight,
            c.name as category_name,
            c.slug as category_slug,
            b.name as brand_name,
            b.slug as brand_slug,
            s.company_name as seller_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          LEFT JOIN brands b ON b.id = p.brand_id  
          LEFT JOIN sellers s ON s.id = p.seller_id
          WHERE ${whereClause}
          ORDER BY ${orderBy}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);
        
        console.log(`🔍 Executando query: WHERE ${whereClause}`);
        console.log(`📊 Params: ${JSON.stringify(params)}`);
        
        const products = await db.query(productsQuery, ...params);
        
        console.log(`📦 Query retornou ${products.length} produtos`);
        
        // Buscar primeira imagem para cada produto (query simples batch)
        let productImages: any[] = [];
        if (products.length > 0) {
          try {
            const productIds = products.map((p: any) => p.id);
            // Query batch para imagens - apenas primeira imagem
            productImages = await db.query`
              SELECT DISTINCT ON (product_id) product_id, url
              FROM product_images 
              WHERE product_id = ANY(${productIds})
              ORDER BY product_id, position ASC
            `;
            console.log(`🖼️ ${productImages.length} imagens encontradas`);
          } catch (imgError) {
            console.log('⚠️ Erro ao buscar imagens em batch, continuando sem elas');
            productImages = [];
          }
        }
        
        // Mapear imagens
        const imageMap = new Map();
        productImages.forEach(img => {
          imageMap.set(img.product_id, img.url);
        });
        
        // Count total (query separada simples)
        const countQuery = `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`;
        const countParams = params.slice(0, -2); // Remove LIMIT e OFFSET
        const countResult = await db.query(countQuery, ...countParams);
        const totalCount = parseInt(countResult[0]?.total || '0');
        
        console.log(`📊 Total: ${totalCount} produtos encontrados`);
        
        return {
          products: products.map((product: any) => ({
            ...product,
            image_url: imageMap.get(product.id) || null
          })),
          totalCount
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout after 12s')), 12000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      // Formatar produtos com dados REAIS
      const formattedProducts = result.products.map((product: any) => {
        const hasDiscount = product.original_price && product.price < product.original_price;
        const discount = hasDiscount 
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : undefined;
          
        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: Number(product.price),
          original_price: product.original_price ? Number(product.original_price) : undefined,
          discount,
          image: product.image_url || `/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`,
          images: product.image_url ? [product.image_url] : [],
          category_id: product.category_id,
          category_name: product.category_name || 'Categoria',
          category_slug: product.category_slug || 'categoria',
          brand_id: product.brand_id,
          brand_name: product.brand_name || 'Marca',
          brand_slug: product.brand_slug || 'marca',
          seller_id: product.seller_id,
          seller_name: product.seller_name || 'Loja Oficial',
          is_active: product.is_active,
          stock: product.quantity || 0,
          rating: product.rating_average ? Number(product.rating_average) : 4.5,
          reviews_count: product.rating_count || 0,
          sold_count: product.sales_count || 0,
          tags: Array.isArray(product.tags) ? product.tags : [],
          created_at: product.created_at,
          updated_at: product.updated_at,
          is_featured: product.featured || false,
          sku: product.sku,
          pieces: 1,
          weight: product.weight ? Number(product.weight) : 0.5,
          has_fast_delivery: true
        };
      });
      
      console.log(`✅ ${formattedProducts.length} produtos REAIS formatados com sucesso`);
      
      return json({
        success: true,
        data: {
          products: formattedProducts,
          pagination: {
            page,
            limit,
            total: result.totalCount,
            totalPages: Math.ceil(result.totalCount / limit),
            hasNext: page < Math.ceil(result.totalCount / limit),
            hasPrev: page > 1
          },
          filters: {
            categories: categories,
            brands: brands,
            priceRange: { min: priceMin, max: priceMax },
            hasDiscount,
            inStock
          }
        },
        source: 'database'
      });
      
    } catch (error) {
      console.error(`❌ ERRO DATABASE: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      console.error(`📍 Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      
      // ⚠️ FALLBACK MÍNIMO - só em caso de erro crítico do banco
      console.log('🚨 Banco completamente inacessível - usando fallback mínimo');
      
      return json({
        success: false,
        error: {
          message: 'Serviço de busca temporariamente indisponível',
          code: 'DATABASE_ERROR',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        },
        data: {
          products: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      }, { status: 503 });
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico products:', error);
    return json({
      success: false,
      error: {
        message: 'Erro ao buscar produtos'
      }
    }, { status: 500 });
  }
};