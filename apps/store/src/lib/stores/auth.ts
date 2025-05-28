import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { User } from '@mktplace/shared-types';

interface AuthState {
  user: User | null;
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
        
        update(state => ({ 
          ...state, 
          user: data.user, 
          isLoading: false,
          error: null
        }));
        
        return data.user;
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
    
    setUser(user: User | null) {
      update(state => ({ ...state, user, error: null }));
    },
    
    async logout() {
      update(state => ({ ...state, isLoading: true }));
      
      try {
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
        
        // Redireciona para home
        window.location.href = '/';
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
export const auth = createAuthStore();

// Derived stores para facilitar o acesso
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.isLoading);
export const authError = derived(auth, $auth => $auth.error);

// Alias para compatibilidade com código existente
export const authStore = auth;
export const currentUser = user; 