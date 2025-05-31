import { json } from '@sveltejs/kit';

export async function GET({ cookies }: { cookies: any }) {
  try {
    const sessionToken = cookies.get('auth_session');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: 'Não autenticado'
      }, { status: 401 });
    }
    
    // Verificar se é desenvolvimento (mock user)
    if (import.meta.env.DEV) {
      // Em desenvolvimento, criar um usuário admin mock
      const mockUser = {
        id: 'admin-dev',
        name: 'Admin Desenvolvimento',
        email: 'admin@dev.local',
        role: 'admin'
      };
      
      return json({
        success: true,
        user: mockUser
      });
    }
    
    // Em produção, verificar no banco de dados
    // TODO: Implementar consulta real ao banco quando necessário
    const mockUser = {
      id: 'admin-1',
      name: 'Administrador',
      email: 'admin@marketplace.com',
      role: 'admin'
    };
    
    return json({
      success: true,
      user: mockUser
    });
    
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 