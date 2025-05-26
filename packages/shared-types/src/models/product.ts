export interface Product {
  id: string;
  seller_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price?: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  track_inventory: boolean;
  quantity: number;
  weight?: number;
  status: 'active' | 'draft' | 'archived';
  featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt?: string;
  position: number;
  created_at: Date;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  attributes: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ProductCreateInput {
  seller_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  track_inventory?: boolean;
  quantity?: number;
  weight?: number;
  status?: 'active' | 'draft' | 'archived';
  featured?: boolean;
}

export interface ProductUpdateInput {
  category_id?: string;
  name?: string;
  description?: string;
  price?: number;
  compare_at_price?: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  track_inventory?: boolean;
  quantity?: number;
  weight?: number;
  status?: 'active' | 'draft' | 'archived';
  featured?: boolean;
}

export interface ProductFilter {
  category_id?: string;
  seller_id?: string;
  status?: 'active' | 'draft' | 'archived';
  featured?: boolean;
  min_price?: number;
  max_price?: number;
  search?: string;
} 