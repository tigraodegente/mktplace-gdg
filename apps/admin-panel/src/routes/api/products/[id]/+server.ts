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
    
    // Garantir que attributes e specifications sejam objetos
    product.attributes = product.attributes || {};
    product.specifications = product.specifications || {};
    
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
        model = ${data.model || null},
        barcode = ${data.barcode || null},
        condition = ${data.condition || 'new'},
        weight = ${data.weight || null},
        height = ${data.height || null},
        width = ${data.width || null},
        length = ${data.length || null},
        brand_id = ${data.brand_id || null},
        seller_id = ${data.seller_id || null},
        status = ${data.status || 'active'},
        is_active = ${data.is_active !== false},
        featured = ${data.featured === true},
        track_inventory = ${data.track_inventory !== false},
        allow_backorder = ${data.allow_backorder === true},
        stock_location = ${data.stock_location || null},
        currency = ${data.currency || 'BRL'},
        tags = ${data.tags || []},
        meta_title = ${data.meta_title || null},
        meta_description = ${data.meta_description || null},
        meta_keywords = ${data.meta_keywords || []},
        
        -- Novos campos
        has_free_shipping = ${data.has_free_shipping === true},
        delivery_days = ${data.delivery_days || 3},
        seller_state = ${data.seller_state || null},
        seller_city = ${data.seller_city || null},
        is_digital = ${data.is_digital === true},
        requires_shipping = ${data.requires_shipping !== false},
        tax_class = ${data.tax_class || 'standard'},
        ncm_code = ${data.ncm_code || null},
        gtin = ${data.gtin || null},
        origin = ${data.origin || '0'},
        manufacturing_country = ${data.manufacturing_country || null},
        low_stock_alert = ${data.low_stock_alert || null},
        care_instructions = ${data.care_instructions || null},
        manual_link = ${data.manual_link || null},
        allow_reviews = ${data.allow_reviews !== false},
        age_restricted = ${data.age_restricted === true},
        is_customizable = ${data.is_customizable === true},
        internal_notes = ${data.internal_notes || null},
        
        -- Campos JSONB
        attributes = ${data.attributes || {}},
        specifications = ${data.specifications || {}},
        
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

    // Atualizar categorias (múltiplas)
    if (data.category_ids && Array.isArray(data.category_ids)) {
      // Remover categorias antigas
      await db.query`DELETE FROM product_categories WHERE product_id = ${id}::uuid`;
      
      // Inserir novas categorias
      if (data.category_ids.length > 0) {
        const primaryCategoryId = data.primary_category_id || data.category_ids[0];
        
        for (const categoryId of data.category_ids) {
          await db.query`
            INSERT INTO product_categories (product_id, category_id, is_primary)
            VALUES (${id}::uuid, ${categoryId}::uuid, ${categoryId === primaryCategoryId})
            ON CONFLICT (product_id, category_id) DO UPDATE
            SET is_primary = ${categoryId === primaryCategoryId}
          `;
        }
      }
    }
    
    // Atualizar produtos relacionados
    if (data.related_products && Array.isArray(data.related_products)) {
      await db.query`DELETE FROM product_related WHERE product_id = ${id}::uuid`;
      
      for (let i = 0; i < data.related_products.length; i++) {
        await db.query`
          INSERT INTO product_related (product_id, related_product_id, position)
          VALUES (${id}::uuid, ${data.related_products[i]}::uuid, ${i})
        `;
      }
    }
    
    // Atualizar produtos upsell
    if (data.upsell_products && Array.isArray(data.upsell_products)) {
      await db.query`DELETE FROM product_upsells WHERE product_id = ${id}::uuid`;
      
      for (let i = 0; i < data.upsell_products.length; i++) {
        await db.query`
          INSERT INTO product_upsells (product_id, upsell_product_id, position)
          VALUES (${id}::uuid, ${data.upsell_products[i]}::uuid, ${i})
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