// Tipos customizados para o marketplace

export type UserRole = 'customer' | 'seller' | 'admin';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'pix' | 'boleto';

// Tipos para respostas da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    total?: number;
    perPage?: number;
  };
}

// Tipos para autenticação
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

// Tipos para carrinho
export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

// Tipos para checkout
export interface CheckoutData {
  items: CartItem[];
  addressId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}
