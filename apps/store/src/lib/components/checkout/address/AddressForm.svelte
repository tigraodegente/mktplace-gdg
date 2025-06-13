<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Address } from '$lib/types/checkout';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import CepValidator from './CepValidator.svelte';

  interface Props {
    address?: Partial<Address>;
    isLoading?: boolean;
    errors?: Record<string, string>;
    showSaveOption?: boolean;
    saveLabel?: string;
  }

  let {
    address = {},
    isLoading = false,
    errors = {},
    showSaveOption = true,
    saveLabel = 'Salvar endereço para futuras compras'
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    submit: { 
      address: Address; 
      shouldSave: boolean;
    };
    cancel: void;
  }>();

  // Form data
  let formData = $state({
    name: address.name || '',
    street: address.street || '',
    number: address.number || '',
    complement: address.complement || '',
    neighborhood: address.neighborhood || '',
    city: address.city || '',
    state: address.state || '',
    zipCode: address.zipCode || ''
  });

  let shouldSave = $state(false);

  // Brazilian states
  const states = [
    { code: 'AC', name: 'Acre' },
    { code: 'AL', name: 'Alagoas' },
    { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' },
    { code: 'BA', name: 'Bahia' },
    { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' },
    { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' },
    { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' },
    { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' },
    { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' },
    { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' },
    { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' },
    { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' }
  ];

  function handleCepValidate(event: CustomEvent) {
    const { data } = event.detail;
    formData.street = data.logradouro || formData.street;
    formData.neighborhood = data.bairro || formData.neighborhood;
    formData.city = data.localidade || formData.city;
    formData.state = data.uf || formData.state;
  }

  function handleCepChange(event: CustomEvent) {
    formData.zipCode = event.detail.zipCode;
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isLoading) return;
    
    const addressData: Address = {
      name: formData.name.trim(),
      street: formData.street.trim(),
      number: formData.number.trim(),
      complement: formData.complement.trim(),
      neighborhood: formData.neighborhood.trim(),
      city: formData.city.trim(),
      state: formData.state,
      zipCode: formData.zipCode,
      isDefault: false
    };
    
    dispatch('submit', { 
      address: addressData, 
      shouldSave: shouldSave && showSaveOption 
    });
  }

  function handleCancel() {
    dispatch('cancel');
  }

  // Validation helpers
  function getFieldError(field: string): string {
    return errors[field] || '';
  }

  function isFieldInvalid(field: string): boolean {
    return !!errors[field];
  }
</script>

<form onsubmit={handleSubmit} class="space-y-6">
  <h3 class="text-lg font-semibold text-gray-900">
    {address.id ? 'Editar Endereço' : 'Novo Endereço'}
  </h3>
  
  <!-- Nome -->
  <div>
    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
      Nome completo *
    </label>
    <input
      type="text"
      id="name"
      bind:value={formData.name}
      required
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
        isFieldInvalid('name') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
      }"
      placeholder="Seu nome completo"
    />
    {#if getFieldError('name')}
      <p class="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
    {/if}
  </div>

  <!-- CEP -->
  <div>
    <label for="zipCode" class="block text-sm font-medium text-gray-700 mb-2">
      CEP *
    </label>
    <CepValidator
      zipCode={formData.zipCode}
      on:validate={handleCepValidate}
      on:change={handleCepChange}
    />
    {#if getFieldError('zipCode')}
      <p class="mt-1 text-sm text-red-600">{getFieldError('zipCode')}</p>
    {/if}
  </div>

  <!-- Endereço -->
  <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
    <div class="lg:col-span-3">
      <label for="street" class="block text-sm font-medium text-gray-700 mb-2">
        Rua/Avenida *
      </label>
      <input
        type="text"
        id="street"
        bind:value={formData.street}
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('street') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
        placeholder="Nome da rua ou avenida"
      />
      {#if getFieldError('street')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('street')}</p>
      {/if}
    </div>

    <div>
      <label for="number" class="block text-sm font-medium text-gray-700 mb-2">
        Número *
      </label>
      <input
        type="text"
        id="number"
        bind:value={formData.number}
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('number') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
        placeholder="123"
      />
      {#if getFieldError('number')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('number')}</p>
      {/if}
    </div>
  </div>

  <!-- Complemento -->
  <div>
    <label for="complement" class="block text-sm font-medium text-gray-700 mb-2">
      Complemento
    </label>
    <input
      type="text"
      id="complement"
      bind:value={formData.complement}
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
      placeholder="Apartamento, bloco, andar, etc."
    />
  </div>

  <!-- Bairro -->
  <div>
    <label for="neighborhood" class="block text-sm font-medium text-gray-700 mb-2">
      Bairro *
    </label>
    <input
      type="text"
      id="neighborhood"
      bind:value={formData.neighborhood}
      required
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
        isFieldInvalid('neighborhood') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
      }"
      placeholder="Nome do bairro"
    />
    {#if getFieldError('neighborhood')}
      <p class="mt-1 text-sm text-red-600">{getFieldError('neighborhood')}</p>
    {/if}
  </div>

  <!-- Cidade e Estado -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div>
      <label for="city" class="block text-sm font-medium text-gray-700 mb-2">
        Cidade *
      </label>
      <input
        type="text"
        id="city"
        bind:value={formData.city}
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('city') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
        placeholder="Nome da cidade"
      />
      {#if getFieldError('city')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('city')}</p>
      {/if}
    </div>

    <div>
      <label for="state" class="block text-sm font-medium text-gray-700 mb-2">
        Estado *
      </label>
      <select
        id="state"
        bind:value={formData.state}
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('state') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
      >
        <option value="">Selecione o estado</option>
        {#each states as state}
          <option value={state.code}>{state.name}</option>
        {/each}
      </select>
      {#if getFieldError('state')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('state')}</p>
      {/if}
    </div>
  </div>

  <!-- Opção de salvar -->
  {#if showSaveOption}
    <div class="bg-gray-50 rounded-lg p-4">
      <div class="flex items-start">
        <input
          type="checkbox"
          id="shouldSave"
          bind:checked={shouldSave}
          class="mt-1 text-[#00BFB3] focus:ring-[#00BFB3] focus:ring-offset-0 rounded"
        />
        <label for="shouldSave" class="ml-3 text-sm text-gray-700">
          <span class="font-medium">{saveLabel}</span>
          <p class="text-gray-500 mt-1">Isso facilitará suas próximas compras</p>
        </label>
      </div>
    </div>
  {/if}

  <!-- Actions -->
  <div class="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
    <button
      type="button"
      onclick={handleCancel}
      disabled={isLoading}
      class="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      Cancelar
    </button>
    
    <button
      type="submit"
      disabled={isLoading}
      class="px-6 py-2 text-sm font-medium text-white bg-[#00BFB3] border border-transparent rounded-lg hover:bg-[#00A89D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
    >
      {#if isLoading}
        <LoadingSpinner size="small" color="white" />
        <span>Salvando...</span>
      {:else}
        <span>{address.id ? 'Atualizar' : 'Salvar'} Endereço</span>
      {/if}
    </button>
  </div>
</form> 