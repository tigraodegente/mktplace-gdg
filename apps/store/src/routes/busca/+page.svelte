<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import ProductCard from '$lib/components/ProductCard.svelte';
	import { searchService, type SearchFilters, type SearchResult } from '$lib/services/searchService';
	import type { Product } from '@mktplace/shared-types';
	
	// Get search query from URL
	let searchQuery = $derived($page.url.searchParams.get('q') || '');
	
	// Estados
	let searchResult = $state<SearchResult | null>(null);
	let isLoading = $state(true);
	let currentPage = $state(1);
	let itemsPerPage = $state(20);
	let sortBy = $state('relevance');
	let viewMode = $state<'grid' | 'list'>('grid');
	
	// Filtros
	let filters = $state<SearchFilters>({
		categories: [],
		priceMin: undefined,
		priceMax: undefined,
		brands: [],
		tags: [],
		hasDiscount: false,
		hasFreeShipping: false,
		inStock: true
	});
	
	let showFilters = $state(true);
	let showMobileFilters = $state(false);
	
	// Opções de ordenação
	const sortOptions = [
		{ value: 'relevance', label: 'Mais relevantes' },
		{ value: 'price-asc', label: 'Menor preço' },
		{ value: 'price-desc', label: 'Maior preço' },
		{ value: 'name', label: 'Nome (A-Z)' },
		{ value: 'discount', label: 'Maior desconto' },
		{ value: 'newest', label: 'Mais recentes' }
	];
	
	// Carregar produtos quando mudar query ou filtros
	$effect(() => {
		performSearch();
	});
	
	async function performSearch() {
		isLoading = true;
		
		try {
			const result = await searchService.search(searchQuery, filters, currentPage, itemsPerPage);
			searchResult = result;
			
			// Adicionar ao histórico se for uma nova busca
			if (currentPage === 1 && searchQuery) {
				searchService.addToHistory(searchQuery);
			}
		} catch (error) {
			console.error('Erro na busca:', error);
			searchResult = null;
		} finally {
			isLoading = false;
		}
	}
	
	// Aplicar ordenação localmente
	let sortedProducts = $derived(searchResult?.products ? sortProducts(searchResult.products) : []);
	
	function sortProducts(products: Product[]): Product[] {
		const sorted = [...products];
		
		switch (sortBy) {
			case 'price-asc':
				return sorted.sort((a, b) => a.price - b.price);
			case 'price-desc':
				return sorted.sort((a, b) => b.price - a.price);
			case 'name':
				return sorted.sort((a, b) => a.name.localeCompare(b.name));
			case 'discount':
				return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
			case 'newest':
				return sorted.sort((a, b) => 
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			default:
				return sorted;
		}
	}
	
	function toggleCategory(categoryId: string) {
		if (filters.categories?.includes(categoryId)) {
			filters.categories = filters.categories.filter(c => c !== categoryId);
		} else {
			filters.categories = [...(filters.categories || []), categoryId];
		}
		currentPage = 1;
	}
	
	function toggleTag(tagId: string) {
		if (filters.tags?.includes(tagId)) {
			filters.tags = filters.tags.filter(t => t !== tagId);
		} else {
			filters.tags = [...(filters.tags || []), tagId];
		}
		currentPage = 1;
	}
	
	function clearFilters() {
		filters = {
			categories: [],
			priceMin: undefined,
			priceMax: undefined,
			brands: [],
			tags: [],
			hasDiscount: false,
			hasFreeShipping: false,
			inStock: true
		};
		currentPage = 1;
	}
	
	function hasActiveFilters(): boolean {
		return !!(
			filters.categories?.length ||
			filters.priceMin !== undefined ||
			filters.priceMax !== undefined ||
			filters.brands?.length ||
			filters.tags?.length ||
			filters.hasDiscount ||
			filters.hasFreeShipping ||
			!filters.inStock
		);
	}
	
	function goToPage(page: number) {
		currentPage = page;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
	
	// Calcular páginas
	let totalPages = $derived(searchResult ? Math.ceil(searchResult.totalCount / itemsPerPage) : 0);
	let pageNumbers = $derived(getPageNumbers(currentPage, totalPages));
	
	function getPageNumbers(current: number, total: number): (number | string)[] {
		if (total <= 7) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}
		
		const pages: (number | string)[] = [1];
		
		if (current > 3) pages.push('...');
		
		for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
			pages.push(i);
		}
		
		if (current < total - 2) pages.push('...');
		if (total > 1) pages.push(total);
		
		return pages;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<div class="container mx-auto px-4 py-6">
		<!-- Breadcrumb -->
		<nav class="text-sm mb-6">
			<ol class="flex items-center space-x-2">
				<li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
				<li class="text-gray-400">/</li>
				<li class="text-gray-900">Busca</li>
				{#if searchQuery}
					<li class="text-gray-400">/</li>
					<li class="text-gray-900 truncate max-w-[200px]">{searchQuery}</li>
				{/if}
			</ol>
		</nav>
		
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-gray-900">
				{#if searchQuery}
					Resultados para "{searchQuery}"
				{:else}
					Todos os produtos
				{/if}
			</h1>
			{#if searchResult}
				<p class="text-gray-600 mt-1">
					{searchResult.totalCount} {searchResult.totalCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
				</p>
			{/if}
		</div>
		
		<div class="flex gap-6">
			<!-- Filtros Desktop -->
			<aside class="w-64 flex-shrink-0 hidden lg:block {showFilters ? '' : 'lg:hidden'}">
				<div class="bg-white rounded-lg shadow-sm p-6 sticky top-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-lg font-semibold">Filtros</h2>
						{#if hasActiveFilters()}
							<button 
								onclick={clearFilters}
								class="text-sm text-[#00BFB3] hover:text-[#00A89D]"
							>
								Limpar tudo
							</button>
						{/if}
					</div>
					
					<!-- Categorias -->
					{#if searchResult?.facets.categories.length}
						<div class="mb-6">
							<h3 class="font-medium text-gray-900 mb-3">Categorias</h3>
							<div class="space-y-2">
								{#each searchResult.facets.categories as category}
									<label class="flex items-center cursor-pointer hover:text-gray-700">
										<input 
											type="checkbox"
											checked={filters.categories?.includes(category.id)}
											onchange={() => toggleCategory(category.id)}
											class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
										/>
										<span class="ml-2 text-sm">{category.name}</span>
										<span class="ml-auto text-xs text-gray-500">({category.count})</span>
									</label>
								{/each}
							</div>
						</div>
					{/if}
					
					<!-- Faixa de Preço -->
					{#if searchResult?.facets.priceRanges.length}
						<div class="mb-6">
							<h3 class="font-medium text-gray-900 mb-3">Preço</h3>
							<div class="space-y-3">
								<div>
									<label class="text-sm text-gray-600">Mínimo</label>
									<div class="relative mt-1">
										<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
										<input 
											type="number"
											bind:value={filters.priceMin}
											min="0"
											placeholder="0"
											class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
										/>
									</div>
								</div>
								<div>
									<label class="text-sm text-gray-600">Máximo</label>
									<div class="relative mt-1">
										<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
										<input 
											type="number"
											bind:value={filters.priceMax}
											min="0"
											placeholder="1000"
											class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
										/>
									</div>
								</div>
							</div>
							
							<!-- Sugestões de faixa -->
							<div class="mt-3 space-y-1">
								{#each searchResult.facets.priceRanges as range}
									<button
										onclick={() => {
											filters.priceMin = range.min;
											filters.priceMax = range.max === Infinity ? undefined : range.max;
										}}
										class="text-xs text-gray-600 hover:text-[#00BFB3] block"
									>
										{range.min === 0 ? 'Até' : `R$ ${range.min} -`} 
										{range.max === Infinity ? 'ou mais' : `R$ ${range.max}`}
										<span class="text-gray-400"> ({range.count})</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
					
					<!-- Tags -->
					{#if searchResult?.facets.tags.length}
						<div class="mb-6">
							<h3 class="font-medium text-gray-900 mb-3">Características</h3>
							<div class="flex flex-wrap gap-2">
								{#each searchResult.facets.tags as tag}
									<button
										onclick={() => toggleTag(tag.id)}
										class="px-3 py-1 text-xs rounded-full transition-colors {
											filters.tags?.includes(tag.id)
												? 'bg-[#00BFB3] text-white'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
										}"
									>
										{tag.name} ({tag.count})
									</button>
								{/each}
							</div>
						</div>
					{/if}
					
					<!-- Outras opções -->
					<div>
						<h3 class="font-medium text-gray-900 mb-3">Outras opções</h3>
						<div class="space-y-2">
							<label class="flex items-center cursor-pointer">
								<input 
									type="checkbox" 
									bind:checked={filters.hasFreeShipping}
									class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
								/>
								<span class="ml-2 text-sm">Frete Grátis</span>
							</label>
							<label class="flex items-center cursor-pointer">
								<input 
									type="checkbox" 
									bind:checked={filters.hasDiscount}
									class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
								/>
								<span class="ml-2 text-sm">Em Promoção</span>
							</label>
							<label class="flex items-center cursor-pointer">
								<input 
									type="checkbox" 
									bind:checked={filters.inStock}
									class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
								/>
								<span class="ml-2 text-sm">Disponível em estoque</span>
							</label>
						</div>
					</div>
				</div>
			</aside>
			
			<!-- Produtos -->
			<div class="flex-1">
				<!-- Barra de controles -->
				<div class="bg-white rounded-lg shadow-sm p-4 mb-6">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="flex items-center gap-4">
							<!-- Toggle filtros desktop -->
							<button 
								onclick={() => showFilters = !showFilters}
								class="hidden lg:flex items-center gap-2 text-gray-700 hover:text-gray-900"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
								</svg>
								{showFilters ? 'Ocultar' : 'Mostrar'} Filtros
							</button>
							
							<!-- Filtros mobile -->
							<button 
								onclick={() => showMobileFilters = true}
								class="lg:hidden flex items-center gap-2 text-gray-700 hover:text-gray-900"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
								</svg>
								Filtros
								{#if hasActiveFilters()}
									<span class="bg-[#00BFB3] text-white text-xs px-2 py-0.5 rounded-full">
										{filters.categories?.length || 0}
									</span>
								{/if}
							</button>
							
							<!-- View mode -->
							<div class="flex items-center gap-1 border border-gray-300 rounded-md">
								<button
									onclick={() => viewMode = 'grid'}
									class="p-2 {viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}"
									aria-label="Visualização em grade"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
								<button
									onclick={() => viewMode = 'list'}
									class="p-2 {viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}"
									aria-label="Visualização em lista"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
							</div>
						</div>
						
						<div class="flex items-center gap-4">
							<!-- Items por página -->
							<select 
								bind:value={itemsPerPage}
								onchange={() => currentPage = 1}
								class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							>
								<option value={20}>20 por página</option>
								<option value={40}>40 por página</option>
								<option value={60}>60 por página</option>
							</select>
							
							<!-- Ordenação -->
							<select 
								bind:value={sortBy}
								class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							>
								{#each sortOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
				
				<!-- Grid/Lista de produtos -->
				{#if isLoading}
					<div class="flex items-center justify-center h-64">
						<div class="text-center">
							<div class="w-12 h-12 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
							<p class="text-gray-600">Buscando produtos...</p>
						</div>
					</div>
				{:else if !searchResult || sortedProducts.length === 0}
					<div class="bg-white rounded-lg shadow-sm p-12 text-center">
						<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
						<p class="text-gray-600 mb-4">
							{#if searchQuery}
								Não encontramos produtos para "{searchQuery}"
							{:else}
								Tente ajustar os filtros ou fazer uma busca
							{/if}
						</p>
						{#if hasActiveFilters()}
							<button 
								onclick={clearFilters}
								class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
							>
								Limpar filtros
							</button>
						{/if}
					</div>
				{:else}
					{#if viewMode === 'grid'}
						<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{#each sortedProducts as product}
								<ProductCard {product} />
							{/each}
						</div>
					{:else}
						<!-- Lista view -->
						<div class="space-y-4">
							{#each sortedProducts as product}
								<div class="bg-white rounded-lg shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
									<img 
										src={product.images?.[0] || '/api/placeholder/120/120'} 
										alt={product.name}
										class="w-24 h-24 object-cover rounded"
									/>
									<div class="flex-1">
										<h3 class="font-medium text-gray-900 mb-1">{product.name}</h3>
										<p class="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
										<div class="flex items-center gap-4">
											{#if product.original_price}
												<span class="text-sm text-gray-500 line-through">
													R$ {product.original_price.toFixed(2)}
												</span>
											{/if}
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
									<div class="flex flex-col gap-2">
										<a 
											href="/produto/{product.slug}" 
											class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors text-center"
										>
											Ver produto
										</a>
										<button class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
											<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
											</svg>
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
					
					<!-- Paginação -->
					{#if totalPages > 1}
						<div class="mt-8 flex justify-center">
							<nav class="flex items-center gap-1">
								<button 
									onclick={() => goToPage(currentPage - 1)}
									disabled={currentPage === 1}
									class="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
									</svg>
								</button>
								
								{#each pageNumbers as pageNum}
									{#if typeof pageNum === 'number'}
										<button 
											onclick={() => goToPage(pageNum)}
											class="px-4 py-2 rounded-md {
												pageNum === currentPage
													? 'bg-[#00BFB3] text-white'
													: 'text-gray-700 hover:bg-gray-100'
											}"
										>
											{pageNum}
										</button>
									{:else}
										<span class="px-3 py-2 text-gray-500">...</span>
									{/if}
								{/each}
								
								<button 
									onclick={() => goToPage(currentPage + 1)}
									disabled={currentPage === totalPages}
									class="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							</nav>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal de Filtros Mobile -->
{#if showMobileFilters}
	<div class="fixed inset-0 z-50 lg:hidden">
		<div class="absolute inset-0 bg-black bg-opacity-50" onclick={() => showMobileFilters = false}></div>
		<div class="absolute right-0 top-0 h-full w-80 bg-white overflow-y-auto">
			<div class="p-4 border-b flex items-center justify-between">
				<h2 class="text-lg font-semibold">Filtros</h2>
				<button 
					onclick={() => showMobileFilters = false}
					class="p-2 hover:bg-gray-100 rounded-lg"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<!-- Conteúdo dos filtros (mesmo do desktop) -->
			<div class="p-4">
				<!-- Copiar conteúdo dos filtros aqui -->
			</div>
			
			<div class="p-4 border-t flex gap-2">
				<button 
					onclick={clearFilters}
					class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
				>
					Limpar
				</button>
				<button 
					onclick={() => showMobileFilters = false}
					class="flex-1 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D]"
				>
					Aplicar
				</button>
			</div>
		</div>
	</div>
{/if} 