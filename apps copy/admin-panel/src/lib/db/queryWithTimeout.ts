/**
 * Helper para executar queries com timeout
 * 
 * Usa a configuração centralizada de timeouts e fornece
 * uma interface consistente para todas as queries do banco
 */

import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { Database } from './database.types';

export interface QueryOptions {
  timeout?: number;
  operation?: string;
  retryable?: boolean;
}

/**
 * Executa uma query com timeout configurado
 */
export async function queryWithTimeout<T>(
  db: Database,
  queryFn: (db: Database) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const {
    timeout,
    operation = 'default',
    retryable = false
  } = options;
  
  // Determinar timeout baseado na operação
  const timeoutMs = timeout || getTimeoutForOperation(operation);
  
  try {
    // Executar query com timeout
    const result = await withTimeout(
      () => queryFn(db),
      timeoutMs,
      `Database query timeout after ${timeoutMs}ms`
    );
    
    return result;
  } catch (error) {
    // Se for timeout e a operação for retry-able, podemos tentar novamente
    if (retryable && error instanceof Error && error.message.includes('timeout')) {
      console.warn(`Query timeout, retrying once: ${operation}`);
      
      // Uma única retry com timeout maior
      return withTimeout(
        () => queryFn(db),
        timeoutMs * 1.5,
        `Database query retry timeout after ${timeoutMs * 1.5}ms`
      );
    }
    
    throw error;
  }
}

/**
 * Determina o timeout apropriado para uma operação
 */
function getTimeoutForOperation(operation: string): number {
  // Mapear operações para timeouts específicos
  const operationMap: Record<string, number> = {
    // Auth
    'auth/login': TIMEOUT_CONFIG.api.auth.login,
    'auth/register': TIMEOUT_CONFIG.api.auth.register,
    'auth/logout': TIMEOUT_CONFIG.api.auth.logout,
    
    // Products
    'products/list': TIMEOUT_CONFIG.api.products.list,
    'products/single': TIMEOUT_CONFIG.api.products.single,
    'products/search': TIMEOUT_CONFIG.api.products.search,
    
    // Orders
    'orders/create': TIMEOUT_CONFIG.api.orders.create,
    'orders/list': TIMEOUT_CONFIG.api.orders.list,
    'orders/single': TIMEOUT_CONFIG.api.orders.single,
    
    // Shipping
    'shipping/calculate': TIMEOUT_CONFIG.api.shipping.calculate,
    'shipping/simple': TIMEOUT_CONFIG.api.shipping.simple,
    
    // Categories
    'categories': TIMEOUT_CONFIG.api.categories,
    
    // Stock
    'stock/check': TIMEOUT_CONFIG.api.stock.check,
    'stock/reserve': TIMEOUT_CONFIG.api.stock.reserve,
    
    // Default
    'default': TIMEOUT_CONFIG.api.default
  };
  
  return operationMap[operation] || TIMEOUT_CONFIG.api.default;
}

/**
 * Helper específico para queries em batch
 */
export async function batchQueryWithTimeout<T>(
  db: Database,
  queries: Array<(db: Database) => Promise<any>>,
  options: QueryOptions = {}
): Promise<T[]> {
  const timeout = options.timeout || TIMEOUT_CONFIG.special.batchOperation;
  
  return withTimeout(
    () => Promise.all(queries.map(q => q(db))),
    timeout,
    `Batch query timeout after ${timeout}ms`
  );
}

/**
 * Helper para transações com timeout
 */
export async function transactionWithTimeout<T>(
  db: Database,
  transactionFn: (db: Database) => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const timeout = options.timeout || TIMEOUT_CONFIG.api.orders.create; // Usar timeout de transação
  
  return withTimeout(
    async () => {
      // Iniciar transação
      await db.query`BEGIN`;
      
      try {
        const result = await transactionFn(db);
        await db.query`COMMIT`;
        return result;
      } catch (error) {
        await db.query`ROLLBACK`;
        throw error;
      }
    },
    timeout,
    `Transaction timeout after ${timeout}ms`
  );
} 