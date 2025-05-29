<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import ProductCardSkeleton from '$lib/components/ui/ProductCardSkeleton.svelte';
	import FilterSidebar from '$lib/components/filters/FilterSidebar.svelte';
	import SaveSearchButton from '$lib/components/search/SaveSearchButton.svelte';
	import { searchService, type SearchFilters, type SearchResult } from '$lib/services/searchService';
	import { useStableUpdates } from '$lib/utils/transitions';
	
	// Estados principais
	let searchResult = $state<SearchResult | null>(null);
	let isLoading = $state(false);
	let showDesktopFilters = $state(true);
	let showMobileFilters = $state(false);
	
	// Estado derivado dos produtos ordenados
	let sortedProducts = $state<any[]>([]);
	
	// Preservar facets durante carregamento
	let stableFacets = $state<SearchResult['facets'] | null>(null);
	
	// Inputs temporários para preço
	let tempPriceMin = $state<string>('');
	let tempPriceMax = $state<string>('');
	
	// Variável para rastrear última URL processada
	let lastProcessedUrl = $state<string | null>(null);
	
	// Opções de ordenação
	const sortOptions = [
		{ value: 'relevancia', label: 'Mais relevantes' },
		{ value: 'menor-preco', label: 'Menor preço' },
		{ value: 'maior-preco', label: 'Maior preço' },
		{ value: 'mais-vendidos', label: 'Mais vendidos' },
		{ value: 'melhor-avaliados', label: 'Melhor avaliados' },
		{ value: 'lancamentos', label: 'Lançamentos' },
		{ value: 'maior-desconto', label: 'Maior desconto' }
	];
	
	// Função para extrair todos os parâmetros da URL
	function getUrlParams() {
		const params = $page.url.searchParams;
		return {
			searchQuery: params.get('q') || '',
			selectedCategories: params.get('categoria')?.split(',').filter(Boolean) || [],
			selectedBrands: params.get('marca')?.split(',').filter(Boolean) || [],
			selectedTags: params.get('tag')?.split(',').filter(Boolean) || [],
			priceMin: params.get('preco_min') ? Number(params.get('preco_min')) : undefined,
			priceMax: params.get('preco_max') ? Number(params.get('preco_max')) : undefined,
			hasDiscount: params.get('promocao') === 'true',
			hasFreeShipping: params.get('frete_gratis') === 'true',
			inStock: params.get('disponivel') !== 'false',
			minRating: params.get('avaliacao') ? Number(params.get('avaliacao')) : undefined,
			condition: params.get('condicao') as 'new' | 'used' | 'refurbished' | '' || '',
			deliveryTime: params.get('entrega') || '',
			selectedSellers: params.get('vendedor')?.split(',').filter(Boolean) || [],
			selectedState: params.get('estado') || '',
			selectedCity: params.get('cidade') || '',
			sortBy: params.get('ordenar') || 'relevancia',
			currentPage: Number(params.get('pagina')) || 1,
			itemsPerPage: Number(params.get('itens')) || 20,
			viewMode: params.get('visualizar') === 'lista' ? 'list' as const : 'grid' as const
		};
	}
	
	// Função para obter opções dinâmicas
	function getDynamicOptions() {
		const options: Record<string, string[]> = {};
		for (const [key, value] of $page.url.searchParams.entries()) {
			if (key.startsWith('opcao_')) {
				const optionSlug = key.replace('opcao_', '');
				options[optionSlug] = value.split(',').filter(Boolean);
			}
		}
		return options;
	}
	
	// Construir filtros para a busca
	function buildFilters(params: ReturnType<typeof getUrlParams>): SearchFilters {
		return {
			categories: params.selectedCategories,
			brands: params.selectedBrands,
			tags: params.selectedTags,
			priceMin: params.priceMin,
			priceMax: params.priceMax,
			hasDiscount: params.hasDiscount,
			hasFreeShipping: params.hasFreeShipping,
			inStock: params.inStock,
			rating: params.minRating,
			condition: params.condition as 'new' | 'used' | 'refurbished' | undefined,
			sellers: params.selectedSellers,
			deliveryTime: params.deliveryTime,
			location: params.selectedState || params.selectedCity ? {
				state: params.selectedState,
				city: params.selectedCity
			} : undefined,
			dynamicOptions: getDynamicOptions()
		};
	}
	
	// Função principal de busca
	async function performSearch() {
		const currentParams = $page.url.searchParams.toString();
		
		// Atualizar lastProcessedUrl aqui para evitar loops
		lastProcessedUrl = currentParams;
		isLoading = true;
		
		try {
			const params = getUrlParams();
			const filters = buildFilters(params);
			
			const result = await searchService.search(
				params.searchQuery, 
				filters, 
				params.currentPage, 
				params.itemsPerPage
			);
			
			searchResult = result;
			
			// Atualizar facets estáveis
			if (result?.facets) {
				stableFacets = result.facets;
			}
			
			// Ordenar produtos
			if (result?.products) {
				sortedProducts = sortProducts(result.products, params.sortBy);
			} else {
				sortedProducts = [];
			}
			
			// Adicionar ao histórico
			if (params.currentPage === 1 && params.searchQuery) {
				searchService.addToHistory(params.searchQuery, result.totalCount);
			}
			
			// Atualizar inputs de preço
			if (!tempPriceMin && params.priceMin) tempPriceMin = String(params.priceMin);
			if (!tempPriceMax && params.priceMax) tempPriceMax = String(params.priceMax);
		} catch (error) {
			console.error('❌ Erro na busca:', error);
			searchResult = null;
			sortedProducts = [];
		} finally {
			isLoading = false;
		}
	}
	
	// Função para ordenar produtos
	function sortProducts(products: SearchResult['products'], sortBy: string): SearchResult['products'] {
		const sorted = [...products];
		
		switch (sortBy) {
			case 'menor-preco':
				return sorted.sort((a, b) => a.price - b.price);
			case 'maior-preco':
				return sorted.sort((a, b) => b.price - a.price);
			case 'mais-vendidos':
				return sorted.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
			case 'melhor-avaliados':
				return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
			case 'maior-desconto':
				return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
			case 'lancamentos':
				return sorted.sort((a, b) => 
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			default:
				return sorted;
		}
	}
	
	// Atualizar URL com novos parâmetros
	function updateURL(updates: Record<string, string | string[] | number | boolean | undefined>) {
		const newParams = new URLSearchParams($page.url.searchParams);
		
		Object.entries(updates).forEach(([key, value]) => {
			if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
				newParams.delete(key);
			} else if (Array.isArray(value)) {
				newParams.set(key, value.join(','));
			} else {
				newParams.set(key, String(value));
			}
		});
		
		// Resetar para página 1 quando mudar filtros
		if (!updates.hasOwnProperty('pagina')) {
			newParams.set('pagina', '1');
		}
		
		goto(`?${newParams.toString()}`, { 
			replaceState: true, 
			keepFocus: true,
			noScroll: true
		});
	}
	
	// Função para aplicar filtro de preço
	function applyPriceFilter() {
		const min = tempPriceMin ? Number(tempPriceMin) : undefined;
		const max = tempPriceMax ? Number(tempPriceMax) : undefined;
		updateURL({ preco_min: min, preco_max: max });
	}
	
	// Limpar todos os filtros
	function clearAllFilters() {
		const dynamicOptions = getDynamicOptions();
		updateURL({
			categoria: undefined,
			marca: undefined,
			tag: undefined,
			preco_min: undefined,
			preco_max: undefined,
			promocao: undefined,
			frete_gratis: undefined,
			disponivel: undefined,
			avaliacao: undefined,
			condicao: undefined,
			entrega: undefined,
			vendedor: undefined,
			estado: undefined,
			cidade: undefined,
			...Object.keys(dynamicOptions).reduce((acc, key) => ({
				...acc,
				[`opcao_${key}`]: undefined
			}), {})
		});
		tempPriceMin = '';
		tempPriceMax = '';
	}
	
	// Verificar se há filtros ativos
	function hasActiveFilters(): boolean {
		const params = getUrlParams();
		const dynamicOptions = getDynamicOptions();
		
		return !!(
			params.selectedCategories.length ||
			params.selectedBrands.length ||
			params.selectedTags.length ||
			params.priceMin !== undefined ||
			params.priceMax !== undefined ||
			params.hasDiscount ||
			params.hasFreeShipping ||
			!params.inStock ||
			params.minRating ||
			params.condition ||
			params.deliveryTime ||
			params.selectedSellers.length ||
			params.selectedState ||
			params.selectedCity ||
			Object.keys(dynamicOptions).length
		);
	}
	
	// Observar mudanças na URL e executar busca
	$effect(() => {
		// Observar mudanças específicas nos parâmetros relevantes
		const currentParams = $page.url.searchParams.toString();
		
		// Só evitar busca duplicada se já foi processada (e não é a primeira vez)
		if (lastProcessedUrl !== null && currentParams === lastProcessedUrl) {
			return;
		}
		
		// Executar busca
		performSearch();
	});
	
	// Busca inicial no mount - apenas força primeira execução
	onMount(() => {
		// Se não tem parâmetros na URL, força primeira busca
		if (!$page.url.searchParams.toString()) {
			performSearch();
		}
	});
	
	// Valores computados para o template - usar untrack para evitar loops
	let urlParams = $derived.by(() => {
		$page.url.searchParams; // Observar mudanças
		return getUrlParams();
	});
	
	let dynamicOptions = $derived.by(() => {
		$page.url.searchParams; // Observar mudanças
		return getDynamicOptions();
	});
	
	let totalPages = $derived(searchResult ? Math.ceil(searchResult.totalCount / urlParams.itemsPerPage) : 0);
	let pageNumbers = $derived(getPageNumbers(urlParams.currentPage, totalPages));
	
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

