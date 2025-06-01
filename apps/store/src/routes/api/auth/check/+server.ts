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
                SELECT id, email, name, role, status
                FROM users
                WHERE id = ${sessionData.userId}
                LIMIT 1
              `;
              return user[0] || null;
            })();
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Timeout')), 8000)
            });
            
            const user = await Promise.race([queryPromise, timeoutPromise]) as any;
            
            if (user && user.status === 'active') {
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
      
      // Query otimizada com JOIN
      const result = await db.query`
        SELECT u.id, u.email, u.name, u.role, u.status
        FROM sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.token = ${sessionToken}
          AND s.expires_at > NOW()
          AND u.status = 'active'
        LIMIT 1
      `;
      
      const user = result[0];
      if (user && user.status === 'active') {
        console.log('✅ Auth OK: Autenticado');
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
      
      // Não autenticado, mas retorna 200
      return json({
        authenticated: false,
        user: null,
        source: 'no_session'
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