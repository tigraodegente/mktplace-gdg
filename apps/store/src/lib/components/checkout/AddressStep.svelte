<script lang="ts">
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import type { Address } from '$lib/types/checkout';
  
  export let selectedAddress: Address | null = null;
  export let onComplete: (data: any) => void;
  export let onBack: () => void;
  export let loading: boolean = false;
  
  let addressForm: Address = {
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  };
  
  let errors: Record<string, string> = {};
  let loadingCep = false;
  
  // Se há endereço selecionado, preencher o formulário
  if (selectedAddress) {
    addressForm = { ...selectedAddress };
  }
  
  const states = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ];
  
  function validateForm(): boolean {
    errors = {};
    
    if (!addressForm.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }
    
    if (!addressForm.zipCode.trim() || addressForm.zipCode.replace(/\D/g, '').length !== 8) {
      errors.zipCode = 'CEP deve ter 8 dígitos';
    }
    
    if (!addressForm.street.trim()) {
      errors.street = 'Logradouro é obrigatório';
    }
    
    if (!addressForm.number.trim()) {
      errors.number = 'Número é obrigatório';
    }
    
    if (!addressForm.neighborhood.trim()) {
      errors.neighborhood = 'Bairro é obrigatório';
    }
    
    if (!addressForm.city.trim()) {
      errors.city = 'Cidade é obrigatória';
    }
    
    if (!addressForm.state.trim()) {
      errors.state = 'Estado é obrigatório';
    }
    
    return Object.keys(errors).length === 0;
  }
  
  async function searchCep() {
    const cleanCep = addressForm.zipCode.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return;
    
    loadingCep = true;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        addressForm.street = data.logradouro || addressForm.street;
        addressForm.neighborhood = data.bairro || addressForm.neighborhood;
        addressForm.city = data.localidade || addressForm.city;
        addressForm.state = data.uf || addressForm.state;
        
        // Remover erro do CEP se encontrou
        if (errors.zipCode) {
          delete errors.zipCode;
          errors = { ...errors };
        }
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      loadingCep = false;
    }
  }
  
  function maskCep(value: string): string {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  }
  
  function handleCepInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const masked = maskCep(target.value);
    addressForm.zipCode = masked;
    target.value = masked;
    
    if (masked.replace(/\D/g, '').length === 8) {
      searchCep();
    }
  }
  
  function handleSubmit() {
    if (validateForm()) {
      onComplete({
        address: addressForm
      });
    }
  }
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold text-gray-900 mb-6">Endereço de Entrega</h2>
  
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <!-- Nome Completo -->
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
        Nome Completo *
      </label>
      <input
        id="name"
        type="text"
        bind:value={addressForm.name}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        class:border-red-300={errors.name}
        disabled={loading}
        placeholder="Seu nome completo"
      />
      {#if errors.name}
        <p class="text-red-600 text-xs mt-1">{errors.name}</p>
      {/if}
    </div>
    
    <!-- CEP -->
    <div>
      <label for="zipCode" class="block text-sm font-medium text-gray-700 mb-1">
        CEP *
      </label>
      <div class="relative">
        <input
          id="zipCode"
          type="text"
          value={addressForm.zipCode}
          on:input={handleCepInput}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-300={errors.zipCode}
          disabled={loading}
          placeholder="00000-000"
          maxlength="9"
        />
        {#if loadingCep}
          <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
            <LoadingSpinner size="small" />
          </div>
        {/if}
      </div>
      {#if errors.zipCode}
        <p class="text-red-600 text-xs mt-1">{errors.zipCode}</p>
      {/if}
    </div>
    
    <!-- Logradouro e Número -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">
        <label for="street" class="block text-sm font-medium text-gray-700 mb-1">
          Logradouro *
        </label>
        <input
          id="street"
          type="text"
          bind:value={addressForm.street}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-300={errors.street}
          disabled={loading}
          placeholder="Rua, Avenida, etc."
        />
        {#if errors.street}
          <p class="text-red-600 text-xs mt-1">{errors.street}</p>
        {/if}
      </div>
      
      <div>
        <label for="number" class="block text-sm font-medium text-gray-700 mb-1">
          Número *
        </label>
        <input
          id="number"
          type="text"
          bind:value={addressForm.number}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-300={errors.number}
          disabled={loading}
          placeholder="123"
        />
        {#if errors.number}
          <p class="text-red-600 text-xs mt-1">{errors.number}</p>
        {/if}
      </div>
    </div>
    
    <!-- Complemento -->
    <div>
      <label for="complement" class="block text-sm font-medium text-gray-700 mb-1">
        Complemento
      </label>
      <input
        id="complement"
        type="text"
        bind:value={addressForm.complement}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
        placeholder="Apartamento, bloco, etc. (opcional)"
      />
    </div>
    
    <!-- Bairro -->
    <div>
      <label for="neighborhood" class="block text-sm font-medium text-gray-700 mb-1">
        Bairro *
      </label>
      <input
        id="neighborhood"
        type="text"
        bind:value={addressForm.neighborhood}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        class:border-red-300={errors.neighborhood}
        disabled={loading}
        placeholder="Bairro"
      />
      {#if errors.neighborhood}
        <p class="text-red-600 text-xs mt-1">{errors.neighborhood}</p>
      {/if}
    </div>
    
    <!-- Cidade e Estado -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="city" class="block text-sm font-medium text-gray-700 mb-1">
          Cidade *
        </label>
        <input
          id="city"
          type="text"
          bind:value={addressForm.city}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-300={errors.city}
          disabled={loading}
          placeholder="Cidade"
        />
        {#if errors.city}
          <p class="text-red-600 text-xs mt-1">{errors.city}</p>
        {/if}
      </div>
      
      <div>
        <label for="state" class="block text-sm font-medium text-gray-700 mb-1">
          Estado *
        </label>
        <select
          id="state"
          bind:value={addressForm.state}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          class:border-red-300={errors.state}
          disabled={loading}
        >
          <option value="">Selecione o estado</option>
          {#each states as state}
            <option value={state.value}>{state.label}</option>
          {/each}
        </select>
        {#if errors.state}
          <p class="text-red-600 text-xs mt-1">{errors.state}</p>
        {/if}
      </div>
    </div>
    
    <!-- Botões de Ação -->
    <div class="flex justify-between items-center pt-6">
      <button
        type="button"
        on:click={onBack}
        disabled={loading}
        class="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Voltar
      </button>
      
      <button
        type="submit"
        disabled={loading}
        class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        {#if loading}
          <LoadingSpinner size="small" color="white" />
          <span>Processando...</span>
        {:else}
          <span>Continuar para Pagamento</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        {/if}
      </button>
    </div>
  </form>
</div> 