import { createAuthService, AuthError, UserRole, type User } from './auth-service';
import { getUserById, type DatabaseEnv } from './database';

export interface AuthContext {
  user?: User;
  token?: string;
  isAuthenticated: boolean;
}

export interface Env extends DatabaseEnv {
  JWT_SECRET: string;
  DATABASE_URL: string;
}

export interface AuthHandler {
  (context: {
    request: Request;
    platform: { env: Env };
    params: any;
    url: URL;
    data: AuthContext;
  }): Promise<Response>;
}

export function withAuth(
  handler: AuthHandler,
  options: {
    required?: boolean;
    roles?: UserRole[];
    permissions?: { resource: string; action: string };
  } = {}
) {
  return async (context: any): Promise<Response> => {
    const { request, platform } = context;
    const env = platform?.env as Env;
    
    if (!env?.JWT_SECRET) {
      console.error('❌ [MIDDLEWARE] JWT_SECRET não configurado no ambiente');
      if (options.required) {
        return authUtils.unauthorizedResponse('Configuração de autenticação inválida');
      }
    }

    const authService = createAuthService({ jwtSecret: env.JWT_SECRET });
    
    let user: User | undefined;
    let token: string | undefined;
    let isAuthenticated = false;

    // Extrair token do header Authorization
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('🔍 [MIDDLEWARE] Token encontrado no header Authorization');
    } else {
      console.log('❌ [MIDDLEWARE] Auth header:', authHeader || 'NENHUM');
    }

    // Tentar extrair token de cookies se não estiver no header
    if (!token) {
      const cookieHeader = request.headers.get('Cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split('; ').map((c: string) => {
            const [key, ...rest] = c.split('=');
            return [key, rest.join('=')];
          })
        );
        token = cookies.access_token || cookies.token;
        if (token) {
          console.log('🔍 [MIDDLEWARE] Token encontrado em cookies');
        }
      }
    }

    if (token) {
      console.log('🔐 [MIDDLEWARE] Verificando token...');
      console.log('🔍 [MIDDLEWARE] Token preview:', token.substring(0, 50) + '...');
      try {
        const payload = authService.verifyToken(token) as any;
        console.log('🔐 [MIDDLEWARE] Payload do token:', payload);
        
        if (payload && payload.userId) {
          // 🚀 BUSCAR USUÁRIO REAL DO BANCO DE DADOS
          console.log('🔍 [MIDDLEWARE] Buscando usuário no banco:', payload.userId);
          
          try {
            const dbUser = await getUserById(payload.userId, env);
            if (dbUser) {
              user = dbUser;
              isAuthenticated = true;
              console.log(`✅ [MIDDLEWARE] Usuário encontrado no banco: ${user.name} (${user.email}) - ${user.role}`);
            } else {
              console.log('❌ [MIDDLEWARE] Usuário não encontrado no banco:', payload.userId);
              // Fallback para dados do payload (para manter compatibilidade)
              user = {
                id: payload.userId,
                email: payload.email,
                name: payload.name || payload.email?.split('@')[0] || 'Usuário',
                role: payload.role,
                is_active: true
              };
              isAuthenticated = true;
              console.log(`⚠️ [MIDDLEWARE] Usando dados do payload como fallback: ${user.name}`);
            }
          } catch (dbError) {
            console.error('❌ [MIDDLEWARE] Erro ao buscar usuário no banco:', dbError);
            // Fallback para dados do payload
            user = {
              id: payload.userId,
              email: payload.email,
              name: payload.name || payload.email?.split('@')[0] || 'Usuário',
              role: payload.role,
              is_active: true
            };
            isAuthenticated = true;
            console.log(`⚠️ [MIDDLEWARE] Usando dados do payload devido a erro no banco: ${user.name}`);
          }
        } else {
          console.log('❌ [MIDDLEWARE] Token inválido - payload vazio ou sem userId');
          console.log('🔍 [MIDDLEWARE] Payload recebido:', payload);
        }
      } catch (tokenError) {
        console.error('❌ [MIDDLEWARE] Erro ao verificar token:', tokenError);
        console.error('🔍 [MIDDLEWARE] Token que causou erro:', token.substring(0, 100) + '...');
      }
    } else {
      console.log('❌ [MIDDLEWARE] Nenhum token fornecido');
    }

    console.log('🔐 [MIDDLEWARE] isAuthenticated:', isAuthenticated);
    console.log('🔐 [MIDDLEWARE] options.required:', options.required);

    // Verificar se a autenticação é obrigatória
    if (options.required && !isAuthenticated) {
      console.log('❌ [MIDDLEWARE] Autenticação obrigatória - não autenticado');
      return authUtils.unauthorizedResponse('Token de acesso necessário');
    }

    // Verificar roles se especificados
    if (options.roles && options.roles.length > 0) {
      if (!user || !options.roles.includes(user.role)) {
        console.log(`❌ [MIDDLEWARE] Role inválido. Requerido: ${options.roles.join(', ')}, Usuário: ${user?.role || 'nenhum'}`);
        return authUtils.forbiddenResponse('Permissões insuficientes');
      }
    }

    // Verificar permissões se especificadas
    if (options.permissions && user) {
      // TODO: Implementar verificação de permissões específicas
      console.log('📋 [MIDDLEWARE] Verificação de permissões específicas não implementada');
    }

    const authContext: AuthContext = {
      user,
      token,
      isAuthenticated
    };

    console.log('✅ [MIDDLEWARE] Contexto de autenticação criado:', {
      isAuthenticated,
      userId: user?.id,
      userRole: user?.role,
      userName: user?.name
    });

    // Chamar handler original com contexto de autenticação
    return handler({
      ...context,
      data: authContext
    });
  };
}

