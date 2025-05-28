import { writable, derived } from 'svelte/store';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false
  });

  // Simular carregamento do usuário do localStorage
  if (typeof window !== 'undefined') {
    const savedUser = localStorage.getItem('mockUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        set({
          user,
          isAuthenticated: true,
          isLoading: false
        });
      } catch (e) {
        console.error('Erro ao carregar usuário:', e);
      }
    }
  }

  return {
    subscribe,
    
    // Mock de login
    login: async (email: string, password: string) => {
      update(state => ({ ...state, isLoading: true }));
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock de usuário
      const mockUser: User = {
        id: '1',
        name: 'João Silva',
        email: email,
        avatar: 'https://ui-avatars.com/api/?name=João+Silva&background=00BFB3&color=fff'
      };
      
      // Salvar no localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
      }
      
      set({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false
      });
      
      return mockUser;
    },
    
    // Mock de logout
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mockUser');
      }
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    },
    
    // Toggle para testar
    toggleAuth: () => {
      update(state => {
        if (state.isAuthenticated) {
          // Logout
          if (typeof window !== 'undefined') {
            localStorage.removeItem('mockUser');
          }
          return {
            user: null,
            isAuthenticated: false,
            isLoading: false
          };
        } else {
          // Login
          const mockUser: User = {
            id: '1',
            name: 'João Silva',
            email: 'joao@example.com',
            avatar: 'https://ui-avatars.com/api/?name=João+Silva&background=00BFB3&color=fff'
          };
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('mockUser', JSON.stringify(mockUser));
          }
          
          return {
            user: mockUser,
            isAuthenticated: true,
            isLoading: false
          };
        }
      });
    }
  };
}

export const authStore = createAuthStore();

// Derived store para facilitar acesso
export const isAuthenticated = derived(
  authStore,
  $authStore => $authStore.isAuthenticated
);

export const currentUser = derived(
  authStore,
  $authStore => $authStore.user
); 