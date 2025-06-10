import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { withAdminAuth, authUtils } from '@mktplace/utils/auth/middleware';

/**
 * Compara dois estados de produto e registra histórico das alterações
 */
async function compareAndLogHistory(
  originalProduct: any, 
  finalProduct: any, 
  productId: string, 
  db: any,
  user?: any
): Promise<{ totalChanges: number; summary: string }> {
  const changes: Record<string, { old: any; new: any; label: string }> = {};
  
  // Campos que devem ser ignorados na comparação
  const ignoredFields = new Set([
    'created_at', 'updated_at', 'id',
    'images', // Ignorar imagens por enquanto (tem lógica específica)
    'related_products', 'upsell_products', 'download_files',
    'product_options', 'product_variants', 'variant_type',
    'categories', 'category_ids', 'related_product_ids', 'upsell_product_ids'
  ]);
  
  // Mapeamento de campos para nomes amigáveis
  const fieldLabels: Record<string, string> = {
    name: 'Nome',
    sku: 'SKU',
    price: 'Preço',
    original_price: 'Preço Original',
    cost: 'Custo',
    quantity: 'Quantidade em Estoque',
    description: 'Descrição',
    short_description: 'Descrição Curta',
    weight: 'Peso',
    height: 'Altura',
    width: 'Largura',
    length: 'Comprimento',
    category_id: 'Categoria',
    category_name: 'Nome da Categoria',
    brand_id: 'Marca',
    brand_name: 'Nome da Marca',
    seller_id: 'Vendedor',
    seller_name: 'Nome do Vendedor',
    is_active: 'Status Ativo',
    featured: 'Em Destaque',
    status: 'Status',
    condition: 'Condição',
    tags: 'Tags',
    meta_title: 'Título SEO',
    meta_description: 'Descrição SEO',
    meta_keywords: 'Palavras-chave SEO',
    attributes: 'Atributos para Filtros',
    specifications: 'Especificações Técnicas',
    images: 'Imagens',
    track_inventory: 'Controlar Estoque',
    allow_backorder: 'Permitir Pré-venda',
    has_free_shipping: 'Frete Grátis',
    requires_shipping: 'Requer Frete',
    is_digital: 'Produto Digital'
  };
  
  // Combinar todas as chaves de ambos os objetos
  const allKeys = new Set([
    ...Object.keys(originalProduct || {}),
    ...Object.keys(finalProduct || {})
  ]);
  
  for (const key of allKeys) {
    if (ignoredFields.has(key)) continue;
    
    const oldValue = originalProduct?.[key];
    const newValue = finalProduct?.[key];
    
    // Normalizar valores para comparação
    const normalizedOld = normalizeValueForComparison(oldValue);
    const normalizedNew = normalizeValueForComparison(newValue);
    
    // Comparar valores normalizados
    if (!deepEqual(normalizedOld, normalizedNew)) {
      const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      changes[key] = {
        old: oldValue,
        new: newValue,
        label
      };
      
    }
  }
  
  const totalChanges = Object.keys(changes).length;
  
  // Log resumido das alterações reais
  if (totalChanges > 0) {
    console.log(`🔍 ${totalChanges} campo(s) alterado(s):`);
    Object.entries(changes).forEach(([field, change]) => {
      console.log(`  - ${change.label}: "${change.old}" → "${change.new}"`);
    });
  } else {
    console.log('ℹ️ Nenhuma alteração detectada');
  }
  
  const summary = generateSmartSummary(changes, totalChanges);
  
  // Registrar no banco se há alterações
  if (totalChanges > 0) {
    try {
              await db.query(`
        INSERT INTO product_history (
          product_id, user_id, user_name, user_email, action, changes, summary, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW()
        )
      `, [
        productId,
        user?.id || null,
        user?.name || 'Sistema',
        user?.email || 'system@marketplace.com',
        'updated',
        JSON.stringify(changes),
        summary
      ]);
      
      console.log(`📝 Histórico salvo no banco: ${summary}`);
    } catch (dbError) {
      console.error('❌ Erro ao salvar histórico no banco:', dbError);
    }
  }
  
  return { totalChanges, summary };
}

