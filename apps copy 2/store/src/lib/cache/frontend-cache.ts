// Cache avançado para o frontend usando IndexedDB
import { browser } from '$app/environment';

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
}

class FrontendCache {
  private dbName = 'marketplace-cache';
  private version = 1;
  private storeName = 'cache-store';
  private db: IDBDatabase | null = null;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private maxMemoryItems = 50;

  async init() {
    if (!browser || this.db) return;

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.cleanupExpired();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | null> {
    // Verificar memória primeiro
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data;
    }

    // Verificar IndexedDB
    if (!browser || !this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        
        if (entry && this.isValid(entry)) {
          // Adicionar à memória
          this.addToMemory(entry);
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    };

    // Adicionar à memória
    this.addToMemory(entry);

    // Salvar no IndexedDB
    if (!browser || !this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (!browser || !this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (!browser || !this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private addToMemory(entry: CacheEntry<any>) {
    // Limitar tamanho da memória
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const oldestKey = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(entry.key, entry);
  }

  private async cleanupExpired() {
    if (!browser || !this.db) return;

    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('timestamp');
    const now = Date.now();

    index.openCursor().onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      
      if (cursor) {
        const entry = cursor.value as CacheEntry<any>;
        
        if (!this.isValid(entry)) {
          cursor.delete();
        }
        
        cursor.continue();
      }
    };
  }

  // Métodos específicos para diferentes tipos de dados
  async getProducts(params: Record<string, any>) {
    const key = `products:${JSON.stringify(params)}`;
    return this.get(key);
  }

  async setProducts(params: Record<string, any>, data: any, ttl = 300) {
    const key = `products:${JSON.stringify(params)}`;
    return this.set(key, data, ttl);
  }

  async getCategories() {
    return this.get('categories:all');
  }

  async setCategories(data: any, ttl = 3600) {
    return this.set('categories:all', data, ttl);
  }

  // Pré-carregar dados importantes
  async preload() {
    if (!browser) return;

    try {
      // Pré-carregar categorias
      const categoriesResponse = await fetch('/api/categories/tree');
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        await this.setCategories(categories.data);
      }

      // Pré-carregar produtos em destaque
      const featuredResponse = await fetch('/api/products/featured');
      if (featuredResponse.ok) {
        const featured = await featuredResponse.json();
        await this.set('products:featured', featured.data, 1800); // 30 minutos
      }

      console.log('✅ Cache pré-carregado');
    } catch (error) {
      console.error('❌ Erro ao pré-carregar cache:', error);
    }
  }

  // Estatísticas do cache
  async getStats() {
    const memorySize = this.memoryCache.size;
    let dbSize = 0;

    if (browser && this.db) {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      dbSize = await new Promise<number>((resolve) => {
        countRequest.onsuccess = () => resolve(countRequest.result);
        countRequest.onerror = () => resolve(0);
      });
    }

    return {
      memoryItems: memorySize,
      dbItems: dbSize,
      totalItems: memorySize + dbSize
    };
  }
}

// Singleton
export const frontendCache = new FrontendCache();

// Hook para usar com Svelte
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
) {
  let data = $state<T | null>(null);
  let loading = $state(true);
  let error = $state<Error | null>(null);

  async function load() {
    try {
      loading = true;
      
      // Tentar cache primeiro
      const cached = await frontendCache.get<T>(key);
      if (cached) {
        data = cached;
        loading = false;
        return;
      }

      // Buscar dados frescos
      const fresh = await fetcher();
      data = fresh;
      
      // Salvar no cache
      await frontendCache.set(key, fresh, ttl);
    } catch (e) {
      error = e as Error;
    } finally {
      loading = false;
    }
  }

  return {
    get data() { return data; },
    get loading() { return loading; },
    get error() { return error; },
    reload: load
  };
} 