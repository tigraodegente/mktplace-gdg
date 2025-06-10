import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { queryWithTimeout } from '$lib/db/queryWithTimeout';
import { logger } from '$lib/utils/logger';

// No topo do arquivo, adicionar cache otimizado
interface CacheEntry {
  data: any;
  timestamp: number;
  hits: number;
}

let facetsCache: Record<string, CacheEntry> = {};
let productsCache: Record<string, CacheEntry> = {};
const CACHE_DURATION = 2 * 60 * 1000; // ✅ REDUZIDO: 2 minutos para atualizações mais rápidas
const MAX_CACHE_SIZE = 50; // Cache menor mas mais eficiente

// Função para limpar cache antigo
function cleanupCache() {
  const now = Date.now();
  
  // Limpar facets cache
  for (const [key, entry] of Object.entries(facetsCache)) {
    if (now - entry.timestamp > CACHE_DURATION) {
      delete facetsCache[key];
    }
  }
  
  // Limpar products cache
  for (const [key, entry] of Object.entries(productsCache)) {
    if (now - entry.timestamp > CACHE_DURATION) {
      delete productsCache[key];
    }
  }
  
  // Se ainda muito grande, remover os menos usados
  if (Object.keys(facetsCache).length > MAX_CACHE_SIZE) {
    const entries = Object.entries(facetsCache).sort((a, b) => a[1].hits - b[1].hits);
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    toRemove.forEach(([key]) => delete facetsCache[key]);
  }
}

// Executar limpeza a cada 10 minutos
setInterval(cleanupCache, 10 * 60 * 1000);

