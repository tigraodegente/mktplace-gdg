<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import { searchService, type SearchFilters, type SearchResult } from '$lib/services/searchService';
	import type { Product } from '@mktplace/shared-types';
	import FilterSidebar from '$lib/components/filters/FilterSidebar.svelte';
	import SortDropdown from '$lib/components/filters/SortDropdown.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	
	// Get category from URL
	let categorySlug = $derived($page.params.slug);
	
	// Estados
	let searchResult = $state<SearchResult | null>(null);
	let isLoading = $state(true);
	let currentPage = $state(1);
	let itemsPerPage = $state(24);
	let sortBy = $state('relevance');
	let viewMode = $state<'grid' | 'list'>('grid');
	
	// Informações da categoria
	let categoryInfo = $state({
		id: '',
		name: '',
		description: '',
		image: '',
		productCount: 0,
		subcategories: [] as Array<{ id: string; name: string; count: number; image: string }>
	});
	
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
	

	
	// Carregar categoria e produtos
	$effect(() => {
		if (categorySlug) {
			loadCategory();
		}
	});
	
	async function loadCategory() {
		isLoading = true;
		
		try {
			// Carregar informações da categoria da API
			const response = await fetch(`/api/categories/${categorySlug}`);
			const data = await response.json();
			
			if (data.success) {
				categoryInfo = data.data;
				// Definir filtro de categoria
				filters.categories = [categoryInfo.id];
			} else {
				// Fallback para categoria genérica
				categoryInfo = {
					id: categorySlug,
					name: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1).replace(/-/g, ' '),
					description: '',
					image: '',
					productCount: 0,
					subcategories: []
				};
			}
			
			// Buscar produtos
			await performSearch();
		} catch (error) {
			console.error('Erro ao carregar categoria:', error);
			isLoading = false;
		}
	}
	
	async function performSearch() {
		try {
			const result = await searchService.search('', filters, currentPage, itemsPerPage);
			searchResult = result;
		} catch (error) {
			console.error('Erro na busca:', error);
			searchResult = null;
		} finally {
			isLoading = false;
		}
	}
	
	// Aplicar ordenação localmente
	let sortedProducts = $derived(searchResult?.products ? sortProducts(searchResult.products) : []);
	
	function sortProducts(products: any[]): any[] {
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
			case 'best-selling':
				return sorted.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
			case 'rating':
				return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
			default:
				return sorted;
		}
	}
	
	// Opções de ordenação
	const sortOptions = [
		{ value: 'relevance', label: 'Mais relevantes' },
		{ value: 'best-selling', label: 'Mais vendidos' },
		{ value: 'rating', label: 'Melhor avaliados' },
		{ value: 'price-asc', label: 'Menor preço' },
		{ value: 'price-desc', label: 'Maior preço' },
		{ value: 'discount', label: 'Maior desconto' }
	];
	
	function goToPage(page: number) {
		currentPage = page;
		window.scrollTo({ top: 0, behavior: 'smooth' });
		performSearch();
	}
	
	// Calcular páginas
	let totalPages = $derived(searchResult ? Math.ceil(searchResult.totalCount / itemsPerPage) : 0);
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Hero da Categoria -->
	{#if categoryInfo.name}
		<div class="relative h-64 md:h-80 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] overflow-hidden">
			<div class="absolute inset-0 bg-black/20"></div>
			<img 
				src={categoryInfo.image} 
				alt={categoryInfo.name}
				class="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
			/>
			<div class="relative w-full max-w-[1440px] mx-auto px-8 h-full flex items-center">
				<div class="text-white max-w-2xl">
					<nav class="text-sm mb-4 flex items-center gap-2">
						<a href="/" class="hover:text-white/80">Início</a>
						<span>/</span>
						<span>{categoryInfo.name}</span>
					</nav>
					<h1 class="text-4xl md:text-5xl font-bold mb-4">{categoryInfo.name}</h1>
					<p class="text-lg text-white/90">{categoryInfo.description}</p>
					<div class="mt-4 flex items-center gap-4">
						<span class="text-2xl font-semibold">{categoryInfo.productCount}</span>
						<span class="text-white/80">produtos disponíveis</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<div class="w-full max-w-[1440px] mx-auto px-8 py-8">
		<!-- Subcategorias -->
		{#if categoryInfo.subcategories.length > 0}
			<div class="mb-8">
				<h2 class="text-xl font-semibold mb-4">Navegue por subcategoria</h2>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					{#each categoryInfo.subcategories as subcat}
						<a 
							href="/categoria/{categorySlug}/{subcat.id}"
							class="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden"
						>
							<div class="aspect-square relative overflow-hidden bg-gray-100">
								<img 
									src={subcat.image} 
									alt={subcat.name}
									class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
								/>
								<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
							</div>
							<div class="p-4">
								<h3 class="font-medium text-gray-900 group-hover:text-[#00BFB3] transition-colors">{subcat.name}</h3>
								<p class="text-sm text-gray-500">{subcat.count} produtos</p>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- Barra de controles -->
		<div class="bg-white rounded-lg shadow-sm p-4 mb-6">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<!-- Contador de resultados -->
					<span class="text-sm text-gray-600">
						{#if searchResult}
							Mostrando {Math.min(itemsPerPage, searchResult.totalCount)} de {searchResult.totalCount} produtos
						{/if}
					</span>
					
					<!-- View mode -->
					<div class="hidden md:flex items-center gap-1 border border-gray-300 rounded-md">
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
						onchange={() => { currentPage = 1; performSearch(); }}
						class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					>
						<option value={24}>24 por página</option>
						<option value={48}>48 por página</option>
						<option value={96}>96 por página</option>
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
		
		<!-- Grid de produtos -->
		{#if isLoading}
			<div class="flex items-center justify-center h-64">
				<div class="text-center">
					<div class="w-12 h-12 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p class="text-gray-600">Carregando produtos...</p>
				</div>
			</div>
		{:else if !searchResult || sortedProducts.length === 0}
			<div class="bg-white rounded-lg shadow-sm p-12 text-center">
				<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
				</svg>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
				<p class="text-gray-600">Esta categoria ainda não possui produtos.</p>
			</div>
		{:else}
			{#if viewMode === 'grid'}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
					{#each sortedProducts as product}
						<div class="group">
							<ProductCard {product} />
							<!-- Informações extras no hover -->
							<div class="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<div class="bg-white rounded-lg shadow-sm p-3 text-xs space-y-1">
									{#if product.brand}
										<p class="text-gray-600">Marca: <span class="font-medium">{product.brand}</span></p>
									{/if}
									{#if product.sold_count}
										<p class="text-gray-600">{product.sold_count}+ vendidos</p>
									{/if}
									{#if product.rating}
										<div class="flex items-center gap-1">
											<div class="flex">
												{#each Array(5) as _, i}
													<svg class="w-3 h-3 {i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
														<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
													</svg>
												{/each}
											</div>
											<span>({product.reviews_count})</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Lista view com mais detalhes -->
				<div class="space-y-4">
					{#each sortedProducts as product}
						<div class="bg-white rounded-lg shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
							<img 
								src={product.images?.[0] || '/api/placeholder/150/150'} 
								alt={product.name}
								class="w-32 h-32 object-cover rounded"
							/>
							<div class="flex-1">
								<div class="flex justify-between items-start">
									<div>
										<h3 class="font-medium text-gray-900 mb-1">{product.name}</h3>
										{#if product.brand}
											<p class="text-sm text-gray-600">Marca: {product.brand}</p>
										{/if}
										<p class="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
									</div>
									<div class="text-right">
										{#if product.original_price}
											<span class="text-sm text-gray-500 line-through">
												R$ {product.original_price.toFixed(2)}
											</span>
										{/if}
										<p class="text-xl font-bold text-[#00BFB3]">
											R$ {product.price.toFixed(2)}
										</p>
										{#if product.discount}
											<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
												-{product.discount}%
											</span>
										{/if}
									</div>
								</div>
								
								<div class="mt-3 flex items-center gap-6 text-sm">
									{#if product.rating}
										<div class="flex items-center gap-1">
											<div class="flex">
												{#each Array(5) as _, i}
													<svg class="w-4 h-4 {i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
														<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
													</svg>
												{/each}
											</div>
											<span class="text-gray-600">{product.rating} ({product.reviews_count} avaliações)</span>
										</div>
									{/if}
									
									{#if product.sold_count}
										<span class="text-gray-600">{product.sold_count}+ vendidos</span>
									{/if}
									
									{#if product.material}
										<span class="text-gray-600">Material: {product.material}</span>
									{/if}
									
									{#if product.shipping_info?.free_shipping}
										<span class="text-green-600 font-medium">Frete Grátis</span>
									{/if}
								</div>
								
								<div class="mt-3 flex gap-2">
									<a 
										href="/produto/{product.slug}" 
										class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
									>
										Ver detalhes
									</a>
									<button 
										class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
										aria-label="Adicionar {product.name} ao carrinho"
									>
										Adicionar ao carrinho
									</button>
									<button 
										class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
										aria-label="Adicionar {product.name} aos favoritos"
									>
										<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
										</svg>
									</button>
								</div>
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
							aria-label="Página anterior"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						
						{#each Array(Math.min(5, totalPages)) as _, i}
							{@const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2}
							{#if pageNum > 0 && pageNum <= totalPages}
								<button 
									onclick={() => goToPage(pageNum)}
									class="px-4 py-2 rounded-md {
										pageNum === currentPage
											? 'bg-[#00BFB3] text-white'
											: 'text-gray-700 hover:bg-gray-100'
									}"
									aria-label="Ir para página {pageNum}"
								>
									{pageNum}
								</button>
							{/if}
						{/each}
						
						<button 
							onclick={() => goToPage(currentPage + 1)}
							disabled={currentPage === totalPages}
							class="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label="Próxima página"
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