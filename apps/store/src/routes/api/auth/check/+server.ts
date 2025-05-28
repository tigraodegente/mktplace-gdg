import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

// Esta rota sempre retorna 200, evitando o erro 401 no console
export const GET: RequestHandler = async ({ cookies, platform }) => {
  try {
    // Verificar token da sessão
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      // Tentar compatibilidade com sessão antiga
      const oldSession = cookies.get('session');
      if (oldSession) {
        try {
          const sessionData = JSON.parse(oldSession);
          
          const result = await withDatabase(platform, async (db) => {
            const user = await db.queryOne`
              SELECT id, email, name, role, is_active
              FROM users
              WHERE id = ${sessionData.userId}
            `;
            
            if (user && user.is_active) {
              return {
                authenticated: true,
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role
                }
              };
            }
            
            return null;
          });
          
          if (result) {
            return json(result);
          }
        } catch (e) {
          // Sessão antiga inválida
        }
      }
      
      // Não autenticado, mas retorna 200
      return json({
        authenticated: false,
        user: null
      });
    }
    
    // Buscar sessão no banco
    const result = await withDatabase(platform, async (db) => {
      const session = await db.queryOne`
        SELECT id, user_id, expires_at
        FROM sessions
        WHERE token = ${sessionToken}
      `;
      
      if (!session) {
        return {
          authenticated: false,
          user: null
        };
      }
      
      // Verificar se a sessão expirou
      if (new Date(session.expires_at) < new Date()) {
        // Deletar sessão expirada
        await db.execute`
          DELETE FROM sessions WHERE id = ${session.id}
        `;
        
        return {
          authenticated: false,
          user: null
        };
      }
      
      // Buscar dados do usuário
      const user = await db.queryOne`
        SELECT id, email, name, role, is_active
        FROM users
        WHERE id = ${session.user_id}
      `;
      
      if (!user || !user.is_active) {
        return {
          authenticated: false,
          user: null
        };
      }
      
      // Atualizar última atividade da sessão
      await db.execute`
        UPDATE sessions 
        SET updated_at = NOW()
        WHERE id = ${session.id}
      `;
      
      return {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      };
    });
    
    return json(result);
    
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    // Mesmo com erro, retorna 200 com authenticated: false
    return json({
      authenticated: false,
      user: null
    });
  }
}; 