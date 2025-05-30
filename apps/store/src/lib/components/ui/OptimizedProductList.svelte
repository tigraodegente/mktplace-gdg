<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { useCursorPagination } from '$lib/services/cursorPaginationService';
	import VirtualProductGrid from './VirtualProductGrid.svelte';
	import CursorPagination from './CursorPagination.svelte';
	
	export let filters: Record<string, any> = {};
	export let useVirtualScroll: boolean = false;
	export let useOptimizedEndpoint: boolean = true;
	export let itemsPerPage: number = 20;
	export let viewMode: 'grid' | 'list' = 'grid';
	
	// Serviços
	const pagination = useCursorPagination('/api/products', itemsPerPage);
	
	// Estado simples
	let products: any[] = [];
	let loading = false;
	let hasMore = false;
	let error: string | null = null;
	let totalItems: number | undefined = undefined;
	
	onMount(() => {
		// Subscribe para mudanças de paginação
		pagination.subscribe((state) => {
			products = state.items;
			loading = state.loading;
			hasMore = state.hasMore;
			error = state.error;
			totalItems = state.totalItems;
		});
		
		// Busca inicial
		handleSearch();
	});
	
	onDestroy(() => {
		pagination.destroy();
	});
	
	// Buscar produtos
	async function handleSearch() {
		try {
			await pagination.search(filters, useOptimizedEndpoint);
		} catch (err) {
			console.error('Erro na busca:', err);
		}
	}
	
	// Carregar mais produtos
	async function handleLoadMore() {
		try {
			await pagination.loadMore(filters, useOptimizedEndpoint);
		} catch (err) {
			console.error('Erro ao carregar mais:', err);
		}
	}
	
	// Reset da busca
	function handleReset() {
		pagination.reset();
		handleSearch();
	}
	
	// Reagir a mudanças nos filtros
	$: if (filters) {
		pagination.reset();
		handleSearch();
	}
</script>

<div class="optimized-product-list">
	<!-- Header com controles -->
	<div class="bg-white rounded-lg shadow-sm p-4 mb-6">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div class="flex items-center gap-4">
				<h2 class="text-lg font-semibold text-gray-900">
					Produtos Otimizados
				</h2>
				
				<!-- Indicadores de otimização -->
				<div class="flex items-center gap-2">
					{#if useOptimizedEndpoint}
						<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
							Endpoint Otimizado
						</span>
					{/if}
					
					{#if useVirtualScroll}
						<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							Virtual Scroll
						</span>
					{/if}
					
					<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
						Cursor Pagination
					</span>
				</div>
			</div>
			
			<!-- Controles -->
			<div class="flex items-center gap-2">
				<button
					onclick={handleReset}
					class="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Reset
				</button>
			</div>
		</div>
		
		<!-- Stats -->
		{#if totalItems !== undefined}
			<div class="mt-3 text-sm text-gray-600">
				<span class="font-medium">{products.length}</span> de 
				<span class="font-medium">{totalItems}</span> produtos carregados
				{#if hasMore}
					<span class="text-green-600 ml-2">• Mais produtos disponíveis</span>
				{:else}
					<span class="text-gray-500 ml-2">• Todos os produtos carregados</span>
				{/if}
			</div>
		{/if}
	</div>
	
	<!-- Lista de produtos -->
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex">
				<svg class="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
				</svg>
				<div>
					<h3 class="text-sm font-medium text-red-800">Erro ao carregar produtos</h3>
					<p class="text-sm text-red-700 mt-1">{error}</p>
				</div>
			</div>
		</div>
	{:else if products.length === 0 && !loading}
		<div class="bg-gray-50 rounded-lg p-12 text-center">
			<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v1" />
			</svg>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
			<p class="text-gray-600">Tente ajustar os filtros ou fazer uma nova busca.</p>
		</div>
	{:else}
		<!-- Container dos produtos -->
		<div class="products-container" style="min-height: 600px;">
			{#if useVirtualScroll}
				<!-- Virtual Scroll para listas grandes -->
				<VirtualProductGrid
					{products}
					{viewMode}
					{loading}
					{hasMore}
					on:loadMore={handleLoadMore}
				/>
			{:else}
				<!-- Grid tradicional -->
				{#if viewMode === 'grid'}
					<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{#each products as product (product.id)}
							<div class="product-card-wrapper">
								<div class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
									<img 
										src={product.images?.[0] || '/api/placeholder/300/300'} 
										alt={product.name}
										class="w-full h-48 object-cover rounded mb-3"
										loading="lazy"
									/>
									<h3 class="font-medium text-gray-900 mb-2 line-clamp-2">
										<a href="/produto/{product.slug}" class="hover:text-[#00BFB3]">
											{product.name}
										</a>
									</h3>
									<div class="flex items-center justify-between">
										<span class="text-lg font-bold text-[#00BFB3]">
											R$ {product.price.toFixed(2)}
										</span>
										{#if product.discount}
											<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
												-{product.discount}%
											</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- Lista view -->
					<div class="space-y-4">
						{#each products as product (product.id)}
							<div class="bg-white rounded-lg shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
								<img 
									src={product.images?.[0] || '/api/placeholder/120/120'} 
									alt={product.name}
									class="w-24 h-24 object-cover rounded flex-shrink-0"
									loading="lazy"
								/>
								<div class="flex-1">
									<h3 class="font-medium text-gray-900 mb-1">
										<a href="/produto/{product.slug}" class="hover:text-[#00BFB3]">
											{product.name}
										</a>
									</h3>
									<p class="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
									<div class="flex items-center gap-4">
										<span class="text-lg font-bold text-[#00BFB3]">
											R$ {product.price.toFixed(2)}
										</span>
										{#if product.discount}
											<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
												-{product.discount}%
											</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
		
		<!-- Paginação por cursor -->
		<CursorPagination
			{hasMore}
			{loading}
			{totalItems}
			currentItems={products.length}
			{itemsPerPage}
			variant="buttons"
			on:loadMore={handleLoadMore}
			on:reset={handleReset}
		/>
	{/if}
</div>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.product-card-wrapper {
		will-change: transform;
	}
	
	.products-container {
		position: relative;
	}
</style> 