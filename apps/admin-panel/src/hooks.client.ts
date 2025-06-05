import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth';

if (browser) {
  // Inicializar store de autenticação
  authStore.init();
  
  // Verificar autenticação em mudanças de rota
  authStore.subscribe((auth) => {
    if (!auth.loading) {
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath === '/login';
      
      // Se não está autenticado e não está na página de login, redirecionar
      if (!auth.isAuthenticated && !isLoginPage) {
        goto('/login');
      }
      
      // Se está autenticado e está na página de login, redirecionar para dashboard
      if (auth.isAuthenticated && isLoginPage) {
        goto('/');
      }
    }
  });
} 