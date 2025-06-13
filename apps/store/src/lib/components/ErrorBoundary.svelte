<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const { 
    fallback = 'Algo deu errado. Tente novamente.',
    showReload = true,
    onError
  }: {
    fallback?: string;
    showReload?: boolean;
    onError?: (error: Error) => void;
  } = $props();

  let hasError = $state(false);
  let errorMessage = $state('');
  let errorDetails = $state('');

  // Capturar erros globais
  function handleError(event: ErrorEvent) {
    hasError = true;
    errorMessage = event.message || fallback;
    errorDetails = event.filename ? `${event.filename}:${event.lineno}` : '';
    
    if (onError) {
      onError(new Error(event.message));
    }
  }

  // Capturar erros de Promise rejeitadas
  function handleUnhandledRejection(event: PromiseRejectionEvent) {
    hasError = true;
    errorMessage = event.reason?.message || fallback;
    errorDetails = 'Promise Rejection';
    
    if (onError) {
      onError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    }
  }

  // Função para resetar erro
  function resetError() {
    hasError = false;
    errorMessage = '';
    errorDetails = '';
  }

  // Função para recarregar página
  function reloadPage() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }
  });
</script>

{#if hasError}
  <div class="min-h-[200px] flex items-center justify-center p-6">
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
      <div class="flex justify-center mb-4">
        <svg class="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 class="text-lg font-semibold text-red-800 mb-2">
        Oops! Algo deu errado
      </h3>
      
      <p class="text-red-700 mb-4">
        {errorMessage}
      </p>
      
      {#if errorDetails}
        <p class="text-xs text-red-600 mb-4 font-mono">
          {errorDetails}
        </p>
      {/if}
      
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button 
          onclick={resetError}
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
        
        {#if showReload}
          <button 
            onclick={reloadPage}
            class="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Recarregar Página
          </button>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if} 