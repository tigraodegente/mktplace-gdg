<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	
	// Estado
	let sellers: any[] = [];
	let loading = true;
	let error = '';
	let searchTerm = '';
	let showCreateModal = false;
	let showEditModal = false;
	let selectedSeller: any = null;
	let showDeleteModal = false;
	
	// Paginação
	let currentPage = 1;
	let totalPages = 1;
	let totalCount = 0;
	let limit = 20;
	
	// Form data
	let formData = {
		user_id: '',
		store_name: '',
		store_slug: '',
		description: '',
		logo_url: '',
		website_url: '',
		phone: '',
		address: '',
		commission_rate: 5.0,
		status: 'pending',
		is_verified: false
	};
	
	// Estados disponíveis
	const statusOptions = [
		{ value: 'pending', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
		{ value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-800' },
		{ value: 'suspended', label: 'Suspenso', color: 'bg-red-100 text-red-800' },
		{ value: 'rejected', label: 'Rejeitado', color: 'bg-gray-100 text-gray-800' }
	];
	
	// Carregar vendedores
	async function loadSellers() {
		try {
			loading = true;
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: limit.toString(),
				search: searchTerm
			});
			
			const response = await fetch(`/api/sellers?${params}`);
			const result = await response.json();
			
			if (result.success) {
				sellers = result.data.sellers;
				totalPages = result.data.pagination.totalPages;
				totalCount = result.data.pagination.total;
			} else {
				error = result.error || 'Erro ao carregar vendedores';
			}
		} catch (err) {
			error = 'Erro ao carregar vendedores';
			console.error(err);
		} finally {
			loading = false;
		}
	}
	
	// Criar vendedor
	async function createSeller() {
		try {
			const response = await fetch('/api/sellers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});
			
			const result = await response.json();
			
			if (result.success) {
				showCreateModal = false;
				resetForm();
				loadSellers();
			} else {
				error = result.error || 'Erro ao criar vendedor';
			}
		} catch (err) {
			error = 'Erro ao criar vendedor';
		}
	}
	
	// Editar vendedor
	async function updateSeller() {
		try {
			const response = await fetch('/api/sellers', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...formData, id: selectedSeller.id })
			});
			
			const result = await response.json();
			
			if (result.success) {
				showEditModal = false;
				resetForm();
				loadSellers();
			} else {
				error = result.error || 'Erro ao atualizar vendedor';
			}
		} catch (err) {
			error = 'Erro ao atualizar vendedor';
		}
	}
	
	// Excluir vendedor
	async function deleteSeller() {
		try {
			const response = await fetch('/api/sellers', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: selectedSeller.id })
			});
			
			const result = await response.json();
			
			if (result.success) {
				showDeleteModal = false;
				selectedSeller = null;
				loadSellers();
			} else {
				error = result.error || 'Erro ao excluir vendedor';
			}
		} catch (err) {
			error = 'Erro ao excluir vendedor';
		}
	}
	
	// Funções auxiliares
	function resetForm() {
		formData = {
			user_id: '',
			store_name: '',
			store_slug: '',
			description: '',
			logo_url: '',
			website_url: '',
			phone: '',
			address: '',
			commission_rate: 5.0,
			status: 'pending',
			is_verified: false
		};
	}
	
	function openEditModal(seller: any) {
		selectedSeller = seller;
		formData = {
			user_id: seller.user_id,
			store_name: seller.store_name,
			store_slug: seller.store_slug,
			description: seller.description || '',
			logo_url: seller.logo_url || '',
			website_url: seller.website_url || '',
			phone: seller.phone || '',
			address: seller.address || '',
			commission_rate: seller.commission_rate || 5.0,
			status: seller.status,
			is_verified: seller.is_verified
		};
		showEditModal = true;
	}
	
	function generateSlug() {
		formData.store_slug = formData.store_name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/--+/g, '-')
			.trim();
	}
	
	function getStatusConfig(status: string) {
		return statusOptions.find(s => s.value === status) || statusOptions[0];
	}
	
	// Busca com debounce
	let searchTimeout: NodeJS.Timeout;
	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			loadSellers();
		}, 300);
	}
	
	onMount(() => {
		loadSellers();
	});
</script>

<svelte:head>
	<title>Vendedores - Painel Administrativo</title>
</svelte:head>

