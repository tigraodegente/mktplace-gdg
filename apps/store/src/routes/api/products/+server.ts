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
    
    // Extrair tags temáticas
    const selectedThemeTags = url.searchParams.get('tema')?.split(',').filter(Boolean) || [];
    
    // Extrair filtros de dimensões
    const weightMin = url.searchParams.get('peso_min') ? Number(url.searchParams.get('peso_min')) : undefined;
    const weightMax = url.searchParams.get('peso_max') ? Number(url.searchParams.get('peso_max')) : undefined;
    const heightMin = url.searchParams.get('altura_min') ? Number(url.searchParams.get('altura_min')) : undefined;
    const heightMax = url.searchParams.get('altura_max') ? Number(url.searchParams.get('altura_max')) : undefined;
    const widthMin = url.searchParams.get('largura_min') ? Number(url.searchParams.get('largura_min')) : undefined;
    const widthMax = url.searchParams.get('largura_max') ? Number(url.searchParams.get('largura_max')) : undefined;
    const lengthMin = url.searchParams.get('comprimento_min') ? Number(url.searchParams.get('comprimento_min')) : undefined;
    const lengthMax = url.searchParams.get('comprimento_max') ? Number(url.searchParams.get('comprimento_max')) : undefined;
    
    // Extrair tempo de entrega
    const deliveryTime = url.searchParams.get('entrega') || '';
    
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
            SELECT 1 FROM product_categories pc
            JOIN categories c ON c.id = pc.category_id
            WHERE pc.product_id = p.id
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
        
        // Sistema de busca otimizado com Full-Text Search + Busca Inteligente
        if (searchQuery) {
          // Normalizar query para remover acentos
          const normalizedQuery = searchQuery
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9\s]/g, ' ') // Remove caracteres especiais
            .replace(/\s+/g, ' ')
            .trim();
          
          conditions.push(`(
            -- Full-Text Search otimizado
            to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) 
            @@ plainto_tsquery('portuguese', $${paramIndex})
            OR
            -- Busca normalizada sem acentos (funciona mesmo sem unaccent)
            LOWER(TRANSLATE(p.name, 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiioooooouuuuc')) 
            ILIKE LOWER(TRANSLATE($${paramIndex + 1}, 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiioooooouuuuc'))
            OR
            -- Busca variações comuns (berço/berco, bebê/bebe, etc)
            (p.name ILIKE $${paramIndex + 2} OR p.name ILIKE $${paramIndex + 3} OR p.name ILIKE $${paramIndex + 4})
            OR
            -- Busca em tags
            $${paramIndex + 5} = ANY(p.tags)
            OR
            -- Fallback ILIKE padrão
            (p.name ILIKE $${paramIndex + 6} OR p.description ILIKE $${paramIndex + 6})
          )`);
          
          // Gerar variações automáticas
          const searchWithC = searchQuery.replace(/berc/gi, 'berç').replace(/lenc/gi, 'lenç');
          const searchWithE = searchQuery.replace(/bebe/gi, 'bebê').replace(/tete/gi, 'tetê');
          const searchWithAo = searchQuery.replace(/cao/gi, 'ção').replace(/sao/gi, 'são');
          
          params.push(
            searchQuery,                    // Full-text search
            `%${normalizedQuery}%`,         // Busca normalizada
            `%${searchWithC}%`,             // Variação com ç
            `%${searchWithE}%`,             // Variação com acentos
            `%${searchWithAo}%`,            // Variação com ção
            searchQuery,                    // Tags
            `%${searchQuery}%`              // Fallback
          );
          paramIndex += 7;
        }
        
        // Adicionar filtros dinâmicos (attributes e specifications)
        for (const [optionSlug, values] of Object.entries(dynamicFilters)) {
          if (values.length > 0) {
            const valueConditions = values.map(() => 
              `(p.attributes::text LIKE $${paramIndex} OR p.specifications::text LIKE $${paramIndex})`
            );
            conditions.push(`(${valueConditions.join(' OR ')})`);
            
            for (const value of values) {
              params.push(`%${value}%`);
              paramIndex++;
            }
          }
        }
        
        // Filtros de tags temáticas
        if (selectedThemeTags.length > 0) {
          conditions.push(`p.tags && $${paramIndex}`);
          params.push(selectedThemeTags);
          paramIndex++;
        }
        
        // Filtros de dimensões
        if (weightMin !== undefined) {
          conditions.push(`p.weight >= $${paramIndex}`);
          params.push(weightMin);
          paramIndex++;
        }
        if (weightMax !== undefined) {
          conditions.push(`p.weight <= $${paramIndex}`);
          params.push(weightMax);
          paramIndex++;
        }
        if (heightMin !== undefined) {
          conditions.push(`p.height >= $${paramIndex}`);
          params.push(heightMin);
          paramIndex++;
        }
        if (heightMax !== undefined) {
          conditions.push(`p.height <= $${paramIndex}`);
          params.push(heightMax);
          paramIndex++;
        }
        if (widthMin !== undefined) {
          conditions.push(`p.width >= $${paramIndex}`);
          params.push(widthMin);
          paramIndex++;
        }
        if (widthMax !== undefined) {
          conditions.push(`p.width <= $${paramIndex}`);
          params.push(widthMax);
          paramIndex++;
        }
        if (lengthMin !== undefined) {
          conditions.push(`p.length >= $${paramIndex}`);
          params.push(lengthMin);
          paramIndex++;
        }
        if (lengthMax !== undefined) {
          conditions.push(`p.length <= $${paramIndex}`);
          params.push(lengthMax);
          paramIndex++;
        }
        
        // Filtro de tempo de entrega
        if (deliveryTime) {
          switch (deliveryTime) {
            case '24h':
              conditions.push(`p.delivery_days <= 1`);
              break;
            case '48h':
              conditions.push(`p.delivery_days <= 2`);
              break;
            case '3days':
              conditions.push(`p.delivery_days <= 3`);
              break;
            case '7days':
              conditions.push(`p.delivery_days <= 7`);
              break;
            case '15days':
              conditions.push(`p.delivery_days <= 15`);
              break;
          }
        }
        
        const whereClause = conditions.join(' AND ');
        
        // Ordenação com relevância de busca
        let orderBy = 'p.featured DESC, p.sales_count DESC NULLS LAST';
        let selectRelevance = '';
        
        if (searchQuery && sortBy === 'relevancia') {
          // Quando há busca, ordenar por relevância primeiro
          selectRelevance = `, 
            ts_rank(
              to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')), 
              plainto_tsquery('portuguese', '${searchQuery.replace(/'/g, "''")}')
            ) * 
            -- Boost para produtos em destaque e bem avaliados
            CASE 
              WHEN p.featured THEN 1.5 
              WHEN p.rating_average >= 4.5 THEN 1.2
              ELSE 1.0 
            END as search_rank`;
          orderBy = 'search_rank DESC, p.featured DESC, p.sales_count DESC NULLS LAST';
        }
        
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
          WITH unique_products AS (
            SELECT DISTINCT p.id
            FROM products p
            LEFT JOIN product_categories pc ON pc.product_id = p.id
            LEFT JOIN categories c ON c.id = pc.category_id
            WHERE ${whereClause}
          ),
          filtered_products AS (
            SELECT 
              p.id, p.name, p.slug, p.description, p.price, p.original_price,
              p.brand_id, p.seller_id, p.quantity, p.rating_average,
              p.rating_count, p.sales_count, p.tags, p.sku, p.featured,
              p.is_active, p.created_at, p.updated_at, p.weight${selectRelevance},
              -- Categoria (primeira encontrada)
              (SELECT c2.id FROM product_categories pc2 
               JOIN categories c2 ON c2.id = pc2.category_id 
               WHERE pc2.product_id = p.id LIMIT 1) as category_id,
              (SELECT c2.name FROM product_categories pc2 
               JOIN categories c2 ON c2.id = pc2.category_id 
               WHERE pc2.product_id = p.id LIMIT 1) as category_name,
              (SELECT c2.slug FROM product_categories pc2 
               JOIN categories c2 ON c2.id = pc2.category_id 
               WHERE pc2.product_id = p.id LIMIT 1) as category_slug,
              b.name as brand_name,
              b.slug as brand_slug,
              s.company_name as seller_name,
              COUNT(*) OVER() as total_count
            FROM products p
            INNER JOIN unique_products up ON up.id = p.id
            LEFT JOIN brands b ON b.id = p.brand_id
            LEFT JOIN sellers s ON s.id = p.seller_id
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
      
      // Buscar facets para filtros (com filtros contextuais)
      const facets = await getFacets(db, searchQuery, {
        categories,
        brands,
        priceMin,
        priceMax,
        hasDiscount,
        inStock,
        dynamicFilters
      });
      
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
async function getFacets(db: any, searchQuery: string, filters: any = {}) {
  console.log('🔍 getFacets - 🎯 FUNÇÃO INICIADA', { searchQuery, filters });
  try {
    console.log('🔍 getFacets - FILTROS FACETADOS DINÂMICOS:', filters);
    
    // Construir condições base que são aplicadas a TODOS os filtros EXCETO o que está sendo calculado
    const buildFilterConditions = (excludeFilter?: string) => {
      const conditions: string[] = ['p.is_active = true'];
      const params: any[] = [];
      let paramIndex = 1;
      
      // Estoque
      if (filters.inStock && excludeFilter !== 'stock') {
        conditions.push('p.quantity > 0');
      }
      
      // Busca textual otimizada (mesmo sistema da query principal)
      if (searchQuery && excludeFilter !== 'search') {
        conditions.push(`(
          to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) 
          @@ plainto_tsquery('portuguese', $${paramIndex})
          OR p.name % $${paramIndex + 1}
          OR $${paramIndex + 2} = ANY(p.tags)
          OR (p.name ILIKE $${paramIndex + 3} OR p.description ILIKE $${paramIndex + 3})
        )`);
        params.push(searchQuery, searchQuery, searchQuery, `%${searchQuery}%`);
        paramIndex += 4;
      }
      
      // Preço (excluir ao calcular range de preços)
      if (filters.priceMin !== undefined && excludeFilter !== 'price') {
        conditions.push(`p.price >= $${paramIndex}`);
        params.push(filters.priceMin);
        paramIndex++;
      }
      
      if (filters.priceMax !== undefined && excludeFilter !== 'price') {
        conditions.push(`p.price <= $${paramIndex}`);
        params.push(filters.priceMax);
        paramIndex++;
      }
      
      // Desconto (excluir ao calcular benefícios)
      if (filters.hasDiscount && excludeFilter !== 'benefits') {
        conditions.push('p.original_price > 0 AND p.original_price > p.price');
      }
      
      // Categorias (excluir ao calcular categorias)
      if (filters.categories?.length > 0 && excludeFilter !== 'categories') {
        conditions.push(`EXISTS (
          SELECT 1 FROM product_categories pc
          JOIN categories c ON c.id = pc.category_id
          WHERE pc.product_id = p.id
          AND c.slug = ANY($${paramIndex})
        )`);
        params.push(filters.categories);
        paramIndex++;
      }
      
      // Marcas (excluir ao calcular marcas) - CORRIGIDA para usar campo brand
      if (filters.brands?.length > 0 && excludeFilter !== 'brands') {
        // Converter slugs de marca de volta para nomes reais
        const brandSlugsArray = Array.isArray(filters.brands) ? filters.brands : [filters.brands];
        const brandNames = brandSlugsArray.map((slug: string) => 
          slug.replace(/-/g, ' ').replace(/\bc/g, 'ç') // Reverter transformação básica
        );
        
        conditions.push(`p.brand = ANY($${paramIndex})`);
        params.push(brandNames);
        paramIndex++;
      }
      
      // Condições (excluir ao calcular condições)
      if (filters.condition && excludeFilter !== 'conditions') {
        conditions.push(`p.condition = $${paramIndex}`);
        params.push(filters.condition);
        paramIndex++;
      }
      
      // Avaliações (excluir ao calcular avaliações)
      if (filters.rating && excludeFilter !== 'ratings') {
        conditions.push(`FLOOR(p.rating_average) >= $${paramIndex}`);
        params.push(filters.rating);
        paramIndex++;
      }
      
      // Filtros dinâmicos (excluir ao calcular filtros dinâmicos)
      if (filters.dynamicFilters && Object.keys(filters.dynamicFilters).length > 0 && excludeFilter !== 'dynamic') {
        for (const [optionSlug, values] of Object.entries(filters.dynamicFilters)) {
          if (Array.isArray(values) && values.length > 0) {
            // Procurar nos atributos E specifications por qualquer um dos valores
            const dynamicConditions = values.map(value => 
              `(p.attributes::text LIKE $${paramIndex} OR p.specifications::text LIKE $${paramIndex})`
            );
            conditions.push(`(${dynamicConditions.join(' OR ')})`);
            
            // Adicionar parâmetros para cada valor
            for (const value of values) {
              params.push(`%${value}%`);
              paramIndex++;
            }
          }
        }
      }
      
      // Tags temáticas (excluir ao calcular tags)
      if (filters.selectedThemeTags?.length > 0 && excludeFilter !== 'tags') {
        conditions.push(`p.tags && $${paramIndex}`);
        params.push(filters.selectedThemeTags);
        paramIndex++;
      }
      
      // Filtros de dimensões (excluir ao calcular dimensões)
      if (excludeFilter !== 'dimensions') {
        if (filters.weightMin !== undefined) {
          conditions.push(`p.weight >= $${paramIndex}`);
          params.push(filters.weightMin);
          paramIndex++;
        }
        if (filters.weightMax !== undefined) {
          conditions.push(`p.weight <= $${paramIndex}`);
          params.push(filters.weightMax);
          paramIndex++;
        }
        if (filters.heightMin !== undefined) {
          conditions.push(`p.height >= $${paramIndex}`);
          params.push(filters.heightMin);
          paramIndex++;
        }
        if (filters.heightMax !== undefined) {
          conditions.push(`p.height <= $${paramIndex}`);
          params.push(filters.heightMax);
          paramIndex++;
        }
        if (filters.widthMin !== undefined) {
          conditions.push(`p.width >= $${paramIndex}`);
          params.push(filters.widthMin);
          paramIndex++;
        }
        if (filters.widthMax !== undefined) {
          conditions.push(`p.width <= $${paramIndex}`);
          params.push(filters.widthMax);
          paramIndex++;
        }
        if (filters.lengthMin !== undefined) {
          conditions.push(`p.length >= $${paramIndex}`);
          params.push(filters.lengthMin);
          paramIndex++;
        }
        if (filters.lengthMax !== undefined) {
          conditions.push(`p.length <= $${paramIndex}`);
          params.push(filters.lengthMax);
          paramIndex++;
        }
      }
      
      // Tempo de entrega (excluir ao calcular delivery)
      if (filters.deliveryTime && excludeFilter !== 'delivery') {
        switch (filters.deliveryTime) {
          case '24h':
            conditions.push(`p.delivery_days <= 1`);
            break;
          case '48h':
            conditions.push(`p.delivery_days <= 2`);
            break;
          case '3days':
            conditions.push(`p.delivery_days <= 3`);
            break;
          case '7days':
            conditions.push(`p.delivery_days <= 7`);
            break;
          case '15days':
            conditions.push(`p.delivery_days <= 15`);
            break;
        }
      }
      
      return { 
        whereClause: conditions.join(' AND '), 
        params: params,
        paramCount: paramIndex 
      };
    };
    
    // 1. QUERY FACETADA: Range de preços (excluindo filtros de preço)
    let priceRange = { min: 7.26, max: 3882.24 };
    try {
      const priceConditions = buildFilterConditions('price');
      const priceQuery = `
        SELECT 
          COALESCE(MIN(p.price), 0) as min_price,
          COALESCE(MAX(p.price), 10000) as max_price,
          COUNT(*) as total_products
        FROM products p 
        WHERE ${priceConditions.whereClause}
      `;
      
      const priceResults = await db.query(priceQuery, ...priceConditions.params);
      console.log('🔍 getFacets - Query preços FACETADA resultado:', priceResults[0]);
      
      if (priceResults[0]) {
        priceRange = {
          min: Number(priceResults[0].min_price) || 0,
          max: Number(priceResults[0].max_price) || 10000
        };
      }
    } catch (priceError) {
      console.error('❌ getFacets - Erro preços facetados:', priceError);
    }
    
    // 2. QUERY FACETADA: Categorias (excluindo filtro de categoria) - COM FILTRO DE RELEVÂNCIA
    let categories = [];
    try {
      const categoryConditions = buildFilterConditions('categories');
      
      // Se há busca ativa ou outros filtros, mostrar apenas categorias relevantes
      const hasActiveFilters = searchQuery || 
                               filters.brands?.length > 0 || 
                               filters.categories?.length > 0 ||  // ✅ CORRIGIDO: Detectar filtros de categoria
                               filters.priceMin || 
                               filters.priceMax || 
                               filters.hasDiscount ||
                               Object.keys(filters.dynamicFilters || {}).length > 0;
      
      // ✅ QUERY UNIVERSAL SIMPLES
      const categoriesQuery = `
        SELECT 
          c.id, 
          c.name, 
          c.slug, 
          c.parent_id, 
          c.position,
          COUNT(DISTINCT p.id) as count
        FROM categories c
        LEFT JOIN product_categories pc ON pc.category_id = c.id
        LEFT JOIN products p ON p.id = pc.product_id
        WHERE c.is_active = true
        AND p.is_active = true
        GROUP BY c.id, c.name, c.slug, c.parent_id, c.position
        HAVING COUNT(DISTINCT p.id) >= 5
        ORDER BY count DESC, c.position, c.name
        LIMIT 50
      `;
      
      console.log('🔍 getFacets - Query categorias universal:', categoriesQuery);
      console.log('🔍 getFacets - Categorias selecionadas:', filters.categories);
      
      // ✅ Query simples sem parâmetros
      const categoryResults = await db.query(categoriesQuery);
      console.log('🔍 getFacets - Resultado bruto:', categoryResults.length, 'categorias');
      
      if (categoryResults.length > 0) {
        let allCategories = categoryResults.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: parseInt(cat.count),
          parent_id: cat.parent_id,
          subcategories: []
        }));
        
        // ✅ LÓGICA JAVASCRIPT: Filtrar baseado em categorias ativas
        if (filters.categories?.length > 0) {
          console.log('🔍 getFacets - Aplicando filtro de categorias JavaScript');
          
          // MARKETPLACE PATTERN: Buscar subcategorias ou categorias relacionadas
          const selectedSlugs = filters.categories;
          const selectedCategories = allCategories.filter((c: any) => selectedSlugs.includes(c.slug));
          
          // Buscar subcategorias das categorias selecionadas
          let subcategories: any[] = [];
          for (const selected of selectedCategories) {
            const subs = allCategories.filter((c: any) => c.parent_id === selected.id);
            subcategories.push(...subs);
          }
          
          if (subcategories.length > 0) {
            console.log('🔍 getFacets - Encontradas', subcategories.length, 'subcategorias');
            categories = subcategories.slice(0, 10);
          } else {
            // Se não há subcategorias, mostrar categorias relacionadas (top 8 excluindo selecionadas)
            console.log('🔍 getFacets - Sem subcategorias, mostrando categorias relacionadas');
            categories = allCategories
              .filter((c: any) => !selectedSlugs.includes(c.slug))
              .slice(0, 8);
          }
        } else {
          // Sem filtros: mostrar principais categorias
          categories = allCategories.slice(0, 20);
        }
      }
      
      console.log('🔍 getFacets - Categorias processadas:', categories.length, categories);
    } catch (catError) {
      console.error('❌ getFacets - Erro categorias facetadas:', catError);
    }
    
    // 3. QUERY FACETADA: Marcas (excluindo filtro de marca) - CORRIGIDA para usar campo brand
    let brands = [];
    try {
      const brandConditions = buildFilterConditions('brands');
      const brandsQuery = `
        SELECT 
          p.brand as name,
          LOWER(REPLACE(REPLACE(p.brand, ' ', '-'), 'ç', 'c')) as slug,
          p.brand as id,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.brand IS NOT NULL 
        AND p.brand != '' 
        AND (${brandConditions.whereClause})
        GROUP BY p.brand
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, p.brand ASC
        LIMIT 50
      `;
      
      const brandResults = await db.query(brandsQuery, ...brandConditions.params);
      console.log('🔍 getFacets - Query marcas FACETADA CORRIGIDA resultado:', brandResults.length, brandResults.slice(0, 5));
      
      if (brandResults.length > 0) {
        brands = brandResults.map((brand: any) => ({
          id: brand.slug,
          name: brand.name,
          slug: brand.slug,
          count: parseInt(brand.count)
        }));
      }
    } catch (brandError) {
      console.error('❌ getFacets - Erro marcas facetadas:', brandError);
    }
    
    // SEM FALLBACK - mostrar apenas marcas reais (se não há marcas reais, array vazio)
    
    // 4. QUERY REAL: Avaliações por faixa
    let ratings = [];
    try {
      const ratingsQuery = `
        SELECT 
          FLOOR(p.rating_average)::int as rating,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.rating_average IS NOT NULL AND p.is_active = true
        GROUP BY FLOOR(p.rating_average)
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY rating DESC
      `;
      
      const ratingResults = await db.query(ratingsQuery);
      console.log('🔍 getFacets - Query avaliações resultado:', ratingResults.length);
      
      if (ratingResults.length > 0) {
        ratings = ratingResults.map((rating: any) => ({
          value: parseInt(rating.rating),
          count: parseInt(rating.count)
        }));
      }
    } catch (ratingError) {
      console.error('❌ getFacets - Erro avaliações:', ratingError);
    }
    
    // SEM FALLBACK - mostrar apenas avaliações reais
    
    // 5. QUERY REAL: Condições do produto
    let conditions = [];
    try {
      const conditionFilters = buildFilterConditions('conditions');
      const conditionsQuery = `
        SELECT 
          p.condition,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.condition IS NOT NULL AND (${conditionFilters.whereClause})
        GROUP BY p.condition
        HAVING COUNT(DISTINCT p.id) > 0
      `;
      
      const conditionResults = await db.query(conditionsQuery, ...conditionFilters.params);
      console.log('🔍 getFacets - Query condições resultado:', conditionResults.length);
      
      if (conditionResults.length > 0) {
        conditions = conditionResults.map((condition: any) => ({
          value: condition.condition,
          label: condition.condition === 'new' ? 'Novo' : 
                 condition.condition === 'used' ? 'Usado' : 
                 condition.condition === 'refurbished' ? 'Recondicionado' : 
                 condition.condition,
          count: parseInt(condition.count)
        }));
      }
    } catch (conditionError) {
      console.error('❌ getFacets - Erro condições:', conditionError);
    }
    
    // SEM FALLBACK - mostrar apenas condições reais
    
    // 6. QUERY REAL: Vendedores
    let sellers = [];
    try {
      const sellerFilters = buildFilterConditions('sellers');
      const sellersQuery = `
        SELECT 
          s.id, 
          s.company_name as name, 
          LOWER(REPLACE(s.company_name, ' ', '-')) as slug,
          s.rating_average,
          COUNT(DISTINCT p.id) as count
        FROM sellers s
        INNER JOIN products p ON p.seller_id = s.id
        WHERE s.is_active = true AND (${sellerFilters.whereClause})
        GROUP BY s.id, s.company_name, s.rating_average
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC
        LIMIT 20
      `;
      
      const sellerResults = await db.query(sellersQuery, ...sellerFilters.params);
      console.log('🔍 getFacets - Query vendedores resultado:', sellerResults.length);
      
      if (sellerResults.length > 0) {
        sellers = sellerResults.map((seller: any) => ({
          id: seller.id,
          name: seller.name,
          slug: seller.slug,
          rating: seller.rating_average ? Number(seller.rating_average) : null,
          count: parseInt(seller.count)
        }));
      }
    } catch (sellerError) {
      console.error('❌ getFacets - Erro vendedores:', sellerError);
    }
    
    // 6.1. QUERY REAL: Tempo de Entrega - DESABILITADA POR ENQUANTO
    let deliveryTimes: any[] = [];
    console.log('🔍 getFacets - Query tempo entrega: DESABILITADA para evitar erros SQL');
    
    // SEM FALLBACK - mostrar apenas vendedores reais
    
    // 7. QUERY REAL: Tags populares
    let tags = [];
    try {
      const tagFilters = buildFilterConditions('tags');
      const tagsQuery = `
        SELECT 
          tag,
          COUNT(*) as count
        FROM (
          SELECT unnest(p.tags) as tag
          FROM products p
          WHERE p.tags IS NOT NULL AND (${tagFilters.whereClause})
        ) t
        GROUP BY tag
        HAVING COUNT(*) > 0
        ORDER BY count DESC
        LIMIT 30
      `;
      
      const tagResults = await db.query(tagsQuery, ...tagFilters.params);
      console.log('🔍 getFacets - Query tags resultado:', tagResults.length);
      
      if (tagResults.length > 0) {
        tags = tagResults.map((tag: any) => ({
          id: tag.tag,
          name: tag.tag,
          count: parseInt(tag.count)
        }));
      }
    } catch (tagError) {
      console.error('❌ getFacets - Erro tags:', tagError);
    }
    
    // SEM FALLBACK - mostrar apenas tags reais
    
    // 7.1. QUERY REAL: Tags Temáticas (15 principais) 
    let themeTags = [];
    try {
      const themeFilters = buildFilterConditions('tags');
      const themeTagsQuery = `
        SELECT 
          tag as name,
          LOWER(REPLACE(REPLACE(tag, ' ', '-'), ',', '')) as slug,
          COUNT(*) as count
        FROM (
          SELECT unnest(p.tags) as tag
          FROM products p
          WHERE (${themeFilters.whereClause})
          AND p.tags IS NOT NULL
        ) t
        WHERE tag NOT LIKE 'sync-%'
          AND tag != 'sem-estoque'
          AND tag != 'entrega-rapida'
          AND LENGTH(tag) > 3
        GROUP BY tag
        HAVING COUNT(*) >= 30
        ORDER BY COUNT(*) DESC, tag
        LIMIT 20
      `;
      
      const themeResults = await db.query(themeTagsQuery, ...themeFilters.params);
      console.log('🔍 getFacets - Query tags temáticas resultado:', themeResults.length);
      
      if (themeResults.length > 0) {
        themeTags = themeResults.map((tag: any) => ({
          id: tag.slug,
          name: tag.name,
          slug: tag.slug,
          count: parseInt(tag.count)
        }));
      }
    } catch (themeError) {
      console.error('❌ getFacets - Erro tags temáticas:', themeError);
    }
    
    // 7.2. QUERY REAL: Dimensões Físicas
    let dimensionRanges: Record<string, any> = {};
    try {
      const dimensionFilters = buildFilterConditions('dimensions');
      const dimensionsQuery = `
        SELECT 
          'weight' as dimension_type,
          COALESCE(MIN(weight), 0) as min_value,
          COALESCE(MAX(weight), 100) as max_value,
          COUNT(CASE WHEN weight IS NOT NULL THEN 1 END) as count,
          'kg' as unit
        FROM products p 
        WHERE (${dimensionFilters.whereClause})
        AND weight IS NOT NULL
        UNION ALL
        SELECT 
          'height' as dimension_type,
          COALESCE(MIN(height), 0) as min_value,
          COALESCE(MAX(height), 200) as max_value,
          COUNT(CASE WHEN height IS NOT NULL THEN 1 END) as count,
          'cm' as unit
        FROM products p 
        WHERE (${dimensionFilters.whereClause})
        AND height IS NOT NULL
        UNION ALL
        SELECT 
          'width' as dimension_type,
          COALESCE(MIN(width), 0) as min_value,
          COALESCE(MAX(width), 200) as max_value,
          COUNT(CASE WHEN width IS NOT NULL THEN 1 END) as count,
          'cm' as unit
        FROM products p 
        WHERE (${dimensionFilters.whereClause})
        AND width IS NOT NULL
        UNION ALL
        SELECT 
          'length' as dimension_type,
          COALESCE(MIN(length), 0) as min_value,
          COALESCE(MAX(length), 200) as max_value,
          COUNT(CASE WHEN length IS NOT NULL THEN 1 END) as count,
          'cm' as unit
        FROM products p 
        WHERE (${dimensionFilters.whereClause})
        AND length IS NOT NULL
        ORDER BY dimension_type
      `;
      
      const dimensionResults = await db.query(dimensionsQuery, ...dimensionFilters.params);
      console.log('🔍 getFacets - Query dimensões resultado:', dimensionResults.length);
      
      for (const dim of dimensionResults) {
        if (parseInt(dim.count) > 0) {
          dimensionRanges[dim.dimension_type] = {
            min: Number(dim.min_value),
            max: Number(dim.max_value),
            count: parseInt(dim.count),
            unit: dim.unit
          };
        }
      }
    } catch (dimensionError) {
      console.error('❌ getFacets - Erro dimensões:', dimensionError);
    }
    
    // 8. QUERY REAL: Benefícios
    let benefits = { discount: 0, freeShipping: 0, outOfStock: 0 };
    try {
      const benefitFilters = buildFilterConditions('benefits');
      const benefitsQuery = `
        SELECT 
          COUNT(CASE WHEN p.original_price > 0 AND p.price < p.original_price THEN 1 END) as discount_count,
          COUNT(CASE WHEN p.has_free_shipping = true THEN 1 END) as free_shipping_count,
          COUNT(CASE WHEN p.quantity = 0 THEN 1 END) as out_of_stock_count
        FROM products p
        WHERE (${benefitFilters.whereClause})
      `;
      
      const benefitResults = await db.query(benefitsQuery, ...benefitFilters.params);
      console.log('🔍 getFacets - Query benefícios resultado:', benefitResults[0]);
      
      if (benefitResults[0]) {
        benefits = {
          discount: parseInt(benefitResults[0].discount_count) || 0,
          freeShipping: parseInt(benefitResults[0].free_shipping_count) || 0,
          outOfStock: parseInt(benefitResults[0].out_of_stock_count) || 0
        };
      }
    } catch (benefitError) {
      console.error('❌ getFacets - Erro benefícios:', benefitError);
    }
    
    // SEM FALLBACK - usar apenas contadores reais (podem ser 0)
    
    // 9. QUERY REAL: Tempo de entrega
    let deliveryOptions = [
      { value: '24h', label: 'Entrega em 24h', count: 0 },
      { value: '48h', label: 'Até 2 dias', count: 0 },
      { value: '3days', label: 'Até 3 dias úteis', count: 0 },
      { value: '7days', label: 'Até 7 dias úteis', count: 0 },
      { value: '15days', label: 'Até 15 dias', count: 0 }
    ];
    
    try {
      const deliveryFilters = buildFilterConditions('delivery');
      const deliveryQuery = `
        SELECT 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            ELSE '15days'
          END as delivery_time,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.delivery_days IS NOT NULL AND (${deliveryFilters.whereClause})
        GROUP BY 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            ELSE '15days'
          END
        HAVING COUNT(DISTINCT p.id) > 0
      `;
      
      const deliveryResults = await db.query(deliveryQuery, ...deliveryFilters.params);
      console.log('🔍 getFacets - Query entrega resultado:', deliveryResults.length);
      
      // Preencher contagens reais
      for (const delivery of deliveryResults) {
        const option = deliveryOptions.find(d => d.value === delivery.delivery_time);
        if (option) {
          option.count = parseInt(delivery.count);
        }
      }
    } catch (deliveryError) {
      console.error('❌ getFacets - Erro entrega:', deliveryError);
    }
    
    // SEM FALLBACK - usar apenas contadores reais (podem ser 0)
    
    // 10. FILTROS DINÂMICOS SIMPLIFICADOS - VERSÃO QUE FUNCIONA
    let dynamicOptions = [];
    
    console.log('🔍 getFacets - 🚀 INICIANDO FILTROS DINÂMICOS SIMPLIFICADOS');
    
    try {
      // FILTROS DINÂMICOS SIMPLES - Buscar dados e processar em JavaScript
      const attributesQuery = `
        SELECT 
          p.id,
          p.attributes
        FROM products p
        WHERE p.is_active = true
        AND p.attributes IS NOT NULL 
        AND p.attributes != '{}' 
        AND p.attributes != 'null'
        AND p.attributes::text != 'null'
        AND LENGTH(p.attributes::text) > 10
      `;
      
      console.log('🔍 getFacets - ⚡ Buscando produtos com atributos...');
      const results = await db.query(attributesQuery);
      console.log('🔍 getFacets - ✅ Produtos encontrados:', results.length);
      
      // Processar atributos em JavaScript
      const attributeCountMap = new Map();
      const targetAttributes = ['Cor', 'Material', 'Tamanho', 'Tema', 'Gênero', 'Faixa Etária'];
      
      for (const product of results) {
        try {
          let attributesData;
          
          // Converter string JSON para objeto
          if (typeof product.attributes === 'string') {
            attributesData = JSON.parse(product.attributes);
          } else {
            attributesData = product.attributes;
          }
          
          // Processar cada atributo
          for (const [attrName, attrValues] of Object.entries(attributesData)) {
            if (targetAttributes.includes(attrName) && Array.isArray(attrValues)) {
              for (const value of attrValues) {
                if (value && typeof value === 'string' && value.trim().length > 0) {
                  const key = `${attrName}:${value}`;
                  attributeCountMap.set(key, (attributeCountMap.get(key) || 0) + 1);
                }
              }
            }
          }
        } catch (error) {
          // Ignorar produtos com atributos inválidos
          continue;
        }
      }
      
      // Converter para formato de filtros dinâmicos
      const dynamicOptionsMap = new Map();
      
      for (const [key, count] of attributeCountMap) {
        const [attrName, value] = key.split(':');
        const slug = attrName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        if (!dynamicOptionsMap.has(attrName)) {
          dynamicOptionsMap.set(attrName, {
            name: attrName,
            slug: slug,
            values: []
          });
        }
        
        dynamicOptionsMap.get(attrName).values.push({
          value: value,
          count: count
        });
      }
      
             // Ordenar valores por contagem
       for (const option of dynamicOptionsMap.values()) {
         option.values.sort((a: any, b: any) => b.count - a.count);
       }
      
      dynamicOptions = Array.from(dynamicOptionsMap.values());
      console.log('🔍 getFacets - 🎉 FILTROS DINÂMICOS CRIADOS:', dynamicOptions.length);
      
    } catch (dynamicError) {
      console.error('❌ getFacets - Erro filtros dinâmicos simplificados:', dynamicError);
      dynamicOptions = []; // Fallback para array vazio
    }
    
    // SEM FALLBACK - mostrar apenas filtros dinâmicos reais (se não há, array vazio)
    
    console.log('🔍 getFacets - DADOS REAIS ENCONTRADOS:', {
      categories: categories.length,
      brands: brands.length,
      priceRange,
      ratings: ratings.length,
      conditions: conditions.length,
      sellers: sellers.length,
      tags: tags.length,
      themeTags: themeTags.length,
      dimensionRanges: Object.keys(dimensionRanges).length,
      deliveryTimes: deliveryTimes.length,
      dynamicOptions: dynamicOptions.length,
      benefits,
      deliveryOptions: deliveryOptions.filter(d => d.count > 0).length
    });
    
    return {
      categories,
      brands,
      tags,
      themeTags,
      dimensionRanges,
      deliveryTimes,
      priceRange,
      ratings,
      conditions,
      deliveryOptions,
      sellers,
      benefits,
      dynamicOptions
    };
    
  } catch (error) {
    console.error('❌ getFacets - Erro geral:', error);
    logger.warn('Failed to fetch facets, using defaults', { error });
    return {
      categories: [],
      brands: [],
      tags: [],
      priceRange: { min: 0, max: 10000 },
      ratings: [],
      conditions: [],
      deliveryOptions: [],
      sellers: [],
      benefits: { discount: 0, freeShipping: 0, outOfStock: 0 },
      dynamicOptions: []
    };
  }
} 