// Cache inteligente para substituir Hyperdrive caching
export class DatabaseCache {
  private cache = new Map<string, { data: any; expires: number }>();
  
  // Cache queries por 60 segundos (mesmo que Hyperdrive)
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    // Retorna cache se válido
    if (cached && cached.expires > now) {
      console.log(`🎯 Cache HIT: ${key}`);
      return cached.data;
    }
    
    // Busca dados e salva no cache
    console.log(`📡 Cache MISS: ${key}`);
    const data = await fetcher();
    
    this.cache.set(key, {
      data,
      expires: now + (ttlSeconds * 1000)
    });
    
    // Limpeza automática de cache expirado
    this.cleanup();
    
    return data;
  }
  
  // Remove entradas expiradas
  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
  
  // Limpa cache específico
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  // Status do cache
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton global
export const dbCache = new DatabaseCache(); 