/**
 * Normaliza valores para comparação consistente
 */
function normalizeValueForComparison(value: any): any {
  // null, undefined, string vazia → null
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Arrays vazios → null
  if (Array.isArray(value) && value.length === 0) {
    return null;
  }
  
  // Objetos vazios → null
  if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
    return null;
  }
  
  // Converter strings numéricas para números
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value);
  }
  
  // Converter strings booleanas
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  
  // Para números, garantir que sejam do mesmo tipo
  if (typeof value === 'number') {
    return Number(value);
  }
  
  return value;
}

/**
 * Comparação profunda de valores
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if ((a == null) !== (b == null)) return false;
  if (a == null && b == null) return true;
  
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      keysB.includes(key) && deepEqual(a[key], b[key])
    );
  }
  
  return a === b;
}

/**
 * Gera resumo inteligente das alterações
 */
function generateSmartSummary(changes: Record<string, any>, totalChanges: number): string {
  if (totalChanges === 0) {
    return 'Nenhuma alteração detectada';
  }
  
  if (totalChanges === 1) {
    const change = Object.values(changes)[0];
    return `${change.label} alterado`;
  }
  
  if (totalChanges === 2) {
    const changesList = Object.values(changes);
    return `${changesList[0].label} e ${changesList[1].label} alterados`;
  }
  
  if (totalChanges === 3) {
    const changesList = Object.values(changes);
    return `${changesList[0].label}, ${changesList[1].label} e ${changesList[2].label} alterados`;
  }
  
  // Para 4+ alterações, priorizar campos importantes
  const priorityFields = ['name', 'price', 'sku', 'quantity', 'is_active'];
  const allChanges = Object.entries(changes);
  const priorityChanges = allChanges.filter(([field]) => priorityFields.includes(field));
  
  if (priorityChanges.length > 0) {
    const priorityLabels = priorityChanges.map(([_, change]) => change.label);
    
    if (priorityChanges.length === 1 && totalChanges <= 4) {
      const otherChanges = allChanges.filter(([field]) => !priorityFields.includes(field));
      const otherLabels = otherChanges.slice(0, 2).map(([_, change]) => change.label);
      
      if (otherLabels.length === 1) {
        return `${priorityLabels[0]} e ${otherLabels[0]} alterados`;
      } else if (otherLabels.length === 2) {
        return `${priorityLabels[0]}, ${otherLabels[0]} e ${otherLabels[1]} alterados`;
      }
    }
    
    if (priorityChanges.length >= 2) {
      return `${priorityLabels[0]}, ${priorityLabels[1]} e outros ${totalChanges - 2} campos alterados`;
    }
    
    return `${priorityLabels[0]} e outros ${totalChanges - 1} campos alterados`;
  }
  
  // Se não há campos prioritários
  const firstChanges = allChanges.slice(0, 3).map(([_, change]) => change.label);
  if (totalChanges <= 3) {
    return firstChanges.join(', ') + ' alterados';
  }
  
  return `${firstChanges[0]}, ${firstChanges[1]} e outros ${totalChanges - 2} campos alterados`;
}

// Função para converter nomes de países para códigos ISO
function getCountryCode(countryName: string | null): string | null {
  if (!countryName) return null;
  
  const countryMap: Record<string, string> = {
    'brasil': 'BR',
    'brazil': 'BR',
    'estados unidos': 'US',
    'united states': 'US',
    'china': 'CN',
    'alemanha': 'DE',
    'germany': 'DE',
    'japão': 'JP',
    'japan': 'JP',
    'coreia do sul': 'KR',
    'south korea': 'KR',
    'itália': 'IT',
    'italy': 'IT',
    'frança': 'FR',
    'france': 'FR',
    'reino unido': 'GB',
    'united kingdom': 'GB',
    'canadá': 'CA',
    'canada': 'CA',
    'méxico': 'MX',
    'mexico': 'MX',
    'argentina': 'AR',
    'chile': 'CL',
    'uruguai': 'UY',
    'paraguai': 'PY',
    'venezuela': 'VE',
    'colômbia': 'CO',
    'peru': 'PE',
    'equador': 'EC',
    'bolívia': 'BO'
  };
  
  const normalized = countryName.toLowerCase().trim();
  return countryMap[normalized] || (countryName.length === 2 ? countryName.toUpperCase() : 'BR');
}

