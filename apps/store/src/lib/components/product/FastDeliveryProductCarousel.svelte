<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import ProductCard from './ProductCard.svelte';
  
  // Types
  interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    original_price?: number;
    discount?: number;
    image: string;
    images: string[];
    has_fast_delivery: boolean;
    delivery_days?: number;
    category_name?: string;
    rating?: number;
    reviews_count?: number;
  }

  interface Props {
    title?: string;
    class?: string;
    autoPlay?: boolean;
    autoPlayInterval?: number;
  }

  let {
    title = "Produtos que chegam <strong>rapidinho</strong> ⚡",
    class: className = '',
    autoPlay = true,
    autoPlayInterval = 5000
  }: Props = $props();

  // State
  let products = $state<Product[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let currentSlide = $state(0);
  let autoPlayTimer: NodeJS.Timeout | null = null;
  let carouselContainer: HTMLElement;

    // Computed
  let visibleProducts = $state<Product[]>([]);
  let maxSlides = $state(0);
  let canGoPrev = $state(false);
  let canGoNext = $state(false);

  // Update computed values
  function updateDerivedValues() {
    if (typeof window === 'undefined') {
      visibleProducts = products.slice(0, 4);
      maxSlides = Math.max(0, products.length - 4);
    } else {
      const width = window.innerWidth;
      if (width < 640) {
        visibleProducts = products.slice(currentSlide, currentSlide + 2);
        maxSlides = Math.max(0, products.length - 2);
      } else if (width < 1024) {
        visibleProducts = products.slice(currentSlide, currentSlide + 3);
        maxSlides = Math.max(0, products.length - 3);
      } else {
        visibleProducts = products.slice(currentSlide, currentSlide + 4);
        maxSlides = Math.max(0, products.length - 4);
      }
    }
    
    canGoPrev = currentSlide > 0;
    canGoNext = currentSlide < maxSlides;
  }

  // Functions
  async function loadFastDeliveryProducts() {
    try {
      isLoading = true;
      error = null;

      const response = await fetch('/api/products?tags=entrega-rapida&limit=12&sort=popular');
      const result = await response.json();

            if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar produtos');
      }

      // API retorna produtos em result.data.products
      const productsData = result.data.products || result.data || [];
      products = productsData.filter((p: Product) => p.has_fast_delivery);
       updateDerivedValues();
       
     } catch (err) {
       error = err instanceof Error ? err.message : 'Erro desconhecido';
       console.error('Erro ao carregar produtos entrega rápida:', err);
       
       // Fallback products
       products = [];
       updateDerivedValues();
     } finally {
       isLoading = false;
     }
  }

  function nextSlide() {
    if (canGoNext) {
      currentSlide = currentSlide + 1;
      updateDerivedValues();
      restartAutoPlay();
    }
  }

  function prevSlide() {
    if (canGoPrev) {
      currentSlide = currentSlide - 1;
      updateDerivedValues();
      restartAutoPlay();
    }
  }

  function goToSlide(index: number) {
    if (index >= 0 && index <= maxSlides) {
      currentSlide = index;
      updateDerivedValues();
      restartAutoPlay();
    }
  }

  function startAutoPlay() {
    if (!autoPlay || products.length <= 4) return;
    
    autoPlayTimer = setInterval(() => {
      if (currentSlide < maxSlides) {
        currentSlide = currentSlide + 1;
      } else {
        currentSlide = 0; // Loop de volta ao início
      }
      updateDerivedValues();
    }, autoPlayInterval);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function restartAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  function handleMouseEnter() {
    stopAutoPlay();
  }

  function handleMouseLeave() {
    startAutoPlay();
  }

  // Lifecycle
  onMount(async () => {
    await loadFastDeliveryProducts();
    startAutoPlay();
  });

  onDestroy(() => {
    stopAutoPlay();
  });
</script>

<section 
  class="fast-delivery-carousel {className}"
  aria-label="Produtos com entrega rápida"
>
  <!-- Header com título -->
  <div class="carousel-header">
    <div class="title-container">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="32" 
        height="32" 
        viewBox="0 0 32 47" 
        fill="none"
        aria-hidden="true"
      >
        <path d="M31.5079 17.0785C31.2886 16.6793 30.8771 16.4263 30.4245 16.4125L19.3776 16.0772L24.359 2.40077C24.5005 2.0107 24.4473 1.5753 24.2164 1.23112C23.9856 0.886519 23.6047 0.674742 23.1924 0.661796L10.3679 0.272506C9.80149 0.255746 9.29175 0.615129 9.11267 1.15703L0.645292 26.7858L0.645279 26.7862C0.516803 27.1736 0.577563 27.6002 0.809528 27.9356C1.04193 28.2707 1.41791 28.4759 1.82329 28.4877L13.366 28.8381L12.8641 45.6481C12.846 46.2395 13.2278 46.7677 13.7916 46.9309C14.3553 47.0941 14.957 46.851 15.2529 46.3404L31.4927 18.3582C31.7228 17.9648 31.7287 17.4774 31.5081 17.0781L31.5079 17.0785Z" fill="#FF8403"/>
      </svg>
      <h2 class="carousel-title">{@html title}</h2>
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando produtos...</p>
    </div>

  <!-- Error State -->
  {:else if error}
    <div class="error-container">
      <p>Erro ao carregar produtos: {error}</p>
      <button onclick={loadFastDeliveryProducts} class="retry-button">
        Tentar novamente
      </button>
    </div>

  <!-- Empty State -->
  {:else if products.length === 0}
    <div class="empty-container">
      <p>Nenhum produto com entrega rápida disponível no momento.</p>
    </div>

  <!-- Products Carousel -->
  {:else}
    <div 
      class="carousel-container"
      bind:this={carouselContainer}
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
      role="region"
      aria-label="Carrossel de produtos com entrega rápida"
    >
      <div class="products-grid">
        {#each visibleProducts as product (product.id)}
          <div class="product-wrapper">
            <ProductCard {product} />
            <!-- Badge de entrega rápida -->
            <div class="fast-delivery-badge">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8.50446 5.40097C8.44526 5.29319 8.33418 5.2249 8.21202 5.22119L5.23016 5.13067L6.57478 1.43905C6.61296 1.33376 6.5986 1.21623 6.53629 1.12333C6.47399 1.03031 6.37116 0.973146 6.25989 0.969652L2.79821 0.864572C2.64532 0.860048 2.50773 0.957055 2.45939 1.10333L0.173823 8.0212L0.173819 8.02132C0.139141 8.1259 0.155541 8.24103 0.218155 8.33159C0.280886 8.42204 0.382373 8.47741 0.491797 8.48062L3.60749 8.57519L3.472 13.1127C3.46712 13.2723 3.57018 13.4149 3.72235 13.4589C3.87453 13.503 4.03693 13.4373 4.11681 13.2995L8.50035 5.74639C8.56246 5.64019 8.56407 5.50864 8.50452 5.40085L8.50446 5.40097Z" fill="#FF8403"/>
              </svg>
              {#if product.delivery_days === 1}
                Entrega hoje
              {:else if product.delivery_days === 2}
                Entrega em 2 dias
              {:else}
                Chega rapidinho
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Navigation Arrows -->
      {#if products.length > 4}
        <button 
          class="carousel-arrow carousel-arrow--prev"
          onclick={prevSlide}
          disabled={!canGoPrev}
          aria-label="Produtos anteriores"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="var(--color-primary)"/>
            <path d="M13.4747 15.1582L10.5274 12.0003L13.4747 8.8424" stroke="white" stroke-width="1.2"/>
          </svg>
        </button>
        
        <button 
          class="carousel-arrow carousel-arrow--next"
          onclick={nextSlide}
          disabled={!canGoNext}
          aria-label="Próximos produtos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="var(--color-primary)"/>
            <path d="M10.5253 8.8418L13.4726 11.9997L10.5253 15.1576" stroke="white" stroke-width="1.2"/>
          </svg>
        </button>
      {/if}

      <!-- Indicators -->
      {#if maxSlides > 0}
        <div class="carousel-indicators">
          {#each Array(maxSlides + 1) as _, index}
            <button
              class="indicator"
              class:indicator--active={index === currentSlide}
              onclick={() => goToSlide(index)}
              aria-label="Ir para grupo {index + 1}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .fast-delivery-carousel {
    --color-primary: #00BFB3;
    --color-accent: #FF8403;
    --spacing-xs: 8px;
    --spacing-sm: 16px;
    --spacing-md: 24px;
    --spacing-lg: 32px;
    --spacing-xl: 48px;
    
    margin: var(--spacing-xl) 0;
    padding: 0 var(--spacing-sm);
  }

  .carousel-header {
    text-align: center;
    margin-bottom: var(--spacing-lg);
  }

  .title-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .carousel-title {
    font-family: 'Lato', sans-serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #333;
    margin: 0;
  }

  .loading-container,
  .error-container,
  .empty-container {
    text-align: center;
    padding: var(--spacing-xl);
    color: #666;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-sm);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .retry-button {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .retry-button:hover {
    background: #00A89D;
  }

  .carousel-container {
    position: relative;
    max-width: 1200px;
    margin: 0 auto;
  }

  .products-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
  }

  .product-wrapper {
    position: relative;
  }

  .fast-delivery-badge {
    position: absolute;
    top: var(--spacing-xs);
    right: var(--spacing-xs);
    background: var(--color-accent);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .carousel-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    cursor: pointer;
    z-index: 20;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .carousel-arrow:hover {
    opacity: 1;
  }

  .carousel-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .carousel-arrow--prev {
    left: -20px;
  }

  .carousel-arrow--next {
    right: -20px;
  }

  .carousel-indicators {
    display: flex;
    justify-content: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-md);
  }

  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: #ddd;
    cursor: pointer;
    transition: background 0.2s;
  }

  .indicator--active {
    background: var(--color-primary);
  }

  /* Responsive */
  @media (min-width: 640px) {
    .products-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .fast-delivery-carousel {
      padding: 0 var(--spacing-md);
    }
  }

  @media (min-width: 1024px) {
    .products-grid {
      grid-template-columns: repeat(4, 1fr);
    }
    
    .fast-delivery-carousel {
      padding: 0 var(--spacing-lg);
    }
  }

  @media (max-width: 639px) {
    .carousel-title {
      font-size: 1.5rem;
    }
    
    .carousel-arrow {
      display: none;
    }
  }
</style> 