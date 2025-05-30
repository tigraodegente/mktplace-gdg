<script lang="ts">
  import Toast from './Toast.svelte';
  import { toastStore } from '$lib/stores/toastStore';
  import { flip } from 'svelte/animate';
  
  // Agrupar toasts por posição
  const toastsByPosition = $derived(() => {
    const groups: Record<string, typeof $toastStore> = {};
    
    $toastStore.forEach(toast => {
      const position = toast.position || 'top-right';
      if (!groups[position]) {
        groups[position] = [];
      }
      groups[position].push(toast);
    });
    
    return groups;
  });
</script>

<!-- Renderizar toasts agrupados por posição -->
{#each Object.entries(toastsByPosition()) as [position, toasts]}
  <div class="toast-group toast-group--{position}" aria-live="polite">
    {#each toasts as toast (toast.id)}
      <div animate:flip={{ duration: 300 }}>
        <Toast
          {...toast}
          onDismiss={() => toastStore.remove(toast.id)}
        />
      </div>
    {/each}
  </div>
{/each}

<style>
  .toast-group {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .toast-group--top-right {
    top: 16px;
    right: 16px;
  }
  
  .toast-group--top-left {
    top: 16px;
    left: 16px;
  }
  
  .toast-group--bottom-right {
    bottom: 16px;
    right: 16px;
    flex-direction: column-reverse;
  }
  
  .toast-group--bottom-left {
    bottom: 16px;
    left: 16px;
    flex-direction: column-reverse;
  }
  
  .toast-group--top-center {
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
  }
  
  .toast-group--bottom-center {
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: column-reverse;
  }
  
  /* Responsivo */
  @media (max-width: 640px) {
    .toast-group--top-right,
    .toast-group--top-left,
    .toast-group--bottom-right,
    .toast-group--bottom-left {
      left: 16px;
      right: 16px;
      transform: none;
    }
    
    .toast-group--top-center,
    .toast-group--bottom-center {
      left: 16px;
      right: 16px;
      transform: none;
    }
  }
</style> 