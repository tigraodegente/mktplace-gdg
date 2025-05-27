import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
    
    // Padronizar formato do usuário
    const user = {
      id: session.userId || session.id,
      email: session.email,
      name: session.name,
      role: session.role
    };
    
    return json({
      success: true,
      data: {
        user
      }
    });
    
  } catch (error) {
    return json({
      success: false,
      error: { message: 'Sessão inválida' }
    }, { status: 401 });
  }
}; 