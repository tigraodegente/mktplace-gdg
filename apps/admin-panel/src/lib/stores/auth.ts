import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  token: null
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    // Inicializar autenticação verificando localStorage
    init() {
      if (!browser) return;
      
      const token = localStorage.getItem('access_token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({
            user,
            isAuthenticated: true,
            loading: false,
            token
          });
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error);
          this.logout();
        }
      } else {
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
          token: null
        });
      }
    },

    // Login
    login(user: User, accessToken: string, refreshToken: string) {
      if (!browser) return;
      
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        isAuthenticated: true,
        loading: false,
        token: accessToken
      });
    },

    // Logout
    logout() {
      if (!browser) return;
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
        token: null
      });
      
      goto('/login');
    },

    // Verificar se usuário está autenticado
    checkAuth() {
      return new Promise<boolean>((resolve) => {
        if (!browser) {
          resolve(false);
          return;
        }
        
        const token = localStorage.getItem('access_token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({
              user,
              isAuthenticated: true,
              loading: false,
              token
            });
            resolve(true);
          } catch (error) {
            this.logout();
            resolve(false);
          }
        } else {
          set({
            user: null,
            isAuthenticated: false,
            loading: false,
            token: null
          });
          resolve(false);
        }
      });
    }
  };
}

export const authStore = createAuthStore(); 