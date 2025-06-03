export type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirmation';

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
  variant?: {
    id: string;
    name: string;
    price?: number;
  };
}

export interface Address {
  id?: string;
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
  name: string;
  icon?: string;
  description?: string;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface CheckoutValidation {
  isValid: boolean;
  errors: string[];
  items: CartItem[];
  totals: OrderTotals;
  couponCode?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  items?: CartItem[];
  address?: Address;
  totals?: OrderTotals;
}

export interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  paymentData: any;
  expiresAt?: string;
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