import { json } from '@sveltejs/kit';

export async function POST({ cookies }: { cookies: any }) {
  try {
    // Remover cookie de sessão
    cookies.delete('auth_session', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });
    
    // Em uma implementação real, também removeríamos a sessão do banco
    // TODO: Implementar remoção da sessão do banco quando necessário
    
    return json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro no logout:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
} 