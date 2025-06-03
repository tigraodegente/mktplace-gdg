/**
 * Base category interface
 */
export interface BaseCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image_url?: string | null;
  product_count?: number;
}

/**
 * Category with hierarchical relationships
 */
export interface CategoryWithChildren extends BaseCategory {
  children?: CategoryWithChildren[];
}

/**
 * Featured menu item (category or page)
 */
export interface FeaturedItem {
  id: string;
  name: string;
  slug: string;
  type: 'category' | 'page';
  href: string;
  menu_order: number;
  image_url?: string | null;
  product_count?: number;
}

/**
 * Category tree for mega menu with performance optimizations
 */
export interface CategoryTree extends BaseCategory {
  children: CategoryTree[];
  hasMore: boolean; // Indicates if there are more than 6 subcategories
}

/**
 * Complete menu data structure
 */
export interface MenuData {
  featuredItems: FeaturedItem[];
  allCategories: CategoryWithChildren[];
  stats: {
    featuredCount: number;
    totalCategories: number;
    totalPages: number;
  };
}

/**
 * API response wrapper
 */
export interface MenuResponse {
  success: boolean;
  data: MenuData;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

/**
 * Menu service interface for dependency injection
 */
export interface IMenuService {
  getMenuData(): Promise<MenuData>;
  getFeaturedItems(): Promise<FeaturedItem[]>;
  getCategoryTree(): Promise<CategoryTree[]>;
  prefetch(): Promise<void>;
  clearCache(): void;
  getCacheStats(): { size: number; keys: string[] };
}

/**
 * Featured products for mega menu
 */
export interface MenuFeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  discount?: number;
  image: string;
  category_name: string;
  rating?: number;
  reviews_count?: number;
  sold_count?: number;
} 