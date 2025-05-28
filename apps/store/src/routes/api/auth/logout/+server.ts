import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    // Tentar remover sessão do banco
    const sessionToken = cookies.get('session_token');
    
    if (sessionToken) {
      const xata = getXataClient();
      const session = await xata.db.sessions
        .filter({ token: sessionToken })
        .getFirst();
      
      if (session) {
        await xata.db.sessions.delete(session.id);
      }
    }
    
    // Limpar cookies
    cookies.delete('session_token', { path: '/' });
    cookies.delete('session', { path: '/' }); // Compatibilidade
    
    return json({
      success: true,
      data: { message: 'Logout realizado com sucesso' }
    });
    
  } catch (error) {
    console.error('Erro no logout:', error);
    // Mesmo com erro, limpar cookies
    cookies.delete('session_token', { path: '/' });
    cookies.delete('session', { path: '/' });
    
    return json({
      success: true,
      data: { message: 'Logout realizado com sucesso' }
    });
  }
}; 