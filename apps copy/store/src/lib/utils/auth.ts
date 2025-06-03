import type { Cookies } from '@sveltejs/kit';
import { withDatabase } from '$lib/db';

interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

export async function requireAuth(cookies: Cookies, platform: any): Promise<AuthResult> {
  try {
    console.log('🔐 requireAuth: Iniciando validação...');
    
    const sessionToken = cookies.get('session_token');
    
    
    if (!sessionToken) {
      const oldSessionId = cookies.get('session_id');
      
      if (!oldSessionId) {
        console.log('❌ requireAuth: Nenhum cookie de sessão encontrado');
        return {
          success: false,
          error: { message: 'Token de sessão não encontrado', code: 'NO_SESSION' }
        };
      }
      console.warn('⚠️ Usando session_id obsoleto, deveria ser session_token');
    }

    const actualToken = sessionToken || cookies.get('session_id');
    console.log('🔑 requireAuth: Usando token:', actualToken ? `${actualToken.substring(0, 8)}...` : 'undefined');

    const result = await withDatabase(platform, async (db) => {
      
      const session = await db.queryOne`
        SELECT 
          s.id,
          s.user_id,
          s.expires_at,
          u.id as user_id,
          u.name,
          u.email,
          u.role,
          u.is_active
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ${actualToken}
        AND s.expires_at > NOW()
        AND u.is_active = true
      `;

      if (!session) {
        console.log('❌ requireAuth: Sessão não encontrada no banco ou expirada');
        return {
          success: false,
          error: { message: 'Sessão inválida ou expirada', code: 'INVALID_SESSION' }
        };
      }

      console.log('✅ requireAuth: Sessão encontrada para usuário:', session.email);

      await db.execute`
        UPDATE sessions 
        SET updated_at = NOW()
        WHERE id = ${session.id}
      `;

      return {
        success: true,
        user: {
          id: session.user_id,
          name: session.name,
          email: session.email,
          role: session.role
        }
      };
    });

    console.log('✅ requireAuth: Validação concluída com sucesso:', !!result.success);
    return result;

  } catch (error) {
    console.error('❌ requireAuth: Erro na verificação:', error);
    return {
      success: false,
      error: { message: 'Erro interno de autenticação', code: 'AUTH_ERROR' }
    };
  }
}

export async function requireRole(cookies: Cookies, platform: any, requiredRole: string): Promise<AuthResult> {
  const authResult = await requireAuth(cookies, platform);
  
  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user?.role !== requiredRole && authResult.user?.role !== 'admin') {
    return {
      success: false,
      error: { message: 'Permissão insuficiente', code: 'INSUFFICIENT_PERMISSION' }
    };
  }

  return authResult;
}

export async function optionalAuth(cookies: Cookies, platform: any): Promise<AuthResult> {
  try {
    const authResult = await requireAuth(cookies, platform);
    // Se falhar, retorna sucesso mas sem usuário
    if (!authResult.success) {
      return { success: true, user: undefined };
    }
    return authResult;
  } catch (error) {
    return { success: true, user: undefined };
  }
} 