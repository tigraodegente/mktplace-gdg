import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

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
    const vendorId = locals.user?.role === 'vendor' ? locals.user.seller_id : url.searchParams.get('vendor_id');
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status !== 'all') {
      const statusMap: Record<string, string> = {
        'active': 'p.is_active = true AND p.quantity > 0',
        'inactive': 'p.is_active = false',
        'pending': 'p.status = \'pending\'',
        'draft': 'p.status = \'draft\'',
        'low_stock': 'p.quantity < 10 AND p.quantity > 0',
        'out_of_stock': 'p.quantity = 0'
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
          p.category_id,
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
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT * FROM product_stats
    `;
    
    params.push(limit, offset);
    
    const products = await db.query(query, ...params);
    const totalCount = products[0]?.total_count || 0;
    
    // Buscar estatísticas gerais
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true AND quantity > 0) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive, 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE quantity < 10 AND quantity > 0) as low_stock,
        COUNT(*) as total
      FROM products p
      ${vendorId ? `WHERE p.seller_id = $1` : ''}
    `;
    
    const [stats] = await db.query(statsQuery, ...(vendorId ? [vendorId] : []));
    
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
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.name || !data.price || !data.sku) {
      return json({
        success: false,
        error: 'Nome, preço e SKU são obrigatórios'
      }, { status: 400 });
    }
    
    // Gerar slug se não fornecido
    const slug = data.slug || data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Verificar SKU duplicado
    const [existing] = await db.query`
      SELECT id FROM products WHERE sku = ${data.sku}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'SKU já existe'
      }, { status: 400 });
    }
    
    // Inserir produto
    const [product] = await db.query`
      INSERT INTO products (
        name, slug, sku, description, 
        price, original_price, cost,
        quantity, category_id, brand_id, seller_id,
        tags, status, is_active, featured,
        weight, dimensions, barcode,
        seo_title, seo_description, seo_keywords
      ) VALUES (
        ${data.name}, ${slug}, ${data.sku}, ${data.description || null},
        ${data.price}, ${data.comparePrice || null}, ${data.cost || null},
        ${data.stock || 0}, ${data.categoryId || null}, ${data.brandId || null}, 
        ${locals.user?.seller_id || data.sellerId || null},
        ${data.tags || []}, ${data.status || 'draft'}, 
        ${data.status === 'active'}, ${data.featured || false},
        ${data.weight || null}, 
        ${data.dimensions ? JSON.stringify(data.dimensions) : null}, 
        ${data.barcode || null},
        ${data.seo?.title || data.name}, 
        ${data.seo?.description || data.description || null},
        ${data.seo?.keywords || null}
      ) RETURNING id
    `;
    
    // Inserir imagens
    if (data.images && data.images.length > 0) {
      const imageValues = data.images.map((url: string, index: number) => ({
        product_id: product.id,
        url,
        position: index,
        alt: data.name
      }));
      
      await db.query`
        INSERT INTO product_images ${db.sql(imageValues)}
      `;
    }
    
    // Inserir variações se houver
    if (data.variations && data.variations.length > 0) {
      for (const variation of data.variations) {
        const [option] = await db.query`
          INSERT INTO product_options (product_id, name)
          VALUES (${product.id}, ${variation.name})
          RETURNING id
        `;
        
        if (variation.options && variation.options.length > 0) {
          const optionValues = variation.options.map((value: string) => ({
            option_id: option.id,
            value
          }));
          
          await db.query`
            INSERT INTO product_option_values ${db.sql(optionValues)}
          `;
        }
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: product.id,
        message: 'Produto criado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating product:', error);
    return json({
      success: false,
      error: 'Erro ao criar produto'
    }, { status: 500 });
  }
};

// PUT - Atualizar produto
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID do produto é obrigatório'
      }, { status: 400 });
    }
    
    // Atualizar produto
    await db.query`
      UPDATE products SET
        name = ${data.name},
        slug = ${data.slug},
        sku = ${data.sku},
        description = ${data.description || null},
        price = ${data.price},
        original_price = ${data.comparePrice || null},
        cost = ${data.cost || null},
        quantity = ${data.stock || 0},
        category_id = ${data.categoryId || null},
        brand_id = ${data.brandId || null},
        tags = ${data.tags || []},
        status = ${data.status || 'draft'},
        is_active = ${data.status === 'active'},
        featured = ${data.featured || false},
        weight = ${data.weight || null},
        dimensions = ${data.dimensions ? JSON.stringify(data.dimensions) : null},
        barcode = ${data.barcode || null},
        seo_title = ${data.seo?.title || data.name},
        seo_description = ${data.seo?.description || data.description || null},
        seo_keywords = ${data.seo?.keywords || null},
        updated_at = NOW()
      WHERE id = ${data.id}
    `;
    
    // Atualizar imagens
    if (data.images) {
      // Remover imagens antigas
      await db.query`DELETE FROM product_images WHERE product_id = ${data.id}`;
      
      // Inserir novas imagens
      if (data.images.length > 0) {
        const imageValues = data.images.map((url: string, index: number) => ({
          product_id: data.id,
          url,
          position: index,
          alt: data.name
        }));
        
        await db.query`INSERT INTO product_images ${db.sql(imageValues)}`;
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Produto atualizado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating product:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar produto'
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