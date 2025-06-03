# Menu System Architecture - Performance Optimized

## Overview

The menu system is designed for maximum performance with intelligent caching, lazy loading, and optimized database queries. This document outlines the complete architecture and best practices.

## Architecture Components

### 1. Database Layer
- **Tables**: `categories`, `pages`, `products`
- **Key Fields**: `is_featured`, `menu_order` for menu control
- **Optimization**: Single recursive query for category hierarchy

### 2. API Layer (`/api/menu-items`)
- **Single Endpoint**: Aggregates all menu data in one request
- **Caching**: 5-minute HTTP cache headers
- **Performance**: Optimized SQL with CTEs for recursive counting
- **Error Handling**: Graceful fallbacks with proper error responses

### 3. Service Layer (`menuService.ts`)
- **Singleton Pattern**: Single instance across app
- **Multi-layer Caching**: Memory cache with TTL
- **Promise Deduplication**: Prevents duplicate API calls
- **Prefetch Support**: Background data loading
- **Error Resilience**: Fallback data structures

### 4. Component Layer (`DesktopCategoryMenu.svelte`)
- **Lazy Loading**: Mega menu loads on hover
- **Progressive Enhancement**: Featured items load first
- **Error States**: Loading, error, and empty states
- **Performance**: Optimized hover handlers and CSS

## Performance Features

### Caching Strategy
```
Browser Request → Service Cache (5min) → API Cache (5min) → Database
```

1. **Service Cache**: In-memory with timestamp validation
2. **HTTP Cache**: Browser/CDN caching with Cache-Control headers
3. **Database Optimization**: Single query with recursive CTEs

### Loading Strategy
```
App Start → Prefetch (background) → Featured Items (priority) → Mega Menu (on-demand)
```

1. **App Initialization**: HTML prefetch script
2. **Component Mount**: Load featured items immediately
3. **User Interaction**: Load mega menu on hover
4. **Background**: Prefetch mega menu data

### Database Optimization
```sql
-- Single optimized query with recursive product counting
WITH RECURSIVE category_tree AS (
  -- Efficient 3-level hierarchy with proper counting
)
SELECT * FROM category_tree
```

## Data Flow

### 1. Menu Data Structure
```typescript
interface MenuData {
  featuredItems: FeaturedItem[];     // Main menu (5-8 items)
  allCategories: CategoryWithChildren[]; // Mega menu (90+ items)
  stats: {
    featuredCount: number;
    totalCategories: number;
    totalPages: number;
  };
}
```

### 2. Featured Items Processing
- Combines categories and pages
- Sorts by `menu_order` then alphabetically
- Generates proper URLs (`/busca?categoria=` vs `/{slug}`)
- Includes product counts for categories

### 3. Category Tree Building
- Builds hierarchical structure efficiently
- Limits subcategories to 6 for performance
- Calculates recursive product counts
- Provides `hasMore` flag for UI

## Performance Metrics

### Target Performance
- **API Response**: < 300ms
- **Cache Hit**: < 10ms
- **First Menu Paint**: < 100ms
- **Mega Menu Load**: < 200ms

### Optimization Techniques
1. **Database**: Single query, indexed fields, recursive CTEs
2. **Caching**: Multi-layer with intelligent invalidation
3. **Network**: HTTP caching, request deduplication
4. **UI**: Lazy loading, skeleton states, prefetch

## Usage Examples

### Basic Service Usage
```typescript
import { menuService } from '$lib/services/menuService';

// Get featured items (cached)
const featuredItems = await menuService.getFeaturedItems();

// Get full category tree (lazy-loaded)
const categoryTree = await menuService.getCategoryTree();

// Prefetch for better UX
await menuService.prefetch();
```

### Component Integration
```svelte
<script>
  import { onMount } from 'svelte';
  import { menuService } from '$lib/services/menuService';
  
  let featuredItems = [];
  
  onMount(async () => {
    featuredItems = await menuService.getFeaturedItems();
  });
</script>

{#each featuredItems as item}
  <a href={item.href}>{item.name}</a>
{/each}
```

