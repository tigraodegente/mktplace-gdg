import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ cookies, platform }) => {
  try {
    // Verificar token da sessão
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar sessão no banco
      const session = await db.queryOne`
        SELECT 
          s.id,
          s.user_id,
          s.expires_at,
          u.id as user_id,
          u.email,
          u.name,
          u.role,
          u.avatar_url,
          u.email_verified,
          u.is_active
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ${sessionToken}
          AND s.expires_at > NOW()
          AND u.is_active = true
      `;
      
      if (!session) {
        return null;
      }
      
      // Atualizar última atividade da sessão
      await db.query`
        UPDATE sessions 
        SET updated_at = NOW()
        WHERE id = ${session.id}
      `;
      
      return {
        id: session.user_id,
        email: session.email,
        name: session.name,
        role: session.role,
        avatar_url: session.avatar_url,
        email_verified: session.email_verified
      };
    });
    
    if (!result) {
      return json({
        success: false,
        error: { message: 'Sessão inválida ou expirada' }
      }, { status: 401 });
    }
    
    return json({
      success: true,
      data: {
        user: result
      }
    });
    
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return json({
      success: false,
      error: { message: 'Erro ao verificar sessão' }
    }, { status: 500 });
  }
}; 