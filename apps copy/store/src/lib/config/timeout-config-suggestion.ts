// Configuração centralizada de timeouts sugerida

export const TIMEOUT_CONFIG = {
  // API Timeouts
  api: {
    default: 5000,      // 5s padrão
    auth: 10000,        // 10s para auth (pode ser mais lento)
    upload: 30000,      // 30s para uploads
    payment: 15000,     // 15s para pagamentos
    search: 3000,       // 3s para busca
  },
  
  // UI Timeouts  
  ui: {
    notification: 4000, // 4s para notificações
    loading: 500,       // 500ms antes de mostrar loading
    debounce: 300,      // 300ms para debounce
  },
  
  // Retry Configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,    // 1s
    maxDelay: 30000,    // 30s max
    backoffFactor: 2,
  }
};

// Helper para criar timeout com AbortController
export function createTimeout(ms: number = TIMEOUT_CONFIG.api.default) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

// Helper para retry com exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options = TIMEOUT_CONFIG.retry
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < options.maxAttempts - 1) {
        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffFactor, i),
          options.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
