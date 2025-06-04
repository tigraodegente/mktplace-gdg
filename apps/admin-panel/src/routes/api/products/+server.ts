import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

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

// GET - Listar produtos
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const category = url.searchParams.get('category') || 'all';
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const vendorId = locals.user?.role === 'vendor' ? locals.user.seller_id : url.searchParams.get('vendor_id');
    
    // Validar campos de ordenação
    const validSortFields = ['name', 'price', 'quantity', 'status', 'created_at', 'category_id', 'brand_id'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Sempre excluir produtos arquivados, exceto se explicitamente solicitado
    if (status !== 'archived') {
      conditions.push(`p.status != 'archived'`);
    }
    
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex + 1} OR p.description ILIKE $${paramIndex + 2})`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }
    
    if (status !== 'all') {
      const statusMap: Record<string, string> = {
        'active': 'p.is_active = true AND p.quantity > 0',
        'inactive': 'p.is_active = false AND p.status != \'archived\'',
        'pending': 'p.status = \'pending\'',
        'draft': 'p.status = \'draft\'',
        'low_stock': 'p.quantity < 10 AND p.quantity > 0',
        'out_of_stock': 'p.quantity = 0',
        'archived': 'p.status = \'archived\''
      };
      
      if (statusMap[status]) {
        conditions.push(statusMap[status]);
      }
    }
    
    if (category !== 'all') {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (vendorId) {
      conditions.push(`p.seller_id = $${paramIndex}`);
      params.push(vendorId);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      WITH product_stats AS (
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.sku,
          p.price,
          p.original_price,
          p.cost,
          p.quantity as stock,
          p.brand_id,
          p.seller_id,
          p.description,
          p.is_active,
          p.featured,
          p.status,
          p.rating_average,
          p.rating_count,
          p.sales_count,
          p.created_at,
          p.updated_at,
          -- Categoria primária
          pc_primary.category_id,
          c.name as category_name,
          c.slug as category_slug,
          b.name as brand_name,
          s.company_name as vendor_name,
          COUNT(*) OVER() as total_count,
          (
            SELECT url 
            FROM product_images pi 
            WHERE pi.product_id = p.id 
            ORDER BY pi.position ASC 
            LIMIT 1
          ) as image
        FROM products p
        LEFT JOIN product_categories pc_primary ON pc_primary.product_id = p.id AND pc_primary.is_primary = true
        LEFT JOIN categories c ON c.id = pc_primary.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        ${whereClause}
        ORDER BY p.${safeSortBy} ${safeSortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT * FROM product_stats
    `;
    
    params.push(limit, offset);
    
    // Executar query com parâmetros como array
    const products = await db.query(query, params);
    const totalCount = products[0]?.total_count || 0;
    
    // Buscar estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE p.is_active = true AND p.quantity > 0 AND p.status != 'archived') as active,
        COUNT(*) FILTER (WHERE p.is_active = false AND p.status != 'archived') as inactive, 
        COUNT(*) FILTER (WHERE p.status = 'pending') as pending,
        COUNT(*) FILTER (WHERE p.quantity < 10 AND p.quantity > 0 AND p.status != 'archived') as low_stock,
        COUNT(*) FILTER (WHERE p.status != 'archived') as total
      FROM products p
      ${vendorId ? `WHERE p.seller_id = $1` : ''}
    `;
    
    // Executar query de stats com ou sem parâmetros
    const statsResult = vendorId 
      ? await db.query(statsQuery, [vendorId])
      : await db.query(statsQuery);
    
    const stats = statsResult[0];
    
    await db.close();
    
    return json({
      success: true,
      data: {
        products: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : undefined,
          cost: p.cost ? Number(p.cost) : undefined,
          stock: p.stock || 0,
          category: p.category_name || 'Sem categoria',
          categorySlug: p.category_slug,
          brand: p.brand_name,
          vendor: p.vendor_name || 'Loja',
          image: p.image || `/api/placeholder/200/200?text=${encodeURIComponent(p.name)}`,
          status: p.is_active ? (p.stock > 0 ? 'active' : 'out_of_stock') : (p.status || 'inactive'),
          rating: p.rating_average ? Number(p.rating_average) : undefined,
          reviews: p.rating_count || 0,
          sales: p.sales_count || 0,
          featured: p.featured || false,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          total: stats.total || 0,
          active: stats.active || 0,
          pending: stats.pending || 0,
          lowStock: stats.low_stock || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return json({
      success: false,
      error: 'Erro ao buscar produtos'
    }, { status: 500 });
  }
};

// POST - Criar produto
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    console.log('Dados recebidos para criar produto:', data);
    
    // Validar campos obrigatórios
    if (!data.name || !data.sku || !data.price) {
      await db.close();
      return json({ 
        success: false, 
        error: 'Campos obrigatórios: name, sku, price',
        message: 'Campos obrigatórios: name, sku, price' 
      }, { status: 400 });
    }
    
    // NOVO: Verificar se existe produto arquivado com mesmo SKU ou slug
    const archivedProduct = await db.query`
      SELECT id, sku, slug, status 
      FROM products 
      WHERE (sku = ${data.sku} OR slug = ${data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')})
      AND status = 'archived'
      LIMIT 1
    `;
    
    if (archivedProduct.length > 0) {
      console.log(`🔄 Produto arquivado encontrado com SKU/slug duplicado: ${archivedProduct[0].id}`);
      
      // Adicionar timestamp ao SKU e slug do produto arquivado para liberar o original
      const timestamp = Date.now();
      await db.query`
        UPDATE products 
        SET 
          sku = sku || '_archived_' || ${timestamp}::text,
          slug = slug || '-archived-' || ${timestamp}::text,
          updated_at = NOW()
        WHERE id = ${archivedProduct[0].id}::uuid
      `;
      
      console.log(`✅ SKU e slug do produto arquivado foram modificados para liberar: ${data.sku}`);
    }
    
    // Criar produto (sem category_id)
    const result = await db.query`
      INSERT INTO products (
        name, slug, sku, barcode, model,
        description, short_description,
        price, original_price, cost, currency,
        quantity, stock_location, track_inventory, allow_backorder,
        brand_id, seller_id,
        status, is_active, featured, condition,
        weight, height, width, length,
        has_free_shipping, delivery_days,
        seller_state, seller_city,
        meta_title, meta_description, meta_keywords,
        tags, videos,
        low_stock_alert, ncm_code, gtin, origin,
        care_instructions, manual_link, internal_notes,
        allow_reviews, age_restricted, is_customizable,
        attributes, specifications, manufacturing_country, tax_class,
        requires_shipping, is_digital
      ) VALUES (
        ${data.name},
        ${data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')},
        ${data.sku},
        ${data.barcode || null},
        ${data.model || null},
        ${data.description || ''},
        ${data.short_description || null},
        ${data.price},
        ${data.original_price || null},
        ${data.cost || 0},
        ${data.currency || 'BRL'},
        ${data.quantity || 0},
        ${data.stock_location || null},
        ${data.track_inventory !== false},
        ${data.allow_backorder || false},
        ${data.brand_id || null},
        ${data.seller_id || null},
        ${data.status || 'draft'},
        ${data.is_active || false},
        ${data.featured || false},
        ${data.condition || 'new'},
        ${data.weight || null},
        ${data.height || null},
        ${data.width || null},
        ${data.length || null},
        ${data.has_free_shipping || false},
        ${data.delivery_days_min || data.delivery_days_max || null},
        ${data.seller_state || null},
        ${data.seller_city || null},
        ${data.meta_title || null},
        ${data.meta_description || null},
        ${data.meta_keywords || []},
        ${data.tags || []},
        ${data.videos || []},
        ${data.low_stock_alert || null},
        ${data.ncm_code || null},
        ${data.gtin || null},
        ${data.origin || '0'},
        ${data.care_instructions || null},
        ${data.manual_link || null},
        ${data.internal_notes || null},
        ${data.allow_reviews !== false},
        ${data.age_restricted || false},
        ${data.is_customizable || false},
        ${JSON.stringify(data.attributes || {})},
        ${JSON.stringify(data.specifications || {})},
        ${getCountryCode(data.manufacturing_country)},
        ${data.tax_class || 'standard'},
        ${data.requires_shipping !== false},
        ${data.is_digital || false}
      ) RETURNING *
    `;
    
    const newProduct = result[0];
    console.log('Produto criado:', newProduct);
    
    // Adicionar categorias usando a nova tabela N:N
    if (data.category_ids && Array.isArray(data.category_ids) && data.category_ids.length > 0) {
      // Primeira categoria é a primária por padrão
      const primaryCategoryId = data.primary_category_id || data.category_ids[0];
      
      for (let i = 0; i < data.category_ids.length; i++) {
        const categoryId = data.category_ids[i];
        const isPrimary = categoryId === primaryCategoryId;
        
        await db.query`
          INSERT INTO product_categories (product_id, category_id, is_primary)
          VALUES (${newProduct.id}, ${categoryId}, ${isPrimary})
        `;
      }
    } else if (data.category_id) {
      // Compatibilidade com código antigo (categoria única)
      await db.query`
        INSERT INTO product_categories (product_id, category_id, is_primary)
        VALUES (${newProduct.id}, ${data.category_id}, true)
      `;
    }
    
    // Adicionar imagens se fornecidas
    if (data.images && Array.isArray(data.images) && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        await db.query`
          INSERT INTO product_images (product_id, url, position)
          VALUES (${newProduct.id}, ${data.images[i]}, ${i})
        `;
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: newProduct
    });
    
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao criar produto',
      message: error instanceof Error ? error.message : 'Erro ao criar produto'
    }, { status: 500 });
  }
};

// PUT - Atualizar produto
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    console.log('Dados recebidos para atualizar produto:', data);
    
    if (!data.id) {
      await db.close();
      return json({
        success: false,
        error: 'ID do produto é obrigatório'
      }, { status: 400 });
    }
    
    // Atualizar produto
    const result = await db.query`
      UPDATE products SET
        name = ${data.name},
        slug = ${data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')},
        sku = ${data.sku},
        description = ${data.description || ''},
        short_description = ${data.short_description || null},
        price = ${data.price},
        original_price = ${data.originalPrice || data.original_price || null},
        cost = ${data.cost || 0},
        quantity = ${data.stock || data.quantity || 0},
        category_id = ${data.categoryId || data.category_id || null},
        brand_id = ${data.brandId || data.brand_id || null},
        tags = ${data.tags || []},
        videos = ${data.videos || []},
        status = ${data.status || 'active'},
        is_active = ${data.is_active !== false},
        featured = ${data.featured || false},
        weight = ${data.weight || null},
        height = ${data.height || null},
        width = ${data.width || null},
        length = ${data.length || null},
        barcode = ${data.barcode || null},
        model = ${data.model || null},
        condition = ${data.condition || 'new'},
        has_free_shipping = ${data.has_free_shipping || false},
        delivery_days_min = ${data.delivery_days_min || null},
        delivery_days_max = ${data.delivery_days_max || null},
        meta_title = ${data.meta_title || data.seo?.title || null},
        meta_description = ${data.meta_description || data.seo?.description || null},
        meta_keywords = ${data.meta_keywords || data.seo?.keywords || []},
        low_stock_alert = ${data.low_stock_alert || null},
        ncm_code = ${data.ncm_code || null},
        gtin = ${data.gtin || null},
        origin = ${data.origin || '0'},
        care_instructions = ${data.care_instructions || null},
        manual_link = ${data.manual_link || null},
        internal_notes = ${data.internal_notes || null},
        allow_reviews = ${data.allow_reviews !== false},
        age_restricted = ${data.age_restricted || false},
        is_customizable = ${data.is_customizable || false},
        updated_at = NOW()
      WHERE id = ${data.id}
      RETURNING *
    `;
    
    const updatedProduct = result[0];
    console.log('Produto atualizado:', updatedProduct);
    
    // Atualizar imagens se fornecidas
    if (data.images && Array.isArray(data.images)) {
      // Remover imagens antigas
      await db.query`DELETE FROM product_images WHERE product_id = ${data.id}`;
      
      // Inserir novas imagens
      if (data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          await db.query`
            INSERT INTO product_images (product_id, url, position)
            VALUES (${data.id}, ${data.images[i]}, ${i})
          `;
        }
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: updatedProduct
    });
    
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar produto',
      message: error instanceof Error ? error.message : 'Erro ao atualizar produto'
    }, { status: 500 });
  }
};

// DELETE - Excluir produto(s)
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return json({
        success: false,
        error: 'IDs dos produtos são obrigatórios'
      }, { status: 400 });
    }
    
    // Soft delete - apenas marcar como inativo
    await db.query`
      UPDATE products 
      SET is_active = false, status = 'archived', updated_at = NOW()
      WHERE id = ANY(${ids})
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: `${ids.length} produto(s) arquivado(s) com sucesso`
      }
    });
    
  } catch (error) {
    console.error('Error deleting products:', error);
    return json({
      success: false,
      error: 'Erro ao excluir produtos'
    }, { status: 500 });
  }
}; 