<svelte:head>
	<title>{urlParams.searchQuery ? `${urlParams.searchQuery} - Busca | Marketplace GDG` : 'Todos os Produtos | Marketplace GDG'}</title>
	<meta name="description" content={urlParams.searchQuery ? `Resultados para "${urlParams.searchQuery}"` : 'Encontre os melhores produtos no Marketplace GDG'} />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={$page.url.href} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="w-full max-w-[1440px] mx-auto px-8 py-6">
		<!-- Breadcrumb -->
		<nav class="text-sm mb-6" aria-label="Breadcrumb">
			<ol class="flex items-center space-x-2">
				<li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
				<li class="text-gray-400">/</li>
				<li class="text-gray-900">Busca</li>
				{#if urlParams.searchQuery}
					<li class="text-gray-400">/</li>
					<li class="text-gray-900 truncate max-w-[200px]">{urlParams.searchQuery}</li>
				{/if}
			</ol>
		</nav>
		
		<!-- Header com resultados -->
		<div class="mb-6">
			<div class="flex items-start justify-between gap-4">
				<div>
			<h1 class="text-2xl font-bold text-gray-900">
				{#if urlParams.searchQuery}
					Resultados para "{urlParams.searchQuery}"
				{:else if urlParams.selectedCategories.length}
							{@const categoryNames = urlParams.selectedCategories.map(id => {
								const cat = stableFacets?.categories.find(c => (c.slug || c.id) === id || c.id === id);
								return cat?.name || id;
							})}
							{categoryNames.join(', ')}
				{:else}
					Todos os produtos
				{/if}
			</h1>
			{#if searchResult && !isLoading}
				<p class="text-gray-600 mt-1">
					{searchResult.totalCount} {searchResult.totalCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
				</p>
			{/if}
		</div>
		
				{#if searchResult && !isLoading && searchResult.totalCount > 0}
					<SaveSearchButton
						searchQuery={urlParams.searchQuery}
						filters={buildFilters(urlParams)}
						resultCount={searchResult.totalCount}
					/>
						{/if}
									</div>
								</div>
								
		<div class="flex gap-6">
			<!-- Filtros Desktop -->
			<aside class="w-64 flex-shrink-0 hidden lg:block {showDesktopFilters ? '' : 'lg:hidden'}" use:useStableUpdates>
				<FilterSidebar
					categories={(stableFacets || searchResult?.facets)?.categories.map(c => ({
						...c,
						selected: urlParams.selectedCategories.includes(c.slug || c.id)
					})) || []}
					brands={(stableFacets || searchResult?.facets)?.brands?.map(b => ({
						...b,
						selected: urlParams.selectedBrands.includes(b.slug || b.id)
					})) || []}
					priceRange={searchResult && searchResult.products.length > 0 ? {
						min: 0,
						max: Math.max(...searchResult.products.map(p => p.price), 10000),
						current: { 
							min: urlParams.priceMin !== undefined ? urlParams.priceMin : 0, 
							max: urlParams.priceMax !== undefined ? urlParams.priceMax : Math.max(...searchResult.products.map(p => p.price), 10000)
						}
					} : undefined}
					ratingCounts={(stableFacets || searchResult?.facets)?.ratings?.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.value]: r.count }), {}) || {}}
					currentRating={urlParams.minRating}
					conditions={(stableFacets || searchResult?.facets)?.conditions || [
						{ value: 'new', label: 'Novo', count: 0 },
						{ value: 'used', label: 'Usado', count: 0 },
						{ value: 'refurbished', label: 'Recondicionado', count: 0 }
					]}
					selectedConditions={urlParams.condition ? [urlParams.condition] : []}
					deliveryOptions={(stableFacets || searchResult?.facets)?.deliveryOptions || [
						{ value: '24h', label: 'Entrega em 24h', count: 0 },
						{ value: '48h', label: 'Até 2 dias', count: 0 },
						{ value: '3days', label: 'Até 3 dias úteis', count: 0 },
						{ value: '7days', label: 'Até 7 dias úteis', count: 0 },
						{ value: '15days', label: 'Até 15 dias', count: 0 }
					]}
					selectedDeliveryTime={urlParams.deliveryTime}
					sellers={(stableFacets || searchResult?.facets)?.sellers || []}
					selectedSellers={urlParams.selectedSellers}
					states={(stableFacets || searchResult?.facets)?.locations?.states || []}
					cities={(stableFacets || searchResult?.facets)?.locations?.cities || []}
					selectedLocation={{ state: urlParams.selectedState, city: urlParams.selectedCity }}
					hasDiscount={urlParams.hasDiscount}
					hasFreeShipping={urlParams.hasFreeShipping}
					showOutOfStock={!urlParams.inStock}
					benefitsCounts={(stableFacets || searchResult?.facets)?.benefits || { discount: 0, freeShipping: 0, outOfStock: 0 }}
					tags={(stableFacets || searchResult?.facets)?.tags || []}
					selectedTags={urlParams.selectedTags}
					dynamicOptions={(stableFacets || searchResult?.facets)?.dynamicOptions || []}
					selectedDynamicOptions={dynamicOptions}
					loading={isLoading}
					showCloseButton={true}
					onClose={() => showDesktopFilters = false}
					on:filterChange={(e) => {
						updateURL({
							categoria: e.detail.categories,
							marca: e.detail.brands,
							preco_min: e.detail.priceRange?.min,
							preco_max: e.detail.priceRange?.max
						});
					}}
					on:ratingChange={(e) => updateURL({ avaliacao: e.detail.rating })}
					on:conditionChange={(e) => updateURL({ condicao: e.detail.conditions[0] })}
					on:deliveryChange={(e) => updateURL({ entrega: e.detail.deliveryTime })}
					on:sellerChange={(e) => updateURL({ vendedor: e.detail.sellers })}
					on:locationChange={(e) => updateURL({ estado: e.detail.state, cidade: e.detail.city })}
					on:tagChange={(e) => updateURL({ tag: e.detail.tags })}
					on:dynamicOptionChange={(e) => updateURL({ [`opcao_${e.detail.optionSlug}`]: e.detail.values })}
					on:benefitChange={(e) => {
						switch (e.detail.benefit) {
							case 'discount':
								updateURL({ promocao: e.detail.value || undefined });
								break;
							case 'freeShipping':
								updateURL({ frete_gratis: e.detail.value || undefined });
								break;
							case 'outOfStock':
								updateURL({ disponivel: !e.detail.value || undefined });
								break;
						}
					}}
					on:clearAll={clearAllFilters}
				/>
			</aside>
			
			<!-- Produtos -->
			<div class="flex-1">
				<!-- Barra de controles -->
				<div class="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<!-- Lado esquerdo - Filtros e View Mode -->
						<div class="flex items-center gap-2 sm:gap-3">
							<!-- Toggle filtros desktop -->
							{#if !showDesktopFilters}
								<button 
									onclick={() => showDesktopFilters = true}
									class="hidden lg:flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
									</svg>
									<span class="hidden xl:inline">Mostrar Filtros</span>
								</button>
							{/if}
							
							<!-- Filtros mobile -->
							<button 
								onclick={() => showMobileFilters = true}
								class="lg:hidden flex items-center gap-2 px-3 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
							>
								<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
								</svg>
								<span class="text-sm sm:text-base">Filtros</span>
								{#if hasActiveFilters()}
									<span class="bg-white text-[#00BFB3] text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center">
										{urlParams.selectedCategories.length + urlParams.selectedBrands.length + urlParams.selectedTags.length + (urlParams.hasDiscount ? 1 : 0) + (urlParams.hasFreeShipping ? 1 : 0) + Object.values(dynamicOptions).reduce((sum, values) => sum + values.length, 0)}
									</span>
								{/if}
							</button>
							
							<!-- View mode -->
							<div class="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
								<button
									onclick={() => updateURL({ visualizar: undefined })}
									class="p-1.5 sm:p-2 {urlParams.viewMode === 'grid' ? 'bg-[#00BFB3] text-white' : 'text-gray-600 hover:bg-gray-50'} transition-colors"
									aria-label="Visualização em grade"
									title="Visualização em grade"
								>
									<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
								<button
									onclick={() => updateURL({ visualizar: 'lista' })}
									class="p-1.5 sm:p-2 {urlParams.viewMode === 'list' ? 'bg-[#00BFB3] text-white' : 'text-gray-600 hover:bg-gray-50'} transition-colors"
									aria-label="Visualização em lista"
									title="Visualização em lista"
								>
									<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
							</div>
							
							<!-- Contador de resultados - visível apenas em telas maiores -->
							{#if searchResult}
								<div class="hidden sm:block text-sm text-gray-600 px-2">
									<span class="font-medium">{searchResult.totalCount}</span> produtos
								</div>
							{/if}
						</div>
						
						<!-- Lado direito - Dropdowns -->
						<div class="flex items-center gap-2 sm:gap-3">
							<!-- Items por página - oculto em mobile -->
							<div class="hidden sm:block">
							<select 
								value={urlParams.itemsPerPage}
								onchange={(e) => updateURL({ itens: e.currentTarget.value })}
									class="select-sm"
							>
								<option value={20}>20 por página</option>
								<option value={40}>40 por página</option>
								<option value={60}>60 por página</option>
								<option value={100}>100 por página</option>
							</select>
							</div>
							
							<!-- Ordenação -->
							<select 
								value={urlParams.sortBy}
								onchange={(e) => updateURL({ ordenar: e.currentTarget.value })}
								class="select-sm min-w-[180px]"
							>
								{#each sortOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>
					
					<!-- Contador mobile -->
					{#if searchResult}
						<div class="sm:hidden text-sm text-gray-600 mt-2">
							<span class="font-medium">{searchResult.totalCount}</span> produtos encontrados
							</div>
					{/if}
				</div>
				
				<!-- Grid/Lista de produtos -->
				{#key totalPages}
				{#if isLoading}
					<div class="{urlParams.viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4' : 'space-y-4'}">
						{#each Array(urlParams.itemsPerPage) as _}
							{#if urlParams.viewMode === 'grid'}
								<ProductCardSkeleton />
							{:else}
								<!-- Skeleton para lista -->
								<div class="bg-white rounded-lg shadow-sm p-4 flex gap-4 animate-pulse">
									<div class="w-24 h-24 bg-gray-200 rounded"></div>
									<div class="flex-1 space-y-3">
										<div class="h-4 bg-gray-200 rounded w-3/4"></div>
										<div class="h-3 bg-gray-200 rounded w-full"></div>
										<div class="h-3 bg-gray-200 rounded w-2/3"></div>
										<div class="flex items-center gap-4">
											<div class="h-5 bg-gray-200 rounded w-20"></div>
											<div class="h-6 bg-gray-200 rounded w-24"></div>
						</div>
									</div>
									<div class="flex flex-col gap-2">
										<div class="w-32 h-10 bg-gray-200 rounded-lg"></div>
										<div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{:else if !searchResult || sortedProducts.length === 0}
					<div class="bg-white rounded-lg shadow-sm p-12 text-center">
						<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
						<p class="text-gray-600 mb-4">
							{#if urlParams.searchQuery}
								Não encontramos produtos para "{urlParams.searchQuery}"
							{:else}
								Tente ajustar os filtros ou fazer uma busca
							{/if}
						</p>
						{#if hasActiveFilters()}
							<button 
								onclick={clearAllFilters}
								class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
							>
								Limpar filtros
							</button>
						{/if}
					</div>
				{:else}
					<!-- Container com transição suave -->
					<div class="products-container">
						{#if urlParams.viewMode === 'grid'}
							<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4 min-h-[600px]">
								{#each sortedProducts as product, index (product.id)}
									<div class="product-wrapper">
										<ProductCard {product} />
									</div>
								{/each}
							</div>
						{:else}
							<!-- Lista view -->
							<div class="space-y-4 min-h-[600px]">
								{#each sortedProducts as product (product.id)}
									<div class="product-list-item">
										<div class="bg-white rounded-lg shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
											<img 
												src={product.images?.[0] || '/api/placeholder/120/120'} 
												alt={product.name}
												class="w-24 h-24 object-cover rounded"
											/>
											<div class="flex-1">
												<h3 class="font-medium text-gray-900 mb-1">
													<a href="/produto/{product.slug}" class="hover:text-[#00BFB3]">
														{product.name}
													</a>
												</h3>
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
												<button class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Adicionar aos favoritos">
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
					</div>
					
					<!-- Paginação -->
					{#if totalPages > 1}
						<nav class="mt-8 flex justify-center" aria-label="Paginação">
							<div class="flex items-center gap-1">
								<button 
									onclick={() => updateURL({ pagina: urlParams.currentPage - 1 })}
									disabled={urlParams.currentPage === 1}
									class="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
									aria-label="Página anterior"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
									</svg>
								</button>
								
								{#each pageNumbers as pageNum}
									{#if typeof pageNum === 'number'}
										<button 
											onclick={() => updateURL({ pagina: pageNum })}
											class="px-4 py-2 rounded-md {
												pageNum === urlParams.currentPage
													? 'bg-[#00BFB3] text-white'
													: 'text-gray-700 hover:bg-gray-100'
											}"
											aria-label="Página {pageNum}"
											aria-current={pageNum === urlParams.currentPage ? 'page' : undefined}
										>
											{pageNum}
										</button>
									{:else}
										<span class="px-3 py-2 text-gray-500">...</span>
									{/if}
								{/each}
								
								<button 
									onclick={() => updateURL({ pagina: urlParams.currentPage + 1 })}
									disabled={urlParams.currentPage === totalPages}
									class="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
									aria-label="Próxima página"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							</div>
						</nav>
					{/if}
				{/if}
				{/key}
			</div>
		</div>
	</div>
</div>

<!-- Modal de Filtros Mobile -->
{#if showMobileFilters}
	<div class="fixed inset-0 z-50 lg:hidden">
		<button 
			class="absolute inset-0 bg-black bg-opacity-50" 
			onclick={() => showMobileFilters = false}
			aria-label="Fechar filtros"
			type="button"
		></button>
		<div class="absolute right-0 top-0 h-full w-full max-w-sm bg-white overflow-hidden flex flex-col">
			<!-- Header -->
			<div class="p-4 border-b flex items-center justify-between bg-white">
				<h2 class="text-lg font-semibold">Filtros</h2>
				<button 
					onclick={() => showMobileFilters = false}
					class="p-2 hover:bg-gray-100 rounded-lg"
					aria-label="Fechar painel de filtros"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<!-- Conteúdo dos filtros -->
			<div class="flex-1 overflow-y-auto">
				<FilterSidebar
					categories={(stableFacets || searchResult?.facets)?.categories.map(c => ({
						...c,
						selected: urlParams.selectedCategories.includes(c.slug || c.id)
					})) || []}
					brands={(stableFacets || searchResult?.facets)?.brands?.map(b => ({
						...b,
						selected: urlParams.selectedBrands.includes(b.slug || b.id)
					})) || []}
					priceRange={searchResult && searchResult.products.length > 0 ? {
						min: 0,
						max: Math.max(...searchResult.products.map(p => p.price), 10000),
						current: { 
							min: urlParams.priceMin !== undefined ? urlParams.priceMin : 0, 
							max: urlParams.priceMax !== undefined ? urlParams.priceMax : Math.max(...searchResult.products.map(p => p.price), 10000)
						}
					} : undefined}
					ratingCounts={(stableFacets || searchResult?.facets)?.ratings?.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.value]: r.count }), {}) || {}}
					currentRating={urlParams.minRating}
					conditions={(stableFacets || searchResult?.facets)?.conditions || [
						{ value: 'new', label: 'Novo', count: 0 },
						{ value: 'used', label: 'Usado', count: 0 },
						{ value: 'refurbished', label: 'Recondicionado', count: 0 }
					]}
					selectedConditions={urlParams.condition ? [urlParams.condition] : []}
					deliveryOptions={(stableFacets || searchResult?.facets)?.deliveryOptions || [
						{ value: '24h', label: 'Entrega em 24h', count: 0 },
						{ value: '48h', label: 'Até 2 dias', count: 0 },
						{ value: '3days', label: 'Até 3 dias úteis', count: 0 },
						{ value: '7days', label: 'Até 7 dias úteis', count: 0 },
						{ value: '15days', label: 'Até 15 dias', count: 0 }
					]}
					selectedDeliveryTime={urlParams.deliveryTime}
					sellers={(stableFacets || searchResult?.facets)?.sellers || []}
					selectedSellers={urlParams.selectedSellers}
					states={(stableFacets || searchResult?.facets)?.locations?.states || []}
					cities={(stableFacets || searchResult?.facets)?.locations?.cities || []}
					selectedLocation={{ state: urlParams.selectedState, city: urlParams.selectedCity }}
					hasDiscount={urlParams.hasDiscount}
					hasFreeShipping={urlParams.hasFreeShipping}
					showOutOfStock={!urlParams.inStock}
					benefitsCounts={(stableFacets || searchResult?.facets)?.benefits || { discount: 0, freeShipping: 0, outOfStock: 0 }}
					tags={(stableFacets || searchResult?.facets)?.tags || []}
					selectedTags={urlParams.selectedTags}
					dynamicOptions={(stableFacets || searchResult?.facets)?.dynamicOptions || []}
					selectedDynamicOptions={dynamicOptions}
					loading={isLoading}
					class="bg-transparent shadow-none p-0"
					on:filterChange={(e) => {
						updateURL({
							categoria: e.detail.categories,
							marca: e.detail.brands,
							preco_min: e.detail.priceRange?.min,
							preco_max: e.detail.priceRange?.max
						});
					}}
					on:ratingChange={(e) => updateURL({ avaliacao: e.detail.rating })}
					on:conditionChange={(e) => updateURL({ condicao: e.detail.conditions[0] })}
					on:deliveryChange={(e) => updateURL({ entrega: e.detail.deliveryTime })}
					on:sellerChange={(e) => updateURL({ vendedor: e.detail.sellers })}
					on:locationChange={(e) => updateURL({ estado: e.detail.state, cidade: e.detail.city })}
					on:tagChange={(e) => updateURL({ tag: e.detail.tags })}
					on:dynamicOptionChange={(e) => updateURL({ [`opcao_${e.detail.optionSlug}`]: e.detail.values })}
					on:benefitChange={(e) => {
						switch (e.detail.benefit) {
							case 'discount':
								updateURL({ promocao: e.detail.value || undefined });
								break;
							case 'freeShipping':
								updateURL({ frete_gratis: e.detail.value || undefined });
								break;
							case 'outOfStock':
								updateURL({ disponivel: !e.detail.value || undefined });
								break;
						}
					}}
					on:clearAll={clearAllFilters}
				/>
			</div>
			
			<!-- Footer com ações -->
			<div class="p-4 border-t flex gap-2 bg-white">
				<button 
					onclick={clearAllFilters}
					class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
				>
					Limpar
				</button>
				<button 
					onclick={() => showMobileFilters = false}
					class="flex-1 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D]"
				>
					Ver {searchResult?.totalCount || 0} produtos
				</button>
			</div>
		</div>
	</div>
{/if} 

<style>
	/* Transições suaves para o container de produtos */
	.products-container {
		position: relative;
		min-height: 600px;
	}
	
	/* Previne pulos durante o carregamento */
	.product-wrapper {
		will-change: transform, opacity;
	}
	
	.product-list-item {
		will-change: transform, opacity;
	}
	
	/* Animação de entrada suave - DESABILITADA para evitar piscadas
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	*/
	
	/* Aplicar animação aos produtos quando aparecem - DESABILITADO
	.product-wrapper,
	.product-list-item {
		animation: fadeIn 0.3s ease-out forwards;
	}
	*/
	
	/* Delay escalonado para cada produto - DESABILITADO
	.product-wrapper:nth-child(1),
	.product-wrapper:nth-child(4),
	.product-list-item:nth-child(2),
	.product-list-item:nth-child(4) { animation-delay: 50ms; }
	.product-wrapper:nth-child(3),
	.product-wrapper:nth-child(5),
	.product-list-item:nth-child(3),
	.product-list-item:nth-child(5) { animation-delay: 100ms; }
	.product-wrapper:nth-child(6),
	.product-wrapper:nth-child(7),
	.product-list-item:nth-child(6),
	.product-list-item:nth-child(7) { animation-delay: 200ms; }
	*/
	
	/* Estabilizar o layout do grid */
	.grid {
		align-content: start;
	}
	
	/* Prevenir mudanças de layout durante transições */
	.flex-1 {
		min-width: 0;
	}
	
	/* Suavizar transições de filtros - REMOVIDO
	aside {
		transition: width 0.3s ease-out, opacity 0.3s ease-out;
	}
	*/
	
	/* Melhorar performance das transições */
	* {
		-webkit-backface-visibility: hidden;
		backface-visibility: hidden;
	}
</style>
