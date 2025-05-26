<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  
  interface $$Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
    hint?: string;
  }
  
  export let label: $$Props['label'] = '';
  export let error: $$Props['error'] = '';
  export let hint: $$Props['hint'] = '';
  export let value: $$Props['value'] = '';
  
  const baseClasses = `
    block w-full rounded-md border-gray-300 shadow-sm
    focus:border-blue-500 focus:ring-blue-500
    disabled:bg-gray-50 disabled:text-gray-500
  `;
  
  $: inputClasses = `${baseClasses} ${error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : ''}`;
</script>

<div class="space-y-1">
  {#if label}
    <label for={$$restProps.id} class="block text-sm font-medium text-gray-700">
      {label}
      {#if $$restProps.required}
        <span class="text-red-500">*</span>
      {/if}
    </label>
  {/if}
  
  <input
    bind:value
    class={inputClasses}
    aria-invalid={!!error}
    aria-describedby={error ? `${$$restProps.id}-error` : hint ? `${$$restProps.id}-hint` : undefined}
    {...$$restProps}
    on:input
    on:change
    on:blur
    on:focus
  />
  
  {#if error}
    <p class="text-sm text-red-600" id="{$$restProps.id}-error">
      {error}
    </p>
  {:else if hint}
    <p class="text-sm text-gray-500" id="{$$restProps.id}-hint">
      {hint}
    </p>
  {/if}
</div> 