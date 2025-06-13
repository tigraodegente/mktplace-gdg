// =============================================================================
// TIPOS COMERCIAIS UNIFICADOS - Marketplace GDG
// =============================================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  weight?: number;
  seller_id: string;
  images?: string[];
  category_id?: string;
  height?: number;
  width?: number;
  length?: number;
  quantity?: number;
  is_active?: boolean;
  [key: string]: any;
}

// =============================================================================
// CARRINHO
// =============================================================================

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

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
  shippingOptions: ShippingOption[];
  shippingCost: number;
  appliedCoupon?: Coupon;
  discount: number;
  total: number;
  benefits?: AppliedBenefits;
  hasFreeShipping?: boolean;
}

export interface CartTotals {
  cartSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  productDiscounts?: number;
  couponDiscount: number;
  freeShippingSavings?: number;
  cartTotal: number;
  installmentValue: number;
  maxDeliveryDays?: number;
}

// =============================================================================
// CHECKOUT
// =============================================================================

export type CheckoutStep = 'cart' | 'auth' | 'address' | 'payment' | 'confirmation';

export interface Address {
  id?: string;
  name?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  isDefault?: boolean;
  label?: string;
}

export interface CheckoutState {
  step: CheckoutStep;
  items: CartItem[];
  address: Address | null;
  paymentMethod: string | null;
  validation: CheckoutValidation | null;
  order: Order | null;
  payment: Payment | null;
  loading: boolean;
  error: string | null;
}

export interface CheckoutValidation {
  isValid: boolean;
  errors: string[];
  items: CartItem[];
  totals: CartTotals;
  couponCode?: string;
}

// =============================================================================
// FRETE
// =============================================================================

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  modalityName?: string;
  isFree?: boolean;
  isExpress?: boolean;
}

export interface UnifiedShippingQuote {
  sellerId: string;
  sellerName: string;
  success: boolean;
  options: ShippingOption[];
  error?: string;
}

// =============================================================================
// CUPONS
// =============================================================================

export type CouponType = 'percentage' | 'fixed' | 'free_shipping';
export type CouponScope = 'cart' | 'seller' | 'shipping';

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
  discount_amount?: number;
  applied_to?: any;
}

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

// =============================================================================
// PEDIDOS
// =============================================================================

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: CartItem[];
  address: Address;
  paymentMethod: string;
  totals: CartTotals;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  transactionId?: string;
  createdAt: Date;
}

// =============================================================================
// API RESPONSES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    source?: string;
  };
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error };

export interface CartAnalytics {
  itemCount: number;
  sellerCount: number;
  averageItemValue: number;
  mostExpensiveItem: Product | null;
  cheapestItem: Product | null;
  totalWeight: number;
  hasDiscount: boolean;
  discountPercentage: number;
} 