<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	
	// Interfaces
	interface Product {
		id: string;
		name: string;
		sku: string;
		price: number;
		stock: number;
		category: string;
		status: 'active' | 'inactive' | 'pending' | 'draft';
		vendor?: string;
		image: string;
		createdAt: string;
		sales: number;
		rating: number;
	}
	
	interface Filter {
		search: string;
		status: string;
		category: string;
		minPrice: number;
		maxPrice: number;
	}
	
	// Estado
	let products = $state<Product[]>([]);
	let filteredProducts = $state<Product[]>([]);
	let loading = $state(true);
	let selectedProducts = $state<Set<string>>(new Set());
	let viewMode = $state<'grid' | 'list'>('list');
	let showFilters = $state(true);
	let showAddModal = $state(false);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		status: 'all',
		category: 'all',
		minPrice: 0,
		maxPrice: 10000
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	
	// Estatísticas
	let stats = $state({
		total: 0,
		active: 0,
		pending: 0,
		lowStock: 0
	});
	
	// Categorias mock
	const categories = [
		'Eletrônicos',
		'Roupas',
		'Casa e Jardim',
		'Esportes',
		'Livros',
		'Brinquedos'
	];
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...products];
		
		// Busca
		if (filters.search) {
			result = result.filter(p => 
				p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
				p.sku.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Status
		if (filters.status !== 'all') {
			result = result.filter(p => p.status === filters.status);
		}
		
		// Categoria
		if (filters.category !== 'all') {
			result = result.filter(p => p.category === filters.category);
		}
		
		// Preço
		result = result.filter(p => 
			p.price >= filters.minPrice && p.price <= filters.maxPrice
		);
		
		filteredProducts = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		// Atualizar estatísticas
		updateStats(result);
	});
	
	onMount(() => {
		loadProducts();
	});
	
	async function loadProducts() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock
			products = Array.from({ length: 50 }, (_, i) => ({
				id: `prod-${i + 1}`,
				name: `Produto ${i + 1}`,
				sku: `SKU-${1000 + i}`,
				price: Math.floor(Math.random() * 5000) + 100,
				stock: Math.floor(Math.random() * 100),
				category: categories[Math.floor(Math.random() * categories.length)],
				status: ['active', 'inactive', 'pending', 'draft'][Math.floor(Math.random() * 4)] as any,
				vendor: userRole === 'vendor' ? 'Minha Loja' : `Vendedor ${Math.floor(Math.random() * 10) + 1}`,
				image: `https://source.unsplash.com/200x200/?product,${i}`,
				createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				sales: Math.floor(Math.random() * 1000),
				rating: (Math.random() * 2 + 3).toFixed(1) as any
			}));
			
			if (userRole === 'vendor') {
				products = products.filter(p => p.vendor === 'Minha Loja');
			}
			
			loading = false;
		}, 1000);
	}
	
	function updateStats(prods: Product[]) {
		stats = {
			total: prods.length,
			active: prods.filter(p => p.status === 'active').length,
			pending: prods.filter(p => p.status === 'pending').length,
			lowStock: prods.filter(p => p.stock < 10).length
		};
	}
	
	function toggleProductSelection(id: string) {
		const newSet = new Set(selectedProducts);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedProducts = newSet;
	}
	
	function toggleAllProducts() {
		if (selectedProducts.size === paginatedProducts.length) {
			selectedProducts = new Set();
		} else {
			selectedProducts = new Set(paginatedProducts.map(p => p.id));
		}
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			active: 'badge-success',
			inactive: 'badge-danger',
			pending: 'badge-warning',
			draft: 'badge-info'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			active: 'Ativo',
			inactive: 'Inativo',
			pending: 'Pendente',
			draft: 'Rascunho'
		};
		return labels[status as keyof typeof labels] || status;
	}
	
	function formatPrice(price: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
	}
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	// Produtos paginados
	const paginatedProducts = $derived(
		filteredProducts.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Ações em lote
	async function bulkUpdateStatus(status: Product['status']) {
		console.log('Atualizando status de', selectedProducts.size, 'produtos para', status);
		selectedProducts = new Set();
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedProducts.size} produtos?`)) {
			console.log('Excluindo', selectedProducts.size, 'produtos');
			selectedProducts = new Set();
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Todos os Produtos' : 'Meus Produtos'}
			</h1>
			<p class="text-gray-600 mt-1">Gerencie o catálogo de produtos do marketplace</p>
		</div>
		
		<div class="flex items-center gap-3">
			<!-- View Mode -->
			<div class="flex items-center bg-gray-100 rounded-lg p-1">
				<button
					onclick={() => viewMode = 'list'}
					class="p-2 rounded {viewMode === 'list' ? 'bg-white shadow-sm' : ''} transition-all"
					title="Visualização em lista"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<button
					onclick={() => viewMode = 'grid'}
					class="p-2 rounded {viewMode === 'grid' ? 'bg-white shadow-sm' : ''} transition-all"
					title="Visualização em grade"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
				</button>
			</div>
			
			<!-- Toggle Filters -->
			<button
				onclick={() => showFilters = !showFilters}
				class="btn btn-ghost"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				Filtros
			</button>
			
			<!-- Add Product -->
			<button 
				onclick={() => showAddModal = true}
				class="btn btn-primary"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Adicionar Produto
			</button>
		</div>
	</div>
	
	<!-- Stats Cards -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-4" in:fly={{ y: 20, duration: 500, delay: 100 }}>
		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total de Produtos</p>
					<p class="text-2xl font-bold text-gray-900">{stats.total}</p>
				</div>
				<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
				</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Produtos Ativos</p>
					<p class="text-2xl font-bold text-green-600">{stats.active}</p>
				</div>
				<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Aprovação Pendente</p>
					<p class="text-2xl font-bold text-yellow-600">{stats.pending}</p>
				</div>
				<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
			</div>
		</div>
		
		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Estoque Baixo</p>
					<p class="text-2xl font-bold text-red-600">{stats.lowStock}</p>
				</div>
				<div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Filters -->
	{#if showFilters}
		<div class="card" transition:slide={{ duration: 300 }}>
			<div class="card-body">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
					<!-- Search -->
					<div class="lg:col-span-2">
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="Nome ou SKU..."
							class="input"
						/>
					</div>
					
					<!-- Status -->
					<div>
						<label class="label">Status</label>
						<select bind:value={filters.status} class="input">
							<option value="all">Todos</option>
							<option value="active">Ativo</option>
							<option value="inactive">Inativo</option>
							<option value="pending">Pendente</option>
							<option value="draft">Rascunho</option>
						</select>
					</div>
					
					<!-- Category -->
					<div>
						<label class="label">Categoria</label>
						<select bind:value={filters.category} class="input">
							<option value="all">Todas</option>
							{#each categories as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
					
					<!-- Price Range -->
					<div>
						<label class="label">Preço</label>
						<div class="flex items-center gap-2">
							<input
								type="number"
								bind:value={filters.minPrice}
								placeholder="Min"
								class="input"
							/>
							<span class="text-gray-500">-</span>
							<input
								type="number"
								bind:value={filters.maxPrice}
								placeholder="Max"
								class="input"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Actions -->
	{#if selectedProducts.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedProducts.size} {selectedProducts.size === 1 ? 'produto selecionado' : 'produtos selecionados'}
					</p>
					<div class="flex items-center gap-2">
						<button 
							onclick={() => bulkUpdateStatus('active')}
							class="btn btn-sm btn-ghost text-green-600"
						>
							Ativar
						</button>
						<button 
							onclick={() => bulkUpdateStatus('inactive')}
							class="btn btn-sm btn-ghost text-yellow-600"
						>
							Desativar
						</button>
						<button 
							onclick={bulkDelete}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Excluir
						</button>
						<button 
							onclick={() => selectedProducts = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Products Table/Grid -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando produtos...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if viewMode === 'list'}
		<!-- List View -->
		<div class="card overflow-hidden">
			<div class="overflow-x-auto">
				<table class="table-modern">
					<thead>
						<tr>
							<th class="w-12">
								<input
									type="checkbox"
									checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
									onchange={toggleAllProducts}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
							<th>Produto</th>
							<th>SKU</th>
							<th>Preço</th>
							<th>Estoque</th>
							<th>Status</th>
							{#if userRole === 'admin'}
								<th>Vendedor</th>
							{/if}
							<th>Vendas</th>
							<th>Avaliação</th>
							<th class="text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedProducts as product, i}
							<tr 
								class="hover:bg-gray-50 transition-colors"
								in:fly={{ x: -20, duration: 400, delay: i * 50 }}
							>
								<td>
									<input
										type="checkbox"
										checked={selectedProducts.has(product.id)}
										onchange={() => toggleProductSelection(product.id)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<img
											src={product.image}
											alt={product.name}
											class="w-10 h-10 rounded-lg object-cover"
										/>
										<div>
											<p class="font-medium text-gray-900">{product.name}</p>
											<p class="text-sm text-gray-500">{product.category}</p>
										</div>
									</div>
								</td>
								<td class="text-gray-600">{product.sku}</td>
								<td class="font-medium">{formatPrice(product.price)}</td>
								<td>
									<span class:text-red-600={product.stock < 10} class:font-semibold={product.stock < 10}>
										{product.stock}
									</span>
								</td>
								<td>
									<span class="badge {getStatusBadge(product.status)}">
										{getStatusLabel(product.status)}
									</span>
								</td>
								{#if userRole === 'admin'}
									<td class="text-gray-600">{product.vendor}</td>
								{/if}
								<td class="text-gray-600">{product.sales}</td>
								<td>
									<div class="flex items-center gap-1">
										<span class="text-yellow-500">⭐</span>
										<span class="text-sm font-medium">{product.rating}</span>
									</div>
								</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										<button
											class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
											title="Editar"
										>
											<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
											title="Visualizar"
										>
											<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										</button>
										<button
											class="p-2 hover:bg-red-50 rounded-lg transition-colors"
											title="Excluir"
										>
											<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Grid View -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each paginatedProducts as product, i}
				<div 
					class="card group hover:shadow-xl transition-all duration-300"
					in:scale={{ duration: 400, delay: i * 50, easing: cubicOut }}
				>
					<div class="relative overflow-hidden">
						<img
							src={product.image}
							alt={product.name}
							class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
						/>
						<div class="absolute top-2 right-2">
							<span class="badge {getStatusBadge(product.status)}">
								{getStatusLabel(product.status)}
							</span>
						</div>
						{#if product.stock < 10}
							<div class="absolute top-2 left-2">
								<span class="badge badge-danger">
									Estoque Baixo
								</span>
							</div>
						{/if}
					</div>
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
						<p class="text-sm text-gray-500">{product.category}</p>
						<div class="flex items-center justify-between mt-2">
							<p class="text-xl font-bold text-gray-900">{formatPrice(product.price)}</p>
							<div class="flex items-center gap-1">
								<span class="text-yellow-500">⭐</span>
								<span class="text-sm font-medium">{product.rating}</span>
							</div>
						</div>
						<div class="flex items-center justify-between mt-4 text-sm text-gray-600">
							<span>Estoque: {product.stock}</span>
							<span>Vendas: {product.sales}</span>
						</div>
					</div>
					<div class="card-footer flex gap-2">
						<button class="btn btn-sm btn-ghost flex-1">
							Editar
						</button>
						<button class="btn btn-sm btn-primary flex-1">
							Detalhes
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-gray-600">
				Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length} produtos
			</p>
			<div class="flex items-center gap-2">
				<button
					onclick={() => currentPage = Math.max(1, currentPage - 1)}
					disabled={currentPage === 1}
					class="btn btn-ghost btn-sm"
				>
					Anterior
				</button>
				{#each Array(totalPages) as _, i}
					{#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
						<button
							onclick={() => currentPage = i + 1}
							class="btn btn-sm {currentPage === i + 1 ? 'btn-primary' : 'btn-ghost'}"
						>
							{i + 1}
						</button>
					{:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
						<span class="text-gray-400">...</span>
					{/if}
				{/each}
				<button
					onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
					disabled={currentPage === totalPages}
					class="btn btn-ghost btn-sm"
				>
					Próximo
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Animação para hover nas imagens */
	img {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Melhora na tabela */
	:global(.table-modern tbody tr) {
		position: relative;
		overflow: hidden;
	}
	
	:global(.table-modern tbody tr::before) {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: #00BFB3;
		transform: translateX(-100%);
		transition: transform 0.3s ease;
	}
	
	:global(.table-modern tbody tr:hover::before) {
		transform: translateX(0);
	}
</style> 