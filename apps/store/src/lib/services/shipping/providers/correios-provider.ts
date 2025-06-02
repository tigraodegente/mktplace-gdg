// =====================================================
// PROVIDER CORREIOS - EXEMPLO DE EXTENSIBILIDADE
// =====================================================

import type { 
  IShippingProvider, 
  ShippingOrderData, 
  ShippingResponse, 
  ShippingProviderConfig,
  ShippingStatus 
} from '$lib/types/shipping';

export class CorreiosProvider implements IShippingProvider {
  name = 'correios' as const;
  config: ShippingProviderConfig;

  constructor(config: ShippingProviderConfig) {
    this.config = config;
  }

  /**
   * Criar pedido nos Correios
   */
  async createShipment(orderData: ShippingOrderData): Promise<ShippingResponse> {
    const startTime = Date.now();

    try {
      // Payload específico dos Correios (formato diferente)
      const payload = {
        numeroEtiqueta: orderData.order_number,
        peso: this.calculateTotalWeight(orderData.products),
        formatoEncomenda: '1', // Caixa/Pacote
        comprimento: 20,
        altura: 5,
        largura: 15,
        servicoAdicional: ['001'], // Registro
        valorDeclarado: orderData.buyer_shipping_price,
        remetente: {
          nome: 'Marketplace GDG',
          logradouro: 'Rua Principal',
          numero: '123',
          complemento: 'Sala 1',
          bairro: 'Centro',
          cep: '01000000',
          cidade: 'São Paulo',
          uf: 'SP'
        },
        destinatario: {
          nome: `${orderData.shipping.first_name} ${orderData.shipping.last_name}`,
          logradouro: orderData.shipping.address1,
          numero: orderData.shipping.number,
          complemento: orderData.shipping.address2,
          bairro: orderData.shipping.neighborhood,
          cep: orderData.shipping.zip_code.replace('-', ''),
          cidade: orderData.shipping.city,
          uf: orderData.shipping.province
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

      const responseData = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: {
            code: `HTTP_${response.status}`,
            message: responseData.erro || `Erro HTTP ${response.status}`,
            details: responseData
          },
          raw_response: responseData
        };
      }

      return {
        success: true,
        provider: this.name,
        shipping_id: responseData.numeroEtiqueta,
        tracking_code: responseData.codigoRastreamento,
        raw_response: responseData,
        metadata: {
          duration_ms: duration,
          servico: responseData.servico
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        provider: this.name,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
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
      const response = await fetch(`${this.config.api_url}/rastreamento/${shippingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        signal: AbortSignal.timeout(this.config.timeout || 15000)
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: {
            code: `HTTP_${response.status}`,
            message: responseData.erro || `Erro HTTP ${response.status}`
          },
          raw_response: responseData
        };
      }

      return {
        success: true,
        provider: this.name,
        shipping_id: shippingId,
        tracking_code: responseData.codigoRastreamento,
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
      const response = await fetch(`${this.config.api_url}/cancelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        body: JSON.stringify({ numeroEtiqueta: shippingId }),
        signal: AbortSignal.timeout(this.config.timeout || 15000)
      });

      const responseData = await response.json();

      return {
        success: response.ok && responseData.sucesso,
        provider: this.name,
        shipping_id: shippingId,
        raw_response: responseData,
        error: !response.ok ? {
          code: `HTTP_${response.status}`,
          message: responseData.erro || `Erro HTTP ${response.status}`
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
   * Calcular frete (implementação específica dos Correios)
   */
  async calculateShipping(data: {
    origin: string;
    destination: string;
    products: any[];
  }): Promise<{
    cost: number;
    delivery_time: number;
    service_code: string;
  }> {
    try {
      const payload = {
        cepOrigem: data.origin,
        cepDestino: data.destination,
        peso: this.calculateTotalWeight(data.products),
        formato: 1,
        comprimento: 20,
        altura: 5,
        largura: 15,
        servicos: ['04014'] // SEDEX
      };

      const response = await fetch(`${this.config.api_url}/calcular-preco-prazo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      return {
        cost: parseFloat(responseData.valor),
        delivery_time: parseInt(responseData.prazoEntrega),
        service_code: responseData.codigo
      };

    } catch (error) {
      throw new Error(`Erro ao calcular frete: ${error}`);
    }
  }

  /**
   * Validar configuração
   */
  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.api_url}/servicos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Processar webhook dos Correios
   */
  async processWebhook(payload: any): Promise<{
    order_number: string;
    status: ShippingStatus;
    tracking_code?: string;
    metadata?: any;
  }> {
    // Mapear status dos Correios para nosso status interno
    const statusMap: Record<string, ShippingStatus> = {
      'objeto_postado': 'sent',
      'objeto_encaminhado': 'sent',
      'objeto_entregue': 'sent',
      'objeto_devolvido': 'failed'
    };

    return {
      order_number: payload.numeroEtiqueta,
      status: statusMap[payload.status] || 'pending',
      tracking_code: payload.codigoRastreamento,
      metadata: {
        correios_status: payload.status,
        local: payload.local,
        received_at: new Date().toISOString(),
        webhook_data: payload
      }
    };
  }

  /**
   * Calcular peso total dos produtos
   */
  private calculateTotalWeight(products: any[]): number {
    return products.reduce((total, product) => {
      const weight = product.weight || 0.5; // 500g padrão
      return total + (weight * product.quantity);
    }, 0);
  }
} 