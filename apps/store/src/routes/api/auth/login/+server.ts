import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

const xata = getXataClient();

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
    const user = await xata.db.users
      .filter({ email })
      .getFirst();
    
    if (!user) {
      return json({
        success: false,
        error: { message: 'Email ou senha inválidos' }
      }, { status: 401 });
    }
    
    // Por enquanto, comparação simples de senha
    // Em produção, usar bcrypt para comparar hash
    if (user.password_hash !== password) {
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
      secure: false, // mudar para true em produção
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