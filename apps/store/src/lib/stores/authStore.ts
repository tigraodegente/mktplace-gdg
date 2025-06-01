import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { AuthUser } from '@mktplace/shared-types';
import { clearNotificationsOnLogout } from './notificationStore';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isLoading: true,
    error: null
  });

  return {
    subscribe,
    
    async checkAuth() {
      if (!browser) return;
      
      // Limpa erro anterior e marca como carregando
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        // Usa a nova rota /check que sempre retorna 200
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          // Só acontece em erros reais do servidor (500, etc)
          console.error(`Erro ao verificar autenticação: ${response.status}`);
          update(state => ({ 
            ...state, 
            user: null, 
            isLoading: false,
            error: 'Erro ao verificar autenticação'
          }));
          return;
        }
        
        const data = await response.json();
        
        if (data.authenticated && data.user) {
          update(state => ({ 
            ...state, 
            user: data.user, 
            isLoading: false,
            error: null
          }));
        } else {
          update(state => ({ 
            ...state, 
            user: null, 
            isLoading: false,
            error: null
          }));
        }
      } catch (error) {
        // Apenas erros de rede/conexão são logados
        console.error('Erro de conexão ao verificar autenticação:', error);
        update(state => ({ 
          ...state, 
          user: null, 
          isLoading: false,
          error: 'Erro de conexão'
        }));
      }
    },
    
    async login(email: string, password: string) {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Erro ao fazer login');
        }
        
        const data = await response.json();
        
        // ✅ A API retorna { success: true, data: { user } }
        const user = data.data?.user || data.user; // Compatibilidade
        
        update(state => ({ 
          ...state, 
          user: user, 
          isLoading: false,
          error: null
        }));
        
        return user;
      } catch (error) {
        console.error('Erro ao fazer login:', error);
        update(state => ({ 
          ...state, 
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erro ao fazer login'
        }));
        throw error;
      }
    },
    
    setUser(user: AuthUser | null) {
      update(state => ({ ...state, user, error: null }));
    },
    
    async logout() {
      try {
        // Limpar token
        if (browser) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          // Limpar notificações ao fazer logout
          clearNotificationsOnLogout();
        }
        
        // Resetar stores
        update(state => ({ ...state, isLoading: true }));
        
        const response = await fetch('/api/auth/logout', { 
          method: 'POST',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Erro ao fazer logout');
        }
        
        update(state => ({ 
          ...state, 
          user: null, 
          isLoading: false,
          error: null
        }));
        
        // Redirecionar para home
        await goto('/');
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
        update(state => ({ 
          ...state, 
          isLoading: false,
          error: 'Erro ao fazer logout'
        }));
      }
    },
    
    clearError() {
      update(state => ({ ...state, error: null }));
    }
  };
}

// Store principal
export const authStore = createAuthStore();

// Derived stores para facilitar o acesso
export const user = derived(authStore, $auth => $auth.user);
export const isAuthenticated = derived(authStore, $auth => !!$auth.user);
export const isLoading = derived(authStore, $auth => $auth.isLoading);
export const authError = derived(authStore, $auth => $auth.error);

// Aliases para compatibilidade com código existente
export const auth = authStore;
export const currentUser = user; 