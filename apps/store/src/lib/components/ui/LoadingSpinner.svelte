<script lang="ts">
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let color: string = '#00BFB3';
  
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };
</script>

<div 
  class="inline-block border-2 border-transparent border-t-current rounded-full animate-spin {sizeClasses[size]}"
  style="color: {color}; border-top-color: {color};"
  role="status"
  aria-label="Carregando..."
>
  <span class="sr-only">Carregando...</span>
</div>

<style>
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style> 