// GET - Buscar produto por ID
export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    const query = `
      SELECT 
        p.*,
        -- Categoria primária para compatibilidade
        pc_primary.category_id as category_id,
        c_primary.name as category_name,
        -- Todas as categorias
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', c.id, 
              'name', c.name,
              'slug', c.slug,
              'is_primary', pc.is_primary
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'::json
        ) as categories,
        ARRAY_AGG(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL) as category_ids,
        -- Marca
        b.name as brand_name,
        -- Vendedor
        s.company_name as seller_name,
        -- Imagens
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', pi.id,
              'url', pi.url,
              'position', pi.position
            ) ORDER BY pi.position
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) as images,
        -- Produtos relacionados
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', pr.related_product_id,
              'name', p_rel.name,
              'slug', p_rel.slug,
              'price', p_rel.price,
              'image', (SELECT url FROM product_images WHERE product_id = p_rel.id ORDER BY position LIMIT 1)
            ) ORDER BY pr.position
          ) FILTER (WHERE pr.id IS NOT NULL),
          '[]'::json
        ) as related_products,
        -- Produtos upsell
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', pu.upsell_product_id,
              'name', p_up.name,
              'slug', p_up.slug,
              'price', p_up.price,
              'image', (SELECT url FROM product_images WHERE product_id = p_up.id ORDER BY position LIMIT 1)
            ) ORDER BY pu.position
          ) FILTER (WHERE pu.id IS NOT NULL),
          '[]'::json
        ) as upsell_products,
        -- Downloads
        COALESCE(
          json_agg(
            jsonb_build_object(
              'id', pd.id,
              'name', pd.name,
              'url', pd.file_url,
              'size', pd.file_size,
              'mime_type', pd.mime_type
            ) ORDER BY pd.position
          ) FILTER (WHERE pd.id IS NOT NULL),
          '[]'::json
        ) as download_files
      FROM products p
      LEFT JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN product_categories pc_primary ON pc_primary.product_id = p.id AND pc_primary.is_primary = true
      LEFT JOIN categories c ON c.id = pc.category_id
      LEFT JOIN categories c_primary ON c_primary.id = pc_primary.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN sellers s ON s.id = p.seller_id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      LEFT JOIN product_related pr ON pr.product_id = p.id
      LEFT JOIN products p_rel ON p_rel.id = pr.related_product_id
      LEFT JOIN product_upsells pu ON pu.product_id = p.id
      LEFT JOIN products p_up ON p_up.id = pu.upsell_product_id
      LEFT JOIN product_downloads pd ON pd.product_id = p.id AND pd.is_active = true
      WHERE p.id = $1
      GROUP BY p.id, pc_primary.category_id, c_primary.name, b.name, s.company_name
    `;
    
    const result = await db.query(query, id);
    
    if (!result[0]) {
      await db.close();
      return json({ 
        success: false, 
        error: 'Produto não encontrado' 
      }, { status: 404 });
    }

    // Processar campos JSONB
    const product = result[0];
    
    // 🔧 CORREÇÃO ROBUSTA - Garantir que attributes e specifications sejam objetos parseados corretamente
    console.log('🔍 DEBUG API GET - Raw attributes:', typeof product.attributes, product.attributes);
    console.log('🔍 DEBUG API GET - Raw specifications:', typeof product.specifications, product.specifications);
    
    try {
      if (typeof product.attributes === 'string') {
        product.attributes = JSON.parse(product.attributes);
      } else if (!product.attributes) {
        product.attributes = {};
      }
      
      // 🔧 Se attributes tem keys numéricas, é problema de serialização
      if (product.attributes && Object.keys(product.attributes).some(key => !isNaN(Number(key)))) {
        console.log('🔧 API GET - Detectado problema em attributes, resetando');
        product.attributes = {};
      }
    } catch (error) {
      console.error('❌ Erro ao parsear attributes:', error);
      product.attributes = {};
    }
    
    try {
      if (typeof product.specifications === 'string') {
        product.specifications = JSON.parse(product.specifications);
      } else if (!product.specifications) {
        product.specifications = {};
      }
      
      // 🔧 CORREÇÃO ESPECÍFICA: Se specifications tem keys numéricas, resetar
      if (product.specifications && Object.keys(product.specifications).some(key => !isNaN(Number(key)))) {
        console.log('🔧 API GET - Detectado problema de serialização em specifications, resetando');
        product.specifications = {};
      }
    } catch (error) {
      console.error('❌ Erro ao parsear specifications:', error);
      product.specifications = {};
    }
    
    console.log('✅ DEBUG API GET - Final attributes:', product.attributes);
    console.log('✅ DEBUG API GET - Final specifications:', product.specifications);
    
    // Extrair custom_fields de specifications se existir
    if (product.specifications.custom_fields) {
      product.custom_fields = product.specifications.custom_fields;
    } else {
      product.custom_fields = {};
    }
    
    // Converter arrays de IDs se necessário
    if (product.related_products && Array.isArray(product.related_products)) {
      product.related_product_ids = product.related_products.map((p: any) => p.id);
    }
    
    if (product.upsell_products && Array.isArray(product.upsell_products)) {
      product.upsell_product_ids = product.upsell_products.map((p: any) => p.id);
    }
    
    // ✅ CARREGAR VARIAÇÕES DO PRODUTO
    try {
      // Carregar product_options
      const optionsQuery = `
        SELECT 
          po.id,
          po.name,
          po.position,
          COALESCE(
            json_agg(
              jsonb_build_object(
                'id', pov.id,
                'value', pov.value,
                'position', pov.position
              ) ORDER BY pov.position
            ) FILTER (WHERE pov.id IS NOT NULL),
            '[]'::json
          ) as values
        FROM product_options po
        LEFT JOIN product_option_values pov ON pov.option_id = po.id
        WHERE po.product_id = $1
        GROUP BY po.id, po.name, po.position
        ORDER BY po.position
      `;
      
      const optionsResult = await db.query(optionsQuery, [id]);
      product.product_options = optionsResult || [];
      
      // Carregar product_variants
      const variantsQuery = `
        SELECT 
          pv.*,
          -- Montar option_values como objeto JSON
          COALESCE(
            json_object_agg(po.name, pov.value) FILTER (WHERE po.name IS NOT NULL),
            '{}'::json
          ) as option_values
        FROM product_variants pv
        LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id
        LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
        LEFT JOIN product_options po ON po.id = pov.option_id
        WHERE pv.product_id = $1
        GROUP BY pv.id
        ORDER BY pv.id
      `;
      
      const variantsResult = await db.query(variantsQuery, [id]);
      product.product_variants = variantsResult || [];
      
      // ✅ DEFINIR has_variants BASEADO EM MÚLTIPLOS CRITÉRIOS
      const hasStructuredVariants = product.product_options.length > 0 || product.product_variants.length > 0;
      const hasAttributeVariations = product.attributes && Object.entries(product.attributes).some(([key, values]) => 
        Array.isArray(values) && values.length > 1
      );
      
      product.has_variants = hasStructuredVariants || hasAttributeVariations;
      
      console.log(`📦 Produto carregado com ${product.product_options.length} opções e ${product.product_variants.length} variações`);
      console.log(`🔍 has_variants definido como: ${product.has_variants} (estruturadas: ${hasStructuredVariants}, attributes: ${hasAttributeVariations})`);
      
      // Debug dos attributes
      if (product.attributes && Object.keys(product.attributes).length > 0) {
        console.log('🎨 Attributes encontrados:', product.attributes);
        Object.entries(product.attributes).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 1) {
            console.log(`  - ${key}: ${values.join(', ')} (${values.length} opções → INDICA VARIAÇÕES)`);
          }
        });
      }
      
    } catch (variantError) {
      console.error('❌ Erro ao carregar variações:', variantError);
      product.product_options = [];
      product.product_variants = [];
      product.has_variants = false;
    }
    
    await db.close();
    return json({ 
      success: true, 
      data: product 
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return json({ 
      success: false, 
      error: 'Erro ao buscar produto' 
    }, { status: 500 });
  }
};

