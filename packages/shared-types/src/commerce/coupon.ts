// Coupon Types - Tipos unificados para sistema de cupons

import type { TimestampFields } from '../common';

export type CouponType = 'percentage' | 'fixed' | 'free_shipping';
export type CouponScope = 'cart' | 'shipping' | 'seller' | 'category' | 'product';
export type CouponUserType = 'all' | 'new_customers' | 'returning_customers' | 'vip';

export interface Coupon extends TimestampFields {
  id: string;
  code: string;
  name: string;
  description?: string;
  
  // Tipo e valor do desconto
  type: CouponType;
  value: number; // Percentual (ex: 10 = 10%) ou valor fixo em reais
  scope: CouponScope;
  
  // Limites e restrições
  min_order_amount?: number;
  max_discount_amount?: number;
  
  // Uso e limite
  max_uses?: number;
  current_uses: number;
  max_uses_per_user?: number;
  
  // Público-alvo
  user_type: CouponUserType;
  allowed_user_ids?: string[]; // IDs específicos de usuários
  
  // Aplicabilidade
  seller_ids?: string[];
  category_ids?: string[];
  product_ids?: string[];
  
  // Datas
  starts_at?: string;
  expires_at?: string;
  
  // Configurações
  is_active: boolean;
  is_automatic: boolean; // Aplica automaticamente se condições forem atendidas
  stackable: boolean; // Pode ser combinado com outros cupons
  
  // Configurações especiais
  first_purchase_only: boolean;
  minimum_items?: number;
  
  // Para cupons de frete grátis
  free_shipping_threshold?: number;
}

// Cupom aplicado (resultado da validação)
export interface AppliedCoupon {
  code: string;
  type: CouponType;
  value: number;
  scope: CouponScope;
  description: string;
  minValue?: number;
  
  // Valores calculados
  discount_amount: number;
  applied_to: 'cart' | 'shipping' | 'items';
  
  // Metadados
  is_automatic?: boolean;
  coupon_id: string;
}

// Validação de cupom
export interface CouponValidation {
  is_valid: boolean;
  coupon?: AppliedCoupon;
  error?: {
    code: 'INVALID_CODE' | 'EXPIRED' | 'MAX_USES_EXCEEDED' | 'MIN_ORDER_NOT_MET' | 'USER_NOT_ELIGIBLE' | 'NOT_APPLICABLE';
    message: string;
  };
}

// Request para validação de cupom
export interface CouponValidationRequest {
  code: string;
  user_id?: string;
  session_id?: string;
  items: CouponCartItem[];
  shipping_cost: number;
  current_total: number;
}

export interface CouponCartItem {
  product_id: string;
  seller_id: string;
  category_id?: string;
  quantity: number;
  price: number;
}

// Cupons automáticos
export interface AutomaticCouponCheck {
  user_id?: string;
  session_id?: string;
  items: CouponCartItem[];
  shipping_cost: number;
  current_total: number;
  is_first_purchase?: boolean;
}

export interface AutomaticCouponResult {
  coupons: AppliedCoupon[];
  total_discount: number;
  messages: string[];
} 