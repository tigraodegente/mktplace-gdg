/**
 * Persistence Service - Cart Feature
 * 
 * Responsável por todas as operações de persistência do carrinho
 * Funções puras extraídas para melhor testabilidade e manutenção
 */

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistenceConfig {
  storage: StorageProvider;
  keyPrefix?: string;
  errorHandler?: (error: Error, operation: string) => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

export const STORAGE_KEYS = {
  CART: 'cart',
  COUPON: 'cartCoupon',
  SESSION: 'cartSessionId'
} as const;

// =============================================================================
// DEFAULT IMPLEMENTATIONS
// =============================================================================

const defaultStorage: StorageProvider = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Storage getItem failed for key: ${key}`, e);
      return null;
    }
  },
  
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Storage setItem failed for key: ${key}`, e);
    }
  },
  
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Storage removeItem failed for key: ${key}`, e);
    }
  }
};

const defaultErrorHandler = (error: Error, operation: string) => {
  console.error(`Persistence error during ${operation}:`, error);
};

// =============================================================================
// PERSISTENCE SERVICE
// =============================================================================

export class CartPersistenceService {
  private storage: StorageProvider;
  private keyPrefix: string;
  private errorHandler: (error: Error, operation: string) => void;
  
  constructor(config: Partial<PersistenceConfig> = {}) {
    this.storage = config.storage || defaultStorage;
    this.keyPrefix = config.keyPrefix || '';
    this.errorHandler = config.errorHandler || defaultErrorHandler;
  }
  
  /**
   * Carrega dados do storage com fallback seguro
   */
  loadFromStorage<T>(key: string, fallback: T): T {
    try {
      const fullKey = this.keyPrefix + key;
      const saved = this.storage.getItem(fullKey);
      
      if (!saved) return fallback;
      
      return JSON.parse(saved);
    } catch (error) {
      this.errorHandler(error as Error, `loadFromStorage(${key})`);
      return fallback;
    }
  }
  
  /**
   * Salva dados no storage com error handling
   */
  saveToStorage<T>(key: string, value: T): boolean {
    try {
      const fullKey = this.keyPrefix + key;
      const serialized = JSON.stringify(value);
      this.storage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      this.errorHandler(error as Error, `saveToStorage(${key})`);
      return false;
    }
  }
  
  /**
   * Remove item do storage
   */
  removeFromStorage(key: string): boolean {
    try {
      const fullKey = this.keyPrefix + key;
      this.storage.removeItem(fullKey);
      return true;
    } catch (error) {
      this.errorHandler(error as Error, `removeFromStorage(${key})`);
      return false;
    }
  }
  
  /**
   * Limpa todos os dados do carrinho
   */
  clearCartData(): boolean {
    try {
      this.removeFromStorage(STORAGE_KEYS.CART);
      this.removeFromStorage(STORAGE_KEYS.COUPON);
      // Manter SESSION para continuidade
      return true;
    } catch (error) {
      this.errorHandler(error as Error, 'clearCartData');
      return false;
    }
  }
  
  /**
   * Verifica se storage está disponível
   */
  isStorageAvailable(): boolean {
    try {
      const testKey = '__cart_storage_test__';
      this.storage.setItem(testKey, 'test');
      this.storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// FACTORY E SINGLETON
// =============================================================================

let defaultInstance: CartPersistenceService | null = null;

/**
 * Obtém instância padrão do service (singleton)
 */
export function getCartPersistenceService(): CartPersistenceService {
  if (!defaultInstance) {
    defaultInstance = new CartPersistenceService();
  }
  return defaultInstance;
}

/**
 * Cria nova instância com configuração específica
 */
export function createCartPersistenceService(config: PersistenceConfig): CartPersistenceService {
  return new CartPersistenceService(config);
}

// =============================================================================
// FUNÇÕES DE COMPATIBILIDADE (Para migração gradual)
// =============================================================================

/**
 * @deprecated Use getCartPersistenceService().loadFromStorage() 
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  return getCartPersistenceService().loadFromStorage(key, fallback);
}

/**
 * @deprecated Use getCartPersistenceService().saveToStorage()
 */
export function saveToStorage<T>(key: string, value: T): void {
  getCartPersistenceService().saveToStorage(key, value);
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Migra dados entre versões de storage
 */
export function migrateStorageData(
  fromKeys: string[], 
  toKeys: string[], 
  transformer?: (data: any) => any
): boolean {
  try {
    const service = getCartPersistenceService();
    
    fromKeys.forEach((fromKey, index) => {
      const toKey = toKeys[index];
      if (!toKey) return;
      
      const data = service.loadFromStorage(fromKey, null);
      if (data) {
        const transformedData = transformer ? transformer(data) : data;
        service.saveToStorage(toKey, transformedData);
        service.removeFromStorage(fromKey);
      }
    });
    
    return true;
  } catch (error) {
    console.error('Storage migration failed:', error);
    return false;
  }
} 