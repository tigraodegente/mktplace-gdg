/**
 * Configuração centralizada de timeouts
 * 
 * Valores otimizados baseados em métricas reais e boas práticas:
 * - APIs críticas: 3-5s
 * - APIs de autenticação: 5s (bcrypt pode ser lento)
 * - Queries pesadas: 5-8s
 * - Uploads/Downloads: 30s+
 */

export const TIMEOUT_CONFIG = {
  // Timeouts de API (em ms)
  api: {
    default: 5000,         // 5s - padrão para APIs
    auth: {
      login: 5000,         // 5s - bcrypt pode demorar
      register: 6000,      // 6s - inclui validações
      passwordReset: 3000, // 3s - operação simples
      logout: 1000,        // 1s - apenas limpar sessão
    },
    products: {
      list: 5000,          // 5s - pode ter filtros complexos
      single: 3000,        // 3s - busca simples
      search: 4000,        // 4s - busca com texto
      suggestions: 2000,   // 2s - deve ser rápido
    },
    orders: {
      create: 8000,        // 8s - transação complexa
      list: 5000,          // 5s - com joins
      single: 3000,        // 3s - busca simples
    },
    payments: {
      process: 15000,      // 15s - APIs externas podem ser lentas
      webhook: 6000,       // 6s - processamento
    },
    shipping: {
      calculate: 5000,     // 5s - cálculos complexos
      simple: 3000,        // 3s - cálculo básico
    },
    categories: 3000,      // 3s - geralmente cacheado
    pages: 2000,           // 2s - conteúdo estático
    chat: 3000,            // 3s - mensagens em tempo real
    notifications: 3000,   // 3s - busca simples
    giftLists: 4000,       // 4s - com relacionamentos
    support: 4000,         // 4s - tickets com histórico
    stock: {
      check: 2000,         // 2s - verificação rápida
      reserve: 5000,       // 5s - transação
      cleanup: 3000,       // 3s - manutenção
    },
    coupons: 2000,         // 2s - validação simples
    returns: 5000,         // 5s - processo completo
    addresses: 3000,       // 3s - CRUD simples
    integrations: {
      test: 2000,          // 2s - teste rápido
      providers: 4000,     // 4s - listar providers
    },
    sitemap: 5000,         // 5s - pode ter muitos produtos
    blog: 4000,            // 4s - posts com conteúdo
  },
  
  // Timeouts de UI (em ms)
  ui: {
    notification: 4000,    // 4s - tempo de exibição
    loadingDelay: 300,     // 300ms - antes de mostrar spinner
    debounce: 300,         // 300ms - para inputs
    errorMessage: 4000,    // 4s - mensagens de erro
    successMessage: 3000,  // 3s - mensagens de sucesso
  },
  
  // Configuração de retry
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,       // 1s inicial
    maxDelay: 10000,       // 10s máximo
    backoffFactor: 2,      // dobra a cada tentativa
  },
  
  // Timeouts especiais
  special: {
    upload: 30000,         // 30s - para uploads grandes
    download: 20000,       // 20s - para downloads
    longPolling: 30000,    // 30s - para conexões persistentes
    batchOperation: 60000, // 60s - operações em lote
  }
} as const;

// Helper types
export type ApiTimeoutKey = keyof typeof TIMEOUT_CONFIG.api;
export type UiTimeoutKey = keyof typeof TIMEOUT_CONFIG.ui;

/**
 * Obtém timeout para uma operação específica
 */
export function getTimeout(operation: string): number {
  // Tentar encontrar timeout específico
  const parts = operation.split('/');
  let config: any = TIMEOUT_CONFIG.api;
  
  for (const part of parts) {
    if (config[part]) {
      config = config[part];
    }
  }
  
  // Se for número, retornar; senão usar default
  return typeof config === 'number' ? config : TIMEOUT_CONFIG.api.default;
}

/**
 * Cria um AbortController com timeout configurado
 */
export function createTimeoutController(timeoutMs?: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeout = timeoutMs || TIMEOUT_CONFIG.api.default;
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  return { controller, timeoutId };
}

/**
 * Executa uma função com timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs?: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeout = timeoutMs || TIMEOUT_CONFIG.api.default;
  
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeout);
    })
  ]);
}

/**
 * Retry com exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<typeof TIMEOUT_CONFIG.retry> = {}
): Promise<T> {
  const config = { ...TIMEOUT_CONFIG.retry, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Não fazer retry se for abort
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      // Calcular delay com backoff
      if (attempt < config.maxAttempts - 1) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Helper para fetch com timeout
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout, ...fetchOptions } = options;
  const { controller, timeoutId } = createTimeoutController(timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout || TIMEOUT_CONFIG.api.default}ms`);
    }
    
    throw error;
  }
} 