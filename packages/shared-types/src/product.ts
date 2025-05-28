// Tipos relacionados a produtos

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  original_price?: number;
  discount?: number;
  image?: string;
  images?: string[];
  category_id: string;
  category_name?: string;
  seller_id: string;
  seller_name?: string;
  sku?: string;
  pieces?: number;
  rating?: number;
  reviews_count?: number;
  sold_count?: number;
  is_black_friday?: boolean;
  has_fast_delivery?: boolean;
  tags?: string[];
  weight?: number;
  variations?: ProductVariation[];
  stock?: number;
  stock_alert_threshold?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariation {
  id: string;
  type: 'color' | 'size' | 'material';
  value: string;
  stock?: number;
  price_adjustment?: number;
  image?: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
  helpful_count?: number;
  verified_purchase?: boolean;
}

export interface ProductFilter {
  categories?: string[];
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  has_discount?: boolean;
  has_fast_delivery?: boolean;
  seller_ids?: string[];
  tags?: string[];
  sort_by?: 'price_asc' | 'price_desc' | 'rating' | 'sold_count' | 'newest';
} 