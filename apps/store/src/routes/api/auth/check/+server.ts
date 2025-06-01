import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// Esta rota sempre retorna 200, evitando o erro 401 no console
export const GET: RequestHandler = async ({ cookies, platform }) => {
  try {
    console.log('🔐 Auth Check iniciado');
    
    // Verificar token da sessão
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      // Não autenticado, retorna 200
      return json({
        authenticated: false,
        user: null,
        source: 'no_session'
      });
    }
    
    // Buscar sessão no banco
    try {
      const db = getDatabase(platform);
      
      // Query otimizada com JOIN - sem timeout artificial
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
      console.log(`⚠️ Auth erro: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK SEGURO: assumir não autenticado em caso de erro real
      return json({
        authenticated: false,
        user: null,
        source: 'fallback',
        reason: 'database_error'
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