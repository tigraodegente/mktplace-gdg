import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findUserByEmail, createUser } from '$lib/db/users';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password, name } = await request.json();
    
    // Validar dados
    if (!email || !password || !name) {
      return json({
        success: false,
        error: { message: 'Todos os campos são obrigatórios' }
      }, { status: 400 });
    }
    
    // Verificar se email já existe
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return json({
        success: false,
        error: { message: 'Email já cadastrado' }
      }, { status: 400 });
    }
    
    // Criar novo usuário
    const newUser = createUser({
      email,
      password, // Em produção, usar hash
      name,
      role: 'customer'
    });
    
    // Criar sessão automaticamente
    cookies.set('session', JSON.stringify({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    }), {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    
    return json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      }
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    return json({
      success: false,
      error: { message: 'Erro ao processar registro' }
    }, { status: 500 });
  }
}; 