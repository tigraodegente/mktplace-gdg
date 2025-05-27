import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    console.log('Login attempt started');
    const { email, password } = await request.json();
    
    // Validar dados
    if (!email || !password) {
      console.log('Missing email or password');
      return json({
        success: false,
        error: { message: 'Email e senha são obrigatórios' }
      }, { status: 400 });
    }
    
    console.log('Attempting to connect to Xata for user:', email);
    // Buscar usuário no Xata
    const xata = getXataClient();
    const user = await xata.db.users
      .filter({ email })
      .getFirst();
    
    if (!user) {
      console.log('User not found:', email);
      return json({
        success: false,
        error: { message: 'Email ou senha inválidos' }
      }, { status: 401 });
    }
    
    console.log('User found, comparing passwords');
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
    
    // Criar sessão
    cookies.set('session', JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true em produção
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
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