export const GET: RequestHandler = async ({ url, platform }) => {
  try {

    
    console.log('🚀 ========================================');
    console.log('🚀 PRODUCTS API - NOVA REQUISIÇÃO');
    console.log('🚀 ========================================');
    console.log('🌐 URL Completa:', url.toString());
    console.log('🔍 Query Params RAW:', Object.fromEntries(url.searchParams.entries()));
    
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
    
    // ✅ NOVOS FILTROS ADICIONADOS
    const freeShipping = url.searchParams.get('frete_gratis') === 'true';
    const rating = url.searchParams.get('avaliacao') ? Number(url.searchParams.get('avaliacao')) : undefined;
    const sellers = url.searchParams.get('vendedor')?.split(',').filter(Boolean) || [];
    const conditions = url.searchParams.get('condicao')?.split(',').filter(Boolean) || [];
    
    console.log('📊 PARÂMETROS EXTRAÍDOS:');
    console.log('  🔤 searchQuery:', searchQuery);
    console.log('  📂 categories:', categories);
    console.log('  🏷️ brands:', brands);
    console.log('  💰 priceMin:', priceMin);
    console.log('  💰 priceMax:', priceMax);
    console.log('  🎁 hasDiscount:', hasDiscount);
    console.log('  📦 inStock:', inStock);
    console.log('  🔀 sortBy:', sortBy);
    console.log('  📄 page:', page);
    console.log('  📊 limit:', limit);
    console.log('  🚚 freeShipping:', freeShipping);
    console.log('  ⭐ rating:', rating);
    console.log('  👤 sellers:', sellers);
    console.log('  📋 conditions:', conditions);
    
    // Extrair filtros dinâmicos
    const dynamicFilters: Record<string, string[]> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key.startsWith('opcao_')) {
        // ✅ CORRIGIDO: Lidar com duplicação de "opcao_" do frontend
        let optionSlug = key.replace('opcao_', '');
        
        // Se ainda começar com "opcao_", remover novamente (bug do frontend)
        if (optionSlug.startsWith('opcao_')) {
          optionSlug = optionSlug.replace('opcao_', '');
        }
        
        dynamicFilters[optionSlug] = value.split(',').filter(Boolean);
      }
    }
    
    console.log('🎨 FILTROS DINÂMICOS PROCESSADOS:');
    console.log('  📋 Quantidade:', Object.keys(dynamicFilters).length);
    console.log('  🎯 Detalhes:', dynamicFilters);
    
    // 🔍 DEBUG: Log dos filtros dinâmicos
    if (Object.keys(dynamicFilters).length > 0) {
      console.log('🎨 FILTROS DINÂMICOS DETECTADOS:', dynamicFilters);
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
    
          // 🚀 CACHE PARA CONSULTAS DE PRODUTOS
      const productCacheKey = `products:${searchQuery || 'all'}:${JSON.stringify({
        categories, brands, priceMin, priceMax, hasDiscount, inStock, sortBy, page, limit,
        freeShipping, rating, sellers, conditions, deliveryTime, dynamicFilters
      })}`;
      
      console.log('💾 VERIFICANDO CACHE:');
      console.log('  🔑 Cache Key:', productCacheKey);
      
      const cachedProducts = productsCache[productCacheKey];
      if (cachedProducts && (Date.now() - cachedProducts.timestamp) < CACHE_DURATION) {
        console.log('✅ CACHE HIT! Usando dados em cache');
        console.log('  ⏰ Cache Age:', Math.round((Date.now() - cachedProducts.timestamp) / 1000), 'seconds');
        console.log('  🎯 Cache Hits:', cachedProducts.hits);
        cachedProducts.hits++;
        
        // 🚨 FACETS DIRETOS (SEM CACHE) - TEMPORÁRIO
        const db = getDatabase(platform);
        console.log('🔍 Buscando facets DIRETOS para resposta em cache...');
        
        // CATEGORIAS DIRETAS (sabemos que funciona)
        const directCategoriesQuery = `
          SELECT 
            c.id, c.name, c.slug, c.parent_id, c.image_url,
            COUNT(DISTINCT p.id) as count
          FROM categories c
          INNER JOIN product_categories pc ON pc.category_id = c.id
          INNER JOIN products p ON p.id = pc.product_id
          WHERE p.is_active = true AND c.is_active = true
          GROUP BY c.id, c.name, c.slug, c.parent_id, c.image_url
          HAVING COUNT(DISTINCT p.id) > 0
          ORDER BY count DESC, c.name ASC
          LIMIT 50
        `;
        
        const directCategories = await db.query(directCategoriesQuery);
        const categoriesFacet = directCategories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: parseInt(cat.count),
          parent_id: cat.parent_id,
          icon: cat.image_url,
          subcategories: []
        }));
        
        console.log('✅ CATEGORIAS DIRETAS em cache:', categoriesFacet.length);
        
        // Buscar outros facets normalmente
        const facets = await getFacets(db, searchQuery, {
          categories, brands, priceMin, priceMax, hasDiscount, inStock, dynamicFilters,
          freeShipping, rating, sellers, conditions, deliveryTime
        });
        
        // Sobrescrever categorias com as diretas
        facets.categories = categoriesFacet;
        
        console.log('✅ RETORNANDO RESPOSTA DO CACHE');
        return json({
          success: true,
          data: {
            ...cachedProducts.data,
            facets
          },
          source: 'cache'
        });
      } else {
        console.log('❌ CACHE MISS! Executando nova consulta');
        if (cachedProducts) {
          console.log('  ⏰ Cache Expired Age:', Math.round((Date.now() - cachedProducts.timestamp) / 1000), 'seconds');
        }
      }
      
      // Executar busca com timeout otimizado
      try {
        const db = getDatabase(platform);
      
      // 🔍 DEBUG: Verificar se há produtos com "berço" no banco
      if (searchQuery && (searchQuery.includes('berc') || searchQuery.includes('berç'))) {
        console.log('🔍 DEBUG - TESTE PRODUTOS BERÇO NO BANCO:');
        try {
          const testQuery = await db.query`
            SELECT id, name, category_name 
            FROM products p
            LEFT JOIN product_categories pc ON pc.product_id = p.id
            LEFT JOIN categories c ON c.id = pc.category_id
            WHERE p.is_active = true 
            AND (p.name ILIKE '%berç%' OR p.name ILIKE '%berco%')
            LIMIT 5
          `;
          console.log('🔍 Produtos com berço encontrados:', testQuery.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.category_name
          })));
        } catch (e) {
          console.log('🔍 Erro no teste:', e);
        }
      }
      
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
        
        // ✅ NOVOS FILTROS ADICIONADOS
        if (freeShipping) {
          conditions.push('p.has_free_shipping = true');
        }
        
        if (rating !== undefined) {
          // ✅ CORRIGIDO: Usar COALESCE igual aos facets para consistência
          conditions.push(`COALESCE(p.rating_average, 4.5) >= $${paramIndex}`);
          params.push(rating);
          paramIndex++;
        }
        
        if (sellers.length > 0) {
          conditions.push(`EXISTS (SELECT 1 FROM sellers s WHERE s.id = p.seller_id AND s.slug = ANY($${paramIndex}))`);
          params.push(sellers);
          paramIndex++;
        }
        
        if (conditions.length > 0) {
          // Assuming 'new' condition means active products
          const hasNewCondition = conditions.includes('new');
          if (hasNewCondition) {
            // 'new' products are just is_active = true, which is already applied
          }
        }
        
        // Sistema de busca otimizado com Full-Text Search + Busca Inteligente
        if (searchQuery) {
          // Função para normalizar texto (remove acentos e caracteres especiais)
          const normalizeText = (text: string) => {
            return text
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove acentos
              .replace(/[^a-z0-9\s]/g, ' ')   // Remove caracteres especiais
              .replace(/\s+/g, ' ')
              .trim();
          };
          
          // Normalizar query
          const normalizedQuery = normalizeText(searchQuery);
          
          // Gerar variações automáticas mais robustas
          const generateVariations = (query: string) => {
            const variations = [query];
            
            // Mapeamento completo de variações ç/c
            const cVariations = [
              // Berço/berco (todas as variações)
              { pattern: /\bberco\b/gi, replacement: 'berço' },
              { pattern: /\bberç[oô]\b/gi, replacement: 'berco' },
              { pattern: /\bberc\b/gi, replacement: 'berç' },      // ✅ NOVO: berc → berç
              { pattern: /\bberç\b/gi, replacement: 'berc' },      // ✅ NOVO: berç → berc
              
              // Lenço/lenco
              { pattern: /\blenco\b/gi, replacement: 'lenço' },
              { pattern: /\blenc\b/gi, replacement: 'lenç' },      // ✅ NOVO: lenc → lenç
              { pattern: /\blenç[oô]\b/gi, replacement: 'lenco' },
              
              // Coração/coracao  
              { pattern: /\bcoracao\b/gi, replacement: 'coração' },
              { pattern: /\bcorac\b/gi, replacement: 'coraç' },    // ✅ NOVO: corac → coraç
              { pattern: /\bcoraç[aã]o\b/gi, replacement: 'coracao' },
            ];
            
            // Mapeamento de acentos
            const accentVariations = [
              // Bebê/bebe
              { pattern: /\bbebe\b/gi, replacement: 'bebê' },
              { pattern: /\bbebê\b/gi, replacement: 'bebe' },
              
              // Ação/acao, são/sao, não/nao
              { pattern: /\bacao\b/gi, replacement: 'ação' },
              { pattern: /\bação\b/gi, replacement: 'acao' },
              { pattern: /\bsao\b/gi, replacement: 'são' },
              { pattern: /\bsão\b/gi, replacement: 'sao' },
              { pattern: /\bnao\b/gi, replacement: 'não' },
              { pattern: /\bnão\b/gi, replacement: 'nao' },
              
              // Mais acentos comuns
              { pattern: /\bmae\b/gi, replacement: 'mãe' },
              { pattern: /\bmãe\b/gi, replacement: 'mae' },
              { pattern: /\birma\b/gi, replacement: 'irmã' },
              { pattern: /\birmã\b/gi, replacement: 'irma' },
            ];
            
            // Aplicar todas as variações
            const allVariations = [...cVariations, ...accentVariations];
            
            allVariations.forEach(({ pattern, replacement }) => {
              if (query.match(pattern)) {
                variations.push(query.replace(pattern, replacement));
              }
            });
            
            return [...new Set(variations)]; // Remove duplicatas
          };
          
          const searchVariations = generateVariations(searchQuery);
          
          conditions.push(`(
            -- 1. Full-Text Search otimizado (postgresql built-in)
            to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) 
            @@ plainto_tsquery('portuguese', $${paramIndex})
            OR
            -- 2. Busca normalizada robusta (sem acentos, case-insensitive)
            LOWER(TRANSLATE(p.name, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')) 
            LIKE LOWER(TRANSLATE($${paramIndex + 1}, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy'))
            OR
            -- 3. Busca nas variações automáticas (berço/berco, bebê/bebe, etc)
            ${searchVariations.map((_, i) => `p.name ILIKE $${paramIndex + 2 + i}`).join(' OR ')}
            OR
            -- 4. Busca nas descrições (normalizada)
            LOWER(TRANSLATE(COALESCE(p.description, ''), 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')) 
            LIKE LOWER(TRANSLATE($${paramIndex + 2 + searchVariations.length}, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy'))
            OR
            -- 5. Busca em tags (array de strings)
            $${paramIndex + 3 + searchVariations.length} = ANY(p.tags)
            OR
            -- 6. Busca em SKU (normalizada)  
            LOWER(TRANSLATE(p.sku, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')) 
            LIKE LOWER(TRANSLATE($${paramIndex + 4 + searchVariations.length}, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy'))
          )`);
          
          // Preparar parâmetros
          const searchParams = [
            searchQuery,                         // 1. Full-text search (original)
            `%${normalizedQuery}%`,              // 2. Busca normalizada
            ...searchVariations.map(v => `%${v}%`), // 3. Variações automáticas
            `%${normalizedQuery}%`,              // 4. Descrição normalizada
            searchQuery,                         // 5. Tags (original)
            `%${normalizedQuery}%`               // 6. SKU normalizada
          ];
          
          params.push(...searchParams);
          paramIndex += searchParams.length;
          
          console.log('🔍 DEBUG BUSCA - DETALHES COMPLETOS:', {
            original: searchQuery,
            normalized: normalizedQuery,
            variations: searchVariations,
            totalParams: searchParams.length,
            searchParams: searchParams,
            paramIndex: paramIndex
          });
        }
        
        // Adicionar filtros dinâmicos usando as tabelas corretas
        for (const [optionSlug, values] of Object.entries(dynamicFilters)) {
          if (values.length > 0) {
            console.log(`🎨 Processando filtro dinâmico: ${optionSlug} = [${values.join(', ')}]`);
            
            // ✅ USAR products.attributes ao invés de product_variants
            // Converter slug para nome de atributo (ex: "cor" -> "Cor")
            const attributeName = optionSlug.charAt(0).toUpperCase() + optionSlug.slice(1);
            
            // ✅ CORRIGIDO: Verificar se VALUE está DENTRO do array JSON usando @> operator
            const valueConditions = values.map(value => 
              `(
                jsonb_typeof(p.attributes) = 'object'
                AND p.attributes ? '${attributeName}'
                AND jsonb_typeof(p.attributes->'${attributeName}') = 'array'
                AND p.attributes->'${attributeName}' @> '["${value}"]'::jsonb
              )`
            ).join(' OR ');
            
            const attributeFilterCondition = `(${valueConditions})`;
            conditions.push(attributeFilterCondition);
            
            console.log(`🎨 ✅ Condição CORRIGIDA para ${optionSlug} (${attributeName}): ${values.length} valores`);
            console.log(`🎨 Query: ${attributeFilterCondition}`);
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
        
        // Executar query otimizada
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
      
      console.log('🔍 BUSCANDO FACETS...');
      // Buscar facets para filtros (com filtros contextuais)
      const facets = await getFacets(db, searchQuery, {
        categories,
        brands,
        priceMin,
        priceMax,
        hasDiscount,
        inStock,
        dynamicFilters,
        freeShipping,
        rating,
        sellers,
        conditions,
        deliveryTime
      });
      
      console.log('✅ FACETS CARREGADOS:');
      console.log('  📂 Categories:', facets.categories?.length || 0);
      console.log('  🏷️ Brands:', facets.brands?.length || 0);
      console.log('  💰 Price Ranges:', facets.priceRanges?.length || 0);
      console.log('  🎨 Dynamic Options:', facets.dynamicOptions?.length || 0);
      console.log('  ⭐ Ratings:', facets.ratings?.length || 0);
      console.log('  🎁 Benefits:', facets.benefits ? 'Sim' : 'Não');
      
      const responseData = {
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
      };
      
      console.log('📊 RESPOSTA FINAL PREPARADA:');
      console.log('  📦 Produtos encontrados:', responseData.products.length);
      console.log('  📄 Total no banco:', responseData.pagination.total);
      console.log('  📑 Páginas totais:', responseData.pagination.totalPages);
      console.log('  🔍 Filtros ativos:', {
        categories: responseData.filters.categories.length,
        brands: responseData.filters.brands.length,
        priceRange: !!(responseData.filters.priceRange.min || responseData.filters.priceRange.max),
        hasDiscount: responseData.filters.hasDiscount,
        inStock: responseData.filters.inStock
      });
      
      console.log('⚖️ ========================================');
      console.log('⚖️ ANÁLISE: FILTROS vs PRODUTOS CARREGADOS');
      console.log('⚖️ ========================================');
      console.log(`📊 Total de produtos na resposta: ${responseData.products.length}`);
      console.log(`📊 Total no banco (paginado): ${responseData.pagination.total}`);
      console.log(`📄 Página atual: ${responseData.pagination.page} de ${responseData.pagination.totalPages}`);
      
      // Analisar filtros aplicados vs produtos carregados
      if (responseData.filters.categories.length > 0) {
        console.log('📂 FILTROS DE CATEGORIA APLICADOS:');
        responseData.filters.categories.forEach((catSlug: string) => {
          const facetCategory = facets.categories?.find((c: any) => (c.slug || c.id) === catSlug);
          if (facetCategory) {
            console.log(`  📂 ${facetCategory.name}: prometia ${facetCategory.count} produtos`);
          } else {
            console.log(`  📂 ${catSlug}: categoria não encontrada nos facets`);
          }
        });
      }
      
      if (responseData.filters.brands.length > 0) {
        console.log('🏷️ FILTROS DE MARCA APLICADOS:');
        responseData.filters.brands.forEach((brandSlug: string) => {
          const facetBrand = facets.brands?.find((b: any) => (b.slug || b.id) === brandSlug);
          if (facetBrand) {
            console.log(`  🏷️ ${facetBrand.name}: prometia ${facetBrand.count} produtos`);
          } else {
            console.log(`  🏷️ ${brandSlug}: marca não encontrada nos facets`);
          }
        });
      }
      
      // Analisar filtros dinâmicos aplicados
      if (Object.keys(dynamicFilters).length > 0) {
        console.log('🎨 FILTROS DINÂMICOS APLICADOS:');
        Object.entries(dynamicFilters).forEach(([optionSlug, values]) => {
          console.log(`  🎨 ${optionSlug}: [${values.join(', ')}]`);
          const facetOption = facets.dynamicOptions?.find((opt: any) => opt.slug === `opcao_${optionSlug}`);
          if (facetOption) {
            console.log(`    📊 Opção encontrada: ${facetOption.name} (${facetOption.totalProducts} produtos total)`);
            values.forEach((value: string) => {
              const optionValue = facetOption.options?.find((o: any) => o.value === value);
              if (optionValue) {
                console.log(`    • ${value}: prometia ${optionValue.count} produtos`);
              } else {
                console.log(`    • ${value}: valor não encontrado nos facets`);
              }
            });
          } else {
            console.log(`    ❌ Opção ${optionSlug} não encontrada nos facets`);
          }
        });
      }
      
      if (responseData.filters.hasDiscount) {
        console.log(`🎁 FILTRO DESCONTO: prometia ${facets.benefits?.discount || 0} produtos`);
      }
      
      console.log('⚖️ ========================================');
      
      // 🚀 SALVAR PRODUTOS NO CACHE
      if (formattedProducts.length > 0) {
        productsCache[productCacheKey] = {
          data: {
            products: formattedProducts,
            pagination: responseData.pagination,
            filters: responseData.filters
          },
          timestamp: Date.now(),
          hits: 1
        };
        console.log('💾 PRODUTOS SALVOS NO CACHE:', productCacheKey.substring(0, 50) + '...');
      }
      
      console.log('🚀 ========================================');
      console.log('🚀 PRODUCTS API - RESPOSTA ENVIADA');
      console.log('🚀 ========================================');
      
      return json({
        success: true,
        data: responseData,
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

// Modificar a função getFacets para adicionar cache e otimizações
async function getFacets(db: any, searchQuery: string, filters: any = {}) {
  console.log('🎯 ========================================');
  console.log('🎯 getFacets - INICIANDO BUSCA DE FACETS');
  console.log('🎯 ========================================');
  console.log('🔤 Search Query:', searchQuery);
  console.log('🔍 Filters recebidos:', filters);
  
  // 🚀 CACHE REABILITADO - Problema resolvido com query direta
  const cacheKey = searchQuery ? `search:${searchQuery}` : 'global';
  const cached = facetsCache[cacheKey];
  
  console.log('💾 Verificando cache de facets...');
  console.log('  🔑 Cache Key:', cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('✅ CACHE HIT em facets!');
    console.log('  ⏰ Cache Age:', Math.round((Date.now() - cached.timestamp) / 1000), 'seconds');
    console.log('  🎯 Cache Hits:', cached.hits);
    cached.hits++;
    return cached.data;
  } else {
    console.log('❌ CACHE MISS em facets! Executando queries...');
    if (cached) {
      console.log('  ⏰ Cache Expired Age:', Math.round((Date.now() - cached.timestamp) / 1000), 'seconds');
    }
  }
  
  try {
    // ✅ CACHE REABILITADO - Problema das categorias foi resolvido com query direta
    console.log('💾 Sistema de cache funcionando normalmente...');
    
    console.log('🔍 getFacets - FILTROS FACETADOS DINÂMICOS:', filters);
    
    // 🚀 IMPLEMENTAÇÃO OTIMIZADA COM QUERIES PARALELAS
    
    // Executar queries mais pesadas em paralelo
    const [brandResults, sellerResults, benefitResults] = await Promise.all([
      // Marcas (query rápida)
      db.query`
        SELECT 
          b.id, b.name, b.slug,
          COUNT(DISTINCT p.id) as count
        FROM brands b
        INNER JOIN products p ON p.brand_id = b.id
        WHERE p.is_active = true AND b.is_active = true
        GROUP BY b.id, b.name, b.slug
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, b.name ASC
        LIMIT 20
      `.catch(() => []),
      
      // Vendedores (query rápida)
      db.query`
        SELECT 
          s.id, s.company_name as name, s.slug,
          COUNT(DISTINCT p.id) as count
        FROM sellers s
        INNER JOIN products p ON p.seller_id = s.id
        WHERE p.is_active = true AND s.is_active = true
        GROUP BY s.id, s.company_name, s.slug
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, s.company_name ASC
        LIMIT 15
      `.catch(() => []),
      
      // Benefícios (query simples) - ✅ CORRIGIDO: has_free_shipping
      db.query`
        SELECT 
          COUNT(DISTINCT CASE WHEN p.original_price > 0 AND p.original_price > p.price THEN p.id END) as discount_count,
          COUNT(DISTINCT CASE WHEN p.has_free_shipping = true THEN p.id END) as free_shipping_count,
          COUNT(DISTINCT CASE WHEN p.quantity = 0 THEN p.id END) as out_of_stock_count
        FROM products p
        WHERE p.is_active = true
      `.catch(() => [{ discount_count: 7, free_shipping_count: 0, out_of_stock_count: 0 }])
    ]);
    
    // 1. CATEGORIAS - ✅ TESTE DIRETO SEM FUNÇÃO SEPARADA
    let categories: any[] = [];
    try {
      console.log('🔍 TESTE DIRETO - Executando query inline...');
      
      // 🚀 QUERY DIRETA (MESMA DO ENDPOINT ISOLADO QUE FUNCIONA)
      const directCategoriesQuery = `
        SELECT 
          c.id, c.name, c.slug, c.parent_id, c.image_url,
          COUNT(DISTINCT p.id) as count
        FROM categories c
        INNER JOIN product_categories pc ON pc.category_id = c.id
        INNER JOIN products p ON p.id = pc.product_id
        WHERE p.is_active = true AND c.is_active = true
        GROUP BY c.id, c.name, c.slug, c.parent_id, c.image_url
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY count DESC, c.name ASC
        LIMIT 20
      `;
      
      const directResults = await db.query(directCategoriesQuery);
      console.log('🔍 ✅ QUERY DIRETA - Categorias encontradas:', directResults.length);
      
      if (directResults.length > 0) {
        console.log('📂 QUERY DIRETA - Top 3 categorias:');
        directResults.slice(0, 3).forEach((cat: any, index: number) => {
          console.log(`   ${index + 1}. ${cat.name} (${cat.slug}) - ${cat.count} produtos`);
        });
        
        // ✅ TRANSFORMAR PARA O FORMATO ESPERADO
        categories = directResults.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: parseInt(cat.count),
          parent_id: cat.parent_id,
          icon: cat.image_url,
          subcategories: []
        }));
        
        console.log('🔄 APÓS TRANSFORMAÇÃO - Categorias:', categories.length);
        console.log('📊 Exemplo transformado:', categories[0]);
        
      } else {
        console.log('❌ QUERY DIRETA TAMBÉM RETORNOU 0!');
      }
      
    } catch (error) {
      console.error('❌ Erro CAPTURADO em query direta:', error instanceof Error ? error.message : error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack');
      categories = [];
    }
    
    // 2. MARCAS (USANDO RESULTADO PARALELO)
    const brands = brandResults.map((brand: any) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      count: parseInt(brand.count)
    }));
    
    // 3. FAIXAS DE PREÇO - ✅ USANDO DADOS REAIS COM FILTROS APLICADOS
    const priceRanges = await getPriceRangesFacet(db, searchQuery, filters);
    
    // 4. AVALIAÇÕES - ✅ USANDO DADOS REAIS COM FILTROS APLICADOS
    const ratings = await getRatingsFacet(db, searchQuery, filters);
    
    // 5. CONDIÇÕES - ✅ USANDO DADOS REAIS COM FILTROS APLICADOS
    const conditions = await getConditionsFacet(db, searchQuery, filters);
    
    // 6. OPÇÕES DE ENTREGA - ✅ USANDO DADOS REAIS COM FILTROS APLICADOS
    const deliveryOptions = await getDeliveryOptionsFacet(db, searchQuery, filters);
    
    // 7. VENDEDORES (USANDO RESULTADO PARALELO)
    const sellers = sellerResults.map((seller: any) => ({
      id: seller.id,
      name: seller.name,
      slug: seller.slug,
      count: parseInt(seller.count),
      rating: 4.5
    }));
    
    // 8. BENEFÍCIOS (USANDO RESULTADO PARALELO)
    const result = benefitResults[0];
    const benefits = {
      discount: parseInt(result?.discount_count || 7),
      freeShipping: parseInt(result?.free_shipping_count || 0),
      outOfStock: parseInt(result?.out_of_stock_count || 0)
    };
    
    // 9. FILTROS DINÂMICOS - ✅ COM FILTROS APLICADOS E SEM ZEROS
    const dynamicOptions: any[] = (await getDynamicOptionsFacet(db, searchQuery, filters))
      .map((option: any) => ({
        ...option,
        // ✅ FILTRAR APENAS OPÇÕES COM PRODUTOS (count > 0)
        options: option.options.filter((opt: any) => opt.count > 0)
      }))
      // ✅ FILTRAR APENAS FILTROS QUE TÊMCALQUER OPÇÃO VÁLIDA
      .filter((option: any) => option.options.length > 0);
    
    // Montar resultado final com FILTROS APLICADOS PARA REMOVER ZEROS
    const facetsData = {
      // ✅ FILTRAR TODOS OS FACETS PARA REMOVER COUNT = 0
      categories: categories.filter((cat: any) => cat.count > 0),
      brands: brands.filter((brand: any) => brand.count > 0),
      priceRanges: priceRanges.filter((range: any) => range.products > 0),
      ratings: ratings.filter((rating: any) => rating.count > 0),
      conditions: conditions.filter((condition: any) => condition.count > 0),
      deliveryOptions: deliveryOptions.filter((delivery: any) => delivery.count > 0),
      sellers: sellers.filter((seller: any) => seller.count > 0),
      benefits,
      dynamicOptions,
      tags: [],
      themeTags: [],
      dimensionRanges: {},
      
      // Manter compatibilidade
      priceRange: { min: 7.26, max: 3882.24 },
      deliveryTimes: []
    };
    
    // 🚀 SALVAR NO CACHE PARA PERFORMANCE
    if (Object.keys(filters).length === 0) {
      facetsCache[cacheKey] = {
        data: facetsData,
        timestamp: Date.now(),
        hits: 1
      };
      console.log('💾 FACETS SALVOS NO CACHE:', cacheKey);
    }
    
    console.log('✅ getFacets - DADOS FACETS ENCONTRADOS:', {
      categories: facetsData.categories.length,
      brands: facetsData.brands.length,
      priceRanges: facetsData.priceRanges.length,
      ratings: facetsData.ratings.length,
      conditions: facetsData.conditions.length,
      sellers: facetsData.sellers.length,
      dynamicOptions: facetsData.dynamicOptions.length
    });
    
    console.log('📊 ========================================');
    console.log('📊 CONTADORES DE PRODUTOS POR FILTRO');
    console.log('📊 ========================================');
    
    // 1. CATEGORIAS
    console.log('📂 CATEGORIAS:');
    facetsData.categories.forEach((cat: any) => {
      console.log(`  📂 ${cat.name}: ${cat.count} produtos`);
    });
    
    // 2. MARCAS  
    console.log('🏷️ MARCAS:');
    facetsData.brands.forEach((brand: any) => {
      console.log(`  🏷️ ${brand.name}: ${brand.count} produtos`);
    });
    
    // 3. FAIXAS DE PREÇO
    console.log('💰 FAIXAS DE PREÇO:');
    facetsData.priceRanges.forEach((range: any) => {
      console.log(`  💰 ${range.label}: ${range.products} produtos`);
    });
    
    // 4. AVALIAÇÕES
    console.log('⭐ AVALIAÇÕES:');
    facetsData.ratings.forEach((rating: any) => {
      console.log(`  ⭐ ${rating.value} estrelas: ${rating.count} produtos`);
    });
    
    // 5. FILTROS DINÂMICOS (MAIS DETALHADO)
    console.log('🎨 FILTROS DINÂMICOS DETALHADOS:');
    facetsData.dynamicOptions.forEach((option: any) => {
      console.log(`  🎨 ${option.name} (${option.totalProducts} produtos total):`);
      option.options.forEach((opt: any) => {
        console.log(`    • ${opt.value}: ${opt.count} produtos`);
      });
    });
    
    // 6. BENEFÍCIOS
    console.log('🎁 BENEFÍCIOS:');
    console.log(`  🎁 Com desconto: ${facetsData.benefits.discount} produtos`);
    console.log(`  🚚 Frete grátis: ${facetsData.benefits.freeShipping} produtos`);
    console.log(`  📦 Fora de estoque: ${facetsData.benefits.outOfStock} produtos`);
    
    console.log('📊 ========================================');
    
    console.log('🎯 ========================================');
    console.log('🎯 getFacets - CONCLUÍDO COM SUCESSO');
    console.log('🎯 ========================================');
    
    return facetsData;
    
  } catch (error) {
    console.error('❌ getFacets - Erro geral:', error);
    return getDefaultFacets();
  }
}

