<script lang="ts">
  // Componente para texto que só é visível para screen readers
  interface Props {
    tag?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    live?: 'off' | 'polite' | 'assertive';
    atomic?: boolean;
  }
  
  let { 
    tag = 'span',
    live = 'off',
    atomic = false
  }: Props = $props();
</script>

<svelte:element 
  this={tag} 
  class="sr-only"
  aria-live={live}
  aria-atomic={atomic}
>
  <slot />
</svelte:element>

<style>
  :global(.sr-only) {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }
  
  /* Skip links - mostrar quando focados */
  :global(.skip-links) {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9999;
  }
  
  :global(.skip-link) {
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000;
    color: #fff;
    padding: 8px 12px;
    text-decoration: none;
    border-radius: 4px;
    font-weight: 600;
    transition: top 0.2s ease;
  }
  
  :global(.skip-link:focus) {
    top: 6px;
    outline: 2px solid #00BFB3;
    outline-offset: 2px;
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    :global(.skip-link) {
      background: #000;
      color: #fff;
      border: 2px solid #fff;
    }
    
    :global(.skip-link:focus) {
      background: #fff;
      color: #000;
      border: 2px solid #000;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    :global(.skip-link) {
      transition: none;
    }
  }
</style> 