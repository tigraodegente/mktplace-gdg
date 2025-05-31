<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    class?: string;
    lazy?: boolean;
  }
  
  let { 
    src, 
    alt, 
    width, 
    height, 
    priority = false, 
    class: className = '',
    lazy = true
  }: Props = $props();
  
  let supportsWebP = $state(false);
  let supportsAVIF = $state(false);
  let imageLoaded = $state(false);
  let imgElement: HTMLImageElement;
  
  onMount(() => {
    // Detectar WebP
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      supportsWebP = (webp.height === 2);
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    
    // Detectar AVIF
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      supportsAVIF = (avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
  
  function getOptimizedSrc(format: 'webp' | 'avif' | 'original' = 'original'): string {
    const baseUrl = src.replace(/\.(jpg|jpeg|png)$/i, '');
    
    if (format === 'avif' && supportsAVIF) {
      return `${baseUrl}.avif`;
    } else if (format === 'webp' && supportsWebP) {
      return `${baseUrl}.webp`;
    }
    
    return src;
  }
  
  function handleLoad() {
    imageLoaded = true;
  }
</script>

<picture class="block {className}">
  {#if supportsAVIF}
    <source srcset={getOptimizedSrc('avif')} type="image/avif">
  {/if}
  {#if supportsWebP}
    <source srcset={getOptimizedSrc('webp')} type="image/webp">
  {/if}
  <img 
    bind:this={imgElement}
    src={getOptimizedSrc('original')}
    {alt}
    {width}
    {height}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    onload={handleLoad}
    class="transition-opacity duration-300 {imageLoaded ? 'opacity-100' : 'opacity-0'}"
    style="aspect-ratio: {width && height ? `${width}/${height}` : 'auto'}"
  />
</picture>
