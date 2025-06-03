<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	
	// Crossfade para transições entre views
	const [send, receive] = crossfade({
		duration: 400,
		fallback(node) {
			return blur(node, { amount: 10, duration: 400 });
		}
	});
	
	// Interfaces
	interface Brand {
		id: string;
		name: string;
		slug: string;
		description?: string;
		logo_url?: string;
		website_url?: string;
		is_active: boolean;
		product_count: number;
		created_at: string;
		updated_at?: string;
	}
	
	interface StatCard {
		title: string;
		value: string | number;
		change?: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
	}
	
	interface Filter {
		search: string;
		status: string;
	}
	
	// Estado
	let brands = $state<Brand[]>([]);
	let filteredBrands = $state<Brand[]>([]);
	let loading = $state(true);
	let selectedBrands = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(false);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let selectedBrand = $state<Brand | null>(null);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		status: 'all'
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(20);
	let totalPages = $state(1);
	let totalCount = $state(0);
	
	// Estatísticas
	let stats = $state<StatCard[]>([]);
	
	// Form data
	let formData = $state({
		name: '',
		slug: '',
		description: '',
		logo_url: '',
		website_url: '',
		is_active: true
	});
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...brands];
		
		// Busca
		if (filters.search) {
			result = result.filter(brand => 
				brand.name.toLowerCase().includes(filters.search.toLowerCase()) ||
				brand.slug.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Status
		if (filters.status !== 'all') {
			result = result.filter(brand => 
				filters.status === 'active' ? brand.is_active : !brand.is_active
			);
		}
		
		filteredBrands = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
	});
	
	// Carregar marcas
	async function loadBrands() {
		loading = true;
		
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: itemsPerPage.toString(),
				search: filters.search
			});
			
			const response = await fetch(`/api/brands?${params}`);
			const result = await response.json();
			
			if (result.success) {
				brands = result.data.brands;
				totalPages = result.data.pagination.totalPages;
				totalCount = result.data.pagination.total;
				
				// Inicializar filteredBrands se estiver vazio
				if (filteredBrands.length === 0) {
					filteredBrands = [...brands];
				}
				
				// Atualizar estatísticas
				updateStats();
			} else {
				console.error('Erro ao carregar marcas:', result.error);
			}
		} catch (error) {
			console.error('Erro ao carregar marcas:', error);
			brands = [];
		} finally {
			loading = false;
		}
	}
	
	function updateStats() {
		const activeBrands = brands.filter(b => b.is_active).length;
		const inactiveBrands = brands.filter(b => !b.is_active).length;
		const totalProducts = brands.reduce((sum, b) => sum + (b.product_count || 0), 0);
		const avgProducts = brands.length > 0 ? Math.round(totalProducts / brands.length) : 0;
		
		stats = [
			{
				title: 'Total de Marcas',
				value: brands.length.toLocaleString('pt-BR'),
				change: 15,
				icon: '🏷️',
				color: 'primary'
			},
			{
				title: 'Marcas Ativas',
				value: activeBrands.toLocaleString('pt-BR'),
				change: 8,
				icon: '✅',
				color: 'success'
			},
			{
				title: 'Total de Produtos',
				value: totalProducts.toLocaleString('pt-BR'),
				change: 12,
				icon: '📦',
				color: 'info'
			},
			{
				title: 'Média por Marca',
				value: avgProducts.toLocaleString('pt-BR'),
				change: -2,
				icon: '📊',
				color: 'warning'
			}
		];
	}
	
	// Funções do formulário
	function openCreateModal() {
		formData = {
			name: '',
			slug: '',
			description: '',
			logo_url: '',
			website_url: '',
			is_active: true
		};
		selectedBrand = null;
		showCreateModal = true;
	}
	
	function openEditModal(brand: Brand) {
		selectedBrand = brand;
		formData = {
			name: brand.name,
			slug: brand.slug,
			description: brand.description || '',
			logo_url: brand.logo_url || '',
			website_url: brand.website_url || '',
			is_active: brand.is_active
		};
		showEditModal = true;
	}
	
	function generateSlug() {
		formData.slug = formData.name
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/--+/g, '-')
			.trim();
	}
	
	// CRUD Operations
	async function createBrand() {
		try {
			const response = await fetch('/api/brands', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});
			
			const result = await response.json();
			
			if (result.success) {
				showCreateModal = false;
				loadBrands();
			} else {
				alert(result.error || 'Erro ao criar marca');
			}
		} catch (err) {
			alert('Erro ao criar marca');
		}
	}
	
	async function updateBrand() {
		try {
			const response = await fetch('/api/brands', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...formData, id: selectedBrand?.id })
			});
			
			const result = await response.json();
			
			if (result.success) {
				showEditModal = false;
				loadBrands();
			} else {
				alert(result.error || 'Erro ao atualizar marca');
			}
		} catch (err) {
			alert('Erro ao atualizar marca');
		}
	}
	
	async function deleteBrand() {
		try {
			const response = await fetch('/api/brands', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: selectedBrand?.id })
			});
			
			const result = await response.json();
			
			if (result.success) {
				showDeleteModal = false;
				selectedBrand = null;
				loadBrands();
			} else {
				alert(result.error || 'Erro ao excluir marca');
			}
		} catch (err) {
			alert('Erro ao excluir marca');
		}
	}
	
	// Seleção
	function toggleBrandSelection(id: string) {
		const newSet = new Set(selectedBrands);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedBrands = newSet;
	}
	
	function toggleAllBrands() {
		if (selectedBrands.size === paginatedBrands.length) {
			selectedBrands = new Set();
		} else {
			selectedBrands = new Set(paginatedBrands.map(b => b.id));
		}
	}
	
	// Ações em lote
	async function bulkActivate() {
		console.log('Ativando', selectedBrands.size, 'marcas');
		selectedBrands = new Set();
	}
	
	async function bulkDeactivate() {
		console.log('Desativando', selectedBrands.size, 'marcas');
		selectedBrands = new Set();
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedBrands.size} marcas?`)) {
			console.log('Excluindo', selectedBrands.size, 'marcas');
			selectedBrands = new Set();
		}
	}
	
	// Helpers
	function getColorClasses(color: string) {
		const colors = {
			primary: 'from-cyan-500 to-cyan-600',
			success: 'from-green-500 to-green-600',
			warning: 'from-yellow-500 to-yellow-600',
			danger: 'from-red-500 to-red-600',
			info: 'from-blue-500 to-blue-600'
		};
		return colors[color as keyof typeof colors] || colors.primary;
	}
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	// Marcas paginadas
	const paginatedBrands = $derived(
		filteredBrands.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	onMount(() => {
		loadBrands();
	});
</script>

<svelte:head>
	<title>Marcas - Painel Administrativo</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				🏷️ Gestão de Marcas
			</h1>
			<p class="text-gray-600 mt-1">Gerencie as marcas dos produtos do marketplace</p>
		</div>
		
		<div class="flex items-center gap-3">
			<!-- View Toggle -->
			<div class="flex items-center gap-2">
				<button
					onclick={() => viewMode = 'list'}
					class="p-2 rounded-lg transition-colors {viewMode === 'list' ? 'bg-cyan-100 text-cyan-600' : 'text-gray-500 hover:bg-gray-100'}"
					title="Visualização em lista"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
				</button>
				<button
					onclick={() => viewMode = 'grid'}
					class="p-2 rounded-lg transition-colors {viewMode === 'grid' ? 'bg-cyan-100 text-cyan-600' : 'text-gray-500 hover:bg-gray-100'}"
					title="Visualização em grade"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
				</button>
			</div>
			
			<!-- Nova Marca Button -->
			<button 
				onclick={() => openCreateModal()}
				class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Nova Marca
			</button>
			
			<!-- Toggle Filters -->
			<button 
				onclick={() => showFilters = !showFilters}
				class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				Filtros
			</button>
			
			<!-- Export -->
			<button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				Exportar
			</button>
		</div>
	</div>
	
	<!-- Stats Cards -->
	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each Array(4) as _, i}
				<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
					<div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
					<div class="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
					<div class="h-3 bg-gray-200 rounded w-1/3"></div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each stats as stat, i (stat.title)}
				<div 
					class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden"
					in:fly={{ y: 50, duration: 500, delay: 200 + i * 100, easing: backOut }}
					out:scale={{ duration: 200 }}
				>
					<div class="relative z-10">
						<div class="flex items-center justify-between mb-4">
							<div class="text-2xl transform group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
							{#if stat.change}
								<div class="flex items-center gap-1" in:fade={{ duration: 300, delay: 400 + i * 100 }}>
									{#if stat.change > 0}
										<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										<span class="text-sm font-semibold text-green-500">+{stat.change}%</span>
									{:else}
										<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
										</svg>
										<span class="text-sm font-semibold text-red-500">{stat.change}%</span>
									{/if}
								</div>
							{/if}
						</div>
						<h3 class="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
						<p class="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:scale-105">{stat.value}</p>
					</div>
					
					<!-- Background decoration -->
					<div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br {getColorClasses(stat.color)} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500"></div>
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Filters -->
	{#if showFilters}
		<div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100" transition:slide={{ duration: 300 }}>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<!-- Search -->
				<div class="lg:col-span-1">
					<label class="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
					<input
						type="text"
						bind:value={filters.search}
						placeholder="Nome da marca ou slug..."
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				
				<!-- Status -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
					<select bind:value={filters.status} class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
						<option value="all">Todos</option>
						<option value="active">Ativas</option>
						<option value="inactive">Inativas</option>
					</select>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Actions -->
	{#if selectedBrands.size > 0}
		<div class="bg-cyan-50 border border-cyan-200 rounded-xl p-4" transition:slide={{ duration: 300 }}>
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-cyan-900">
					{selectedBrands.size} {selectedBrands.size === 1 ? 'marca selecionada' : 'marcas selecionadas'}
				</p>
				<div class="flex items-center gap-2">
					<button 
						onclick={() => bulkActivate()}
						class="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
					>
						Ativar
					</button>
					<button 
						onclick={() => bulkDeactivate()}
						class="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg transition-colors"
					>
						Desativar
					</button>
					<button 
						onclick={() => bulkDelete()}
						class="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors"
					>
						Excluir
					</button>
					<button 
						onclick={() => selectedBrands = new Set()}
						class="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
					>
						Limpar Seleção
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Brands Table/Grid -->
	{#if loading}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100">
			<div class="p-6">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando marcas...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if viewMode === 'list'}
		<!-- List View -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left">
							<input
								type="checkbox"
								checked={selectedBrands.size === paginatedBrands.length && paginatedBrands.length > 0}
								onchange={toggleAllBrands}
								class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							>
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Marca
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Produtos
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Status
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Criada em
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
							Ações
						</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each paginatedBrands as brand, i}
						<tr 
							class="hover:bg-gray-50 transition-colors" 
							in:fade={{ duration: 200, delay: i * 50 }}
						>
							<td class="px-6 py-4 whitespace-nowrap">
								<input
									type="checkbox"
									checked={selectedBrands.has(brand.id)}
									onchange={() => toggleBrandSelection(brand.id)}
									class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="flex items-center">
									{#if brand.logo_url}
										<img 
											src={brand.logo_url} 
											alt={brand.name} 
											class="h-10 w-10 rounded-lg object-cover mr-3"
											onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
										>
									{/if}
									<div class="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center mr-3 {brand.logo_url ? 'hidden' : ''}">
										<span class="text-gray-500 font-bold">{brand.name.charAt(0)}</span>
									</div>
									<div>
										<div class="text-sm font-medium text-gray-900">{brand.name}</div>
										<div class="text-sm text-gray-500">/{brand.slug}</div>
									</div>
								</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{brand.product_count || 0}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {brand.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
									{brand.is_active ? 'Ativa' : 'Inativa'}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{formatDate(brand.created_at)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								<button
									onclick={() => openEditModal(brand)}
									class="text-blue-600 hover:text-blue-900 mr-3"
								>
									Editar
								</button>
								<button
									onclick={() => { selectedBrand = brand; showDeleteModal = true; }}
									class="text-red-600 hover:text-red-900"
								>
									Excluir
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			
			{#if paginatedBrands.length === 0}
				<div class="py-20 text-center">
					<svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					<p class="text-lg font-medium mb-2 text-gray-700">Nenhuma marca encontrada</p>
					<p class="text-sm text-gray-500">
						{filters.search || filters.status !== 'all' 
							? 'Tente ajustar os filtros de busca' 
							: 'Ainda não há marcas cadastradas'}
					</p>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Grid View -->
		{#if paginatedBrands.length === 0}
			<div class="bg-white rounded-xl shadow-sm border border-gray-100">
				<div class="py-20 text-center">
					<svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					<p class="text-lg font-medium mb-2 text-gray-700">Nenhuma marca encontrada</p>
					<p class="text-sm text-gray-500">
						{filters.search || filters.status !== 'all' 
							? 'Tente ajustar os filtros de busca' 
							: 'Ainda não há marcas cadastradas'}
					</p>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each paginatedBrands as brand, i}
					<div 
						class="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:scale-[1.02] group relative overflow-hidden"
						in:scale={{ duration: 400, delay: i * 50, easing: backOut }}
					>
						<!-- Checkbox Selection -->
						<div class="absolute top-3 left-3 z-10">
							<input
								type="checkbox"
								checked={selectedBrands.has(brand.id)}
								onchange={() => toggleBrandSelection(brand.id)}
								class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 shadow-sm"
							>
						</div>
						
						<div class="p-6">
							<!-- Logo/Icon -->
							<div class="flex items-center justify-center mb-4">
								{#if brand.logo_url}
									<img 
										src={brand.logo_url} 
										alt={brand.name} 
										class="h-16 w-16 rounded-lg object-cover shadow-sm"
										onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
									>
								{/if}
								<div class="h-16 w-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm {brand.logo_url ? 'hidden' : ''}">
									<span class="text-2xl font-bold text-gray-500">{brand.name.charAt(0)}</span>
								</div>
							</div>
							
							<!-- Brand Info -->
							<div class="text-center mb-4">
								<h3 class="font-semibold text-gray-900 mb-1">{brand.name}</h3>
								<p class="text-sm text-gray-500 mb-2">/{brand.slug}</p>
								{#if brand.description}
									<p class="text-xs text-gray-600 line-clamp-2">{brand.description}</p>
								{/if}
							</div>
							
							<!-- Stats -->
							<div class="flex items-center justify-between mb-4">
								<div class="text-center">
									<p class="text-lg font-bold text-gray-900">{brand.product_count || 0}</p>
									<p class="text-xs text-gray-500">Produtos</p>
								</div>
								<div class="text-center">
									<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {brand.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
										{brand.is_active ? 'Ativa' : 'Inativa'}
									</span>
								</div>
							</div>
							
							<!-- Actions -->
							<div class="flex gap-2">
								<button 
									onclick={() => openEditModal(brand)}
									class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
								>
									Editar
								</button>
								<button 
									onclick={() => { selectedBrand = brand; showDeleteModal = true; }}
									class="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
								>
									🗑️
								</button>
							</div>
						</div>
						
						<!-- Background decoration -->
						<div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 opacity-5 rounded-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
	
	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="bg-white rounded-xl shadow-sm border border-gray-100">
			<div class="px-6 py-4">
				<div class="flex items-center justify-between">
					<p class="text-sm text-gray-700">
						Mostrando <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até 
						<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredBrands.length)}</span> de 
						<span class="font-medium">{filteredBrands.length}</span> marcas
					</p>
					<div class="flex items-center gap-2">
						<button
							onclick={() => { currentPage = Math.max(1, currentPage - 1); loadBrands(); }}
							disabled={currentPage === 1}
							class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
						>
							Anterior
						</button>
						<span class="text-sm text-gray-600">
							{currentPage} de {totalPages}
						</span>
						<button
							onclick={() => { currentPage = Math.min(totalPages, currentPage + 1); loadBrands(); }}
							disabled={currentPage === totalPages}
							class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
						>
							Próximo
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Modal Criar -->
{#if showCreateModal}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		transition:fade
	>
		<div 
			class="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<h3 class="text-lg font-bold mb-4 text-gray-900">Nova Marca</h3>
			
			<form on:submit|preventDefault={createBrand} class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
					<input
						type="text"
						bind:value={formData.name}
						on:input={generateSlug}
						required
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Nome da marca"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
					<input
						type="text"
						bind:value={formData.slug}
						required
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="url-amigavel"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
					<textarea
						bind:value={formData.description}
						rows="3"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Descrição da marca"
					></textarea>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">URL do Logo</label>
					<input
						type="url"
						bind:value={formData.logo_url}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="https://exemplo.com/logo.png"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Website</label>
					<input
						type="url"
						bind:value={formData.website_url}
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="https://exemplo.com"
					>
				</div>
				
				<div class="flex items-center">
					<input
						type="checkbox"
						bind:checked={formData.is_active}
						id="active"
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					>
					<label for="active" class="ml-2 text-sm text-gray-700">Marca ativa</label>
				</div>
				
				<div class="flex space-x-3 pt-4">
					<button
						type="button"
						onclick={() => showCreateModal = false}
						class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
					>
						Cancelar
					</button>
					<button
						type="submit"
						class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
					>
						Criar Marca
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Editar -->
{#if showEditModal}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		transition:fade
	>
		<div 
			class="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<h3 class="text-lg font-bold mb-4 text-gray-900">Editar Marca</h3>
			
			<form on:submit|preventDefault={updateBrand} class="space-y-4">
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
					<label class="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
					<input
						type="text"
						bind:value={formData.slug}
						required
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
					<textarea
						bind:value={formData.description}
						rows="3"
						class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					></textarea>
				</div>
				
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
				
				<div class="flex items-center">
					<input
						type="checkbox"
						bind:checked={formData.is_active}
						id="active-edit"
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					>
					<label for="active-edit" class="ml-2 text-sm text-gray-700">Marca ativa</label>
				</div>
				
				<div class="flex space-x-3 pt-4">
					<button
						type="button"
						onclick={() => showEditModal = false}
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
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		transition:fade
	>
		<div 
			class="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
			transition:fly={{ y: 50, duration: 300 }}
		>
			<h3 class="text-lg font-bold mb-4 text-gray-900">Excluir Marca</h3>
			<p class="text-gray-600 mb-6">
				Tem certeza que deseja excluir a marca <strong>{selectedBrand?.name}</strong>?
				Esta ação não pode ser desfeita.
			</p>
			<div class="flex space-x-3">
				<button
					onclick={() => { showDeleteModal = false; selectedBrand = null; }}
					class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
				>
					Cancelar
				</button>
				<button
					onclick={deleteBrand}
					class="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
				>
					Excluir
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style> 