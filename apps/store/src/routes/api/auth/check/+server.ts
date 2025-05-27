import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
    
    // Padronizar formato do usuário
    const user = {
      id: session.userId || session.id,
      email: session.email,
      name: session.name,
      role: session.role
    };
    
    return json({
      authenticated: true,
      user
    });
    
  } catch (error) {
    // Mesmo em caso de erro, retorna 200
    return json({
      authenticated: false,
      user: null
    });
  }
}; 