<script lang="ts">
  import { onMount } from 'svelte';
  import { menuService } from '$lib/services/menuService';
  import type { FeaturedItem, CategoryTree } from '$lib/types/menu';

  // State management
  let featuredItems: FeaturedItem[] = [];
  let megaMenuData: CategoryTree[] = [];
  let isLoading = true;
  let showMegaMenu = false;
  let error: string | null = null;

  // Performance optimization: Prefetch on component mount
  onMount(async () => {
    try {
      // Load featured items first (priority)
      featuredItems = await menuService.getFeaturedItems();
      isLoading = false;
      
      // Prefetch mega menu data in background
      menuService.getCategoryTree().then(data => {
        megaMenuData = data;
      }).catch(err => {
        console.warn('Failed to prefetch mega menu data:', err);
      });
      
    } catch (err) {
      console.error('Menu loading error:', err);
      error = 'Erro ao carregar menu';
      isLoading = false;
    }
  });

  // Lazy load mega menu when needed
  async function handleVerTodasHover() {
    if (megaMenuData.length === 0) {
      try {
        megaMenuData = await menuService.getCategoryTree();
      } catch (err) {
        console.error('Error loading mega menu:', err);
      }
    }
    showMegaMenu = true;
  }

  function handleMouseLeave() {
    showMegaMenu = false;
  }

  // Helper function for pluralization
  function formatProductCount(count: number): string {
    if (count === 0) return '';
    return count === 1 ? `${count} produto` : `${count} produtos`;
  }
</script>

<!-- Desktop Category Menu -->
<nav class="hidden lg:block bg-teal-500 text-white shadow-md relative z-50">
  <div class="max-w-7xl mx-auto px-4">
    <div class="flex items-center space-x-8 py-3">
      
      {#if isLoading}
        <!-- Loading state -->
        <div class="flex space-x-6">
          {#each Array(5) as _}
            <div class="bg-teal-400 rounded animate-pulse h-5 w-20"></div>
          {/each}
        </div>
      
      {:else if error}
        <!-- Error state -->
        <div class="text-teal-100 text-sm">
          {error}
        </div>
      
      {:else}
        <!-- Main menu items -->
        {#each featuredItems as item}
          <a
            href={item.href}
            class="text-white hover:text-teal-100 transition-colors duration-200 text-sm font-medium whitespace-nowrap flex items-center space-x-1"
          >
            <span>{item.name}</span>
            {#if item.product_count && item.product_count > 0}
              <span class="text-xs text-teal-200">({item.product_count})</span>
            {/if}
          </a>
        {/each}
        
        <!-- Ver Todas with mega menu -->
        <div
          class="relative"
          on:mouseenter={handleVerTodasHover}
          on:mouseleave={handleMouseLeave}
        >
          <a
            href="/busca"
            class="text-white hover:text-teal-100 transition-colors duration-200 text-sm font-medium whitespace-nowrap flex items-center space-x-1"
          >
            <span>Ver Todas</span>
            <svg class="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </a>
          
          <!-- Mega Menu -->
          {#if showMegaMenu && megaMenuData.length > 0}
            <div class="absolute top-full left-0 w-screen max-w-4xl bg-white shadow-xl border-t-2 border-teal-500 z-50">
              <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {#each megaMenuData as category}
                    <div class="space-y-3">
                      <!-- Main category -->
                      <a
                        href="/busca?categoria={category.slug}"
                        class="block text-teal-600 font-semibold hover:text-teal-700 text-sm border-b border-gray-200 pb-2"
                      >
                        <div class="flex items-center justify-between">
                          <span>{category.name}</span>
                          {#if category.product_count > 0}
                            <span class="text-xs text-gray-500">
                              {formatProductCount(category.product_count)}
                            </span>
                          {/if}
                        </div>
                      </a>
                      
                      <!-- Subcategories -->
                      {#if category.children && category.children.length > 0}
                        <div class="space-y-1">
                          {#each category.children.slice(0, 6) as subcategory}
                            <a
                              href="/busca?categoria={subcategory.slug}"
                              class="block text-gray-600 hover:text-teal-600 text-xs pl-2 py-1 hover:bg-gray-50 rounded transition-colors"
                            >
                              <div class="flex items-center justify-between">
                                <span>{subcategory.name}</span>
                                {#if subcategory.product_count > 0}
                                  <span class="text-xs text-gray-400">
                                    ({subcategory.product_count})
                                  </span>
                                {/if}
                              </div>
                            </a>
                          {/each}
                          
                          <!-- Show "ver mais" if has more subcategories -->
                          {#if category.hasMore}
                            <a
                              href="/busca?categoria={category.slug}"
                              class="block text-teal-500 hover:text-teal-600 text-xs pl-2 py-1 font-medium"
                            >
                              ver mais...
                            </a>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
                
                <!-- Footer -->
                <div class="mt-6 pt-4 border-t border-gray-200 text-center">
                  <a
                    href="/busca"
                    class="text-teal-600 hover:text-teal-700 font-medium text-sm"
                  >
                    Ver todas as categorias →
                  </a>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</nav>

<style>
  /* Optimize hover performance */
  nav a {
    will-change: color;
  }
  
  /* Ensure mega menu appears above other content */
  .absolute {
    z-index: 9999;
  }
</style> 