<div class="container mx-auto px-6 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">🏪 Vendedores</h1>
				<p class="mt-2 text-sm text-gray-600">Gerencie os vendedores da plataforma</p>
			</div>
			<div class="mt-4 sm:mt-0">
				<button
					on:click={() => showCreateModal = true}
					class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
				>
					+ Novo Vendedor
				</button>
			</div>
		</div>
	</div>

	<!-- Barra de busca -->
	<div class="mb-6">
		<div class="relative">
			<input
				type="text"
				placeholder="Buscar vendedores..."
				bind:value={searchTerm}
				on:input={handleSearch}
				class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			>
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
		</div>
	</div>

	<!-- Erro -->
	{#if error}
		<div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" transition:fly={{ y: -20, duration: 300 }}>
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
					</svg>
				</div>
				<div class="ml-3">
					<p class="text-red-800">{error}</p>
				</div>
				<div class="ml-auto pl-3">
					<button on:click={() => error = ''} class="text-red-400 hover:text-red-600">
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Loading -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600">Carregando vendedores...</span>
		</div>
	{:else}
		<!-- Tabela -->
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Loja
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Responsável
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Produtos
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Comissão
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Status
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Criado em
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
							Ações
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each sellers as seller}
						<tr class="hover:bg-gray-50" transition:fade={{ duration: 200 }}>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center">
									{#if seller.logo_url}
										<img src={seller.logo_url} alt={seller.store_name} class="h-10 w-10 rounded-lg object-cover mr-3">
									{:else}
										<div class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
											<span class="text-blue-600 font-bold">🏪</span>
										</div>
									{/if}
									<div>
										<div class="text-sm font-medium text-gray-900">{seller.store_name}</div>
										<div class="text-sm text-gray-500">/{seller.store_slug}</div>
									</div>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">{seller.user_name || seller.user_email}</div>
								<div class="text-sm text-gray-500">{seller.user_email}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{seller.product_count || 0}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{seller.commission_rate}%
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								{#each [getStatusConfig(seller.status)] as statusConfig}
									<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full {statusConfig.color}">
										{statusConfig.label}
										{#if seller.is_verified}
											<svg class="ml-1 h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
											</svg>
										{/if}
									</span>
								{/each}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{new Date(seller.created_at).toLocaleDateString('pt-BR')}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<button
									on:click={() => openEditModal(seller)}
									class="text-blue-600 hover:text-blue-900 mr-3"
								>
									Editar
								</button>
								<button
									on:click={() => { selectedSeller = seller; showDeleteModal = true; }}
									class="text-red-600 hover:text-red-900"
								>
									Excluir
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Paginação -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
				<div class="flex items-center justify-between">
					<p class="text-sm text-gray-700">
						Mostrando <span class="font-medium">{(currentPage - 1) * limit + 1}</span>
						até <span class="font-medium">{Math.min(currentPage * limit, totalCount)}</span>
						de <span class="font-medium">{totalCount}</span> vendedores
					</p>
				</div>
				<div class="flex space-x-2">
					<button
						on:click={() => { currentPage--; loadSellers(); }}
						disabled={currentPage === 1}
						class="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Anterior
					</button>
					<span class="px-3 py-1 text-sm">
						{currentPage} de {totalPages}
					</span>
					<button
						on:click={() => { currentPage++; loadSellers(); }}
						disabled={currentPage === totalPages}
						class="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Próximo
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Modal Criar -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade>
		<div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto" transition:fly={{ y: 50, duration: 300 }}>
			<h3 class="text-lg font-bold mb-4">Novo Vendedor</h3>
			
			<form on:submit|preventDefault={createSeller} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nome da Loja *</label>
						<input
							type="text"
							bind:value={formData.store_name}
							on:input={generateSlug}
							required
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Slug da Loja *</label>
						<input
							type="text"
							bind:value={formData.store_slug}
							required
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
					<textarea
						bind:value={formData.description}
						rows="3"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">URL do Logo</label>
						<input
							type="url"
							bind:value={formData.logo_url}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Website</label>
						<input
							type="url"
							bind:value={formData.website_url}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
						<input
							type="tel"
							bind:value={formData.phone}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Taxa de Comissão (%)</label>
						<input
							type="number"
							bind:value={formData.commission_rate}
							min="0"
							max="100"
							step="0.1"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
					<textarea
						bind:value={formData.address}
						rows="2"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
						<select
							bind:value={formData.status}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							{#each statusOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					
					<div class="flex items-center pt-6">
						<input
							type="checkbox"
							bind:checked={formData.is_verified}
							id="verified"
							class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						>
						<label for="verified" class="ml-2 text-sm text-gray-700">Vendedor verificado</label>
					</div>
				</div>
				
				<div class="flex space-x-3 pt-4">
					<button
						type="button"
						on:click={() => { showCreateModal = false; resetForm(); }}
						class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
					>
						Criar Vendedor
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Editar -->
{#if showEditModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade>
		<div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto" transition:fly={{ y: 50, duration: 300 }}>
			<h3 class="text-lg font-bold mb-4">Editar Vendedor</h3>
			
			<form on:submit|preventDefault={updateSeller} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Nome da Loja *</label>
						<input
							type="text"
							bind:value={formData.store_name}
							required
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Slug da Loja *</label>
						<input
							type="text"
							bind:value={formData.store_slug}
							required
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
					<textarea
						bind:value={formData.description}
						rows="3"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">URL do Logo</label>
						<input
							type="url"
							bind:value={formData.logo_url}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Website</label>
						<input
							type="url"
							bind:value={formData.website_url}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
						<input
							type="tel"
							bind:value={formData.phone}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Taxa de Comissão (%)</label>
						<input
							type="number"
							bind:value={formData.commission_rate}
							min="0"
							max="100"
							step="0.1"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
					<textarea
						bind:value={formData.address}
						rows="2"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
						<select
							bind:value={formData.status}
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							{#each statusOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					
					<div class="flex items-center pt-6">
						<input
							type="checkbox"
							bind:checked={formData.is_verified}
							id="verified-edit"
							class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						>
						<label for="verified-edit" class="ml-2 text-sm text-gray-700">Vendedor verificado</label>
					</div>
				</div>
				
				<div class="flex space-x-3 pt-4">
					<button
						type="button"
						on:click={() => { showEditModal = false; resetForm(); }}
						class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
					>
						Salvar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Excluir -->
{#if showDeleteModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade>
		<div class="bg-white rounded-lg p-6 w-full max-w-md mx-4" transition:fly={{ y: 50, duration: 300 }}>
			<h3 class="text-lg font-bold mb-4">Excluir Vendedor</h3>
			<p class="text-gray-600 mb-6">
				Tem certeza que deseja excluir o vendedor <strong>{selectedSeller?.store_name}</strong>?
				Esta ação não pode ser desfeita.
			</p>
			<div class="flex space-x-3">
				<button
					on:click={() => { showDeleteModal = false; selectedSeller = null; }}
					class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
				>
					Cancelar
				</button>
				<button
					on:click={deleteSeller}
					class="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
				>
					Excluir
				</button>
			</div>
		</div>
	</div>
{/if} 