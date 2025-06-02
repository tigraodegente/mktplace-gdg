// =====================================================
// PROVIDER CUBBO - IMPLEMENTAÇÃO ESPECÍFICA
// =====================================================

import type { 
  IShippingProvider, 
  ShippingOrderData, 
  ShippingResponse, 
  ShippingProviderConfig,
  ShippingStatus 
} from '$lib/types/shipping';

interface CubboApiResponse {
  success?: boolean;
  data?: {
    id: string;
    tracking_code?: string;
    label_url?: string;
    estimated_delivery?: string;
    status?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class CubboProvider implements IShippingProvider {
  name = 'cubbo' as const;
  config: ShippingProviderConfig;

  constructor(config: ShippingProviderConfig) {
    this.config = config;
  }

  /**
   * Criar pedido na Cubbo
   */
  async createShipment(orderData: ShippingOrderData): Promise<ShippingResponse> {
    const startTime = Date.now();

    try {
      // Payload específico da Cubbo (baseado no exemplo do usuário)
      const payload = {
        store_id: this.config.store_id || orderData.store_id,
        order_number: orderData.order_number,
        shipping_line_code: orderData.shipping_line_code,
        buyer_shipping_price: orderData.buyer_shipping_price,
        order_type: orderData.order_type,
        is_paid: orderData.is_paid,
        products: orderData.products.map(product => ({
          sku: product.sku,
          quantity: product.quantity,
          price_per_item: product.price_per_item,
          discount_per_item: product.discount_per_item || 0
        })),
        shipping: {
          first_name: orderData.shipping.first_name,
          last_name: orderData.shipping.last_name,
          phone: orderData.shipping.phone,
          email: orderData.shipping.email,
          address1: orderData.shipping.address1,
          address2: orderData.shipping.address2,
          number: orderData.shipping.number,
          neighborhood: orderData.shipping.neighborhood,
          country: orderData.shipping.country,
          city: orderData.shipping.city,
          province: orderData.shipping.province,
          zip_code: orderData.shipping.zip_code
        },
        billing: {
          first_name: orderData.billing.first_name,
          last_name: orderData.billing.last_name,
          phone: orderData.billing.phone,
          email: orderData.billing.email,
          address1: orderData.billing.address1,
          address2: orderData.billing.address2,
          number: orderData.billing.number,
          neighborhood: orderData.billing.neighborhood,
          country: orderData.billing.country,
          city: orderData.billing.city,
          province: orderData.billing.province,
          zip_code: orderData.billing.zip_code,
          tax_id: orderData.billing.tax_id,
          tax_regime: orderData.billing.tax_regime,
          state_registration: orderData.billing.state_registration,
          company: orderData.billing.company
        }
      };

      const response = await fetch(this.config.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
          'User-Agent': 'Marketplace-GDG/1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      });

      const responseData: CubboApiResponse = await response.json();
      const duration = Date.now() - startTime;

      // Log estruturado
      this.logOperation('create', orderData.order_number, 1, duration, response.ok, responseData);

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          provider: this.name,
          error: {
            code: responseData.error?.code || `HTTP_${response.status}`,
            message: responseData.error?.message || `Erro HTTP ${response.status}`,
            details: responseData.error?.details
          },
          raw_response: responseData
        };
      }

      return {
        success: true,
        provider: this.name,
        shipping_id: responseData.data!.id,
        tracking_code: responseData.data!.tracking_code,
        label_url: responseData.data!.label_url,
        estimated_delivery: responseData.data!.estimated_delivery,
        raw_response: responseData,
        metadata: {
          duration_ms: duration,
          api_version: 'v1'
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.logOperation('create', orderData.order_number, 1, duration, false, { error: errorMessage });

      return {
        success: false,
        provider: this.name,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage,
          details: error
        },
        metadata: {
          duration_ms: duration
        }
      };
    }
  }

  /**
   * Consultar status do pedido
   */
  async getShipmentStatus(shippingId: string): Promise<ShippingResponse> {
    try {
      const response = await fetch(`${this.config.api_url}/${shippingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
          'User-Agent': 'Marketplace-GDG/1.0'
        },
        signal: AbortSignal.timeout(this.config.timeout || 15000)
      });

      const responseData: CubboApiResponse = await response.json();

      if (!response.ok || !responseData.success) {
        return {
          success: false,
          provider: this.name,
          error: {
            code: responseData.error?.code || `HTTP_${response.status}`,
            message: responseData.error?.message || `Erro HTTP ${response.status}`
          },
          raw_response: responseData
        };
      }

      return {
        success: true,
        provider: this.name,
        shipping_id: shippingId,
        tracking_code: responseData.data!.tracking_code,
        raw_response: responseData
      };

    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      };
    }
  }

  /**
   * Cancelar pedido
   */
  async cancelShipment(shippingId: string): Promise<ShippingResponse> {
    try {
      const response = await fetch(`${this.config.api_url}/${shippingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
          'User-Agent': 'Marketplace-GDG/1.0'
        },
        signal: AbortSignal.timeout(this.config.timeout || 15000)
      });

      const responseData: CubboApiResponse = await response.json();

      return {
        success: response.ok && (responseData.success !== false),
        provider: this.name,
        shipping_id: shippingId,
        raw_response: responseData,
        error: !response.ok ? {
          code: responseData.error?.code || `HTTP_${response.status}`,
          message: responseData.error?.message || `Erro HTTP ${response.status}`
        } : undefined
      };

    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      };
    }
  }

  /**
   * Validar configuração
   */
  async validateConfig(): Promise<boolean> {
    try {
      // Fazer uma requisição simples para testar conectividade
      const response = await fetch(`${this.config.api_url}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
          'User-Agent': 'Marketplace-GDG/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Processar webhook da Cubbo
   */
  async processWebhook(payload: any): Promise<{
    order_number: string;
    status: ShippingStatus;
    tracking_code?: string;
    metadata?: any;
  }> {
    // Mapear status da Cubbo para nosso status interno
    const statusMap: Record<string, ShippingStatus> = {
      'created': 'sent',
      'in_transit': 'sent',
      'delivered': 'sent',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return {
      order_number: payload.order_number,
      status: statusMap[payload.status] || 'pending',
      tracking_code: payload.tracking_code,
      metadata: {
        cubbo_status: payload.status,
        received_at: new Date().toISOString(),
        webhook_data: payload
      }
    };
  }

  /**
   * Log estruturado para operações
   */
  private logOperation(
    operation: string, 
    orderNumber: string, 
    attempt: number, 
    duration: number, 
    success: boolean, 
    data?: any
  ) {
    const logEntry = {
      timestamp: new Date(),
      level: success ? 'info' : 'error',
      provider: this.name,
      order_number: orderNumber,
      operation,
      attempt,
      duration_ms: duration,
      success,
      metadata: data
    };

    console.log(`[SHIPPING:${this.name.toUpperCase()}]`, logEntry);
  }
} 