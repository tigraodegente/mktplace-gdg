// Types relacionados ao carrinho de compras

import type { Product } from './product';

export interface CartItem extends Product {
  quantity: number;
  selectedVariation?: {
    id: string;
    type: string;
    value: string;
  };
}

export interface Cart {
  id: string;
  user_id?: string;
  session_id?: string;
  items: CartItem[];
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  coupon_code?: string;
  created_at: string;
  updated_at: string;
}

export interface CartSummary {
  items_count: number;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
}

export interface CartSellerGroup {
  seller_id: string;
  seller_name: string;
  items: CartItem[];
  subtotal: number;
  shipping_cost: number;
} 