// Payment Types - Tipos unificados para sistema de pagamentos

import type { PaymentMethodType, PaymentStatus } from './checkout';
import type { TimestampFields } from '../common';

// Re-export dos tipos principais
export type { PaymentMethodType, PaymentStatus };

// Gateway de pagamento
export interface PaymentGateway extends TimestampFields {
  id: string;
  name: string;
  slug: string;
  
  // Configurações
  is_active: boolean;
  is_sandbox: boolean;
  priority: number;
  
  // Métodos suportados
  supported_methods: PaymentMethodType[];
  
  // Limites
  min_amount?: number;
  max_amount?: number;
  
  // Configurações específicas
  config: PaymentGatewayConfig;
  
  // Taxas
  fees: PaymentFees;
  
  // Recursos
  features: PaymentFeatures;
}

// Configurações do gateway
export interface PaymentGatewayConfig {
  // Credenciais (criptografadas)
  api_key?: string;
  secret_key?: string;
  merchant_id?: string;
  
  // URLs
  webhook_url?: string;
  return_url?: string;
  cancel_url?: string;
  
  // Configurações específicas por tipo
  pix_config?: PixConfig;
  card_config?: CardConfig;
  boleto_config?: BoletoConfig;
  
  // Configurações gerais
  timeout_seconds?: number;
  max_retries?: number;
  auto_capture?: boolean;
}

// Configurações PIX
export interface PixConfig {
  expires_in_minutes: number;
  generate_qr_code: boolean;
  qr_code_format: 'base64' | 'url';
  pix_key?: string;
  bank_name?: string;
}

// Configurações de cartão
export interface CardConfig {
  accept_debit: boolean;
  accept_credit: boolean;
  
  // Bandeiras aceitas
  accepted_brands: string[];
  
  // Parcelamento
  max_installments: number;
  interest_free_installments: number;
  interest_rate?: number;
  
  // 3D Secure
  enable_3ds: boolean;
  force_3ds_for_amount?: number;
  
  // Antifraude
  enable_antifraud: boolean;
  antifraud_provider?: string;
}

// Configurações de boleto
export interface BoletoConfig {
  expires_in_days: number;
  bank_code?: string;
  agency?: string;
  account?: string;
  
  // Instruções
  instructions?: string[];
  
  // Multa e juros
  fine_percentage?: number;
  interest_rate?: number;
}

// Taxas do gateway
export interface PaymentFees {
  // Taxa fixa por transação
  fixed_fee?: number;
  
  // Taxa percentual
  percentage_fee?: number;
  
  // Por método
  pix_fee?: PaymentMethodFee;
  credit_card_fee?: PaymentMethodFee;
  debit_card_fee?: PaymentMethodFee;
  boleto_fee?: PaymentMethodFee;
  
  // Antecipação
  anticipation_fee?: number;
}

export interface PaymentMethodFee {
  fixed_fee?: number;
  percentage_fee?: number;
  
  // Por parcelamento (cartão)
  installment_fees?: Array<{
    installments: number;
    fee_percentage: number;
  }>;
}

// Recursos do gateway
export interface PaymentFeatures {
  supports_refund: boolean;
  supports_partial_refund: boolean;
  supports_chargeback: boolean;
  supports_recurring: boolean;
  supports_split_payment: boolean;
  supports_marketplace: boolean;
  
  // Recursos avançados
  supports_fraud_analysis: boolean;
  supports_tokenization: boolean;
  supports_webhooks: boolean;
  
  // Relatórios
  provides_transaction_reports: boolean;
  provides_settlement_reports: boolean;
}

// Transação de pagamento
export interface PaymentTransaction extends TimestampFields {
  id: string;
  order_id: string;
  gateway_id: string;
  
  // Identificação externa
  gateway_transaction_id?: string;
  gateway_reference?: string;
  
  // Dados básicos
  amount: number;
  currency: string;
  method: PaymentMethodType;
  status: PaymentStatus;
  
  // Dados do pagamento
  payment_data?: PaymentTransactionData;
  
  // Processamento
  gateway_response?: GatewayResponse;
  attempts: PaymentAttempt[];
  
  // Datas importantes
  authorized_at?: string;
  captured_at?: string;
  failed_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
  
  // Valores de processamento
  gateway_fee?: number;
  net_amount?: number; // Valor líquido após taxas
  
  // Metadados
  customer_ip?: string;
  user_agent?: string;
  fraud_score?: number;
  
  // Relacionamentos
  refunds: PaymentRefund[];
  chargebacks: PaymentChargeback[];
  
  // Notificações
  webhook_notifications: WebhookNotification[];
}

// Dados específicos do pagamento
export interface PaymentTransactionData {
  // Para cartões
  card_data?: {
    token?: string;
    brand: string;
    last_four: string;
    expiry_month: number;
    expiry_year: number;
    holder_name: string;
    installments: number;
    
    // 3DS
    authentication_status?: '3ds_authenticated' | '3ds_failed' | 'no_3ds';
    authentication_token?: string;
  };
  
