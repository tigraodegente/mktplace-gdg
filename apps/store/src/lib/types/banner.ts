/**
 * Banner slide interface for carousels and banners
 */
export interface BannerSlide {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link: string;
  imageAlt?: string;
  order?: number;
  position?: string;
}

/**
 * Banner API response
 */
export interface BannerResponse {
  success: boolean;
  data: BannerSlide[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Banner database record
 */
export interface BannerRecord {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  position: string;
  display_order: number;
  starts_at?: Date;
  ends_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Banner position types
 */
export type BannerPosition = 'home' | 'delivery' | 'category' | 'checkout' | 'thank-you';

/**
 * Banner cache entry
 */
export interface BannerCacheEntry {
  data: BannerSlide[];
  timestamp: number;
} 