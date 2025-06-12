import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// ✅ GET - Buscar variação específica por ID
export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    console.log(`🔍 Buscando variação ID: ${id}`);
    
    // Query para buscar variação específica com todas as informações
    const query = `
      SELECT 
        pv.id,
        pv.product_id,
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
        p.name as product_name,
        p.slug as product_slug,
        
        -- Buscar todas as opções associadas
        COALESCE(
          json_agg(
            CASE 
              WHEN po.name IS NOT NULL THEN 
                json_build_object(
                  'option_id', po.id,
                  'option_name', po.name,
                  'option_value_id', pov.id,
                  'option_value', pov.value,
                  'display_value', COALESCE(pov.display_value, pov.value)
                )
              ELSE NULL
            END
          ) FILTER (WHERE po.name IS NOT NULL), 
          '[]'::json
        ) as options,
        
        -- Array simples dos IDs dos option_values para formulário
        COALESCE(
          array_agg(pov.id) FILTER (WHERE pov.id IS NOT NULL),
          ARRAY[]::uuid[]
        ) as option_value_ids
        
      FROM product_variants pv
      INNER JOIN products p ON p.id = pv.product_id
      LEFT JOIN variant_option_values vov ON vov.variant_id = pv.id  
      LEFT JOIN product_option_values pov ON pov.id = vov.option_value_id
      LEFT JOIN product_options po ON po.id = pov.option_id
      WHERE pv.id = $1::uuid
      GROUP BY pv.id, pv.product_id, pv.sku, pv.price, pv.original_price, 
               pv.cost, pv.quantity, pv.weight, pv.barcode, pv.is_active, 
               pv.created_at, pv.updated_at, p.name, p.slug
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.length === 0) {
      return json({
        success: false,
        error: 'Variação não encontrada'
      }, { status: 404 });
    }
    
    const variant = result[0];
    
    // Formatear dados para o formulário
    const formattedVariant = {
      id: variant.id,
      product_id: variant.product_id,
      sku: variant.sku,
      price: parseFloat(variant.price || '0'),
      original_price: variant.original_price ? parseFloat(variant.original_price) : null,
      cost: parseFloat(variant.cost || '0'),
      quantity: parseInt(variant.quantity || '0'),
      weight: variant.weight ? parseFloat(variant.weight) : null,
      barcode: variant.barcode,
      is_active: Boolean(variant.is_active),
      created_at: variant.created_at,
      updated_at: variant.updated_at,
      
      // Dados do produto
      product: {
        id: variant.product_id,
        name: variant.product_name,
        slug: variant.product_slug
      },
      
      // Opções formatadas
      options: Array.isArray(variant.options) ? variant.options : [],
      option_value_ids: Array.isArray(variant.option_value_ids) ? variant.option_value_ids : [],
      
      // Para compatibilidade com templates
      name: `${variant.product_name} - ${variant.sku}`,
      type: Array.isArray(variant.options) && variant.options.length > 0 
        ? variant.options[0].option_name 
        : 'Variação',
      values: Array.isArray(variant.options) 
        ? variant.options.map((opt: any) => opt.display_value || opt.option_value)
        : []
    };
    
    console.log('✅ Variação encontrada:', variant.id);
    
    return json({
      success: true,
      data: formattedVariant
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar variação:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// ✅ PUT - Atualizar variação específica
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    const data = await request.json();
    
    console.log(`📝 Atualizando variação ${id}:`, data);
    
    // Verificar se variação existe
    const existing = await db.query(
      'SELECT id, product_id FROM product_variants WHERE id = $1',
      [id]
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
        [data.sku, id]
      );
      
      if (skuCheck.length > 0) {
        return json({
          success: false,
          error: 'SKU já existe em outra variação'
        }, { status: 400 });
      }
    }
    
    // Iniciar transação
    await db.query('BEGIN');
    
    try {
      // Atualizar campos da variação
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
        values.push(id);
        
        const updateQuery = `
          UPDATE product_variants 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;
        
        await db.query(updateQuery, values);
      }
      
      // Atualizar option_values se fornecidos
      if (data.option_value_ids && Array.isArray(data.option_value_ids)) {
        // Remover associações existentes
        await db.query(
          'DELETE FROM variant_option_values WHERE variant_id = $1',
          [id]
        );
        
        // Inserir novas associações
        for (const optionValueId of data.option_value_ids) {
          await db.query(
            'INSERT INTO variant_option_values (variant_id, option_value_id) VALUES ($1, $2)',
            [id, optionValueId]
          );
        }
      }
      
      await db.query('COMMIT');
      
      console.log('✅ Variação atualizada com sucesso:', id);
      
      return json({
        success: true,
        message: 'Variação atualizada com sucesso!',
        data: { id }
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar variação:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// ✅ DELETE - Excluir variação específica
export const DELETE: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    console.log(`🗑️ Excluindo variação: ${id}`);
    
    // Verificar se variação existe
    const existing = await db.query(
      'SELECT id, sku FROM product_variants WHERE id = $1',
      [id]
    );
    
    if (existing.length === 0) {
      return json({
        success: false,
        error: 'Variação não encontrada'
      }, { status: 404 });
    }
    
    // Iniciar transação
    await db.query('BEGIN');
    
    try {
      // Excluir associações com option_values
      await db.query(
        'DELETE FROM variant_option_values WHERE variant_id = $1',
        [id]
      );
      
      // Excluir a variação
      await db.query(
        'DELETE FROM product_variants WHERE id = $1',
        [id]
      );
      
      await db.query('COMMIT');
      
      console.log('✅ Variação excluída com sucesso:', id);
      
      return json({
        success: true,
        message: 'Variação excluída com sucesso!'
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Erro ao excluir variação:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 