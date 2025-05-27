export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  discount?: number;
  images: string[];
  image?: string;
  category_id: string;
  seller_id: string;
  is_active: boolean;
  stock: number;
  sku?: string;
  slug: string;
  tags?: string[];
  pieces?: number;
  is_new?: boolean;
  is_featured?: boolean;
  is_black_friday?: boolean;
  has_fast_delivery?: boolean;
  created_at: Date;
  updated_at: Date;
}

export enum ProductMaterialTag {
  COTTON = '100% ALGODÃO',
  MICROFIBER = 'MICROFIBRA',
  MDF = 'MDF',
  POLYESTER = 'POLIÉSTER',
  WOOD = 'MADEIRA',
  PLASTIC = 'PLÁSTICO',
  METAL = 'METAL',
  SILICONE = 'SILICONE',
  CERAMIC = 'CERÂMICA',
  GLASS = 'VIDRO'
}

export enum ProductCategory {
  BEDROOM = 'bedroom',
  BATHROOM = 'bathroom',
  KITCHEN = 'kitchen',
  LIVING_ROOM = 'living_room',
  KIDS = 'kids',
  BABY = 'baby',
  DECORATION = 'decoration',
  ORGANIZATION = 'organization'
}

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'slug' | 'image'> & {
  slug?: string;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export interface CartProduct extends Product {
  quantity: number;
  selected_options?: {
    color?: string;
    size?: string;
    [key: string]: any;
  };
}

export interface WishlistProduct {
  product_id: string;
  user_id: string;
  added_at: Date;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  images?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  type: 'color' | 'size' | 'material' | 'other';
  price_adjustment?: number;
  stock: number;
  sku?: string;
  images?: string[];
}

export interface ProductPromotion {
  id: string;
  product_id: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  value: number;
  min_quantity?: number;
  max_uses?: number;
  valid_from: Date;
  valid_until: Date;
  is_active: boolean;
}

export interface ProductWithDetails extends Product {
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  seller?: {
    id: string;
    name: string;
    slug: string;
    rating?: number;
  };
  reviews?: ProductReview[];
  variants?: ProductVariant[];
  promotions?: ProductPromotion[];
  average_rating?: number;
  total_reviews?: number;
  total_sold?: number;
}

export interface ProductFilters {
  category_id?: string;
  seller_id?: string;
  min_price?: number;
  max_price?: number;
  tags?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  is_black_friday?: boolean;
  has_fast_delivery?: boolean;
  in_stock?: boolean;
  search?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'newest' | 'best_selling' | 'rating';
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
} 