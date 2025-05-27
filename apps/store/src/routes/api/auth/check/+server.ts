import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

// Esta rota sempre retorna 200, evitando o erro 401 no console
export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    
    if (!sessionCookie) {
      // Retorna 200 mas com authenticated: false
      return json({
        authenticated: false,
        user: null
      });
    }
    
    const session = JSON.parse(sessionCookie);
    
    // Buscar usuário atualizado do Xata
    const xata = getXataClient();
    const user = await xata.db.users
      .filter({ id: session.userId })
      .getFirst();
    
    if (!user || !user.is_active) {
      // Limpar cookie se usuário não existe ou está inativo
      cookies.delete('session', { path: '/' });
      
      return json({
        authenticated: false,
        user: null
      });
    }
    
    return json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        email_verified: user.email_verified
      }
    });
    
  } catch (error) {
    // Mesmo em caso de erro, retorna 200
    return json({
      authenticated: false,
      user: null
    });
  }
}; 