import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

const xata = getXataClient();

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    
    if (!sessionCookie) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }
    
    const session = JSON.parse(sessionCookie);
    
    // Buscar usuário atualizado do Xata
    const user = await xata.db.users
      .filter({ id: session.userId })
      .getFirst();
    
    if (!user || !user.is_active) {
      // Limpar cookie se usuário não existe ou está inativo
      cookies.delete('session', { path: '/' });
      
      return json({
        success: false,
        error: { message: 'Sessão inválida' }
      }, { status: 401 });
    }
    
    return json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          email_verified: user.email_verified
        }
      }
    });
    
  } catch (error) {
    return json({
      success: false,
      error: { message: 'Sessão inválida' }
    }, { status: 401 });
  }
}; 