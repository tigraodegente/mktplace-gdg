// Service dinâmico para configurações de pricing
// Substitui constantes hardcoded por valores do banco de dados

interface PricingConfig {
  pix_discount_percent: number;
  pix_enabled: boolean;
  installments_default: number;
  installments_max: number;
  installments_min_value: number;
  installments_interest_free_up_to: number;
  installments_interest_rate_monthly: number;
  boleto_discount_percent: number;
  debit_discount_percent: number;
  free_shipping_threshold: number;
  express_shipping_fee: number;
  processing_fee_percent: number;
  convenience_fee_boleto: number;
  // Configurações promocionais
  black_friday_multiplier?: number;
  cyber_monday_discount?: number;
}

interface PricingContext {
  categoryId?: number;
  sellerId?: string;
  userSegment?: 'premium' | 'standard' | 'new';
}

class PricingService {
  private cache: Map<string, { data: PricingConfig; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_CACHE_SIZE = 100;
  private fallbackConfig: PricingConfig;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  constructor() {
    // Configurações padrão como fallback
    this.fallbackConfig = {
      pix_discount_percent: 5,
      pix_enabled: true,
      installments_default: 12,
      installments_max: 24,
      installments_min_value: 20,
      installments_interest_free_up_to: 2,
      installments_interest_rate_monthly: 2.99,
      boleto_discount_percent: 3,
      debit_discount_percent: 2,
      free_shipping_threshold: 199,
      express_shipping_fee: 15,
      processing_fee_percent: 3.79,
      convenience_fee_boleto: 3
    };
  }

  /**
   * Inicializar o service (deve ser chamado no app startup)
   */
  async initialize(apiBaseUrl: string = '/api') {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Carregar configurações iniciais
        await this.loadConfigs(apiBaseUrl);
        this.isInitialized = true;
        
        // Auto-refresh a cada 5 minutos
        setInterval(() => {
          this.loadConfigs(apiBaseUrl).catch(console.error);
        }, this.CACHE_TTL);
        
        console.log('✅ PricingService inicializado com sucesso');
      } catch (error) {
        console.warn('⚠️ Erro ao inicializar PricingService, usando fallback:', error);
        this.isInitialized = true; // Permite uso com fallback
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Buscar configurações do servidor
   */
  private async loadConfigs(apiBaseUrl: string, context?: PricingContext): Promise<PricingConfig> {
    const cacheKey = this.getCacheKey(context);
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Construir URL com parâmetros
      const params = new URLSearchParams();
      if (context?.categoryId) params.set('category_id', context.categoryId.toString());
      if (context?.sellerId) params.set('seller_id', context.sellerId);
      if (context?.userSegment) params.set('user_segment', context.userSegment);
      
      const url = `${apiBaseUrl}/pricing/configs?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'API retornou erro');
      }
      
      const config = result.data;
      
      // Salvar no cache
      this.cache.set(cacheKey, {
        data: config,
        timestamp: Date.now()
      });
      
      // Limpar cache se muito grande
      this.cleanupCache();
      
      return config;
      
    } catch (error) {
      console.warn('⚠️ Erro ao carregar configs do servidor:', error);
      return this.fallbackConfig;
    }
  }

  /**
   * Obter configurações (com cache inteligente)
   */
  async getConfigs(context?: PricingContext): Promise<PricingConfig> {
    // Se ainda não inicializou mas tem Promise em progresso, aguardar
    if (!this.isInitialized && this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.isInitialized) {
      return this.fallbackConfig;
    }

    return this.loadConfigs('/api', context);
  }

  /**
   * Calcular preço PIX com desconto
   */
  async calculatePixPrice(price: number, context?: PricingContext): Promise<number> {
    const config = await this.getConfigs(context);
    if (!config.pix_enabled) return price;
    
    const discountPercent = config.pix_discount_percent / 100;
    return price * (1 - discountPercent);
  }

  /**
   * Calcular opções de parcelamento
   */
  async calculateInstallments(price: number, context?: PricingContext) {
    const config = await this.getConfigs(context);
    const options = [];
    
    for (let i = 1; i <= config.installments_max; i++) {
      const value = price / i;
      
      // Verificar valor mínimo
      if (value < config.installments_min_value) break;
      
      const hasInterest = i > config.installments_interest_free_up_to;
      const finalValue = hasInterest 
        ? value * (1 + config.installments_interest_rate_monthly / 100)
        : value;
      
      options.push({
        number: i,
        value: finalValue,
        hasInterest,
        interestRate: hasInterest ? config.installments_interest_rate_monthly : 0,
        label: i === 1 
          ? `À vista R$ ${finalValue.toFixed(2)}`
          : `${i}x de R$ ${finalValue.toFixed(2)} ${hasInterest ? 'c/ juros' : 's/ juros'}`
      });
    }
    
    return options;
  }

  /**
   * Obter opção de parcelamento padrão
   */
  async getDefaultInstallment(price: number, context?: PricingContext) {
    const config = await this.getConfigs(context);
    const installments = await this.calculateInstallments(price, context);
    
    // Retornar a opção padrão (geralmente 12x ou o máximo disponível)
    const preferredInstallment = Math.min(config.installments_default, installments.length);
    return installments[preferredInstallment - 1] || installments[installments.length - 1];
  }

  /**
   * Verificar se frete grátis aplica
   */
  async hasFreeShipping(orderTotal: number, context?: PricingContext): Promise<boolean> {
    const config = await this.getConfigs(context);
    return orderTotal >= config.free_shipping_threshold;
  }

  /**
   * Calcular taxa de processamento
   */
  async calculateProcessingFee(amount: number, context?: PricingContext): Promise<number> {
    const config = await this.getConfigs(context);
    return amount * (config.processing_fee_percent / 100);
  }

  /**
   * Obter multiplicador promocional
   */
  async getPromotionalMultiplier(promoType: 'black_friday' | 'cyber_monday', context?: PricingContext): Promise<number> {
    const config = await this.getConfigs(context);
    const key = `${promoType}_multiplier` as keyof PricingConfig;
    return (config[key] as number) || 1;
  }

  // Métodos utilitários
  private getCacheKey(context?: PricingContext): string {
    if (!context) return 'default';
    return `${context.categoryId || 'null'}_${context.sellerId || 'null'}_${context.userSegment || 'null'}`;
  }

  private cleanupCache() {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;
    
    // Remover entradas mais antigas
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE / 2));
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Limpar cache manualmente
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obter estatísticas do cache
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      isInitialized: this.isInitialized
    };
  }
}

// Instância singleton
export const pricingService = new PricingService();

// Exportar tipos
export type { PricingConfig, PricingContext }; 