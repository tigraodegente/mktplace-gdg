<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { smartBannerService, type SmartBannerState } from '$lib/services/smartBannerService';
  import OfferCountdown from './OfferCountdown.svelte';

  // Props
  interface Props {
    class?: string;
  }
  
  let { class: className = '' }: Props = $props();

  // State
  let bannerState = $state<SmartBannerState>({
    currentBanner: null,
    nextBanner: null,
    timeUntilNext: 0,
    countdownTimeLeft: 0,
    isRotating: false,
    activeBanners: [],
    currentIndex: 0,
    totalActiveBanners: 0
  });

  let isLoaded = $state(false);
  let error = $state<string | null>(null);
  let unsubscribe: (() => void) | null = null;

  // Lifecycle
  onMount(async () => {
    try {
      await smartBannerService.loadBanners();
      
      unsubscribe = smartBannerService.subscribe((newState) => {
        console.log('🔔 SmartHomeBanner: estado atualizado:', {
          currentBannerTitle: newState.currentBanner?.title || 'null',
          totalActiveBanners: newState.totalActiveBanners,
          currentIndex: newState.currentIndex,
          hasCurrentBanner: !!newState.currentBanner
        });
        bannerState = newState;
      });

      bannerState = smartBannerService.getCurrentState();
      console.log('🎬 SmartHomeBanner: estado inicial:', {
        currentBannerTitle: bannerState.currentBanner?.title || 'null',
        totalActiveBanners: bannerState.totalActiveBanners,
        shouldShowBanner: bannerState.currentBanner && (!bannerState.currentBanner.countdownEndTime || 
           new Date(bannerState.currentBanner.countdownEndTime).getTime() > Date.now())
      });
      isLoaded = true;
      
    } catch (err) {
      console.error('❌ SmartHomeBanner: erro ao carregar:', err);
      error = 'Erro ao carregar banners';
      isLoaded = true;
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  // Handlers
  async function handleBannerClick(bannerId: string) {
    try {
      await smartBannerService.trackClick(bannerId);
    } catch (err) {
      // Silent fail
    }
  }

  function handleManualRotation(index: number) {
    smartBannerService.goToBanner(index);
  }

  function handlePreviousBanner() {
    if (bannerState.totalActiveBanners <= 1) return;
    const newIndex = bannerState.currentIndex === 0 ? bannerState.totalActiveBanners - 1 : bannerState.currentIndex - 1;
    smartBannerService.goToBanner(newIndex);
  }

  function handleNextBanner() {
    if (bannerState.totalActiveBanners <= 1) return;
    const newIndex = (bannerState.currentIndex + 1) % bannerState.totalActiveBanners;
    smartBannerService.goToBanner(newIndex);
  }

  function handleGoToBanner(index: number) {
    smartBannerService.goToBanner(index);
  }

  // Pausar/resumir rotação automática
  function handleMouseEnter() {
    smartBannerService.pause();
  }

  function handleMouseLeave() {
    smartBannerService.resume();
  }

  // Computed
  let hasValidCountdown = $derived(
    bannerState.currentBanner?.hasActiveCountdown && 
    bannerState.currentBanner?.countdownEndTime &&
    bannerState.countdownTimeLeft > 0
  );

  let countdownEndTime = $derived(
    hasValidCountdown && bannerState.currentBanner?.countdownEndTime 
      ? new Date(bannerState.currentBanner.countdownEndTime)
      : null
  );

  let countdownText = $derived(
    bannerState.currentBanner?.countdownText || '⚡ Oferta termina em:'
  );

  // Verificar se deve mostrar o banner - SEMPRE mostra se existe banner
  let shouldShowBanner = $derived(!!bannerState.currentBanner);
</script>

{#if !isLoaded}
  <!-- Loading State -->
  <div class="banner-loading">
    <div class="loading-skeleton">
      <div class="skeleton-banner"></div>
    </div>
  </div>

{:else if error}
  <!-- Error State -->
  <div class="banner-error">
    <p>Erro ao carregar banners</p>
  </div>

{:else if bannerState.currentBanner && shouldShowBanner}
  
  <!-- Countdown dinâmico (quando tem countdown ativo) -->
  {#if hasValidCountdown && countdownEndTime}
    <OfferCountdown 
      endTime={countdownEndTime}
      text={countdownText}
      class="countdown-connected"
    />
  {/if}

  <!-- Banner Section - Estrutura IDÊNTICA ao HomeBanner -->
  <section 
    class="banner-section {className}"
    aria-label="Banners promocionais inteligentes"
    aria-live="polite"
  >
    <div class="banner-wrapper">
      <div 
        class="banner-container" 
        class:banner-container--with-countdown={hasValidCountdown}
        role="banner"
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
      >
        <div class="banner-slides">
          {#each bannerState.activeBanners as banner, index}
            <div 
              class="banner-slide" 
              class:banner-slide--active={index === bannerState.currentIndex}
              style="opacity: {index === bannerState.currentIndex ? 1 : 0}; z-index: {index === bannerState.currentIndex ? 10 : 1}"
            >
              {#if banner.link}
                <a href={banner.link} class="banner-image-link" onclick={() => handleBannerClick(banner.id)}>
                  <img
                    src={banner.image}
                    alt={banner.title}
                    class="banner-image"
                    loading={index === bannerState.currentIndex ? "eager" : "lazy"}
                    draggable="false"
                  />
                </a>
              {:else}
                <img
                  src={banner.image}
                  alt={banner.title}
                  class="banner-image"
                  loading={index === bannerState.currentIndex ? "eager" : "lazy"}
                  draggable="false"
                />
              {/if}

              <!-- Overlay com informações do banner -->
              <div class="banner-overlay">
                <div class="banner-info">
                  <h2 class="banner-title">{banner.title}</h2>
                  {#if banner.subtitle}
                    <p class="banner-subtitle">{banner.subtitle}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Setas de navegação (se há múltiplos banners) -->
      {#if bannerState.totalActiveBanners > 1}
        <button 
          onclick={() => handlePreviousBanner()}
          class="banner-arrow banner-arrow--left"
          aria-label="Banner anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="var(--color-primary)"/>
            <path d="M26.9494 30.3164L21.0547 24.0006L26.9494 17.6848" stroke="white" stroke-width="1.44457"/>
          </svg>
        </button>
        
        <button 
          onclick={() => handleNextBanner()}
          class="banner-arrow banner-arrow--right"
          aria-label="Próximo banner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="var(--color-primary)"/>
            <path d="M21.0506 17.6836L26.9453 23.9994L21.0506 30.3152" stroke="white" stroke-width="1.44457"/>
          </svg>
        </button>
      {/if}
      
      <!-- Indicadores (se há múltiplos banners) -->
      {#if bannerState.totalActiveBanners > 1}
        <div class="banner-indicators">
          {#each Array(bannerState.totalActiveBanners) as _, index}
            <button
              onclick={() => handleGoToBanner(index)}
              class="banner-indicator"
              class:banner-indicator--active={index === bannerState.currentIndex}
              aria-label="Banner {index + 1}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>
  </section>

{:else}
  <!-- No banners available -->
  <div class="no-banners">
    <p>Nenhum banner disponível no momento.</p>
  </div>
{/if}

<style>
  /* =============================================================================
     CSS CUSTOM PROPERTIES - IDÊNTICO AO HOMEBANNER
     ============================================================================= */
  
  .banner-section {
    /* Colors */
    --color-primary: #00BFB3;
    --color-background: #f0f0f0;
    --color-placeholder: #666;
    --color-indicator: #000;
    --color-loading-bg: white;
    --color-loading-border: #f3f3f3;
    
    /* Spacing */
    --spacing-xs: 8px;
    --spacing-sm: 16px;
    --spacing-md: 20px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-2xl: 48px;
    
    /* Sizes */
    --arrow-size: 48px;
    --spinner-size: 32px;
    --border-width: 3px;
    
    /* Borders */
    --border-radius-sm: 16px;
    --border-radius-md: 24px;
    --border-radius-lg: 32px;
    --border-radius-full: 48px;
    
    /* Transitions */
    --transition-fast: 300ms ease;
    --transition-slide: 700ms cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Container dimensions - ALINHADO COM HEADER */
    --container-max-width: 1440px;
    --banner-max-width: calc(1440px - 64px); /* 1440px - 64px (32px padding cada lado) */
    --banner-height-desktop: 640px;
    --banner-padding-top: 48px;
  }
  
  /* =============================================================================
     BASE STYLES - IDÊNTICO AO HOMEBANNER
     ============================================================================= */
  
  .banner-section {
    position: relative;
    width: 100%;
    overflow: hidden;
  }
  
  .banner-wrapper {
    position: relative;
    margin: 0 auto;
    width: 100%;
    max-width: var(--container-max-width);
    padding: 0;
  }
  
  .banner-container {
    position: relative;
    width: 100%;
    margin: 0 auto;
    aspect-ratio: 1 / 1;
    border-radius: 0;
    min-height: 300px;
    overflow: hidden;
  }
  
  .banner-container--with-countdown {
    /* Mobile e iPad Mini: conecta diretamente com o countdown full width */
  }
  
  /* =============================================================================
     RESPONSIVE BREAKPOINTS - IDÊNTICO AO HOMEBANNER
     ============================================================================= */
  
  /* iPad Mini e tablets pequenos: até 899px - FULL WIDTH como mobile */
  @media (max-width: 899px) {
    .banner-wrapper {
      padding: 0;
    }
    
    .banner-container {
      border-radius: 0;
    }
  }
  
  /* Tablet médio: 900px - 1023px */
  @media (min-width: 900px) and (max-width: 1023px) {
    .banner-wrapper {
      padding: 0 2.5vw;
    }
    
    .banner-container {
      aspect-ratio: 3 / 2;
      border-radius: var(--border-radius-md);
      min-height: 450px;
    }
    
    .banner-container--with-countdown {
      border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
      margin-top: 0; /* Conecta diretamente com o countdown - sem espaço */
    }
  }
  
  /* Desktop: 1024px+ - ALINHADO COM HEADER */
  @media (min-width: 1024px) {
    .banner-wrapper {
      padding: 0 var(--spacing-xl); /* 32px - igual ao header px-8 */
    }
    
    .banner-container {
      max-width: var(--banner-max-width);
      height: var(--banner-height-desktop);
      aspect-ratio: unset;
      border-radius: var(--border-radius-lg);
      margin-top: 0;
      padding-top: var(--banner-padding-top);
      min-height: var(--banner-height-desktop);
    }
    
    .banner-container--with-countdown {
      border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
      margin-top: 0; /* Sem margin para conectar com countdown */
      padding-top: 0; /* Sem padding top quando tem countdown */
      height: calc(var(--banner-height-desktop) - var(--banner-padding-top)); /* Altura ajustada */
    }
  }
  
  /* Ajustes específicos para diferentes tamanhos de tela */
  /* Tablet pequeno: 768px - 899px - mantém aspect ratio 4:3 mas full width */
  @media (min-width: 768px) and (max-width: 899px) {
    .banner-container {
      aspect-ratio: 4 / 3;
      min-height: 400px;
    }
  }
  
  /* =============================================================================
     SLIDES - IDÊNTICO AO HOMEBANNER COM ANIMAÇÃO
     ============================================================================= */
  
  .banner-slides {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex; /* Permite slides lado a lado */
  }
  
  .banner-slide {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transition: opacity 0.8s ease-in-out;
    will-change: opacity;
    overflow: hidden;
    opacity: 0;
  }
  
  .banner-slide--active {
    opacity: 1;
    z-index: 10;
  }
  
  /* Animação de entrada e saída */
  @keyframes slideInFromRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  
  @keyframes slideOutToLeft {
    from { transform: translateX(0); }
    to { transform: translateX(-100%); }
  }
  
  .banner-image-link {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .banner-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    background-color: var(--color-background);
    display: block;
    min-height: 300px;
  }
  
  /* Responsive image heights */
  @media (min-width: 768px) and (max-width: 899px) {
    .banner-image {
      min-height: 400px;
    }
  }
  
  @media (min-width: 900px) and (max-width: 1023px) {
    .banner-image {
      min-height: 450px;
    }
  }
  
  @media (min-width: 1024px) {
    .banner-image {
      min-height: calc(var(--banner-height-desktop) - var(--banner-padding-top));
    }
    
    /* Quando tem countdown, a imagem ocupa toda a altura disponível */
    .banner-container--with-countdown .banner-image {
      min-height: calc(var(--banner-height-desktop) - var(--banner-padding-top));
      height: 100%;
    }
  }

  /* Banner Overlay */
  .banner-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    color: white;
    padding: 32px;
  }

  .banner-info {
    max-width: 600px;
  }

  .banner-title {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 8px;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  .banner-subtitle {
    font-size: 1.25rem;
    opacity: 0.9;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  /* =============================================================================
     NAVIGATION ARROWS - IDÊNTICO AO HOMEBANNER
     ============================================================================= */
  
  .banner-arrow {
    position: absolute;
    background: transparent;
    border: none;
    cursor: pointer;
    width: var(--arrow-size);
    height: var(--arrow-size);
    display: none; /* Hidden on mobile by default for full width */
    align-items: center;
    justify-content: center;
    outline: none;
    padding: 0;
    z-index: 50;
    top: 50%;
    transform: translateY(-50%);
    transition: opacity var(--transition-fast);
  }
  
  .banner-arrow:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  
  .banner-arrow--left {
    left: var(--spacing-sm);
  }
  
  .banner-arrow--right {
    right: var(--spacing-sm);
  }
  
  /* Responsive arrow positioning */
  /* Mobile e iPad Mini até 899px: setas escondidas para layout full width limpo */
  @media (max-width: 899px) {
    .banner-arrow {
      display: none;
    }
  }
  
  /* Tablet médio: 900px - 1023px */
  @media (min-width: 900px) and (max-width: 1023px) {
    .banner-arrow {
      display: flex;
    }
    
    .banner-arrow--left {
      left: max(var(--spacing-lg), calc(50vw - 45vw));
    }
    
    .banner-arrow--right {
      right: max(var(--spacing-lg), calc(50vw - 45vw));
    }
  }
  
  @media (min-width: 1024px) {
    .banner-arrow {
      display: flex;
      top: 50%; /* Centraliza na altura total do banner */
      transform: translateY(-50%);
    }
    
    .banner-arrow--left {
      left: max(40px, calc(50% - 600px - 80px));
    }
    
    .banner-arrow--right {
      right: max(40px, calc(50% - 600px - 80px));
    }
  }
  
  @media (min-width: 1440px) {
    .banner-arrow--left {
      left: calc(50% - 700px);
    }
    
    .banner-arrow--right {
      right: calc(50% - 700px);
    }
  }
  
  /* =============================================================================
     INDICATORS - IDÊNTICO AO HOMEBANNER
     ============================================================================= */
  
  .banner-indicators {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-sm);
    padding: 0; /* Remove padding para layout full width */
  }
  
  /* Mobile até 767px: padding 0 para full width */
  @media (max-width: 767px) {
    .banner-indicators {
      padding: 0;
      margin-top: var(--spacing-sm);
    }
  }
  
  /* iPad Mini e tablets pequenos: 768px - 899px */
  @media (min-width: 768px) and (max-width: 899px) {
    .banner-indicators {
      gap: 9px;
      margin-top: 18px;
      padding: 0; /* Full width também */
    }
  }
  
  @media (min-width: 900px) and (max-width: 1023px) {
    .banner-indicators {
      gap: 11px;
      margin-top: 22px;
      padding: 0 2.5vw;
    }
  }
  
  @media (min-width: 1024px) {
    .banner-indicators {
      gap: 12px;
      margin-top: var(--spacing-lg);
      padding: 0;
    }
  }
  
  .banner-indicator {
    width: 50px;
    height: 3px;
    flex-shrink: 0;
    border-radius: var(--border-radius-full);
    background: var(--color-indicator);
    opacity: 0.2;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    outline: none;
    position: relative;
    padding: 0;
  }
  
  @media (min-width: 768px) and (max-width: 899px) {
    .banner-indicator {
      width: 55px;
    }
  }
  
  @media (min-width: 900px) and (max-width: 1023px) {
    .banner-indicator {
      width: 62px;
    }
  }
  
  @media (min-width: 1024px) {
    .banner-indicator {
      width: 66.502px;
      height: 3.011px;
    }
  }
  
  .banner-indicator--active {
    background: var(--color-primary);
    opacity: 1;
  }
  
  .banner-indicator:hover:not(.banner-indicator--active) {
    opacity: 0.4;
  }
  
  .banner-indicator:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* =============================================================================
     LOADING & ERROR STATES
     ============================================================================= */

  .banner-loading, .banner-error, .no-banners {
    width: 100%;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
    color: #666;
  }

  @media (min-width: 1024px) {
    .banner-loading, .banner-error, .no-banners {
      height: 640px;
      border-radius: 32px;
      margin: 48px 32px 0;
      max-width: calc(1440px - 64px);
    }
  }

  .loading-skeleton {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* Responsive adjustments for banner title */
  @media (max-width: 768px) {
    .banner-title {
      font-size: 1.5rem;
    }

    .banner-subtitle {
      font-size: 1rem;
    }

    .banner-overlay {
      padding: 20px;
    }
  }

  @media (min-width: 1024px) {
    .banner-title {
      font-size: 3rem;
    }

    .banner-subtitle {
      font-size: 1.5rem;
    }
  }
</style> 