<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	let paymentMethods: any[] = [];
	let loading = true;
	let error = '';
	let searchTerm = '';
	let showCreateModal = false;
	let showEditModal = false;
	let selectedMethod: any = null;
	let showDeleteModal = false;
	
	let currentPage = 1;
	let totalPages = 1;
	let totalCount = 0;
	let limit = 20;
	
	let formData = {
		name: '',
		code: '',
		description: '',
		icon_url: '',
		is_active: true,
		fee_percentage: 0,
		fee_fixed: 0,
		min_amount: 0,
		max_amount: null
	};
	
	async function loadPaymentMethods() {
		try {
			loading = true;
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: limit.toString(),
				search: searchTerm
			});
			
			const response = await fetch(`/api/payment-methods?${params}`);
			const result = await response.json();
			
			if (result.success) {
				paymentMethods = result.data.paymentMethods;
				totalPages = result.data.pagination.totalPages;
				totalCount = result.data.pagination.total;
			} else {
				error = result.error || 'Erro ao carregar métodos de pagamento';
			}
		} catch (err) {
			error = 'Erro ao carregar métodos de pagamento';
			console.error(err);
		} finally {
			loading = false;
		}
	}
	
	async function createPaymentMethod() {
		try {
			const response = await fetch('/api/payment-methods', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});
			
			const result = await response.json();
			
			if (result.success) {
				showCreateModal = false;
				resetForm();
				loadPaymentMethods();
			} else {
				error = result.error || 'Erro ao criar método de pagamento';
			}
		} catch (err) {
			error = 'Erro ao criar método de pagamento';
		}
	}
	
	async function updatePaymentMethod() {
		try {
			const response = await fetch('/api/payment-methods', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...formData, id: selectedMethod.id })
			});
			
			const result = await response.json();
			
			if (result.success) {
				showEditModal = false;
				resetForm();
				loadPaymentMethods();
			} else {
				error = result.error || 'Erro ao atualizar método de pagamento';
			}
		} catch (err) {
			error = 'Erro ao atualizar método de pagamento';
		}
	}
	
	async function deletePaymentMethod() {
		try {
			const response = await fetch('/api/payment-methods', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: selectedMethod.id })
			});
			
			const result = await response.json();
			
			if (result.success) {
				showDeleteModal = false;
				selectedMethod = null;
				loadPaymentMethods();
			} else {
				error = result.error || 'Erro ao excluir método de pagamento';
			}
		} catch (err) {
			error = 'Erro ao excluir método de pagamento';
		}
	}
	
	function resetForm() {
		formData = {
			name: '',
			code: '',
			description: '',
			icon_url: '',
			is_active: true,
			fee_percentage: 0,
			fee_fixed: 0,
			min_amount: 0,
			max_amount: null
		};
	}
	
	function openEditModal(method: any) {
		selectedMethod = method;
		formData = {
			name: method.name,
			code: method.code,
			description: method.description || '',
			icon_url: method.icon_url || '',
			is_active: method.is_active,
			fee_percentage: method.fee_percentage || 0,
			fee_fixed: method.fee_fixed || 0,
			min_amount: method.min_amount || 0,
			max_amount: method.max_amount
		};
		showEditModal = true;
	}
	
	function generateCode() {
		formData.code = formData.name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9\s]/g, '')
			.replace(/\s+/g, '_')
			.trim();
	}
	
	let searchTimeout: NodeJS.Timeout;
	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			loadPaymentMethods();
		}, 300);
	}
	
	onMount(() => {
		loadPaymentMethods();
	});
</script>

<svelte:head>
	<title>Métodos de Pagamento - Painel Administrativo</title>
</svelte:head>

