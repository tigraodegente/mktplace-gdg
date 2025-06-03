/**
 * Cache service usando Cloudflare KV
 * Fornece cache distribuído global com TTL
 */

import { logger } from '$lib/utils/logger';

// Definição do tipo KVNamespace (subset da API que usamos)
interface KVNamespace {
  get(key: string, options?: { type: 'json' }): Promise<any>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }>;
}

interface CacheOptions {
  ttl?: number; // Time to live em segundos
  tags?: string[]; // Tags para invalidação em grupo
}

interface CachedValue<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

export class KVCache {
  constructor(
    private kv: KVNamespace,
    private defaultTTL: number = 300 // 5 minutos padrão
  ) {}

  /**
   * Busca valor do cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await this.kv.get(key, { type: 'json' }) as CachedValue<T> | null;
      
      if (!cached) return null;
      
      // Verificar se expirou
      const now = Date.now();
      if (now > cached.timestamp + (cached.ttl * 1000)) {
        // Expirado, deletar
        await this.kv.delete(key);
        return null;
      }
      
      return cached.data;
    } catch (error) {
      logger.error('Erro ao buscar do cache', { key, error });
      return null;
    }
  }

  /**
   * Salva valor no cache
   */
  async set<T = any>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      
      const cached: CachedValue<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        tags: options.tags
      };
      
      // KV tem limite de 90 dias para expirationTtl
      const expirationTtl = Math.min(ttl, 7776000); // 90 dias em segundos
      
      await this.kv.put(key, JSON.stringify(cached), {
        expirationTtl
      });
      
      // Se tiver tags, adicionar às listas de tags
      if (options.tags?.length) {
        await this.addToTags(key, options.tags);
      }
    } catch (error) {
      logger.error('Erro ao salvar no cache', { key, error });
    }
  }

  /**
   * Deleta valor do cache
   */
  async delete(key: string): Promise<void> {
    try {
      // Buscar para pegar as tags
      const cached = await this.kv.get(key, { type: 'json' }) as CachedValue | null;
      
      if (cached?.tags?.length) {
        await this.removeFromTags(key, cached.tags);
      }
      
      await this.kv.delete(key);
    } catch (error) {
      logger.error('Erro ao deletar do cache', { key, error });
    }
  }

  /**
   * Invalida cache por tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.kv.get(tagKey, { type: 'json' }) as string[] | null || [];
      
      // Deletar todas as chaves com essa tag
      await Promise.all(keys.map(key => this.delete(key)));
      
      // Limpar a lista de tags
      await this.kv.delete(tagKey);
    } catch (error) {
      logger.error('Erro ao invalidar por tag', { tag, error });
    }
  }

  /**
   * Limpa todo o cache (cuidado!)
   */
  async clear(prefix?: string): Promise<void> {
    try {
      const list = await this.kv.list({ prefix });
      const keys = list.keys.map(k => k.name);
      
      // Deletar em lotes de 100
      for (let i = 0; i < keys.length; i += 100) {
        const batch = keys.slice(i, i + 100);
        await Promise.all(batch.map(key => this.kv.delete(key)));
      }
    } catch (error) {
      logger.error('Erro ao limpar cache', { prefix, error });
    }
  }

  /**
   * Helpers privados para gerenciar tags
   */
  private async addToTags(key: string, tags: string[]): Promise<void> {
    await Promise.all(tags.map(async tag => {
      const tagKey = `tag:${tag}`;
      const keys = await this.kv.get(tagKey, { type: 'json' }) as string[] | null || [];
      
      if (!keys.includes(key)) {
        keys.push(key);
        await this.kv.put(tagKey, JSON.stringify(keys), {
          expirationTtl: 86400 // 24 horas
        });
      }
    }));
  }

  private async removeFromTags(key: string, tags: string[]): Promise<void> {
    await Promise.all(tags.map(async tag => {
      const tagKey = `tag:${tag}`;
      const keys = await this.kv.get(tagKey, { type: 'json' }) as string[] | null || [];
      
      const filtered = keys.filter(k => k !== key);
      if (filtered.length > 0) {
        await this.kv.put(tagKey, JSON.stringify(filtered), {
          expirationTtl: 86400
        });
      } else {
        await this.kv.delete(tagKey);
      }
    }));
  }
}

/**
 * Helper para criar instância do cache
 */
export function createCache(kv: KVNamespace, defaultTTL?: number): KVCache {
  return new KVCache(kv, defaultTTL);
}

/**
 * Decorator para cache automático em métodos
 */
export function cached(ttl: number = 300, keyPrefix?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Precisa ter acesso ao KV através do contexto
      const kv = (this as any).kv;
      if (!kv) {
        // Sem KV, executar sem cache
        return originalMethod.apply(this, args);
      }
      
      const cache = new KVCache(kv);
      const cacheKey = `${keyPrefix || target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      // Tentar buscar do cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Executar método original
      const result = await originalMethod.apply(this, args);
      
      // Salvar no cache
      await cache.set(cacheKey, result, { ttl });
      
      return result;
    };
    
    return descriptor;
  };
} 