  // Para PIX
  pix_data?: {
    qr_code?: string;
    qr_code_url?: string;
    pix_key?: string;
    expires_at: string;
    
    // Dados do pagador (quando pago)
    payer_name?: string;
    payer_document?: string;
    payer_bank?: string;
    paid_at?: string;
  };
  
  // Para boleto
  boleto_data?: {
    barcode: string;
    digitable_line: string;
    pdf_url?: string;
    expires_at: string;
    
    // Dados do pagamento (quando pago)
    paid_amount?: number;
    paid_at?: string;
    bank_paid?: string;
  };
  
  // Para transferência bancária
  bank_transfer_data?: {
    bank_code: string;
    agency: string;
    account: string;
    account_digit: string;
    
    // Instruções
    instructions?: string[];
  };
}

// Resposta do gateway
export interface GatewayResponse {
  success: boolean;
  
  // Códigos de resposta
  gateway_code?: string;
  gateway_message?: string;
  
  // Status específico do gateway
  gateway_status?: string;
  
  // Dados de autorização
  authorization_code?: string;
  transaction_id?: string;
  
  // Antifraude
  fraud_analysis?: {
    score: number;
    status: 'approved' | 'denied' | 'review';
    provider: string;
    details?: Record<string, any>;
  };
  
  // Resposta completa (para debug)
  raw_response?: Record<string, any>;
  
  // Timing
  response_time_ms?: number;
}

// Tentativa de pagamento
export interface PaymentAttempt extends TimestampFields {
  id: string;
  transaction_id: string;
  attempt_number: number;
  
  // Resultado
  success: boolean;
  gateway_response: GatewayResponse;
  
  // Erro (se houver)
  error_code?: string;
  error_message?: string;
  
  // Configurações da tentativa
  gateway_used: string;
  retry_after_seconds?: number;
}

// Estorno
export interface PaymentRefund extends TimestampFields {
  id: string;
  transaction_id: string;
  
  // Valores
  amount: number;
  reason: string;
  
  // Status
  status: RefundStatus;
  
  // Gateway
  gateway_refund_id?: string;
  gateway_response?: GatewayResponse;
  
  // Processamento
  processed_at?: string;
  failed_at?: string;
  
  // Quem solicitou
  requested_by: string;
  requested_by_type: 'customer' | 'admin' | 'system' | 'vendor';
  
  // Metadados
  notes?: string;
  external_reference?: string;
}

export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Chargeback
export interface PaymentChargeback extends TimestampFields {
  id: string;
  transaction_id: string;
  
  // Dados do chargeback
  amount: number;
  reason_code: string;
  reason_description: string;
  
  // Status
  status: ChargebackStatus;
  
  // Datas importantes
  chargeback_date: string;
  response_due_date?: string;
  resolved_at?: string;
  
  // Documentos
  documents: ChargebackDocument[];
  
  // Histórico
  events: ChargebackEvent[];
  
  // Gateway
  gateway_chargeback_id?: string;
  
  // Resultado
  outcome?: 'won' | 'lost' | 'partially_won';
  recovered_amount?: number;
}

export type ChargebackStatus = 'received' | 'under_review' | 'responded' | 'won' | 'lost' | 'expired';

export interface ChargebackDocument extends TimestampFields {
  id: string;
  chargeback_id: string;
  type: string;
  name: string;
  url: string;
  uploaded_by: string;
}

export interface ChargebackEvent extends TimestampFields {
  id: string;
  chargeback_id: string;
  type: string;
  description: string;
  created_by: string;
}

// Notificação de webhook
export interface WebhookNotification extends TimestampFields {
  id: string;
  transaction_id: string;
  
  // Dados da notificação
  event_type: string;
  gateway_event_id?: string;
  
  // Payload
  payload: Record<string, any>;
  headers: Record<string, string>;
  
  // Processamento
  processed: boolean;
  processed_at?: string;
  processing_error?: string;
  
  // Retry
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  
  // Verificação
  signature_valid?: boolean;
  ip_address?: string;
}

// Configurações de split de pagamento
export interface SplitPaymentConfig {
  enabled: boolean;
  
  // Regras de split
  rules: SplitRule[];
  
  // Configurações
  auto_split: boolean;
  split_on_capture: boolean;
}

export interface SplitRule {
  recipient_id: string;
  recipient_type: 'marketplace' | 'seller' | 'vendor';
  
  // Valor
  amount_type: 'percentage' | 'fixed';
  amount_value: number;
  
  // Configurações
  liable_for_chargeback: boolean;
  charge_processing_fee: boolean;
  
  // Metadados
  description?: string;
}

// Relatório de liquidação
export interface SettlementReport {
  id: string;
  period_start: string;
  period_end: string;
  
  // Totais
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  refund_amount: number;
  chargeback_amount: number;
  
  // Detalhes por método
  by_method: Record<PaymentMethodType, {
    count: number;
    gross_amount: number;
    net_amount: number;
    fee_amount: number;
  }>;
  
  // Transações
  transactions: PaymentTransaction[];
  
  // Status
  status: 'pending' | 'processing' | 'completed';
  processed_at?: string;
} 