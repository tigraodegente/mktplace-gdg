<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { isAuthenticated, user } from '$lib/stores/auth';
  import AddressManager from '$lib/components/address/AddressManager.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  
  const { currentUser = null, isGuest = false } = $props<{
    currentUser?: any;
    isGuest?: boolean;
  }>();
  
  const dispatch = createEventDispatcher();
  
  // Estados
  let addressMode = $state<'select' | 'new'>('new');
  let selectedAddress = $state<any>(null);
  let showAddressManager = $state(false);
  let userAddresses = $state<any[]>([]);
  let loadingAddresses = $state(false);
  let loadingCep = $state(false);
  
  // Formulário de endereço
  let addressForm = $state({
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  // Validação
  let addressErrors = $state<Record<string, string>>({});
  
  // Estados brasileiros
  const states = [
    { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' }, { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ];
  
  onMount(async () => {
    // Se está autenticado, carregar endereços
    if (currentUser || $isAuthenticated) {
      await loadUserAddresses();
      addressMode = userAddresses.length > 0 ? 'select' : 'new';
    }
  });
  
  async function loadUserAddresses() {
    if (!currentUser && !$isAuthenticated) return;
    
    loadingAddresses = true;
    try {
      const response = await fetch('/api/addresses', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        userAddresses = data.data || [];
      } else {
        console.error('Erro ao carregar endereços:', data.error);
        userAddresses = [];
      }
    } catch (error) {
      console.error('Erro ao carregar endereços:', error);
      userAddresses = [];
    } finally {
      loadingAddresses = false;
    }
  }
  
  function maskCep(value: string): string {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
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
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      loadingCep = false;
    }
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
  
  // Função de validação que retorna erros sem modificar estado
  function getValidationErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    
    if (!addressForm.name.trim()) errors.name = 'Nome é obrigatório';
    if (!addressForm.zipCode.trim() || addressForm.zipCode.replace(/\D/g, '').length !== 8) {
      errors.zipCode = 'CEP deve ter 8 dígitos';
    }
    if (!addressForm.street.trim()) errors.street = 'Logradouro é obrigatório';
    if (!addressForm.number.trim()) errors.number = 'Número é obrigatório';
    if (!addressForm.neighborhood.trim()) errors.neighborhood = 'Bairro é obrigatório';
    if (!addressForm.city.trim()) errors.city = 'Cidade é obrigatória';
    if (!addressForm.state.trim()) errors.state = 'Estado é obrigatório';
    
    return errors;
  }
  
  // Derivado para verificar se o formulário é válido
  const isFormValid = $derived(() => {
    const errors = getValidationErrors();
    return Object.keys(errors).length === 0;
  });
  
  // Função que aplica os erros ao estado (para ser chamada em eventos)
  function validateAndSetErrors(): boolean {
    const errors = getValidationErrors();
    addressErrors = errors;
    return Object.keys(errors).length === 0;
  }
  
  function handleNext() {
    if (addressMode === 'select' && selectedAddress) {
      // Usar endereço selecionado
      dispatch('next', { 
        address: selectedAddress,
        addressData: {
          name: selectedAddress.name,
          street: selectedAddress.street,
          number: selectedAddress.number,
          complement: selectedAddress.complement || '',
          neighborhood: selectedAddress.neighborhood,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zipCode: selectedAddress.zipCode
        }
      });
    } else if (addressMode === 'new' && validateAndSetErrors()) {
      // Usar novo endereço
      dispatch('next', { 
        address: null,
        addressData: { ...addressForm }
      });
    }
  }
  
  function handleAddressSelected(event: CustomEvent) {
    const { address } = event.detail;
    selectedAddress = address;
    
    // Preencher formulário com dados do endereço selecionado
    addressForm = {
      name: address.name,
      street: address.street,
      number: address.number,
      complement: address.complement || '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode
    };
    
    showAddressManager = false;
  }
  
  function selectNewAddress() {
    addressMode = 'new';
    selectedAddress = null;
    addressForm = {
      name: currentUser?.name || $user?.name || '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    };
  }
  
  function selectSavedAddress() {
    if (userAddresses.length === 0) {
      loadUserAddresses().then(() => {
        if (userAddresses.length > 0) {
          addressMode = 'select';
          showAddressManager = true;
        } else {
          addressMode = 'new';
        }
      });
    } else {
      addressMode = 'select';
      showAddressManager = true;
    }
  }
  
  async function saveCurrentAddress() {
    if ((!currentUser && !$isAuthenticated) || !validateAndSetErrors()) return;
    
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: addressForm.name,
          street: addressForm.street,
          number: addressForm.number,
          complement: addressForm.complement,
          neighborhood: addressForm.neighborhood,
          city: addressForm.city,
          state: addressForm.state,
          zipCode: addressForm.zipCode.replace(/\D/g, ''),
          label: `Endereço ${userAddresses.length + 1}`,
          type: 'shipping'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadUserAddresses();
        console.log('✅ Endereço salvo com sucesso!');
      } else {
        console.error('Erro ao salvar endereço:', result.error);
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    }
  }
  
  // Calcular progresso do preenchimento
  const completionPercentage = $derived(() => {
    const fields = [addressForm.name, addressForm.zipCode, addressForm.street, addressForm.number, addressForm.neighborhood, addressForm.city, addressForm.state];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  });
</script>

<div class="space-y-6">
  {#if (currentUser || $isAuthenticated) && userAddresses.length > 0}
    <!-- Opções para usuário autenticado com endereços -->
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          onclick={selectSavedAddress}
          class="flex-1 p-4 border-2 rounded-lg transition-all hover:border-[#00BFB3]/50 
                 {addressMode === 'select' ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200'}"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div class="text-left">
              <p class="font-medium text-gray-900">Usar endereço salvo</p>
              <p class="text-sm text-gray-600">{userAddresses.length} endereço(s) disponível(eis)</p>
            </div>
          </div>
        </button>
        
        <button
          onclick={selectNewAddress}
          class="flex-1 p-4 border-2 rounded-lg transition-all hover:border-[#00BFB3]/50
                 {addressMode === 'new' ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200'}"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <div class="text-left">
              <p class="font-medium text-gray-900">Novo endereço</p>
              <p class="text-sm text-gray-600">Inserir um novo endereço</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  {:else if (currentUser || $isAuthenticated) && userAddresses.length === 0 && !loadingAddresses && addressMode !== 'new'}
    <!-- Usuário autenticado sem endereços -->
    <div class="p-6 bg-white border border-gray-200 rounded-lg">
      <div class="text-center">
        <svg class="w-12 h-12 text-[#00BFB3] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-[#00A89D] mb-2">Primeiro endereço</h3>
        <p class="text-[#00BFB3] text-sm mb-6">Cadastre seu endereço para acelerar futuras compras!</p>
        
        <button
          onclick={() => addressMode = 'new'}
          class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors font-medium flex items-center justify-center space-x-2 mx-auto"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Cadastrar endereço</span>
        </button>
      </div>
    </div>
  {:else if loadingAddresses}
    <!-- Loading de endereços -->
    <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div class="flex items-center space-x-3">
        <LoadingSpinner size="small" />
        <p class="text-gray-600">Carregando seus endereços...</p>
      </div>
    </div>
  {:else if isGuest}
    <!-- Usuário convidado -->
    <div class="p-6 bg-white border border-gray-200 rounded-lg">
      <div class="text-center">
        <svg class="w-12 h-12 text-[#00BFB3] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 class="text-lg font-semibold text-[#00A89D] mb-2">Endereço de entrega</h3>
        <p class="text-[#00BFB3] text-sm mb-6">Preencha seus dados de entrega para finalizar a compra.</p>
      </div>
    </div>
  {/if}
  
  {#if addressMode === 'select' && (currentUser || $isAuthenticated)}
    <!-- Seleção de endereços salvos -->
    {#if selectedAddress}
      <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 class="font-medium text-green-800 mb-2 flex items-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Endereço selecionado:
        </h3>
        <div class="text-sm text-green-700">
          <p class="font-semibold">{selectedAddress.name}</p>
          <p>{selectedAddress.street}, {selectedAddress.number}</p>
          {#if selectedAddress.complement}
            <p>{selectedAddress.complement}</p>
          {/if}
          <p>{selectedAddress.neighborhood} - {selectedAddress.city}/{selectedAddress.state}</p>
          <p>CEP: {selectedAddress.zipCode}</p>
        </div>
        <div class="flex gap-3 mt-3">
          <button
            onclick={() => showAddressManager = true}
            class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium flex items-center space-x-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Alterar endereço</span>
          </button>
          <button
            onclick={selectNewAddress}
            class="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center space-x-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Usar novo endereço</span>
          </button>
        </div>
      </div>
    {:else}
      <div class="p-6 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg">
        <div class="text-center">
          <svg class="w-10 h-10 text-[#00BFB3] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-[#00A89D] mb-2">Escolha um endereço</h3>
          <p class="text-[#00BFB3] text-sm mb-4">Você tem {userAddresses.length} endereço(s) cadastrado(s).</p>
          
          <button
            onclick={() => showAddressManager = true}
            class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors font-medium flex items-center justify-center space-x-2 mx-auto"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span>Escolher endereço</span>
          </button>
        </div>
      </div>
    {/if}
    
  {:else}
    <!-- Formulário manual de endereço -->
    <div class="space-y-4">
      <form class="space-y-4" onsubmit={(e) => e.preventDefault()}>
        <!-- Nome -->
        <div>
          <label for="checkout-name" class="block text-sm font-medium text-gray-700 mb-1">
            Nome completo *
          </label>
          <input
            id="checkout-name"
            type="text"
            bind:value={addressForm.name}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
            class:border-red-300={addressErrors.name}
            class:border-[#00BFB3]={addressForm.name && !addressErrors.name}
            placeholder="Nome de quem receberá o pedido"
          />
          {#if addressErrors.name}
            <p class="text-red-600 text-xs mt-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {addressErrors.name}
            </p>
          {:else if addressForm.name}
            <p class="text-[#00BFB3] text-xs mt-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Nome confirmado
            </p>
          {/if}
        </div>
        
        <!-- CEP -->
        <div>
          <label for="checkout-zipCode" class="block text-sm font-medium text-gray-700 mb-1">
            CEP *
          </label>
          <div class="relative">
            <input
              id="checkout-zipCode"
              type="text"
              value={addressForm.zipCode}
              oninput={handleCepInput}
              class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
              class:border-red-300={addressErrors.zipCode}
              class:border-[#00BFB3]={addressForm.zipCode && !addressErrors.zipCode}
              placeholder="00000-000"
              maxlength="9"
            />
            <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
              {#if loadingCep}
                <LoadingSpinner size="small" />
              {:else if addressForm.zipCode && addressForm.zipCode.replace(/\D/g, '').length === 8 && !addressErrors.zipCode}
                <svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </div>
          </div>
          {#if addressErrors.zipCode}
            <p class="text-red-600 text-xs mt-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {addressErrors.zipCode}
            </p>
          {:else if addressForm.zipCode && addressForm.zipCode.replace(/\D/g, '').length === 8}
            <p class="text-[#00BFB3] text-xs mt-1 flex items-center">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              CEP válido - endereço preenchido automaticamente
            </p>
          {:else if addressForm.zipCode}
            <p class="text-gray-500 text-xs mt-1">Digite os 8 dígitos do CEP</p>
          {/if}
        </div>
        
        <!-- Logradouro e Número -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label for="checkout-street" class="block text-sm font-medium text-gray-700 mb-1">
              Logradouro *
            </label>
            <input
              id="checkout-street"
              type="text"
              bind:value={addressForm.street}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
              class:border-red-300={addressErrors.street}
              class:border-[#00BFB3]={addressForm.street && !addressErrors.street}
              placeholder="Rua, Avenida, Praça..."
            />
            {#if addressErrors.street}
              <p class="text-red-600 text-xs mt-1">{addressErrors.street}</p>
            {/if}
          </div>
          
          <div>
            <label for="checkout-number" class="block text-sm font-medium text-gray-700 mb-1">
              Número *
            </label>
            <input
              id="checkout-number"
              type="text"
              bind:value={addressForm.number}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
              class:border-red-300={addressErrors.number}
              class:border-[#00BFB3]={addressForm.number && !addressErrors.number}
              placeholder="123"
            />
            {#if addressErrors.number}
              <p class="text-red-600 text-xs mt-1">{addressErrors.number}</p>
            {/if}
          </div>
        </div>
        
        <!-- Complemento -->
        <div>
          <label for="checkout-complement" class="block text-sm font-medium text-gray-700 mb-1">
            Complemento
            <span class="text-gray-400 text-xs">(opcional)</span>
          </label>
          <input
            id="checkout-complement"
            type="text"
            bind:value={addressForm.complement}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
            placeholder="Apto, Bloco, Sala, etc."
          />
          <p class="text-gray-500 text-xs mt-1">Ex: Apto 101, Bloco B, Sala 205</p>
        </div>
        
        <!-- Bairro -->
        <div>
          <label for="checkout-neighborhood" class="block text-sm font-medium text-gray-700 mb-1">
            Bairro *
          </label>
          <input
            id="checkout-neighborhood"
            type="text"
            bind:value={addressForm.neighborhood}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
            class:border-red-300={addressErrors.neighborhood}
            class:border-[#00BFB3]={addressForm.neighborhood && !addressErrors.neighborhood}
            placeholder="Nome do bairro"
          />
          {#if addressErrors.neighborhood}
            <p class="text-red-600 text-xs mt-1">{addressErrors.neighborhood}</p>
          {/if}
        </div>
        
        <!-- Cidade e Estado -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="checkout-city" class="block text-sm font-medium text-gray-700 mb-1">
              Cidade *
            </label>
            <input
              id="checkout-city"
              type="text"
              bind:value={addressForm.city}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
              class:border-red-300={addressErrors.city}
              class:border-[#00BFB3]={addressForm.city && !addressErrors.city}
              placeholder="Nome da cidade"
            />
            {#if addressErrors.city}
              <p class="text-red-600 text-xs mt-1">{addressErrors.city}</p>
            {/if}
          </div>
          
          <div>
            <label for="checkout-state" class="block text-sm font-medium text-gray-700 mb-1">
              Estado *
            </label>
            <select
              id="checkout-state"
              bind:value={addressForm.state}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
              class:border-red-300={addressErrors.state}
              class:border-[#00BFB3]={addressForm.state && !addressErrors.state}
            >
              <option value="">Selecione o estado</option>
              {#each states as state}
                <option value={state.value}>{state.label}</option>
              {/each}
            </select>
            {#if addressErrors.state}
              <p class="text-red-600 text-xs mt-1">{addressErrors.state}</p>
            {/if}
          </div>
        </div>
        
        <!-- Opção para salvar endereço -->
        {#if (currentUser || $isAuthenticated) && completionPercentage() >= 85}
          <div class="p-3 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-[#00A89D]">💾 Salvar este endereço?</p>
                <p class="text-xs text-[#00BFB3]">Acelere futuras compras salvando este endereço</p>
              </div>
              <button
                onclick={saveCurrentAddress}
                class="px-4 py-2 bg-[#00BFB3] text-white text-sm rounded-lg hover:bg-[#00A89D] transition-colors font-medium"
              >
                Salvar
              </button>
            </div>
          </div>
        {/if}
      </form>
    </div>
  {/if}
  
  <!-- Botão de continuar -->
  <button
    onclick={handleNext}
    disabled={addressMode === 'select' ? !selectedAddress : !isFormValid()}
    class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
  >
    <span>Continuar para Pagamento</span>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div>

<!-- Modal de Seleção de Endereços -->
{#if showAddressManager && (currentUser || $isAuthenticated)}
  <div 
    class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm" 
    onclick={() => showAddressManager = false}
    onkeydown={(e) => e.key === 'Escape' && (showAddressManager = false)}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div 
        class="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-100"
        role="document"
        onclick={(e) => e.stopPropagation()}
      >
        <!-- Header do Modal -->
        <div class="mb-6 pb-4 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 id="modal-title" class="text-xl font-bold text-gray-900">Meus Endereços</h3>
                <p class="text-sm text-gray-600">Escolha um endereço para entrega</p>
              </div>
            </div>
            <button
              onclick={() => showAddressManager = false}
              class="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
              aria-label="Fechar modal de seleção de endereços"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Conteúdo do Modal -->
        <div class="max-h-96 overflow-y-auto">
          <AddressManager
            userId={(currentUser || $user)?.id}
            addressType="shipping"
            mode="select"
            showHistory={false}
            on:addressSelected={handleAddressSelected}
          />
        </div>
        
        <!-- Footer do Modal (opcional) -->
        <div class="mt-6 pt-4 border-t border-gray-100">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>💡 Dica: Você pode gerenciar todos os seus endereços na sua conta</span>
            <div class="flex items-center space-x-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Seus dados estão seguros</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if} 