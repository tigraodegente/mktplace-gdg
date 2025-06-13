<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { isAuthenticated, user } from '$lib/stores/authStore';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  
  const { currentUser = null, isGuest = false } = $props<{
    currentUser?: any;
    isGuest?: boolean;
  }>();
  
  const dispatch = createEventDispatcher();
  
  // Estados principais - SIMPLIFICADOS
  let addressMode = $state<'form' | 'select'>('form'); // Simplificado: só form ou select
  let selectedAddress = $state<any>(null);
  let showAddressModal = $state(false);
  let userAddresses = $state<any[]>([]);
  let loadingAddresses = $state(false);
  let loadingCep = $state(false);
  let savingAddress = $state(false);
  
  // 🎯 REFS PARA AUTO-SCROLL E FOCO
  let formContainer = $state<HTMLElement>();
  let nameInput = $state<HTMLInputElement>();
  let cepInput = $state<HTMLInputElement>();
  let streetInput = $state<HTMLInputElement>();
  
  // Formulário de endereço
  let addressForm = $state({
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    label: ''
  });
  
  // Validação
  let addressErrors = $state<Record<string, string>>({});
  
  // 📱 FUNÇÃO DE AUTO-SCROLL E FOCO INTELIGENTE
  function scrollToFormAndFocus(delay: number = 200) {
    if (typeof window === 'undefined') return;
    
    setTimeout(() => {
      if (!formContainer) return;
      
      // Detectar se é mobile
      const isMobile = window.innerWidth < 768;
      
      // Scroll para o formulário
      formContainer.scrollIntoView({
        behavior: 'smooth',
        block: isMobile ? 'start' : 'center',
        inline: 'nearest'
      });
      
      // Foco no primeiro campo após scroll
      setTimeout(() => {
        // Se não tem nome, focar no nome primeiro
        if (!addressForm.name && nameInput) {
          nameInput.focus();
        }
        // Senão, focar no CEP (campo mais importante)
        else if (cepInput) {
          cepInput.focus();
        }
      }, isMobile ? 600 : 400);
      
    }, delay);
  }
  
  // 🔍 SCROLL PARA PRIMEIRO ERRO COM FOCO
  function scrollToFirstError() {
    if (typeof window === 'undefined' || !formContainer) return;
    
    setTimeout(() => {
      const firstErrorField = formContainer?.querySelector('.border-red-300');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        // Focar no campo com erro
        setTimeout(() => {
          if (firstErrorField.tagName === 'INPUT') {
            (firstErrorField as HTMLInputElement).focus();
          }
        }, 300);
      }
    }, 100);
  }

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
    // Preencher nome se disponível
    if (currentUser?.name || $user?.name) {
      addressForm.name = currentUser?.name || $user?.name || '';
    }
    
    if (currentUser || $isAuthenticated) {
      await loadUserAddresses();
      
      // NOVA LÓGICA SIMPLIFICADA
      if (userAddresses.length > 0) {
        // Tem endereços salvos - mostrar seleção
        addressMode = 'select';
      } else {
        // Não tem endereços - ir direto para formulário
        addressMode = 'form';
        scrollToFormAndFocus(500);
      }
    } else {
      // Usuário convidado - sempre formulário
      addressMode = 'form';
      scrollToFormAndFocus(300);
    }
  });
  
  async function loadUserAddresses() {
    if (!currentUser && !$isAuthenticated) {
      return;
    }
    
    if (loadingAddresses) {
      return;
    }
    
    loadingAddresses = true;
    
    try {
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('/api/addresses', {
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 401) {
        userAddresses = [];
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        userAddresses = data.data || [];
      } else {
        console.error('❌ Erro ao carregar endereços:', data.error);
        userAddresses = [];
      }
    } catch (error) {
      console.error('❌ Erro na requisição de endereços:', error);
      userAddresses = [];
      
      if (error instanceof Error && error.name === 'AbortError') {
      }
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
  
  const isFormValid = $derived(() => {
    const errors = getValidationErrors();
    return Object.keys(errors).length === 0;
  });
  
  function validateAndSetErrors(): boolean {
    const errors = getValidationErrors();
    addressErrors = errors;
    
    // 🎯 Auto-scroll para primeiro erro
    if (Object.keys(errors).length > 0) {
      scrollToFirstError();
    }
    
    return Object.keys(errors).length === 0;
  }
  
  async function saveNewAddress() {
    if (!validateAndSetErrors()) return false;
    
    if (!currentUser && !$isAuthenticated) {
      return false;
    }
    
    savingAddress = true;
    
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
          label: addressForm.label || `Endereço ${userAddresses.length + 1}`,
          type: 'shipping',
          isDefault: userAddresses.length === 0 // Primeiro endereço é padrão
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadUserAddresses(); // Recarregar lista
        return true;
      } else {
        console.error('❌ Erro ao salvar endereço:', result.error);
        alert(`Erro ao salvar endereço: ${result.error?.message || 'Erro desconhecido'}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao salvar endereço:', error);
      alert('Erro ao salvar endereço. Verifique sua conexão e tente novamente.');
      return false;
    } finally {
      savingAddress = false;
    }
  }
  
  function selectAddress(address: any) {
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
      zipCode: address.zipCode,
      label: address.label || ''
    };
    
    
    // Fechar modal
    showAddressModal = false;
    
    // Voltar para modo formulário para mostrar o endereço selecionado
    addressMode = 'form';
  }
  
  function clearForm() {
    addressForm = {
      name: currentUser?.name || $user?.name || '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      label: ''
    };
    addressErrors = {};
    selectedAddress = null;
  }
  
  // 🎯 Função para alternar para formulário novo
  function startNewAddress() {
    clearForm();
    addressMode = 'form';
    scrollToFormAndFocus(150);
  }
  
  // 🎯 Função para mostrar endereços salvos
  function showSavedAddresses() {
    if (userAddresses.length > 0) {
      showAddressModal = true;
    } else {
      // Se não tem endereços, manter no formulário
      addressMode = 'form';
    }
  }
  
  async function handleNext() {
    // Validar formulário
    if (!validateAndSetErrors()) {
      return;
    }
    
    // Se usuário autenticado e quer salvar endereço
    const shouldSaveAddress = (currentUser || $isAuthenticated) && 
                             !selectedAddress && // Não é endereço já salvo
                             addressForm.zipCode && // Formulário preenchido
                             addressForm.street;
    
    if (shouldSaveAddress) {
      const saved = await saveNewAddress();
      if (!saved) {
        // Se falhou ao salvar, perguntar se quer continuar
        const continueAnyway = confirm('Erro ao salvar endereço. Deseja continuar sem salvar?');
        if (!continueAnyway) {
          return;
        }
      }
    }
    
    // Prosseguir com checkout
    const addressData = {
      name: addressForm.name,
      street: addressForm.street,
      number: addressForm.number,
      complement: addressForm.complement || '',
      neighborhood: addressForm.neighborhood,
      city: addressForm.city,
      state: addressForm.state,
      zipCode: addressForm.zipCode.replace(/\D/g, '')
    };
    
    
    dispatch('next', { 
      address: selectedAddress,
      addressData
    });
  }
  
  // Calcular progresso do preenchimento
  const completionPercentage = $derived(() => {
    const fields = [addressForm.name, addressForm.zipCode, addressForm.street, addressForm.number, addressForm.neighborhood, addressForm.city, addressForm.state];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  });
</script>

<div class="space-y-6">
  <!-- ============================================ -->
  <!-- SEÇÃO PRINCIPAL - SELEÇÃO DE MODO -->
  <!-- ============================================ -->
  
  {#if (currentUser || $isAuthenticated) && !isGuest}
    <!-- USUÁRIO AUTENTICADO -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">📍 Endereço de Entrega</h3>
      
      {#if loadingAddresses}
        <!-- CARREGANDO -->
        <div class="text-center py-8">
          <LoadingSpinner />
          <p class="text-gray-600 mt-4">Verificando seus endereços...</p>
        </div>
        
      {:else if userAddresses.length === 0}
        <!-- SEM ENDEREÇOS - DIRETO PARA FORMULÁRIO -->
        <div class="text-center py-4 mb-4">
          <div class="flex items-center justify-center space-x-2 text-[#00BFB3] mb-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span class="font-medium">Primeiro endereço</span>
          </div>
          <p class="text-sm text-gray-600">Preencha seus dados de entrega e eles serão salvos automaticamente</p>
        </div>
        
      {:else}
        <!-- COM ENDEREÇOS - OPÇÕES DE SELEÇÃO -->
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row gap-3">
            <!-- BOTÃO: USAR ENDEREÇO SALVO -->
            <button
              onclick={showSavedAddresses}
              class="flex-1 p-4 border-2 rounded-lg transition-all hover:border-[#00BFB3]/50 hover:shadow-md border-gray-200"
            >
              <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div class="text-left">
                  <p class="font-semibold text-gray-900">🏠 Escolher endereço salvo</p>
                  <p class="text-sm text-gray-600">{userAddresses.length} endereço(s) disponível(eis)</p>
                </div>
              </div>
            </button>
            
            <!-- BOTÃO: NOVO ENDEREÇO -->
            <button
              onclick={startNewAddress}
              class="flex-1 p-4 border-2 rounded-lg transition-all hover:border-[#00BFB3]/50 hover:shadow-md border-gray-200"
            >
              <div class="flex items-center space-x-3">
                <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <div class="text-left">
                  <p class="font-semibold text-gray-900">📍 Novo endereço</p>
                  <p class="text-sm text-gray-600">Cadastrar um novo endereço</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      {/if}
    </div>
    
  {:else if isGuest}
    <!-- USUÁRIO CONVIDADO -->
    <div class="bg-white rounded-xl border border-gray-200 p-6">
      <div class="text-center mb-6">
        <svg class="w-12 h-12 text-[#00BFB3] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 class="text-lg font-semibold text-[#00A89D] mb-2">📍 Endereço de Entrega</h3>
        <p class="text-[#00BFB3] text-sm">Preencha seus dados de entrega para finalizar a compra.</p>
      </div>
    </div>
  {/if}
  
  <!-- ============================================ -->
  <!-- ENDEREÇO SELECIONADO (PREVIEW) -->
  <!-- ============================================ -->
  
  {#if selectedAddress}
    <div class="bg-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6 mb-6">
      <h4 class="font-semibold text-[#00BFB3] mb-3 flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Endereço Selecionado: {selectedAddress.label || 'Endereço principal'}
      </h4>
      <div class="text-sm text-[#00BFB3] space-y-1">
        <p class="font-semibold">{selectedAddress.name}</p>
        <p>{selectedAddress.street}, {selectedAddress.number}</p>
        {#if selectedAddress.complement}
          <p>{selectedAddress.complement}</p>
        {/if}
        <p>{selectedAddress.neighborhood} - {selectedAddress.city}/{selectedAddress.state}</p>
        <p>CEP: {selectedAddress.zipCode}</p>
      </div>
      <div class="flex gap-3 mt-4">
        <button
          onclick={showSavedAddresses}
          class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium flex items-center space-x-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>Trocar endereço</span>
        </button>
        <button
          onclick={startNewAddress}
          class="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center space-x-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Novo endereço</span>
        </button>
      </div>
    </div>
  {/if}
</div>

<!-- ============================================ -->
<!-- MODAL DE SELEÇÃO DE ENDEREÇOS -->
<!-- ============================================ -->

{#if showAddressModal && (currentUser || $isAuthenticated)}
  <div 
    class="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm" 
    onclick={() => showAddressModal = false}
    onkeydown={(e) => e.key === 'Escape' && (showAddressModal = false)}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div 
        class="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-100"
        role="document"
        onclick={(e) => e.stopPropagation()}
      >
        <!-- HEADER DO MODAL -->
        <div class="mb-6 pb-4 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 id="modal-title" class="text-xl font-bold text-gray-900">Escolher Endereço</h3>
                <p class="text-sm text-gray-600">Selecione um endereço para entrega ou cadastre um novo</p>
              </div>
            </div>
            <button
              onclick={() => showAddressModal = false}
              class="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
              aria-label="Fechar modal de seleção de endereços"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- CONTEÚDO DO MODAL -->
        <div class="max-h-96 overflow-y-auto">
          {#if loadingAddresses}
            <!-- LOADING -->
            <div class="text-center py-12">
              <LoadingSpinner />
              <p class="text-gray-600 mt-4">Carregando seus endereços...</p>
            </div>
            
          {:else if userAddresses.length === 0}
            <!-- SEM ENDEREÇOS -->
            <div class="text-center py-12">
              <svg class="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h4 class="text-xl font-semibold text-gray-900 mb-3">Nenhum endereço encontrado</h4>
              <p class="text-gray-600 mb-8 max-w-md mx-auto">
                Você ainda não tem endereços salvos. Cadastre seu primeiro endereço para acelerar futuras compras!
              </p>
              
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onclick={() => {
                    showAddressModal = false;
                    startNewAddress();
                  }}
                  class="px-8 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors font-medium flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>📍 Cadastrar Primeiro Endereço</span>
                </button>
                
                <button
                  onclick={loadUserAddresses}
                  class="px-6 py-3 border-2 border-[#00BFB3] text-[#00BFB3] rounded-lg hover:bg-[#00BFB3] hover:text-white transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
            
          {:else}
            <!-- LISTA DE ENDEREÇOS -->
            <div class="space-y-4">
              <div class="flex items-center justify-between mb-4">
                <p class="text-sm text-gray-600">
                  {userAddresses.length} endereço(s) encontrado(s)
                </p>
                <button
                  onclick={loadUserAddresses}
                  class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium flex items-center space-x-1"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Atualizar</span>
                </button>
              </div>
              
              {#each userAddresses as address, index}
                <div 
                  role="button"
                  tabindex="0"
                  class="group p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-[#00BFB3]/50 hover:shadow-md
                         {selectedAddress?.id === address.id ? 'border-[#00BFB3] bg-[#00BFB3]/5 shadow-md' : 'border-gray-200'}"
                  onclick={() => {
                    selectAddress(address);
                    showAddressModal = false;
                  }}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      selectAddress(address);
                      showAddressModal = false;
                    }
                  }}
                >
                  <div class="flex items-start justify-between">
                    <!-- INFORMAÇÕES DO ENDEREÇO -->
                    <div class="flex-1">
                      <div class="flex items-center gap-3 mb-3">
                        <span class="text-base font-semibold text-gray-900">
                          {address.label || `Endereço ${index + 1}`}
                        </span>
                        {#if address.isDefault}
                          <span class="text-xs bg-[#00BFB3] text-white px-3 py-1 rounded-full font-medium">
                            Padrão
                          </span>
                        {/if}
                        {#if selectedAddress?.id === address.id}
                          <span class="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                            Selecionado
                          </span>
                        {/if}
                      </div>
                      
                      <div class="text-sm text-gray-700 space-y-1">
                        <p class="font-semibold text-gray-900">{address.name}</p>
                        <p>{address.street}, {address.number}</p>
                        {#if address.complement}
                          <p class="text-gray-600">{address.complement}</p>
                        {/if}
                        <p>{address.neighborhood} - {address.city}/{address.state}</p>
                        <p class="text-gray-600">CEP: {address.zipCode}</p>
                      </div>
                    </div>
                    
                    <!-- INDICADOR DE SELEÇÃO -->
                    <div class="ml-6 flex items-center">
                      {#if selectedAddress?.id === address.id}
                        <div class="w-8 h-8 bg-[#00BFB3] rounded-full flex items-center justify-center">
                          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      {:else}
                        <div class="w-8 h-8 border-2 border-gray-300 rounded-full group-hover:border-[#00BFB3] transition-colors"></div>
                      {/if}
                    </div>
                  </div>
                  
                  <!-- BOTÃO DE SELEÇÃO RÁPIDA -->
                  <div class="mt-4 pt-3 border-t border-gray-100">
                    <button class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium flex items-center space-x-1 group-hover:text-[#00A89D]">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Selecionar este endereço</span>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- FOOTER DO MODAL -->
        <div class="mt-8 pt-6 border-t border-gray-100">
          <div class="flex flex-col sm:flex-row gap-3 justify-between">
            <!-- BOTÃO: NOVO ENDEREÇO -->
            <button
              onclick={() => {
                showAddressModal = false;
                startNewAddress();
              }}
              class="flex-1 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#00BFB3] hover:text-[#00BFB3] transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>📍 Usar novo endereço</span>
            </button>
            
            {#if selectedAddress}
              <!-- BOTÃO: CONFIRMAR SELEÇÃO -->
              <button
                onclick={() => showAddressModal = false}
                class="flex-1 py-4 px-6 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Confirmar Endereço</span>
              </button>
            {/if}
          </div>
          
          <!-- INFO ADICIONAL -->
          <div class="mt-4 pt-4 border-t border-gray-50">
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>💡 Dica: Clique em qualquer endereço para selecioná-lo automaticamente</span>
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
  </div>
{/if}

<!-- ============================================ -->
<!-- FORMULÁRIO DE ENDEREÇO -->
<!-- ============================================ -->

<div bind:this={formContainer} class="bg-white rounded-xl border border-gray-200 p-6 scroll-mt-4">
  <div class="flex items-center justify-between mb-6">
    <h4 class="text-lg font-semibold text-gray-900">
      {selectedAddress ? '✏️ Editar Endereço Selecionado' : '📍 Preencher Endereço de Entrega'}
    </h4>
    {#if completionPercentage() > 0}
      <div class="flex items-center space-x-2 text-sm text-gray-600">
        <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full bg-[#00BFB3] transition-all duration-300"
            style="width: {completionPercentage()}%"
          ></div>
        </div>
        <span>{completionPercentage()}%</span>
      </div>
    {/if}
  </div>
  
  <form class="space-y-6" onsubmit={(e) => e.preventDefault()}>
    <!-- NOME -->
    <div>
      <label for="checkout-name" class="block text-sm font-medium text-gray-700 mb-2">
        Nome completo *
      </label>
      <input
        bind:this={nameInput}
        id="checkout-name"
        type="text"
        bind:value={addressForm.name}
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
        class:border-red-300={addressErrors.name}
        class:border-[#00BFB3]={addressForm.name && !addressErrors.name}
        placeholder="Nome de quem receberá o pedido"
      />
      {#if addressErrors.name}
        <p class="text-red-600 text-sm mt-1 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {addressErrors.name}
        </p>
      {:else if addressForm.name}
        <p class="text-[#00BFB3] text-sm mt-1 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Nome confirmado
        </p>
      {/if}
    </div>
    
    <!-- CEP -->
    <div>
      <label for="checkout-zipCode" class="block text-sm font-medium text-gray-700 mb-2">
        CEP *
      </label>
      <div class="relative">
        <input
          bind:this={cepInput}
          id="checkout-zipCode"
          type="text"
          value={addressForm.zipCode}
          oninput={handleCepInput}
          class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
          class:border-red-300={addressErrors.zipCode}
          class:border-[#00BFB3]={addressForm.zipCode && !addressErrors.zipCode}
          placeholder="00000-000"
          maxlength="9"
        />
        <div class="absolute right-4 top-1/2 transform -translate-y-1/2">
          {#if loadingCep}
            <LoadingSpinner size="small" />
          {:else if addressForm.zipCode && addressForm.zipCode.replace(/\D/g, '').length === 8 && !addressErrors.zipCode}
            <svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {/if}
        </div>
      </div>
      {#if addressErrors.zipCode}
        <p class="text-red-600 text-sm mt-1 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {addressErrors.zipCode}
        </p>
      {:else if addressForm.zipCode && addressForm.zipCode.replace(/\D/g, '').length === 8}
        <p class="text-[#00BFB3] text-sm mt-1 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          CEP válido - endereço preenchido automaticamente
        </p>
      {:else if addressForm.zipCode}
        <p class="text-gray-500 text-sm mt-1">Digite os 8 dígitos do CEP</p>
      {/if}
    </div>
    
    <!-- LOGRADOURO E NÚMERO -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="md:col-span-2">
        <label for="checkout-street" class="block text-sm font-medium text-gray-700 mb-2">
          Logradouro *
        </label>
        <input
          bind:this={streetInput}
          id="checkout-street"
          type="text"
          bind:value={addressForm.street}
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
          class:border-red-300={addressErrors.street}
          class:border-[#00BFB3]={addressForm.street && !addressErrors.street}
          placeholder="Rua, Avenida, Praça..."
        />
        {#if addressErrors.street}
          <p class="text-red-600 text-sm mt-1">{addressErrors.street}</p>
        {/if}
      </div>
      
      <div>
        <label for="checkout-number" class="block text-sm font-medium text-gray-700 mb-2">
          Número *
        </label>
        <input
          id="checkout-number"
          type="text"
          bind:value={addressForm.number}
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
          class:border-red-300={addressErrors.number}
          class:border-[#00BFB3]={addressForm.number && !addressErrors.number}
          placeholder="123"
        />
        {#if addressErrors.number}
          <p class="text-red-600 text-sm mt-1">{addressErrors.number}</p>
        {/if}
      </div>
    </div>
    
    <!-- COMPLEMENTO -->
    <div>
      <label for="checkout-complement" class="block text-sm font-medium text-gray-700 mb-2">
        Complemento
        <span class="text-gray-400 text-sm">(opcional)</span>
      </label>
      <input
        id="checkout-complement"
        type="text"
        bind:value={addressForm.complement}
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
        placeholder="Apto, Bloco, Sala, etc."
      />
      <p class="text-gray-500 text-sm mt-1">Ex: Apto 101, Bloco B, Sala 205</p>
    </div>
    
    <!-- BAIRRO -->
    <div>
      <label for="checkout-neighborhood" class="block text-sm font-medium text-gray-700 mb-2">
        Bairro *
      </label>
      <input
        id="checkout-neighborhood"
        type="text"
        bind:value={addressForm.neighborhood}
        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
        class:border-red-300={addressErrors.neighborhood}
        class:border-[#00BFB3]={addressForm.neighborhood && !addressErrors.neighborhood}
        placeholder="Nome do bairro"
      />
      {#if addressErrors.neighborhood}
        <p class="text-red-600 text-sm mt-1">{addressErrors.neighborhood}</p>
      {/if}
    </div>
    
    <!-- CIDADE E ESTADO -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="checkout-city" class="block text-sm font-medium text-gray-700 mb-2">
          Cidade *
        </label>
        <input
          id="checkout-city"
          type="text"
          bind:value={addressForm.city}
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
          class:border-red-300={addressErrors.city}
          class:border-[#00BFB3]={addressForm.city && !addressErrors.city}
          placeholder="Nome da cidade"
        />
        {#if addressErrors.city}
          <p class="text-red-600 text-sm mt-1">{addressErrors.city}</p>
        {/if}
      </div>
      
      <div>
        <label for="checkout-state" class="block text-sm font-medium text-gray-700 mb-2">
          Estado *
        </label>
        <select
          id="checkout-state"
          bind:value={addressForm.state}
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
          class:border-red-300={addressErrors.state}
          class:border-[#00BFB3]={addressForm.state && !addressErrors.state}
        >
          <option value="">Selecione o estado</option>
          {#each states as state}
            <option value={state.value}>{state.label}</option>
          {/each}
        </select>
        {#if addressErrors.state}
          <p class="text-red-600 text-sm mt-1">{addressErrors.state}</p>
        {/if}
      </div>
    </div>
    
    <!-- INFORMAÇÃO SOBRE SALVAMENTO AUTOMÁTICO -->
    {#if (currentUser || $isAuthenticated) && !selectedAddress && completionPercentage() >= 70}
      <div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-4">
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-[#00A89D]">
              💾 Salvamento automático ativado
            </p>
            <p class="text-xs text-[#00BFB3] mt-1">
              Este endereço será salvo automaticamente para acelerar suas próximas compras
            </p>
          </div>
        </div>
      </div>
    {/if}
  </form>
</div>

<!-- ============================================ -->
<!-- BOTÃO DE CONTINUAR -->
<!-- ============================================ -->

<div class="bg-white rounded-xl border border-gray-200 p-6">
  <button
    onclick={handleNext}
    disabled={!isFormValid() || savingAddress}
    class="w-full py-4 px-6 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
  >
    {#if savingAddress}
      <LoadingSpinner size="small" />
      <span>Salvando endereço...</span>
    {:else}
      <span>Continuar para Pagamento</span>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    {/if}
  </button>
  
  {#if !isFormValid()}
    <p class="text-gray-500 text-sm text-center mt-2">
      Preencha todos os campos obrigatórios para continuar
    </p>
  {/if}
</div> 