import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// Esta rota sempre retorna 200, evitando o erro 401 no console
export const GET: RequestHandler = async ({ cookies, platform }) => {
  try {
    console.log('🔐 Auth Check - Estratégia híbrida iniciada');
    
    // Verificar token da sessão
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      // Tentar compatibilidade com sessão antiga
      const oldSession = cookies.get('session');
      if (oldSession) {
        try {
          const sessionData = JSON.parse(oldSession);
          
          // Tentar buscar usuário da sessão antiga com timeout
          try {
            const db = getDatabase(platform);
            
            const queryPromise = (async () => {
              const user = await db.query`
                SELECT id, email, name, role, is_active
                FROM users
                WHERE id = ${sessionData.userId}
                LIMIT 1
              `;
              return user[0] || null;
            })();
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 2000)
            });
            
            const user = await Promise.race([queryPromise, timeoutPromise]) as any;
            
            if (user && user.is_active) {
              console.log('✅ Sessão antiga válida');
              return json({
                authenticated: true,
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role
                },
                source: 'database'
              });
            }
          } catch (e) {
            console.log('⚠️ Timeout/erro na sessão antiga');
          }
        } catch (e) {
          // Sessão antiga inválida
        }
      }
      
      // Não autenticado, mas retorna 200
      return json({
        authenticated: false,
        user: null,
        source: 'no_session'
      });
    }
    
    // Buscar sessão no banco com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos para auth
      const queryPromise = (async () => {
        // STEP 1: Query simplificada - apenas verificar sessão
        const sessions = await db.query`
          SELECT id, user_id, expires_at
          FROM sessions
          WHERE token = ${sessionToken}
          LIMIT 1
        `;
        
        const session = sessions[0];
        if (!session) {
          return {
            authenticated: false,
            user: null,
            reason: 'session_not_found'
          };
        }
        
        // STEP 2: Verificar se a sessão expirou (em memória, não DELETE complexo)
        if (new Date(session.expires_at) < new Date()) {
          // Marcar para cleanup async (não travar a resposta)
          setTimeout(async () => {
            try {
              await db.query`DELETE FROM sessions WHERE id = ${session.id}`;
            } catch (e) {
              console.log('Cleanup async failed:', e);
            }
          }, 100);
          
          return {
            authenticated: false,
            user: null,
            reason: 'session_expired'
          };
        }
        
        // STEP 3: Query separada para usuário
        const users = await db.query`
          SELECT id, email, name, role, is_active
          FROM users
          WHERE id = ${session.user_id}
          LIMIT 1
        `;
        
        const user = users[0];
        if (!user || !user.is_active) {
          return {
            authenticated: false,
            user: null,
            reason: 'user_inactive'
          };
        }
        
        // STEP 4: Update async (não travar resposta)
        setTimeout(async () => {
          try {
            await db.query`
              UPDATE sessions 
              SET updated_at = NOW()
              WHERE id = ${session.id}
            `;
          } catch (e) {
            console.log('Update async failed:', e);
          }
        }, 100);
        
        return {
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Auth OK: ${result.authenticated ? 'Autenticado' : 'Não autenticado'}`);
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Auth timeout/erro: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK SEGURO: assumir não autenticado em caso de timeout
      // (melhor negar acesso do que permitir sem verificar)
      return json({
        authenticated: false,
        user: null,
        source: 'fallback',
        reason: 'database_timeout'
      });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico auth check:', error);
    // Mesmo com erro, retorna 200 com authenticated: false
    return json({
      authenticated: false,
      user: null,
      source: 'error'
    });
  }
}; 