<div class="container mx-auto px-6 py-8">
	<div class="mb-8">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
					<ModernIcon name="CreditCard" size="lg" />
					Métodos de Pagamento
				</h1>
				<p class="mt-2 text-sm text-gray-600">Gerencie os métodos de pagamento aceitos</p>
			</div>
			<div class="mt-4 sm:mt-0">
				<button
					on:click={() => showCreateModal = true}
					class="bg-[#00BFB3] hover:bg-[#00A89D] text-white px-4 py-2 rounded-lg font-medium transition-colors"
				>
					+ Novo Método
				</button>
			</div>
		</div>
	</div>

	<div class="mb-6">
		<div class="relative">
			<input
				type="text"
				placeholder="Buscar métodos de pagamento..."
				bind:value={searchTerm}
				on:input={handleSearch}
				class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
			>
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
		</div>
	</div>

	{#if error}
		<div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" transition:fly={{ y: -20, duration: 300 }}>
			<div class="flex">
				<div class="ml-3">
					<p class="text-red-800">{error}</p>
				</div>
				<div class="ml-auto pl-3">
					<button on:click={() => error = ''} class="text-red-400 hover:text-red-600">✕</button>
				</div>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3]"></div>
			<span class="ml-3 text-gray-600">Carregando métodos de pagamento...</span>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limites</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each paymentMethods as method}
						<tr class="hover:bg-gray-50" transition:fade={{ duration: 200 }}>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center">
									{#if method.icon_url}
										<img src={method.icon_url} alt={method.name} class="h-8 w-8 rounded mr-3">
									{:else}
																			<div class="h-8 w-8 rounded bg-[#00BFB3]/10 flex items-center justify-center mr-3">
										<ModernIcon name="CreditCard" size="sm" class="text-[#00BFB3]" />
									</div>
									{/if}
									<div>
										<div class="text-sm font-medium text-gray-900">{method.name}</div>
										<div class="text-sm text-gray-500">{method.description || ''}</div>
									</div>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								<code class="bg-gray-100 px-2 py-1 rounded text-xs">{method.code}</code>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{#if method.fee_percentage > 0 || method.fee_fixed > 0}
									<div>
										{#if method.fee_percentage > 0}
											{method.fee_percentage}%
										{/if}
										{#if method.fee_fixed > 0}
											{#if method.fee_percentage > 0} + {/if}
											R$ {method.fee_fixed.toFixed(2)}
										{/if}
									</div>
								{:else}
									<span class="text-green-600">Grátis</span>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								<div>
									Min: R$ {(method.min_amount || 0).toFixed(2)}
									{#if method.max_amount}
										<br>Max: R$ {method.max_amount.toFixed(2)}
									{:else}
										<br><span class="text-gray-500">Sem limite</span>
									{/if}
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {method.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
									{method.is_active ? 'Ativo' : 'Inativo'}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<button
									on:click={() => openEditModal(method)}
									class="text-blue-600 hover:text-blue-900 mr-3"
								>
									Editar
								</button>
								<button
									on:click={() => { selectedMethod = method; showDeleteModal = true; }}
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

		{#if totalPages > 1}
			<div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
				<div class="flex items-center justify-between">
					<p class="text-sm text-gray-700">
						Mostrando <span class="font-medium">{(currentPage - 1) * limit + 1}</span>
						até <span class="font-medium">{Math.min(currentPage * limit, totalCount)}</span>
						de <span class="font-medium">{totalCount}</span> métodos
					</p>
				</div>
				<div class="flex space-x-2">
					<button
						on:click={() => { currentPage--; loadPaymentMethods(); }}
						disabled={currentPage === 1}
						class="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Anterior
					</button>
					<span class="px-3 py-1 text-sm">
						{currentPage} de {totalPages}
					</span>
					<button
						on:click={() => { currentPage++; loadPaymentMethods(); }}
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
		<div class="bg-white rounded-lg p-6 w-full max-w-md mx-4" transition:fly={{ y: 50, duration: 300 }}>
			<h3 class="text-lg font-bold mb-4">Novo Método de Pagamento</h3>
			
			<form on:submit|preventDefault={createPaymentMethod} class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
					<input
						type="text"
						bind:value={formData.name}
						on:input={generateCode}
						required
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Código *</label>
					<input
						type="text"
						bind:value={formData.code}
						required
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
					<textarea
						bind:value={formData.description}
						rows="2"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">URL do Ícone</label>
					<input
						type="url"
						bind:value={formData.icon_url}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Taxa (%)</label>
						<input
							type="number"
							bind:value={formData.fee_percentage}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Taxa Fixa (R$)</label>
						<input
							type="number"
							bind:value={formData.fee_fixed}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Valor Mínimo (R$)</label>
						<input
							type="number"
							bind:value={formData.min_amount}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Valor Máximo (R$)</label>
						<input
							type="number"
							bind:value={formData.max_amount}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div class="flex items-center">
					<input
						type="checkbox"
						bind:checked={formData.is_active}
						id="active"
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					>
					<label for="active" class="ml-2 text-sm text-gray-700">Método ativo</label>
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
						Criar Método
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Editar -->
{#if showEditModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" transition:fade>
		<div class="bg-white rounded-lg p-6 w-full max-w-md mx-4" transition:fly={{ y: 50, duration: 300 }}>
			<h3 class="text-lg font-bold mb-4">Editar Método de Pagamento</h3>
			
			<form on:submit|preventDefault={updatePaymentMethod} class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
					<input
						type="text"
						bind:value={formData.name}
						required
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Código *</label>
					<input
						type="text"
						bind:value={formData.code}
						required
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
					<textarea
						bind:value={formData.description}
						rows="2"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">URL do Ícone</label>
					<input
						type="url"
						bind:value={formData.icon_url}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Taxa (%)</label>
						<input
							type="number"
							bind:value={formData.fee_percentage}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Taxa Fixa (R$)</label>
						<input
							type="number"
							bind:value={formData.fee_fixed}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Valor Mínimo (R$)</label>
						<input
							type="number"
							bind:value={formData.min_amount}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Valor Máximo (R$)</label>
						<input
							type="number"
							bind:value={formData.max_amount}
							min="0"
							step="0.01"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
					</div>
				</div>
				
				<div class="flex items-center">
					<input
						type="checkbox"
						bind:checked={formData.is_active}
						id="active-edit"
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					>
					<label for="active-edit" class="ml-2 text-sm text-gray-700">Método ativo</label>
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
			<h3 class="text-lg font-bold mb-4">Excluir Método de Pagamento</h3>
			<p class="text-gray-600 mb-6">
				Tem certeza que deseja excluir o método <strong>{selectedMethod?.name}</strong>?
				Esta ação não pode ser desfeita.
			</p>
			<div class="flex space-x-3">
				<button
					on:click={() => { showDeleteModal = false; selectedMethod = null; }}
					class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
				>
					Cancelar
				</button>
				<button
					on:click={deletePaymentMethod}
					class="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
				>
					Excluir
				</button>
			</div>
		</div>
	</div>
{/if} 