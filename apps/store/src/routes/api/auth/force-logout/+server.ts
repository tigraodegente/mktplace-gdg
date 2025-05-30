import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
  try {
    console.log('🔐 Forçando logout e limpeza de sessão...');
    
    const sessionId = cookies.get('session_id');
    
    // Limpar sessão do banco se existir
    if (sessionId) {
      await withDatabase(platform, async (db) => {
        await db.query`
          DELETE FROM sessions 
          WHERE id = ${sessionId}
        `;
        console.log(`🗑️ Sessão ${sessionId.substring(0, 8)}... removida do banco`);
      });
    }
    
    // Limpar cookies
    cookies.delete('session_id', {
      path: '/',
      httpOnly: true,
      secure: false, // ajustar para true em produção
      sameSite: 'lax'
    });
    
    console.log('✅ Logout forçado completado');
    
    return json({
      success: true,
      message: 'Logout forçado realizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro no logout forçado:', error);
    
    // Mesmo com erro, tentar limpar cookie
    cookies.delete('session_id', {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    
    return json({
      success: false,
      error: {
        message: 'Erro no logout forçado, mas cookie foi limpo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    });
  }
}; 