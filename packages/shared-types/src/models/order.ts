export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  notes?: string;
  shipping_address_id: string;
  billing_address_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  seller_id: string;
  price: number;
  quantity: number;
  total: number;
  created_at: Date;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  notes?: string;
  created_by: string;
  created_at: Date;
}

export interface OrderCreateInput {
  user_id: string;
  items: OrderItemInput[];
  shipping_address_id: string;
  billing_address_id?: string;
  notes?: string;
}

export interface OrderItemInput {
  product_id: string;
  variant_id?: string;
  quantity: number;
  price: number;
}

export interface OrderUpdateInput {
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
}

export interface OrderFilter {
  user_id?: string;
  seller_id?: string;
  status?: Order['status'];
  payment_status?: Order['payment_status'];
  date_from?: Date;
  date_to?: Date;
} 