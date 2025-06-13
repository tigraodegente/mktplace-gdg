// Checkout Types - Tipos unificados para processo de checkout

import type { CartItem, CartTotals, CartValidation } from './cart';
import type { Address, AddressForm } from './address';
import type { AppliedCoupon } from './coupon';
import type { TimestampFields } from '../common';

// Etapas do checkout
export type CheckoutStep = 'cart' | 'auth' | 'address' | 'payment' | 'review' | 'confirmation';

// Dados de convidado
export interface GuestData {
  email: string;
  name: string;
  phone: string;
  document?: string; // CPF
  accepts_marketing: boolean;
  session_id: string;
  
  // Dados opcionais
  birth_date?: string;
  gender?: 'M' | 'F' | 'other';
}

// Métodos de pagamento
export type PaymentMethodType = 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'wallet' | 'bank_transfer';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  description?: string;
  icon?: string;
  
  // Configurações do método
  min_amount?: number;
  max_amount?: number;
  installments?: {
    min: number;
    max: number;
    interest_free_up_to: number;
    interest_rate?: number;
  };
  
  // Descontos especiais
  discount_percentage?: number;
  discount_amount?: number;
  
  // Status
  is_active: boolean;
  is_recommended?: boolean;
  
  // Para cartões
  accepted_brands?: string[]; // ["visa", "mastercard", "amex"]
  
  // Para PIX
  pix_config?: {
    expires_in_minutes: number;
    generate_qr_code: boolean;
  };
  
  // Para boleto
  boleto_config?: {
    expires_in_days: number;
    bank_code?: string;
  };
}

// Dados do cartão (tokenizado)
export interface CardData {
  token: string;
  brand: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  holder_name: string;
  installments: number;
  
  // Para 3DS
  authentication_token?: string;
}

// Dados de pagamento
export interface PaymentData {
  method: PaymentMethodType;
  
  // Para cartões
  card?: CardData;
  
  // Para PIX
  pix?: {
    email?: string;
    document?: string;
  };
  
  // Para boleto
  boleto?: {
    document: string;
    document_type: 'cpf' | 'cnpj';
  };
  
  // Observações
  notes?: string;
  
  // Parcelamento
  installments?: number;
  installment_value?: number;
}

// Estado do checkout
export interface CheckoutState {
  // Etapa atual
  current_step: CheckoutStep;
  completed_steps: CheckoutStep[];
  
  // Dados coletados
  cart_data: {
    items: CartItem[];
    totals: CartTotals;
    validation?: CartValidation;
  };
  
  auth_data?: {
    user_id?: string;
    is_guest: boolean;
    guest_data?: GuestData;
  };
  
  address_data?: Address | AddressForm;
  payment_data?: PaymentData;
  
  // Cupons
  applied_coupon?: AppliedCoupon;
  
  // Estado de processamento
  is_loading: boolean;
  is_processing_payment: boolean;
  current_operation?: string;
  
  // Erros
  errors: CheckoutError[];
  step_errors: Record<CheckoutStep, string[]>;
  
  // Configurações
  allow_guest_checkout: boolean;
  require_phone: boolean;
  require_document: boolean;
  
  // Metadados
  started_at?: string;
  expires_at?: string;
  user_agent?: string;
  ip_address?: string;
}

// Erros do checkout
export interface CheckoutError {
  step: CheckoutStep;
  type: 'validation' | 'payment' | 'shipping' | 'system';
  code: string;
  message: string;
  field?: string;
  details?: any;
  
  // Para retry
  is_retryable: boolean;
  retry_count?: number;
}

// Validação do checkout
export interface CheckoutValidation {
  is_valid: boolean;
  errors: CheckoutError[];
  warnings: CheckoutError[];
  
  // Validações por etapa
  steps: Record<CheckoutStep, {
    is_valid: boolean;
    is_complete: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  // Validações específicas
  cart_validation?: CartValidation;
  address_validation?: {
    is_valid: boolean;
    zip_code_valid: boolean;
    shipping_available: boolean;
  };
  payment_validation?: {
    is_valid: boolean;
    method_available: boolean;
    amount_within_limits: boolean;
  };
}

// Request para criar pedido
export interface CreateOrderRequest {
  // Itens
  items: Array<{
    product_id: string;
    quantity: number;
    variant_id?: string;
    selected_color?: string;
    selected_size?: string;
  }>;
  
  // Endereço
  shipping_address: Address | AddressForm;
  billing_address?: Address | AddressForm;
  
  // Pagamento
  payment_method: PaymentMethodType;
  payment_data?: PaymentData;
  
  // Cupons e descontos
  coupon_code?: string;
  
  // Dados opcionais
  notes?: string;
  gift_message?: string;
  
  // Para convidados
  guest_data?: GuestData;
  
  // Configurações de entrega
  shipping_options?: Record<string, string>; // seller_id -> shipping_option_id
  delivery_instructions?: string;
  
  // Metadados
  user_agent?: string;
  referrer?: string;
  utm_source?: string;
  utm_campaign?: string;
}

// Resposta da criação do pedido
export interface CreateOrderResponse {
  success: boolean;
  order?: Order;
  payment?: PaymentResult;
  errors?: CheckoutError[];
  
  // Para redirecionamentos
  redirect_url?: string;
  
  // Para métodos que precisam de confirmação adicional
  requires_action?: {
    type: '3ds' | 'otp' | 'redirect';
    action_url?: string;
    parameters?: Record<string, any>;
  };
}

// Dados do pedido criado
export interface Order extends TimestampFields {
  id: string;
  order_number: string;
  
  // Status
  status: OrderStatus;
  payment_status: PaymentStatus;
  
  // Valores
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  
  // Dados do cliente
  user_id?: string;
  guest_email?: string;
  
  // Endereços
  shipping_address: Address;
  billing_address?: Address;
  
  // Pagamento
  payment_method: PaymentMethodType;
  payment_data?: any;
  
  // Itens
  items: OrderItem[];
  
  // Metadados
  notes?: string;
  coupon_code?: string;
  estimated_delivery?: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  seller_id: string;
  seller_name: string;
  
  quantity: number;
  unit_price: number;
  total_price: number;
  
  // Variações
  selected_color?: string;
  selected_size?: string;
  variant_id?: string;
  
  // Status
  status: OrderItemStatus;
  
  // Tracking
  tracking_code?: string;
  shipped_at?: string;
  delivered_at?: string;
}

// Status dos pedidos
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type OrderItemStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

// Resultado do pagamento
export interface PaymentResult {
  id: string;
  status: PaymentStatus;
  method: PaymentMethodType;
  amount: number;
  
  // Dados específicos do método
  transaction_id?: string;
  authorization_code?: string;
  
  // Para PIX
  pix_qr_code?: string;
  pix_key?: string;
  pix_expires_at?: string;
  
  // Para boleto
  boleto_url?: string;
  boleto_barcode?: string;
  boleto_expires_at?: string;
  
  // Para cartão
  installments?: number;
  installment_value?: number;
  
  // Datas
  processed_at?: string;
  expires_at?: string;
  
  // Erros
  error_code?: string;
  error_message?: string;
} 