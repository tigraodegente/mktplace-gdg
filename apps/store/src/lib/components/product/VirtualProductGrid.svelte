<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ProductCard from './ProductCard.svelte';

  interface Product {
    id: string;
    [key: string]: any;
  }

  export let products: Product[] = [];
  export let itemHeight = 400; // altura estimada de cada card
  export let columns = 4;
  export let gap = 16;

  let container: HTMLDivElement;
  let scrollTop = 0;
  let containerHeight = 0;
  let visibleStart = 0;
  let visibleEnd = 0;

  // Calcular dimensões
  $: rowHeight = itemHeight + gap;
  $: totalRows = Math.ceil(products.length / columns);
  $: totalHeight = totalRows * rowHeight;
  $: {
    // Calcular itens visíveis
    const startRow = Math.floor(scrollTop / rowHeight);
    const endRow = Math.ceil((scrollTop + containerHeight) / rowHeight);
    visibleStart = startRow * columns;
    visibleEnd = Math.min(endRow * columns, products.length);
  }
  $: visibleProducts = products.slice(visibleStart, visibleEnd);

  function handleScroll() {
    if (container) {
      scrollTop = container.scrollTop;
    }
  }

  onMount(() => {
    if (container) {
      const observer = new ResizeObserver((entries) => {
        containerHeight = entries[0].contentRect.height;
      });
      observer.observe(container);
      containerHeight = container.clientHeight;

      return () => observer.disconnect();
    }
  });
</script>

<div 
  bind:this={container}
  on:scroll={handleScroll}
  class="virtual-grid-container"
  style="height: 100%; overflow-y: auto;"
>
  <div class="virtual-grid-spacer" style="height: {totalHeight}px; position: relative;">
    <div 
      class="virtual-grid-content"
      style="
        position: absolute;
        top: {Math.floor(visibleStart / columns) * rowHeight}px;
        left: 0;
        right: 0;
        display: grid;
        grid-template-columns: repeat({columns}, 1fr);
        gap: {gap}px;
      "
    >
      {#each visibleProducts as product, i (product.id)}
        <ProductCard {product} />
      {/each}
    </div>
  </div>
</div>

<style>
  .virtual-grid-container {
    will-change: scroll-position;
  }

  .virtual-grid-spacer {
    will-change: transform;
  }

  @media (max-width: 1024px) {
    /* Ajustar colunas para mobile */
  }
</style> 