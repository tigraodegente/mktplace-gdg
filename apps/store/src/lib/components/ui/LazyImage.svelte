<script lang="ts">
  import { onMount } from 'svelte';
  
  export let src: string;
  export let alt: string;
  export let placeholder: string = '';
  export let className: string = '';
  export let width: number | undefined = undefined;
  export let height: number | undefined = undefined;
  export let loading: 'lazy' | 'eager' = 'lazy';
  export let quality: 'low' | 'medium' | 'high' = 'medium';
  
  let imageElement: HTMLDivElement;
  let isLoaded = false;
  let hasError = false;
  let isIntersecting = false;
  
  // Generate WebP and fallback URLs
  $: webpSrc = convertToWebP(src);
  $: fallbackSrc = src;
  $: lowQualitySrc = generateLowQuality(src);
  
  function convertToWebP(originalSrc: string): string {
    if (!originalSrc || originalSrc.includes('placeholder')) return originalSrc;
    
    // Se já for WebP, retornar como está
    if (originalSrc.includes('.webp')) return originalSrc;
    
    // Converter para WebP se for da nossa CDN
    if (originalSrc.includes('gdg-images.s3') || originalSrc.includes('amazonaws.com')) {
      return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return originalSrc;
  }
  
  function generateLowQuality(originalSrc: string): string {
    if (!originalSrc || originalSrc.includes('placeholder')) return '';
    
    // Para imagens da nossa CDN, podemos adicionar parâmetros de qualidade
    if (originalSrc.includes('gdg-images.s3')) {
      return originalSrc.replace(/\.(jpg|jpeg|png|webp)$/i, '_thumb.webp');
    }
    
    return '';
  }
  
  function handleLoad() {
    isLoaded = true;
  }
  
  function handleError() {
    hasError = true;
  }
  
  onMount(() => {
    if (loading === 'eager') {
      isIntersecting = true;
      return;
    }
    
    // Intersection Observer para lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isIntersecting = true;
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Carregar 50px antes de aparecer
        threshold: 0.1
      }
    );
    
    if (imageElement) {
      observer.observe(imageElement);
    }
    
    return () => {
      if (imageElement) {
        observer.unobserve(imageElement);
      }
    };
  });
</script>

<div 
  class="lazy-image-container relative overflow-hidden {className}"
  style={width && height ? `aspect-ratio: ${width}/${height}` : ''}
  bind:this={imageElement}
>
  <!-- Placeholder blur effect -->
  {#if !isLoaded && lowQualitySrc}
    <img
      src={lowQualitySrc}
      {alt}
      class="absolute inset-0 w-full h-full object-cover filter blur-sm scale-105 transition-opacity duration-300"
      style="z-index: 1;"
      loading="eager"
    />
  {:else if !isLoaded && placeholder}
    <div 
      class="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center"
      style="z-index: 1;"
    >
      <div class="text-gray-400 text-sm">Carregando...</div>
    </div>
  {/if}
  
  <!-- Main image -->
  {#if isIntersecting}
    <picture class="absolute inset-0 w-full h-full">
      <!-- WebP for modern browsers -->
      <source srcset={webpSrc} type="image/webp" />
      
      <!-- Fallback for older browsers -->
      <img
        src={fallbackSrc}
        {alt}
        {width}
        {height}
        class="w-full h-full object-cover transition-opacity duration-300 {isLoaded ? 'opacity-100' : 'opacity-0'}"
        style="z-index: 2;"
        on:load={handleLoad}
        on:error={handleError}
        loading={loading}
        decoding="async"
      />
    </picture>
  {/if}
  
  <!-- Error state -->
  {#if hasError}
    <div class="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
      <div class="text-gray-400 text-center">
        <svg class="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <span class="text-xs">Imagem indisponível</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .lazy-image-container {
    background-color: #f3f4f6;
  }
  
  /* Optimize for performance */
  img {
    will-change: opacity;
  }
  
  /* Smooth loading animation */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .lazy-image-container img {
    animation: fadeIn 0.3s ease-in-out;
  }
</style> 