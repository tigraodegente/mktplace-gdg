import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { withAdminAuth, authUtils } from '@mktplace/utils/auth/middleware';
import type { ApiResponse } from '@mktplace/shared-types';

// Tipos locais simples para produtos
interface SimpleProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  originalPrice?: number;
  cost?: number;
  stock: number;
  category: string;
  brand: string;
  vendor: string;
  image: string;
  is_active: boolean; // ✅ ADICIONADO
  status: string;
  rating?: number;
  reviews: number;
  sales: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SimplePaginatedResponse {
  success: boolean;
  data: SimpleProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    timestamp: string;
    source: string;
  };
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

// GET - Listar produtos (COM AUTENTICAÇÃO ADMIN)
export const GET: RequestHandler = withAdminAuth(async ({ request, data, platform }) => {
  try {
    const user = authUtils.getUser({ data });
    console.log(`🔐 Admin ${user?.name} (${user?.id}) acessando produtos`);
    
    const url = new URL(request.url);
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    
    // Novos filtros
    const categories = url.searchParams.get('categories') || '';
    const brand = url.searchParams.get('brand') || '';
    const priceMin = url.searchParams.get('priceMin') || '';
    const priceMax = url.searchParams.get('priceMax') || '';
    
    console.log(`📊 Listando produtos - page: ${page}, limit: ${limit}, search: "${search}", status: "${status}", categories: "${categories}", brand: "${brand}", price: ${priceMin}-${priceMax}`);
    
    // ✅ LOGS DETALHADOS PARA DEBUG DOS FILTROS
    console.log('🔍 [FILTROS DEBUG] Todos os parâmetros recebidos:');
    for (const [key, value] of url.searchParams.entries()) {
      console.log(`  ${key}: "${value}"`);
    }
    
    // ✅ LOG DOS FILTROS CUSTOMIZADOS (usando variáveis já declaradas abaixo)
    console.log('🔍 [FILTROS CUSTOMIZADOS] Verificando se serão processados corretamente...');;
    
    // Validar campos de ordenação
    const validSortFields = ['name', 'price', 'quantity', 'status', 'created_at'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Construir query com filtros
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Sempre excluir produtos arquivados
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
        'inactive': 'p.is_active = false',
        'draft': 'p.status = \'draft\'',
        'out_of_stock': 'p.quantity = 0'
      };
      
      if (statusMap[status]) {
        conditions.push(statusMap[status]);
      }
    }
    
    // Filtro de categorias
    console.log(`🔍 [CATEGORIES] categories="${categories}", será processado:`, !!categories);
    if (categories) {
      const categoryIds = categories.split(',').filter(id => id.trim());
      console.log(`🔍 [CATEGORIES] categoryIds array:`, categoryIds);
      if (categoryIds.length > 0) {
        const categoryPlaceholders = categoryIds.map((_, index) => `$${paramIndex + index}`).join(',');
        conditions.push(`p.id IN (
          SELECT DISTINCT pc.product_id 
          FROM product_categories pc 
          WHERE pc.category_id IN (${categoryPlaceholders})
        )`);
        params.push(...categoryIds);
        paramIndex += categoryIds.length;
        console.log(`✅ [CATEGORIES] Aplicado filtro: ${categoryIds.length} categoria(s) - ${categoryIds.join(', ')}`);
      }
    }
    
    // Filtro de marca
    if (brand && brand !== 'all') {
      conditions.push(`p.brand_id = $${paramIndex}`);
      params.push(brand);
      paramIndex++;
    }
    
    // Filtro de preço mínimo
    if (priceMin) {
      const minPrice = parseFloat(priceMin);
      if (!isNaN(minPrice) && minPrice >= 0) {
        conditions.push(`p.price >= $${paramIndex}`);
        params.push(minPrice);
        paramIndex++;
      }
    }
    
    // Filtro de preço máximo
    if (priceMax) {
      const maxPrice = parseFloat(priceMax);
      if (!isNaN(maxPrice) && maxPrice >= 0) {
        conditions.push(`p.price <= $${paramIndex}`);
        params.push(maxPrice);
        paramIndex++;
      }
    }
    
    // ✅ FILTROS CUSTOMIZADOS ADICIONADOS
    // Filtro de produtos em destaque
    const featured = url.searchParams.get('featured');
    console.log(`🔍 [FEATURED] featured="${featured}", será processado:`, featured && featured !== '');
    if (featured && featured !== '') {
      const isFeatured = featured === 'true';
      conditions.push(`p.featured = $${paramIndex}`);
      params.push(isFeatured);
      paramIndex++;
      console.log(`✅ [FEATURED] Aplicado filtro: featured = ${isFeatured}`);
    }
    
    // Filtro de status do estoque
    const stockStatus = url.searchParams.get('stock_status');
    console.log(`🔍 [STOCK_STATUS] stock_status="${stockStatus}", será processado:`, stockStatus && stockStatus !== '');
    if (stockStatus && stockStatus !== '') {
      switch (stockStatus) {
        case 'in_stock':
          conditions.push(`p.quantity > 5`);
          console.log(`✅ [STOCK_STATUS] Aplicado filtro: in_stock (quantity > 5)`);
          break;
        case 'low_stock':
          conditions.push(`p.quantity > 0 AND p.quantity <= 5`);
          console.log(`✅ [STOCK_STATUS] Aplicado filtro: low_stock (0 < quantity <= 5)`);
          break;
        case 'out_of_stock':
          conditions.push(`p.quantity = 0`);
          console.log(`✅ [STOCK_STATUS] Aplicado filtro: out_of_stock (quantity = 0)`);
          break;
      }
    }
    
    // Filtro de produtos com imagens
    const hasImages = url.searchParams.get('has_images');
    console.log(`🔍 [HAS_IMAGES] has_images="${hasImages}", será processado:`, hasImages && hasImages !== '');
    if (hasImages && hasImages !== '') {
      const shouldHaveImages = hasImages === 'true';
      if (shouldHaveImages) {
        conditions.push(`EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)`);
        console.log(`✅ [HAS_IMAGES] Aplicado filtro: produtos COM imagens`);
      } else {
        conditions.push(`NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id)`);
        console.log(`✅ [HAS_IMAGES] Aplicado filtro: produtos SEM imagens`);
      }
    }
    
    // Filtro por seller
    const seller = url.searchParams.get('seller');
    console.log(`🔍 [SELLER] seller="${seller}", será processado:`, seller && seller !== 'all' && seller !== '');
    if (seller && seller !== 'all' && seller !== '') {
      conditions.push(`p.seller_id = $${paramIndex}`);
      params.push(seller);
      paramIndex++;
      console.log(`✅ [SELLER] Aplicado filtro: seller_id = ${seller}`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // ✅ LOG FINAL DAS CONDIÇÕES E PARÂMETROS
    console.log('🔍 [QUERY FINAL] Condições WHERE:', conditions);
    console.log('🔍 [QUERY FINAL] Parâmetros:', params);
    console.log('🔍 [QUERY FINAL] WHERE clause:', whereClause);
    
    // Query com contagem
    const query = `
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
        b.name as brand_name,
        c.name as category_name,
        c.id as category_id,
        COALESCE(
          json_agg(
            pi.url ORDER BY pi.position
          ) FILTER (WHERE pi.url IS NOT NULL),
          '[]'::json
        ) as images,
        COUNT(*) OVER() as total_count
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN product_categories pc ON pc.product_id = p.id AND pc.is_primary = true
      LEFT JOIN categories c ON c.id = pc.category_id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      ${whereClause}
      GROUP BY p.id, p.name, p.slug, p.sku, p.price, p.original_price, p.cost, p.quantity, 
               p.brand_id, p.seller_id, p.description, p.is_active, p.featured, p.status,
               p.rating_average, p.rating_count, p.sales_count, p.created_at, p.updated_at,
               b.name, c.name, c.id
      ORDER BY p.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    // Log para debug
    console.log('🔍 [API DEBUG] Query:', query.replace(/\s+/g, ' ').trim());
    console.log('🔍 [API DEBUG] Params:', params);
    
    // Executar query
    const products = await db.query(query, params);
    const totalCount = products[0]?.total_count || 0;
    
    // Log específico para verificar campos de data
    if (products[0]) {
      console.log('🔍 [DEBUG DATES] Primeiro produto raw:', {
        id: products[0].id,
        name: products[0].name,
        quantity: products[0].quantity,
        stock: products[0].stock,
        images: products[0].images,
        images_type: typeof products[0].images,
        images_length: products[0].images ? products[0].images.length : 0,
        created_at: products[0].created_at,
        updated_at: products[0].updated_at,
        created_at_type: typeof products[0].created_at,
        updated_at_type: typeof products[0].updated_at
      });
    }
    
    await db.close();
    
    const response: SimplePaginatedResponse = {
      success: true,
      data: products.map((p: any) => {
        // Parse das imagens (vem como JSON string do PostgreSQL)
        let productImages: string[] = [];
        try {
          if (p.images && typeof p.images === 'string') {
            productImages = JSON.parse(p.images);
          } else if (Array.isArray(p.images)) {
            productImages = p.images;
          }
        } catch (error) {
          console.warn('Erro ao parsear imagens do produto:', p.id, error);
          productImages = [];
        }
        
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : undefined,
          cost: p.cost ? Number(p.cost) : undefined,
          stock: p.stock || 0,
          category: p.category_name || 'Sem categoria',
          category_id: p.category_id,
          brand: p.brand_name || 'Sem marca',
          brand_id: p.brand_id,
          vendor: 'Loja',
          image: productImages.length > 0 ? productImages[0] : `/api/placeholder/200/200?text=${encodeURIComponent(p.name)}`,
          images: productImages,
          is_active: Boolean(p.is_active), // ✅ CAMPO CORRIGIDO - incluindo is_active 
          status: p.is_active ? (p.stock > 0 ? 'active' : 'out_of_stock') : (p.status || 'inactive'),
          rating: p.rating_average ? Number(p.rating_average) : undefined,
          reviews: p.rating_count || 0,
          sales: p.sales_count || 0,
          featured: p.featured || false,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        };
      }),
      meta: {
        page,
        limit,
        total: parseInt(totalCount),
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1,
        timestamp: new Date().toISOString(),
        source: 'admin-panel'
      }
    };
    
    console.log(`✅ Retornando ${products.length} produtos (total: ${totalCount})`);
    return json(response);
    
  } catch (error) {
    console.error('❌ Erro ao listar produtos:', error);
    
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
});

// POST - Criar produto (COM AUTENTICAÇÃO ADMIN)
export const POST: RequestHandler = withAdminAuth(async ({ request, data, platform }) => {
  try {
    const user = authUtils.getUser({ data });
    const body = await request.json();
    
    console.log(`🔐 Admin ${user?.name} (${user?.id}) criando produto: ${body.name}`);
    
    const db = getDatabase(platform);
    
    // Validar campos obrigatórios
    if (!body.name || !body.sku || !body.price) {
      await db.close();
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: name, sku, price'
        }
      }, { status: 400 });
    }
    
    // Criar produto
    const result = await db.query(`
      INSERT INTO products (
        name, slug, sku, price, description, quantity, is_active, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) 
      RETURNING *
    `, [
      body.name,
      body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      body.sku,
      body.price,
      body.description || '',
      body.quantity || 0,
      body.is_active || false,
      body.status || 'draft'
    ]);
    
    const newProduct = result[0];
    console.log(`✅ Produto criado com sucesso: ${newProduct.id}`);
    
    await db.close();
    
    return json({
      success: true,
      data: newProduct,
      meta: {
        timestamp: new Date().toISOString(),
        source: 'admin-panel',
        created_by: user?.id
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Erro ao criar produto:', error);
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
});

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