import { AppmaxClient } from './client';
import type {
  AppmaxConfig,
  AppmaxCustomer,
  AppmaxOrder,
  AppmaxPayment,
  AppmaxPaymentResponse,
  AppmaxPaymentStatus
} from '../../../../../../../packages/shared-types/src/integrations/appmax';
import { getDatabase } from '$lib/db';
import { logger } from '$lib/utils/logger';

export class AppmaxService {
  private client: AppmaxClient;
  
  constructor(config: AppmaxConfig) {
    this.client = new AppmaxClient(config);
  }
  
  /**
   * Criar ou atualizar cliente na AppMax
   */
  async syncCustomer(platform: any, userId: string): Promise<AppmaxCustomer | null> {
    try {
      const db = getDatabase(platform);
      
      // Buscar dados do usuário
      const users = await db.query`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.phone,
          u.cpf_cnpj,
          u.birth_date,
          a.street,
          a.number,
          a.complement,
          a.neighborhood,
          a.city,
          a.state,
          a.zip_code,
          a.country,
          pm.external_customer_id
        FROM users u
        LEFT JOIN addresses a ON a.user_id = u.id AND a.is_default = true
        LEFT JOIN payment_gateways_metadata pm ON pm.user_id = u.id AND pm.gateway = 'appmax'
        WHERE u.id = ${userId}
        LIMIT 1
      `;
      
      const user = users[0];
      if (!user || !user.email) {
        logger.warn('User not found or missing email', { userId });
        return null;
      }
      
      // Preparar dados do cliente
      const customerData: AppmaxCustomer = {
        email: user.email,
        name: user.name || 'Nome não informado',
        document: user.cpf_cnpj || '',
        phone: user.phone,
        birthDate: user.birth_date?.toISOString().split('T')[0],
        address: user.street ? {
          street: user.street,
          number: user.number || 's/n',
          complement: user.complement,
          neighborhood: user.neighborhood,
          city: user.city,
          state: user.state,
          zipCode: user.zip_code?.replace(/\D/g, ''),
          country: user.country || 'BR'
        } : undefined
      };
      
      let appmaxCustomer: AppmaxCustomer;
      
      if (user.external_customer_id) {
        // Atualizar cliente existente
        try {
          appmaxCustomer = await this.client.updateCustomer(
            user.external_customer_id,
            customerData
          );
          logger.info('AppMax customer updated', { 
            customerId: appmaxCustomer.id,
            userId 
          });
        } catch (error) {
          // Se falhar ao atualizar, tenta criar novo
          logger.warn('Failed to update customer, creating new', { error });
          appmaxCustomer = await this.client.createCustomer(customerData);
        }
      } else {
        // Criar novo cliente
        appmaxCustomer = await this.client.createCustomer(customerData);
        logger.info('AppMax customer created', { 
          customerId: appmaxCustomer.id,
          userId 
        });
        
        // Salvar ID externo para futuras referências
        await db.query`
          INSERT INTO payment_gateways_metadata (user_id, gateway, external_customer_id)
          VALUES (${userId}, 'appmax', ${appmaxCustomer.id})
          ON CONFLICT (user_id, gateway) 
          DO UPDATE SET external_customer_id = ${appmaxCustomer.id}
        `;
      }
      
      return appmaxCustomer;
    } catch (error) {
      logger.error('Failed to sync customer with AppMax', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }
  
  /**
   * Criar pedido na AppMax
   */
  async createOrder(
    platform: any, 
    orderId: string,
    customerId: string
  ): Promise<AppmaxOrder | null> {
    try {
      const db = getDatabase(platform);
      
      // Buscar dados do pedido
      const orders = await db.query`
        SELECT 
          o.id,
          o.user_id,
          o.subtotal,
          o.shipping_cost,
          o.discount,
          o.total,
          o.shipping_method,
          o.shipping_carrier,
          o.estimated_delivery,
          a.street,
          a.number,
          a.complement,
          a.neighborhood,
          a.city,
          a.state,
          a.zip_code
        FROM orders o
        LEFT JOIN addresses a ON a.id = o.shipping_address_id
        WHERE o.id = ${orderId}
        LIMIT 1
      `;
      
      const order = orders[0];
      if (!order) {
        logger.warn('Order not found', { orderId });
        return null;
      }
      
      // Buscar itens do pedido
      const items = await db.query`
        SELECT 
          oi.product_id,
          oi.variant_id,
          oi.quantity,
          oi.price,
          p.name,
          p.sku,
          pv.sku as variant_sku,
          pv.name as variant_name
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN product_variants pv ON pv.id = oi.variant_id
        WHERE oi.order_id = ${orderId}
      `;
      
      // Preparar dados do pedido
      const orderData: AppmaxOrder = {
        customerId,
        items: items.map(item => ({
          name: item.variant_name 
            ? `${item.name} - ${item.variant_name}`
            : item.name,
          quantity: item.quantity,
          price: AppmaxClient.toCents(item.price),
          sku: item.variant_sku || item.sku
        })),
        shipping: order.shipping_cost > 0 ? {
          method: order.shipping_method || 'standard',
          carrier: order.shipping_carrier,
          price: AppmaxClient.toCents(order.shipping_cost),
          estimatedDelivery: order.estimated_delivery?.toISOString(),
          address: {
            street: order.street,
            number: order.number || 's/n',
            complement: order.complement,
            neighborhood: order.neighborhood,
            city: order.city,
            state: order.state,
            zipCode: order.zip_code?.replace(/\D/g, ''),
            country: 'BR'
          }
        } : undefined,
        discount: order.discount > 0 ? AppmaxClient.toCents(order.discount) : undefined,
        total: AppmaxClient.toCents(order.total),
        metadata: {
          orderId: order.id,
          source: 'marketplace-gdg'
        }
      };
      
      const appmaxOrder = await this.client.createOrder(orderData);
      
      // Salvar ID do pedido AppMax
      await db.query`
        UPDATE orders 
        SET external_order_id = ${appmaxOrder.id}
        WHERE id = ${orderId}
      `;
      
      logger.info('AppMax order created', { 
        orderId,
        appmaxOrderId: appmaxOrder.id 
      });
      
      return appmaxOrder;
    } catch (error) {
      logger.error('Failed to create order in AppMax', { 
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }
  
  /**
   * Processar pagamento
   */
  async processPayment(
    platform: any,
    orderId: string,
    paymentData: Partial<AppmaxPayment>
  ): Promise<AppmaxPaymentResponse> {
    try {
      const db = getDatabase(platform);
      
      // Buscar dados do pedido e AppMax IDs
      const orders = await db.query`
        SELECT 
          o.id,
          o.user_id,
          o.total,
          o.external_order_id,
          pm.external_customer_id
        FROM orders o
        LEFT JOIN payment_gateways_metadata pm ON pm.user_id = o.user_id AND pm.gateway = 'appmax'
        WHERE o.id = ${orderId}
        LIMIT 1
      `;
      
      const order = orders[0];
      if (!order) {
        throw new Error('Pedido não encontrado');
      }
      
      if (!order.external_order_id || !order.external_customer_id) {
        throw new Error('Pedido não sincronizado com AppMax');
      }
      
      // Preparar dados do pagamento
      const payment: AppmaxPayment = {
        orderId: order.external_order_id,
        method: paymentData.method || 'credit_card',
        amount: AppmaxClient.toCents(order.total),
        installments: paymentData.installments || 1,
        card: paymentData.card,
        pix: paymentData.pix,
        boleto: paymentData.boleto,
        metadata: {
          ...paymentData.metadata,
          internalOrderId: order.id
        }
      };
      
      // Processar pagamento
      const response = await this.client.createPayment(payment);
      
      // Salvar transação
      await db.query`
        INSERT INTO payment_transactions (
          order_id,
          gateway,
          external_transaction_id,
          amount,
          status,
          method,
          response_data,
          created_at
        ) VALUES (
          ${orderId},
          'appmax',
          ${response.payment?.id},
          ${order.total},
          ${this.mapPaymentStatus(response.payment?.status)},
          ${payment.method},
          ${JSON.stringify(response)},
          NOW()
        )
      `;
      
      // Atualizar status do pedido se aprovado
      if (response.payment?.status === 'approved') {
        await db.query`
          UPDATE orders 
          SET 
            payment_status = 'paid',
            status = 'processing',
            paid_at = NOW()
          WHERE id = ${orderId}
        `;
      }
      
      logger.info('Payment processed', { 
        orderId,
        paymentId: response.payment?.id,
        status: response.payment?.status 
      });
      
      return response;
    } catch (error) {
      logger.error('Failed to process payment', { 
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }
  
  /**
   * Mapear status de pagamento AppMax para o sistema
   */
  private mapPaymentStatus(appmaxStatus?: AppmaxPaymentStatus): string {
    switch (appmaxStatus) {
      case 'approved':
        return 'completed';
      case 'pending':
      case 'processing':
        return 'pending';
      case 'declined':
      case 'cancelled':
      case 'expired':
        return 'failed';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }
  
  /**
   * Obter configuração da AppMax do banco
   */
  static async getConfig(platform: any): Promise<AppmaxConfig | null> {
    try {
      const db = getDatabase(platform);
      
      const configs = await db.query`
        SELECT 
          api_key,
          environment,
          webhook_secret,
          is_active
        FROM payment_gateways
        WHERE name = 'appmax' AND is_active = true
        LIMIT 1
      `;
      
      const config = configs[0];
      if (!config) {
        return null;
      }
      
      return {
        apiKey: config.api_key,
        environment: config.environment as 'production' | 'sandbox',
        webhookSecret: config.webhook_secret
      };
    } catch (error) {
      logger.error('Failed to get AppMax config', { error });
      return null;
    }
  }
} 