<script lang="ts">
  import { onMount } from 'svelte';
  
  export let hasNext: boolean = false;
  export let isLoading: boolean = false;
  export let currentPage: number = 1;
  export let totalPages: number = 1;
  export let threshold: number = 300; // pixels antes do fim para carregar
  export let onLoadMore: () => Promise<void>;
  
  let loaderElement: HTMLDivElement;
  let isPreloading = false;
  let observer: IntersectionObserver;
  
  // Pre-load próxima página quando próximo do final
  async function preloadNextPage() {
    if (isPreloading || isLoading || !hasNext) return;
    
    isPreloading = true;
    
    try {
      console.log(`🚀 Pre-loading página ${currentPage + 1}...`);
      await onLoadMore();
      console.log(`✅ Página ${currentPage} carregada com sucesso`);
    } catch (error) {
      console.error('❌ Erro no pre-loading:', error);
    } finally {
      isPreloading = false;
    }
  }
  
  onMount(() => {
    if (!loaderElement) return;
    
    // Intersection Observer para detectar proximidade do final
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNext && !isLoading && !isPreloading) {
            preloadNextPage();
          }
        });
      },
      {
        rootMargin: `${threshold}px`, // Carregar quando estiver a 300px do elemento
        threshold: 0.1
      }
    );
    
    observer.observe(loaderElement);
    
    return () => {
      if (observer && loaderElement) {
        observer.unobserve(loaderElement);
      }
    };
  });
  
  // Auto-scroll suave para nova página (opcional)
  function scrollToNewContent() {
    if (typeof window !== 'undefined') {
      const newContent = document.querySelector(`[data-page="${currentPage}"]`);
      if (newContent) {
        newContent.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }
  }
</script>

<!-- Loader trigger element -->
<div 
  bind:this={loaderElement}
  class="loader-trigger w-full py-8 flex items-center justify-center"
  role="progressbar"
  aria-label="Carregando mais produtos"
>
  {#if isLoading || isPreloading}
    <!-- Loading spinner -->
    <div class="flex flex-col items-center space-y-4">
      <div class="relative">
        <!-- Spinner animado -->
        <div class="w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
        
        <!-- Pulse effect -->
        <div class="absolute inset-0 w-10 h-10 border-4 border-teal-300 rounded-full animate-ping opacity-30"></div>
      </div>
      
      <div class="text-center">
        <p class="text-sm text-gray-600 font-medium">
          {isPreloading ? 'Carregando próxima página...' : 'Carregando mais produtos...'}
        </p>
        <p class="text-xs text-gray-400 mt-1">
          Página {currentPage} de {totalPages}
        </p>
      </div>
    </div>
    
  {:else if hasNext}
    <!-- Botão manual (fallback) -->
    <button
      on:click={preloadNextPage}
      class="group flex items-center space-x-3 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:border-teal-500 hover:shadow-md transition-all duration-200"
      disabled={isLoading || isPreloading}
    >
      <span class="text-gray-600 group-hover:text-teal-600 font-medium">
        Carregar mais produtos
      </span>
      
      <svg 
        class="w-5 h-5 text-gray-400 group-hover:text-teal-500 transition-colors" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
  {:else}
    <!-- End of results -->
    <div class="text-center py-8">
      <div class="inline-flex items-center space-x-2 text-gray-500">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span class="text-sm font-medium">Todos os produtos foram carregados</span>
      </div>
      <p class="text-xs text-gray-400 mt-1">
        {totalPages} página{totalPages !== 1 ? 's' : ''} • {currentPage} visualizada{currentPage !== 1 ? 's' : ''}
      </p>
    </div>
  {/if}
</div>

<!-- Performance optimization styles -->
<style>
  .loader-trigger {
    /* Optimize for intersection observer */
    content-visibility: auto;
    contain-intrinsic-size: 200px;
  }
  
  /* Spinner performance */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  .animate-ping {
    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  
  /* Smooth transitions */
  button {
    will-change: transform, box-shadow;
  }
  
  button:hover {
    transform: translateY(-1px);
  }
  
  /* Loading states */
  .loading-shimmer {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
</style> 