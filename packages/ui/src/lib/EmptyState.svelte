<script lang="ts">
  import type { Snippet } from 'svelte';
  
  interface EmptyStateProps {
    icon?: 'search' | 'inbox' | 'folder' | 'users' | 'shopping-bag' | 'custom';
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    class?: string;
    customIcon?: Snippet;
  }
  
  let {
    icon = 'inbox',
    title,
    description = '',
    actionLabel = '',
    onAction,
    class: className = '',
    customIcon
  }: EmptyStateProps = $props();
  
  const iconComponents = {
    search: SearchIcon,
    inbox: InboxIcon,
    folder: FolderIcon,
    users: UsersIcon,
    'shopping-bag': ShoppingBagIcon
  };
  
  function SearchIcon() {
    return `<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>`;
  }
  
  function InboxIcon() {
    return `<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>`;
  }
  
  function FolderIcon() {
    return `<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>`;
  }
  
  function UsersIcon() {
    return `<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>`;
  }
  
  function ShoppingBagIcon() {
    return `<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>`;
  }
</script>

<div class="text-center py-12 px-4 {className}">
  <!-- Icon -->
  <div class="mb-4">
    {#if icon === 'custom' && customIcon}
      {@render customIcon()}
    {:else if icon !== 'custom'}
      {@html iconComponents[icon]()}
    {/if}
  </div>
  
  <!-- Title -->
  <h3 class="text-lg font-medium text-gray-900 mb-2">
    {title}
  </h3>
  
  <!-- Description -->
  {#if description}
    <p class="text-sm text-gray-500 mb-6 max-w-md mx-auto">
      {description}
    </p>
  {/if}
  
  <!-- Action Button -->
  {#if actionLabel && onAction}
    <button
      onclick={onAction}
      class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00BFB3] hover:bg-[#00A89D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3] transition-colors"
    >
      {actionLabel}
    </button>
  {/if}
</div>

<style>
  /* Additional styles if needed */
</style> 