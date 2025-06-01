import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
  try {
    console.log('🚪 Auth Logout - Estratégia híbrida iniciada');
    
    const sessionToken = cookies.get('session_token');
    
    // Tentar remover sessão com timeout
    if (sessionToken) {
      try {
        const db = getDatabase(platform);
        
        // Promise com timeout de 2 segundos para logout
        const queryPromise = (async () => {
          await db.query`DELETE FROM sessions WHERE token = ${sessionToken}`;
        })();
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 2000)
        });
        
        await Promise.race([queryPromise, timeoutPromise]);
        console.log('✅ Logout DB OK');
        
      } catch (error) {
        console.log(`⚠️ Erro logout DB: ${error instanceof Error ? error.message : 'Erro'} - continuando com cookie cleanup`);
        
        // Tentar remover async (não travar resposta)
        setTimeout(async () => {
          try {
            const db = getDatabase(platform);
            await db.query`DELETE FROM sessions WHERE token = ${sessionToken}`;
          } catch (e) {
            console.log('Cleanup async failed:', e);
          }
        }, 100);
      }
    }
    
    // Limpar cookies (sempre funciona)
    cookies.delete('session_token', { 
      path: '/',
      httpOnly: true,
      secure: !!import.meta.env.PROD, // ✅ Consistente com login
      sameSite: 'lax'
    });
    cookies.delete('session', { 
      path: '/',
      httpOnly: true,
      secure: !!import.meta.env.PROD, // ✅ Consistente com login  
      sameSite: 'lax'
    }); // Compatibilidade
    
    console.log('✅ Logout completo');
    
    return json({
      success: true,
      data: { message: 'Logout realizado com sucesso' }
    });
    
  } catch (error) {
    console.error('❌ Erro crítico logout:', error);
    // Mesmo com erro, limpar cookies
    cookies.delete('session_token', { 
      path: '/',
      httpOnly: true,
      secure: !!import.meta.env.PROD,
      sameSite: 'lax'
    });
    cookies.delete('session', { 
      path: '/',
      httpOnly: true,
      secure: !!import.meta.env.PROD,
      sameSite: 'lax'
    });
    
    return json({
      success: true,
      data: { message: 'Logout realizado com sucesso' }
    });
  }
}; 