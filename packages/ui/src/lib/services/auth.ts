import type { 
  AuthUser, 
  AuthLoginRequest, 
  AuthLoginResponse, 
  AuthSession, 
  UserRole,
  RoleSwitchRequest
} from '@mktplace/shared-types';

class AuthService {
  private baseUrl: string;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }
  
  // Login unificado - determina role automaticamente ou usa o solicitado
  async login(credentials: AuthLoginRequest): Promise<AuthLoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success && result.session) {
        // Armazenar sessão
        this.setSession(result.session);
        
        // Determinar redirecionamento baseado no role ativo
        result.redirectTo = this.getRedirectUrl(result.session.user, result.session.currentRole);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Erro de conexão. Tente novamente.'
      };
    }
  }
  
  // Trocar de role sem fazer logout
  async switchRole(request: RoleSwitchRequest): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/switch-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        credentials: 'include'
      });
      
      if (response.ok) {
        const { session } = await response.json();
        this.setSession(session);
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  // Logout unificado
  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      this.clearSession();
    }
  }
  
  // Verificar sessão atual
  async checkSession(): Promise<{ user: AuthUser; currentRole: UserRole } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const { user, currentRole } = await response.json();
        return { user, currentRole };
      }
      
      this.clearSession();
      return null;
    } catch (error) {
      this.clearSession();
      return null;
    }
  }
  
  // Verificar se usuário tem role específico
  hasRole(user: AuthUser, role: UserRole): boolean {
    return user.roles.includes(role);
  }
  
  // Verificar permissão específica baseada no role ativo
  hasPermission(user: AuthUser, currentRole: UserRole, permission: string): boolean {
    // Verificar se tem o role ativo
    if (!this.hasRole(user, currentRole)) {
      return false;
    }
    
    if (currentRole === 'admin') {
      return user.admin?.permissions.includes(permission as any) ?? false;
    }
    
    if (currentRole === 'vendor') {
      return ['products.read', 'products.write', 'orders.read'].includes(permission);
    }
    
    if (currentRole === 'customer') {
      return ['profile.read', 'orders.read'].includes(permission);
    }
    
    return false;
  }
  
  // Verificar se pode acessar app específica com role atual
  canAccessApp(user: AuthUser, currentRole: UserRole, app: 'store' | 'admin' | 'vendor'): boolean {
    // Primeiro verificar se tem o role
    if (!this.hasRole(user, currentRole)) {
      return false;
    }
    
    // Mapear app para role necessário
    const appRoleMap: Record<string, UserRole> = {
      store: 'customer',
      admin: 'admin',
      vendor: 'vendor'
    };
    
    return currentRole === appRoleMap[app];
  }
  
  // Obter apps disponíveis para o usuário
  getAvailableApps(user: AuthUser): ('store' | 'admin' | 'vendor')[] {
    const apps: ('store' | 'admin' | 'vendor')[] = [];
    
    if (this.hasRole(user, 'customer')) apps.push('store');
    if (this.hasRole(user, 'admin')) apps.push('admin');
    if (this.hasRole(user, 'vendor')) apps.push('vendor');
    
    return apps;
  }
  
  // Determinar URL de redirecionamento baseado no role ativo
  getRedirectUrl(user: AuthUser, currentRole: UserRole): string {
    const roleAppMap: Record<UserRole, string> = {
      customer: '/',
      admin: '/dashboard',
      vendor: '/dashboard'
    };
    
    return roleAppMap[currentRole] || '/';
  }
  
  // Gerenciar sessão no localStorage
  private setSession(session: AuthSession): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_session', JSON.stringify(session));
    }
  }
  
  private getSession(): AuthSession | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('auth_session');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  }
  
  private clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_session');
    }
  }
}

// Instância única
export const authService = new AuthService();

// Store reativo para usar nos componentes
export function createAuthStore() {
  let user = $state<AuthUser | null>(null);
  let currentRole = $state<UserRole | null>(null);
  let isLoading = $state(false);
  
  const isAuthenticated = $derived(user !== null);
  const availableRoles = $derived(user?.roles || []);
  
  return {
    get user() { return user; },
    get currentRole() { return currentRole; },
    get availableRoles() { return availableRoles; },
    get isAuthenticated() { return isAuthenticated; },
    get isLoading() { return isLoading; },
    
    async login(credentials: AuthLoginRequest) {
      isLoading = true;
      try {
        const result = await authService.login(credentials);
        if (result.session) {
          user = result.session.user;
          currentRole = result.session.currentRole;
        }
        return result;
      } finally {
        isLoading = false;
      }
    },
    
    async logout() {
      isLoading = true;
      try {
        await authService.logout();
        user = null;
        currentRole = null;
      } finally {
        isLoading = false;
      }
    },
    
    async switchRole(newRole: UserRole) {
      if (!user || !availableRoles.includes(newRole)) {
        return false;
      }
      
      isLoading = true;
      try {
        const targetApp = newRole === 'customer' ? 'store' : 
                         newRole === 'admin' ? 'admin' : 'vendor';
        
        const success = await authService.switchRole({ newRole, targetApp });
        if (success) {
          currentRole = newRole;
          // Redirecionar para app apropriada
          const redirectUrl = authService.getRedirectUrl(user, newRole);
          window.location.href = redirectUrl;
        }
        return success;
      } finally {
        isLoading = false;
      }
    },
    
    async checkSession() {
      isLoading = true;
      try {
        const session = await authService.checkSession();
        if (session) {
          user = session.user;
          currentRole = session.currentRole;
        } else {
          user = null;
          currentRole = null;
        }
        return session;
      } finally {
        isLoading = false;
      }
    },
    
    hasPermission(permission: string) {
      return user && currentRole ? 
        authService.hasPermission(user, currentRole, permission) : false;
    },
    
    canAccessApp(app: 'store' | 'admin' | 'vendor') {
      return user && currentRole ? 
        authService.canAccessApp(user, currentRole, app) : false;
    },
    
    hasRole(role: UserRole) {
      return user ? authService.hasRole(user, role) : false;
    }
  };
} 