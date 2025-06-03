import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar cupons
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    const type = url.searchParams.get('type') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status !== 'all') {
      if (status === 'active') {
        conditions.push(`is_active = true AND expires_at > NOW()`);
      } else if (status === 'expired') {
        conditions.push(`expires_at <= NOW()`);
      } else if (status === 'inactive') {
        conditions.push(`is_active = false`);
      }
    }
    
    if (type !== 'all') {
      conditions.push(`discount_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      SELECT 
        id, code, description, discount_type, discount_value,
        minimum_amount, maximum_discount, usage_limit, usage_count,
        is_active, starts_at, expires_at, created_at, updated_at,
        COUNT(*) OVER() as total_count
      FROM coupons
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const coupons = await db.query(query, ...params);
    const totalCount = coupons[0]?.total_count || 0;
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true AND expires_at > NOW()) as active,
        COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        COALESCE(SUM(usage_count), 0) as total_usage
      FROM coupons
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        coupons: coupons.map((c: any) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          discountType: c.discount_type,
          discountValue: Number(c.discount_value),
          minimumAmount: c.minimum_amount ? Number(c.minimum_amount) : null,
          maximumDiscount: c.maximum_discount ? Number(c.maximum_discount) : null,
          usageLimit: c.usage_limit,
          usageCount: c.usage_count || 0,
          isActive: c.is_active,
          startsAt: c.starts_at,
          expiresAt: c.expires_at,
          createdAt: c.created_at,
          updatedAt: c.updated_at
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
          expired: stats.expired || 0,
          inactive: stats.inactive || 0,
          totalUsage: stats.total_usage || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return json({
      success: false,
      error: 'Erro ao buscar cupons'
    }, { status: 500 });
  }
};

// POST - Criar cupom
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.code || !data.discountType || !data.discountValue) {
      return json({
        success: false,
        error: 'Código, tipo e valor do desconto são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar código duplicado
    const [existing] = await db.query`
      SELECT id FROM coupons WHERE code = ${data.code.toUpperCase()}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'Código do cupom já existe'
      }, { status: 400 });
    }
    
    // Inserir cupom
    const [coupon] = await db.query`
      INSERT INTO coupons (
        code, description, discount_type, discount_value,
        minimum_amount, maximum_discount, usage_limit,
        is_active, starts_at, expires_at
      ) VALUES (
        ${data.code.toUpperCase()}, ${data.description || null},
        ${data.discountType}, ${data.discountValue},
        ${data.minimumAmount || null}, ${data.maximumDiscount || null},
        ${data.usageLimit || null}, ${data.isActive !== false},
        ${data.startsAt || new Date()}, ${data.expiresAt || null}
      ) RETURNING id
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: coupon.id,
        message: 'Cupom criado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating coupon:', error);
    return json({
      success: false,
      error: 'Erro ao criar cupom'
    }, { status: 500 });
  }
};

// PUT - Atualizar cupom
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID do cupom é obrigatório'
      }, { status: 400 });
    }
    
    // Atualizar cupom
    await db.query`
      UPDATE coupons SET
        code = ${data.code.toUpperCase()},
        description = ${data.description || null},
        discount_type = ${data.discountType},
        discount_value = ${data.discountValue},
        minimum_amount = ${data.minimumAmount || null},
        maximum_discount = ${data.maximumDiscount || null},
        usage_limit = ${data.usageLimit || null},
        is_active = ${data.isActive !== false},
        starts_at = ${data.startsAt},
        expires_at = ${data.expiresAt},
        updated_at = NOW()
      WHERE id = ${data.id}
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Cupom atualizado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating coupon:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar cupom'
    }, { status: 500 });
  }
};

// DELETE - Excluir cupom
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID do cupom é obrigatório'
      }, { status: 400 });
    }
    
    // Verificar se foi usado
    const [usage] = await db.query`
      SELECT usage_count FROM coupons WHERE id = ${id}
    `;
    
    if (usage && usage.usage_count > 0) {
      // Apenas desativar se foi usado
      await db.query`
        UPDATE coupons SET is_active = false, updated_at = NOW()
        WHERE id = ${id}
      `;
      
      await db.close();
      
      return json({
        success: true,
        data: {
          message: 'Cupom desativado (foi usado anteriormente)'
        }
      });
    } else {
      // Excluir se nunca foi usado
      await db.query`DELETE FROM coupons WHERE id = ${id}`;
      
      await db.close();
      
      return json({
        success: true,
        data: {
          message: 'Cupom excluído com sucesso'
        }
      });
    }
    
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return json({
      success: false,
      error: 'Erro ao excluir cupom'
    }, { status: 500 });
  }
}; 