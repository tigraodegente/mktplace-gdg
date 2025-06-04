import type { BannerSlide } from '../types/banner';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Performance-optimized banner service
 * - Position-based banner loading
 * - 5-minute cache layer
 * - Error resilience with fallbacks
 */
class BannerService {
  private static instance: BannerService;
  private isLoading = false;
  private loadPromises = new Map<string, Promise<BannerSlide[]>>();

  static getInstance(): BannerService {
    if (!BannerService.instance) {
      BannerService.instance = new BannerService();
    }
    return BannerService.instance;
  }

  /**
   * Get cached data if available and fresh
   */
  private getCachedData(key: string): any | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set data in cache with timestamp
   */
  private setCachedData(key: string, data: any): void {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get banners for specific position with caching
   */
  async getBannersByPosition(position: string = 'home'): Promise<BannerSlide[]> {
    const cacheKey = `banners-${position}`;
    
    // Return cached data if available
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // If already loading this position, return the same promise
    if (this.loadPromises.has(cacheKey)) {
      return this.loadPromises.get(cacheKey)!;
    }

    // Start loading
    const loadPromise = this.fetchBanners(position);
    this.loadPromises.set(cacheKey, loadPromise);

    try {
      const data = await loadPromise;
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`[BannerService] Error loading banners for ${position}:`, error);
      // Return fallback data
      return this.getFallbackBanners(position);
    } finally {
      this.loadPromises.delete(cacheKey);
    }
  }

  /**
   * Internal fetch method
   */
  private async fetchBanners(position: string): Promise<BannerSlide[]> {
    const response = await fetch(`/api/banners?position=${encodeURIComponent(position)}`);
    if (!response.ok) {
      throw new Error(`Banner API failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Banner API returned error');
    }

    // API already returns data in correct format
    return result.data;
  }

  /**
   * Fallback banners in case of API failure
   */
  private getFallbackBanners(position: string): BannerSlide[] {
    if (position === 'home') {
      return [
        {
          id: 'fallback-1',
          title: 'Ofertas Especiais',
          subtitle: 'Produtos para bebê com desconto',
          image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-1.jpg',
          link: '/busca'
        }
      ];
    }
    
    if (position === 'delivery') {
      return [
        {
          id: 'fallback-delivery-1',
          title: 'Entrega Rápida',
          subtitle: 'Receba em casa com segurança',
          image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/entrega-rapida-1.jpg',
          link: '/busca'
        }
      ];
    }

    return [];
  }

  /**
   * Get home page banners (convenience method)
   */
  async getHomeBanners(): Promise<BannerSlide[]> {
    return this.getBannersByPosition('home');
  }

  /**
   * Get delivery banners (convenience method)
   */
  async getDeliveryBanners(): Promise<BannerSlide[]> {
    return this.getBannersByPosition('delivery');
  }

  /**
   * Prefetch banners for better UX
   */
  async prefetch(position: string = 'home'): Promise<void> {
    try {
      await this.getBannersByPosition(position);
    } catch (error) {
      // Silent fail for prefetch
      console.warn(`[BannerService] Prefetch failed for ${position}:`, error);
    }
  }

  /**
   * Clear cache (useful for admin updates)
   */
  clearCache(): void {
    cache.clear();
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }
}

// Export singleton instance
export const bannerService = BannerService.getInstance();

// Export for testing
export { BannerService }; 