## Admin Control

### Database Configuration
```sql
-- Mark category as featured in main menu
UPDATE categories SET is_featured = true, menu_order = 1 WHERE slug = 'almofadas';

-- Mark page as featured in main menu
UPDATE pages SET is_featured = true, menu_order = 99 WHERE slug = 'blog';

-- Remove from featured menu
UPDATE categories SET is_featured = false WHERE slug = 'old-category';
```

### Cache Management
```typescript
// Clear cache after admin changes
menuService.clearCache();

// Get cache statistics
const stats = menuService.getCacheStats();
console.log(`Cache size: ${stats.size}, Keys: ${stats.keys}`);
```

## Error Handling

### Service Level
- Promise deduplication prevents race conditions
- Fallback data structures for API failures
- Silent prefetch failures with console warnings

### Component Level
- Loading states with skeleton UI
- Error states with user-friendly messages
- Progressive enhancement (featured → mega menu)

### API Level
- Proper HTTP status codes
- Structured error responses
- Database connection retry logic

## Best Practices

### For Developers
1. **Always use the service**: Don't call API directly from components
2. **Handle loading states**: Show skeletons, not blank screens
3. **Prefetch when possible**: Use `menuService.prefetch()` strategically
4. **Clear cache on admin changes**: Call `clearCache()` after updates

### For Performance
1. **Limit featured items**: 5-8 items max for optimal UX
2. **Use proper SQL indexes**: On `is_featured`, `menu_order`, `parent_id`
3. **Monitor cache hit rates**: Should be > 90% in production
4. **Optimize images**: Use WebP with proper sizing

### For Scalability
1. **Database**: Consider read replicas for high traffic
2. **CDN**: Enable edge caching for `/api/menu-items`
3. **Monitoring**: Track API response times and cache effectiveness
4. **Graceful degradation**: System works even without menu data

## Testing

### Unit Tests
```typescript
// Test service functionality
import { MenuService } from '$lib/services/menuService';

describe('MenuService', () => {
  it('should cache responses correctly', async () => {
    // Test caching logic
  });
  
  it('should handle API failures gracefully', async () => {
    // Test error handling
  });
});
```

### Integration Tests
- API endpoint response validation
- Database query performance
- Cache invalidation logic
- Component state management

### Performance Tests
- API response time under load
- Cache effectiveness measurement
- Memory usage monitoring
- Database query optimization

## Deployment

### Environment Setup
```bash
# Development
DATABASE_URL=postgresql://...dev-db...

# Production (Cloudflare)
DATABASE_URL=postgresql://...prod-db...
```

### Migration
```sql
-- Add menu control fields
ALTER TABLE categories ADD COLUMN is_featured BOOLEAN DEFAULT false;
ALTER TABLE categories ADD COLUMN menu_order INTEGER DEFAULT 0;
ALTER TABLE pages ADD COLUMN is_featured BOOLEAN DEFAULT false;
ALTER TABLE pages ADD COLUMN menu_order INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX idx_categories_featured ON categories(is_featured, menu_order);
CREATE INDEX idx_pages_featured ON pages(is_featured, menu_order);
```

### Monitoring
- API response times
- Cache hit rates
- Error rates
- Database query performance
- User experience metrics

## Troubleshooting

### Common Issues
1. **Empty menu**: Check `is_featured` flags in database
2. **Slow loading**: Verify cache configuration and DB indexes
3. **Stale data**: Clear service cache or check TTL settings
4. **Missing products counts**: Verify category hierarchy and product associations

### Debug Tools
```typescript
// Check cache status
console.log(menuService.getCacheStats());

// Force refresh
menuService.clearCache();

// Monitor API calls
// Check browser network tab for /api/menu-items
```

This architecture provides a solid foundation for a high-performance menu system that scales with your marketplace growth while maintaining excellent user experience. 