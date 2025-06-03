import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';

// GET - Listar usuários
export const GET: RequestHandler = async ({ url, platform }) => {
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
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
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
      SELECT 
        u.id, u.name, u.email, u.role, u.is_active, u.email_verified_at,
        u.phone, u.avatar, u.created_at, u.updated_at, u.last_login,
        COUNT(*) OVER() as total_count,
        CASE 
          WHEN u.role = 'customer' THEN (
            SELECT COUNT(*) FROM orders WHERE user_id = u.id
          )
          WHEN u.role = 'seller' THEN (
            SELECT COUNT(*) FROM products WHERE seller_id = (
              SELECT id FROM sellers WHERE user_id = u.id
            )
          )
          ELSE 0
        END as activity_count
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const users = await db.query(query, ...params);
    const totalCount = users[0]?.total_count || 0;
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE role = 'customer') as customers,
        COUNT(*) FILTER (WHERE role = 'seller') as sellers,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) as verified
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
          role: u.role,
          isActive: u.is_active,
          emailVerified: !!u.email_verified_at,
          phone: u.phone,
          avatar: u.avatar,
          activityCount: u.activity_count || 0,
          lastLogin: u.last_login,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          total: stats.total || 0,
          customers: stats.customers || 0,
          sellers: stats.sellers || 0,
          admins: stats.admins || 0,
          active: stats.active || 0,
          verified: stats.verified || 0
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
    if (!data.name || !data.email || !data.password) {
      return json({
        success: false,
        error: 'Nome, email e senha são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar email duplicado
    const [existing] = await db.query`
      SELECT id FROM users WHERE email = ${data.email.toLowerCase()}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'Email já existe'
      }, { status: 400 });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    // Inserir usuário
    const [user] = await db.query`
      INSERT INTO users (
        name, email, password, role, phone, 
        is_active, email_verified_at
      ) VALUES (
        ${data.name}, ${data.email.toLowerCase()}, ${hashedPassword},
        ${data.role || 'customer'}, ${data.phone || null},
        ${data.isActive !== false}, 
        ${data.emailVerified ? new Date() : null}
      ) RETURNING id
    `;
    
    // Se for seller, criar registro na tabela sellers
    if (data.role === 'seller') {
      await db.query`
        INSERT INTO sellers (
          user_id, company_name, is_active
        ) VALUES (
          ${user.id}, ${data.companyName || data.name}, true
        )
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
    
    // Construir update dinamicamente
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (data.name) {
      updates.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }
    
    if (data.email) {
      updates.push(`email = $${paramIndex}`);
      params.push(data.email.toLowerCase());
      paramIndex++;
    }
    
    if (data.role) {
      updates.push(`role = $${paramIndex}`);
      params.push(data.role);
      paramIndex++;
    }
    
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      params.push(data.phone || null);
      paramIndex++;
    }
    
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.isActive);
      paramIndex++;
    }
    
    // Se está definindo como verificado
    if (data.emailVerified !== undefined) {
      updates.push(`email_verified_at = $${paramIndex}`);
      params.push(data.emailVerified ? new Date() : null);
      paramIndex++;
    }
    
    // Se tem nova senha
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 12);
      updates.push(`password = $${paramIndex}`);
      params.push(hashedPassword);
      paramIndex++;
    }
    
    updates.push('updated_at = NOW()');
    params.push(data.id);
    
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    await db.query(query, ...params);
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
    
    // Verificar se tem pedidos
    const [orderCount] = await db.query`
      SELECT COUNT(*) as count FROM orders WHERE user_id = ${id}
    `;
    
    if (orderCount.count > 0) {
      // Apenas desativar se tem histórico
      await db.query`
        UPDATE users SET is_active = false, updated_at = NOW()
        WHERE id = ${id}
      `;
      
      await db.close();
      
      return json({
        success: true,
        data: {
          message: 'Usuário desativado (possui histórico de pedidos)'
        }
      });
    } else {
      // Excluir se não tem histórico
      await db.query`DELETE FROM users WHERE id = ${id}`;
      
      await db.close();
      
      return json({
        success: true,
        data: {
          message: 'Usuário excluído com sucesso'
        }
      });
    }
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return json({
      success: false,
      error: 'Erro ao excluir usuário'
    }, { status: 500 });
  }
}; 