<script lang="ts">
  import { onMount } from 'svelte';
  import ErrorBoundary from './ErrorBoundary.svelte';

  const { 
    componentLoader,
    loadingText = 'Carregando...',
    minLoadTime = 300,
    showSkeleton = true,
    errorFallback = 'Erro ao carregar componente',
    ...restProps
  } = $props();

  let Component = $state<any>(null);
  let loading = $state(true);
  let error = $state<Error | null>(null);

  onMount(async () => {
    const startTime = Date.now();
    
    try {
      const module = await componentLoader();
      Component = module.default || module;
      
      // Garantir tempo mínimo de loading para evitar flicker
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsedTime));
      }
      
    } catch (err) {
      error = err instanceof Error ? err : new Error('Erro ao carregar componente');
    } finally {
      loading = false;
    }
  });
</script>

<ErrorBoundary fallback={errorFallback}>
  {#if loading}
    {#if showSkeleton}
      <!-- Skeleton loading -->
      <div class="animate-pulse space-y-4">
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        <div class="h-32 bg-gray-200 rounded"></div>
        <div class="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    {:else}
      <!-- Simple loading -->
      <div class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span class="ml-3 text-gray-600">{loadingText}</span>
      </div>
    {/if}
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p class="text-red-700">{error.message}</p>
      <button 
        onclick={() => window.location.reload()}
        class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Recarregar
      </button>
    </div>
  {:else if Component}
    <svelte:component this={Component} {...restProps} />
  {/if}
</ErrorBoundary> 