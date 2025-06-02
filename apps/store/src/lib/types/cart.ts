// Definindo Product localmente até resolver imports
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  weight?: number;
  seller_id: string;
  [key: string]: any; // Permitir propriedades adicionais
}

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type ShippingMode = 'grouped' | 'express';

export const COUPON_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  FREE_SHIPPING: 'free_shipping'
} as const;

export const COUPON_SCOPES = {
  CART: 'cart',
  SHIPPING: 'shipping',
  SELLER: 'seller'
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type CouponType = typeof COUPON_TYPES[keyof typeof COUPON_TYPES];
export type CouponScope = typeof COUPON_SCOPES[keyof typeof COUPON_SCOPES];

// Tipos de cupom
export interface Coupon {
  code: string;
  type: CouponType;
  value: number;
  scope: CouponScope;
  description: string;
  minValue?: number;
  maxDiscount?: number;
  validUntil?: Date;
  usageLimit?: number;
  usageCount?: number;
  includesFreeShipping?: boolean;
}

// Benefícios aplicados
export interface AppliedBenefits {
  freeShipping?: {
    level: 'product' | 'seller' | 'cart';
    reason: string;
  };
  cashback?: {
    percentage: number;
    maxValue?: number;
  };
  points?: {
    multiplier: number;
    bonusPoints?: number;
  };
}

// Item do carrinho
export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  sellerId: string;
  sellerName: string;
  appliedCoupon?: Coupon;
  benefits?: AppliedBenefits;
}

// Agrupamento por seller  
export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
  shippingOptions: any[]; // Compatibilidade - será usado pelo sistema novo
  shippingCost: number;   // Compatibilidade - será calculado pelo sistema novo
  appliedCoupon?: Coupon;
  discount: number;
  total: number;
  benefits?: AppliedBenefits;
  hasFreeShipping?: boolean;
  groupedShipping?: {
    estimatedDays: number;
    cost: number;
  };
  expressShipping?: {
    estimatedDays: number;
    cost: number;
  };
}

// Totais do carrinho
export interface CartTotals {
  cartSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  couponDiscount: number;
  cartTotal: number;
  installmentValue: number;
}

// Endereços salvos
export interface SavedAddress {
  id: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country?: string;
  isDefault: boolean;
  label?: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidCouponType(type: string): type is CouponType {
  return Object.values(COUPON_TYPES).includes(type as CouponType);
}

export function isValidCouponScope(scope: string): scope is CouponScope {
  return Object.values(COUPON_SCOPES).includes(scope as CouponScope);
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CartItemInput = Omit<CartItem, 'appliedCoupon'>;

export type CouponInput = Pick<Coupon, 'code' | 'type' | 'value' | 'scope' | 'description'> & 
  Partial<Omit<Coupon, 'code' | 'type' | 'value' | 'scope' | 'description'>>;

export type CartAnalytics = {
  itemCount: number;
  sellerCount: number;
  averageItemValue: number;
  mostExpensiveItem: Product | null;
  cheapestItem: Product | null;
  totalWeight: number;
  hasDiscount: boolean;
  discountPercentage: number;
}; 