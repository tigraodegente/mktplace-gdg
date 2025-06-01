import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ cookies, platform }) => {
  try {
    console.log('👤 Auth Me - Estratégia híbrida iniciada');
    
    // Verificar token da sessão
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }
    
    // Tentar buscar dados do usuário com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // STEP 1: Query SIMPLIFICADA - buscar sessão
        const sessions = await db.query`
          SELECT id, user_id, expires_at
          FROM sessions 
          WHERE token = ${sessionToken} AND expires_at > NOW()
          LIMIT 1
        `;
        
        const session = sessions[0];
        if (!session) {
          return null;
        }
        
        // STEP 2: Query separada para usuário
        const users = await db.query`
          SELECT id, email, name, role, avatar_url, email_verified, status
          FROM users
          WHERE id = ${session.user_id} AND status = 'active'
          LIMIT 1
        `;
        
        const user = users[0];
        if (!user) {
          return null;
        }
        
        // STEP 3: Update async (não travar resposta)
        setTimeout(async () => {
          try {
            await db.query`UPDATE sessions SET updated_at = NOW() WHERE id = ${session.id}`;
          } catch (e) {
            console.log('Update session async failed:', e);
          }
        }, 100);
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatar_url,
          email_verified: user.email_verified
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (!result) {
        return json({
          success: false,
          error: { message: 'Sessão inválida ou expirada' }
        }, { status: 401 });
      }
      
      console.log(`✅ Auth Me OK: ${result.email}`);
      
      return json({
        success: true,
        data: {
          user: result
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro auth/me: ${error instanceof Error ? error.message : 'Erro'} - negando acesso`);
      
      // FALLBACK SEGURO: sempre negar acesso em caso de timeout
      // (melhor negar acesso do que permitir sem verificar)
      return json({
        success: false,
        error: { message: 'Erro temporário na verificação. Tente novamente.' },
        source: 'fallback'
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico auth/me:', error);
    return json({
      success: false,
      error: { message: 'Erro ao verificar sessão' }
    }, { status: 500 });
  }
}; 