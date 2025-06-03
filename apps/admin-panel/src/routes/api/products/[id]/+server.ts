import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Buscar produto por ID
export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    const [product] = await db.query`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        b.name as brand_name,
        s.company_name as vendor_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN sellers s ON s.id = p.seller_id
      WHERE p.id = ${id}
    `;
    
    if (!product) {
      await db.close();
      return json({
        success: false,
        error: 'Produto não encontrado'
      }, { status: 404 });
    }
    
    // Buscar imagens
    const images = await db.query`
      SELECT url, position
      FROM product_images
      WHERE product_id = ${id}
      ORDER BY position ASC
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        ...product,
        images: images.map((img: any) => img.url),
        category: product.category_name || 'Sem categoria',
        categorySlug: product.category_slug,
        brand: product.brand_name,
        vendor: product.vendor_name || 'Loja'
      }
    });
    
  } catch (error) {
    console.error('Error fetching product:', error);
    return json({
      success: false,
      error: 'Erro ao buscar produto'
    }, { status: 500 });
  }
};

// Atualizar produto
export const PUT: RequestHandler = async ({ params, request }) => {
  const { id } = params;
  
  if (!id) {
    return json({ success: false, error: 'ID não fornecido' }, { status: 400 });
  }
  
  const db = await getDatabase();
  
  try {
    const data = await request.json();
    
    // Remover campos que não devem ser atualizados
    delete data.id;
    delete data.created_at;
    delete data.updated_at;
    delete data.tags_input;
    delete data.meta_keywords_input;
    
    // Atualizar produto
    const result = await db.query`
      UPDATE products 
      SET
        name = ${data.name || null},
        slug = ${data.slug || null},
        sku = ${data.sku || null},
        barcode = ${data.barcode || null},
        model = ${data.model || null},
        description = ${data.description || null},
        short_description = ${data.short_description || null},
        price = ${data.price || 0},
        original_price = ${data.original_price || null},
        cost = ${data.cost || 0},
        currency = ${data.currency || 'BRL'},
        quantity = ${data.quantity || 0},
        stock_location = ${data.stock_location || null},
        track_inventory = ${data.track_inventory || false},
        allow_backorder = ${data.allow_backorder || false},
        category_id = ${data.category_id || null},
        brand_id = ${data.brand_id || null},
        seller_id = ${data.seller_id || null},
        status = ${data.status || 'draft'},
        is_active = ${data.is_active || false},
        featured = ${data.featured || false},
        condition = ${data.condition || 'new'},
        weight = ${data.weight || null},
        height = ${data.height || null},
        width = ${data.width || null},
        length = ${data.length || null},
        has_free_shipping = ${data.has_free_shipping || false},
        delivery_days_min = ${data.delivery_days_min || null},
        delivery_days_max = ${data.delivery_days_max || null},
        seller_state = ${data.seller_state || null},
        seller_city = ${data.seller_city || null},
        meta_title = ${data.meta_title || null},
        meta_description = ${data.meta_description || null},
        meta_keywords = ${data.meta_keywords || []},
        tags = ${data.tags || []},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      await db.close();
      return json({ success: false, error: 'Produto não encontrado' }, { status: 404 });
    }
    
    // Atualizar imagens se fornecidas
    if (data.images && Array.isArray(data.images)) {
      // Remover imagens antigas
      await db.query`DELETE FROM product_images WHERE product_id = ${id}`;
      
      // Inserir novas imagens
      for (let i = 0; i < data.images.length; i++) {
        await db.query`
          INSERT INTO product_images (product_id, url, position)
          VALUES (${id}, ${data.images[i]}, ${i})
        `;
      }
    }
    
    await db.close();
    
    return json({
      success: true,
      data: result[0]
    });
    
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    await db.close();
    return json({ success: false, error: 'Erro ao atualizar produto' }, { status: 500 });
  }
};

// DELETE - Excluir produto
export const DELETE: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    // Primeiro deletar imagens relacionadas
    await db.query`DELETE FROM product_images WHERE product_id = ${id}`;
    
    // Depois deletar o produto
    const result = await db.query`
      DELETE FROM products 
      WHERE id = ${id}
      RETURNING id
    `;
    
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
      message: 'Produto excluído com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    return json({ 
      success: false, 
      error: 'Erro ao excluir produto' 
    }, { status: 500 });
  }
}; 