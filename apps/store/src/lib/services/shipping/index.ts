// =====================================================
// UTILITÁRIO PRINCIPAL - SHIPPING SYSTEM
// Interface unificada e otimizada
// =====================================================

import type { ShippingOrderData, ShippingOperationResult } from '$lib/types/shipping';
import { ShippingService } from './shipping-service';
import { shippingConfig, logShippingConfiguration } from '$lib/config/shipping.server';

// =====================================================
// SINGLETON INSTANCE (OTIMIZADO)
// =====================================================

let shippingServiceInstance: ShippingService | null = null;

function getShippingService(): ShippingService {
  if (!shippingServiceInstance) {
    logShippingConfiguration();
    shippingServiceInstance = new ShippingService(shippingConfig);
  }
  return shippingServiceInstance;
}

// =====================================================
// FUNÇÃO PARA MAPEAR DADOS DO PEDIDO
// =====================================================

function mapOrderToShippingData(
  order: any,
  orderItems: any[],
  shippingAddress: any,
  billingAddress?: any
): ShippingOrderData {
  
  // Mapear produtos
  const products = orderItems.map(item => ({
    sku: item.sku || item.product_id || `PROD-${item.id}`,
    quantity: item.quantity,
    price_per_item: parseFloat(item.price),
    discount_per_item: parseFloat(item.discount || 0),
    weight: parseFloat(item.weight || 0.5), // 500g padrão
    dimensions: item.dimensions || {
      length: 10,
      width: 10,
      height: 5
    }
  }));

  // Normalizar endereços
  const normalizedShipping = {
    first_name: shippingAddress.first_name || shippingAddress.name?.split(' ')[0] || '',
    last_name: shippingAddress.last_name || shippingAddress.name?.split(' ').slice(1).join(' ') || '',
    phone: shippingAddress.phone || '',
    email: shippingAddress.email || order.user?.email || '',
    address1: shippingAddress.address1 || shippingAddress.street || '',
    address2: shippingAddress.address2 || shippingAddress.complement || '',
    number: shippingAddress.number || '',
    neighborhood: shippingAddress.neighborhood || '',
    country: shippingAddress.country || 'BR',
    city: shippingAddress.city || '',
    province: shippingAddress.province || shippingAddress.state || '',
    zip_code: shippingAddress.zip_code || shippingAddress.zipCode || ''
  };

  const normalizedBilling = billingAddress ? {
    ...normalizedShipping,
    ...billingAddress,
    tax_id: billingAddress.tax_id || order.user?.tax_id,
    tax_regime: billingAddress.tax_regime || 'PHYSICAL',
    state_registration: billingAddress.state_registration,
    company: billingAddress.company
  } : normalizedShipping;

  return {
    store_id: shippingConfig.providers[shippingConfig.default_provider]?.store_id || '8252',
    order_number: order.order_number,
    shipping_line_code: shippingConfig.default_provider,
    buyer_shipping_price: parseFloat(order.shipping_cost || 0),
    order_type: 'SALE',
    is_paid: order.payment_status === 'paid',
    products,
    shipping: normalizedShipping,
    billing: normalizedBilling,
    metadata: {
      order_id: order.id,
      total_amount: parseFloat(order.total),
      platform: 'marketplace-gdg'
    }
  };
}

// =====================================================
// INTERFACE PÚBLICA SIMPLIFICADA
// =====================================================

export class ShippingIntegration {
  
  /**
   * Enviar pedido para transportadora (MÉTODO PRINCIPAL)
   */
  static async sendOrder(
    orderId: string,
    order: any,
    orderItems: any[],
    shippingAddress: any,
    platform: any,
    billingAddress?: any
  ): Promise<ShippingOperationResult> {
    
    try {
      const service = getShippingService();
      
      // Mapear dados para formato da transportadora
      const orderData = mapOrderToShippingData(order, orderItems, shippingAddress, billingAddress);
      
      console.log(`[SHIPPING] Enviando pedido ${order.order_number} para transportadora...`);
      
      // Enviar para transportadora
      const result = await service.sendOrderToShipping(orderId, orderData, platform);
      
      if (result.success) {
        console.log(`[SHIPPING] ✅ Pedido ${order.order_number} enviado com sucesso para ${result.provider}`);
      } else {
        console.warn(`[SHIPPING] ⚠️ Falha ao enviar pedido ${order.order_number}: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`[SHIPPING] ❌ Erro crítico ao enviar pedido ${orderId}:`, error);
      
      return {
        success: false,
        orderId,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Consultar status de envio
   */
  static async getStatus(orderId: string, platform: any) {
    try {
      const service = getShippingService();
      return await service.getShippingStatus(orderId, platform);
    } catch (error) {
      console.error(`[SHIPPING] Erro ao consultar status do pedido ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Cancelar envio
   */
  static async cancel(orderId: string, platform: any): Promise<boolean> {
    try {
      const service = getShippingService();
      return await service.cancelShipment(orderId, platform);
    } catch (error) {
      console.error(`[SHIPPING] Erro ao cancelar envio do pedido ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Obter estatísticas do sistema
   */
  static getSystemStats() {
    try {
      const service = getShippingService();
      return service.getStats();
    } catch (error) {
      console.error('[SHIPPING] Erro ao obter estatísticas:', error);
      return {
        activeProviders: [],
        queuedRetries: 0,
        cacheSize: 0
      };
    }
  }

  /**
   * Limpar cache (útil para debugging)
   */
  static clearCache(): void {
    try {
      const service = getShippingService();
      service.clearCache();
    } catch (error) {
      console.error('[SHIPPING] Erro ao limpar cache:', error);
    }
  }

  /**
   * Verificar se sistema está operacional
   */
  static isEnabled(): boolean {
    return shippingConfig.enabled;
  }

  /**
   * Obter configuração atual
   */
  static getConfig() {
    return {
      enabled: shippingConfig.enabled,
      default_provider: shippingConfig.default_provider,
      fallback_provider: shippingConfig.fallback_provider,
      enabled_providers: Object.entries(shippingConfig.providers)
        .filter(([_, config]) => config.enabled)
        .map(([name]) => name)
    };
  }
}

// =====================================================
// HELPER PARA DESENVOLVIMENTO/DEBUG
// =====================================================

export class ShippingDebug {
  
  /**
   * Simular envio (para testes)
   */
  static async simulateOrder(orderNumber: string): Promise<ShippingOperationResult> {
    console.log(`[SHIPPING:DEBUG] Simulando envio do pedido ${orderNumber}...`);
    
    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      orderId: 'debug-order-id',
      provider: 'cubbo',
      response: {
        success: true,
        provider: 'cubbo',
        shipping_id: `DEBUG_${Date.now()}`,
        tracking_code: `TR${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        metadata: {
          debug_mode: true,
          simulated_at: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Testar conectividade com providers
   */
  static async testProviders() {
    console.log('[SHIPPING:DEBUG] Testando conectividade dos providers...');
    
    // Implementar teste real de conectividade
    return {
      cubbo: { connected: true, response_time: 150 },
      correios: { connected: false, error: 'API indisponível' }
    };
  }

  /**
   * Log detalhado da configuração
   */
  static logConfiguration() {
    logShippingConfiguration();
  }
}

// =====================================================
// EXPORTS PRINCIPAIS
// =====================================================

// Export principal para uso no checkout
export { ShippingIntegration as default };

// Exports para casos específicos
export { shippingConfig };

// Re-exports dos types principais
export type { ShippingOperationResult, ShippingOrderData } from '$lib/types/shipping'; 