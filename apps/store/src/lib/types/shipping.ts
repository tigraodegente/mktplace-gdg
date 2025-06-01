// =====================================================
// TYPES GENÉRICOS PARA SISTEMA DE TRANSPORTADORAS
// =====================================================

export type ShippingStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';

export type ShippingProvider = 'cubbo' | 'correios' | 'jadlog' | 'azul' | 'total';

// =====================================================
// INTERFACES GENÉRICAS
// =====================================================

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address1: string;
  address2?: string;
  number: string;
  neighborhood: string;
  country: string;
  city: string;
  province: string;
  zip_code: string;
}

export interface BillingAddress extends ShippingAddress {
  tax_id?: string;
  tax_regime?: 'PHYSICAL' | 'LEGAL';
  state_registration?: string;
  company?: string;
}

export interface ShippingProduct {
  sku: string;
  quantity: number;
  price_per_item: number;
  discount_per_item?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface ShippingOrderData {
  store_id: number | string;
  order_number: string;
  shipping_line_code: string;
  buyer_shipping_price: number;
  order_type: 'SALE' | 'RETURN' | 'EXCHANGE';
  is_paid: boolean;
  products: ShippingProduct[];
  shipping: ShippingAddress;
  billing: BillingAddress;
  metadata?: Record<string, any>;
}

// =====================================================
// RESPOSTA GENÉRICA DA TRANSPORTADORA
// =====================================================

export interface ShippingResponse {
  success: boolean;
  provider: ShippingProvider;
  shipping_id?: string;
  tracking_code?: string;
  label_url?: string;
  estimated_delivery?: string;
  cost?: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  raw_response?: any;
  metadata?: Record<string, any>;
}

// =====================================================
// CONFIGURAÇÃO DE PROVIDER
// =====================================================

export interface ShippingProviderConfig {
  name: ShippingProvider;
  enabled: boolean;
  api_url: string;
  api_key?: string;
  store_id?: string | number;
  timeout: number;
  retry_attempts: number;
  retry_delay: number;
  test_mode: boolean;
  webhook_url?: string;
  settings?: Record<string, any>;
}

// =====================================================
// INTERFACE DO PROVIDER (CONTRACT)
// =====================================================

export interface IShippingProvider {
  name: ShippingProvider;
  config: ShippingProviderConfig;
  
  /**
   * Criar pedido na transportadora
   */
  createShipment(orderData: ShippingOrderData): Promise<ShippingResponse>;
  
  /**
   * Consultar status do pedido
   */
  getShipmentStatus(shippingId: string): Promise<ShippingResponse>;
  
  /**
   * Cancelar pedido
   */
  cancelShipment(shippingId: string): Promise<ShippingResponse>;
  
  /**
   * Calcular frete (opcional)
   */
  calculateShipping?(data: {
    origin: string;
    destination: string;
    products: ShippingProduct[];
  }): Promise<{
    cost: number;
    delivery_time: number;
    service_code: string;
  }>;
  
  /**
   * Validar configuração
   */
  validateConfig(): Promise<boolean>;
  
  /**
   * Processar webhook (opcional)
   */
  processWebhook?(payload: any): Promise<{
    order_number: string;
    status: ShippingStatus;
    tracking_code?: string;
    metadata?: any;
  }>;
}

// =====================================================
// DADOS INTERNOS DO SISTEMA
// =====================================================

export interface OrderShippingData {
  id: string;
  order_number: string;
  user_id: string;
  shipping_provider?: ShippingProvider;
  shipping_provider_id?: string;
  shipping_status: ShippingStatus;
  shipping_response?: ShippingResponse;
  shipping_attempts: number;
  last_shipping_attempt?: Date;
  shipping_error?: string;
  shipping_webhook_data?: any;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// RESULTADO DA OPERAÇÃO
// =====================================================

export interface ShippingOperationResult {
  success: boolean;
  orderId: string;
  provider?: ShippingProvider;
  response?: ShippingResponse;
  error?: string;
  shouldRetry?: boolean;
  nextRetryAt?: Date;
}

// =====================================================
// CONFIGURAÇÃO GLOBAL DO SISTEMA
// =====================================================

export interface ShippingSystemConfig {
  enabled: boolean;
  default_provider: ShippingProvider;
  fallback_provider?: ShippingProvider;
  max_retry_attempts: number;
  retry_intervals: number[]; // em minutos: [5, 30, 120]
  cache_ttl: number; // em minutos
  webhook_secret?: string;
  providers: Record<ShippingProvider, ShippingProviderConfig>;
}

// =====================================================
// LOGS ESTRUTURADOS
// =====================================================

export interface ShippingLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  provider: ShippingProvider;
  order_id: string;
  order_number: string;
  operation: 'create' | 'status' | 'cancel' | 'webhook' | 'retry';
  attempt: number;
  duration_ms?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
} 