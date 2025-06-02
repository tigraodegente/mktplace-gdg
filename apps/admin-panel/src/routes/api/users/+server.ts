import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';

// GET - Listar usuários
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || 'all';
    const status = url.searchParams.get('status') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (role !== 'all') {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`u.is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      WITH user_stats AS (
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.role,
          u.is_active,
          u.email_verified,
          u.created_at,
          u.updated_at,
          u.last_login,
          COUNT(*) OVER() as total_count,
          (
            SELECT COUNT(*) 
            FROM orders o 
            WHERE o.customer_id = u.id
          ) as order_count,
          (
            SELECT SUM(total_amount) 
            FROM orders o 
            WHERE o.customer_id = u.id AND o.status = 'completed'
          ) as total_spent,
          s.company_name as seller_name
        FROM users u
        LEFT JOIN sellers s ON s.id = u.seller_id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT * FROM user_stats
    `;
    
    params.push(limit, offset);
    
    const users = await db.query(query, ...params);
    const totalCount = users[0]?.total_count || 0;
    
    // Buscar estatísticas gerais
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'vendor') as vendors,
        COUNT(*) FILTER (WHERE role = 'customer') as customers,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users
      FROM users
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        users: users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          status: u.is_active ? 'active' : 'inactive',
          emailVerified: u.email_verified,
          orderCount: u.order_count || 0,
          totalSpent: Number(u.total_spent || 0),
          sellerName: u.seller_name,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
          lastLogin: u.last_login
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
          admins: stats.admins || 0,
          vendors: stats.vendors || 0,
          customers: stats.customers || 0,
          newUsers: stats.new_users || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return json({
      success: false,
      error: 'Erro ao buscar usuários'
    }, { status: 500 });
  }
};

// POST - Criar usuário
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.name || !data.email || !data.password || !data.role) {
      return json({
        success: false,
        error: 'Nome, email, senha e perfil são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar email duplicado
    const [existing] = await db.query`
      SELECT id FROM users WHERE email = ${data.email}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'Email já cadastrado'
      }, { status: 400 });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Inserir usuário
    const [user] = await db.query`
      INSERT INTO users (
        name, email, phone, password_hash,
        role, is_active, email_verified
      ) VALUES (
        ${data.name}, ${data.email}, ${data.phone || null}, ${hashedPassword},
        ${data.role}, ${data.status === 'active'}, false
      ) RETURNING id
    `;
    
    // Se for vendor, criar registro na tabela sellers
    if (data.role === 'vendor' && data.sellerInfo) {
      await db.query`
        INSERT INTO sellers (
          id, user_id, company_name, slug,
          is_active, commission_rate
        ) VALUES (
          ${user.id}, ${user.id}, 
          ${data.sellerInfo.companyName || data.name},
          ${data.sellerInfo.slug || data.email.split('@')[0]},
          true, ${data.sellerInfo.commissionRate || 15}
        )
      `;
      
      // Atualizar user com seller_id
      await db.query`
        UPDATE users SET seller_id = ${user.id} WHERE id = ${user.id}
      `;
    }
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: user.id,
        message: 'Usuário criado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    return json({
      success: false,
      error: 'Erro ao criar usuário'
    }, { status: 500 });
  }
};

// PUT - Atualizar usuário
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID do usuário é obrigatório'
      }, { status: 400 });
    }
    
    // Construir query dinâmica
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (data.name) {
      updates.push(`name = $${paramIndex}`);
      values.push(data.name);
      paramIndex++;
    }
    
    if (data.email) {
      updates.push(`email = $${paramIndex}`);
      values.push(data.email);
      paramIndex++;
    }
    
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(data.phone || null);
      paramIndex++;
    }
    
    if (data.role) {
      updates.push(`role = $${paramIndex}`);
      values.push(data.role);
      paramIndex++;
    }
    
    if (data.status !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(data.status === 'active');
      paramIndex++;
    }
    
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }
    
    updates.push('updated_at = NOW()');
    
    values.push(data.id); // Para o WHERE
    
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    await db.query(query, ...values);
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Usuário atualizado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar usuário'
    }, { status: 500 });
  }
};

// DELETE - Excluir usuário
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID do usuário é obrigatório'
      }, { status: 400 });
    }
    
    // Soft delete - apenas desativar
    await db.query`
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Usuário desativado com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return json({
      success: false,
      error: 'Erro ao excluir usuário'
    }, { status: 500 });
  }
}; 