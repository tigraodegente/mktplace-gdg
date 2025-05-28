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
  
  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-500',
      title: 'text-green-800',
      message: 'text-green-700'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      title: 'text-red-800',
      message: 'text-red-700'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-500',
      title: 'text-yellow-800',
      message: 'text-yellow-700'
    },
    info: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      icon: 'text-[#00BFB3]',
      title: 'text-cyan-800',
      message: 'text-cyan-700'
    }
  };
  
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };
  
  const flyDirection = {
    'top-right': { x: 100 },
    'top-left': { x: -100 },
    'bottom-right': { x: 100 },
    'bottom-left': { x: -100 },
    'top-center': { y: -100 },
    'bottom-center': { y: 100 }
  };
  
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
  
  const styles = typeStyles[type];
</script>

{#if visible}
  <div
    class="fixed {positionClasses[position]} z-50 pointer-events-none"
    transition:fly={{ ...flyDirection[position], duration: 300 }}
  >
    <div
      class="pointer-events-auto max-w-sm w-full {styles.bg} {styles.border} border rounded-lg shadow-lg overflow-hidden"
      role="alert"
      aria-live="polite"
    >
      <div class="p-4">
        <div class="flex items-start">
          <!-- Icon -->
          <div class="flex-shrink-0">
            {#if type === 'success'}
              <svg class="w-5 h-5 {styles.icon}" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            {:else if type === 'error'}
              <svg class="w-5 h-5 {styles.icon}" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            {:else if type === 'warning'}
              <svg class="w-5 h-5 {styles.icon}" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            {:else}
              <svg class="w-5 h-5 {styles.icon}" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            {/if}
          </div>
          
          <!-- Content -->
          <div class="ml-3 flex-1">
            {#if title}
              <h3 class="text-sm font-medium {styles.title}">
                {title}
              </h3>
            {/if}
            <p class="text-sm {styles.message} {title ? 'mt-1' : ''}">
              {message}
            </p>
          </div>
          
          <!-- Close button -->
          {#if dismissible}
            <button
              onclick={dismiss}
              class="ml-4 flex-shrink-0 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3]"
              aria-label="Fechar notificação"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          {/if}
        </div>
      </div>
      
      <!-- Progress bar -->
      {#if duration > 0}
        <div class="h-1 bg-gray-200 relative overflow-hidden">
          <div
            class="absolute top-0 left-0 h-full bg-current transition-all duration-100 ease-linear {styles.icon}"
            style="width: {progress}%"
          ></div>
        </div>
      {/if}
    </div>
  </div>
{/if} 