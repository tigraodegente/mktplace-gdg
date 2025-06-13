<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  
  interface ToastProps {
    id?: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
    duration?: number;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    dismissible?: boolean;
    onDismiss?: () => void;
  }
  
  let {
    id = crypto.randomUUID(),
    type = 'info',
    title = '',
    message,
    duration = 5000,
    position = 'top-right',
    dismissible = true,
    onDismiss
  }: ToastProps = $props();
  
  let visible = $state(true);
  let progress = $state(100);
  let progressInterval: ReturnType<typeof setInterval>;
  
  const typeConfig = {
    success: {
      bg: '#E8F8F7',
      border: '#00BFB3',
      icon: '#00BFB3',
      iconBg: '#00BFB3',
      title: '#00A89D',
      message: '#2C1D1D',
      progressBar: '#00BFB3'
    },
    error: {
      bg: '#FEE8EA',
      border: '#F17179',
      icon: '#F17179',
      iconBg: '#F17179',
      title: '#E85D65',
      message: '#2C1D1D',
      progressBar: '#F17179'
    },
    warning: {
      bg: '#FFF4E5',
      border: '#FF8403',
      icon: '#FF8403',
      iconBg: '#FF8403',
      title: '#E07709',
      message: '#2C1D1D',
      progressBar: '#FF8403'
    },
    info: {
      bg: '#F0F9FF',
      border: '#0EA5E9',
      icon: '#0EA5E9',
      iconBg: '#0EA5E9',
      title: '#0284C7',
      message: '#2C1D1D',
      progressBar: '#0EA5E9'
    }
  };
  
  const flyDirection = {
    'top-right': { x: 100, y: 0 },
    'top-left': { x: -100, y: 0 },
    'bottom-right': { x: 100, y: 0 },
    'bottom-left': { x: -100, y: 0 },
    'top-center': { x: 0, y: -100 },
    'bottom-center': { x: 0, y: 100 }
  };
  
  // Função para garantir valores válidos na animação
  function getSafeDirection(pos: keyof typeof flyDirection) {
    const direction = flyDirection[pos];
    return {
      x: isNaN(direction.x) ? 0 : direction.x,
      y: isNaN(direction.y) ? 0 : direction.y,
      duration: 300
    };
  }
  
  function dismiss() {
    visible = false;
    clearInterval(progressInterval);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  }
  
  onMount(() => {
    if (duration > 0) {
      const step = 100 / (duration / 100);
      progressInterval = setInterval(() => {
        progress -= step;
        if (progress <= 0) {
          dismiss();
        }
      }, 100);
    }
    
    return () => {
      clearInterval(progressInterval);
    };
  });
  
  const config = typeConfig[type];
</script>

{#if visible}
  <div
    class="toast-wrapper"
    transition:fly={{ ...getSafeDirection(position) }}
  >
    <div
      class="toast"
      style="background-color: {config.bg}; border-color: {config.border};"
      role="alert"
      aria-live="polite"
    >
      <div class="toast-content">
        <!-- Icon -->
        <div class="toast-icon" style="background-color: {config.iconBg};">
          {#if type === 'success'}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 10L9 12L13 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else if type === 'error'}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 8L8 12M8 8L12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else if type === 'warning'}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6V10M10 14H10.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 14V10M10 6H10.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {/if}
        </div>
        
        <!-- Text Content -->
        <div class="toast-text">
          {#if title}
            <h3 class="toast-title" style="color: {config.title};">
              {title}
            </h3>
          {/if}
          <p class="toast-message" style="color: {config.message};">
            {message}
          </p>
        </div>
        
        <!-- Close button -->
        {#if dismissible}
          <button
            onclick={dismiss}
            class="toast-close"
            aria-label="Fechar notificação"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="#818181" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        {/if}
      </div>
      
      <!-- Progress bar -->
      {#if duration > 0}
        <div class="toast-progress">
          <div
            class="toast-progress-bar"
            style="width: {progress}%; background-color: {config.progressBar};"
          ></div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .toast-wrapper {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    max-width: 400px;
    width: calc(100vw - 32px);
  }
  
  /* Position classes */
  :global(.toast-group--top-right) .toast-wrapper {
    top: 16px;
    right: 16px;
  }
  
  :global(.toast-group--top-left) .toast-wrapper {
    top: 16px;
    left: 16px;
  }
  
  :global(.toast-group--bottom-right) .toast-wrapper {
    bottom: 16px;
    right: 16px;
  }
  
  :global(.toast-group--bottom-left) .toast-wrapper {
    bottom: 16px;
    left: 16px;
  }
  
  :global(.toast-group--top-center) .toast-wrapper {
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
  }
  
  :global(.toast-group--bottom-center) .toast-wrapper {
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
  }
  
  .toast {
    pointer-events: auto;
    width: 100%;
    border: 2px solid;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
    font-family: 'Lato', sans-serif;
  }
  
  .toast-content {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .toast-icon {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .toast-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  .toast-title {
    font-size: 15px;
    font-style: normal;
    font-weight: 700;
    line-height: 1.4;
    margin: 0 0 2px 0;
    letter-spacing: 0.01em;
    font-feature-settings: 'liga' off, 'clig' off;
  }
  
  .toast-message {
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
    line-height: 1.4;
    margin: 0;
    letter-spacing: 0.01em;
    font-feature-settings: 'liga' off, 'clig' off;
  }
  
  .toast-close {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
    padding: 0;
    align-self: center;
  }
  
  .toast-close:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .toast-close:focus {
    outline: none;
    box-shadow: 0 0 0 2px #00BFB3;
  }
  
  .toast-progress {
    height: 3px;
    background-color: rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
  }
  
  .toast-progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transition: width 100ms linear;
  }
  
  /* Animação de entrada */
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .toast {
    animation: slideIn 0.3s ease-out;
  }
  
  /* Responsivo */
  @media (max-width: 640px) {
    .toast-wrapper {
      max-width: calc(100vw - 32px);
    }
    
    .toast-content {
      padding: 12px;
    }
    
    .toast-icon {
      width: 28px;
      height: 28px;
    }
    
    .toast-title {
      font-size: 14px;
    }
    
    .toast-message {
      font-size: 13px;
    }
  }
</style> 