// Order Types - Tipos unificados para pedidos

import type { Address } from './address';
import type { PaymentMethodType, PaymentStatus, OrderStatus, OrderItemStatus } from './checkout';
import type { TimestampFields } from '../common';

// Re-export dos tipos principais do checkout
export type { OrderStatus, PaymentStatus, OrderItemStatus };

// Pedido completo
export interface Order extends TimestampFields {
  id: string;
  order_number: string;
  
  // Status
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  
  // Cliente
  user_id?: string;
  customer_data: CustomerData;
  
  // Endereços
  shipping_address: Address;
  billing_address?: Address;
  
  // Valores
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  
  // Pagamento
  payment_method: PaymentMethodType;
  payment_data?: any;
  payment_id?: string;
  
  // Itens
  items: OrderItem[];
  
  // Entrega
  shipping_data?: ShippingData;
  estimated_delivery_date?: string;
  delivered_at?: string;
  
  // Cupons e promoções
  coupon_code?: string;
  discount_details?: DiscountDetails[];
  
  // Metadados
  notes?: string;
  internal_notes?: string;
  gift_message?: string;
  
  // Origem
  source: OrderSource;
  utm_data?: UtmData;
  
  // Tracking
  events: OrderEvent[];
  
  // Cancelamento/Devolução
  cancellation_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  
  refund_amount?: number;
  refunded_at?: string;
  refund_reason?: string;
}

// Item do pedido
export interface OrderItem extends TimestampFields {
  id: string;
  order_id: string;
  
  // Produto
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image?: string;
  
  // Vendedor
  seller_id: string;
  seller_name: string;
  
  // Quantidade e preços
  quantity: number;
  unit_price: number;
  total_price: number;
  
  // Variações
  selected_color?: string;
  selected_size?: string;
  variant_id?: string;
  variant_data?: Record<string, any>;
  
  // Status
  status: OrderItemStatus;
  
  // Entrega
  tracking_code?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  
  // Cancelamento/Devolução
  cancelled_at?: string;
  cancellation_reason?: string;
  
  returned_at?: string;
  return_reason?: string;
  refunded_amount?: number;
  
  // Metadados
  notes?: string;
  
  // Eventos específicos do item
  events: OrderItemEvent[];
}

// Dados do cliente
export interface CustomerData {
  // Dados básicos
  name: string;
  email: string;
  phone?: string;
  document?: string;
  
  // Para convidados
  is_guest: boolean;
  guest_session_id?: string;
  
  // Dados opcionais
  birth_date?: string;
  gender?: 'M' | 'F' | 'other';
  
  // Preferências
  accepts_marketing: boolean;
  preferred_language?: string;
  
  // Dados da conta (se logado)
  user_id?: string;
  loyalty_points?: number;
  customer_tier?: string;
}

// Status de cumprimento
export type FulfillmentStatus = 'pending' | 'partially_fulfilled' | 'fulfilled' | 'cancelled' | 'returned';

// Dados de entrega
export interface ShippingData {
  carrier: string;
  service: string;
  tracking_code?: string;
  tracking_url?: string;
  
  // Estimativas
  estimated_delivery_date?: string;
  estimated_shipping_days: number;
  
  // Custos
  shipping_cost: number;
  insurance_cost?: number;
  
  // Configurações
  requires_signature: boolean;
  delivery_instructions?: string;
  
  // Eventos de tracking
  tracking_events: TrackingEvent[];
  
  // Metadados
  shipping_label_url?: string;
  invoice_url?: string;
}

// Evento de tracking
export interface TrackingEvent extends TimestampFields {
  id: string;
  status: string;
  description: string;
  location?: string;
  carrier_status?: string;
  is_delivered: boolean;
  is_exception: boolean;
}

// Detalhes de desconto
export interface DiscountDetails {
  type: 'coupon' | 'promotion' | 'loyalty' | 'manual';
  name: string;
  code?: string;
  amount: number;
  percentage?: number;
  applied_to: 'cart' | 'shipping' | 'item';
  item_ids?: string[];
}

// Origem do pedido
export type OrderSource = 'web' | 'mobile' | 'admin' | 'api' | 'marketplace' | 'social';

// Dados de UTM
export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
}

// Evento do pedido
export interface OrderEvent extends TimestampFields {
  id: string;
  order_id: string;
  type: OrderEventType;
  description: string;
  
  // Contexto
  user_id?: string;
  user_type: 'customer' | 'admin' | 'system' | 'vendor';
  
  // Dados do evento
  previous_status?: string;
  new_status?: string;
  metadata?: Record<string, any>;
  
  // Visibilidade
  is_public: boolean; // Se o cliente pode ver
  is_internal: boolean; // Apenas para equipe interna
}

// Evento do item do pedido
export interface OrderItemEvent extends TimestampFields {
  id: string;
  order_item_id: string;
  type: OrderItemEventType;
  description: string;
  
  // Contexto
  user_id?: string;
  user_type: 'customer' | 'admin' | 'system' | 'vendor';
  
  // Dados específicos
  quantity_change?: number;
  price_change?: number;
  status_change?: {
    from: OrderItemStatus;
    to: OrderItemStatus;
  };
  
  // Metadados
  metadata?: Record<string, any>;
  is_public: boolean;
}

// Tipos de eventos
export type OrderEventType = 
  | 'created'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'note_added'
  | 'status_changed';

export type OrderItemEventType =
  | 'created'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded'
  | 'quantity_changed'
  | 'price_changed'
  | 'note_added';

// Filtros para busca de pedidos
export interface OrderFilters {
  // Status
  status?: OrderStatus[];
  payment_status?: PaymentStatus[];
  fulfillment_status?: FulfillmentStatus[];
  
  // Datas
  created_after?: string;
  created_before?: string;
  
  // Cliente
  customer_email?: string;
  customer_phone?: string;
  user_id?: string;
  
  // Valores
  min_total?: number;
  max_total?: number;
  
  // Pagamento
  payment_method?: PaymentMethodType[];
  
  // Vendedor
  seller_id?: string;
  
  // Origem
  source?: OrderSource[];
  
  // Busca textual
  search?: string; // Busca em order_number, customer_name, customer_email
  
  // Paginação
  page?: number;
  limit?: number;
  sort_by?: OrderSortBy;
  sort_order?: 'asc' | 'desc';
}

export type OrderSortBy = 'created_at' | 'total' | 'order_number' | 'customer_name' | 'status';

// Estatísticas de pedidos
export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  
  // Por status
  orders_by_status: Record<OrderStatus, number>;
  revenue_by_status: Record<OrderStatus, number>;
  
  // Por período
  orders_by_period: Array<{
    period: string;
    orders: number;
    revenue: number;
  }>;
  
  // Top produtos/vendedores
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  
  top_sellers: Array<{
    seller_id: string;
    seller_name: string;
    orders: number;
    revenue: number;
  }>;
} 