import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Buscar modalidade por ID
export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;

    const result = await db.query`
      SELECT 
        id, code, name, description,
        price_multiplier, days_multiplier,
        delivery_days_min, delivery_days_max,
        min_price, max_price, pricing_type,
        is_active, is_default, priority,
        settings, created_at, updated_at
      FROM shipping_modalities
      WHERE id = ${id}
    `;

    await db.close();

    if (result.length === 0) {
      return json({
        success: false,
        error: 'Modalidade não encontrada'
      }, { status: 404 });
    }

    return json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('Erro ao buscar modalidade:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// PUT - Atualizar modalidade
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    const data = await request.json();

    // Verificar se modalidade existe
    const existing = await db.query`
      SELECT id, code FROM shipping_modalities WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return json({
        success: false,
        error: 'Modalidade não encontrada'
      }, { status: 404 });
    }

    // Se alterando o código, verificar duplicação
    if (data.code && data.code !== existing[0].code) {
      const codeCheck = await db.query`
        SELECT id FROM shipping_modalities 
        WHERE code = ${data.code} AND id != ${id}
      `;

      if (codeCheck.length > 0) {
        return json({
          success: false,
          error: 'Código já está em uso'
        }, { status: 400 });
      }
    }

    // Atualizar modalidade
    const result = await db.query`
      UPDATE shipping_modalities SET
        code = ${data.code || existing[0].code},
        name = ${data.name},
        description = ${data.description || null},
        price_multiplier = ${data.price_multiplier || 1.000},
        days_multiplier = ${data.days_multiplier || 1.000},
        delivery_days_min = ${data.delivery_days_min || 3},
        delivery_days_max = ${data.delivery_days_max || 7},
        min_price = ${data.min_price || null},
        max_price = ${data.max_price || null},
        pricing_type = ${data.pricing_type || 'per_shipment'},
        is_active = ${data.is_active !== false},
        is_default = ${data.is_default || false},
        priority = ${data.priority || 1},
        settings = ${data.settings || '{}'},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    await db.close();

    return json({
      success: true,
      data: result[0],
      message: 'Modalidade atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar modalidade:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// DELETE - Excluir modalidade
export const DELETE: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;

    // Verificar se modalidade existe e não é padrão
    const existing = await db.query`
      SELECT id, name, is_default FROM shipping_modalities WHERE id = ${id}
    `;

    if (existing.length === 0) {
      return json({
        success: false,
        error: 'Modalidade não encontrada'
      }, { status: 404 });
    }

    if (existing[0].is_default) {
      return json({
        success: false,
        error: 'Não é possível excluir modalidade padrão'
      }, { status: 400 });
    }

    // Excluir modalidade
    await db.query`DELETE FROM shipping_modalities WHERE id = ${id}`;
    await db.close();

    return json({
      success: true,
      message: 'Modalidade excluída com sucesso'
    });

  } catch (error) {
    console.error('Erro ao excluir modalidade:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 