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
    
    // Extrair filtros dinâmicos
    const dynamicFilters: Record<string, string[]> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key.startsWith('opcao_')) {
        const optionSlug = key.replace('opcao_', '');
        dynamicFilters[optionSlug] = value.split(',').filter(Boolean);
      }
    }
    
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
          conditions.push('p.original_price > 0 AND p.original_price > p.price');
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
        
        // Adicionar filtros dinâmicos
        for (const [optionSlug, values] of Object.entries(dynamicFilters)) {
          if (values.length > 0) {
            conditions.push(`EXISTS (
              SELECT 1 
              FROM product_options po
              INNER JOIN product_option_values pov ON pov.option_id = po.id
              WHERE po.product_id = p.id 
              AND LOWER(REPLACE(po.name, ' ', '-')) = $${paramIndex}
              AND pov.value = ANY($${paramIndex + 1})
            )`);
            params.push(optionSlug, values);
            paramIndex += 2;
          }
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
    // Query otimizada para facets incluindo hierarquia e filtros dinâmicos
    const facetsQuery = `
      WITH 
      -- Categorias com hierarquia
      category_hierarchy AS (
        SELECT 
          c.id,
          c.name,
          c.slug,
          c.parent_id,
          c.position,
          (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true) as count
        FROM categories c
        WHERE c.is_active = true
      ),
      
      -- Marcas com contagem
      brand_facets AS (
        SELECT 
          b.id,
          b.name,
          b.slug,
          COUNT(DISTINCT p.id) as count
        FROM brands b
        INNER JOIN products p ON p.brand_id = b.id
        WHERE b.is_active = true AND p.is_active = true
        GROUP BY b.id, b.name, b.slug
        HAVING COUNT(DISTINCT p.id) > 0
      ),
      
      -- Opções dinâmicas (cores, tamanhos, etc)
      dynamic_options AS (
        SELECT 
          MAX(po.name) as option_name, -- Pega o primeiro nome encontrado
          LOWER(REPLACE(po.name, ' ', '-')) as option_slug,
          pov.value,
          COUNT(DISTINCT p.id) as count
        FROM product_options po
        INNER JOIN product_option_values pov ON pov.option_id = po.id
        INNER JOIN products p ON p.id = po.product_id
        WHERE p.is_active = true
        GROUP BY LOWER(REPLACE(po.name, ' ', '-')), pov.value
      ),
      
      -- Agrupar opções dinâmicas
      grouped_dynamic_options AS (
        SELECT 
          option_name,
          option_slug,
          json_agg(
            jsonb_build_object(
              'value', value,
              'count', count
            ) ORDER BY count DESC, value
          ) as values
        FROM dynamic_options
        GROUP BY option_name, option_slug
      ),
      
      -- Benefícios
      benefits_count AS (
        SELECT 
          COUNT(CASE WHEN p.original_price > 0 AND p.price < p.original_price THEN 1 END) as discount_count,
          COUNT(CASE WHEN p.has_free_shipping = true THEN 1 END) as free_shipping_count,
          COUNT(CASE WHEN p.quantity = 0 THEN 1 END) as out_of_stock_count
        FROM products p
        WHERE p.is_active = true
      ),
      
      -- Range de preços
      price_stats AS (
        SELECT 
          COALESCE(MIN(price), 0) as min_price,
          COALESCE(MAX(price), 10000) as max_price
        FROM products 
        WHERE is_active = true AND quantity > 0
      ),
      
      -- Tags populares
      tag_facets AS (
        SELECT 
          tag,
          COUNT(*) as count
        FROM (
          SELECT unnest(tags) as tag
          FROM products
          WHERE is_active = true AND tags IS NOT NULL
        ) t
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      ),
      
      -- Condições
      condition_facets AS (
        SELECT 
          condition,
          COUNT(*) as count
        FROM products
        WHERE is_active = true AND condition IS NOT NULL
        GROUP BY condition
      ),
      
      -- Avaliações
      rating_facets AS (
        SELECT 
          FLOOR(rating_average) as rating,
          COUNT(*) as count
        FROM products
        WHERE is_active = true AND rating_average IS NOT NULL
        GROUP BY FLOOR(rating_average)
      ),
      
      -- Vendedores
      seller_facets AS (
        SELECT 
          s.id,
          s.company_name as name,
          s.slug,
          COUNT(DISTINCT p.id) as count
        FROM sellers s
        INNER JOIN products p ON p.seller_id = s.id
        WHERE s.is_active = true AND p.is_active = true
        GROUP BY s.id, s.company_name, s.slug
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC
        LIMIT 50
      )
      
      SELECT 
        -- Categorias com subcategorias
        (
          SELECT json_agg(
            jsonb_build_object(
              'id', ch.id,
              'name', ch.name,
              'slug', ch.slug,
              'count', ch.count,
              'parent_id', ch.parent_id,
              'subcategories', (
                SELECT json_agg(
                  jsonb_build_object(
                    'id', sub.id,
                    'name', sub.name,
                    'slug', sub.slug,
                    'count', sub.count,
                    'parent_id', sub.parent_id
                  ) ORDER BY sub.position, sub.name
                )
                FROM category_hierarchy sub
                WHERE sub.parent_id = ch.id
              )
            ) ORDER BY ch.position, ch.name
          )
          FROM category_hierarchy ch
          WHERE ch.parent_id IS NULL
        ) as categories,
        
        -- Marcas
        (SELECT json_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'slug', slug,
            'count', count
          ) ORDER BY count DESC, name
        ) FROM brand_facets) as brands,
        
        -- Opções dinâmicas agrupadas
        (
          SELECT json_agg(
            jsonb_build_object(
              'name', option_name,
              'slug', option_slug,
              'values', values
            ) ORDER BY option_name
          )
          FROM grouped_dynamic_options
        ) as dynamic_options,
        
        -- Tags
        (SELECT json_agg(
          jsonb_build_object(
            'id', tag,
            'name', tag,
            'count', count
          )
        ) FROM tag_facets) as tags,
        
        -- Condições
        (SELECT json_agg(
          jsonb_build_object(
            'value', condition,
            'label', CASE 
              WHEN condition = 'new' THEN 'Novo'
              WHEN condition = 'used' THEN 'Usado'
              WHEN condition = 'refurbished' THEN 'Recondicionado'
              ELSE condition
            END,
            'count', count
          )
        ) FROM condition_facets) as conditions,
        
        -- Avaliações
        (SELECT json_agg(
          jsonb_build_object(
            'value', rating::int,
            'count', count
          ) ORDER BY rating DESC
        ) FROM rating_facets) as ratings,
        
        -- Vendedores
        (SELECT json_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'slug', slug,
            'count', count
          )
        ) FROM seller_facets) as sellers,
        
        -- Benefícios
        (SELECT jsonb_build_object(
          'discount', discount_count,
          'freeShipping', free_shipping_count,
          'outOfStock', out_of_stock_count
        ) FROM benefits_count) as benefits,
        
        -- Range de preços
        (SELECT jsonb_build_object(
          'min', min_price,
          'max', max_price
        ) FROM price_stats) as price_range,
        
        -- Opções de entrega (estático por enquanto)
        (SELECT json_agg(
          jsonb_build_object(
            'value', value,
            'label', label,
            'count', 0
          )
        ) FROM (
          VALUES 
            ('24h', 'Entrega em 24h'),
            ('48h', 'Até 2 dias'),
            ('3days', 'Até 3 dias úteis'),
            ('7days', 'Até 7 dias úteis'),
            ('15days', 'Até 15 dias')
        ) AS t(value, label)) as delivery_options
    `;
    
    const result = await db.query(facetsQuery);
    const facetData = result[0] || {};
    
    return {
      categories: facetData.categories || [],
      brands: facetData.brands || [],
      tags: facetData.tags || [],
      priceRange: facetData.price_range || { min: 0, max: 10000 },
      ratings: facetData.ratings || [],
      conditions: facetData.conditions || [
        { value: 'new', label: 'Novo', count: 0 },
        { value: 'used', label: 'Usado', count: 0 },
        { value: 'refurbished', label: 'Recondicionado', count: 0 }
      ],
      deliveryOptions: facetData.delivery_options || [],
      sellers: facetData.sellers || [],
      benefits: facetData.benefits || { discount: 0, freeShipping: 0, outOfStock: 0 },
      dynamicOptions: facetData.dynamic_options || []
    };
  } catch (error) {
    logger.warn('Failed to fetch facets, using defaults', { error });
    return {
      categories: [],
      brands: [],
      tags: [],
      priceRange: { min: 0, max: 10000 },
      ratings: [],
      conditions: [
        { value: 'new', label: 'Novo', count: 0 },
        { value: 'used', label: 'Usado', count: 0 },
        { value: 'refurbished', label: 'Recondicionado', count: 0 }
      ],
      deliveryOptions: [],
      sellers: [],
      benefits: { discount: 0, freeShipping: 0, outOfStock: 0 },
      dynamicOptions: []
    };
  }
} 