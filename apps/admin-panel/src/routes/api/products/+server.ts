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
    
    console.log(`📊 Listando produtos - page: ${page}, limit: ${limit}, search: "${search}"`);
    
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
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
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
        COUNT(*) OVER() as total_count
      FROM products p
      ${whereClause}
      ORDER BY p.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    // Executar query
    const products = await db.query(query, params);
    const totalCount = products[0]?.total_count || 0;
    
    await db.close();
    
    const response: SimplePaginatedResponse = {
      success: true,
      data: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        cost: p.cost ? Number(p.cost) : undefined,
        stock: p.stock || 0,
        category: 'Sem categoria',
        brand: 'Marca',
        vendor: 'Loja',
        image: `/api/placeholder/200/200?text=${encodeURIComponent(p.name)}`,
        status: p.is_active ? (p.stock > 0 ? 'active' : 'out_of_stock') : (p.status || 'inactive'),
        rating: p.rating_average ? Number(p.rating_average) : undefined,
        reviews: p.rating_count || 0,
        sales: p.sales_count || 0,
        featured: p.featured || false,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      })),
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