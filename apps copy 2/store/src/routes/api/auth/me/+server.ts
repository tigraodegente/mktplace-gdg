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
    
    // Tentar buscar dados do usuário
    try {
      const db = getDatabase(platform);
      
      // Query otimizada - sem timeout artificial
      const result = await db.query`
        SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.email_verified, u.status
        FROM sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.token = ${sessionToken}
          AND s.expires_at > NOW()
          AND u.status = 'active'
        LIMIT 1
      `;
      
      const user = result[0];
      if (!user) {
        return json({
          success: false,
          error: { message: 'Sessão inválida ou expirada' }
        }, { status: 401 });
      }
      
      console.log(`✅ Auth Me OK: ${user.email}`);
      
      return json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar_url: user.avatar_url,
            email_verified: user.email_verified
          }
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro auth/me: ${error instanceof Error ? error.message : 'Erro'} - negando acesso`);
      
      // FALLBACK SEGURO: sempre negar acesso em caso de erro real
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