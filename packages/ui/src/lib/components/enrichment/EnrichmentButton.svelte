<script lang="ts">
  interface EnrichmentField {
    name: string;
    label: string;
    type: string;
    required?: boolean;
  }

  // Props
  export let field: EnrichmentField;
  export let entityType: string;
  export let entityId: string;
  export let currentValue: any = undefined;
  export let size: 'sm' | 'md' | 'lg' = 'sm';
  export let variant: 'primary' | 'secondary' | 'ghost' = 'secondary';
  export let loading = false;
  export let disabled = false;
  export let showLabel = true;
  export let iconOnly = false;

  // Events
  export let onEnrich: (data: any) => void = () => {};

  function handleClick() {
    if (disabled || loading) return;
    
    onEnrich({
      field: field.name,
      entityType,
      entityId,
      currentValue
    });
  }

  $: hasValue = currentValue !== undefined && currentValue !== null && currentValue !== '';
</script>

<button
  class="btn btn-{size} btn-{variant} flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95"
  class:loading
  class:disabled
  on:click={handleClick}
  {disabled}
  title="Enriquecer {field.label}"
>
  {#if loading}
    <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
  {:else}
    <svg 
      class="w-4 h-4" 
      class:text-green-600={hasValue}
      class:text-blue-600={!hasValue}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      {#if hasValue}
        <!-- Ícone de "atualizar" -->
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2m-15.356-2H9"
        />
      {:else}
        <!-- Ícone de "estrela/IA" -->
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      {/if}
    </svg>
  {/if}
  
  {#if !iconOnly && showLabel}
    <span class="text-xs font-medium">
      {hasValue ? 'Atualizar' : 'Enriquecer'}
    </span>
  {/if}
</button>

<style>
  .btn {
    @apply inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200;
    @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  }

  .btn-sm {
    @apply px-2 py-1 text-xs;
  }

  .btn-md {
    @apply px-3 py-2 text-sm;
  }

  .btn-lg {
    @apply px-4 py-2 text-base;
  }

  .btn-primary {
    @apply bg-blue-600 text-white border border-blue-600;
    @apply hover:bg-blue-700 hover:border-blue-700;
    @apply focus:ring-blue-500;
  }

  .btn-secondary {
    @apply bg-gray-100 text-gray-700 border border-gray-300;
    @apply hover:bg-gray-200 hover:border-gray-400;
    @apply focus:ring-gray-500;
  }

  .btn-ghost {
    @apply bg-transparent text-gray-600 border border-transparent;
    @apply hover:bg-gray-100 hover:text-gray-800;
    @apply focus:ring-gray-500;
  }

  .disabled {
    @apply opacity-50 cursor-not-allowed;
  }

  .loading {
    @apply cursor-wait;
  }
</style> 