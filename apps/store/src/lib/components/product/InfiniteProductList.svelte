<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ProductCard from './ProductCard.svelte';
  import LoadingSpinner from '../ui/LoadingSpinner.svelte';

  export let loadMore: () => Promise<any[]>;
  export let hasMore = true;
  export let threshold = 0.8; // 80% da página

  let products: any[] = [];
  let loading = false;
  let observer: IntersectionObserver;
  let sentinel: HTMLDivElement;

  async function handleLoadMore() {
    if (loading || !hasMore) return;
    
    loading = true;
    try {
      const newProducts = await loadMore();
      products = [...products, ...newProducts];
      hasMore = newProducts.length > 0;
    } catch (error) {
      console.error('Erro ao carregar mais produtos:', error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Configurar Intersection Observer
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading) {
          handleLoadMore();
        }
      },
      {
        rootMargin: `${Math.round(window.innerHeight * (1 - threshold))}px`,
        threshold: 0
      }
    );

    if (sentinel) {
      observer.observe(sentinel);
    }

    // Carregar inicial
    handleLoadMore();

    return () => {
      if (observer && sentinel) {
        observer.unobserve(sentinel);
      }
    };
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });
</script>

<div class="infinite-scroll-container">
  <!-- Grid de produtos -->
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {#each products as product (product.id)}
      <ProductCard {product} />
    {/each}
  </div>

  <!-- Sentinel para observar -->
  {#if hasMore}
    <div 
      bind:this={sentinel}
      class="sentinel h-20 flex items-center justify-center"
    >
      {#if loading}
        <LoadingSpinner />
      {/if}
    </div>
  {/if}

  <!-- Mensagem quando não há mais produtos -->
  {#if !hasMore && products.length > 0}
    <div class="text-center py-8 text-gray-500">
      Você chegou ao fim da lista
    </div>
  {/if}
</div>

<style>
  .infinite-scroll-container {
    min-height: 100vh;
  }

  .sentinel {
    /* Invisible mas ocupa espaço */
    opacity: 1;
  }
</style> 