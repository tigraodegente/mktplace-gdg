import type { Product } from '@mktplace/shared-types';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const SHIPPING_MODES = {
  GROUPED: 'grouped',
  EXPRESS: 'express'
} as const;

export const COUPON_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed'
} as const;

export const COUPON_SCOPES = {
  CART: 'cart',
  SHIPPING: 'shipping',
  SELLER: 'seller'
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ShippingMode = typeof SHIPPING_MODES[keyof typeof SHIPPING_MODES];
export type CouponType = typeof COUPON_TYPES[keyof typeof COUPON_TYPES];
export type CouponScope = typeof COUPON_SCOPES[keyof typeof COUPON_SCOPES];

// Tipos de frete
export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: number;
  isFree: boolean;
  mode: ShippingMode;
}

// Frete individual por produto (para modo express)
export interface ProductShipping {
  productId: string;
  price: number;
  estimatedDays: number;
}

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
}

// Item do carrinho expandido
export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  sellerId: string;
  sellerName: string;
  shippingOptions?: ShippingOption[];
  selectedShipping?: string;
  appliedCoupon?: Coupon;
  // Novo: frete individual para modo express
  individualShipping?: ProductShipping;
}

// Agrupamento por seller
export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
  shippingOptions: ShippingOption[];
  selectedShipping?: string;
  shippingCost: number;
  appliedCoupon?: Coupon;
  discount: number;
  total: number;
  groupedShipping?: {
    price: number;
    estimatedDays: number;
  };
  expressShipping?: {
    price: number;
    estimatedDays: number;
  };
}

// Estado do carrinho
export interface CartState {
  items: CartItem[];
  sellerGroups: SellerGroup[];
  cartSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  cartTotal: number;
  appliedCartCoupon?: Coupon;
  zipCode?: string;
  // Novo: modalidade de entrega selecionada
  shippingMode: ShippingMode;
  appliedCoupon: Coupon | null;
  lastUpdated: Date;
}

export interface CartTotals {
  cartSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  couponDiscount: number;
  cartTotal: number;
  installmentValue: number;
}

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

export function isValidShippingMode(mode: string): mode is ShippingMode {
  return Object.values(SHIPPING_MODES).includes(mode as ShippingMode);
}

export function isValidCouponType(type: string): type is CouponType {
  return Object.values(COUPON_TYPES).includes(type as CouponType);
}

export function isValidCouponScope(scope: string): scope is CouponScope {
  return Object.values(COUPON_SCOPES).includes(scope as CouponScope);
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CartItemInput = Omit<CartItem, 'individualShipping' | 'appliedCoupon'>;

export type CouponInput = Pick<Coupon, 'code' | 'type' | 'value' | 'scope' | 'description'> & 
  Partial<Omit<Coupon, 'code' | 'type' | 'value' | 'scope' | 'description'>>;

export type ShippingCalculationParams = {
  sellerId: string;
  zipCode: string;
  items: CartItem[];
  mode: ShippingMode;
};

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