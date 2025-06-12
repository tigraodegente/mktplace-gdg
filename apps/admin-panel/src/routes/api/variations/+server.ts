import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
  try {
    console.log('🔌 Dev: Buscando variantes de produtos...');
    const db = getDatabase();
    
    // Parâmetros de query
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const type = url.searchParams.get('type') || '';
    
    console.log('📊 Parâmetros:', { page, limit, search, status, type });
    
    // Query para buscar variantes com informações dos produtos e opções
    let whereConditions = ['1=1'];
    
    if (search) {
      whereConditions.push(`(p.name ILIKE '%${search}%' OR pv.sku ILIKE '%${search}%' OR po.name ILIKE '%${search}%')`);
    }
    
    if (status === 'active') {
      whereConditions.push('pv.is_active = true AND p.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('(pv.is_active = false OR p.is_active = false)');
    }
    
    if (type && type !== 'all') {
      whereConditions.push(`po.name ILIKE '%${type}%'`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Query principal - buscar variantes com produto e opções (formato compatível com produtos)
    const query = `
      SELECT 
        pv.id,
        pv.sku,
        pv.price,
        pv.original_price,
        pv.cost,
        pv.quantity,
        pv.weight,
        pv.barcode,
        pv.is_active,
        pv.created_at,
        pv.updated_at,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        
        -- Categoria do produto (via product_categories)
        c.name as category_name,
        c.id as category_id,
        
        -- Buscar as opções da variante
        COALESCE(
          json_agg(
            CASE 
              WHEN po.name IS NOT NULL THEN 
                json_build_object(
                  'option_name', po.name,
                  'option_value', pov.value,
                  'display_value', COALESCE(pov.display_value, pov.value)
                )
              ELSE NULL
            END
          ) FILTER (WHERE po.name IS NOT NULL), 
          '[]'::json
        ) as options
        
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      LEFT JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN categories c ON c.id = pc.category_id
      LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id  
      LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
      LEFT JOIN product_options po ON po.id = pov.option_id
      WHERE ${whereClause}
      GROUP BY pv.id, pv.sku, pv.price, pv.original_price, pv.cost, pv.quantity, 
               pv.weight, pv.barcode, pv.is_active, pv.created_at, pv.updated_at,
               p.id, p.name, p.slug, c.name, c.id
      ORDER BY pv.created_at DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `;
    
    // Query para total
    const countQuery = `
      SELECT COUNT(DISTINCT pv.id) as total
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id  
      LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
      LEFT JOIN product_options po ON po.id = pov.option_id
      WHERE ${whereClause}
    `;
    
    console.log('🔍 Executando queries...');
    
    // Executar queries
    const [data, countResult] = await Promise.all([
      db.query(query),
      db.query(countQuery)
    ]);
    
    console.log('✅ Variantes encontradas:', data.length);
    console.log('✅ Total no banco:', countResult[0]?.total || 0);
    
    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);
    
    return json({
      success: true,
      data: data.map((row: any) => ({
        // Campos básicos da variação (formato de produto)
        id: row.id,
        name: `${row.product_name} - ${row.sku}`,
        sku: row.sku || 'Sem SKU',
        description: `Variação de ${row.product_name}`,
        price: parseFloat(row.price || '0'),
        original_price: row.original_price ? parseFloat(row.original_price) : undefined,
        cost: parseFloat(row.cost || '0'),
        quantity: parseInt(row.quantity || '0'),
        weight: parseFloat(row.weight || '0'),
        is_active: Boolean(row.is_active),
        featured: false, // Variações não são destacadas
        created_at: row.created_at,
        updated_at: row.updated_at,
        
        // Herdar categoria do produto base
        category: row.category_name || 'Sem categoria',
        category_id: row.category_id,
        brand: 'Sem marca', // Placeholder até implementar brands
        brand_id: null,
        
        // Herdar imagens do produto base
        images: [], // Placeholder até implementar imagens
        image: null, // Placeholder até implementar imagens
        
        // Produto base (específico das variações)
        product: {
          id: row.product_id,
          name: row.product_name,
          slug: row.product_slug,
          category: row.category_name,
          brand: 'Sem marca', // Placeholder até implementar brands
          images: [], // Placeholder até implementar imagens
          image: null // Placeholder até implementar imagens
        },
        product_id: row.product_id,
        product_name: row.product_name,
        
        // Opções da variação (específico das variações)
        options: Array.isArray(row.options) ? row.options : [],
        
        // Campos adicionais
        barcode: row.barcode
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('❌ Erro detalhado ao buscar variantes:', error);
    console.error('❌ Stack trace:', (error as Error).stack);
    return json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR',
          message: 'Erro ao buscar variantes',
          details: (error as Error).message
        } 
      },
      { status: 500 }
    );
  }
};

// ✅ IMPLEMENTAR POST - Criar nova variação
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    console.log('📝 Criando nova variação:', data);
    
    // Validações básicas
    if (!data.product_id) {
      return json({
        success: false,
        error: 'product_id é obrigatório'
      }, { status: 400 });
    }
    
    if (!data.sku) {
      return json({
        success: false,
        error: 'SKU é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se SKU já existe
    const existingSku = await db.query(
      'SELECT id FROM product_variants WHERE sku = $1',
      [data.sku]
    );
    
    if (existingSku.length > 0) {
      return json({
        success: false,
        error: 'SKU já existe'
      }, { status: 400 });
    }
    
    // Inserir nova variação
    const insertQuery = `
      INSERT INTO product_variants (
        product_id, sku, price, original_price, cost, 
        quantity, weight, barcode, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      data.product_id,
      data.sku,
      data.price || 0,
      data.original_price || null,
      data.cost || 0,
      data.quantity || 0,
      data.weight || null,
      data.barcode || null,
      data.is_active !== false
    ];
    
    const result = await db.query(insertQuery, values);
    const newVariant = result[0];
    
    // Se tiver option_values, inserir também
    if (data.option_values && Array.isArray(data.option_values)) {
      for (const optionValueId of data.option_values) {
        await db.query(
          'INSERT INTO variant_option_values (variant_id, option_value_id) VALUES ($1, $2)',
          [newVariant.id, optionValueId]
        );
      }
    }
    
    console.log('✅ Variação criada com sucesso:', newVariant.id);
    
    return json({
      success: true,
      message: 'Variação criada com sucesso!',
      data: newVariant
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar variação:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// ✅ IMPLEMENTAR PUT - Atualizar variação existente
export const PUT: RequestHandler = async ({ request, url, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    const variantId = url.searchParams.get('id');
    
    if (!variantId) {
      return json({
        success: false,
        error: 'ID da variação é obrigatório'
      }, { status: 400 });
    }
    
    console.log('📝 Atualizando variação:', variantId, data);
    
    // Verificar se variação existe
    const existing = await db.query(
      'SELECT id FROM product_variants WHERE id = $1',
      [variantId]
    );
    
    if (existing.length === 0) {
      return json({
        success: false,
        error: 'Variação não encontrada'
      }, { status: 404 });
    }
    
    // Verificar SKU duplicado (exceto o próprio)
    if (data.sku) {
      const skuCheck = await db.query(
        'SELECT id FROM product_variants WHERE sku = $1 AND id != $2',
        [data.sku, variantId]
      );
      
      if (skuCheck.length > 0) {
        return json({
          success: false,
          error: 'SKU já existe em outra variação'
        }, { status: 400 });
      }
    }
    
    // Atualizar variação
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    const updatableFields = [
      'sku', 'price', 'original_price', 'cost', 
      'quantity', 'weight', 'barcode', 'is_active'
    ];
    
    updatableFields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    });
    
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      values.push(variantId);
      
      const updateQuery = `
        UPDATE product_variants 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await db.query(updateQuery, values);
      const updatedVariant = result[0];
      
      console.log('✅ Variação atualizada com sucesso:', variantId);
      
      return json({
        success: true,
        message: 'Variação atualizada com sucesso!',
        data: updatedVariant
      });
    } else {
      return json({
        success: false,
        error: 'Nenhum campo para atualizar'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar variação:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// ✅ IMPLEMENTAR DELETE - Excluir variação
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return json({
        success: false,
        error: 'IDs são obrigatórios'
      }, { status: 400 });
    }
    
    console.log('🗑️ Excluindo variações:', ids);
    
    // Excluir em transação
    await db.query('BEGIN');
    
    try {
      // Primeiro, excluir as associações com option_values
      await db.query(
        `DELETE FROM variant_option_values WHERE variant_id = ANY($1::uuid[])`,
        [ids]
      );
      
      // Depois, excluir as variações
      const deleteResult = await db.query(
        `DELETE FROM product_variants WHERE id = ANY($1::uuid[]) RETURNING id`,
        [ids]
      );
      
      await db.query('COMMIT');
      
      console.log('✅ Variações excluídas com sucesso:', deleteResult.length);
      
      return json({
        success: true,
        message: `${deleteResult.length} variação(ões) excluída(s) com sucesso!`,
        deleted_count: deleteResult.length
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Erro ao excluir variações:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 