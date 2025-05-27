// Tipos de usuário
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'seller' | 'admin';
  created_at: Date;
  updated_at: Date;
}

// Tipos de pedido
export interface Order {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
}

// Tipos de resposta da API
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
    limit?: number;
  };
}

// Exportar todos os tipos
export * from './models/product';
// export * from './models/user';
// export * from './models/order';
// export * from './models/category';
// export * from './models/seller';
// export * from './api/responses';
// export * from './api/requests'; 