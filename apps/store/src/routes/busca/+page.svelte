<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import ProductCardSkeleton from '$lib/components/ui/ProductCardSkeleton.svelte';
	import FilterSidebar from '$lib/components/filters/FilterSidebar.svelte';
	import SaveSearchButton from '$lib/components/search/SaveSearchButton.svelte';
	import { searchService, type SearchFilters, type SearchResult } from '$lib/services/searchService';
	
	// Reactive URL params
	let searchParams = $derived($page.url.searchParams);
	
	// Estados derivados da URL
	let searchQuery = $derived(searchParams.get('q') || '');
	let selectedCategories = $derived(searchParams.get('categoria')?.split(',').filter(Boolean) || []);
	let selectedBrands = $derived(searchParams.get('marca')?.split(',').filter(Boolean) || []);
	let selectedTags = $derived(searchParams.get('tag')?.split(',').filter(Boolean) || []);
	let priceMin = $derived(searchParams.get('preco_min') ? Number(searchParams.get('preco_min')) : undefined);
	let priceMax = $derived(searchParams.get('preco_max') ? Number(searchParams.get('preco_max')) : undefined);
	let hasDiscount = $derived(searchParams.get('promocao') === 'true');
	let hasFreeShipping = $derived(searchParams.get('frete_gratis') === 'true');
	let inStock = $derived(searchParams.get('disponivel') !== 'false');
	let minRating = $derived(searchParams.get('avaliacao') ? Number(searchParams.get('avaliacao')) : undefined);
	let condition = $derived(searchParams.get('condicao') as 'new' | 'used' | 'refurbished' | '' || '');
	let deliveryTime = $derived(searchParams.get('entrega') || '');
	let selectedSellers = $derived(searchParams.get('vendedor')?.split(',').filter(Boolean) || []);
	let selectedState = $derived(searchParams.get('estado') || '');
	let selectedCity = $derived(searchParams.get('cidade') || '');
	let sortBy = $derived(searchParams.get('ordenar') || 'relevancia');
	let currentPage = $derived(Number(searchParams.get('pagina')) || 1);
	let itemsPerPage = $derived(Number(searchParams.get('itens')) || 20);
	let viewMode = $derived<'grid' | 'list'>(searchParams.get('visualizar') === 'lista' ? 'list' : 'grid');
	
	// Filtros dinâmicos de opções (cor, tamanho, volt, etc)
	let selectedDynamicOptions = $derived((() => {
		const options: Record<string, string[]> = {};
		for (const [key, value] of searchParams.entries()) {
			if (key.startsWith('opcao_')) {
				const optionSlug = key.replace('opcao_', '');
				options[optionSlug] = value.split(',').filter(Boolean);
			}
		}
		return options;
	})());
	
	// Estados locais
	let searchResult = $state<SearchResult | null>(null);
	let isLoading = $state(true);
	let showDesktopFilters = $state(true);
	let showMobileFilters = $state(false);
	let compareProducts = $state<string[]>([]);
	let savedFilters = $state<any[]>([]);
	let lastSearchKey = $state('');
	
	// Inputs temporários para preço
	let tempPriceMin = $state<string>('');
	let tempPriceMax = $state<string>('');
	
	// Preview de resultados
	let previewCount = $state<number | null>(null);
	let isPreviewLoading = $state(false);
	
	// Debounce para preview
	let previewTimeout: NodeJS.Timeout;
	function debouncePreview() {
		clearTimeout(previewTimeout);
		isPreviewLoading = true;
		previewTimeout = setTimeout(async () => {
			// Simular contagem de preview
			const min = tempPriceMin ? Number(tempPriceMin) : undefined;
			const max = tempPriceMax ? Number(tempPriceMax) : undefined;
			// TODO: Fazer chamada real para API de preview
			previewCount = Math.floor(Math.random() * 100) + 10;
			isPreviewLoading = false;
		}, 500);
	}
	
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
	
	// Construir filtros a partir da URL
	const filters = $derived<SearchFilters>({
		categories: selectedCategories,
		brands: selectedBrands,
		tags: selectedTags,
		priceMin,
		priceMax,
		hasDiscount,
		hasFreeShipping,
		inStock,
		rating: minRating,
		condition: condition as 'new' | 'used' | 'refurbished' | undefined,
		sellers: selectedSellers,
		deliveryTime,
		location: selectedState || selectedCity ? {
			state: selectedState,
			city: selectedCity
		} : undefined,
		dynamicOptions: selectedDynamicOptions
	});
	
	// Atualizar URL com novos parâmetros
	function updateURL(updates: Record<string, string | string[] | number | boolean | undefined>) {
		const newParams = new URLSearchParams(searchParams);
		
		Object.entries(updates).forEach(([key, value]) => {
			if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
				newParams.delete(key);
			} else if (Array.isArray(value)) {
				newParams.set(key, value.join(','));
			} else {
				newParams.set(key, String(value));
			}
		});
		
		// Resetar para página 1 quando mudar filtros (exceto se estiver mudando a própria página)
		if (!updates.hasOwnProperty('pagina')) {
			newParams.set('pagina', '1');
		}
		
		goto(`?${newParams.toString()}`, { replaceState: true, keepFocus: true });
	}
	
	// Carregar produtos quando mudar query ou filtros
	$effect(() => {
		const searchKey = JSON.stringify({ searchQuery, filters, currentPage, itemsPerPage });
		if (searchKey !== lastSearchKey) {
			console.log('🔄 Effect disparado - mudança detectada');
			lastSearchKey = searchKey;
		performSearch();
		}
	});
	
	async function performSearch() {
		isLoading = true;
		console.log('🔍 Iniciando busca:', { searchQuery, filters, currentPage, itemsPerPage });
		
		// Timeout de segurança
		const timeoutId = setTimeout(() => {
			if (isLoading) {
				console.error('⏱️ Timeout na busca - forçando finalização');
				isLoading = false;
			}
		}, 5000); // 5 segundos
		
		try {
			const result = await searchService.search(searchQuery, filters, currentPage, itemsPerPage);
			console.log('✅ Resultado da busca:', result);
			searchResult = result;
			
			// Adicionar ao histórico se for uma nova busca
			if (currentPage === 1 && searchQuery) {
				searchService.addToHistory(searchQuery, result.totalCount);
			}
			
			// Atualizar inputs de preço se estiverem vazios
			if (!tempPriceMin && priceMin) tempPriceMin = String(priceMin);
			if (!tempPriceMax && priceMax) tempPriceMax = String(priceMax);
		} catch (error) {
			console.error('❌ Erro na busca:', error);
			searchResult = null;
		} finally {
			clearTimeout(timeoutId);
			isLoading = false;
			console.log('🏁 Busca finalizada, isLoading:', isLoading);
		}
	}
	
	// Aplicar ordenação localmente
	let sortedProducts = $derived(searchResult?.products ? sortProducts(searchResult.products) : []);
	
	function sortProducts(products: SearchResult['products']): SearchResult['products'] {
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
	
	// Handlers de filtros
	function toggleCategory(categoryId: string) {
		const newCategories = selectedCategories.includes(categoryId)
			? selectedCategories.filter(c => c !== categoryId)
			: [...selectedCategories, categoryId];
		updateURL({ categoria: newCategories });
	}
	
	function toggleBrand(brandId: string) {
		const newBrands = selectedBrands.includes(brandId)
			? selectedBrands.filter(b => b !== brandId)
			: [...selectedBrands, brandId];
		updateURL({ marca: newBrands });
	}
	
	function toggleTag(tagId: string) {
		const newTags = selectedTags.includes(tagId)
			? selectedTags.filter(t => t !== tagId)
			: [...selectedTags, tagId];
		updateURL({ tag: newTags });
	}
	
	function applyPriceFilter() {
		const min = tempPriceMin ? Number(tempPriceMin) : undefined;
		const max = tempPriceMax ? Number(tempPriceMax) : undefined;
		updateURL({ preco_min: min, preco_max: max });
	}
	
	function clearAllFilters() {
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
			// Limpar filtros dinâmicos
			...Object.keys(selectedDynamicOptions).reduce((acc, key) => ({
				...acc,
				[`opcao_${key}`]: undefined
			}), {})
		});
		tempPriceMin = '';
		tempPriceMax = '';
	}
	
	function hasActiveFilters(): boolean {
		return !!(
			selectedCategories.length ||
			selectedBrands.length ||
			selectedTags.length ||
			priceMin !== undefined ||
			priceMax !== undefined ||
			hasDiscount ||
			hasFreeShipping ||
			!inStock ||
			minRating ||
			condition ||
			deliveryTime ||
			selectedSellers.length ||
			selectedState ||
			selectedCity ||
			Object.keys(selectedDynamicOptions).length
		);
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
	
	// SEO Meta tags
	let pageTitle = $derived(() => {
		if (searchQuery) return `${searchQuery} - Busca | Marketplace GDG`;
		if (selectedCategories.length) return `${selectedCategories.join(', ')} - Produtos | Marketplace GDG`;
		return 'Todos os Produtos | Marketplace GDG';
	});
	
	let pageDescription = $derived(() => {
		const parts = [];
		if (searchQuery) parts.push(`Resultados para "${searchQuery}"`);
		if (selectedCategories.length) parts.push(`em ${selectedCategories.join(', ')}`);
		if (searchResult) parts.push(`- ${searchResult.totalCount} produtos encontrados`);
		return parts.join(' ') || 'Encontre os melhores produtos no Marketplace GDG';
	});
	
	// Salvar filtros atuais
	function saveCurrentFilters() {
		const currentFilters = {
			name: `Busca salva em ${new Date().toLocaleDateString()}`,
			query: searchQuery,
			filters: {
				categories: selectedCategories,
				brands: selectedBrands,
				tags: selectedTags,
				priceMin,
				priceMax,
				hasDiscount,
				hasFreeShipping,
				minRating,
				condition,
				deliveryTime
			},
			url: $page.url.search
		};
		
		// Salvar no localStorage por enquanto
		const saved = JSON.parse(localStorage.getItem('savedFilters') || '[]');
		saved.unshift(currentFilters);
		localStorage.setItem('savedFilters', JSON.stringify(saved.slice(0, 5))); // Máximo 5 buscas salvas
		
		// TODO: Implementar notificação de sucesso
		alert('Busca salva com sucesso!');
	}
	
	// Adicionar produto para comparar
	function toggleCompare(productId: string) {
		if (compareProducts.includes(productId)) {
			compareProducts = compareProducts.filter(id => id !== productId);
		} else if (compareProducts.length < 4) {
			compareProducts = [...compareProducts, productId];
		} else {
			alert('Você pode comparar no máximo 4 produtos');
		}
	}
</script>

<svelte:head>
	<title>{pageTitle()}</title>
	<meta name="description" content={pageDescription()} />
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
				{#if searchQuery}
					<li class="text-gray-400">/</li>
					<li class="text-gray-900 truncate max-w-[200px]">{searchQuery}</li>
				{/if}
			</ol>
		</nav>
		
		<!-- Header com resultados -->
		<div class="mb-6">
			<div class="flex items-start justify-between gap-4">
				<div>
			<h1 class="text-2xl font-bold text-gray-900">
				{#if searchQuery}
					Resultados para "{searchQuery}"
				{:else if selectedCategories.length}
							{@const categoryNames = selectedCategories.map(id => {
								const cat = searchResult?.facets.categories.find(c => (c.slug || c.id) === id || c.id === id);
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
						{searchQuery}
						{filters}
						resultCount={searchResult.totalCount}
					/>
						{/if}
									</div>
								</div>
								
		<div class="flex gap-6">
			<!-- Filtros Desktop -->
			<aside class="w-64 flex-shrink-0 hidden lg:block {showDesktopFilters ? '' : 'lg:hidden'}">
				<FilterSidebar
					categories={searchResult?.facets.categories.map(c => ({
						...c,
						selected: selectedCategories.includes(c.slug || c.id)
					})) || []}
					brands={searchResult?.facets.brands?.map(b => ({
						...b,
						selected: selectedBrands.includes(b.slug || b.id)
					})) || []}
					priceRange={searchResult && searchResult.products.length > 0 ? {
						min: 0,
						max: Math.max(...searchResult.products.map(p => p.price), 10000),
						current: { 
							min: priceMin !== undefined ? priceMin : 0, 
							max: priceMax !== undefined ? priceMax : Math.max(...searchResult.products.map(p => p.price), 10000)
						}
					} : undefined}
					ratingCounts={searchResult?.facets.ratings?.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.value]: r.count }), {}) || {}}
					currentRating={minRating}
					conditions={searchResult?.facets.conditions || [
						{ value: 'new', label: 'Novo', count: 0 },
						{ value: 'used', label: 'Usado', count: 0 },
						{ value: 'refurbished', label: 'Recondicionado', count: 0 }
					]}
					selectedConditions={condition ? [condition] : []}
					deliveryOptions={searchResult?.facets.deliveryOptions || [
						{ value: '24h', label: 'Entrega em 24h', count: 0 },
						{ value: '48h', label: 'Até 2 dias', count: 0 },
						{ value: '3days', label: 'Até 3 dias úteis', count: 0 },
						{ value: '7days', label: 'Até 7 dias úteis', count: 0 },
						{ value: '15days', label: 'Até 15 dias', count: 0 }
					]}
					selectedDeliveryTime={deliveryTime}
					sellers={searchResult?.facets.sellers || []}
					selectedSellers={selectedSellers}
					states={searchResult?.facets.locations?.states || []}
					cities={searchResult?.facets.locations?.cities || []}
					selectedLocation={{ state: selectedState, city: selectedCity }}
					hasDiscount={hasDiscount}
					hasFreeShipping={hasFreeShipping}
					showOutOfStock={!inStock}
					benefitsCounts={searchResult?.facets.benefits || { discount: 0, freeShipping: 0, outOfStock: 0 }}
					tags={searchResult?.facets.tags || []}
					selectedTags={selectedTags}
					dynamicOptions={searchResult?.facets.dynamicOptions || []}
					selectedDynamicOptions={selectedDynamicOptions}
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
										{selectedCategories.length + selectedBrands.length + selectedTags.length + (hasDiscount ? 1 : 0) + (hasFreeShipping ? 1 : 0) + Object.values(selectedDynamicOptions).reduce((sum, values) => sum + values.length, 0)}
									</span>
								{/if}
							</button>
							
							<!-- View mode -->
							<div class="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
								<button
									onclick={() => updateURL({ visualizar: undefined })}
									class="p-1.5 sm:p-2 {viewMode === 'grid' ? 'bg-[#00BFB3] text-white' : 'text-gray-600 hover:bg-gray-50'} transition-colors"
									aria-label="Visualização em grade"
									title="Visualização em grade"
								>
									<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
								<button
									onclick={() => updateURL({ visualizar: 'lista' })}
									class="p-1.5 sm:p-2 {viewMode === 'list' ? 'bg-[#00BFB3] text-white' : 'text-gray-600 hover:bg-gray-50'} transition-colors"
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
									value={itemsPerPage}
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
								value={sortBy}
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
				{#if isLoading}
					<div class="{viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}">
						{#each Array(itemsPerPage) as _}
							{#if viewMode === 'grid'}
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
						{console.log('📭 Renderizando estado vazio', { searchResult, sortedProducts })}
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
								onclick={clearAllFilters}
								class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
							>
								Limpar filtros
							</button>
						{/if}
					</div>
				{:else}
					{#if viewMode === 'grid'}
						<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
							{#each sortedProducts as product}
								<ProductCard product={product as any} />
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
							{/each}
						</div>
					{/if}
					
					<!-- Paginação -->
					{#if totalPages > 1}
						<nav class="mt-8 flex justify-center" aria-label="Paginação">
							<div class="flex items-center gap-1">
								<button 
									onclick={() => updateURL({ pagina: currentPage - 1 })}
									disabled={currentPage === 1}
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
												pageNum === currentPage
													? 'bg-[#00BFB3] text-white'
													: 'text-gray-700 hover:bg-gray-100'
											}"
											aria-label="Página {pageNum}"
											aria-current={pageNum === currentPage ? 'page' : undefined}
										>
											{pageNum}
										</button>
									{:else}
										<span class="px-3 py-2 text-gray-500">...</span>
									{/if}
								{/each}
								
								<button 
									onclick={() => updateURL({ pagina: currentPage + 1 })}
									disabled={currentPage === totalPages}
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
					categories={searchResult?.facets.categories.map(c => ({
						...c,
						selected: selectedCategories.includes(c.slug || c.id)
					})) || []}
					brands={searchResult?.facets.brands?.map(b => ({
						...b,
						selected: selectedBrands.includes(b.slug || b.id)
					})) || []}
					priceRange={searchResult && searchResult.products.length > 0 ? {
						min: 0,
						max: Math.max(...searchResult.products.map(p => p.price), 10000),
						current: { 
							min: priceMin !== undefined ? priceMin : 0, 
							max: priceMax !== undefined ? priceMax : Math.max(...searchResult.products.map(p => p.price), 10000)
						}
					} : undefined}
					ratingCounts={searchResult?.facets.ratings?.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.value]: r.count }), {}) || {}}
					currentRating={minRating}
					conditions={searchResult?.facets.conditions || [
						{ value: 'new', label: 'Novo', count: 0 },
						{ value: 'used', label: 'Usado', count: 0 },
						{ value: 'refurbished', label: 'Recondicionado', count: 0 }
					]}
					selectedConditions={condition ? [condition] : []}
					deliveryOptions={searchResult?.facets.deliveryOptions || [
						{ value: '24h', label: 'Entrega em 24h', count: 0 },
						{ value: '48h', label: 'Até 2 dias', count: 0 },
						{ value: '3days', label: 'Até 3 dias úteis', count: 0 },
						{ value: '7days', label: 'Até 7 dias úteis', count: 0 },
						{ value: '15days', label: 'Até 15 dias', count: 0 }
					]}
					selectedDeliveryTime={deliveryTime}
					sellers={searchResult?.facets.sellers || []}
					selectedSellers={selectedSellers}
					states={searchResult?.facets.locations?.states || []}
					cities={searchResult?.facets.locations?.cities || []}
					selectedLocation={{ state: selectedState, city: selectedCity }}
					hasDiscount={hasDiscount}
					hasFreeShipping={hasFreeShipping}
					showOutOfStock={!inStock}
					benefitsCounts={searchResult?.facets.benefits || { discount: 0, freeShipping: 0, outOfStock: 0 }}
					tags={searchResult?.facets.tags || []}
					selectedTags={selectedTags}
					dynamicOptions={searchResult?.facets.dynamicOptions || []}
					selectedDynamicOptions={selectedDynamicOptions}
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