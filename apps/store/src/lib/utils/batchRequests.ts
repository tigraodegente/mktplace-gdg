/**
 * Batch múltiplas requests para reduzir latência
 */

interface BatchRequest {
  id: string;
  endpoint: string;
  params?: Record<string, any>;
}

interface BatchResponse {
  id: string;
  data?: any;
  error?: string;
}

class RequestBatcher {
  private queue: Map<string, {
    request: BatchRequest;
    resolve: (data: any) => void;
    reject: (error: any) => void;
  }> = new Map();
  
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly batchDelay = 10; // ms
  private readonly maxBatchSize = 10;

  async add(request: BatchRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.set(request.id, { request, resolve, reject });
      
      // Se atingiu o tamanho máximo, processar imediatamente
      if (this.queue.size >= this.maxBatchSize) {
        this.flush();
      } else {
        // Senão, agendar processamento
        this.scheduleFlush();
      }
    });
  }

  private scheduleFlush() {
    if (this.timer) return;
    
    this.timer = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.size === 0) return;

    // Copiar queue atual e limpar
    const currentBatch = Array.from(this.queue.entries());
    this.queue.clear();

    try {
      // Enviar batch request
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: currentBatch.map(([_, item]) => item.request)
        })
      });

      if (!response.ok) {
        throw new Error('Batch request failed');
      }

      const results: BatchResponse[] = await response.json();
      
      // Resolver promises individuais
      for (const result of results) {
        const item = currentBatch.find(([id]) => id === result.id);
        if (item) {
          const [_, { resolve, reject }] = item;
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.data);
          }
        }
      }
    } catch (error) {
      // Rejeitar todas as promises em caso de erro
      currentBatch.forEach(([_, { reject }]) => reject(error));
    }
  }
}

// Singleton
export const batcher = new RequestBatcher();

// Helper functions
export async function batchGetProduct(id: string) {
  return batcher.add({
    id: `product-${id}`,
    endpoint: 'products',
    params: { id }
  });
}

export async function batchGetCategory(slug: string) {
  return batcher.add({
    id: `category-${slug}`,
    endpoint: 'categories',
    params: { slug }
  });
}

export async function batchGetMultiple(requests: Array<{type: string, id: string}>) {
  return Promise.all(
    requests.map(req => 
      batcher.add({
        id: `${req.type}-${req.id}`,
        endpoint: req.type,
        params: { id: req.id }
      })
    )
  );
} 