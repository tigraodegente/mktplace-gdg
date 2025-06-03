<script lang="ts">
	import { fade, scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { addressStore, addressLoading, formatFullAddress, getAddressLabel } from '$lib/services/addressService';
	import type { SavedAddress } from '$lib/services/addressService';
	import AddressForm from './AddressForm.svelte';
	
	interface AddressListProps {
		onSelectAddress?: (address: SavedAddress) => void;
		selectable?: boolean;
		selectedId?: string;
		showActions?: boolean;
		type?: 'shipping' | 'billing';
	}
	
	let { 
		onSelectAddress,
		selectable = false,
		selectedId = '',
		showActions = true,
		type = 'shipping'
	}: AddressListProps = $props();
	
	let showForm = $state(false);
	let editingAddress = $state<SavedAddress | null>(null);
	let isDeleting = $state<string | null>(null);
	
	// Filtrar endereços por tipo
	const filteredAddresses = $derived(
		$addressStore.filter(addr => !type || addr.type === type)
	);
	
	function handleAddNew() {
		editingAddress = null;
		showForm = true;
	}
	
	function handleEdit(address: SavedAddress) {
		editingAddress = address;
		showForm = true;
	}
	
	async function handleDelete(id: string, name: string) {
		if (!confirm(`Tem certeza que deseja remover o endereço "${name}"?`)) {
			return;
		}
		
		isDeleting = id;
		
		try {
			const success = await addressStore.remove(id);
			if (!success) {
				alert('Erro ao remover endereço');
			}
		} catch (error) {
			console.error('Erro ao remover endereço:', error);
			alert('Erro ao remover endereço');
		} finally {
			isDeleting = null;
		}
	}
	
	async function handleSetDefault(id: string) {
		try {
			const success = await addressStore.setDefault(id);
			if (!success) {
				alert('Erro ao marcar como padrão');
			}
		} catch (error) {
			console.error('Erro ao marcar como padrão:', error);
			alert('Erro ao marcar como padrão');
		}
	}
	
	function handleFormSuccess(address: SavedAddress) {
		showForm = false;
		editingAddress = null;
		
		// Se for selecionável e for um novo endereço, selecionar automaticamente
		if (selectable && onSelectAddress && !editingAddress) {
			onSelectAddress(address);
		}
	}
	
	function handleFormCancel() {
		showForm = false;
		editingAddress = null;
	}
</script>

<div class="space-y-4">
	<!-- Cabeçalho -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold text-gray-900">
			{type === 'shipping' ? 'Endereços de Entrega' : 'Endereços de Cobrança'}
		</h3>
		<button
			onclick={handleAddNew}
			class="px-4 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-lg hover:bg-[#00A89D] transition-colors flex items-center gap-2"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Novo Endereço
		</button>
	</div>
	
	<!-- Loading State -->
	{#if $addressLoading}
		<div class="flex items-center justify-center py-8">
			<div class="w-8 h-8 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
			<span class="ml-3 text-gray-600">Carregando endereços...</span>
		</div>
	{:else if filteredAddresses.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
			<svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<h4 class="text-lg font-medium text-gray-900 mb-2">Nenhum endereço cadastrado</h4>
			<p class="text-gray-600 mb-4">Adicione um endereço para facilitar seus pedidos</p>
			<button
				onclick={handleAddNew}
				class="px-6 py-3 bg-[#00BFB3] text-white font-medium rounded-lg hover:bg-[#00A89D] transition-colors"
			>
				Cadastrar Primeiro Endereço
			</button>
		</div>
	{:else}
		<!-- Lista de Endereços -->
		<div class="grid gap-4">
			{#each filteredAddresses as address (address.id)}
				<div 
					class="bg-white border rounded-lg p-4 transition-all duration-200 {
						selectable ? 'cursor-pointer hover:border-[#00BFB3] hover:shadow-md' : ''
					} {
						selectedId === address.id ? 'border-[#00BFB3] bg-[#00BFB3]/5 ring-2 ring-[#00BFB3]/20' : 'border-gray-200'
					}"
					onclick={() => {
						if (selectable && onSelectAddress) {
							onSelectAddress(address);
						}
					}}
					transition:slide={{ duration: 200, easing: cubicOut }}
				>
					<div class="flex items-start justify-between">
						<!-- Informações do Endereço -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-2">
								<h4 class="font-semibold text-gray-900">{address.name}</h4>
								
								{#if address.isDefault}
									<span class="inline-flex items-center px-2 py-1 bg-[#00BFB3]/10 text-[#00BFB3] text-xs font-medium rounded-full">
										<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
										Padrão
									</span>
								{/if}
								
								{#if selectable && selectedId === address.id}
									<span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
										Selecionado
									</span>
								{/if}
							</div>
							
							<p class="text-sm text-gray-600 mb-1">
								{address.street}, {address.number}
								{#if address.complement}
									, {address.complement}
								{/if}
							</p>
							
							<p class="text-sm text-gray-600 mb-1">
								{address.neighborhood} - {address.city}/{address.state}
							</p>
							
							<p class="text-sm text-gray-500">
								CEP: {address.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}
							</p>
							
							{#if address.phone}
								<p class="text-sm text-gray-500">
									Tel: {address.phone}
								</p>
							{/if}
						</div>
						
						<!-- Ações -->
						{#if showActions}
							<div class="flex items-center gap-2 ml-4">
								{#if !address.isDefault}
									<button
										onclick={(e) => {
											e.stopPropagation();
											handleSetDefault(address.id);
										}}
										class="p-2 text-gray-400 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 rounded-lg transition-colors"
										title="Marcar como padrão"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</button>
								{/if}
								
								<button
									onclick={(e) => {
										e.stopPropagation();
										handleEdit(address);
									}}
									class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
									title="Editar endereço"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								
								<button
									onclick={(e) => {
										e.stopPropagation();
										handleDelete(address.id, address.name);
									}}
									disabled={isDeleting === address.id}
									class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
									title="Remover endereço"
								>
									{#if isDeleting === address.id}
										<div class="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
									{:else}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									{/if}
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal do Formulário -->
{#if showForm}
	<!-- Overlay -->
	<div 
		class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
		onclick={handleFormCancel}
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal -->
		<div 
			class="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden"
			onclick={(e) => e.stopPropagation()}
			transition:scale={{ duration: 200, easing: cubicOut }}
		>
			<div class="p-6 border-b border-gray-200">
				<h3 class="text-lg font-semibold text-gray-900">
					{editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
				</h3>
			</div>
			
			<div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
				<AddressForm
					address={editingAddress}
					{type}
					onSuccess={handleFormSuccess}
					onCancel={handleFormCancel}
				/>
			</div>
		</div>
	</div>
{/if} 