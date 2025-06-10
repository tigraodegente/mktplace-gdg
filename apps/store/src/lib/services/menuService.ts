import type { 
  MenuData, 
  FeaturedItem, 
  CategoryWithChildren, 
  CategoryTree 
} from '$lib/types/menu';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Performance-optimized menu service
 * - Single API call for all menu data
 * - 5-minute cache layer
 * - Lazy loading support
 * - Error resilience
 */
class MenuService {
  private static instance: MenuService;
  private isLoading = false;
  private loadPromise: Promise<MenuData> | null = null;

  static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
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
   * Fetch menu data with optimized caching and error handling
   */
  async getMenuData(): Promise<MenuData> {
    const cacheKey = 'menu-data';
    
    // Return cached data if available
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // If already loading, return the same promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.fetchMenuData();

    try {
      const data = await this.loadPromise;
      this.setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('[MenuService] Error loading menu data:', error);
      // Return fallback data structure
      return this.getFallbackMenuData();
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal fetch method
   */
  private async fetchMenuData(): Promise<MenuData> {
    const response = await fetch('/api/menu-items');
    if (!response.ok) {
      throw new Error(`Menu API failed: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Menu API returned error');
    }

    return result.data;
  }

  /**
   * Fallback data in case of API failure
   */
  private getFallbackMenuData(): MenuData {
    return {
      featuredItems: [],
      allCategories: [],
      stats: {
        featuredCount: 0,
        totalCategories: 0,
        totalPages: 0
      }
    };
  }

  /**
   * Get only featured items (for main menu)
   * Optimized for quick access
   */
  async getFeaturedItems(): Promise<FeaturedItem[]> {
    const menuData = await this.getMenuData();
    return menuData.featuredItems;
  }

  /**
   * Get category tree for mega menu
   * Lazy-loaded when needed
   */
  async getCategoryTree(): Promise<CategoryTree[]> {
    const menuData = await this.getMenuData();
    return this.buildCategoryTree(menuData.allCategories);
  }

  /**
   * Build optimized category tree structure
   */
  private buildCategoryTree(categories: CategoryWithChildren[]): CategoryTree[] {
    const mainCategories = categories.filter(cat => !cat.parent_id);
    
    return mainCategories.map(mainCat => ({
      ...mainCat,
      children: this.getChildCategories(mainCat.id, categories)
        .map(child => ({
          ...child,
          children: this.getChildCategories(child.id, categories).map(grandchild => ({
            ...grandchild,
            children: [],
            hasMore: false
          })),
          hasMore: false
        })),
      hasMore: false
    }));
  }

  /**
   * Get child categories efficiently
   */
  private getChildCategories(parentId: string, categories: CategoryWithChildren[]): CategoryWithChildren[] {
    return categories.filter(cat => cat.parent_id === parentId);
  }

  /**
   * Prefetch menu data (can be called on app initialization)
   */
  async prefetch(): Promise<void> {
    try {
      await this.getMenuData();
    } catch (error) {
      // Silent fail for prefetch
      console.warn('[MenuService] Prefetch failed:', error);
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
export const menuService = MenuService.getInstance();

// Export for testing
export { MenuService }; 