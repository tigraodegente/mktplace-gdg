<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  
  interface Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
    hint?: string;
    value?: string;
  }
  
  let { 
    label = '', 
    error = '', 
    hint = '', 
    value = '',
    class: className = '',
    id,
    required,
    ...rest 
  }: Props = $props();
  
  // Gerar ID único se não fornecido
  const inputId = $derived(id || `input-${Math.random().toString(36).slice(2, 9)}`);
  
  const inputClasses = $derived([
    'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900',
    'ring-1 ring-inset ring-gray-300 placeholder:text-gray-400',
    'focus:ring-2 focus:ring-inset focus:ring-cyan-600',
    'sm:text-sm sm:leading-6',
    error && 'ring-red-300 focus:ring-red-600',
    className
  ].filter(Boolean).join(' '));
</script>

{#if label}
  <label for={inputId} class="block text-sm font-medium leading-6 text-gray-900 mb-1">
    {label}
    {#if required}
      <span class="text-red-500">*</span>
    {/if}
  </label>
{/if}

<input
  {...rest}
  id={inputId}
  {required}
  bind:value
  class={inputClasses}
  aria-invalid={!!error}
  aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
/>

{#if hint && !error}
  <p class="mt-1 text-sm text-gray-600" id="{inputId}-hint">
    {hint}
  </p>
{/if}

{#if error}
  <p class="mt-1 text-sm text-red-600" id="{inputId}-error">
    {error}
  </p>
{/if} 