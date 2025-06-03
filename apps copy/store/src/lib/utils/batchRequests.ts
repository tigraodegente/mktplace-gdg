/**
 * Batch múltiplas requests para reduzir latência
 */

interface BatchRequest {
  id: string;
  type: 'product' | 'category' | 'brand' | 'seller';
  identifier: string; // ID ou slug
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface BatchResponse {
  success: boolean;
  data: Record<string, any>;
  errors?: Record<string, string>;
}

export class RequestBatcher {
  private queue: Map<string, BatchRequest> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly batchDelay: number;
  private readonly maxBatchSize: number;
  
  constructor(
    batchDelay: number = 50, // ms
    maxBatchSize: number = 20
  ) {
    this.batchDelay = batchDelay;
    this.maxBatchSize = maxBatchSize;
  }
  
  // Método principal para fazer requests em batch
  async get<T>(
    type: BatchRequest['type'], 
    identifier: string
  ): Promise<T> {
    const requestId = `${type}:${identifier}`;
    
    // Se já existe uma request pendente, retorna a mesma Promise
    const existing = this.queue.get(requestId);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.resolve = resolve;
        existing.reject = reject;
      });
    }
    
    // Criar nova request e adicionar à queue
    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest = {
        id: requestId,
        type,
        identifier,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.queue.set(requestId, request);
      this.scheduleFlush(type);
    });
  }
  
  // Múltiplos gets em uma só chamada
  async getMultiple<T>(
    requests: Array<{ type: BatchRequest['type']; identifier: string }>
  ): Promise<T[]> {
    const promises = requests.map(req => this.get<T>(req.type, req.identifier));
    return Promise.all(promises);
  }
  
  // Schedule flush para um tipo específico
  private scheduleFlush(type: BatchRequest['type']) {
    const timeoutKey = `flush_${type}`;
    
    // Cancelar timeout anterior se existir
    const existingTimeout = this.timeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Flush imediato se atingiu tamanho máximo
    const typeRequests = Array.from(this.queue.values())
      .filter(req => req.type === type);
    
    if (typeRequests.length >= this.maxBatchSize) {
      this.flush(type);
      return;
    }
    
    // Agendar flush
    const timeout = setTimeout(() => {
      this.flush(type);
      this.timeouts.delete(timeoutKey);
    }, this.batchDelay);
    
    this.timeouts.set(timeoutKey, timeout);
  }
  
  // Executar batch para um tipo
  private async flush(type: BatchRequest['type']) {
    const typeRequests = Array.from(this.queue.values())
      .filter(req => req.type === type);
    
    if (typeRequests.length === 0) return;
    
    // Remover da queue
    typeRequests.forEach(req => this.queue.delete(req.id));
    
    // Agrupar por tipo para different endpoints
    const identifiers = typeRequests.map(req => req.identifier);
    
    try {
      console.log(`📦 Batching ${typeRequests.length} ${type} requests:`, identifiers);
      
      const response = await this.executeBatch(type, identifiers);
      
      if (response.success) {
        // Resolver todas as promises com seus respectivos dados
        typeRequests.forEach(req => {
          const data = response.data[req.identifier];
          if (data) {
            req.resolve(data);
          } else {
            req.reject(new Error(`${type} não encontrado: ${req.identifier}`));
          }
        });
      } else {
        // Rejeitar todas se batch falhou
        const error = new Error(`Erro no batch ${type}`);
        typeRequests.forEach(req => req.reject(error));
      }
    } catch (error) {
      console.error(`Erro no batch ${type}:`, error);
      typeRequests.forEach(req => 
        req.reject(error instanceof Error ? error : new Error(String(error)))
      );
    }
  }
  
  // Executar o batch HTTP request
  private async executeBatch(
    type: BatchRequest['type'], 
    identifiers: string[]
  ): Promise<BatchResponse> {
    const endpoints = {
      product: '/api/products/batch',
      category: '/api/categories/batch', 
      brand: '/api/brands/batch',
      seller: '/api/sellers/batch'
    };
    
    const endpoint = endpoints[type];
    if (!endpoint) {
      throw new Error(`Endpoint não encontrado para tipo: ${type}`);
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        identifiers,
        include_relations: true 
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Limpar queue (útil para cleanup)
  clear() {
    this.queue.clear();
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
  }
  
  // Stats para debugging
  getStats() {
    return {
      queueSize: this.queue.size,
      pendingTimeouts: this.timeouts.size,
      queueByType: this.getQueueByType()
    };
  }
  
  private getQueueByType() {
    const byType: Record<string, number> = {};
    this.queue.forEach(req => {
      byType[req.type] = (byType[req.type] || 0) + 1;
    });
    return byType;
  }
}

// Instância global singleton
export const globalBatcher = new RequestBatcher(50, 15);

// Helpers convenientes
export const batchGet = {
  product: (id: string) => globalBatcher.get('product', id),
  category: (id: string) => globalBatcher.get('category', id),
  brand: (id: string) => globalBatcher.get('brand', id),
  seller: (id: string) => globalBatcher.get('seller', id)
};

export const batchGetMultiple = globalBatcher.getMultiple.bind(globalBatcher);

// Cleanup para SPA navigation
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalBatcher.clear();
  });
}

// Hook para Svelte components
export function useBatchRequests() {
  return {
    get: globalBatcher.get.bind(globalBatcher),
    getMultiple: globalBatcher.getMultiple.bind(globalBatcher),
    stats: globalBatcher.getStats.bind(globalBatcher),
    clear: globalBatcher.clear.bind(globalBatcher)
  };
} 