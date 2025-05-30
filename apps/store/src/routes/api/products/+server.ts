import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { createCache } from '$lib/cache/kv-cache';

// Cache de contagens aproximadas em memória
const countCache = new Map<string, { count: number; timestamp: number }>();
const COUNT_CACHE_TTL = 60 * 60 * 1000; // 1 hora

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    // Usar cache KV se disponível
    const cache = (platform as any)?.env?.CACHE_KV ? createCache((platform as any).env.CACHE_KV) : null;
    
    // Criar chave de cache baseada nos parâmetros
    const cacheKey = `products:${url.search || 'all'}`;
    
    // Variável para rastrear se veio do cache
    let fromCache = false;
    
    // Tentar buscar do cache primeiro
    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        fromCache = true;
        return json({
          success: true,
          data: cached,
          cached: true
        }, {
          headers: {
            'X-Cache-Status': 'HIT',
            'X-Cache-Key': cacheKey.substring(0, 50) + '...',
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
          }
        });
      }
    }
    
    // Parâmetros de busca
    const searchQuery = url.searchParams.get('q')?.trim() || '';
    const categories = url.searchParams.get('categoria')?.split(',').filter(Boolean) || [];
    const brands = url.searchParams.get('marca')?.split(',').filter(Boolean) || [];
    const tags = url.searchParams.get('tag')?.split(',').filter(Boolean) || [];
    const priceMin = url.searchParams.get('preco_min') ? Number(url.searchParams.get('preco_min')) : undefined;
    const priceMax = url.searchParams.get('preco_max') ? Number(url.searchParams.get('preco_max')) : undefined;
    const hasDiscount = url.searchParams.get('promocao') === 'true';
    const hasFreeShipping = url.searchParams.get('frete_gratis') === 'true';
    const inStock = url.searchParams.get('disponivel') !== 'false';
    const sortBy = url.searchParams.get('ordenar') || 'relevancia';
    const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('itens')) || 20));
    
    // Novos filtros
    const minRating = url.searchParams.get('avaliacao') ? Number(url.searchParams.get('avaliacao')) : undefined;
    const condition = url.searchParams.get('condicao') as 'new' | 'used' | 'refurbished' | null;
    const deliveryTime = url.searchParams.get('entrega');
    const sellers = url.searchParams.get('vendedor')?.split(',').filter(Boolean) || [];
    
    // Filtro de localização
    const selectedState = url.searchParams.get('estado');
    const selectedCity = url.searchParams.get('cidade');
    
    // Paginação por cursor (novo!)
    const cursor = url.searchParams.get('cursor');
    const useCursor = cursor && page === 1; // Só usa cursor se não especificou página
    
    // Filtros dinâmicos de opções (cor, tamanho, volt, etc)
    const dynamicOptions: Record<string, string[]> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key.startsWith('opcao_')) {
        const optionSlug = key.replace('opcao_', '');
        dynamicOptions[optionSlug] = value.split(',').filter(Boolean);
      }
    }
    
    const result = await withDatabase(platform, async (db) => {
      // Construir condições WHERE
      const conditions: string[] = ['p.is_active = true'];
      const params: any[] = [];
      let paramIndex = 1;
      
      // Adicionar condição de cursor se existir
      if (useCursor && cursor) {
        try {
          const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
          conditions.push(`(p.created_at, p.id) < ($${paramIndex}, $${paramIndex + 1})`);
          params.push(decodedCursor.created_at, decodedCursor.id);
          paramIndex += 2;
        } catch (e) {
          console.error('Invalid cursor:', e);
        }
      }
    
    if (inStock) {
        conditions.push('p.quantity > 0');
    }
    
    if (categories.length > 0) {
        // Aceitar tanto IDs (UUIDs) quanto slugs
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const categoryIds = categories.filter(c => isUUID.test(c));
        const categorySlugs = categories.filter(c => !isUUID.test(c));
        
        const categoryConditions = [];
        
        if (categoryIds.length > 0) {
          // Para cada categoria ID, incluir também suas subcategorias
          categoryConditions.push(`(
            p.category_id = ANY($${paramIndex}) 
            OR p.category_id IN (
              SELECT id FROM categories 
              WHERE parent_id = ANY($${paramIndex})
            )
          )`);
          params.push(categoryIds);
          paramIndex++;
        }
        
        if (categorySlugs.length > 0) {
          // Para cada categoria slug, incluir também suas subcategorias
          categoryConditions.push(`(
            p.category_id IN (
              SELECT id FROM categories 
              WHERE slug = ANY($${paramIndex})
            )
            OR p.category_id IN (
              SELECT c.id FROM categories c
              JOIN categories parent ON c.parent_id = parent.id
              WHERE parent.slug = ANY($${paramIndex})
            )
          )`);
          params.push(categorySlugs);
          paramIndex++;
        }
        
        if (categoryConditions.length > 0) {
          conditions.push(`(${categoryConditions.join(' OR ')})`);
        }
    }
    
    if (brands.length > 0) {
        // Aceitar tanto IDs (UUIDs) quanto slugs
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const brandIds = brands.filter(b => isUUID.test(b));
        const brandSlugs = brands.filter(b => !isUUID.test(b));
        
        const brandConditions = [];
        
        if (brandIds.length > 0) {
          brandConditions.push(`p.brand_id = ANY($${paramIndex})`);
          params.push(brandIds);
          paramIndex++;
        }
        
        if (brandSlugs.length > 0) {
          brandConditions.push(`p.brand_id IN (SELECT id FROM brands WHERE slug = ANY($${paramIndex}))`);
          params.push(brandSlugs);
          paramIndex++;
        }
        
        if (brandConditions.length > 0) {
          conditions.push(`(${brandConditions.join(' OR ')})`);
        }
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
    
    if (hasFreeShipping) {
        conditions.push('p.has_free_shipping = true');
      }
      
      // Filtro de avaliação mínima
      if (minRating !== undefined && minRating > 0) {
        conditions.push(`p.rating_average >= $${paramIndex}`);
        params.push(minRating);
        paramIndex++;
      }
      
      // Filtro de condição do produto
      if (condition) {
        conditions.push(`p.condition = $${paramIndex}`);
        params.push(condition);
        paramIndex++;
      }
      
      // Filtro de tempo de entrega
    if (deliveryTime) {
      switch (deliveryTime) {
        case '24h':
            conditions.push('p.delivery_days <= 1');
          break;
        case '48h':
            conditions.push('p.delivery_days <= 2');
            break;
          case '3days':
            conditions.push('p.delivery_days <= 3');
            break;
          case '7days':
            conditions.push('p.delivery_days <= 7');
            break;
          case '15days':
            conditions.push('p.delivery_days <= 15');
          break;
        }
      }
      
      // Filtro de vendedores
      if (sellers.length > 0) {
        // Aceitar tanto IDs quanto slugs
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const sellerIds = sellers.filter(s => isUUID.test(s));
        const sellerSlugs = sellers.filter(s => !isUUID.test(s));
        
        const sellerConditions = [];
        
        if (sellerIds.length > 0) {
          sellerConditions.push(`p.seller_id = ANY($${paramIndex})`);
          params.push(sellerIds);
          paramIndex++;
        }
        
        if (sellerSlugs.length > 0) {
          sellerConditions.push(`p.seller_id IN (SELECT id FROM sellers WHERE slug = ANY($${paramIndex}))`);
          params.push(sellerSlugs);
          paramIndex++;
        }
        
        if (sellerConditions.length > 0) {
          conditions.push(`(${sellerConditions.join(' OR ')})`);
        }
      }
      
      // Filtro de tags
      if (tags.length > 0) {
        conditions.push(`p.tags && $${paramIndex}`); // Operador && verifica se arrays têm elementos em comum
        params.push(tags);
        paramIndex++;
      }
      
      // Filtro de localização
      if (selectedState) {
        conditions.push(`p.seller_state = $${paramIndex}`);
        params.push(selectedState);
        paramIndex++;
      }
      
      if (selectedCity) {
        conditions.push(`p.seller_city = $${paramIndex}`);
        params.push(selectedCity);
        paramIndex++;
      }
      
      // Adicionar filtros de opções dinâmicas
      for (const [optionSlug, values] of Object.entries(dynamicOptions)) {
        if (values.length > 0) {
          conditions.push(`
            EXISTS (
              SELECT 1 
              FROM product_variants pv
              JOIN variant_option_values vov ON vov.variant_id = pv.id
              JOIN product_option_values pov ON pov.id = vov.option_value_id
              JOIN product_options po ON po.id = pov.option_id
              WHERE pv.product_id = p.id
                AND LOWER(REPLACE(po.name, ' ', '-')) = $${paramIndex}
                AND pov.value = ANY($${paramIndex + 1})
            )
          `);
          params.push(optionSlug, values);
          paramIndex += 2;
        }
      }
      
      if (searchQuery) {
        // Busca melhorada
        conditions.push(`(
          -- Busca no nome
          p.name ILIKE $${paramIndex} 
          -- Busca na descrição
          OR p.description ILIKE $${paramIndex}
          -- Busca full-text com stemming em português
          OR to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('portuguese', $${paramIndex + 1})
          -- Busca por SKU exato
          OR UPPER(p.sku) = UPPER($${paramIndex + 2})
          -- Busca em tags
          OR EXISTS (
            SELECT 1 FROM unnest(p.tags) AS tag 
            WHERE tag ILIKE $${paramIndex}
          )
        )`);
        params.push(`%${searchQuery}%`); // Para ILIKE
        params.push(searchQuery); // Para full-text
        params.push(searchQuery); // Para SKU
        paramIndex += 3;
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Ordenação
      let orderBy = '';
      switch (sortBy) {
        case 'menor-preco':
          orderBy = 'CASE WHEN p.quantity > 0 THEN 0 ELSE 1 END, p.price ASC';
          break;
        case 'maior-preco':
          orderBy = 'CASE WHEN p.quantity > 0 THEN 0 ELSE 1 END, p.price DESC';
          break;
        case 'mais-vendidos':
          orderBy = 'CASE WHEN p.quantity > 0 THEN 0 ELSE 1 END, p.sales_count DESC';
          break;
        case 'melhor-avaliados':
          orderBy = 'CASE WHEN p.quantity > 0 THEN 0 ELSE 1 END, p.rating_average DESC NULLS LAST, p.rating_count DESC';
          break;
        case 'lancamentos':
          orderBy = 'CASE WHEN p.quantity > 0 THEN 0 ELSE 1 END, p.created_at DESC';
          break;
        default:
          orderBy = 'CASE WHEN p.quantity > 0 THEN 0 ELSE 1 END, p.featured DESC, p.sales_count DESC';
      }
      
      // Calcular offset
      const offset = (page - 1) * limit;
      
      // Query principal com imagens
      const productsQuery = `
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
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      
      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        WHERE ${whereClause}
      `;
      
      // Executar queries em paralelo
      const [products, countResult] = await Promise.all([
        db.query(productsQuery, ...params),
        db.query(countQuery, ...params.slice(0, -2)) // Remove limit e offset
      ]);
      
      const totalCount = parseInt(countResult[0].total);
      
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
        brand_id: product.brand_id,
        brand_name: product.brand_name,
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        is_active: product.is_active,
        stock: product.quantity,
        rating: product.rating_average ? Number(product.rating_average) : undefined,
        reviews_count: product.rating_count,
        sold_count: product.sales_count,
        tags: Array.isArray(product.tags) ? product.tags : [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_featured: product.featured || false,
        // Adicionar campos extras esperados pelo ProductCard
        sku: product.sku,
        pieces: product.pieces,
        is_black_friday: product.is_black_friday || false,
        has_fast_delivery: product.has_fast_delivery !== false,
        // 🚚 PESO E DIMENSÕES PARA CÁLCULO DE FRETE
        weight: product.weight ? Number(product.weight) : 0.5, // kg - default 500g
        height: product.height ? Number(product.height) : 10,   // cm
        width: product.width ? Number(product.width) : 10,      // cm
        length: product.length ? Number(product.length) : 10    // cm
      }));
      
      // Buscar facetas (categorias e marcas disponíveis)
      // IMPORTANTE: As facetas devem considerar TODOS os filtros aplicados
      // EXCETO o próprio filtro sendo calculado
      
      // Função auxiliar para construir WHERE clause para facetas
      const buildFacetWhereClause = (excludeCondition: string, startParamIndex: number = 1) => {
        const facetConditions: string[] = [];
        let currentParamIndex = startParamIndex;
        
        // Reconstruir condições com novos índices de parâmetros
        if (categories.length > 0 && !excludeCondition.includes('p.category_id')) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const categoryIds = categories.filter(c => isUUID.test(c));
          const categorySlugs = categories.filter(c => !isUUID.test(c));
          
          const categoryConditions = [];
          
          if (categoryIds.length > 0) {
            categoryConditions.push(`p.category_id = ANY($${currentParamIndex})`);
            currentParamIndex++;
          }
          
          if (categorySlugs.length > 0) {
            categoryConditions.push(`p.category_id IN (SELECT id FROM categories WHERE slug = ANY($${currentParamIndex}))`);
            currentParamIndex++;
          }
          
          if (categoryConditions.length > 0) {
            facetConditions.push(`(${categoryConditions.join(' OR ')})`);
          }
        }
        
        if (brands.length > 0 && !excludeCondition.includes('p.brand_id')) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const brandIds = brands.filter(b => isUUID.test(b));
          const brandSlugs = brands.filter(b => !isUUID.test(b));
          
          const brandConditions = [];
          
          if (brandIds.length > 0) {
            brandConditions.push(`p.brand_id = ANY($${currentParamIndex})`);
            currentParamIndex++;
          }
          
          if (brandSlugs.length > 0) {
            brandConditions.push(`p.brand_id IN (SELECT id FROM brands WHERE slug = ANY($${currentParamIndex}))`);
            currentParamIndex++;
          }
          
          if (brandConditions.length > 0) {
            facetConditions.push(`(${brandConditions.join(' OR ')})`);
          }
        }
        
        if (priceMin !== undefined && !excludeCondition.includes('p.price')) {
          facetConditions.push(`p.price >= $${currentParamIndex}`);
          currentParamIndex++;
        }
        
        if (priceMax !== undefined && !excludeCondition.includes('p.price')) {
          facetConditions.push(`p.price <= $${currentParamIndex}`);
          currentParamIndex++;
        }
        
        if (hasDiscount && !excludeCondition.includes('p.original_price')) {
          facetConditions.push('p.original_price > 0 AND p.price < p.original_price');
        }
        
        if (hasFreeShipping && !excludeCondition.includes('p.has_free_shipping')) {
          facetConditions.push('p.has_free_shipping = true');
        }
        
        if (inStock && !excludeCondition.includes('p.quantity')) {
          facetConditions.push('p.quantity > 0');
        }
        
        if (minRating !== undefined && minRating > 0 && !excludeCondition.includes('p.rating_average')) {
          facetConditions.push(`p.rating_average >= $${currentParamIndex}`);
          currentParamIndex++;
        }
        
        if (condition && !excludeCondition.includes('p.condition')) {
          facetConditions.push(`p.condition = $${currentParamIndex}`);
          currentParamIndex++;
        }
        
        if (deliveryTime && !excludeCondition.includes('p.delivery_days')) {
          switch (deliveryTime) {
            case '24h':
              facetConditions.push('p.delivery_days <= 1');
              break;
            case '48h':
              facetConditions.push('p.delivery_days <= 2');
              break;
            case '3days':
              facetConditions.push('p.delivery_days <= 3');
              break;
            case '7days':
              facetConditions.push('p.delivery_days <= 7');
              break;
            case '15days':
              facetConditions.push('p.delivery_days <= 15');
              break;
          }
        }
        
        if (sellers.length > 0 && !excludeCondition.includes('p.seller_id')) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const sellerIds = sellers.filter(s => isUUID.test(s));
          const sellerSlugs = sellers.filter(s => !isUUID.test(s));
          
          const sellerConditions = [];
          
          if (sellerIds.length > 0) {
            sellerConditions.push(`p.seller_id = ANY($${currentParamIndex})`);
            currentParamIndex++;
          }
          
          if (sellerSlugs.length > 0) {
            sellerConditions.push(`p.seller_id IN (SELECT id FROM sellers WHERE slug = ANY($${currentParamIndex}))`);
            currentParamIndex++;
          }
          
          if (sellerConditions.length > 0) {
            facetConditions.push(`(${sellerConditions.join(' OR ')})`);
          }
        }
        
        if (tags.length > 0 && !excludeCondition.includes('p.tags')) {
          facetConditions.push(`p.tags && $${currentParamIndex}`);
          currentParamIndex++;
        }
        
        if (selectedState && !excludeCondition.includes('p.seller_state')) {
          facetConditions.push(`p.seller_state = $${currentParamIndex}`);
          currentParamIndex++;
        }
        
        if (selectedCity && !excludeCondition.includes('p.seller_city')) {
          facetConditions.push(`p.seller_city = $${currentParamIndex}`);
          currentParamIndex++;
        }
        
        if (searchQuery && !excludeCondition.includes('search')) {
          facetConditions.push(`(
            p.name ILIKE $${currentParamIndex} 
            OR p.description ILIKE $${currentParamIndex}
            OR to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('portuguese', $${currentParamIndex + 1})
            OR UPPER(p.sku) = UPPER($${currentParamIndex + 2})
            OR EXISTS (
              SELECT 1 FROM unnest(p.tags) AS tag 
              WHERE tag ILIKE $${currentParamIndex}
            )
          )`);
          currentParamIndex += 3;
        }
        
        // Adicionar filtros de opções dinâmicas nas facetas
        for (const [optionSlug, values] of Object.entries(dynamicOptions)) {
          if (values.length > 0 && !excludeCondition.includes(`opcao_${optionSlug}`)) {
            facetConditions.push(`
              EXISTS (
                SELECT 1 
                FROM product_variants pv
                JOIN variant_option_values vov ON vov.variant_id = pv.id
                JOIN product_option_values pov ON pov.id = vov.option_value_id
                JOIN product_options po ON po.id = pov.option_id
                WHERE pv.product_id = p.id
                  AND LOWER(REPLACE(po.name, ' ', '-')) = $${currentParamIndex}
                  AND pov.value = ANY($${currentParamIndex + 1})
              )
            `);
            currentParamIndex += 2;
          }
        }
        
        return facetConditions.length > 0 ? 'AND ' + facetConditions.join(' AND ') : '';
      };
      
      // Função para construir parâmetros para facetas
      const buildFacetParams = (excludeCondition: string) => {
        const facetParams: any[] = [];
        
        if (categories.length > 0 && !excludeCondition.includes('p.category_id')) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const categoryIds = categories.filter(c => isUUID.test(c));
          const categorySlugs = categories.filter(c => !isUUID.test(c));
          
          if (categoryIds.length > 0) {
            facetParams.push(categoryIds);
          }
          
          if (categorySlugs.length > 0) {
            facetParams.push(categorySlugs);
          }
        }
        
        if (brands.length > 0 && !excludeCondition.includes('p.brand_id')) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const brandIds = brands.filter(b => isUUID.test(b));
          const brandSlugs = brands.filter(b => !isUUID.test(b));
          
          if (brandIds.length > 0) {
            facetParams.push(brandIds);
          }
          
          if (brandSlugs.length > 0) {
            facetParams.push(brandSlugs);
          }
        }
        
        if (priceMin !== undefined && !excludeCondition.includes('p.price')) {
          facetParams.push(priceMin);
        }
        
        if (priceMax !== undefined && !excludeCondition.includes('p.price')) {
          facetParams.push(priceMax);
        }
        
        if (minRating !== undefined && minRating > 0 && !excludeCondition.includes('p.rating_average')) {
          facetParams.push(minRating);
        }
        
        if (condition && !excludeCondition.includes('p.condition')) {
          facetParams.push(condition);
        }
        
        if (sellers.length > 0 && !excludeCondition.includes('p.seller_id')) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const sellerIds = sellers.filter(s => isUUID.test(s));
          const sellerSlugs = sellers.filter(s => !isUUID.test(s));
          
          if (sellerIds.length > 0) {
            facetParams.push(sellerIds);
          }
          
          if (sellerSlugs.length > 0) {
            facetParams.push(sellerSlugs);
          }
        }
        
        if (tags.length > 0 && !excludeCondition.includes('p.tags')) {
          facetParams.push(tags);
        }
        
        if (selectedState && !excludeCondition.includes('p.seller_state')) {
          facetParams.push(selectedState);
        }
        
        if (selectedCity && !excludeCondition.includes('p.seller_city')) {
          facetParams.push(selectedCity);
        }
        
        // Adicionar parâmetros de opções dinâmicas nas facetas
        for (const [optionSlug, values] of Object.entries(dynamicOptions)) {
          if (values.length > 0 && !excludeCondition.includes(`opcao_${optionSlug}`)) {
            facetParams.push(optionSlug, values);
          }
        }
        
        if (searchQuery && !excludeCondition.includes('search')) {
          facetParams.push(`%${searchQuery}%`);
          facetParams.push(searchQuery);
          facetParams.push(searchQuery);
        }
        
        return facetParams;
      };
      
      // Facetas de categorias (considera todos os filtros EXCETO categoria)
      const categoryFacetsQuery = `
        WITH category_counts AS (
          -- Contar produtos diretos de cada categoria
          SELECT 
            c.id, 
            c.name, 
            c.slug,
            c.parent_id,
            COUNT(DISTINCT p.id) as direct_count
          FROM categories c
          INNER JOIN products p ON p.category_id = c.id
          WHERE 
            p.is_active = true 
            AND c.is_active = true
            ${buildFacetWhereClause('p.category_id')}
          GROUP BY c.id, c.name, c.slug, c.parent_id
        ),
        -- Contar produtos de subcategorias para categorias pai
        subcategory_counts AS (
          SELECT 
            parent.id,
            COUNT(DISTINCT p.id) as subcategory_count
          FROM categories parent
          INNER JOIN categories child ON child.parent_id = parent.id
          INNER JOIN products p ON p.category_id = child.id
          WHERE 
            p.is_active = true 
            AND parent.is_active = true
            AND child.is_active = true
            ${buildFacetWhereClause('p.category_id')}
          GROUP BY parent.id
        ),
        -- Combinar contagens
        combined_counts AS (
          SELECT 
            c.id,
            c.name,
            c.slug,
            c.parent_id,
            COALESCE(cc.direct_count, 0) + COALESCE(sc.subcategory_count, 0) as count
          FROM categories c
          LEFT JOIN category_counts cc ON cc.id = c.id
          LEFT JOIN subcategory_counts sc ON sc.id = c.id
          WHERE c.is_active = true
            AND (cc.direct_count > 0 OR sc.subcategory_count > 0)
        ),
        -- Adicionar subcategorias com seus counts
        all_categories AS (
          SELECT 
            cc.id,
            cc.name,
            cc.slug,
            cc.parent_id,
            cc.count,
            CASE 
              WHEN cc.parent_id IS NULL THEN
                COALESCE(
                  (
                    SELECT json_agg(
                      json_build_object(
                        'id', sub.id,
                        'name', sub.name,
                        'slug', sub.slug,
                        'count', sub.count
                      ) ORDER BY sub.count DESC, sub.name
                    )
                    FROM combined_counts sub
                    WHERE sub.parent_id = cc.id
                  ),
                  '[]'::json
                )
              ELSE NULL
            END as subcategories
          FROM combined_counts cc
        )
        SELECT * FROM all_categories
        ORDER BY 
          CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
          count DESC, 
          name
      `;
      
      // Facetas de marcas (considera todos os filtros EXCETO marca)
      const brandFacetsQuery = `
        SELECT 
          b.id, 
          b.name, 
          b.slug, 
          COUNT(DISTINCT p.id) as count
        FROM brands b
        INNER JOIN products p ON p.brand_id = b.id
        WHERE 
          p.is_active = true 
          AND b.is_active = true
          ${buildFacetWhereClause('p.brand_id')}
        GROUP BY b.id, b.name, b.slug
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, b.name
      `;
      
      // Facetas de avaliação
      const ratingFacetsQuery = `
        SELECT 
          rating_level,
          COUNT(DISTINCT id) as count
        FROM (
          SELECT 
            p.id,
            CASE 
              WHEN p.rating_average >= 5 THEN 5
              WHEN p.rating_average >= 4 THEN 4
              WHEN p.rating_average >= 3 THEN 3
              WHEN p.rating_average >= 2 THEN 2
              WHEN p.rating_average >= 1 THEN 1
              ELSE 0
            END as rating_level
          FROM products p
          WHERE 
            p.is_active = true
            ${buildFacetWhereClause('p.rating_average')}
        ) rated_products
        WHERE rating_level > 0
        GROUP BY rating_level
        ORDER BY rating_level DESC
      `;
      
      // Facetas de condição
      const conditionFacetsQuery = `
        SELECT 
          p.condition as value,
          CASE p.condition
            WHEN 'new' THEN 'Novo'
            WHEN 'used' THEN 'Usado'
            WHEN 'refurbished' THEN 'Recondicionado'
          END as label,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE 
          p.is_active = true
          ${buildFacetWhereClause('p.condition')}
        GROUP BY p.condition
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY 
          CASE p.condition
            WHEN 'new' THEN 1
            WHEN 'used' THEN 2
            WHEN 'refurbished' THEN 3
          END
      `;
      
      // Facetas de tempo de entrega
      const deliveryFacetsQuery = `
        SELECT 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            ELSE '15days'
          END as value,
          CASE 
            WHEN p.delivery_days <= 1 THEN 'Entrega em 24h'
            WHEN p.delivery_days <= 2 THEN 'Até 2 dias'
            WHEN p.delivery_days <= 3 THEN 'Até 3 dias úteis'
            WHEN p.delivery_days <= 7 THEN 'Até 7 dias úteis'
            ELSE 'Até 15 dias'
          END as label,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE 
          p.is_active = true
          ${buildFacetWhereClause('p.delivery_days')}
        GROUP BY 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            ELSE '15days'
          END,
          CASE 
            WHEN p.delivery_days <= 1 THEN 'Entrega em 24h'
            WHEN p.delivery_days <= 2 THEN 'Até 2 dias'
            WHEN p.delivery_days <= 3 THEN 'Até 3 dias úteis'
            WHEN p.delivery_days <= 7 THEN 'Até 7 dias úteis'
            ELSE 'Até 15 dias'
          END
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY MIN(p.delivery_days)
      `;
      
      // Facetas de vendedores
      const sellerFacetsQuery = `
        SELECT 
          s.id,
          s.company_name as name,
          s.slug,
          AVG(p.rating_average) as rating,
          COUNT(DISTINCT p.id) as count
        FROM sellers s
        INNER JOIN products p ON p.seller_id = s.id
        WHERE 
          p.is_active = true
          AND s.is_active = true
          ${buildFacetWhereClause('p.seller_id')}
        GROUP BY s.id, s.company_name, s.slug
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, s.company_name
        LIMIT 20
      `;
      
      // Facetas de benefícios
      const benefitsFacetsQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN p.original_price > 0 AND p.price < p.original_price THEN p.id END) as discount_count,
          COUNT(DISTINCT CASE WHEN p.has_free_shipping = true THEN p.id END) as free_shipping_count,
          COUNT(DISTINCT CASE WHEN p.quantity = 0 THEN p.id END) as out_of_stock_count
        FROM products p
        WHERE 
          p.is_active = true
          ${buildFacetWhereClause('p.quantity')} -- Exclui p.quantity para contar corretamente os fora de estoque
      `;
      
      // Facetas de tags
      const tagsFacetsQuery = `
        SELECT 
          tag,
          COUNT(DISTINCT p.id) as count
        FROM products p
        CROSS JOIN LATERAL unnest(p.tags) AS tag
        WHERE 
          p.is_active = true
          ${buildFacetWhereClause('p.tags')}
        GROUP BY tag
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, tag
        LIMIT 30
      `;
      
      // Facetas de localização - Estados
      const statesFacetsQuery = `
        SELECT 
          p.seller_state as code,
          p.seller_state as name,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE 
          p.is_active = true
          AND p.seller_state IS NOT NULL
          ${buildFacetWhereClause('p.seller_state')}
        GROUP BY p.seller_state
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, p.seller_state
      `;
      
      // Facetas de localização - Cidades (baseado no estado selecionado)
      let citiesFacetsQuery = '';
      if (selectedState) {
        const cityFacetParams = buildFacetParams('p.seller_city');
        const stateParamIndex = cityFacetParams.length + 1;
        citiesFacetsQuery = `
          SELECT 
            p.seller_city as name,
            p.seller_state as state,
            COUNT(DISTINCT p.id) as count
          FROM products p
          WHERE 
            p.is_active = true
            AND p.seller_city IS NOT NULL
            AND p.seller_state = $${stateParamIndex}
            ${buildFacetWhereClause('p.seller_city')}
          GROUP BY p.seller_city, p.seller_state
          HAVING COUNT(DISTINCT p.id) > 0
          ORDER BY count DESC, p.seller_city
        `;
      }
      
      // Facetas de opções dinâmicas (cor, tamanho, volt, etc)
      const dynamicOptionsFacetsQuery = `
        WITH option_facets AS (
          SELECT 
            po.name as option_name,
            LOWER(REPLACE(po.name, ' ', '-')) as option_slug,
            pov.value,
            COUNT(DISTINCT p.id) as count
          FROM products p
          JOIN product_options po ON po.product_id = p.id
          JOIN product_option_values pov ON pov.option_id = po.id
          JOIN variant_option_values vov ON vov.option_value_id = pov.id
          JOIN product_variants pv ON pv.id = vov.variant_id AND pv.product_id = p.id
          WHERE 
            p.is_active = true
            ${buildFacetWhereClause('dynamic_options')}
          GROUP BY po.name, pov.value
          HAVING COUNT(DISTINCT p.id) > 0
        )
        SELECT 
          option_name,
          option_slug,
          json_agg(
            json_build_object(
              'value', value,
              'count', count
            ) ORDER BY count DESC, value
          ) as values
        FROM option_facets
        GROUP BY option_name, option_slug
        ORDER BY 
          CASE option_slug
            WHEN 'cor' THEN 1
            WHEN 'tamanho' THEN 2
            WHEN 'volt' THEN 3
            ELSE 4
          END,
          option_name
      `;
      
      // Executar todas as queries de facetas em paralelo
      const [
        categoryFacets,
        brandFacets,
        ratingFacets,
        conditionFacets,
        deliveryFacets,
        sellerFacets,
        benefitsFacets,
        tagsFacets,
        statesFacets,
        citiesFacets,
        dynamicOptionsFacets
      ] = await Promise.all([
        db.query(categoryFacetsQuery, ...buildFacetParams('p.category_id')).catch((err) => {
          console.error('Erro em categoryFacets:', err);
          return [];
        }),
        db.query(brandFacetsQuery, ...buildFacetParams('p.brand_id')).catch((err) => {
          console.error('Erro em brandFacets:', err);
          return [];
        }),
        db.query(ratingFacetsQuery, ...buildFacetParams('p.rating_average')).catch((err) => {
          console.error('Erro em ratingFacets:', err);
          return [];
        }),
        db.query(conditionFacetsQuery, ...buildFacetParams('p.condition')).catch((err) => {
          console.error('Erro em conditionFacets:', err);
          return [];
        }),
        db.query(deliveryFacetsQuery, ...buildFacetParams('p.delivery_days')).catch((err) => {
          console.error('Erro em deliveryFacets:', err);
          return [];
        }),
        db.query(sellerFacetsQuery, ...buildFacetParams('p.seller_id')).catch((err) => {
          console.error('Erro em sellerFacets:', err);
          return [];
        }),
        db.query(benefitsFacetsQuery, ...buildFacetParams('p.quantity')).catch((err) => {
          console.error('Erro em benefitsFacets:', err);
          return [{ discount_count: 0, free_shipping_count: 0, out_of_stock_count: 0 }];
        }),
        db.query(tagsFacetsQuery, ...buildFacetParams('p.tags')).catch((err) => {
          console.error('Erro em tagsFacets:', err);
          return [];
        }),
        db.query(statesFacetsQuery, ...buildFacetParams('p.seller_state')).catch((err) => {
          console.error('Erro em statesFacets:', err);
          return [];
        }),
        selectedState && citiesFacetsQuery 
          ? db.query(citiesFacetsQuery, ...buildFacetParams('p.seller_city'), selectedState).catch((err) => {
              console.error('Erro em citiesFacets:', err);
              return [];
            })
          : Promise.resolve([]),
        db.query(dynamicOptionsFacetsQuery, ...buildFacetParams('dynamic_options')).catch((err) => {
          console.error('Erro em dynamicOptionsFacets:', err);
          return [];
        })
      ]);
      
      // Formatar facetas de rating
      const formattedRatingFacets = ratingFacets.map((r: any) => ({
        value: r.rating_level,
        count: parseInt(r.count)
      }));
      
      const facets = {
        categories: categoryFacets.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: parseInt(c.count),
          subcategories: c.subcategories ? c.subcategories.map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            slug: sub.slug,
            count: parseInt(sub.count)
          })) : []
        })),
        brands: brandFacets.map((b: any) => ({
          ...b,
          count: parseInt(b.count)
        })),
        ratings: formattedRatingFacets,
        conditions: conditionFacets.map((c: any) => ({
          ...c,
          count: parseInt(c.count)
        })),
        deliveryOptions: deliveryFacets.map((d: any) => ({
          ...d,
          count: parseInt(d.count)
        })),
        sellers: sellerFacets.map((s: any) => ({
          ...s,
          rating: s.rating ? parseFloat(s.rating) : null,
          count: parseInt(s.count)
        })),
        tags: tagsFacets.map((t: any) => ({
          id: t.tag,
          name: t.tag,
          count: parseInt(t.count)
        })),
        locations: { 
          states: statesFacets.map((s: any) => ({
            ...s,
            count: parseInt(s.count)
          })),
          cities: citiesFacets.map((c: any) => ({
            ...c,
            count: parseInt(c.count)
          }))
        },
        benefits: {
          discount: parseInt(benefitsFacets[0]?.discount_count || '0'),
          freeShipping: parseInt(benefitsFacets[0]?.free_shipping_count || '0'),
          outOfStock: parseInt(benefitsFacets[0]?.out_of_stock_count || '0')
        },
        dynamicOptions: dynamicOptionsFacets.map((opt: any) => ({
          name: opt.option_name,
          slug: opt.option_slug,
          values: opt.values || []
        }))
      };
      
      return {
        products: formattedProducts,
          totalCount,
          page,
          limit,
          facets
      };
    });
    
    // Armazenar no cache KV se disponível
    if (cache) {
      await cache.set(cacheKey, result);
    }
    
    return json({
      success: true,
      data: result
    }, {
      headers: {
        'X-Cache-Status': fromCache ? 'HIT' : 'MISS',
        'X-Cache-Key': cacheKey.substring(0, 50) + '...',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro ao buscar produtos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
};