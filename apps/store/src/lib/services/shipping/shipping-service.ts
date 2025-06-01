// =====================================================
// SERVIÇO PRINCIPAL DE TRANSPORTADORAS
// Sistema otimizado e extensível
// =====================================================

import type { 
  IShippingProvider,
  ShippingProvider, 
  ShippingOrderData, 
  ShippingResponse, 
  ShippingOperationResult,
  ShippingSystemConfig,
  OrderShippingData
} from '$lib/types/shipping';

import { ShippingProviderFactory } from './provider-factory';
import { getDatabase } from '$lib/db';

// =====================================================
// CACHE EM MEMÓRIA PARA PERFORMANCE
// =====================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMinutes: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// =====================================================
// SERVIÇO PRINCIPAL
// =====================================================

export class ShippingService {
  private providers: Record<string, IShippingProvider> = {};
  private config: ShippingSystemConfig;
  private cache = new MemoryCache();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ShippingSystemConfig) {
    this.config = config;
    this.initializeProviders();
  }

  // =====================================================
  // INICIALIZAÇÃO
  // =====================================================

  private initializeProviders(): void {
    console.log('[SHIPPING] Inicializando sistema de transportadoras...');
    
    this.providers = ShippingProviderFactory.createProviders(this.config.providers);
    
    const enabledProviders = Object.keys(this.providers);
    console.log(`[SHIPPING] Providers ativos: ${enabledProviders.join(', ')}`);
    
    if (enabledProviders.length === 0) {
      console.warn('[SHIPPING] ⚠️ Nenhum provider ativo! Sistema funcionará sem integração.');
    }
  }

  // =====================================================
  // MÉTODO PRINCIPAL - ENVIAR PEDIDO
  // =====================================================

  async sendOrderToShipping(
    orderId: string, 
    orderData: ShippingOrderData,
    platform: any
  ): Promise<ShippingOperationResult> {
    
    if (!this.config.enabled) {
      console.log(`[SHIPPING] Sistema desabilitado para pedido ${orderData.order_number}`);
      return {
        success: true, // Não é erro, apenas desabilitado
        orderId,
        error: 'Sistema de integração desabilitado'
      };
    }

    const logPrefix = `[SHIPPING:${orderData.order_number}]`;
    console.log(`${logPrefix} Iniciando envio para transportadora...`);

    // Verificar cache primeiro (evita reenvios duplicados)
    const cacheKey = `shipping_sent_${orderId}`;
    const cachedResult = this.cache.get<ShippingOperationResult>(cacheKey);
    if (cachedResult?.success) {
      console.log(`${logPrefix} ✅ Já enviado (cache hit)`);
      return cachedResult;
    }

    // Tentar provider principal
    const primaryProvider = this.config.default_provider;
    if (this.providers[primaryProvider]) {
      const result = await this.attemptShipment(
        orderId, 
        orderData, 
        this.providers[primaryProvider], 
        platform, 
        1
      );

      if (result.success) {
        // Cache sucesso para evitar reenvios
        this.cache.set(cacheKey, result, this.config.cache_ttl);
        console.log(`${logPrefix} ✅ Enviado com sucesso via ${primaryProvider}`);
        return result;
      }
      
      console.warn(`${logPrefix} ⚠️ Falha no provider principal (${primaryProvider})`);
    }

    // Tentar provider de fallback
    const fallbackProvider = this.config.fallback_provider;
    if (fallbackProvider && this.providers[fallbackProvider] && fallbackProvider !== primaryProvider) {
      console.log(`${logPrefix} 🔄 Tentando fallback: ${fallbackProvider}`);
      
      const result = await this.attemptShipment(
        orderId, 
        orderData, 
        this.providers[fallbackProvider], 
        platform, 
        1
      );

      if (result.success) {
        this.cache.set(cacheKey, result, this.config.cache_ttl);
        console.log(`${logPrefix} ✅ Enviado com sucesso via fallback ${fallbackProvider}`);
        return result;
      }
    }

    // Se chegou aqui, todos falharam - agendar retry
    const retryResult = await this.scheduleRetry(orderId, orderData, platform, 1);
    console.error(`${logPrefix} ❌ Falha em todos os providers. Retry agendado.`);
    
    return retryResult;
  }

  // =====================================================
  // TENTATIVA DE ENVIO (COM LOGS DETALHADOS)
  // =====================================================

  private async attemptShipment(
    orderId: string,
    orderData: ShippingOrderData,
    provider: IShippingProvider,
    platform: any,
    attempt: number
  ): Promise<ShippingOperationResult> {
    
    const startTime = Date.now();
    const logPrefix = `[SHIPPING:${orderData.order_number}:${provider.name}]`;
    
    try {
      console.log(`${logPrefix} Tentativa ${attempt} iniciada...`);
      
      // Fazer a requisição para a transportadora
      const response = await provider.createShipment(orderData);
      const duration = Date.now() - startTime;
      
      // Atualizar banco com resultado
      await this.updateOrderShippingStatus(orderId, {
        provider: provider.name,
        status: response.success ? 'sent' : 'failed',
        response,
        attempt,
        error: response.error?.message,
        platform
      });

      // Log estruturado
      console.log(`${logPrefix} Resultado:`, {
        success: response.success,
        duration_ms: duration,
        shipping_id: response.shipping_id,
        tracking_code: response.tracking_code,
        error: response.error?.message
      });

      return {
        success: response.success,
        orderId,
        provider: provider.name,
        response,
        error: response.error?.message,
        shouldRetry: !response.success && this.shouldRetryError(response.error?.code)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      console.error(`${logPrefix} Exceção:`, { error: errorMessage, duration_ms: duration });
      
      // Atualizar banco com erro
      await this.updateOrderShippingStatus(orderId, {
        provider: provider.name,
        status: 'failed',
        attempt,
        error: errorMessage,
        platform
      });

      return {
        success: false,
        orderId,
        provider: provider.name,
        error: errorMessage,
        shouldRetry: true
      };
    }
  }

  // =====================================================
  // SISTEMA DE RETRY INTELIGENTE
  // =====================================================

  private async scheduleRetry(
    orderId: string,
    orderData: ShippingOrderData,
    platform: any,
    currentAttempt: number
  ): Promise<ShippingOperationResult> {
    
    if (currentAttempt >= this.config.max_retry_attempts) {
      console.error(`[SHIPPING:${orderData.order_number}] ❌ Máximo de tentativas atingido`);
      return {
        success: false,
        orderId,
        error: 'Máximo de tentativas de envio atingido'
      };
    }

    const retryInterval = this.config.retry_intervals[currentAttempt - 1] || 120; // padrão 2h
    const nextRetryAt = new Date(Date.now() + (retryInterval * 60 * 1000));
    
    console.log(`[SHIPPING:${orderData.order_number}] 🔄 Retry ${currentAttempt + 1} agendado para ${nextRetryAt.toISOString()}`);

    // Cancelar retry anterior se existir
    const existingTimer = this.retryQueue.get(orderId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Agendar novo retry
    const timer = setTimeout(async () => {
      console.log(`[SHIPPING:${orderData.order_number}] 🔄 Executando retry ${currentAttempt + 1}...`);
      await this.executeRetry(orderId, orderData, platform, currentAttempt + 1);
      this.retryQueue.delete(orderId);
    }, retryInterval * 60 * 1000);

    this.retryQueue.set(orderId, timer);

    return {
      success: false,
      orderId,
      error: 'Falha temporária - retry agendado',
      shouldRetry: true,
      nextRetryAt
    };
  }

  private async executeRetry(
    orderId: string,
    orderData: ShippingOrderData,
    platform: any,
    attempt: number
  ): Promise<void> {
    
    // Tentar provider principal novamente
    const primaryProvider = this.config.default_provider;
    if (this.providers[primaryProvider]) {
      const result = await this.attemptShipment(orderId, orderData, this.providers[primaryProvider], platform, attempt);
      
      if (result.success) {
        const cacheKey = `shipping_sent_${orderId}`;
        this.cache.set(cacheKey, result, this.config.cache_ttl);
        return;
      }
    }

    // Se falhou, agendar próximo retry
    await this.scheduleRetry(orderId, orderData, platform, attempt);
  }

  // =====================================================
  // ATUALIZAÇÃO NO BANCO DE DADOS
  // =====================================================

  private async updateOrderShippingStatus(
    orderId: string,
    data: {
      provider?: ShippingProvider;
      status?: string;
      response?: ShippingResponse;
      attempt?: number;
      error?: string;
      platform: any;
    }
  ): Promise<void> {
    try {
      const db = getDatabase(data.platform);
      
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.provider) {
        updateFields.push('shipping_provider = $' + (updateValues.length + 1));
        updateValues.push(data.provider);
      }
      
      if (data.status) {
        updateFields.push('shipping_status = $' + (updateValues.length + 1));
        updateValues.push(data.status);
      }
      
      if (data.response) {
        updateFields.push('shipping_response = $' + (updateValues.length + 1));
        updateValues.push(JSON.stringify(data.response));
        
        if (data.response.shipping_id) {
          updateFields.push('shipping_provider_id = $' + (updateValues.length + 1));
          updateValues.push(data.response.shipping_id);
        }
        
        if (data.response.tracking_code) {
          updateFields.push('tracking_code = $' + (updateValues.length + 1));
          updateValues.push(data.response.tracking_code);
        }
      }
      
      if (data.attempt) {
        updateFields.push('shipping_attempts = $' + (updateValues.length + 1));
        updateValues.push(data.attempt);
      }
      
      if (data.error) {
        updateFields.push('shipping_error = $' + (updateValues.length + 1));
        updateValues.push(data.error);
      }

      updateFields.push('last_shipping_attempt = NOW()');
      updateFields.push('updated_at = NOW()');

      const query = `
        UPDATE orders 
        SET ${updateFields.join(', ')}
        WHERE id = $${updateValues.length + 1}
      `;
      
      updateValues.push(orderId);

      await db.execute(query, ...updateValues);

      console.log(`[SHIPPING:DB] Status atualizado para pedido ${orderId}:`, {
        provider: data.provider,
        status: data.status,
        attempt: data.attempt
      });

    } catch (error) {
      console.error(`[SHIPPING:DB] Erro ao atualizar status:`, error);
    }
  }

  // =====================================================
  // HELPERS E UTILITIES
  // =====================================================

  private shouldRetryError(errorCode?: string): boolean {
    // Códigos de erro que NÃO devem ter retry
    const nonRetryableErrors = [
      'INVALID_DATA',
      'UNAUTHORIZED', 
      'FORBIDDEN',
      'VALIDATION_ERROR',
      'DUPLICATE_ORDER'
    ];
    
    return !errorCode || !nonRetryableErrors.includes(errorCode);
  }

  // =====================================================
  // MÉTODOS PÚBLICOS AUXILIARES
  // =====================================================

  /**
   * Consultar status de envio
   */
  async getShippingStatus(orderId: string, platform: any): Promise<ShippingResponse | null> {
    try {
      const db = getDatabase(platform);
      
      const orders = await db.query(`
        SELECT shipping_provider, shipping_provider_id, shipping_response 
        FROM orders 
        WHERE id = $1
        LIMIT 1
      `, orderId);

      const order = orders[0];
      if (!order?.shipping_provider || !order?.shipping_provider_id) {
        return null;
      }

      const provider = this.providers[order.shipping_provider];
      if (!provider) {
        return null;
      }

      return await provider.getShipmentStatus(order.shipping_provider_id);
      
    } catch (error) {
      console.error('[SHIPPING] Erro ao consultar status:', error);
      return null;
    }
  }

  /**
   * Cancelar envio
   */
  async cancelShipment(orderId: string, platform: any): Promise<boolean> {
    try {
      const db = getDatabase(platform);
      
      const orders = await db.query(`
        SELECT shipping_provider, shipping_provider_id 
        FROM orders 
        WHERE id = $1
        LIMIT 1
      `, orderId);

      const order = orders[0];
      if (!order?.shipping_provider || !order?.shipping_provider_id) {
        return false;
      }

      const provider = this.providers[order.shipping_provider];
      if (!provider) {
        return false;
      }

      const result = await provider.cancelShipment(order.shipping_provider_id);
      
      if (result.success) {
        await this.updateOrderShippingStatus(orderId, {
          status: 'cancelled',
          platform
        });
      }

      return result.success;
      
    } catch (error) {
      console.error('[SHIPPING] Erro ao cancelar envio:', error);
      return false;
    }
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[SHIPPING] Cache limpo');
  }

  /**
   * Obter estatísticas do sistema
   */
  getStats(): {
    activeProviders: string[];
    queuedRetries: number;
    cacheSize: number;
  } {
    return {
      activeProviders: Object.keys(this.providers),
      queuedRetries: this.retryQueue.size,
      cacheSize: this.cache['cache'].size
    };
  }
} 