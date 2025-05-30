<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';
  
  interface $$Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    fullWidth?: boolean;
  }
  
  export let variant: $$Props['variant'] = 'primary';
  export let size: $$Props['size'] = 'md';
  export let loading: $$Props['loading'] = false;
  export let fullWidth: $$Props['fullWidth'] = false;
  
  const variantClasses = {
    primary: 'bg-[#00BFB3] text-white hover:bg-[#00A89D] focus:ring-[#00BFB3]',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    outline: 'bg-transparent border-2 border-[#00BFB3] text-[#00BFB3] hover:bg-[#00BFB3] hover:text-white focus:ring-[#00BFB3]'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  $: classes = `
    inline-flex items-center justify-center font-medium rounded-md
    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
  `;
</script>

<button
  class={classes}
  disabled={loading || $$restProps.disabled}
  {...$$restProps}
  on:click
>
  {#if loading}
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  <slot />
</button> 