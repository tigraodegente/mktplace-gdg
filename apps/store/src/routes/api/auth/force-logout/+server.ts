import type { RequestHandler } from './$types';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import { json } from '@sveltejs/kit';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
  try {
    console.log('🔐 Force Logout - Estratégia híbrida iniciada');
    
    const sessionId = cookies.get('session_id');
    const sessionToken = cookies.get('session_token');
    
    // Tentar limpar sessão do banco com timeout
    if (sessionId || sessionToken) {
      try {
        const db = getDatabase(platform);
        
        // Promise com timeout de 1 segundo (operação simples)
        const queryPromise = (async () => {
    if (sessionId) {
        await db.query`
          DELETE FROM sessions 
          WHERE id = ${sessionId}
        `;
          }
          
          if (sessionToken) {
            await db.query`
              DELETE FROM sessions 
              WHERE token = ${sessionToken}
            `;
          }
          
          console.log(`🗑️ Sessão removida do banco`);
          return { success: true };
        })();
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 1000)
        });
        
        await Promise.race([queryPromise, timeoutPromise]);
        
      } catch (error) {
        console.log(`⚠️ Erro ao limpar sessão do banco: ${error instanceof Error ? error.message : 'Erro'} - continuando com logout`);
        // Continuar mesmo se der erro no banco
      }
    }
    
    // SEMPRE limpar cookies (independente do estado do banco)
    cookies.delete('session_id', {
      path: '/',
      httpOnly: true,
      secure: !!import.meta.env.PROD, // ✅ Consistente com login
      sameSite: 'lax'
    });
    
    cookies.delete('session_token', {
      path: '/',
      httpOnly: true,
      secure: !!import.meta.env.PROD, // ✅ Consistente com login
      sameSite: 'lax'
    });
    
    console.log('✅ Force logout completado');
    
    return json({
      success: true,
      message: 'Logout forçado realizado com sucesso',
      source: 'hybrid'
    });
    
  } catch (error) {
    console.error('❌ Erro no force logout:', error);
    
    // SEMPRE tentar limpar cookies mesmo com erro
    try {
    cookies.delete('session_id', {
      path: '/',
      httpOnly: true,
      secure: !!import.meta.env.PROD,
      sameSite: 'lax'
    });
      
      cookies.delete('session_token', {
        path: '/',
        httpOnly: true,
        secure: !!import.meta.env.PROD,
        sameSite: 'lax'
      });
    } catch (cookieError) {
      console.error('Erro ao limpar cookies:', cookieError);
    }
    
    return json({
      success: true, // Consideramos sucesso pois o principal é limpar os cookies
      message: 'Logout forçado realizado (cookies limpos)',
      source: 'fallback'
    });
  }
}; 