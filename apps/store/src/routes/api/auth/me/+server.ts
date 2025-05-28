import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    // Verificar token da sessão
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      // Tentar compatibilidade com sessão antiga
      const oldSession = cookies.get('session');
      if (oldSession) {
        try {
          const sessionData = JSON.parse(oldSession);
          const xata = getXataClient();
          const user = await xata.db.users.read(sessionData.userId);
          
          if (user && user.is_active) {
            return json({
              success: true,
              data: {
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  avatar_url: user.avatar_url
                }
              }
            });
          }
        } catch (e) {
          // Sessão antiga inválida
        }
      }
      
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }
    
    // Buscar sessão no banco
    const xata = getXataClient();
    const session = await xata.db.sessions
      .filter({ token: sessionToken })
      .getFirst();
    
    if (!session) {
      return json({
        success: false,
        error: { message: 'Sessão inválida' }
      }, { status: 401 });
    }
    
    // Verificar se a sessão expirou
    if (new Date(session.expires_at) < new Date()) {
      // Deletar sessão expirada
      await xata.db.sessions.delete(session.id);
      
      return json({
        success: false,
        error: { message: 'Sessão expirada' }
      }, { status: 401 });
    }
    
    // Buscar dados do usuário
    const user = await xata.db.users.read(session.user_id);
    
    if (!user || !user.is_active) {
      return json({
        success: false,
        error: { message: 'Usuário não encontrado ou inativo' }
      }, { status: 401 });
    }
    
    // Atualizar última atividade da sessão
    await xata.db.sessions.update(session.id, {
      updated_at: new Date()
    });
    
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