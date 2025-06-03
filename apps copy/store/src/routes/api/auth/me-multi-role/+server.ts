import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

interface SessionData {
  user_id: string;
  token: string;
  active_role: string;
  available_apps: string[];
  expires_at: string;
  user_email: string;
  user_name: string;
  user_roles: string[];
  vendor_data?: any;
  admin_data?: any;
  customer_data?: any;
}

export const GET: RequestHandler = async ({ cookies, platform }) => {
  try {
    const sessionToken = cookies.get('auth_session');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 });
    }
    
    const db = getDatabase(platform);
    
    // Buscar sessão com dados do usuário
    const session = await db.queryOne`
      SELECT 
        s.user_id, s.token, s.active_role, s.available_apps, s.expires_at,
        u.email as user_email, u.name as user_name, u.roles as user_roles,
        u.vendor_data, u.admin_data, u.customer_data
      FROM user_sessions_multi_role s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ${sessionToken}
        AND s.expires_at > NOW()
        AND u.is_active = true
    ` as SessionData;
    
    if (!session) {
      // Limpar cookie inválido
      cookies.delete('auth_session', { path: '/' });
      
      return json({
        success: false,
        error: 'Sessão inválida ou expirada'
      }, { status: 401 });
    }
    
    // Atualizar última atividade
    await db.execute`
      UPDATE user_sessions_multi_role 
      SET last_activity_at = NOW() 
      WHERE token = ${sessionToken}
    `;
    
    // Montar resposta
    const user = {
      id: session.user_id,
      email: session.user_email,
      name: session.user_name,
      roles: session.user_roles,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vendor: session.vendor_data ? {
        storeId: session.vendor_data.storeId,
        storeName: session.vendor_data.storeName,
        commission: session.vendor_data.commission,
        verified: session.vendor_data.verified
      } : undefined,
      admin: session.admin_data ? {
        permissions: session.admin_data.permissions,
        level: session.admin_data.level
      } : undefined,
      customer: session.customer_data ? {
        phone: session.customer_data.phone,
        addresses: session.customer_data.addresses || []
      } : undefined
    };
    
    return json({
      success: true,
      user,
      currentRole: session.active_role,
      availableApps: session.available_apps
    });
    
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 