import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();
    
    // Validar dados
    if (!email || !password) {
      return json({
        success: false,
        error: { message: 'Email e senha são obrigatórios' }
      }, { status: 400 });
    }
    
    // Buscar usuário no Xata
    const xata = getXataClient();
    const user = await xata.db.users
      .filter({ email })
      .getFirst();
    
    if (!user) {
      return json({
        success: false,
        error: { message: 'Email ou senha inválidos' }
      }, { status: 401 });
    }
    
    // Comparar senha com hash usando bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return json({
        success: false,
        error: { message: 'Email ou senha inválidos' }
      }, { status: 401 });
    }
    
    // Verificar se usuário está ativo
    if (!user.is_active) {
      return json({
        success: false,
        error: { message: 'Usuário inativo' }
      }, { status: 403 });
    }
    
    // Atualizar last_login_at
    await xata.db.users.update(user.id, {
      last_login_at: new Date()
    });
    
    // Criar sessão na tabela sessions
    const sessionToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
    
    await xata.db.sessions.create({
      user_id: user.id,
      token: sessionToken,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      expires_at: expiresAt
    });
    
    // Criar sessão no cookie
    cookies.set('session_token', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });
    
    // Também manter o cookie antigo para compatibilidade
    cookies.set('session', JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }), {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    
    return json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
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