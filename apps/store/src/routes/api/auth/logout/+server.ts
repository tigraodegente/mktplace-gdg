import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
  try {
    // Tentar remover sessão do banco
    const sessionToken = cookies.get('session_token');
    
    if (sessionToken) {
      await withDatabase(platform, async (db) => {
        await db.execute`
          DELETE FROM sessions 
          WHERE token = ${sessionToken}
        `;
      });
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