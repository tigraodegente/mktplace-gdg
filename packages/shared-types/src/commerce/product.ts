// Product Types - Tipos unificados para produtos

import type { TimestampFields, Status } from '../common';

export interface Product extends TimestampFields {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  
  // Preços
  price: number;
  original_price?: number;
  cost_price?: number;
  
  // Categorização
  category_id?: string;
  category?: Category;
  brand_id?: string;
  brand?: Brand;
  tags?: string[];
  
  // Vendedor
  seller_id: string;
  seller?: Seller;
  
  // Estoque e física
  sku?: string;
  quantity: number;
  weight?: number;
  dimensions?: ProductDimensions;
  
  // Mídia
  images: string[];
  video_url?: string;
  
  // Variações
  variants?: ProductVariant[];
  has_variants: boolean;
  
  // Configurações
  is_active: boolean;
  is_featured?: boolean;
  is_digital?: boolean;
  requires_shipping: boolean;
  
  // SEO e meta
  meta_title?: string;
  meta_description?: string;
  
  // Avaliações
  rating?: number;
  review_count?: number;
  
  // Configurações de entrega
  free_shipping?: boolean;
  shipping_class?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  type: 'color' | 'size' | 'custom';
  value: string;
  sku?: string;
  price_modifier?: number; // Valor a adicionar/subtrair do preço base
  quantity?: number;
  is_active: boolean;
  sort_order: number;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'm' | 'in' | 'ft';
}

export interface Category extends TimestampFields {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image?: string;
  is_active: boolean;
  sort_order: number;
}

export interface Brand extends TimestampFields {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  is_active: boolean;
}

export interface Seller extends TimestampFields {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  description?: string;
  logo?: string;
  banner?: string;
  is_active: boolean;
  rating?: number;
  review_count?: number;
}

// Tipos auxiliares
export type ProductSortBy = 'name' | 'price' | 'created_at' | 'rating' | 'best_seller';
export type ProductSortOrder = 'asc' | 'desc';

export interface ProductFilters {
  category_id?: string;
  brand_id?: string;
  seller_id?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  is_featured?: boolean;
  tags?: string[];
  search?: string;
} 