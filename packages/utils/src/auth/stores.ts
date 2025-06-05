import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { createAuthService, UserRole, type User } from './auth-service';

// ============================
// TYPES
// ============================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

export interface LoginData {
  email: string;
  password: string;
  remember?: boolean;
}

// ============================
// STORES
// ============================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  token: null
};

export const authStore = writable<AuthState>(initialState);

// ============================
// DERIVED STORES
// ============================

export const user: Readable<User | null> = derived(
  authStore,
  ($auth) => $auth.user
);

export const isAuthenticated: Readable<boolean> = derived(
  authStore,
  ($auth) => $auth.isAuthenticated
);

export const isLoading: Readable<boolean> = derived(
  authStore,
  ($auth) => $auth.isLoading
);

export const userRole: Readable<UserRole | null> = derived(
  authStore,
  ($auth) => $auth.user?.role || null
);

export const isAdmin: Readable<boolean> = derived(
  userRole,
  ($role) => $role === UserRole.ADMIN || $role === UserRole.SUPER_ADMIN
);

export const isVendor: Readable<boolean> = derived(
  userRole,
  ($role) => $role === UserRole.VENDOR
);

export const isCustomer: Readable<boolean> = derived(
  userRole,
  ($role) => $role === UserRole.CUSTOMER
);

// ============================
// AUTH ACTIONS
// ============================

export const authActions = {
  /**
   * Inicializar autenticação (verificar se há token salvo)
   */
  async init(): Promise<void> {
    if (!browser) return;

    try {
      authStore.update(state => ({ ...state, isLoading: true, error: null }));

      const token = localStorage.getItem('auth_token');
      if (!token) {
        authStore.update(state => ({ ...state, isLoading: false }));
        return;
      }

      // Verificar se token é válido
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Token inválido - remover
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        authStore.update(state => ({ ...state, isLoading: false }));
        return;
      }

      const result = await response.json();
      if (result.success && result.data.user) {
        authStore.update(state => ({
          ...state,
          user: result.data.user,
          isAuthenticated: true,
          token,
          isLoading: false
        }));
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        authStore.update(state => ({ ...state, isLoading: false }));
      }

    } catch (error) {
      console.error('Erro ao inicializar autenticação:', error);
      authStore.update(state => ({
        ...state,
        isLoading: false,
        error: 'Erro ao verificar autenticação'
      }));
    }
  },

  /**
   * Fazer login
   */
  async login(credentials: LoginData): Promise<{ success: boolean; message?: string }> {
    try {
      authStore.update(state => ({ ...state, isLoading: true, error: null }));

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (result.success) {
        const { user, access_token, refresh_token } = result.data;

        // Salvar tokens
        if (browser) {
          localStorage.setItem('auth_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }
        }

        // Atualizar store
        authStore.update(state => ({
          ...state,
          user,
          isAuthenticated: true,
          token: access_token,
          isLoading: false,
          error: null
        }));

        return { success: true };
      } else {
        authStore.update(state => ({
          ...state,
          isLoading: false,
          error: result.error?.message || 'Erro ao fazer login'
        }));

        return { 
          success: false, 
          message: result.error?.message || 'Credenciais inválidas' 
        };
      }

    } catch (error) {
      console.error('Erro no login:', error);
      const errorMessage = 'Erro de conexão. Tente novamente.';
      
      authStore.update(state => ({
        ...state,
        isLoading: false,
        error: errorMessage
      }));

      return { success: false, message: errorMessage };
    }
  },

  /**
   * Fazer logout
   */
  async logout(): Promise<void> {
    try {
      // Chamar API de logout se necessário
      const token = localStorage.getItem('auth_token');
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {}); // Ignorar erros do logout
      }
    } catch (error) {
      console.error('Erro no logout:', error);
    }

    // Limpar dados localmente
    if (browser) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }

    authStore.set(initialState);
  },

  /**
   * Atualizar dados do usuário
   */
  async updateUser(userData: Partial<User>): Promise<boolean> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;

      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (result.success) {
        authStore.update(state => ({
          ...state,
          user: result.data.user
        }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return false;
    }
  },

  /**
   * Refresh token automaticamente
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      const result = await response.json();

      if (result.success) {
        const { access_token, refresh_token: newRefreshToken } = result.data;

        // Atualizar tokens
        if (browser) {
          localStorage.setItem('auth_token', access_token);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
        }

        authStore.update(state => ({
          ...state,
          token: access_token
        }));

        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      return false;
    }
  },

  /**
   * Limpar erro
   */
  clearError(): void {
    authStore.update(state => ({ ...state, error: null }));
  }
};

// ============================
// GUARDS PARA ROTAS
// ============================

export const authGuards = {
  /**
   * Verificar se usuário está autenticado
   */
  requireAuth(): boolean {
    let isAuth = false;
    authStore.subscribe(state => {
      isAuth = state.isAuthenticated;
    })();
    
    return isAuth;
  },

  /**
   * Verificar se usuário tem role específico
   */
  requireRole(role: UserRole): boolean {
    let hasRole = false;
    authStore.subscribe(state => {
      hasRole = state.user?.role === role;
    })();
    
    return hasRole;
  },

  /**
   * Verificar se usuário tem pelo menos um dos roles
   */
  requireAnyRole(roles: UserRole[]): boolean {
    let hasAnyRole = false;
    authStore.subscribe(state => {
      hasAnyRole = state.user ? roles.includes(state.user.role) : false;
    })();
    
    return hasAnyRole;
  },

  /**
   * Verificar se é admin
   */
  requireAdmin(): boolean {
    return this.requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  },

  /**
   * Verificar se é vendedor
   */
  requireVendor(): boolean {
    return this.requireAnyRole([UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  }
};

// ============================
// UTILITIES
// ============================

export const authUtils = {
  /**
   * Criar header Authorization
   */
  getAuthHeader(): Record<string, string> {
    const token = browser ? localStorage.getItem('auth_token') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  /**
   * Fazer request autenticado
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Se token expirou, tentar renovar automaticamente
    if (response.status === 401) {
      const refreshSuccess = await authActions.refreshToken();
      if (refreshSuccess) {
        // Tentar novamente com novo token
        const newHeaders = {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers
        };

        return fetch(url, {
          ...options,
          headers: newHeaders
        });
      } else {
        // Refresh falhou - fazer logout
        await authActions.logout();
      }
    }

    return response;
  }
};

// ============================
// EXPORT DEFAULT
// ============================

export { authStore as default }; 