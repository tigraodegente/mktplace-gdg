<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  interface Props {
    zipCode?: string;
    autoFocus?: boolean;
    size?: 'small' | 'medium' | 'large';
  }

  let {
    zipCode = '',
    autoFocus = false,
    size = 'medium'
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    validate: { zipCode: string; data: any };
    change: { zipCode: string };
    error: { message: string };
  }>();

  let isValidating = $state(false);
  let validationError = $state('');
  let inputValue = $state(zipCode);
  let inputRef: HTMLInputElement | undefined = $state();

  // Reactive effect to update input when prop changes
  $effect(() => {
    inputValue = zipCode;
  });

  // Auto focus effect
  $effect(() => {
    if (autoFocus && inputRef) {
      inputRef.focus();
    }
  });

  function formatZipCode(value: string): string {
    const numbers = value.replace(/\D/g, '');
    return numbers.length > 5 
      ? `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
      : numbers;
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const formatted = formatZipCode(target.value);
    inputValue = formatted;
    
    const cleanZip = formatted.replace(/\D/g, '');
    dispatch('change', { zipCode: cleanZip });
    
    // Clear previous error
    validationError = '';
    
    // Auto-validate when complete
    if (cleanZip.length === 8) {
      validateZipCode(cleanZip);
    }
  }

  async function validateZipCode(cep: string) {
    if (cep.length !== 8) {
      validationError = 'CEP deve ter 8 dígitos';
      return;
    }

    isValidating = true;
    validationError = '';

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      
      if (!response.ok) {
        throw new Error('Erro na consulta do CEP');
      }

      const data = await response.json();
      
      if (data.erro) {
        validationError = 'CEP não encontrado';
        dispatch('error', { message: 'CEP não encontrado' });
      } else {
        dispatch('validate', { zipCode: cep, data });
      }
    } catch (error) {
      validationError = 'Erro ao validar CEP';
      dispatch('error', { message: 'Erro ao validar CEP' });
    } finally {
      isValidating = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const cleanZip = inputValue.replace(/\D/g, '');
      if (cleanZip.length === 8) {
        validateZipCode(cleanZip);
      }
    }
  }

  // Size classes
  const sizeClasses = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-3 py-2',
    large: 'px-4 py-3 text-lg'
  };
</script>

<div class="relative">
  <div class="relative">
    <input
      bind:this={inputRef}
      type="text"
      bind:value={inputValue}
      oninput={handleInput}
      onkeypress={handleKeyPress}
      maxlength="9"
      placeholder="00000-000"
      class="w-full border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {sizeClasses[size]} {
        validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
      } {isValidating ? 'pr-10' : ''}"
    />
    
    {#if isValidating}
      <div class="absolute inset-y-0 right-0 flex items-center pr-3">
        <LoadingSpinner size="small" />
      </div>
    {/if}
  </div>
  
  {#if validationError}
    <p class="mt-1 text-sm text-red-600 flex items-center">
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {validationError}
    </p>
  {/if}
  
  {#if inputValue.replace(/\D/g, '').length === 8 && !isValidating && !validationError}
    <p class="mt-1 text-sm text-green-600 flex items-center">
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      CEP válido
    </p>
  {/if}
</div>

<style>
  /* Remove spinner dos inputs number no Chrome/Safari */
  input[type="text"]::-webkit-outer-spin-button,
  input[type="text"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style> 