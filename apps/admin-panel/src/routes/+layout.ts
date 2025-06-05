import { browser } from '$app/environment';
import { authStore } from '$lib/stores/auth';

export async function load() {
  // Inicializar store de autenticação apenas no browser
  if (browser) {
    authStore.init();
  }
  
  return {};
} 