// PUT - Atualizar produto por ID
export const PUT: RequestHandler = withAdminAuth(async ({ params, request, platform, data }: any) => {
  try {
    const user = authUtils.getUser({ data });
    const db = getDatabase(platform);
    const { id } = params;
    const requestData = await request.json();
    
    console.log('Atualizando produto:', id);
    
    // 🎯 CAPTURAR ESTADO ORIGINAL SIMPLES PARA HISTÓRICO (SEM JOINS PESADOS)
    const originalProductQuery = `
      SELECT 
        p.*,
        -- Buscar categoria e marca por ID (mais rápido)
        (SELECT name FROM categories WHERE id = (
          SELECT category_id FROM product_categories WHERE product_id = p.id AND is_primary = true LIMIT 1
        )) as category_name,
        (SELECT name FROM brands WHERE id = p.brand_id) as brand_name,
        (SELECT company_name FROM sellers WHERE id = p.seller_id) as seller_name
      FROM products p
      WHERE p.id = $1
    `;
    
    const originalResult = await db.query(originalProductQuery, [id]);
    const originalProduct = originalResult[0];
    
    if (!originalProduct) {
      await db.close();
      return json({ 
        success: false, 
        error: 'Produto não encontrado',
        message: 'Produto não encontrado' 
      }, { status: 404 });
    }
    
    console.log('📋 Estado original capturado do banco:', {
      id: originalProduct.id,
      name: originalProduct.name,
      quantity: originalProduct.quantity,
      price: originalProduct.price,
      category_id: originalProduct.category_id,
      total_fields: Object.keys(originalProduct).length
    });
    
    // 🔧 NORMALIZAR ATTRIBUTES ANTES DE SALVAR
    let normalizedAttributes: Record<string, string[]> = {};
    if (requestData.attributes && typeof requestData.attributes === 'object') {
      for (const [key, value] of Object.entries(requestData.attributes)) {
        if (Array.isArray(value)) {
          normalizedAttributes[key] = value.map(v => String(v)); // ✅ Já é array
        } else if (typeof value === 'string') {
          normalizedAttributes[key] = [value]; // ✅ String → Array  
        } else {
          normalizedAttributes[key] = [String(value)]; // ✅ Outros → Array
        }
      }
      console.log('🔧 Attributes normalizados antes de salvar:', normalizedAttributes);
    }
    
    // Atualizar produto - apenas campos básicos existentes
    const result = await db.query`
      UPDATE products SET
        name = ${requestData.name},
        slug = ${requestData.slug || requestData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')},
        sku = ${requestData.sku},
        description = ${requestData.description || ''},
        short_description = ${requestData.short_description || null},
        price = ${requestData.price},
        original_price = ${requestData.original_price || null},
        cost = ${requestData.cost || 0},
        quantity = ${requestData.quantity || 0},
        model = ${requestData.model || null},
        barcode = ${requestData.barcode || null},
        condition = ${requestData.condition || 'new'},
        weight = ${requestData.weight || null},
        height = ${requestData.height || null},
        width = ${requestData.width || null},
        length = ${requestData.length || null},
        brand_id = ${requestData.brand_id ? (typeof requestData.brand_id === 'string' ? requestData.brand_id : String(requestData.brand_id)) : null},
        seller_id = ${requestData.seller_id ? (typeof requestData.seller_id === 'string' ? requestData.seller_id : String(requestData.seller_id)) : null},
        status = ${requestData.status || 'active'},
        is_active = ${requestData.is_active !== false},
        featured = ${requestData.featured === true},
        track_inventory = ${requestData.track_inventory !== false},
        allow_backorder = ${requestData.allow_backorder === true},
        stock_location = ${requestData.stock_location || null},
        currency = ${requestData.currency || 'BRL'},
        tags = ${requestData.tags || []},
        meta_title = ${requestData.meta_title || null},
        meta_description = ${requestData.meta_description || null},
        meta_keywords = ${requestData.meta_keywords || []},
        published_at = ${requestData.published_at || null},
        low_stock_alert = ${requestData.low_stock_alert || null},
        has_free_shipping = ${requestData.has_free_shipping === true},
        ncm_code = ${requestData.ncm_code || null},
        gtin = ${requestData.gtin || null},
        origin = ${requestData.origin || '0'},
        allow_reviews = ${requestData.allow_reviews !== false},
        age_restricted = ${requestData.age_restricted || false},
        is_customizable = ${requestData.is_customizable || false},
        attributes = ${JSON.stringify(normalizedAttributes)},
        specifications = ${JSON.stringify(requestData.specifications || {})},
        manufacturing_country = ${getCountryCode(requestData.manufacturing_country)},
        tax_class = ${requestData.tax_class || 'standard'},
        requires_shipping = ${requestData.requires_shipping !== false},
        is_digital = ${requestData.is_digital || false},
        care_instructions = ${requestData.care_instructions || null},
        manual_link = ${requestData.manual_link || null},
        internal_notes = ${requestData.internal_notes || null},
        delivery_days = ${requestData.delivery_days_min || requestData.delivery_days_max || null},
        seller_state = ${requestData.seller_state || null},
        seller_city = ${requestData.seller_city || null},
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *`;
    
    if (!result[0]) {
      await db.close();
      return json({ 
        success: false, 
        error: 'Produto não encontrado',
        message: 'Produto não encontrado' 
      }, { status: 404 });
    }
    
    console.log('✅ Produto atualizado na tabela products');

    // Atualizar categorias (múltiplas)
    if (data.category_ids && Array.isArray(data.category_ids)) {
      // Remover categorias antigas
      await db.query`DELETE FROM product_categories WHERE product_id = ${id}::uuid`;
      
      // Inserir novas categorias
      if (data.category_ids.length > 0) {
        const primaryCategoryId = data.primary_category_id || data.category_ids[0];
        
        for (const categoryId of data.category_ids) {
          // 🔧 CORREÇÃO: Garantir que categoryId seja string UUID
          const categoryIdStr = typeof categoryId === 'string' 
            ? categoryId 
            : String(categoryId);
            
          await db.query`
            INSERT INTO product_categories (product_id, category_id, is_primary)
            VALUES (${id}::uuid, ${categoryIdStr}::uuid, ${categoryId === primaryCategoryId})
            ON CONFLICT (product_id, category_id) DO UPDATE
            SET is_primary = ${categoryId === primaryCategoryId}
          `;
        }
      }
    } else if (data.category_id) {
      // Suporte para categoria única (compatibilidade)
      await db.query`DELETE FROM product_categories WHERE product_id = ${id}::uuid`;
      
      // 🔧 CORREÇÃO: Garantir que category_id seja string UUID
      const categoryIdStr = typeof data.category_id === 'string' 
        ? data.category_id 
        : String(data.category_id);
        
      await db.query`
        INSERT INTO product_categories (product_id, category_id, is_primary)
        VALUES (${id}::uuid, ${categoryIdStr}::uuid, true)
        ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary = true
      `;
    }
    
    // Atualizar produtos relacionados
    if (data.related_products && Array.isArray(data.related_products)) {
      await db.query`DELETE FROM product_related WHERE product_id = ${id}::uuid`;
      
      for (let i = 0; i < data.related_products.length; i++) {
        // 🔧 CORREÇÃO: Garantir que related_product_id seja string UUID
        const relatedProductId = data.related_products[i];
        const relatedProductIdStr = typeof relatedProductId === 'string' 
          ? relatedProductId 
          : (typeof relatedProductId === 'object' && relatedProductId.id 
            ? relatedProductId.id 
            : String(relatedProductId));
            
        await db.query`
          INSERT INTO product_related (product_id, related_product_id, position)
          VALUES (${id}::uuid, ${relatedProductIdStr}::uuid, ${i})
        `;
      }
    }
    
    // Atualizar produtos upsell
    if (data.upsell_products && Array.isArray(data.upsell_products)) {
      await db.query`DELETE FROM product_upsells WHERE product_id = ${id}::uuid`;
      
      for (let i = 0; i < data.upsell_products.length; i++) {
        // 🔧 CORREÇÃO: Garantir que upsell_product_id seja string UUID
        const upsellProductId = data.upsell_products[i];
        const upsellProductIdStr = typeof upsellProductId === 'string' 
          ? upsellProductId 
          : (typeof upsellProductId === 'object' && upsellProductId.id 
            ? upsellProductId.id 
            : String(upsellProductId));
            
        await db.query`
          INSERT INTO product_upsells (product_id, upsell_product_id, position)
          VALUES (${id}::uuid, ${upsellProductIdStr}::uuid, ${i})
        `;
      }
    }
    
    // Atualizar downloads (para produtos digitais)
    if (data.download_files && Array.isArray(data.download_files)) {
      await db.query`DELETE FROM product_downloads WHERE product_id = ${id}::uuid`;
      
      for (let i = 0; i < data.download_files.length; i++) {
        const file = data.download_files[i];
        await db.query`
          INSERT INTO product_downloads (product_id, name, file_url, position)
          VALUES (${id}::uuid, ${file.name}, ${file.url}, ${i})
        `;
      }
    }
    
    // Atualizar imagens se fornecidas
    if (data.images && Array.isArray(data.images)) {
      // Remover imagens antigas
      await db.query`DELETE FROM product_images WHERE product_id = ${id}::uuid`;
      
      // Inserir novas imagens
      for (let i = 0; i < data.images.length; i++) {
        const imageUrl = data.images[i];
        const isPrimary = i === 0; // Primeira imagem é sempre a principal
        
        await db.query`
          INSERT INTO product_images (product_id, url, position, is_primary, alt_text)
          VALUES (${id}::uuid, ${imageUrl}, ${i}, ${isPrimary}, ${'Imagem do produto'})
        `;
      }
    }
    
    // ✅ SALVAR VARIAÇÕES DO PRODUTO
    if (data.product_options && Array.isArray(data.product_options)) {
      console.log(`🎨 Salvando ${data.product_options.length} opções de variação...`);
      
      // 1. Remover variações antigas
      await db.query`DELETE FROM variant_option_values WHERE variant_id IN (
        SELECT id FROM product_variants WHERE product_id = ${id}::uuid
      )`;
      await db.query`DELETE FROM product_variants WHERE product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_option_values WHERE option_id IN (
        SELECT id FROM product_options WHERE product_id = ${id}::uuid
      )`;
      await db.query`DELETE FROM product_options WHERE product_id = ${id}::uuid`;
      
      // 2. Salvar product_options e seus valores
      const optionMapping = new Map(); // Mapear IDs temporários para IDs reais
      
      for (const option of data.product_options) {
        if (option.name && option.values && Array.isArray(option.values)) {
          // Inserir opção
          const optionResult = await db.query`
            INSERT INTO product_options (product_id, name, position)
            VALUES (${id}::uuid, ${option.name}, ${option.position || 0})
            RETURNING id
          `;
          
          const optionId = optionResult[0].id;
          optionMapping.set(option.name, { id: optionId, values: new Map() });
          
          // Inserir valores da opção
          for (let i = 0; i < option.values.length; i++) {
            const value = option.values[i];
            if (value.value) {
              const valueResult = await db.query`
                INSERT INTO product_option_values (option_id, value, position)
                VALUES (${optionId}, ${value.value}, ${value.position || i})
                RETURNING id
              `;
              
              optionMapping.get(option.name).values.set(value.value, valueResult[0].id);
            }
          }
          
          console.log(`✅ Opção "${option.name}" salva com ${option.values.length} valores`);
        }
      }
      
      // 3. Salvar product_variants se existirem
      if (data.product_variants && Array.isArray(data.product_variants)) {
        console.log(`🎨 Salvando ${data.product_variants.length} variações...`);
        
        for (const variant of data.product_variants) {
          if (variant.sku && variant.option_values) {
            // Inserir variante
            const variantResult = await db.query`
              INSERT INTO product_variants (
                product_id, sku, price, original_price, cost, quantity, 
                weight, barcode, is_active
              )
              VALUES (
                ${id}::uuid, ${variant.sku}, ${variant.price || data.price}, 
                ${variant.original_price || data.original_price || null}, 
                ${variant.cost || data.cost || 0}, ${variant.quantity || 0},
                ${variant.weight || data.weight || null}, ${variant.barcode || null}, 
                ${variant.is_active !== false}
              )
              RETURNING id
            `;
            
            const variantId = variantResult[0].id;
            
            // Associar variante com valores das opções
            for (const [optionName, optionValue] of Object.entries(variant.option_values)) {
              const optionData = optionMapping.get(optionName);
              if (optionData && optionData.values.has(optionValue)) {
                const optionValueId = optionData.values.get(optionValue);
                
                await db.query`
                  INSERT INTO variant_option_values (variant_id, option_value_id)
                  VALUES (${variantId}, ${optionValueId})
                `;
              }
            }
          }
        }
        
        console.log(`✅ ${data.product_variants.length} variações salvas com sucesso!`);
      }
    }
    
    // 🎯 REGISTRAR HISTÓRICO OTIMIZADO (APENAS TABELA PRODUCTS)
    try {
      console.log('📊 Verificando alterações para histórico...');
      
      // Buscar apenas o estado final da tabela products (sem JOINs)
      const finalResult = await db.query(`SELECT * FROM products WHERE id = $1`, [id]);
      const finalProduct = finalResult[0];
      
      if (finalProduct && originalProduct) {
        // Comparar apenas campos da tabela products (mais eficiente)
        const changes = await compareAndLogHistory(originalProduct, finalProduct, id, db, user);
        
        if (changes.totalChanges > 0) {
          console.log(`✅ Histórico registrado: ${changes.summary}`);
        } else {
          console.log('ℹ️ Nenhuma alteração detectada');
        }
      }
    } catch (historyError) {
      console.error('⚠️ Erro ao registrar histórico:', historyError);
      // Não falhar a operação por causa do histórico
    }
    
    await db.close();
    return json({ 
      success: true, 
      data: result[0],
      message: 'Produto atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return json({ 
      success: false, 
      error: 'Erro ao atualizar produto',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      details: error 
    }, { status: 500 });
  }
});

