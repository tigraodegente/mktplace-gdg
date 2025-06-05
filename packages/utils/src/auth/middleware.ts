import { createAuthService, AuthError, UserRole, type User } from './auth-service';
import { getUserById, type DatabaseEnv } from './database';

export interface AuthContext {
  user?: User;
  token?: string;
  isAuthenticated: boolean;
}

export interface Env extends DatabaseEnv {
  JWT_SECRET?: string;
  AUTH_SECRET?: string;
  [key: string]: any;
}

export interface RequestContext {
  request: Request;
  env: Env;
  platform?: any; // Cloudflare platform object
  data?: AuthContext;
  [key: string]: any; // Para preservar outras propriedades do contexto original
}

export type AuthHandler = (context: RequestContext) => Promise<Response> | Response;

/**
 * Middleware de autenticação para Cloudflare Pages Functions
 */
export function withAuth(
  handler: AuthHandler,
  options: {
    required?: boolean;
    roles?: UserRole[];
    permissions?: { resource: string; action: string };
  } = {}
) {
  return async (context: any): Promise<Response> => {
    const { request, env, platform } = context;
    
    try {
      // Criar authService com JWT_SECRET (usar fixo durante desenvolvimento)
      const jwtSecret = env?.JWT_SECRET || env?.AUTH_SECRET || process.env.JWT_SECRET || 
                       '4ce58f06bf47d72a061bf67c7d3304e998bf0d27c292dfbbe37dcc56c305aba88adf7b26dc22523401f51e3401a35dd9947be810af0cf62b2e24f11b4551c4c3';
      
      if (!jwtSecret) {
        console.warn('JWT_SECRET não configurado - autenticação desabilitada');
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'AUTH_NOT_CONFIGURED',
            message: 'Sistema de autenticação não configurado'
          }
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const authService = createAuthService({ jwtSecret });

      // Extrair token do header
      const authHeader = request.headers.get('Authorization');
      const token = authService.extractTokenFromHeader(authHeader);
      
      let user: User | undefined;
      let isAuthenticated = false;

      if (token) {
        const payload = authService.verifyToken(token);
        if (payload) {
          // Para desenvolvimento, usar dados do payload diretamente
          // Em produção, buscar no banco: const dbUser = await getUserById(payload.userId, env);
          user = {
            id: payload.userId,
            email: payload.email,
            name: payload.email.split('@')[0], // Nome temporário
            role: payload.role,
            is_active: true
          };
          isAuthenticated = !!user;
          console.log(`🔐 Usuário autenticado: ${user.email} (${user.role})`);
        }
      }

      // Verificar se autenticação é obrigatória
      if (options.required && !isAuthenticated) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Usuário não autenticado'
          }
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verificar roles
      if (isAuthenticated && user && options.roles && !authService.checkRole(user.role, options.roles)) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Acesso negado'
          }
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verificar permissões específicas
      if (isAuthenticated && user && options.permissions) {
        const { resource, action } = options.permissions;
        if (!authService.checkPermission(user.role, resource, action)) {
          return new Response(JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `Sem permissão para ${action} em ${resource}`
            }
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Adicionar contexto de auth
      const authContext: AuthContext = {
        user,
        token: token || undefined,
        isAuthenticated
      };

      // Chamar handler com contexto completo (preservando todas as propriedades originais)
      return handler({
        ...context, // Preserva request, env, platform, etc.
        data: authContext
      });

    } catch (error) {
      console.error('Erro no middleware de auth:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Erro interno de autenticação'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Middleware específico para admin
 */
export function withAdminAuth(handler: AuthHandler) {
  return withAuth(handler, {
    required: true,
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN]
  });
}

/**
 * Middleware específico para vendedor
 */
export function withVendorAuth(handler: AuthHandler) {
  return withAuth(handler, {
    required: true,
    roles: [UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]
  });
}

/**
 * Middleware específico para cliente
 */
export function withCustomerAuth(handler: AuthHandler) {
  return withAuth(handler, {
    required: true,
    roles: [UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN]
  });
}

/**
 * Middleware para verificar permissão específica
 */
export function withPermission(resource: string, action: string, handler: AuthHandler) {
  return withAuth(handler, {
    required: true,
    permissions: { resource, action }
  });
}

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