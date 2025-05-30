import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    const { email, password } = await request.json();
    
    // Validar dados
    if (!email || !password) {
      return json({
        success: false,
        error: { message: 'Email e senha são obrigatórios' }
      }, { status: 400 });
    }
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar usuário
      const user = await db.queryOne`
        SELECT id, email, name, role, password_hash, is_active
        FROM users
        WHERE email = ${email}
      `;
      
      if (!user) {
        return {
          success: false,
          error: { message: 'Email ou senha inválidos' },
          status: 401
        };
      }
      
      // Comparar senha usando bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return {
          success: false,
          error: { message: 'Email ou senha inválidos' },
          status: 401
        };
      }
      
      // Verificar se usuário está ativo
      if (!user.is_active) {
        return {
          success: false,
          error: { message: 'Usuário inativo' },
          status: 403
        };
      }
      
      // Atualizar last_login_at
      await db.execute`
        UPDATE users 
        SET last_login_at = NOW()
        WHERE id = ${user.id}
      `;
      
      // Criar sessão na tabela sessions
      const sessionToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
      
      await db.execute`
        INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (
          ${user.id},
          ${sessionToken},
          ${request.headers.get('x-forwarded-for') || 'unknown'},
          ${request.headers.get('user-agent') || 'unknown'},
          ${expiresAt}
        )
      `;
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        sessionToken
      };
    });
    
    // Se houve erro, retornar com o status apropriado
    if (!result.success) {
      return json({
        success: false,
        error: result.error
      }, { status: result.status || 500 });
    }
    
    // Criar sessão no cookie
    cookies.set('session_token', result.sessionToken!, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });
    
    return json({
      success: true,
      data: {
        user: result.user!
      }
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    return json({
      success: false,
      error: { message: 'Erro ao processar login' }
    }, { status: 500 });
  }
}; 