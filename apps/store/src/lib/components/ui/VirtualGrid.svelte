<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  
  export let items: any[] = [];
  export let itemHeight: number = 400; // altura estimada do item
  export let itemWidth: number = 300; // largura estimada do item
  export let gap: number = 20; // espaçamento entre itens
  export let overscan: number = 5; // itens extras para renderizar fora da view
  export let className: string = '';
  export let threshold: number = 500; // distância para carregar mais
  export let onLoadMore: (() => Promise<void>) | undefined = undefined;
  export let hasMore: boolean = false;
  export let isLoading: boolean = false;
  
  let containerElement: HTMLDivElement;
  let scrollTop = 0;
  let containerHeight = 0;
  let containerWidth = 0;
  let mounted = false;
  
  // Calcular dimensões do grid
  $: columnsCount = containerWidth > 0 ? Math.floor((containerWidth + gap) / (itemWidth + gap)) : 1;
  $: rowsCount = Math.ceil(items.length / columnsCount);
  $: totalHeight = rowsCount * (itemHeight + gap) - gap;
  
  // Calcular range visível
  $: visibleRange = calculateVisibleRange(scrollTop, containerHeight, itemHeight, gap, rowsCount, overscan);
  $: visibleItems = getVisibleItems(items, visibleRange, columnsCount);
  
  // Scroll listener otimizado
  let scrollTimeout: any;
  function handleScroll() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    // Update scroll position immediately for smooth scrolling
    scrollTop = containerElement.scrollTop;
    
    // Debounce expensive operations
    scrollTimeout = setTimeout(() => {
      checkLoadMore();
    }, 100);
  }
  
  function calculateVisibleRange(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    gap: number,
    rowsCount: number,
    overscan: number
  ) {
    const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const endRow = Math.min(
      rowsCount - 1,
      Math.ceil((scrollTop + containerHeight) / (itemHeight + gap)) + overscan
    );
    
    return { startRow, endRow };
  }
  
  function getVisibleItems(items: any[], visibleRange: any, columnsCount: number) {
    const { startRow, endRow } = visibleRange;
    const startIndex = startRow * columnsCount;
    const endIndex = Math.min(items.length, (endRow + 1) * columnsCount);
    
    return items.slice(startIndex, endIndex).map((item, i) => {
      const absoluteIndex = startIndex + i;
      const row = Math.floor(absoluteIndex / columnsCount);
      const col = absoluteIndex % columnsCount;
      
      return {
        item,
        index: absoluteIndex,
        row,
        col,
        x: col * (itemWidth + gap),
        y: row * (itemHeight + gap)
      };
    });
  }
  
  function checkLoadMore() {
    if (!onLoadMore || !hasMore || isLoading) return;
    
    const scrollBottom = scrollTop + containerHeight;
    const loadMoreTrigger = totalHeight - threshold;
    
    if (scrollBottom >= loadMoreTrigger) {
      console.log('🚀 Virtual Grid: Carregando mais itens...');
      onLoadMore();
    }
  }
  
  // Observer para redimensionamento
  let resizeObserver: ResizeObserver;
  
  onMount(() => {
    mounted = true;
    
    if (containerElement) {
      // Initial measurements
      const rect = containerElement.getBoundingClientRect();
      containerWidth = rect.width;
      containerHeight = rect.height;
      
      // Setup resize observer
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerWidth = entry.contentRect.width;
          containerHeight = entry.contentRect.height;
        }
      });
      
      resizeObserver.observe(containerElement);
    }
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  });
  
  // Scroll to specific item
  export function scrollToItem(index: number) {
    if (!containerElement) return;
    
    const row = Math.floor(index / columnsCount);
    const targetY = row * (itemHeight + gap);
    
    containerElement.scrollTo({
      top: targetY,
      behavior: 'smooth'
    });
  }
  
  // Get current visible items info
  export function getVisibleInfo() {
    return {
      visibleCount: visibleItems.length,
      totalCount: items.length,
      scrollPercentage: totalHeight > 0 ? (scrollTop / (totalHeight - containerHeight)) * 100 : 0
    };
  }
</script>

<div
  bind:this={containerElement}
  class="virtual-grid-container {className}"
  style="height: 100%; overflow-y: auto; position: relative;"
  on:scroll={handleScroll}
  role="grid"
  aria-label="Grid virtual de produtos"
>
  {#if mounted}
    <!-- Virtual container com altura total -->
    <div
      class="virtual-content"
      style="height: {totalHeight}px; position: relative;"
    >
      <!-- Itens visíveis renderizados -->
      {#each visibleItems as { item, index, x, y } (item.id || index)}
        <div
          class="virtual-item"
          style="
            position: absolute;
            left: {x}px;
            top: {y}px;
            width: {itemWidth}px;
            height: {itemHeight}px;
          "
          data-index={index}
        >
          <!-- Slot para renderizar o item -->
          <slot {item} {index} />
        </div>
      {/each}
      
      <!-- Loading indicator no final -->
      {#if isLoading && visibleItems.length > 0}
        <div
          class="virtual-loading"
          style="
            position: absolute;
            left: 50%;
            top: {totalHeight + 20}px;
            transform: translateX(-50%);
            z-index: 10;
          "
        >
          <div class="flex items-center space-x-2 text-teal-600">
            <div class="w-4 h-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            <span class="text-sm">Carregando mais produtos...</span>
          </div>
        </div>
      {/if}
    </div>
    
  {:else}
    <!-- Loading inicial -->
    <div class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600">Preparando produtos...</p>
      </div>
    </div>
  {/if}
</div>

<!-- Debug info (apenas em desenvolvimento) -->
{#if mounted && typeof window !== 'undefined' && window.location.hostname === 'localhost'}
  <div class="virtual-debug" style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-size: 12px; z-index: 9999;">
    <div>Itens: {items.length}</div>
    <div>Visíveis: {visibleItems.length}</div>
    <div>Colunas: {columnsCount}</div>
    <div>Linhas: {rowsCount}</div>
    <div>Range: {visibleRange.startRow}-{visibleRange.endRow}</div>
    <div>Scroll: {Math.round(scrollTop)}px</div>
  </div>
{/if}

<style>
  .virtual-grid-container {
    /* Optimize scrolling performance */
    will-change: scroll-position;
    -webkit-overflow-scrolling: touch;
    
    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: #00BFB3 #f1f1f1;
  }
  
  .virtual-grid-container::-webkit-scrollbar {
    width: 8px;
  }
  
  .virtual-grid-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  .virtual-grid-container::-webkit-scrollbar-thumb {
    background: #00BFB3;
    border-radius: 4px;
  }
  
  .virtual-grid-container::-webkit-scrollbar-thumb:hover {
    background: #00A89D;
  }
  
  .virtual-content {
    /* Contain layout for performance */
    contain: layout style paint;
  }
  
  .virtual-item {
    /* Optimize rendering */
    will-change: transform;
    contain: layout style paint;
    
    /* Ensure proper stacking */
    z-index: 1;
  }
  
  .virtual-loading {
    /* Smooth entrance */
    animation: fadeIn 0.3s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  
  .virtual-debug {
    /* Development only - will be removed in production */
    opacity: 0.9;
    pointer-events: none;
    line-height: 1.2;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .virtual-grid-container {
      /* Better mobile scrolling */
      scroll-behavior: smooth;
    }
  }
  
  /* Performance optimizations */
  @supports (content-visibility: auto) {
    .virtual-item {
      content-visibility: auto;
      contain-intrinsic-size: 300px 400px;
    }
  }
</style> 