import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar modalidades
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros da requisição
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'priority';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Construir condições WHERE
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    const offset = (page - 1) * limit;

    // Query principal
    const query = `
      SELECT 
        id, code, name, description,
        price_multiplier, days_multiplier,
        delivery_days_min, delivery_days_max,
        min_price, max_price, pricing_type,
        is_active, is_default, priority,
        settings, created_at, updated_at
      FROM shipping_modalities
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM shipping_modalities
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit e offset

    const [items, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    await db.close();

    return json({
      success: true,
      data: items,
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
    console.error('Erro ao listar modalidades:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// POST - Criar modalidade
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();

    // Validações básicas
    if (!data.code || !data.name) {
      return json({
        success: false,
        error: 'Código e nome são obrigatórios'
      }, { status: 400 });
    }

    // Verificar se código já existe
    const existing = await db.query`
      SELECT id FROM shipping_modalities WHERE code = ${data.code}
    `;

    if (existing.length > 0) {
      return json({
        success: false,
        error: 'Código já existe'
      }, { status: 400 });
    }

    // Inserir nova modalidade
    const result = await db.query`
      INSERT INTO shipping_modalities (
        code, name, description,
        price_multiplier, days_multiplier,
        delivery_days_min, delivery_days_max,
        min_price, max_price, pricing_type,
        is_active, is_default, priority, settings
      ) VALUES (
        ${data.code},
        ${data.name},
        ${data.description || null},
        ${data.price_multiplier || 1.000},
        ${data.days_multiplier || 1.000},
        ${data.delivery_days_min || 3},
        ${data.delivery_days_max || 7},
        ${data.min_price || null},
        ${data.max_price || null},
        ${data.pricing_type || 'per_shipment'},
        ${data.is_active !== false},
        ${data.is_default || false},
        ${data.priority || 1},
        ${data.settings || '{}'}
      )
      RETURNING *
    `;

    await db.close();

    return json({
      success: true,
      data: result[0],
      message: 'Modalidade criada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar modalidade:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// PUT - Atualizar modalidades em lote
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { ids, updates } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return json({
        success: false,
        error: 'IDs são obrigatórios'
      }, { status: 400 });
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      params.push(updates.is_active);
      paramIndex++;
    }

    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      params.push(updates.priority);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return json({
        success: false,
        error: 'Nenhum campo para atualizar'
      }, { status: 400 });
    }

    updateFields.push(`updated_at = NOW()`);

    const placeholders = ids.map((_, index) => `$${paramIndex + index}`).join(',');
    params.push(...ids);

    const query = `
      UPDATE shipping_modalities 
      SET ${updateFields.join(', ')}
      WHERE id IN (${placeholders})
      RETURNING id, name, is_active, priority
    `;

    const result = await db.query(query, params);

    await db.close();

    return json({
      success: true,
      data: result,
      message: `${result.length} modalidade(s) atualizada(s)`
    });

  } catch (error) {
    console.error('Erro ao atualizar modalidades:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};

// DELETE - Excluir modalidades
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

    // Verificar se alguma modalidade é padrão
    const defaultCheck = await db.query`
      SELECT id, name FROM shipping_modalities 
      WHERE id = ANY(${ids}::uuid[]) AND is_default = true
    `;

    if (defaultCheck.length > 0) {
      return json({
        success: false,
        error: `Não é possível excluir modalidade padrão: ${defaultCheck[0].name}`
      }, { status: 400 });
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
    const query = `DELETE FROM shipping_modalities WHERE id IN (${placeholders})`;

    await db.query(query, ids);
    await db.close();

    return json({
      success: true,
      message: `${ids.length} modalidade(s) excluída(s)`
    });

  } catch (error) {
    console.error('Erro ao excluir modalidades:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 