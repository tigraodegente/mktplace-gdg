import { auth } from '$lib/stores/auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: any;
    token?: string;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Serviço centralizado de autenticação
 * Garante que todas as operações de login/registro sincronizem com o store global
 */
export class AuthService {
  
  /**
   * Realizar login com sincronização automática do store
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔐 AuthService: Iniciando login...');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include' // 🔑 SEMPRE incluir cookies de sessão
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: AuthResponse = await response.json();
      
      if (result.success && result.data?.user) {
        console.log('✅ AuthService.login: Login bem-sucedido, atualizando store...');
        
        // 🔑 SINCRONIZAR com store global
        auth.setUser(result.data.user);
        
        // Verificar sincronização
        setTimeout(() => {
          auth.subscribe(($auth) => {
              hasUser: !!$auth.user,
              userName: $auth.user?.name || 'none'
            });
          })();
        }, 100);
        
        return result;
      } else {
        console.log('❌ AuthService.login: Falha no login:', result.error?.message);
        return result;
      }
    } catch (error) {
      console.error('❌ AuthService.login: Erro na requisição:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Erro ao fazer login',
          code: 'LOGIN_ERROR'
        }
      };
    }
  }
  
  /**
   * Realizar registro com sincronização automática do store
   */
  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      console.log('🔐 AuthService: Iniciando registro...');
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        credentials: 'include' // 🔑 SEMPRE incluir cookies de sessão
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result: AuthResponse = await response.json();
      
      if (result.success && result.data?.user) {
        console.log('✅ AuthService.register: Registro bem-sucedido, atualizando store...');
        
        // 🔑 SINCRONIZAR com store global
        auth.setUser(result.data.user);
        
        // Verificar sincronização
        setTimeout(() => {
          auth.subscribe(($auth) => {
              hasUser: !!$auth.user,
              userName: $auth.user?.name || 'none'
            });
          })();
        }, 100);
        
        return result;
      } else {
        console.log('❌ AuthService.register: Falha no registro:', result.error?.message);
        return result;
      }
    } catch (error) {
      console.error('❌ AuthService.register: Erro na requisição:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Erro ao criar conta',
          code: 'REGISTER_ERROR'
        }
      };
    }
  }
  
  /**
   * Verificar estado de autenticação com o backend
   */
  static async checkAuth(): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const backendResult = await response.json();
      
      if (backendResult.authenticated && backendResult.user) {
        console.log('✅ AuthService.checkAuth: Backend confirma autenticação');
        
        // Sincronizar com store se necessário
        auth.subscribe(($auth) => {
          if (!$auth.user) {
            console.log('🔄 AuthService: Sincronizando usuário autenticado...');
            auth.setUser(backendResult.user);
          }
        })();
        
        // Retornar no formato correto
        return {
          success: true,
          data: {
            user: backendResult.user
          }
        };
      } else {
        console.log('❌ AuthService.checkAuth: Backend confirma que não está autenticado');
        
        // Retornar no formato correto para não autenticado
        return {
          success: false,
          error: {
            message: 'Usuário não autenticado',
            code: 'NOT_AUTHENTICATED'
          }
        };
      }
    } catch (error) {
      console.error('❌ AuthService: Erro ao verificar autenticação:', error);
      return {
        success: false,
        error: {
          message: 'Erro ao verificar autenticação',
          code: 'CHECK_AUTH_ERROR'
        }
      };
    }
  }
  
  /**
   * Realizar logout com limpeza do store
   */
  static async logout(): Promise<void> {
    try {
      console.log('🔐 AuthService.logout: Realizando logout...');
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Limpar store
      auth.logout();
      
      console.log('✅ AuthService.logout: Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ AuthService.logout: Erro na requisição:', error);
      // Mesmo com erro, limpar store local
      auth.logout();
      console.log('⚠️ AuthService.logout: Store limpo localmente apesar do erro');
    }
  }
} 