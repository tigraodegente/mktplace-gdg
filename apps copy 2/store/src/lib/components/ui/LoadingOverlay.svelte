<script lang="ts">
  import { fade } from 'svelte/transition';
  
  interface LoadingOverlayProps {
    isLoading?: boolean;
    message?: string;
    fullScreen?: boolean;
    blur?: boolean;
    class?: string;
  }
  
  let {
    isLoading = false,
    message = 'Carregando...',
    fullScreen = true,
    blur = true,
    class: className = ''
  }: LoadingOverlayProps = $props();
</script>

{#if isLoading}
  <div
    class="loading-overlay {fullScreen ? 'loading-overlay--fullscreen' : 'loading-overlay--relative'} {blur ? 'loading-overlay--blur' : ''} {className}"
    transition:fade={{ duration: 200 }}
    role="status"
    aria-live="polite"
  >
    <div class="loading-content">
      <!-- Spinner -->
      <div class="loading-spinner">
        <svg class="animate-spin h-12 w-12 text-[#00BFB3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      
      <!-- Message -->
      {#if message}
        <p class="loading-message">{message}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .loading-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 9998;
  }
  
  .loading-overlay--fullscreen {
    position: fixed;
    inset: 0;
  }
  
  .loading-overlay--relative {
    position: absolute;
    inset: 0;
  }
  
  .loading-overlay--blur {
    backdrop-filter: blur(4px);
  }
  
  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .loading-message {
    font-size: 1rem;
    color: var(--text-color);
    text-align: center;
    margin: 0;
  }
  
  /* Animação de pulse para o container */
  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.95;
    }
  }
  
  .loading-content {
    animation: pulse-subtle 2s ease-in-out infinite;
  }
</style> 