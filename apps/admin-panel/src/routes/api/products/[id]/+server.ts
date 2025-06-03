import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Buscar produto por ID
export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    const query = `
      SELECT 
        p.*,
        c.name as category_name,
        b.name as brand_name,
        s.company_name as vendor_name,
        COALESCE(
          json_agg(
            json_build_object('id', pi.id, 'url', pi.url, 'position', pi.position)
            ORDER BY pi.position
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) as images
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN sellers s ON s.id = p.seller_id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.name, b.name, s.company_name
    `;
    
    const result = await db.query(query, id);
    
    if (result.length === 0) {
      await db.close();
      return json({
        success: false,
        error: 'Produto não encontrado'
      }, { status: 404 });
    }
    
    await db.close();
    
    return json({
      success: true,
      data: result[0]
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
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    const data = await request.json();
    
    console.log('Atualizando produto:', id, data);
    
    // Atualizar produto
    const result = await db.query`
      UPDATE products SET
        name = ${data.name},
        slug = ${data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')},
        sku = ${data.sku},
        description = ${data.description || ''},
        short_description = ${data.short_description || null},
        price = ${data.price},
        original_price = ${data.original_price || null},
        cost = ${data.cost || 0},
        quantity = ${data.quantity || 0},
        category_id = ${data.category_id || null},
        brand_id = ${data.brand_id || null},
        tags = ${data.tags || []},
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
        meta_title = ${data.meta_title || null},
        meta_description = ${data.meta_description || null},
        meta_keywords = ${data.meta_keywords || []},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      await db.close();
      return json({
        success: false,
        error: 'Produto não encontrado'
      }, { status: 404 });
    }
    
    // Atualizar imagens se fornecidas
    if (data.images && Array.isArray(data.images)) {
      // Remover imagens antigas
      await db.query`DELETE FROM product_images WHERE product_id = ${id}`;
      
      // Inserir novas imagens
      if (data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const image = data.images[i];
          const url = typeof image === 'string' ? image : image.url;
          await db.query`
            INSERT INTO product_images (product_id, url, position)
            VALUES (${id}, ${url}, ${i})
          `;
        }
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: result[0],
      message: 'Produto atualizado com sucesso!'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar produto'
    }, { status: 500 });
  }
};

// DELETE - Excluir produto por ID
export const DELETE: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    // Soft delete - apenas marcar como inativo
    await db.query`
      UPDATE products 
      SET is_active = false, status = 'archived', updated_at = NOW()
      WHERE id = ${id}
    `;
    
    await db.close();
    
    return json({
      success: true,
      message: 'Produto arquivado com sucesso!'
    });
    
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return json({
      success: false,
      error: 'Erro ao excluir produto'
    }, { status: 500 });
  }
}; 