// Middleware específico para administradores
export const withAdminAuth = (handler: AuthHandler) => {
  return withAuth(handler, {
    required: true,
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
  });
};

// Middleware específico para vendedores
export const withVendorAuth = (handler: AuthHandler) => {
  return withAuth(handler, {
    required: true,
    roles: [UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]
  });
};

// Middleware específico para clientes
export const withCustomerAuth = (handler: AuthHandler) => {
  return withAuth(handler, {
    required: true,
    roles: [UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]
  });
};

// Middleware opcional (não obrigatório)
export const withOptionalAuth = (handler: AuthHandler) => {
  return withAuth(handler, {
    required: false
  });
};

// ============================
// DATABASE HELPERS
// ============================

/**
 * Busca usuário no banco de dados
 * TODO: Implementar conforme sua estrutura de banco
 */
async function getUserFromDatabase(userId: string, env: Env): Promise<User | undefined> {
  try {
    // Se usando Neon/PostgreSQL via fetch
    if (env.DATABASE_URL) {
      const query = `
        SELECT id, email, name, role, is_active, created_at, updated_at
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      // Implementar query conforme seu setup
      // const result = await queryDatabase(query, [userId], env);
      // return result.rows[0];
    }
    
    // Por enquanto, retornar um usuário mock
    // TODO: Remover quando implementar banco real
    return {
      id: userId,
      email: 'user@example.com',
      name: 'User Test',
      role: UserRole.ADMIN,
      is_active: true
    };
    
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return undefined;
  }
}

/**
 * Utilitários para usar nas rotas
 */
export const authUtils = {
  /**
   * Extrai usuário do contexto de request
   */
  getUser(context: { data?: AuthContext }): User | undefined {
    return context.data?.user;
  },

  /**
   * Verifica se usuário está autenticado
   */
  isAuthenticated(context: { data?: AuthContext }): boolean {
    return context.data?.isAuthenticated || false;
  },

  /**
   * Verifica se usuário tem role específico
   */
  hasRole(context: { data?: AuthContext }, role: UserRole): boolean {
    const user = this.getUser(context);
    return user?.role === role;
  },

  /**
   * Verifica se usuário tem pelo menos um dos roles
   */
  hasAnyRole(context: { data?: AuthContext }, roles: UserRole[]): boolean {
    const user = this.getUser(context);
    return user ? roles.includes(user.role) : false;
  },

  /**
   * Retorna resposta de erro padronizada
   */
  unauthorizedResponse(message = 'Não autorizado'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message
      }
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  /**
   * Retorna resposta de acesso negado
   */
  forbiddenResponse(message = 'Acesso negado'): Response {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message
      }
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Hook para SvelteKit (para uso no frontend)
 */
export function createAuthStore() {
  return {
    user: null,
    isAuthenticated: false,
    loading: false
  };
} 