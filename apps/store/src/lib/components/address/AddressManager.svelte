<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	
	const dispatch = createEventDispatcher<{
		addressSelected: { address: Address };
		addressSaved: { address: Address };
		addressDeleted: { id: string };
	}>();
	
	export let userId: string | null = null;
	export let selectedAddressId: string | null = null;
	export let mode: 'view' | 'select' | 'manage' = 'manage';
	export let addressType: 'shipping' | 'billing' = 'shipping';
	export let showHistory: boolean = true;
	
	interface Address {
		id?: string;
		type: 'shipping' | 'billing';
		name: string;
		street: string;
		number: string;
		complement?: string;
		neighborhood: string;
		city: string;
		state: string;
		zipCode: string;
		isDefault: boolean;
		label?: string;
		createdAt?: string;
		updatedAt?: string;
	}
	
	// Estados
	let addresses: Address[] = [];
	let addressHistory: Address[] = [];
	let loading = false;
	let saving = false;
	let error: string | null = null;
	let showForm = false;
	let editingAddress: Address | null = null;
	let loadingCep = false;
	
	// Formulário
	let formData: Address = {
		type: addressType,
		name: '',
		street: '',
		number: '',
		complement: '',
		neighborhood: '',
		city: '',
		state: '',
		zipCode: '',
		isDefault: false,
		label: ''
	};
	
	let formErrors: Record<string, string> = {};
	
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
	
	const addressLabels = [
		{ value: 'casa', label: '🏠 Casa', icon: '🏠' },
		{ value: 'trabalho', label: '🏢 Trabalho', icon: '🏢' },
		{ value: 'outro', label: '📍 Outro', icon: '📍' }
	];
	
	onMount(() => {
		loadAddresses();
		if (showHistory) {
			loadAddressHistory();
		}
	});
	
	async function loadAddresses() {
		loading = true;
		error = null;
		
		try {
			const response = await fetch('/api/addresses');
			const data = await response.json();
			
			if (data.success) {
				addresses = data.data.filter((addr: Address) => addr.type === addressType);
			} else {
				error = data.error?.message || 'Erro ao carregar endereços';
			}
		} catch (err) {
			error = 'Erro de conexão ao carregar endereços';
			console.error('Erro ao carregar endereços:', err);
		} finally {
			loading = false;
		}
	}
	
	async function loadAddressHistory() {
		try {
			const response = await fetch(`/api/addresses/history?type=${addressType}&limit=10`);
			const data = await response.json();
			
			if (data.success) {
				addressHistory = data.data;
			}
		} catch (err) {
			console.error('Erro ao carregar histórico:', err);
		}
	}
	
	// Buscar CEP
	async function searchCep() {
		const cleanCep = formData.zipCode.replace(/\D/g, '');
		if (cleanCep.length !== 8) return;
		
		loadingCep = true;
		
		try {
			const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
			const data = await response.json();
			
			if (!data.erro) {
				formData.street = data.logradouro || formData.street;
				formData.neighborhood = data.bairro || formData.neighborhood;
				formData.city = data.localidade || formData.city;
				formData.state = data.uf || formData.state;
				
				// Limpar erros relacionados
				delete formErrors.street;
				delete formErrors.neighborhood;
				delete formErrors.city;
				delete formErrors.state;
			} else {
				formErrors.zipCode = 'CEP não encontrado';
			}
		} catch (error) {
			console.error('Erro ao buscar CEP:', error);
			formErrors.zipCode = 'Erro ao buscar CEP';
		} finally {
			loadingCep = false;
		}
	}
	
	function maskCep(value: string): string {
		return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
	}
	
	function handleCepInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const masked = maskCep(target.value);
		formData.zipCode = masked;
		target.value = masked;
		
		if (masked.replace(/\D/g, '').length === 8) {
			searchCep();
		}
	}
	
	function validateForm(): boolean {
		formErrors = {};
		
		if (!formData.name.trim()) formErrors.name = 'Nome é obrigatório';
		if (!formData.zipCode.trim() || formData.zipCode.replace(/\D/g, '').length !== 8) {
			formErrors.zipCode = 'CEP deve ter 8 dígitos';
		}
		if (!formData.street.trim()) formErrors.street = 'Logradouro é obrigatório';
		if (!formData.number.trim()) formErrors.number = 'Número é obrigatório';
		if (!formData.neighborhood.trim()) formErrors.neighborhood = 'Bairro é obrigatório';
		if (!formData.city.trim()) formErrors.city = 'Cidade é obrigatória';
		if (!formData.state.trim()) formErrors.state = 'Estado é obrigatório';
		
		return Object.keys(formErrors).length === 0;
	}
	
	async function saveAddress() {
		if (!validateForm()) return;
		
		saving = true;
		error = null;
		
		try {
			const url = editingAddress ? `/api/addresses/${editingAddress.id}` : '/api/addresses';
			const method = editingAddress ? 'PUT' : 'POST';
			
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});
			
			const data = await response.json();
			
			if (data.success) {
				await loadAddresses();
				if (showHistory) await loadAddressHistory();
				
				resetForm();
				dispatch('addressSaved', { address: data.data });
			} else {
				error = data.error?.message || 'Erro ao salvar endereço';
			}
		} catch (err) {
			error = 'Erro de conexão ao salvar endereço';
			console.error('Erro ao salvar endereço:', err);
		} finally {
			saving = false;
		}
	}
	
	async function deleteAddress(id: string) {
		if (!confirm('Tem certeza que deseja excluir este endereço?')) return;
		
		try {
			const response = await fetch(`/api/addresses/${id}`, {
				method: 'DELETE'
			});
			
			const data = await response.json();
			
			if (data.success) {
				await loadAddresses();
				if (showHistory) await loadAddressHistory();
				dispatch('addressDeleted', { id });
			} else {
				error = data.error?.message || 'Erro ao excluir endereço';
			}
		} catch (err) {
			error = 'Erro de conexão ao excluir endereço';
			console.error('Erro ao excluir endereço:', err);
		}
	}
	
	async function setDefaultAddress(id: string) {
		try {
			const response = await fetch(`/api/addresses/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isDefault: true })
			});
			
			const data = await response.json();
			
			if (data.success) {
				await loadAddresses();
			} else {
				error = data.error?.message || 'Erro ao definir endereço padrão';
			}
		} catch (err) {
			error = 'Erro de conexão';
			console.error('Erro ao definir endereço padrão:', err);
		}
	}
	
	function editAddress(address: Address) {
		editingAddress = address;
		formData = { ...address };
		showForm = true;
	}
	
	function resetForm() {
		editingAddress = null;
		formData = {
			type: addressType,
			name: '',
			street: '',
			number: '',
			complement: '',
			neighborhood: '',
			city: '',
			state: '',
			zipCode: '',
			isDefault: false,
			label: ''
		};
		formErrors = {};
		showForm = false;
	}
	
	function selectAddress(address: Address) {
		selectedAddressId = address.id!;
		dispatch('addressSelected', { address });
	}
	
	function getAddressLabel(address: Address): string {
		if (address.label) {
			const label = addressLabels.find(l => l.value === address.label);
			return label ? label.label : `📍 ${address.label}`;
		}
		return `📍 ${address.neighborhood}, ${address.city}`;
	}
	
	function formatAddress(address: Address): string {
		const parts = [
			address.street,
			address.number,
			address.complement,
			address.neighborhood,
			address.city,
			address.state,
			address.zipCode
		].filter(Boolean);
		
		return parts.join(', ');
	}
	
	function timeAgo(date: string): string {
		const now = new Date();
		const past = new Date(date);
		const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
		
		if (diffInMinutes < 1) return 'agora mesmo';
		if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
		if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`;
		return `${Math.floor(diffInMinutes / 1440)}d atrás`;
	}
</script>

<div class="address-manager">
	<!-- Error Alert -->
	{#if error}
		<div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4" transition:slide>
			<div class="flex">
				<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
				</svg>
				<div class="ml-3">
					<p class="text-sm text-red-800">{error}</p>
				</div>
				<button class="ml-auto text-red-400 hover:text-red-600" onclick={() => error = null}>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
	
	<!-- Header com botão adicionar -->
	{#if mode === 'manage'}
		<div class="flex items-center justify-between mb-6">
			<div>
				<h2 class="text-xl font-bold text-gray-900">
					{addressType === 'shipping' ? 'Endereços de Entrega' : 'Endereços de Cobrança'}
				</h2>
				<p class="text-gray-600 text-sm mt-1">
					{addresses.length === 0 ? 'Nenhum endereço cadastrado' : `${addresses.length} endereço(s) cadastrado(s)`}
				</p>
			</div>
			
			<button
				onclick={() => showForm = true}
				class="flex items-center gap-2 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				Novo Endereço
			</button>
		</div>
	{/if}
	
	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<LoadingSpinner />
			<span class="ml-3 text-gray-600">Carregando endereços...</span>
		</div>
	{:else}
		<!-- Lista de Endereços -->
		<div class="space-y-4 mb-8">
			{#each addresses as address (address.id)}
				<div 
					class="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
					class:ring-2={mode === 'select' && selectedAddressId === address.id}
					class:ring-[#00BFB3]={mode === 'select' && selectedAddressId === address.id}
					class:border-[#00BFB3]={mode === 'select' && selectedAddressId === address.id}
					transition:fade
				>
					<div class="flex items-start justify-between">
						<div class="flex-1" class:cursor-pointer={mode === 'select'} onclick={() => mode === 'select' && selectAddress(address)}>
							<!-- Label e Badge Padrão -->
							<div class="flex items-center gap-2 mb-2">
								<span class="text-lg">{getAddressLabel(address)}</span>
								{#if address.isDefault}
									<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
										Padrão
									</span>
								{/if}
								{#if mode === 'select' && selectedAddressId === address.id}
									<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#00BFB3] text-white">
										Selecionado
									</span>
								{/if}
							</div>
							
							<!-- Nome e Endereço -->
							<div class="space-y-1">
								<p class="font-medium text-gray-900">{address.name}</p>
								<p class="text-gray-600 text-sm">{formatAddress(address)}</p>
							</div>
						</div>
						
						<!-- Ações -->
						{#if mode === 'manage'}
							<div class="flex items-center gap-2 ml-4">
								{#if !address.isDefault}
									<button
										onclick={() => setDefaultAddress(address.id!)}
										class="p-2 text-gray-400 hover:text-[#00BFB3] rounded-lg hover:bg-gray-50"
										title="Definir como padrão"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
										</svg>
									</button>
								{/if}
								
								<button
									onclick={() => editAddress(address)}
									class="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-50"
									title="Editar"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								
								<button
									onclick={() => deleteAddress(address.id!)}
									class="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"
									title="Excluir"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						{:else if mode === 'select'}
							<div class="ml-4">
								<input
									type="radio"
									checked={selectedAddressId === address.id}
									onchange={() => selectAddress(address)}
									class="w-4 h-4 text-[#00BFB3] border-gray-300 focus:ring-[#00BFB3]"
								/>
							</div>
						{/if}
					</div>
				</div>
			{/each}
			
			{#if addresses.length === 0 && !loading}
				<div class="text-center py-12 bg-gray-50 rounded-lg">
					<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum endereço cadastrado</h3>
					<p class="text-gray-600 mb-4">Adicione seu primeiro endereço de {addressType === 'shipping' ? 'entrega' : 'cobrança'}</p>
					{#if mode === 'manage'}
						<button
							onclick={() => showForm = true}
							class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
						>
							Adicionar Endereço
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
	
	<!-- Histórico de Endereços -->
	{#if showHistory && addressHistory.length > 0 && mode === 'manage'}
		<div class="border-t pt-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Endereços Recentes</h3>
			<div class="space-y-2">
				{#each addressHistory.slice(0, 5) as historyAddress}
					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex-1">
							<p class="text-sm font-medium text-gray-900">{historyAddress.name}</p>
							<p class="text-xs text-gray-600">{formatAddress(historyAddress)}</p>
						</div>
						<div class="text-xs text-gray-500">
							{#if historyAddress.updatedAt}
								{timeAgo(historyAddress.updatedAt)}
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Modal Formulário -->
{#if showForm}
	<div class="fixed inset-0 z-50 overflow-y-auto" transition:fade>
		<div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
			<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick={resetForm}></div>
			
			<span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
			
			<div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
				<div class="mb-4">
					<h3 class="text-lg font-medium text-gray-900">
						{editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
					</h3>
					<p class="text-sm text-gray-600 mt-1">
						Preencha os dados do seu endereço de {addressType === 'shipping' ? 'entrega' : 'cobrança'}
					</p>
				</div>
				
				<form onsubmit={saveAddress} class="space-y-4">
					<!-- Nome -->
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
							Nome completo *
						</label>
						<input
							id="name"
							type="text"
							bind:value={formData.name}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
							class:border-red-300={formErrors.name}
							placeholder="Seu nome completo"
						/>
						{#if formErrors.name}
							<p class="text-red-600 text-xs mt-1">{formErrors.name}</p>
						{/if}
					</div>
					
					<!-- Label -->
					<div>
						<label for="label" class="block text-sm font-medium text-gray-700 mb-1">
							Etiqueta
						</label>
						<select
							id="label"
							bind:value={formData.label}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
						>
							<option value="">Selecione uma etiqueta</option>
							{#each addressLabels as label}
								<option value={label.value}>{label.label}</option>
							{/each}
						</select>
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
								value={formData.zipCode}
								oninput={handleCepInput}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
								class:border-red-300={formErrors.zipCode}
								placeholder="00000-000"
								maxlength="9"
							/>
							{#if loadingCep}
								<div class="absolute right-3 top-1/2 transform -translate-y-1/2">
									<LoadingSpinner size="small" />
								</div>
							{/if}
						</div>
						{#if formErrors.zipCode}
							<p class="text-red-600 text-xs mt-1">{formErrors.zipCode}</p>
						{/if}
					</div>
					
					<!-- Logradouro e Número -->
					<div class="grid grid-cols-3 gap-3">
						<div class="col-span-2">
							<label for="street" class="block text-sm font-medium text-gray-700 mb-1">
								Logradouro *
							</label>
							<input
								id="street"
								type="text"
								bind:value={formData.street}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
								class:border-red-300={formErrors.street}
								placeholder="Rua, Avenida, etc."
							/>
							{#if formErrors.street}
								<p class="text-red-600 text-xs mt-1">{formErrors.street}</p>
							{/if}
						</div>
						
						<div>
							<label for="number" class="block text-sm font-medium text-gray-700 mb-1">
								Número *
							</label>
							<input
								id="number"
								type="text"
								bind:value={formData.number}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
								class:border-red-300={formErrors.number}
								placeholder="123"
							/>
							{#if formErrors.number}
								<p class="text-red-600 text-xs mt-1">{formErrors.number}</p>
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
							bind:value={formData.complement}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
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
							bind:value={formData.neighborhood}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
							class:border-red-300={formErrors.neighborhood}
							placeholder="Nome do bairro"
						/>
						{#if formErrors.neighborhood}
							<p class="text-red-600 text-xs mt-1">{formErrors.neighborhood}</p>
						{/if}
					</div>
					
					<!-- Cidade e Estado -->
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="city" class="block text-sm font-medium text-gray-700 mb-1">
								Cidade *
							</label>
							<input
								id="city"
								type="text"
								bind:value={formData.city}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
								class:border-red-300={formErrors.city}
								placeholder="Nome da cidade"
							/>
							{#if formErrors.city}
								<p class="text-red-600 text-xs mt-1">{formErrors.city}</p>
							{/if}
						</div>
						
						<div>
							<label for="state" class="block text-sm font-medium text-gray-700 mb-1">
								Estado *
							</label>
							<select
								id="state"
								bind:value={formData.state}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
								class:border-red-300={formErrors.state}
							>
								<option value="">Selecione</option>
								{#each states as state}
									<option value={state.value}>{state.label}</option>
								{/each}
							</select>
							{#if formErrors.state}
								<p class="text-red-600 text-xs mt-1">{formErrors.state}</p>
							{/if}
						</div>
					</div>
					
					<!-- Endereço Padrão -->
					{#if addresses.length > 0}
						<div class="flex items-center">
							<input
								id="isDefault"
								type="checkbox"
								bind:checked={formData.isDefault}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
							/>
							<label for="isDefault" class="ml-2 text-sm text-gray-700">
								Definir como endereço padrão
							</label>
						</div>
					{:else}
						<input type="hidden" bind:value={formData.isDefault} />
						<script>formData.isDefault = true;</script>
					{/if}
					
					<!-- Botões -->
					<div class="flex justify-end space-x-3 pt-4">
						<button
							type="button"
							onclick={resetForm}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if saving}
								<LoadingSpinner size="small" />
							{/if}
							{saving ? 'Salvando...' : (editingAddress ? 'Atualizar' : 'Salvar')}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.address-manager {
		/* Estilo base do componente */
	}
</style> 