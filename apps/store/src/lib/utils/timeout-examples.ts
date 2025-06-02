/**
 * Exemplos de uso correto de timeouts
 * 
 * Este arquivo demonstra as melhores práticas para
 * implementar timeouts em diferentes cenários
 */

import { TIMEOUT_CONFIG, withTimeout, fetchWithTimeout } from '$lib/config/timeouts';
import { queryWithTimeout } from '$lib/db/queryWithTimeout';

// ========================================
// EXEMPLO 1: API com timeout simples
// ========================================
export async function exemploAPISimples() {
  // ❌ EVITE: Timeout hardcoded
  // setTimeout(() => reject(new Error('Timeout')), 10000);
  
  // ✅ USE: Configuração centralizada
  return withTimeout(
    async () => {
      // Sua lógica aqui
      const response = await fetch('/api/data');
      return response.json();
    },
    TIMEOUT_CONFIG.api.default,
    'API timeout'
  );
}

// ========================================
// EXEMPLO 2: Fetch com timeout
// ========================================
export async function exemploFetchComTimeout() {
  // ❌ EVITE: Promise.race manual
  // const timeoutPromise = new Promise((_, reject) => {
  //   setTimeout(() => reject(new Error('Timeout')), 5000);
  // });
  // const result = await Promise.race([fetch(url), timeoutPromise]);
  
  // ✅ USE: fetchWithTimeout helper
  try {
    const response = await fetchWithTimeout('/api/products', {
      method: 'GET',
      timeout: TIMEOUT_CONFIG.api.products.list
    });
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.includes('timeout')) {
      console.error('Request timed out');
    }
    throw error;
  }
}

// ========================================
// EXEMPLO 3: Query de banco com timeout
// ========================================
export async function exemploQueryBanco(db: any) {
  // ❌ EVITE: Timeout manual em queries
  // const queryPromise = db.query`SELECT * FROM products`;
  // const timeoutPromise = new Promise((_, reject) => {
  //   setTimeout(() => reject(new Error('Timeout')), 12000);
  // });
  // const result = await Promise.race([queryPromise, timeoutPromise]);
  
  // ✅ USE: queryWithTimeout helper
  return queryWithTimeout(
    db,
    async (db) => {
      // Queries complexas aqui
      const products = await db.query`
        SELECT * FROM products 
        WHERE is_active = true
        LIMIT 100
      `;
      
      // Pode ter múltiplas queries
      const images = await db.query`
        SELECT * FROM product_images
        WHERE product_id = ANY(${products.map(p => p.id)})
      `;
      
      return { products, images };
    },
    {
      operation: 'products/list',
      retryable: true
    }
  );
}

// ========================================
// EXEMPLO 4: Timeout em operações de UI
// ========================================
export function exemploTimeoutUI() {
  // Para notificações temporárias
  const showNotification = (message: string) => {
    // Mostrar notificação
    console.log(message);
    
    // ✅ USE: Timeout configurado para UI
    setTimeout(() => {
      // Esconder notificação
      console.log('Hide notification');
    }, TIMEOUT_CONFIG.ui.notification);
  };
  
  // Para debounce de inputs
  let debounceTimer: NodeJS.Timeout;
  const handleInput = (value: string) => {
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      // Processar input
      console.log('Process input:', value);
    }, TIMEOUT_CONFIG.ui.debounce);
  };
}

// ========================================
// EXEMPLO 5: Retry com backoff
// ========================================
import { retryWithBackoff } from '$lib/config/timeouts';

export async function exemploRetryComBackoff() {
  // ❌ EVITE: Retry manual com delay fixo
  // for (let i = 0; i < 3; i++) {
  //   try {
  //     return await apiCall();
  //   } catch (error) {
  //     await new Promise(resolve => setTimeout(resolve, 1000));
  //   }
  // }
  
  // ✅ USE: retryWithBackoff helper
  return retryWithBackoff(
    async () => {
      const response = await fetch('/api/flaky-endpoint');
      if (!response.ok) throw new Error('API Error');
      return response.json();
    },
    {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000
    }
  );
}

// ========================================
// EXEMPLO 6: Timeout específico por operação
// ========================================
export async function exemploTimeoutEspecifico(operation: string) {
  // Determinar timeout baseado na operação
  let timeout: number;
  
  switch (operation) {
    case 'auth':
      timeout = TIMEOUT_CONFIG.api.auth.login;
      break;
    case 'upload':
      timeout = TIMEOUT_CONFIG.special.upload;
      break;
    case 'payment':
      timeout = TIMEOUT_CONFIG.api.payments.process;
      break;
    default:
      timeout = TIMEOUT_CONFIG.api.default;
  }
  
  return withTimeout(
    async () => {
      // Operação específica
      return performOperation(operation);
    },
    timeout,
    `${operation} timeout`
  );
}

// Função auxiliar de exemplo
async function performOperation(operation: string) {
  // Simular operação
  return { success: true, operation };
}

// ========================================
// EXEMPLO 7: AbortController para APIs externas
// ========================================
export async function exemploAbortController() {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(), 
    TIMEOUT_CONFIG.api.shipping.calculate
  );
  
  try {
    const response = await fetch('https://api.externa.com/shipping', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ /* dados */ })
    });
    
    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Shipping calculation timeout');
    }
    
    throw error;
  }
}

// ========================================
// RESUMO DE BOAS PRÁTICAS
// ========================================
/**
 * 1. SEMPRE use a configuração centralizada de timeouts
 * 2. EVITE timeouts hardcoded no código
 * 3. USE helpers apropriados (withTimeout, queryWithTimeout, fetchWithTimeout)
 * 4. IMPLEMENTE retry com exponential backoff para operações que podem falhar
 * 5. CONSIDERE AbortController para requisições HTTP
 * 6. MONITORE timeouts em produção para ajustar valores
 * 7. DOCUMENTE operações que precisam de timeouts especiais
 * 8. TESTE comportamento de timeout em condições adversas
 */ 