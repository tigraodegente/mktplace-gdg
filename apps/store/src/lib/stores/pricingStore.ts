import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { pricingService, type PricingConfig, type PricingContext } from '../../../../../packages/shared-config/src/pricing-service';

// Estado do store
interface PricingState {
  config: PricingConfig | null;
  isLoading: boolean;
  lastUpdate: number;
  error: string | null;
}

// Store interno
const pricingState = writable<PricingState>({
  config: null,
  isLoading: false,
  lastUpdate: 0,
  error: null
});

// Store público (readonly)
export const pricing = {
  subscribe: pricingState.subscribe
};

// Store derivado para facilitar acesso aos valores
export const pricingConfig = derived(
  pricingState,
  ($state) => $state.config
);

// Estados específicos
export const isLoading = derived(
  pricingState,
  ($state) => $state.isLoading
);

export const pricingError = derived(
  pricingState,
  ($state) => $state.error
);

// Cache de contextos específicos
const contextCache = new Map<string, { config: PricingConfig; timestamp: number }>();
const CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

class PricingStore {
  private initialized = false;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Inicializar o store (deve ser chamado no layout principal)
   */
  async initialize() {
    if (!browser || this.initialized) return;

    try {
      this.initialized = true;
      
      // Inicializar o service
      await pricingService.initialize('/api');
      
      // Carregar configurações iniciais
      await this.loadConfig();
      
      // Auto-refresh a cada 5 minutos
      this.refreshInterval = setInterval(() => {
        this.loadConfig().catch(console.error);
      }, 5 * 60 * 1000);
      
      console.log('✅ PricingStore inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar PricingStore:', error);
      pricingState.update(state => ({
        ...state,
        error: 'Erro ao carregar configurações de preços',
        isLoading: false
      }));
    }
  }

  /**
   * Carregar configurações do service
   */
  async loadConfig(context?: PricingContext): Promise<PricingConfig | null> {
    if (!browser) return null;

    const cacheKey = this.getCacheKey(context);
    
    // Verificar cache de contexto
    if (context) {
      const cached = contextCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CONTEXT_CACHE_TTL) {
        return cached.config;
      }
    }

    try {
      // Indicar carregamento apenas para config global
      if (!context) {
        pricingState.update(state => ({ ...state, isLoading: true, error: null }));
      }
      
      const config = await pricingService.getConfigs(context);
      
      // Atualizar store principal apenas se for config global
      if (!context) {
        pricingState.update(state => ({
          ...state,
          config,
          isLoading: false,
          lastUpdate: Date.now(),
          error: null
        }));
      }
      
      // Salvar no cache de contexto
      if (context) {
        contextCache.set(cacheKey, {
          config,
          timestamp: Date.now()
        });
      }
      
      return config;
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      
      if (!context) {
        pricingState.update(state => ({
          ...state,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }));
      }
      
      return null;
    }
  }

  /**
   * Obter configuração com cache
   */
  async getConfig(context?: PricingContext): Promise<PricingConfig | null> {
    return this.loadConfig(context);
  }

  /**
   * Calcular preço PIX
   */
  async calculatePixPrice(price: number, context?: PricingContext): Promise<number> {
    const config = await this.getConfig(context);
    if (!config?.pix_enabled) return price;
    
    const discountPercent = config.pix_discount_percent / 100;
    return price * (1 - discountPercent);
  }

  /**
   * Calcular parcelamento padrão
   */
  async calculateDefaultInstallment(price: number, context?: PricingContext) {
    const config = await this.getConfig(context);
    if (!config) return { number: 1, value: price, hasInterest: false };
    
    const maxInstallments = Math.floor(price / config.installments_min_value);
    const installments = Math.min(config.installments_default, maxInstallments);
    const finalInstallments = Math.max(1, installments);
    
    const value = price / finalInstallments;
    const hasInterest = finalInstallments > config.installments_interest_free_up_to;
    
    return {
      number: finalInstallments,
      value: hasInterest ? value * (1 + config.installments_interest_rate_monthly / 100) : value,
      hasInterest,
      interestRate: hasInterest ? config.installments_interest_rate_monthly : 0
    };
  }

  /**
   * Verificar se frete é grátis
   */
  async hasFreeShipping(orderTotal: number, context?: PricingContext): Promise<boolean> {
    const config = await this.getConfig(context);
    return config ? orderTotal >= config.free_shipping_threshold : false;
  }

  /**
   * Limpar cache
   */
  clearCache() {
    contextCache.clear();
    pricingService.clearCache();
    pricingState.update(state => ({
      ...state,
      lastUpdate: 0
    }));
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      contextCacheSize: contextCache.size,
      serviceStats: pricingService.getCacheStats(),
      isInitialized: this.initialized
    };
  }

  /**
   * Destruir o store
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.initialized = false;
    contextCache.clear();
  }

  // Método utilitário
  private getCacheKey(context?: PricingContext): string {
    if (!context) return 'default';
    return `${context.categoryId || 'null'}_${context.sellerId || 'null'}_${context.userSegment || 'null'}`;
  }
}

// Instância singleton
export const pricingStore = new PricingStore();

// Helpers derivados para uso fácil nos componentes
export const pixDiscountPercent = derived(
  pricingConfig,
  ($config) => $config?.pix_discount_percent || 5
);

export const defaultInstallments = derived(
  pricingConfig,
  ($config) => $config?.installments_default || 12
);

export const minInstallmentValue = derived(
  pricingConfig,
  ($config) => $config?.installments_min_value || 20
);

export const freeShippingThreshold = derived(
  pricingConfig,
  ($config) => $config?.free_shipping_threshold || 199
);

// Hook para uso em componentes
export function usePricing(context?: PricingContext) {
  return {
    // Métodos
    calculatePixPrice: (price: number) => pricingStore.calculatePixPrice(price, context),
    calculateDefaultInstallment: (price: number) => pricingStore.calculateDefaultInstallment(price, context),
    hasFreeShipping: (total: number) => pricingStore.hasFreeShipping(total, context),
    getConfig: () => pricingStore.getConfig(context),
    
    // Stores
    config: pricingConfig,
    isLoading,
    error: pricingError
  };
} 