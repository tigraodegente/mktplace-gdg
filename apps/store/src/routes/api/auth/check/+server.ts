import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

// Esta rota sempre retorna 200, evitando o erro 401 no console
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
              authenticated: true,
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
              }
            });
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
    const xata = getXataClient();
    const session = await xata.db.sessions
      .filter({ token: sessionToken })
      .getFirst();
    
    if (!session) {
      return json({
        authenticated: false,
        user: null
      });
    }
    
    // Verificar se a sessão expirou
    if (new Date(session.expires_at) < new Date()) {
      // Deletar sessão expirada
      await xata.db.sessions.delete(session.id);
      
      return json({
        authenticated: false,
        user: null
      });
    }
    
    // Buscar dados do usuário
    const user = await xata.db.users.read(session.user_id);
    
    if (!user || !user.is_active) {
      return json({
        authenticated: false,
        user: null
      });
    }
    
    // Atualizar última atividade da sessão
    await xata.db.sessions.update(session.id, {
      updated_at: new Date()
    });
    
    return json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    // Mesmo com erro, retorna 200 com authenticated: false
    return json({
      authenticated: false,
      user: null
    });
  }
}; 