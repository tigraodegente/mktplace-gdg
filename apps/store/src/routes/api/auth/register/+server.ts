import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    const { email, password, name, role = 'customer' } = await request.json();
    
    // Validar dados
    if (!email || !password || !name) {
      return json({
        success: false,
        error: { message: 'Todos os campos são obrigatórios' }
      }, { status: 400 });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({
        success: false,
        error: { message: 'Email inválido' }
      }, { status: 400 });
    }
    
    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
      return json({
        success: false,
        error: { message: 'A senha deve ter pelo menos 6 caracteres' }
      }, { status: 400 });
    }
    
    const result = await withDatabase(platform, async (db) => {
      // Verificar se email já existe
      const existingUser = await db.queryOne`
        SELECT id FROM users WHERE email = ${email}
      `;
      
      if (existingUser) {
        throw new Error('Email já cadastrado');
      }
      
      // Criar hash da senha
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      
      // Criar novo usuário
      const newUser = await db.queryOne`
        INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
        VALUES (${email}, ${passwordHash}, ${name}, ${role}, true, false)
        RETURNING id, email, name, role
      `;
      
      // Se for vendedor, criar perfil de vendedor
      if (role === 'seller') {
        const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
        
        await db.query`
          INSERT INTO sellers (
            user_id, company_name, slug, description, 
            is_active, is_verified, rating, total_sales
          )
          VALUES (
            ${newUser.id}, ${name}, ${slug}, ${`Loja de ${name}`},
            false, false, 0, 0
          )
        `;
      }
      
      // Criar sessão
      const sessionToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
      
      await db.query`
        INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (
          ${newUser.id}, 
          ${sessionToken}, 
          ${request.headers.get('x-forwarded-for') || 'unknown'},
          ${request.headers.get('user-agent') || 'unknown'},
          ${expiresAt}
        )
      `;
      
      return { user: newUser, sessionToken };
    });
    
    // Criar sessão no cookie
    cookies.set('session_token', result.sessionToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });
    
    return json({
      success: true,
      data: {
        user: result.user
      }
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    
    if (error instanceof Error && error.message === 'Email já cadastrado') {
      return json({
        success: false,
        error: { message: error.message }
      }, { status: 400 });
    }
    
    return json({
      success: false,
      error: { message: 'Erro ao processar registro' }
    }, { status: 500 });
  }
}; 