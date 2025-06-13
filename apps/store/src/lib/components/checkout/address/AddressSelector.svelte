<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Address } from '$lib/types/checkout';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  interface Props {
    addresses: Address[];
    selectedAddress: Address | null;
    isLoading?: boolean;
    showAddNew?: boolean;
  }

  let {
    addresses = [],
    selectedAddress = null,
    isLoading = false,
    showAddNew = true
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    select: { address: Address };
    addNew: void;
    edit: { address: Address };
    delete: { address: Address };
  }>();

  function handleSelect(address: Address) {
    dispatch('select', { address });
  }

  function handleAddNew() {
    dispatch('addNew');
  }

  function handleEdit(address: Address) {
    dispatch('edit', { address });
  }

  function handleDelete(address: Address) {
    dispatch('delete', { address });
  }

  function formatAddress(address: Address): string {
    return `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}/${address.state}`;
  }
</script>

<div class="space-y-4">
  <h3 class="text-lg font-semibold text-gray-900">Endereços Salvos</h3>
  
  {#if isLoading}
    <div class="flex items-center justify-center py-8">
      <LoadingSpinner size="medium" />
    </div>
  {:else if addresses.length === 0}
    <div class="text-center py-8 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p class="text-lg font-medium mb-2">Nenhum endereço salvo</p>
      <p class="text-sm">Adicione um endereço para facilitar futuras compras</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each addresses as address (address.id)}
        <div class="border rounded-lg p-4 transition-all duration-200 hover:bg-gray-50 {
          selectedAddress?.id === address.id 
            ? 'border-[#00BFB3] bg-[#00BFB3]/5 ring-1 ring-[#00BFB3]/20' 
            : 'border-gray-200'
        }">
          <div class="flex items-start justify-between">
            <label class="flex items-start space-x-3 cursor-pointer flex-1">
              <input
                type="radio"
                name="selectedAddress"
                value={address.id}
                checked={selectedAddress?.id === address.id}
                onchange={() => handleSelect(address)}
                class="mt-1 text-[#00BFB3] focus:ring-[#00BFB3] focus:ring-offset-0"
              />
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-gray-900">{address.name}</span>
                  {#if address.isDefault}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00BFB3] text-white">
                      Padrão
                    </span>
                  {/if}

                </div>
                
                <p class="text-sm text-gray-600 mt-1">
                  {formatAddress(address)}
                </p>
                
                <p class="text-sm text-gray-500 mt-1">
                  CEP: {address.zipCode}
                </p>
              </div>
            </label>
            
            <div class="flex items-center space-x-2 ml-3">
              <button
                type="button"
                onclick={() => handleEdit(address)}
                class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Editar endereço"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                type="button"
                onclick={() => handleDelete(address)}
                class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Remover endereço"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if showAddNew}
    <button
      type="button"
      onclick={handleAddNew}
      class="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#00BFB3] hover:text-[#00BFB3] transition-colors flex items-center justify-center space-x-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span>Adicionar novo endereço</span>
    </button>
  {/if}
</div> 