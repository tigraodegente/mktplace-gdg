import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
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

// GET - Listar produtos (sem middleware JWT)
export const GET: RequestHandler = async ({ request }) => {
  try {
    console.log('🔌 Dev: NEON - Buscando produtos');
    
    const url = new URL(request.url);
    const db = getDatabase();
    
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
    
    console.log(`📊 Listando produtos - page: ${page}, limit: ${limit}, search: "${search}", status: "${status}"`);
    
    // ✅ CORREÇÃO: Mapeamento correto dos campos de ordenação
    const validSortFields = ['name', 'price', 'quantity', 'status', 'created_at', 'is_active'];
    let orderBy = 'p.created_at';
    
    // Mapear campos para os nomes corretos na query
    if (validSortFields.includes(sortBy)) {
      const sortFieldMap: Record<string, string> = {
        'name': 'p.name', // Simplificado para evitar problemas de sintaxe
        'price': 'p.price', 
        'quantity': 'p.quantity', // ✅ Campo correto (não renomeado)
        'status': 'p.is_active',   // ✅ Usar is_active para status
        'created_at': 'p.created_at',
        'is_active': 'p.is_active'
      };
      orderBy = sortFieldMap[sortBy] || 'p.created_at';
    }
    
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // ✅ Ordenação aplicada com sucesso
    
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
    if (categories) {
      const categoryIds = categories.split(',').filter(id => id.trim());
      if (categoryIds.length > 0) {
        const categoryPlaceholders = categoryIds.map((_, index) => `$${paramIndex + index}`).join(',');
        conditions.push(`p.id IN (
          SELECT DISTINCT pc.product_id 
          FROM product_categories pc 
          WHERE pc.category_id IN (${categoryPlaceholders})
        )`);
        params.push(...categoryIds);
        paramIndex += categoryIds.length;
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
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query com contagem simplificada para evitar erros
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
        COALESCE(b.name, 'Sem marca') as brand_name,
        COALESCE(c.name, 'Sem categoria') as category_name,
        c.id as category_id,
        '[]'::json as images,
        COUNT(*) OVER() as total_count
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN product_categories pc ON pc.product_id = p.id AND pc.is_primary = true
      LEFT JOIN categories c ON c.id = pc.category_id
      ${whereClause}
      ORDER BY ${orderBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    // Executar query
    const products = await db.query(query, params);
    const totalCount = products[0]?.total_count || 0;
    
    // Buscar imagens dos produtos se necessário
    const productIds = products.map(p => p.id);
    let productImages: Record<string, string[]> = {};
    
    if (productIds.length > 0) {
      try {
        const imagePlaceholders = productIds.map((_, index) => `$${index + 1}`).join(',');
        const imageQuery = `
          SELECT product_id, url 
          FROM product_images 
          WHERE product_id IN (${imagePlaceholders})
          ORDER BY position
        `;
        const imageResults = await db.query(imageQuery, productIds);
        
        // Organizar imagens por produto
        imageResults.forEach((img: any) => {
          if (!productImages[img.product_id]) {
            productImages[img.product_id] = [];
          }
          productImages[img.product_id].push(img.url);
        });
      } catch (imageError) {
        console.warn('Erro ao buscar imagens dos produtos:', imageError);
      }
    }
    
    const response = {
      success: true,
      data: products.map((p: any) => {
        // Usar imagens carregadas separadamente
        const productImageUrls = productImages[p.id] || [];
        
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
          image: productImageUrls.length > 0 ? productImageUrls[0] : `/api/placeholder/200/200?text=${encodeURIComponent(p.name)}`,
          images: productImageUrls,
          is_active: Boolean(p.is_active),
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
};

// POST - Criar produto (sem middleware JWT)
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    console.log('🔌 Dev: NEON - Criando produto:', body.name);
    
    const db = getDatabase();
    
    // Validar campos obrigatórios
    if (!body.name || !body.sku || !body.price) {
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
      body.is_active !== false,
      body.status || 'draft'
    ]);
    
    const newProduct = result[0];
    console.log(`✅ Produto criado com sucesso: ${newProduct.id}`);
    
    return json({
      success: true,
      data: newProduct,
      meta: {
        timestamp: new Date().toISOString(),
        source: 'admin-panel'
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
};

// PUT - Atualizar produto (sem middleware JWT)
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const db = getDatabase();
    const data = await request.json();
    
    console.log('🔌 Dev: NEON - Atualizando produto:', data.id);
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID do produto é obrigatório'
      }, { status: 400 });
    }
    
    // Atualizar produto
    const result = await db.query(`
      UPDATE products SET
        name = $1,
        slug = $2,
        sku = $3,
        description = $4,
        price = $5,
        original_price = $6,
        cost = $7,
        quantity = $8,
        is_active = $9,
        featured = $10,
        status = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      data.name,
      data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      data.sku,
      data.description || '',
      data.price,
      data.originalPrice || data.original_price || null,
      data.cost || 0,
      data.stock || data.quantity || 0,
      data.is_active !== false,
      data.featured || false,
      data.status || 'active',
      data.id
    ]);
    
    const updatedProduct = result[0];
    console.log('✅ Produto atualizado:', updatedProduct?.id);
    
    // Atualizar imagens se fornecidas
    if (data.images && Array.isArray(data.images)) {
      // Remover imagens antigas
      await db.query('DELETE FROM product_images WHERE product_id = $1', [data.id]);
      
      // Inserir novas imagens
      if (data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          await db.query(`
            INSERT INTO product_images (product_id, url, position)
            VALUES ($1, $2, $3)
          `, [data.id, data.images[i], i]);
        }
      }
    }
    
    return json({
      success: true,
      data: updatedProduct
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar produto'
    }, { status: 500 });
  }
};

// DELETE - Excluir produto(s) (sem middleware JWT)
export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const db = getDatabase();
    const { ids } = await request.json();
    
    console.log('🔌 Dev: NEON - Arquivando produtos:', ids);
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return json({
        success: false,
        error: 'IDs dos produtos são obrigatórios'
      }, { status: 400 });
    }
    
    // Soft delete - apenas marcar como inativo
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    await db.query(`
      UPDATE products 
      SET is_active = false, status = 'archived', updated_at = NOW()
      WHERE id IN (${placeholders})
    `, ids);
    
    console.log(`✅ ${ids.length} produto(s) arquivado(s) com sucesso`);
    
    return json({
      success: true,
      data: {
        message: `${ids.length} produto(s) arquivado(s) com sucesso`
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao arquivar produtos:', error);
    return json({
      success: false,
      error: 'Erro ao excluir produtos'
    }, { status: 500 });
  }
}; 