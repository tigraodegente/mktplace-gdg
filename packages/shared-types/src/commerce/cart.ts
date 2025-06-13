// Cart Types - Tipos unificados para carrinho de compras

import type { Product, ProductVariant } from './product';
import type { AppliedCoupon } from './coupon';
import type { TimestampFields } from '../common';

// Item do carrinho
export interface CartItem {
  product: Product;
  quantity: number;
  
  // Variações selecionadas
  selected_color?: string;
  selected_size?: string;
  selected_variant?: ProductVariant;
  
  // Vendedor
  seller_id: string;
  seller_name: string;
  
  // Cupons aplicados especificamente ao item
  applied_coupon?: AppliedCoupon;
  
  // Benefícios aplicados
  benefits?: AppliedBenefits;
  
  // Metadados
  added_at?: string;
  updated_at?: string;
  
  // Para identificação única no carrinho
  cart_item_id?: string;
}

// Benefícios aplicados ao item/grupo
export interface AppliedBenefits {
  free_shipping?: {
    level: 'product' | 'seller' | 'cart';
    reason: string;
  };
  cashback?: {
    percentage: number;
    max_value?: number;
    estimated_value: number;
  };
  points?: {
    multiplier: number;
    bonus_points?: number;
    estimated_points: number;
  };
}

// Opções de frete
export interface ShippingOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimated_days: number;
  carrier: string;
  service_code?: string;
  
  // Configurações especiais
  is_free: boolean;
  is_express: boolean;
  requires_appointment: boolean;
  
  // Metadados
  tracking_available: boolean;
  insurance_included: boolean;
}

// Agrupamento por vendedor
export interface SellerGroup {
  seller_id: string;
  seller_name: string;
  seller_logo?: string;
  
  // Itens do vendedor
  items: CartItem[];
  
  // Cálculos
  subtotal: number;
  discount: number;
  total: number;
  
  // Frete
  shipping_options: ShippingOption[];
  selected_shipping?: string; // ID da opção selecionada
  shipping_cost: number;
  
  // Cupons aplicados ao grupo
  applied_coupon?: AppliedCoupon;
  
  // Benefícios do grupo
  benefits?: AppliedBenefits;
  has_free_shipping?: boolean;
  
  // Configurações de entrega
  shipping_modes?: {
    grouped?: {
      estimated_days: number;
      cost: number;
    };
    express?: {
      estimated_days: number;
      cost: number;
    };
  };
}

// Totais do carrinho
export interface CartTotals {
  // Valores base
  cart_subtotal: number;
  total_shipping: number;
  total_discount: number;
  cart_total: number;
  
  // Descontos detalhados
  coupon_discount: number;
  item_discounts: number;
  shipping_discount: number;
  
  // Benefícios
  free_shipping_savings: number;
  cashback_total: number;
  points_total: number;
  
  // Parcelamento
  installment_value: number;
  max_installments: number;
  
  // PIX (se aplicável)
  pix_discount?: number;
  pix_total?: number;
  
  // Metadados
  has_free_shipping: boolean;
  has_express_shipping: boolean;
  estimated_delivery_days: number;
}

// Estado do carrinho
export interface CartState extends TimestampFields {
  id?: string;
  user_id?: string;
  session_id?: string;
  
  // Itens
  items: CartItem[];
  seller_groups: SellerGroup[];
  
  // Cupons
  applied_coupon?: AppliedCoupon;
  available_coupons?: AppliedCoupon[];
  
  // Totais
  totals: CartTotals;
  
  // Configurações
  zip_code?: string;
  selected_shipping_options: Record<string, string>; // seller_id -> shipping_option_id
  
  // Estado de cálculo
  is_calculating_shipping: boolean;
  is_validating: boolean;
  has_errors: boolean;
  errors: CartError[];
  
  // Metadados
  last_activity?: string;
  expires_at?: string;
}

// Erros do carrinho
export interface CartError {
  type: 'stock' | 'price' | 'shipping' | 'coupon' | 'general';
  code: string;
  message: string;
  item_id?: string;
  seller_id?: string;
  details?: any;
}

// Ações do carrinho
export type CartAction = 
  | 'add_item'
  | 'remove_item' 
  | 'update_quantity'
  | 'apply_coupon'
  | 'remove_coupon'
  | 'update_shipping'
  | 'calculate_totals'
  | 'validate_cart'
  | 'clear_cart';

// Validação do carrinho
export interface CartValidation {
  is_valid: boolean;
  has_warnings: boolean;
  errors: CartError[];
  warnings: CartError[];
  
  // Validações específicas
  stock_validation: {
    valid: boolean;
    out_of_stock_items: string[];
    low_stock_items: Array<{
      item_id: string;
      available: number;
      requested: number;
    }>;
  };
  
  pricing_validation: {
    valid: boolean;
    price_changes: Array<{
      item_id: string;
      old_price: number;
      new_price: number;
    }>;
  };
  
  shipping_validation: {
    valid: boolean;
    zip_code_required: boolean;
    invalid_zip_code: boolean;
    no_shipping_options: string[]; // seller_ids sem opções
  };
}

// Analytics do carrinho
export interface CartAnalytics {
  item_count: number;
  seller_count: number;
  category_count: number;
  
  average_item_value: number;
  most_expensive_item: Product | null;
  cheapest_item: Product | null;
  
  total_weight: number;
  total_volume: number;
  
  discount_percentage: number;
  savings_amount: number;
  
  shipping_percentage: number; // % do frete sobre o total
  
  user_segments: string[]; // Ex: ["new_customer", "vip", "bulk_buyer"]
} 