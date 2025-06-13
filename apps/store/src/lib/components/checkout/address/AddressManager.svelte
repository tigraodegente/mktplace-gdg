<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Address } from '$lib/types/checkout';
  import { isAuthenticated, user } from '$lib/stores/authStore';
  import { toastStore } from '$lib/stores/toastStore';
  import AddressSelector from './AddressSelector.svelte';
  import AddressForm from './AddressForm.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  interface Props {
    currentUser?: any;
    isGuest?: boolean;
    selectedAddress?: Address | null;
    mode?: 'select' | 'new' | 'edit';
  }

  let {
    currentUser = null,
    isGuest = false,
    selectedAddress = null,
    mode = 'select'
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    next: { addressData: Address };
    back: void;
  }>();

  // Estado local
  let addresses = $state<Address[]>([]);
  let currentMode = $state(mode);
  let editingAddress = $state<Address | null>(null);
  let isLoading = $state(false);
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});

  // Carregar endereços ao montar o componente
  $effect(() => {
    if ($isAuthenticated && !isGuest) {
      loadAddresses();
    }
  });

  async function loadAddresses() {
    if (isGuest || !$isAuthenticated) return;

    isLoading = true;
    try {
      const response = await fetch('/api/addresses', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        addresses = result.data || [];
        
        // Se não há endereço selecionado, usar o padrão
        if (!selectedAddress && addresses.length > 0) {
          const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
          selectedAddress = defaultAddress;
        }
      } else {
        console.warn('Erro ao carregar endereços:', response.statusText);
        addresses = [];
      }
    } catch (error) {
      console.error('Erro ao carregar endereços:', error);
      addresses = [];
    } finally {
      isLoading = false;
    }
  }

  function handleAddressSelect(event: CustomEvent) {
    selectedAddress = event.detail.address;
    errors = {};
  }

  function handleAddNew() {
    currentMode = 'new';
    editingAddress = null;
    errors = {};
  }

  function handleEdit(event: CustomEvent) {
    editingAddress = event.detail.address;
    currentMode = 'edit';
    errors = {};
  }

  async function handleDelete(event: CustomEvent) {
    const address = event.detail.address;
    
    if (!confirm(`Tem certeza que deseja remover o endereço de ${address.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/addresses/${address.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        addresses = addresses.filter(addr => addr.id !== address.id);
        
        // Se o endereço removido estava selecionado, limpar seleção
        if (selectedAddress?.id === address.id) {
          selectedAddress = addresses.length > 0 ? addresses[0] : null;
        }

        toastStore.add({
          type: 'success',
          title: 'Endereço removido',
          message: 'O endereço foi removido com sucesso',
          duration: 3000
        });
      } else {
        throw new Error('Erro ao remover endereço');
      }
    } catch (error) {
      console.error('Erro ao remover endereço:', error);
      toastStore.add({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível remover o endereço',
        duration: 4000
      });
    }
  }

  async function handleFormSubmit(event: CustomEvent) {
    const { address, shouldSave } = event.detail;
    isSubmitting = true;
    errors = {};

    try {
      // Para convidados ou se não deve salvar, apenas continuar
      if (isGuest || !shouldSave) {
        selectedAddress = address;
        dispatch('next', { addressData: address });
        return;
      }

             // Salvar endereço para usuários logados
       const isEditing = !!editingAddress;
       const url = isEditing ? `/api/addresses/${editingAddress!.id}` : '/api/addresses';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(address)
      });

      if (response.ok) {
        const result = await response.json();
        const savedAddress = result.data;

        if (isEditing) {
          // Atualizar endereço na lista
          addresses = addresses.map(addr => 
            addr.id === savedAddress.id ? savedAddress : addr
          );
        } else {
          // Adicionar novo endereço
          addresses = [savedAddress, ...addresses];
        }

        selectedAddress = savedAddress;
        currentMode = 'select';
        editingAddress = null;

        toastStore.add({
          type: 'success',
          title: isEditing ? 'Endereço atualizado' : 'Endereço salvo',
          message: 'O endereço foi salvo com sucesso',
          duration: 3000
        });

        // Continuar para próxima etapa
        dispatch('next', { addressData: savedAddress });
      } else {
        const errorData = await response.json();
        
        if (errorData.errors) {
          errors = errorData.errors;
        } else {
          throw new Error(errorData.message || 'Erro ao salvar endereço');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toastStore.add({
        type: 'error',
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Erro ao salvar endereço',
        duration: 4000
      });
    } finally {
      isSubmitting = false;
    }
  }

  function handleFormCancel() {
    currentMode = 'select';
    editingAddress = null;
    errors = {};
  }

  function handleContinue() {
    if (!selectedAddress) {
      toastStore.add({
        type: 'warning',
        title: 'Endereço obrigatório',
        message: 'Por favor, selecione ou adicione um endereço de entrega',
        duration: 4000
      });
      return;
    }

    dispatch('next', { addressData: selectedAddress });
  }

  function handleBack() {
    dispatch('back');
  }

  // Verificar se deve mostrar seletor ou formulário
  const showSelector = $derived(
    currentMode === 'select' && 
    !isGuest && 
    $isAuthenticated &&
    addresses.length > 0
  );

  const showForm = $derived(
    currentMode === 'new' || 
    currentMode === 'edit' ||
    (currentMode === 'select' && (isGuest || !$isAuthenticated || addresses.length === 0))
  );
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-semibold text-gray-900">Endereço de Entrega</h2>
    
    {#if currentMode !== 'select'}
      <button
        type="button"
        onclick={handleFormCancel}
        class="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Voltar à seleção</span>
      </button>
    {/if}
  </div>

  <!-- Loading state -->
  {#if isLoading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <LoadingSpinner size="large" />
        <p class="mt-2 text-sm text-gray-500">Carregando endereços...</p>
      </div>
    </div>
  
  <!-- Address Selector -->
  {:else if showSelector}
    <AddressSelector
      {addresses}
      {selectedAddress}
      on:select={handleAddressSelect}
      on:addNew={handleAddNew}
      on:edit={handleEdit}
      on:delete={handleDelete}
    />
    
    <!-- Continue button -->
    <div class="flex justify-between items-center pt-6 border-t border-gray-200">
      <button
        type="button"
        onclick={handleBack}
        class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Voltar
      </button>
      
      <button
        type="button"
        onclick={handleContinue}
        disabled={!selectedAddress}
        class="px-6 py-2 text-sm font-medium text-white bg-[#00BFB3] border border-transparent rounded-lg hover:bg-[#00A89D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continuar para Pagamento
      </button>
    </div>

  <!-- Address Form -->
  {:else if showForm}
         <AddressForm
       address={editingAddress || undefined}
       isLoading={isSubmitting}
       {errors}
       showSaveOption={!isGuest && $isAuthenticated}
       saveLabel={currentMode === 'edit' ? 'Atualizar endereço salvo' : 'Salvar endereço para futuras compras'}
       on:submit={handleFormSubmit}
       on:cancel={handleFormCancel}
     />
  {/if}

  <!-- Info for guests -->
  {#if isGuest}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start space-x-3">
        <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm text-blue-800">
          <p class="font-medium mb-1">Comprando como convidado</p>
          <p>
            Para salvar endereços e facilitar futuras compras,
            <a href="/login" class="underline hover:text-blue-900">faça login</a>
            ou
            <a href="/registro" class="underline hover:text-blue-900">crie uma conta</a>.
          </p>
        </div>
      </div>
    </div>
  {/if}
</div> 