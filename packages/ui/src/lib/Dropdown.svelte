<script lang="ts">
  import { scale } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';
  import type { Snippet } from 'svelte';
  
  interface DropdownProps {
    isOpen?: boolean;
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
    align?: 'start' | 'end' | 'center';
    closeOnClick?: boolean;
    closeOnOutsideClick?: boolean;
    class?: string;
    triggerClass?: string;
    menuClass?: string;
    trigger: Snippet;
    children: Snippet;
  }
  
  let {
    isOpen = $bindable(false),
    position = 'bottom-left',
    align = 'start',
    closeOnClick = true,
    closeOnOutsideClick = true,
    class: className = '',
    triggerClass = '',
    menuClass = '',
    trigger,
    children
  }: DropdownProps = $props();
  
  const dispatch = createEventDispatcher();
  
  let dropdownRef = $state<HTMLDivElement>();
  let menuRef = $state<HTMLDivElement>();
  
  const positionClasses = {
    'bottom-left': 'top-full left-0 mt-2',
    'bottom-right': 'top-full right-0 mt-2',
    'top-left': 'bottom-full left-0 mb-2',
    'top-right': 'bottom-full right-0 mb-2'
  };
  
  const alignClasses = {
    start: 'origin-top-left',
    end: 'origin-top-right',
    center: 'origin-top'
  };
  
  function toggle() {
    isOpen = !isOpen;
    dispatch('toggle', { isOpen });
  }
  
  function close() {
    isOpen = false;
    dispatch('close');
  }
  
  function handleClickOutside(e: MouseEvent) {
    if (!closeOnOutsideClick || !isOpen) return;
    
    const target = e.target as HTMLElement;
    if (!dropdownRef?.contains(target)) {
      close();
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      close();
      // Focus trigger button
      const triggerButton = dropdownRef?.querySelector('button');
      triggerButton?.focus();
    }
    
    // Arrow key navigation
    if (isOpen && menuRef && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      
      const items = menuRef.querySelectorAll(
        'button:not([disabled]), a:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );
      
      const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);
      let nextIndex: number;
      
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex + 1 >= items.length ? 0 : currentIndex + 1;
      } else {
        nextIndex = currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1;
      }
      
      (items[nextIndex] as HTMLElement)?.focus();
    }
  }
  
  function handleMenuClick(e: MouseEvent) {
    if (closeOnClick) {
      const target = e.target as HTMLElement;
      if (target.matches('button, a, [role="menuitem"]')) {
        close();
      }
    }
  }
  
  $effect(() => {
    if (isOpen) {
      // Focus first item when opened
      setTimeout(() => {
        const firstItem = menuRef?.querySelector(
          'button:not([disabled]), a:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        ) as HTMLElement;
        firstItem?.focus();
      }, 50);
    }
  });
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div bind:this={dropdownRef} class="relative inline-block {className}">
  <!-- Trigger -->
  <div
    class={triggerClass}
    onclick={toggle}
    role="button"
    tabindex="0"
    aria-expanded={isOpen}
    aria-haspopup="true"
  >
    {@render trigger()}
  </div>
  
  <!-- Menu -->
  {#if isOpen}
    <div
      bind:this={menuRef}
      class="absolute z-50 min-w-[200px] {positionClasses[position]} {menuClass}"
      transition:scale={{ duration: 200, start: 0.95 }}
      onclick={handleMenuClick}
    >
      <div
        class="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1 {alignClasses[align]}"
        role="menu"
        aria-orientation="vertical"
      >
        {@render children()}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Ensure dropdown menu appears above other content */
  :global(.dropdown-item) {
    @apply block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 text-left transition-colors;
  }
  
  :global(.dropdown-divider) {
    @apply my-1 border-t border-gray-200;
  }
  
  :global(.dropdown-header) {
    @apply px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider;
  }
</style> 