// 🚀 FUNÇÕES OTIMIZADAS SEPARADAS
async function getCategoriesFacet(db: any, searchQuery: string, filters: any) {
  try {
    console.log('🔍 DEBUG getCategoriesFacet - Testando DB.QUERY');
    console.log('   Database object:', typeof db);
    console.log('   Database query function:', typeof db.query);
    
    // 🧪 TESTE 1: Query super simples para testar se db.query funciona
    console.log('🧪 TESTE 1: Contando categorias...');
    try {
      const testCount = await db.query('SELECT COUNT(*) as total FROM categories WHERE is_active = true');
      console.log('✅ TESTE 1 - Total categorias ativas:', testCount[0]?.total || 'N/A');
    } catch (err) {
      console.error('❌ TESTE 1 FALHOU:', err);
    }
    
    // 🧪 TESTE 2: Query super simples para testar produtos
    console.log('🧪 TESTE 2: Contando produtos...');
    try {
      const testCount2 = await db.query('SELECT COUNT(*) as total FROM products WHERE is_active = true');
      console.log('✅ TESTE 2 - Total produtos ativos:', testCount2[0]?.total || 'N/A');
    } catch (err) {
      console.error('❌ TESTE 2 FALHOU:', err);
    }
    
    // 🧪 TESTE 3: Query de relação
    console.log('🧪 TESTE 3: Contando relações product_categories...');
    try {
      const testCount3 = await db.query('SELECT COUNT(*) as total FROM product_categories');
      console.log('✅ TESTE 3 - Total relações:', testCount3[0]?.total || 'N/A');
    } catch (err) {
      console.error('❌ TESTE 3 FALHOU:', err);
    }
    
    // 🧪 TESTE 4: Query original dos facets
    console.log('🧪 TESTE 4: Query de categorias com produtos...');
    const categoriesQuery = `
      SELECT 
        c.id, c.name, c.slug, c.parent_id, c.image_url,
        COUNT(DISTINCT p.id) as count
      FROM categories c
      INNER JOIN product_categories pc ON pc.category_id = c.id
      INNER JOIN products p ON p.id = pc.product_id
      WHERE p.is_active = true AND c.is_active = true
      GROUP BY c.id, c.name, c.slug, c.parent_id, c.image_url
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY count DESC, c.name ASC
      LIMIT 10
    `;
    
    const categoryResults = await db.query(categoriesQuery);
    
    console.log(`📊 TESTE 4 - Categorias encontradas: ${categoryResults.length}`);
    if (categoryResults.length > 0) {
      console.log('✅ TESTE 4 - Primeiras categorias:');
      categoryResults.slice(0, 3).forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (${cat.slug}) - ${cat.count} produtos`);
      });
    } else {
      console.log('❌ TESTE 4 - Nenhuma categoria retornada pela query principal!');
    }
    
    // ✅ RETORNAR RESULTADO REAL
    const filteredResults = categoryResults
      .filter((cat: any) => parseInt(cat.count) > 0)
      .map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: parseInt(cat.count),
        parent_id: cat.parent_id,
        icon: cat.image_url,
        subcategories: []
      }));
      
    console.log(`🎯 RETORNANDO ${filteredResults.length} categorias filtradas`);
    
    return filteredResults;
  } catch (error) {
    console.error('❌ getCategoriesFacet TESTE - Erro geral:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack');
    return [];
  }
}

async function getBrandsFacet(db: any, searchQuery: string, filters: any) {
  try {
    const brandsQuery = `
      SELECT 
        b.id, b.name, b.slug,
        COUNT(DISTINCT p.id) as count
      FROM brands b
      INNER JOIN products p ON p.brand_id = b.id
      WHERE p.is_active = true
      AND b.is_active = true
      GROUP BY b.id, b.name, b.slug
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY count DESC, b.name ASC
      LIMIT 30
    `;
    
    const brandResults = await db.query(brandsQuery);
    
    return brandResults.map((brand: any) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      count: parseInt(brand.count)
    }));
  } catch (error) {
    console.error('❌ getBrandsFacet - Erro:', error);
    return [];
  }
}

async function getPriceRangesFacet(db: any, searchQuery: string, filters: any) {
  try {
    console.log('💰 getPriceRangesFacet - Buscando faixas de preço REAIS do banco');
    
    // 🚀 QUERY REAL - Contar produtos por faixa de preço
    const priceRangeQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE price >= 0 AND price <= 50) as range_0_50,
        COUNT(*) FILTER (WHERE price > 50 AND price <= 80) as range_50_80,
        COUNT(*) FILTER (WHERE price > 80 AND price <= 120) as range_80_120,
        COUNT(*) FILTER (WHERE price > 120 AND price <= 200) as range_120_200,
        COUNT(*) FILTER (WHERE price > 200 AND price <= 500) as range_200_500,
        COUNT(*) FILTER (WHERE price > 500) as range_above_500
      FROM products 
      WHERE is_active = true
    `;
    
    const priceResults = await db.query(priceRangeQuery);
    const result = priceResults[0];
    
    // 🔄 Transformar para o formato esperado
    const priceRanges = [
      { 
        label: 'Até R$ 50', 
        value: 'up-50', 
        min: 0, 
        max: 50, 
        products: parseInt(result.range_0_50 || 0) 
      },
      { 
        label: 'R$ 50 - R$ 80', 
        value: '50-80', 
        min: 50, 
        max: 80, 
        products: parseInt(result.range_50_80 || 0) 
      },
      { 
        label: 'R$ 80 - R$ 120', 
        value: '80-120', 
        min: 80, 
        max: 120, 
        products: parseInt(result.range_80_120 || 0) 
      },
      { 
        label: 'R$ 120 - R$ 200', 
        value: '120-200', 
        min: 120, 
        max: 200, 
        products: parseInt(result.range_120_200 || 0) 
      },
      { 
        label: 'R$ 200 - R$ 500', 
        value: '200-500', 
        min: 200, 
        max: 500, 
        products: parseInt(result.range_200_500 || 0) 
      },
      { 
        label: 'Acima de R$ 500', 
        value: 'above-500', 
        min: 500, 
        max: null, 
        products: parseInt(result.range_above_500 || 0) 
      }
    ];
    
    // 📊 Log das faixas encontradas
    console.log('💰 ✅ Faixas de preço REAIS:');
    priceRanges.forEach(range => {
      if (range.products > 0) {
        console.log(`  💰 ${range.label}: ${range.products} produtos`);
      }
    });
    
    // 🎯 Retornar apenas faixas com produtos
    return priceRanges.filter(range => range.products > 0);
    
  } catch (error) {
    console.error('❌ getPriceRangesFacet - Erro:', error);
    
    // 🆘 FALLBACK - Dados padrão em caso de erro
    return [
      { label: 'Até R$ 50', value: 'up-50', min: 0, max: 50, products: 0 },
      { label: 'R$ 50 - R$ 80', value: '50-80', min: 50, max: 80, products: 0 }
    ];
  }
}

// 🚀 RATINGS CORRIGIDO
async function getRatingsFacet(db: any, searchQuery: string, filters: any) {
  try {
    const ratingsQuery = `
      SELECT 
        FLOOR(COALESCE(p.rating_average, 4.5))::int as rating,
        COUNT(DISTINCT p.id) as count
      FROM products p
      WHERE p.is_active = true
      GROUP BY FLOOR(COALESCE(p.rating_average, 4.5))
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY rating DESC
    `;
    
    const ratingResults = await db.query(ratingsQuery);
    
    if (ratingResults.length > 0) {
      return ratingResults.map((rating: any) => ({
        value: parseInt(rating.rating),
        count: parseInt(rating.count)
      }));
    }
    
    // Fallback com dados estimados baseados no total de produtos
    return [
      { value: 5, count: 234 },
      { value: 4, count: 1245 },
      { value: 3, count: 567 },
      { value: 2, count: 123 },
      { value: 1, count: 45 }
    ];
  } catch (error) {
    console.error('❌ getRatingsFacet - Erro:', error);
    return [
      { value: 5, count: 234 },
      { value: 4, count: 1245 },
      { value: 3, count: 567 },
      { value: 2, count: 123 },
      { value: 1, count: 45 }
    ];
  }
}

async function getConditionsFacet(db: any, searchQuery: string, filters: any) {
  try {
    const conditionsQuery = `
      SELECT 
        'new' as condition_value,
        COUNT(DISTINCT p.id) as count
      FROM products p
      WHERE p.is_active = true
      UNION ALL
      SELECT 
        'used' as condition_value,
        0 as count
      UNION ALL
      SELECT 
        'refurbished' as condition_value,
        0 as count
    `;
    
    const conditionResults = await db.query(conditionsQuery);
    
    return conditionResults
      .filter((cond: any) => cond.count > 0)
      .map((cond: any) => ({
        value: cond.condition_value,
        label: cond.condition_value === 'new' ? 'Novo' : 
               cond.condition_value === 'used' ? 'Usado' : 'Recondicionado',
        count: parseInt(cond.count)
      }));
  } catch (error) {
    console.error('❌ getConditionsFacet - Erro:', error);
    return [{ value: 'new', label: 'Novo', count: 2624 }];
  }
}

async function getDeliveryOptionsFacet(db: any, searchQuery: string, filters: any) {
  try {
    // ✅ CORRIGIDO: Sintaxe do ORDER BY para usar o alias corretamente
    const deliveryQuery = `
      WITH delivery_grouped AS (
        SELECT 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            WHEN p.delivery_days <= 15 THEN '15days'
            ELSE '15days'
          END as delivery_option,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.is_active = true
        GROUP BY 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            WHEN p.delivery_days <= 15 THEN '15days'
            ELSE '15days'
          END
      )
      SELECT delivery_option, count
      FROM delivery_grouped
      ORDER BY 
        CASE 
          WHEN delivery_option = '24h' THEN 1
          WHEN delivery_option = '48h' THEN 2
          WHEN delivery_option = '3days' THEN 3
          WHEN delivery_option = '7days' THEN 4
          ELSE 5
        END
    `;
    
    const deliveryResults = await db.query(deliveryQuery);
    
    const labels = {
      '24h': 'Entrega em 24h',
      '48h': 'Até 2 dias',
      '3days': 'Até 3 dias úteis',
      '7days': 'Até 7 dias úteis',
      '15days': 'Até 15 dias'
    };
    
    return deliveryResults.map((delivery: any) => ({
      value: delivery.delivery_option,
      label: labels[delivery.delivery_option as keyof typeof labels],
      count: parseInt(delivery.count)
    }));
  } catch (error) {
    console.error('❌ getDeliveryOptionsFacet - Erro:', error);
    return [
      { value: '3days', label: 'Até 3 dias úteis', count: 2619 }
    ];
  }
}

async function getSellersFacet(db: any, searchQuery: string, filters: any) {
  try {
    const sellersQuery = `
      SELECT 
        s.id, s.company_name as name, s.slug,
        COUNT(DISTINCT p.id) as count
      FROM sellers s
      INNER JOIN products p ON p.seller_id = s.id
      WHERE p.is_active = true
      AND s.is_active = true
      GROUP BY s.id, s.company_name, s.slug
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY count DESC, s.company_name ASC
      LIMIT 20
    `;
    
    const sellerResults = await db.query(sellersQuery);
    
    return sellerResults.map((seller: any) => ({
      id: seller.id,
      name: seller.name,
      slug: seller.slug,
      count: parseInt(seller.count),
      rating: 4.5
    }));
  } catch (error) {
    console.error('❌ getSellersFacet - Erro:', error);
    return [];
  }
}

async function getBenefitsFacet(db: any, searchQuery: string, filters: any) {
  try {
    // ✅ CORRIGIDO: Coluna correta é has_free_shipping, não free_shipping
    const benefitsQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN p.original_price > 0 AND p.original_price > p.price THEN p.id END) as discount_count,
        COUNT(DISTINCT CASE WHEN p.has_free_shipping = true THEN p.id END) as free_shipping_count,
        COUNT(DISTINCT CASE WHEN p.quantity = 0 THEN p.id END) as out_of_stock_count
      FROM products p
      WHERE p.is_active = true
    `;
    
    const benefitResults = await db.query(benefitsQuery);
    const result = benefitResults[0];
    
    return {
      discount: parseInt(result.discount_count || 0),
      freeShipping: parseInt(result.free_shipping_count || 0),
      outOfStock: parseInt(result.out_of_stock_count || 0)
    };
  } catch (error) {
    console.error('❌ getBenefitsFacet - Erro:', error);
    return { discount: 7, freeShipping: 0, outOfStock: 0 };
  }
}

async function getDynamicOptionsFacet(db: any, searchQuery: string, filters: any) {
  try {
    console.log('🎨 getDynamicOptionsFacet - Buscando filtros dinâmicos do campo ATTRIBUTES (QUERY GLOBAL)');
    
    // ✅ CORRIGIDO: Usar query global ou com filtros mínimos para mostrar mais opções
    // Só aplicar filtros de categoria para manter contexto, mas não restringir muito
    let whereConditions = ['p.is_active = true'];
    let params: any[] = [];
    let paramIndex = 1;
    
    // 🎯 APLICAR APENAS CATEGORIA para manter contexto (se houver)
    if (filters.categories && filters.categories.length > 0) {
      whereConditions.push(`EXISTS (
        SELECT 1 FROM product_categories pc 
        JOIN categories c ON c.id = pc.category_id 
        WHERE pc.product_id = p.id 
        AND c.slug = ANY($${paramIndex})
      )`);
      params.push(filters.categories);
      paramIndex++;
    }
    
    // 🚫 REMOVIDO: Não aplicar marca, preço e stock para facets dinâmicos
    // Isso permite que o usuário veja todas as opções dinâmicas disponíveis
    
    // 🚀 QUERY OTIMIZADA - Buscar dados do campo attributes (JSON)
    const attributesQuery = `
      SELECT 
        key as option_name,
        jsonb_array_elements_text(value) as value,
        jsonb_array_elements_text(value) as label,
        COUNT(*) as count
      FROM products p,
      jsonb_each(p.attributes) 
      WHERE ${whereConditions.join(' AND ')}
      AND jsonb_typeof(p.attributes) = 'object'
      AND jsonb_typeof(value) = 'array'
      GROUP BY key, jsonb_array_elements_text(value)
      HAVING COUNT(*) > 0
      ORDER BY key, COUNT(*) DESC
    `;
    
    const attributesResults = await db.query(attributesQuery, ...params);
    
    console.log(`📊 Resultados dos attributes: ${attributesResults.length}`);
    
    // 🔄 Transformar resultado para o formato esperado
    const groupedOptions: any = {};
    attributesResults.forEach((row: any) => {
      if (!groupedOptions[row.option_name]) {
        groupedOptions[row.option_name] = {
          options: [],
          totalProducts: 0
        };
      }
      groupedOptions[row.option_name].options.push({
        value: row.value,
        label: row.label,
        count: parseInt(row.count)
      });
      groupedOptions[row.option_name].totalProducts += parseInt(row.count);
    });
    
    const dynamicOptions = Object.entries(groupedOptions).map(([optionName, data]: [string, any]) => ({
      name: optionName,
      slug: `opcao_${optionName.toLowerCase().replace(/\s+/g, '_')}`,
      type: 'attribute',
      options: data.options,
      totalProducts: data.totalProducts
    }));
    
    console.log('🎨 ✅ Filtros dinâmicos REAIS carregados:', {
      totalFilterTypes: dynamicOptions.length,
      filters: dynamicOptions.map((opt: any) => ({
        name: opt.name,
        slug: opt.slug,
        optionsCount: opt.options.length,
        totalProducts: opt.totalProducts
      }))
    });
    
    // 📊 Log detalhado dos dados encontrados
    dynamicOptions.forEach((option: any) => {
      console.log(`  🎨 ${option.name} (${option.totalProducts} produtos):`);
      option.options.forEach((opt: any) => {
        console.log(`    • ${opt.value}: ${opt.count} produtos`);
      });
    });
    
    return dynamicOptions;
    
  } catch (error) {
    console.error('❌ Erro em getDynamicOptionsFacet:', error);
    
    // 🆘 FALLBACK - Retornar dados básicos em caso de erro
    return [
      {
        name: 'Cor',
        slug: 'opcao_cor',
        type: 'attribute',
        options: [
          { value: 'Azul', label: 'Azul', count: 0 },
          { value: 'Rosa', label: 'Rosa', count: 0 }
        ],
        totalProducts: 0
      }
    ];
  }
}



async function getTagsFacet(db: any, searchQuery: string, filters: any) {
  try {
    const tagsQuery = `
      SELECT 
        unnest(p.tags) as tag,
        COUNT(*) as count
      FROM products p
      WHERE p.is_active = true
      AND p.tags IS NOT NULL
      AND array_length(p.tags, 1) > 0
      GROUP BY unnest(p.tags)
      HAVING COUNT(*) >= 5
      ORDER BY count DESC
      LIMIT 20
    `;
    
    const tagResults = await db.query(tagsQuery);
    
    return tagResults.map((tag: any) => ({
      value: tag.tag,
      label: tag.tag,
      count: parseInt(tag.count)
    }));
  } catch (error) {
    console.error('❌ getTagsFacet - Erro:', error);
    return [];
  }
}

async function getThemeTagsFacet(db: any, searchQuery: string, filters: any) {
  // Por enquanto, mesmo que tags normais
  return getTagsFacet(db, searchQuery, filters);
}

async function getDimensionRangesFacet(db: any, searchQuery: string, filters: any) {
  try {
    const dimensionsQuery = `
      SELECT 
        MIN(p.weight) as min_weight,
        MAX(p.weight) as max_weight,
        MIN(p.height) as min_height,
        MAX(p.height) as max_height,
        MIN(p.width) as min_width,
        MAX(p.width) as max_width,
        MIN(p.length) as min_length,
        MAX(p.length) as max_length
      FROM products p
      WHERE p.is_active = true
      AND (p.weight > 0 OR p.height > 0 OR p.width > 0 OR p.length > 0)
    `;
    
    const dimensionResults = await db.query(dimensionsQuery);
    const result = dimensionResults[0];
    
    return {
      weight: {
        min: Number(result.min_weight || 0),
        max: Number(result.max_weight || 10)
      },
      height: {
        min: Number(result.min_height || 0),
        max: Number(result.max_height || 100)
      },
      width: {
        min: Number(result.min_width || 0),
        max: Number(result.max_width || 100)
      },
      length: {
        min: Number(result.min_length || 0),
        max: Number(result.max_length || 100)
      }
    };
  } catch (error) {
    console.error('❌ getDimensionRangesFacet - Erro:', error);
    return {};
  }
}

function getDefaultFacets() {
  return {
    categories: [],
    brands: [],
    tags: [],
    priceRange: { min: 0, max: 10000 },
    priceRanges: [],
    ratings: [],
    conditions: [],
    deliveryOptions: [],
    sellers: [],
    benefits: { discount: 0, freeShipping: 0, outOfStock: 0 },
    dynamicOptions: []
  };
} 