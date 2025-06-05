import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Esta é uma API exemplo mostrando como usar autenticação
// com o novo sistema centralizado

export const GET: RequestHandler = async ({ request, platform }) => {
  try {
    // Simular verificação de auth (futuramente será automática com middleware)
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Token de acesso obrigatório'
        }
      }, { status: 401 });
    }

    // Simular dados protegidos
    const protectedData = {
      message: 'Dados acessados com sucesso!',
      timestamp: new Date().toISOString(),
      user_info: 'Admin autenticado',
      system_status: 'funcionando'
    };

    return json({
      success: true,
      data: protectedData,
      meta: {
        timestamp: new Date().toISOString(),
        source: 'admin-panel-protected'
      }
    });

  } catch (error) {
    console.error('Erro na API protegida:', error);
    
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    // Verificação de auth
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Token de acesso obrigatório'
        }
      }, { status: 401 });
    }

    const body = await request.json();

    // Simular criação de recurso protegido
    const newResource = {
      id: Date.now().toString(),
      ...body,
      created_at: new Date().toISOString(),
      created_by: 'admin-user' // Futuramente será extraído do token
    };

    return json({
      success: true,
      data: newResource,
      meta: {
        timestamp: new Date().toISOString(),
        source: 'admin-panel-protected'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar recurso protegido:', error);
    
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
}; 