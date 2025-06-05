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
		
		const newUrl = `?${newParams.toString()}`;
		console.log('🔄 Atualizando URL:', newUrl);
		
		goto(newUrl, { 
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
	<div class="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 main-container">
		<!-- Breadcrumb alinhado com a identidade visual -->
		<nav class="mb-4" aria-label="Breadcrumb" style="font-family: 'Lato', sans-serif;">
			<div class="flex items-center gap-2 text-sm">
				<a 
					href="/" 
					class="flex items-center gap-1 text-gray-500 hover:text-[#00BFB3] transition-colors"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
					</svg>
					Início
				</a>
				<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				<span class="flex items-center gap-1 text-[#00BFB3] font-medium">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					Busca
					{#if urlParams.searchQuery}
						<span class="text-gray-400 font-normal">para</span>
						<span class="bg-[#00BFB3]/10 text-[#00BFB3] px-2 py-1 rounded-full font-medium max-w-[200px] truncate">
							"{urlParams.searchQuery}"
						</span>
					{/if}
				</span>
			</div>
		</nav>
		
		<!-- Header Padrão seguindo identidade das outras páginas -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6" style="font-family: 'Lato', sans-serif;">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
					<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</div>
				<div>
					<h1 class="text-2xl sm:text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">
						{#if urlParams.searchQuery}
							Resultados para "{urlParams.searchQuery}"
						{:else if urlParams.selectedCategories.length}
							{@const categoryNames = urlParams.selectedCategories.map(id => {
								const cat = stableFacets?.categories.find(c => (c.slug || c.id) === id || c.id === id);
								return cat?.name || id;
							})}
							{categoryNames.join(', ')}
						{:else}
							Busca de Produtos
						{/if}
					</h1>
					<p class="mt-1 text-gray-600 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">
						{#if searchResult && !isLoading}
							{searchResult.totalCount} {searchResult.totalCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
						{:else if isLoading}
							Buscando produtos...
						{:else}
							Encontre os melhores produtos em nossa loja
						{/if}
					</p>
				</div>
			</div>
			
			<!-- Descrição expandível -->
			<div class="mt-6 pt-6 border-t border-gray-200">
				<div class="text-center">
					<p class="text-gray-600 text-base leading-relaxed" style="font-family: 'Lato', sans-serif;">
						Use os filtros para refinar sua busca e encontre exatamente o que procura. 
						Navegue por categorias, marcas e aproveite as melhores ofertas!
					</p>
				</div>
			</div>
		</div>
								
		<div class="flex gap-4 lg:gap-6">
			<!-- Filtros Desktop -->
			<aside class="w-80 flex-shrink-0 hidden lg:block {showDesktopFilters ? '' : 'lg:hidden'}" use:useStableUpdates>
				<FilterSidebar
					categories={(stableFacets || searchResult?.facets)?.categories.map(c => {
						const isSelected = urlParams.selectedCategories.includes(c.slug || c.id);
						return {
							...c,
							selected: isSelected
						};
					}) || []}
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
				<!-- Barra de controles com identidade visual padrão -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6" style="font-family: 'Lato', sans-serif;">
					<!-- Layout compacto para mobile -->
					<div class="flex items-center justify-between gap-2 sm:gap-3">
						<!-- Lado esquerdo - Filtros e View Mode -->
						<div class="flex items-center gap-2">
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
								class="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors text-sm"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
								</svg>
								<span>Filtros</span>
								{#if hasActiveFilters()}
									<span class="bg-white text-[#00BFB3] text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center">
										{urlParams.selectedCategories.length + urlParams.selectedBrands.length + urlParams.selectedTags.length + (urlParams.hasDiscount ? 1 : 0) + (urlParams.hasFreeShipping ? 1 : 0) + Object.values(dynamicOptions).reduce((sum, values) => sum + values.length, 0)}
									</span>
								{/if}
							</button>
							
							<!-- View mode compacto -->
							<div class="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
								<button
									onclick={() => updateURL({ visualizar: undefined })}
									class="p-2 {urlParams.viewMode === 'grid' ? 'bg-[#00BFB3] text-white' : 'text-gray-600 hover:bg-gray-50'} transition-all"
									aria-label="Grade"
									title="Visualização em grade"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
								<div class="w-px bg-gray-300"></div>
								<button
									onclick={() => updateURL({ visualizar: 'lista' })}
									class="p-2 {urlParams.viewMode === 'list' ? 'bg-[#00BFB3] text-white' : 'text-gray-600 hover:bg-gray-50'} transition-all"
									aria-label="Lista"
									title="Visualização em lista"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
							</div>
							
							<!-- Contador compacto mobile -->
							{#if searchResult}
								<div class="lg:hidden flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
									<span class="font-medium text-[#00BFB3]">{searchResult.totalCount.toLocaleString('pt-BR')}</span>
								</div>
							{/if}
						</div>
						
						<!-- Lado direito - Ordenação -->
						<div class="flex items-center gap-2">
							<!-- Items por página - desktop -->
							<div class="hidden sm:flex items-center gap-2">
								<div class="flex items-center gap-1.5 text-sm text-gray-600">
									<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
									</svg>
									<span class="font-medium whitespace-nowrap">Exibir:</span>
								</div>
								<div class="relative">
									<select 
										value={urlParams.itemsPerPage}
										onchange={(e) => updateURL({ itens: e.currentTarget.value })}
										class="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-all hover:border-[#00BFB3]/50 cursor-pointer select-custom"
									>
										<option value={20}>20</option>
										<option value={40}>40</option>
										<option value={60}>60</option>
										<option value={100}>100</option>
									</select>
									<div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
										<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</div>
								</div>
							</div>
							
							<!-- Contador desktop -->
							{#if searchResult}
								<div class="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
									<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
									</svg>
									<span class="font-medium text-[#00BFB3]">{searchResult.totalCount.toLocaleString('pt-BR')}</span>
									<span>produto{searchResult.totalCount !== 1 ? 's' : ''}</span>
								</div>
							{/if}
							
							<!-- Ordenação compacta -->
							<div class="flex items-center gap-1 sm:gap-2">
								<svg class="w-4 h-4 text-[#00BFB3] hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
								</svg>
								<div class="relative">
									<select 
										value={urlParams.sortBy}
										onchange={(e) => updateURL({ ordenar: e.currentTarget.value })}
										class="pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-all hover:border-[#00BFB3]/50 cursor-pointer min-w-[140px] sm:min-w-[180px] select-custom"
									>
										{#each sortOptions as option}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
									<div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
										<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Grid/Lista de produtos -->
				{#key totalPages}
				{#if isLoading}
					<div class="{urlParams.viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6' : 'space-y-4'}">
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
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center" style="font-family: 'Lato', sans-serif;">
						<div class="w-16 h-16 sm:w-20 sm:h-20 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
							<svg class="w-8 h-8 sm:w-10 sm:h-10 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">Nenhum produto encontrado</h3>
						<p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed" style="font-family: 'Lato', sans-serif;">
							{#if urlParams.searchQuery}
								Não encontramos produtos para "{urlParams.searchQuery}". Tente ajustar os filtros ou use outros termos de busca.
							{:else}
								Tente ajustar os filtros ou fazer uma busca para encontrar produtos.
							{/if}
						</p>
						
						<div class="flex flex-col sm:flex-row gap-3 justify-center max-w-sm sm:max-w-none mx-auto">
							{#if hasActiveFilters()}
								<button 
									onclick={clearAllFilters}
									class="inline-flex items-center justify-center px-6 py-3 bg-white text-[#00BFB3] text-sm font-semibold rounded-lg border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
									style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
								>
									<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
									Limpar Filtros
								</button>
							{/if}
							<a
								href="/"
								class="inline-flex items-center justify-center px-6 py-3 bg-[#00BFB3] text-white text-sm font-semibold rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								Explorar Produtos
							</a>
						</div>
					</div>
				{:else}
					<!-- Container com transição suave -->
					<div class="products-container">
						{#if urlParams.viewMode === 'grid'}
							<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 min-h-[600px]">
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
						<div class="flex items-center justify-center space-x-1 sm:space-x-2 mt-6 sm:mt-8">
							<button 
								onclick={() => updateURL({ pagina: urlParams.currentPage - 1 })}
								disabled={urlParams.currentPage === 1}
								class="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<span class="hidden sm:inline">Anterior</span>
								<span class="sm:hidden">‹</span>
							</button>
							
							<div class="flex space-x-1 sm:space-x-2 max-w-[200px] sm:max-w-none overflow-x-auto">
								{#each pageNumbers as pageNum}
									{#if typeof pageNum === 'number'}
										<button 
											onclick={() => updateURL({ pagina: pageNum })}
											class="px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition-all touch-manipulation flex-shrink-0"
											class:bg-[#00BFB3]={pageNum === urlParams.currentPage}
											class:text-white={pageNum === urlParams.currentPage}
											class:bg-white={pageNum !== urlParams.currentPage}
											class:text-gray-700={pageNum !== urlParams.currentPage}
											class:border={pageNum !== urlParams.currentPage}
											class:border-gray-300={pageNum !== urlParams.currentPage}
											class:hover:bg-gray-50={pageNum !== urlParams.currentPage}
											class:focus:ring-2={pageNum !== urlParams.currentPage}
											class:focus:ring-gray-200={pageNum !== urlParams.currentPage}
											style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
										>
											{pageNum}
										</button>
									{:else}
										<span class="px-2 text-gray-500 flex items-center" style="font-family: 'Lato', sans-serif;">...</span>
									{/if}
								{/each}
							</div>
							
							<button 
								onclick={() => updateURL({ pagina: urlParams.currentPage + 1 })}
								disabled={urlParams.currentPage === totalPages}
								class="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation"
								style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
							>
								<span class="hidden sm:inline">Próxima</span>
								<span class="sm:hidden">›</span>
							</button>
						</div>
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
					class="p-2 hover:bg-gray-50 rounded-lg"
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
					categories={(stableFacets || searchResult?.facets)?.categories.map(c => {
						const isSelected = urlParams.selectedCategories.includes(c.slug || c.id);
						return {
							...c,
							selected: isSelected
						};
					}) || []}
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
	
	/* Melhorar performance das transições */
	.product-wrapper,
	.product-list-item {
		-webkit-backface-visibility: hidden;
	}
	
	/* Remove seta nativa do select */
	.select-custom {
		font-family: 'Lato', sans-serif;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		background-image: none !important;
		background-repeat: no-repeat;
		background-size: 0;
	}
	
	/* Remove seta específica do Safari */
	.select-custom::-webkit-inner-spin-button,
	.select-custom::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	
	/* Remove seta específica do Firefox */
	.select-custom::-moz-focus-inner {
		border: 0;
	}

	/* Touch improvements para mobile */
	@media (max-width: 768px) {
		.overflow-x-auto {
			scrollbar-width: none;
			-ms-overflow-style: none;
		}
		
		.overflow-x-auto::-webkit-scrollbar {
			display: none;
		}
		
		/* Garante que não haja overflow horizontal */
		.products-container {
			max-width: 100%;
			overflow-x: hidden;
		}
		
		/* Ajusta padding para mobile */
		.bg-white.rounded-lg.shadow-sm {
			margin-left: 0;
			margin-right: 0;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.product-wrapper,
		.product-list-item {
			animation: none;
			transition: none;
		}
	}
	
	/* Garante espaçamento consistente */
	.main-container {
		box-sizing: border-box;
	}
</style>
