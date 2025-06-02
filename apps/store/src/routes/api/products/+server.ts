import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { queryWithTimeout } from '$lib/db/queryWithTimeout';
import { logger } from '$lib/utils/logger';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    logger.debug('Products API - Starting request', { 
      queryParams: Object.fromEntries(url.searchParams.entries()) 
    });
    
    // Parâmetros de busca
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
    
    // Executar busca com timeout otimizado
    try {
      const db = getDatabase(platform);
      
      const result = await queryWithTimeout(db, async (db) => {
        // Construir condições da query
        const conditions: string[] = ['p.is_active = true'];
        const params: any[] = [];
        let paramIndex = 1;
        
        if (inStock) {
          conditions.push('p.quantity > 0');
        }
        
        if (categories.length > 0) {
          conditions.push(`EXISTS (
            SELECT 1 FROM categories c 
            WHERE c.id = p.category_id 
            AND (
              c.slug = ANY($${paramIndex}) OR 
              EXISTS (
                SELECT 1 FROM categories parent 
                WHERE parent.id = c.parent_id 
                AND parent.slug = ANY($${paramIndex})
              )
            )
          )`);
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
          conditions.push(`(
            p.name ILIKE $${paramIndex} OR 
            p.description ILIKE $${paramIndex} OR
            p.tags::text ILIKE $${paramIndex}
          )`);
          params.push(`%${searchQuery}%`);
          paramIndex++;
        }
        
        const whereClause = conditions.join(' AND ');
        
        // Ordenação
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
        
        // Query principal otimizada
        const productsQuery = `
          WITH filtered_products AS (
            SELECT 
              p.id, p.name, p.slug, p.description, p.price, p.original_price,
              p.category_id, p.brand_id, p.seller_id, p.quantity, p.rating_average,
              p.rating_count, p.sales_count, p.tags, p.sku, p.featured,
              p.is_active, p.created_at, p.updated_at, p.weight,
              c.name as category_name,
              c.slug as category_slug,
              b.name as brand_name,
              b.slug as brand_slug,
              s.company_name as seller_name,
              COUNT(*) OVER() as total_count
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN brands b ON b.id = p.brand_id
            LEFT JOIN sellers s ON s.id = p.seller_id
            WHERE ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
          )
          SELECT * FROM filtered_products
        `;
        
        params.push(limit, offset);
        
        logger.debug('Executing products query', { 
          whereClause, 
          paramsCount: params.length,
          limit,
          offset 
        });
        
        const products = await db.query(productsQuery, ...params);
        const totalCount = products[0]?.total_count || 0;
        
        // Buscar imagens em batch (se houver produtos)
        let productImages: any[] = [];
        if (products.length > 0) {
          const productIds = products.map((p: any) => p.id);
          productImages = await db.query`
            SELECT DISTINCT ON (product_id) product_id, url, position
            FROM product_images 
            WHERE product_id = ANY(${productIds})
            ORDER BY product_id, position ASC
          `;
        }
        
        // Mapear imagens
        const imageMap = new Map();
        productImages.forEach(img => {
          imageMap.set(img.product_id, img.url);
        });
        
        return {
          products: products.map((product: any) => ({
            ...product,
            image_url: imageMap.get(product.id) || null,
            total_count: undefined // Remover do produto individual
          })),
          totalCount: parseInt(totalCount)
        };
      }, {
        operation: 'products/list',
        retryable: true
      });
      
      // Formatar produtos
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
      
      logger.info('Products query successful', { 
        count: formattedProducts.length,
        total: result.totalCount,
        page,
        source: 'database'
      });
      
      // Buscar facets para filtros (otimizado com cache potencial)
      const facets = await getFacets(db, searchQuery);
      
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
          facets,
          filters: {
            categories,
            brands,
            priceRange: { min: priceMin, max: priceMax },
            hasDiscount,
            inStock
          }
        },
        source: 'database'
      });
      
    } catch (error) {
      logger.error('Database error in products API', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Fallback mínimo
      return json({
        success: false,
        error: {
          message: 'Serviço de busca temporariamente indisponível',
          code: 'DATABASE_ERROR'
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
    
  } catch (error) {
    logger.error('Critical error in products API', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return json({
      success: false,
      error: { 
        message: 'Erro ao buscar produtos'
      }
    }, { status: 500 });
  }
};

// Função auxiliar para buscar facets (pode ser cacheada)
async function getFacets(db: any, searchQuery: string) {
  try {
    // Query otimizada para facets
    const facetsQuery = `
      WITH facet_data AS (
        SELECT 
          -- Categorias
          (SELECT json_agg(DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'count', (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = true)
          )) FROM categories c WHERE c.is_active = true) as categories,
          
          -- Marcas
          (SELECT json_agg(DISTINCT jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'slug', b.slug,
            'count', (SELECT COUNT(*) FROM products WHERE brand_id = b.id AND is_active = true)
          )) FROM brands b WHERE b.is_active = true) as brands,
          
          -- Range de preços
          (SELECT jsonb_build_object(
            'min', COALESCE(MIN(price), 0),
            'max', COALESCE(MAX(price), 10000)
          ) FROM products WHERE is_active = true) as price_range
      )
      SELECT * FROM facet_data
    `;
    
    const result = await db.query(facetsQuery);
    const facetData = result[0] || {};
    
    return {
      categories: facetData.categories || [],
      brands: facetData.brands || [],
      priceRange: facetData.price_range || { min: 0, max: 10000 },
      ratings: [],
      benefits: { discount: 0, freeShipping: 0, outOfStock: 0 }
    };
  } catch (error) {
    logger.warn('Failed to fetch facets, using defaults', { error });
    return {
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 10000 },
      ratings: [],
      benefits: { discount: 0, freeShipping: 0, outOfStock: 0 }
    };
  }
} 