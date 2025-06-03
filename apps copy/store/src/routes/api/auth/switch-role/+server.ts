import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    const body = await request.json();
    const { newRole } = body;
    
    if (!newRole) {
      return json({
        success: false,
        error: 'Role é obrigatório'
      }, { status: 400 });
    }
    
    const sessionToken = cookies.get('auth_session');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 });
    }
    
    const db = getDatabase(platform);
    
    // Buscar sessão atual com dados do usuário
    const session = await db.queryOne`
      SELECT 
        s.user_id, s.token, s.active_role, s.available_apps,
        u.roles as user_roles
      FROM user_sessions_multi_role s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ${sessionToken}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;
    
    if (!session) {
      cookies.delete('auth_session', { path: '/' });
      
      return json({
        success: false,
        error: 'Sessão inválida ou expirada'
      }, { status: 401 });
    }
    
    // Verificar se o usuário tem o role solicitado
    if (!session.user_roles.includes(newRole)) {
      return json({
        success: false,
        error: 'Usuário não tem permissão para este perfil'
      }, { status: 403 });
    }
    
    // Determinar apps disponíveis para o novo role
    function getAvailableApps(roles: string[]) {
      const apps: string[] = [];
      
      if (roles.includes('customer')) apps.push('store');
      if (roles.includes('vendor')) apps.push('vendor');
      if (roles.includes('admin')) apps.push('admin');
      
      return apps;
    }
    
    const availableApps = getAvailableApps(session.user_roles);
    
    // Atualizar sessão com novo role
    await db.execute`
      UPDATE user_sessions_multi_role 
      SET 
        active_role = ${newRole},
        available_apps = ${availableApps},
        last_activity_at = NOW()
      WHERE token = ${sessionToken}
    `;
    
    // Determinar URL de redirecionamento
    const redirectUrls = {
      customer: '/',
      vendor: '/vendor/dashboard',
      admin: '/admin/dashboard'
    };
    
    return json({
      success: true,
      newRole,
      redirectTo: redirectUrls[newRole as keyof typeof redirectUrls],
      availableApps
    });
    
  } catch (error) {
    console.error('Erro ao trocar role:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 