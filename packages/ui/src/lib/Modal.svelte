<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  
  interface ModalProps {
    isOpen: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOverlay?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    class?: string;
    children?: Snippet;
    footer?: Snippet;
  }
  
  let {
    isOpen = $bindable(false),
    title = '',
    size = 'md',
    closeOnOverlay = true,
    closeOnEscape = true,
    showCloseButton = true,
    class: className = '',
    children,
    footer
  }: ModalProps = $props();
  
  const dispatch = createEventDispatcher();
  
  let modalRef = $state<HTMLDivElement>();
  let previousFocus = $state<HTMLElement | null>(null);
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };
  
  function handleClose() {
    isOpen = false;
    dispatch('close');
  }
  
  function handleOverlayClick() {
    if (closeOnOverlay) {
      handleClose();
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && closeOnEscape) {
      handleClose();
    }
    
    // Trap focus
    if (e.key === 'Tab' && modalRef) {
      const focusableElements = modalRef.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }
  
  $effect(() => {
    if (isOpen) {
      previousFocus = document.activeElement as HTMLElement;
      
      // Focus first focusable element
      setTimeout(() => {
        if (modalRef) {
          const firstFocusable = modalRef.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          firstFocusable?.focus();
        }
      }, 50);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus
      if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
      }
      
      // Restore body scroll
      document.body.style.overflow = '';
    }
  });
  
  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });
</script>

{#if isOpen}
  <!-- Overlay -->
  <button
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
    transition:fade={{ duration: 200 }}
    onclick={handleOverlayClick}
    aria-label="Fechar modal"
    tabindex="-1"
  />
  
  <!-- Modal -->
  <div
    bind:this={modalRef}
    class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
    onkeydown={handleKeydown}
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full {sizeClasses[size]} pointer-events-auto {className}"
      transition:scale={{ duration: 200, start: 0.95 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <!-- Header -->
      {#if title || showCloseButton}
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          {#if title}
            <h2 id="modal-title" class="text-xl font-semibold text-[var(--text-color)]">
              {title}
            </h2>
          {/if}
          
          {#if showCloseButton}
            <button
              onclick={handleClose}
              class="ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Fechar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
      
      <!-- Content -->
      <div class="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {#if children}
          {@render children()}
        {/if}
      </div>
      
      <!-- Footer -->
      {#if footer}
        <div class="p-6 border-t border-gray-200">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if} 