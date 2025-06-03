import type {
  AppmaxConfig,
  AppmaxCustomer,
  AppmaxOrder,
  AppmaxPayment,
  AppmaxPaymentResponse,
  AppmaxRefund,
  AppmaxTokenizeCard,
  AppmaxCardToken
} from '../../../../../../../packages/shared-types/src/integrations/appmax';
import { logger } from '$lib/utils/logger';

export class AppmaxClient {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(config: AppmaxConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.environment === 'production' 
      ? 'https://api.appmax.com.br/v1'
      : 'https://homolog.sandboxappmax.com.br/v1';
  }
  
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      logger.debug('AppMax API Request', { 
        method, 
        endpoint,
        hasData: !!data 
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        logger.error('AppMax API Error', {
          status: response.status,
          error: responseData
        });
        
        throw new Error(
          responseData.message || 
          `API Error: ${response.status} ${response.statusText}`
        );
      }
      
      logger.debug('AppMax API Response', { 
        status: response.status,
        endpoint 
      });
      
      return responseData;
    } catch (error) {
      logger.error('AppMax Request Failed', { 
        endpoint, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }
  
  // Cliente/Customer
  async createCustomer(customer: AppmaxCustomer): Promise<AppmaxCustomer> {
    return this.request<AppmaxCustomer>('/customer', 'POST', customer);
  }
  
  async getCustomer(customerId: string): Promise<AppmaxCustomer> {
    return this.request<AppmaxCustomer>(`/customer/${customerId}`);
  }
  
  async updateCustomer(customerId: string, customer: Partial<AppmaxCustomer>): Promise<AppmaxCustomer> {
    return this.request<AppmaxCustomer>(`/customer/${customerId}`, 'PUT', customer);
  }
  
  // Pedido/Order
  async createOrder(order: AppmaxOrder): Promise<AppmaxOrder> {
    return this.request<AppmaxOrder>('/order', 'POST', order);
  }
  
  async getOrder(orderId: string): Promise<AppmaxOrder> {
    return this.request<AppmaxOrder>(`/order/${orderId}`);
  }
  
  async updateOrder(orderId: string, order: Partial<AppmaxOrder>): Promise<AppmaxOrder> {
    return this.request<AppmaxOrder>(`/order/${orderId}`, 'PUT', order);
  }
  
  // Pagamento/Payment
  async createPayment(payment: AppmaxPayment): Promise<AppmaxPaymentResponse> {
    const endpoint = `/payment/${payment.method}`;
    return this.request<AppmaxPaymentResponse>(endpoint, 'POST', payment);
  }
  
  async getPayment(paymentId: string): Promise<AppmaxPaymentResponse> {
    return this.request<AppmaxPaymentResponse>(`/payment/${paymentId}`);
  }
  
  // Tokenização de Cartão
  async tokenizeCard(data: AppmaxTokenizeCard): Promise<AppmaxCardToken> {
    return this.request<AppmaxCardToken>('/tokenize/card', 'POST', data);
  }
  
  // Reembolso/Refund
  async refundPayment(refund: AppmaxRefund): Promise<AppmaxPaymentResponse> {
    return this.request<AppmaxPaymentResponse>('/refund', 'POST', refund);
  }
  
  // Validação de Webhook Signature
  async validateWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const key = encoder.encode(secret);
      
      // Importar chave para HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      // Gerar assinatura
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      return computedSignature === signature;
    } catch (error) {
      logger.error('Webhook signature validation failed', { error });
      return false;
    }
  }
  
  // Helpers para conversão de valores
  static toCents(value: number): number {
    return Math.round(value * 100);
  }
  
  static fromCents(value: number): number {
    return value / 100;
  }
  
  // Validação de CPF/CNPJ
  static validateDocument(document: string): boolean {
    const cleanDoc = document.replace(/[^\d]/g, '');
    
    if (cleanDoc.length === 11) {
      return this.validateCPF(cleanDoc);
    } else if (cleanDoc.length === 14) {
      return this.validateCNPJ(cleanDoc);
    }
    
    return false;
  }
  
  private static validateCPF(cpf: string): boolean {
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cpf.charAt(9)) !== digit) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (parseInt(cpf.charAt(10)) !== digit) return false;
    
    return true;
  }
  
  private static validateCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
  }
} 