// DELETE - Excluir produto por ID
export const DELETE: RequestHandler = async ({ params, url, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    // Verificar se é hard delete (query parameter ?force=true)
    const forceDelete = url.searchParams.get('force') === 'true';
    
    if (forceDelete) {
      console.log(`🗑️ Hard delete solicitado para produto: ${id}`);
      
      // Remover dependências primeiro
      await db.query`DELETE FROM product_categories WHERE product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_images WHERE product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_related WHERE product_id = ${id}::uuid OR related_product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_upsells WHERE product_id = ${id}::uuid OR upsell_product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_downloads WHERE product_id = ${id}::uuid`;
      
      // Remover produto definitivamente
      const result = await db.query`
        DELETE FROM products 
        WHERE id = ${id}::uuid
        RETURNING name, sku
      `;
      
      if (result[0]) {
        console.log(`✅ Produto removido definitivamente: ${result[0].name} (${result[0].sku})`);
        await db.close();
        return json({
          success: true,
          message: `Produto "${result[0].name}" removido definitivamente do banco de dados!`
        });
      } else {
        await db.close();
        return json({ 
          success: false, 
          error: 'Produto não encontrado' 
        }, { status: 404 });
      }
    } else {
      // Soft delete padrão - apenas marcar como arquivado
      const result = await db.query`
        UPDATE products 
        SET is_active = false, status = 'archived', updated_at = NOW()
        WHERE id = ${id}::uuid
        RETURNING name, sku
      `;
      
      if (result[0]) {
        console.log(`📦 Produto arquivado: ${result[0].name} (${result[0].sku})`);
        await db.close();
        return json({
          success: true,
          message: `Produto "${result[0].name}" arquivado com sucesso!`
        });
      } else {
        await db.close();
        return json({ 
          success: false, 
          error: 'Produto não encontrado' 
        }, { status: 404 });
      }
    }
    
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return json({
      success: false,
      error: 'Erro ao excluir produto'
    }, { status: 500 });
  }
}; 