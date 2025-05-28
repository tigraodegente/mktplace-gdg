<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import { searchService, type SearchFilters, type SearchResult } from '$lib/services/searchService';
	
	// Tipo Product
	interface Product {
		id: string;
		name: string;
		slug: string;
		price: number;
		original_price?: number;
		discount?: number;
		rating?: number;
		sold_count?: number;
		created_at: string | Date;
		[key: string]: any;
	}
	
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
	let condition = $derived(searchParams.get('condicao') || '');
	let deliveryTime = $derived(searchParams.get('entrega') || '');
	let selectedSellers = $derived(searchParams.get('vendedor')?.split(',').filter(Boolean) || []);
	let sortBy = $derived(searchParams.get('ordenar') || 'relevancia');
	let currentPage = $derived(Number(searchParams.get('pagina')) || 1);
	let itemsPerPage = $derived(Number(searchParams.get('itens')) || 20);
	let viewMode = $derived<'grid' | 'list'>(searchParams.get('visualizar') === 'lista' ? 'list' : 'grid');
	
	// Estados locais
	let searchResult = $state<SearchResult | null>(null);
	let isLoading = $state(true);
	let showDesktopFilters = $state(true);
	let showMobileFilters = $state(false);
	let compareProducts = $state<string[]>([]);
	let savedFilters = $state<any[]>([]);
	
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
		inStock
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
			
			// Atualizar inputs de preço se estiverem vazios
			if (!tempPriceMin && priceMin) tempPriceMin = String(priceMin);
			if (!tempPriceMax && priceMax) tempPriceMax = String(priceMax);
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
			disponivel: undefined
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
			!inStock
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
			<h1 class="text-2xl font-bold text-gray-900">
				{#if searchQuery}
					Resultados para "{searchQuery}"
				{:else if selectedCategories.length}
					{selectedCategories.join(', ')}
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
		
		<div class="flex gap-6">
			<!-- Filtros Desktop -->
			<aside class="w-64 flex-shrink-0 hidden lg:block {showDesktopFilters ? '' : 'lg:hidden'}">
				<div class="bg-white rounded-lg shadow-sm sticky top-6">
					<!-- Header dos filtros -->
					<div class="p-4 border-b flex items-center justify-between">
						<h2 class="text-lg font-semibold">Filtros</h2>
						<div class="flex items-center gap-2">
							{#if hasActiveFilters()}
								<button 
									onclick={clearAllFilters}
									class="text-sm text-[#00BFB3] hover:text-[#00A89D]"
								>
									Limpar
								</button>
							{/if}
							<button
								onclick={() => showDesktopFilters = false}
								class="p-1 hover:bg-gray-100 rounded"
								aria-label="Fechar filtros"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
					
					<div class="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
						<!-- Filtros Rápidos Populares -->
						<div class="bg-[#00BFB3]/5 p-3 rounded-lg">
							<h3 class="text-sm font-medium text-gray-900 mb-2">🔥 Mais procurados</h3>
							<div class="flex flex-wrap gap-2">
								<button
									onclick={() => updateURL({ promocao: true, frete_gratis: true })}
									class="text-xs px-3 py-1 bg-white rounded-full hover:bg-[#00BFB3] hover:text-white transition-colors"
								>
									Ofertas + Frete Grátis
								</button>
								<button
									onclick={() => updateURL({ avaliacao: 4 })}
									class="text-xs px-3 py-1 bg-white rounded-full hover:bg-[#00BFB3] hover:text-white transition-colors"
								>
									4★ ou mais
								</button>
								<button
									onclick={() => updateURL({ entrega: '24h' })}
									class="text-xs px-3 py-1 bg-white rounded-full hover:bg-[#00BFB3] hover:text-white transition-colors"
								>
									Entrega Rápida
								</button>
							</div>
						</div>

						<!-- Categorias -->
						{#if searchResult?.facets.categories.length}
							<div>
								<h3 class="font-medium text-gray-900 mb-3 flex items-center justify-between">
									Categorias
									<span class="text-xs text-gray-500">{selectedCategories.length} selecionadas</span>
								</h3>
								<div class="space-y-2">
									{#each searchResult.facets.categories as category}
										<label class="flex items-center cursor-pointer hover:text-gray-700 group">
											<input 
												type="checkbox"
												checked={selectedCategories.includes(category.id)}
												onchange={() => toggleCategory(category.id)}
												class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
											/>
											<span class="ml-2 text-sm flex-1 group-hover:font-medium">{category.name}</span>
											<span class="text-xs text-gray-500">({category.count})</span>
										</label>
									{/each}
								</div>
							</div>
						{/if}
						
						<!-- Faixa de Preço com Preview -->
						<div>
							<h3 class="font-medium text-gray-900 mb-3 flex items-center justify-between">
								Faixa de Preço
								{#if priceMin || priceMax}
									<span class="text-xs text-[#00BFB3]">Filtro ativo</span>
								{/if}
							</h3>
							<div class="space-y-3">
								<div>
									<label for="price-min" class="text-sm text-gray-600">Mínimo</label>
									<div class="relative mt-1">
										<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
										<input 
											id="price-min"
											type="number"
											bind:value={tempPriceMin}
											min="0"
											placeholder="0"
											onkeydown={(e) => e.key === 'Enter' && applyPriceFilter()}
											oninput={debouncePreview}
											class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
										/>
									</div>
								</div>
								<div>
									<label for="price-max" class="text-sm text-gray-600">Máximo</label>
									<div class="relative mt-1">
										<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
										<input 
											id="price-max"
											type="number"
											bind:value={tempPriceMax}
											min="0"
											placeholder="1000"
											onkeydown={(e) => e.key === 'Enter' && applyPriceFilter()}
											oninput={debouncePreview}
											class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
										/>
									</div>
								</div>
								
								{#if previewCount !== null}
									<p class="text-xs text-center text-gray-600">
										{isPreviewLoading ? 'Calculando...' : `${previewCount} produtos nesta faixa`}
									</p>
								{/if}
								
								<button
									onclick={applyPriceFilter}
									class="w-full py-2 bg-[#00BFB3] text-white rounded-md hover:bg-[#00A89D] transition-colors text-sm font-medium"
								>
									Aplicar Filtro
								</button>
							</div>
							
							<!-- Sugestões de faixa -->
							{#if searchResult?.facets.priceRanges.length}
								<div class="mt-3 space-y-1">
									<p class="text-xs text-gray-500 mb-1">Sugestões rápidas:</p>
									{#each searchResult.facets.priceRanges as range}
										<button
											onclick={() => {
												tempPriceMin = String(range.min);
												tempPriceMax = range.max === Infinity ? '' : String(range.max);
												applyPriceFilter();
											}}
											class="text-xs text-gray-600 hover:text-[#00BFB3] block w-full text-left pl-2 py-1 hover:bg-gray-50 rounded"
										>
											{range.min === 0 ? 'Até' : `R$ ${range.min} -`} 
											{range.max === Infinity ? 'ou mais' : `R$ ${range.max}`}
											<span class="text-gray-400"> ({range.count})</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
						
						<!-- Avaliações -->
						<div>
							<h3 class="font-medium text-gray-900 mb-3">Avaliação dos Clientes</h3>
							<div class="space-y-2">
								{#each [5, 4, 3, 2] as stars}
									<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
										<input 
											type="radio"
											name="rating"
											checked={minRating === stars}
											onchange={() => updateURL({ avaliacao: minRating === stars ? undefined : stars })}
											class="sr-only"
										/>
										<div class="flex items-center gap-2">
											<div class="flex">
												{#each Array(5) as _, i}
													<svg class="w-4 h-4 {i < stars ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
														<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
													</svg>
												{/each}
											</div>
											<span class="text-sm {minRating === stars ? 'font-medium text-[#00BFB3]' : 'text-gray-600'}">
												{stars === 5 ? '5 estrelas' : `${stars} ou mais`}
											</span>
										</div>
									</label>
								{/each}
							</div>
						</div>
						
						<!-- Marcas -->
						{#if searchResult?.facets.brands?.length}
							<div>
								<h3 class="font-medium text-gray-900 mb-3">Marcas</h3>
								<div class="space-y-2 max-h-48 overflow-y-auto">
									{#each searchResult.facets.brands as brand}
										<label class="flex items-center cursor-pointer hover:text-gray-700">
											<input 
												type="checkbox"
												checked={selectedBrands.includes(brand.id)}
												onchange={() => toggleBrand(brand.id)}
												class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
											/>
											<span class="ml-2 text-sm flex-1">{brand.name}</span>
											<span class="text-xs text-gray-500">({brand.count})</span>
										</label>
									{/each}
								</div>
							</div>
						{/if}
						
						<!-- Condição do Produto -->
						<div>
							<h3 class="font-medium text-gray-900 mb-3">Condição</h3>
							<div class="space-y-2">
								{#each [
									{ value: 'novo', label: 'Novo', icon: '✨' },
									{ value: 'usado', label: 'Usado', icon: '♻️' },
									{ value: 'recondicionado', label: 'Recondicionado', icon: '🔧' }
								] as cond}
									<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
										<input 
											type="radio"
											name="condition"
											checked={condition === cond.value}
											onchange={() => updateURL({ condicao: condition === cond.value ? undefined : cond.value })}
											class="w-4 h-4 text-[#00BFB3] border-gray-300 focus:ring-[#00BFB3]"
										/>
										<span class="ml-2 text-sm flex items-center gap-1">
											<span>{cond.icon}</span>
											{cond.label}
										</span>
									</label>
								{/each}
							</div>
						</div>
						
						<!-- Tempo de Entrega -->
						<div>
							<h3 class="font-medium text-gray-900 mb-3">Tempo de Entrega</h3>
							<div class="space-y-2">
								{#each [
									{ value: 'hoje', label: 'Receba Hoje', badge: 'RÁPIDO' },
									{ value: '24h', label: 'Em 24 horas' },
									{ value: '48h', label: 'Em 48 horas' },
									{ value: '7dias', label: 'Até 7 dias' }
								] as delivery}
									<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
										<input 
											type="radio"
											name="delivery"
											checked={deliveryTime === delivery.value}
											onchange={() => updateURL({ entrega: deliveryTime === delivery.value ? undefined : delivery.value })}
											class="w-4 h-4 text-[#00BFB3] border-gray-300 focus:ring-[#00BFB3]"
										/>
										<span class="ml-2 text-sm flex-1">{delivery.label}</span>
										{#if delivery.badge}
											<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{delivery.badge}</span>
										{/if}
									</label>
								{/each}
							</div>
						</div>
						
						<!-- Tags/Características -->
						{#if searchResult?.facets.tags.length}
							<div>
								<h3 class="font-medium text-gray-900 mb-3">Características</h3>
								<div class="flex flex-wrap gap-2">
									{#each searchResult.facets.tags as tag}
										<button
											onclick={() => toggleTag(tag.id)}
											class="px-3 py-1 text-xs rounded-full transition-all {
												selectedTags.includes(tag.id)
													? 'bg-[#00BFB3] text-white scale-105'
													: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
											}"
										>
											{tag.name}
											<span class="ml-1">({tag.count})</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}
						
						<!-- Outras opções -->
						<div>
							<h3 class="font-medium text-gray-900 mb-3">Benefícios</h3>
							<div class="space-y-2">
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
									<input 
										type="checkbox" 
										checked={hasFreeShipping}
										onchange={() => updateURL({ frete_gratis: !hasFreeShipping })}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
									/>
									<span class="ml-2 text-sm flex items-center gap-2">
										<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
										Frete Grátis
									</span>
								</label>
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
									<input 
										type="checkbox" 
										checked={hasDiscount}
										onchange={() => updateURL({ promocao: !hasDiscount })}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
									/>
									<span class="ml-2 text-sm flex items-center gap-2">
										<span class="text-red-600">%</span>
										Em Promoção
									</span>
								</label>
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
									<input 
										type="checkbox" 
										checked={inStock}
										onchange={() => updateURL({ disponivel: !inStock })}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
									/>
									<span class="ml-2 text-sm flex items-center gap-2">
										<div class="w-2 h-2 bg-green-500 rounded-full"></div>
										Pronta Entrega
									</span>
								</label>
							</div>
						</div>
						
						<!-- Salvar Busca -->
						<div class="border-t pt-4">
							<button
								onclick={saveCurrentFilters}
								class="w-full py-2 border border-[#00BFB3] text-[#00BFB3] rounded-md hover:bg-[#00BFB3] hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
								</svg>
								Salvar esta busca
							</button>
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
							{#if !showDesktopFilters}
								<button 
									onclick={() => showDesktopFilters = true}
									class="hidden lg:flex items-center gap-2 text-gray-700 hover:text-gray-900"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
									</svg>
									Mostrar Filtros
								</button>
							{/if}
							
							<!-- Filtros mobile -->
							<button 
								onclick={() => showMobileFilters = true}
								class="lg:hidden flex items-center gap-2 px-4 py-2 bg-[#00BFB3] text-white rounded-lg"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
								</svg>
								Filtros
								{#if hasActiveFilters()}
									<span class="bg-white text-[#00BFB3] text-xs px-2 py-0.5 rounded-full font-semibold">
										{selectedCategories.length + selectedBrands.length + selectedTags.length + (hasDiscount ? 1 : 0) + (hasFreeShipping ? 1 : 0)}
									</span>
								{/if}
							</button>
							
							<!-- View mode -->
							<div class="flex items-center border border-gray-300 rounded-lg overflow-hidden">
								<button
									onclick={() => updateURL({ visualizar: undefined })}
									class="p-2 {viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}"
									aria-label="Visualização em grade"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
								<button
									onclick={() => updateURL({ visualizar: 'lista' })}
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
								value={itemsPerPage}
								onchange={(e) => updateURL({ itens: e.currentTarget.value })}
								class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							>
								<option value={20}>20 por página</option>
								<option value={40}>40 por página</option>
								<option value={60}>60 por página</option>
								<option value={100}>100 por página</option>
							</select>
							
							<!-- Ordenação -->
							<select 
								value={sortBy}
								onchange={(e) => updateURL({ ordenar: e.currentTarget.value })}
								class="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							>
								{#each sortOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>
					
					<!-- Filtros ativos (chips) -->
					{#if hasActiveFilters()}
						<div class="mt-4">
							<div class="flex items-center justify-between mb-2">
								<p class="text-sm text-gray-600">Filtros aplicados:</p>
								<button
									onclick={clearAllFilters}
									class="text-sm text-red-600 hover:text-red-700 font-medium"
								>
									Limpar todos
								</button>
							</div>
							<div class="flex flex-wrap gap-2">
								{#each selectedCategories as categoryId}
									{@const category = searchResult?.facets.categories.find(c => c.id === categoryId)}
									{#if category}
										<span class="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-sm rounded-full group hover:bg-gray-200">
											<span class="text-xs text-gray-500">Categoria:</span>
											{category.name}
											<button
												onclick={() => toggleCategory(categoryId)}
												class="ml-1 text-gray-400 hover:text-red-600"
												aria-label="Remover filtro de categoria {category.name}"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</span>
									{/if}
								{/each}
								
								{#each selectedBrands as brandId}
									{@const brand = searchResult?.facets.brands?.find(b => b.id === brandId)}
									{#if brand}
										<span class="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-sm rounded-full group hover:bg-gray-200">
											<span class="text-xs text-gray-500">Marca:</span>
											{brand.name}
											<button
												onclick={() => toggleBrand(brandId)}
												class="ml-1 text-gray-400 hover:text-red-600"
												aria-label="Remover filtro de marca {brand.name}"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</span>
									{/if}
								{/each}
								
								{#if priceMin !== undefined || priceMax !== undefined}
									<span class="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-sm rounded-full">
										<span class="text-xs text-green-700">💰</span>
										R$ {priceMin || 0} - {priceMax || '∞'}
										<button
											onclick={() => {
												updateURL({ preco_min: undefined, preco_max: undefined });
												tempPriceMin = '';
												tempPriceMax = '';
											}}
											class="ml-1 text-green-600 hover:text-red-600"
											aria-label="Remover filtro de preço"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</span>
								{/if}
								
								{#if minRating}
									<span class="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-sm rounded-full">
										<span class="text-xs">⭐</span>
										{minRating}+ estrelas
										<button
											onclick={() => updateURL({ avaliacao: undefined })}
											class="ml-1 text-yellow-600 hover:text-red-600"
											aria-label="Remover filtro de avaliação"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</span>
								{/if}
								
								{#if condition}
									<span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-sm rounded-full">
										{condition === 'novo' ? '✨ Novo' : condition === 'usado' ? '♻️ Usado' : '🔧 Recondicionado'}
										<button
											onclick={() => updateURL({ condicao: undefined })}
											class="ml-1 text-blue-600 hover:text-red-600"
											aria-label="Remover filtro de condição"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</span>
								{/if}
								
								{#if deliveryTime}
									<span class="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-sm rounded-full">
										🚚 {deliveryTime === 'hoje' ? 'Hoje' : deliveryTime === '24h' ? '24h' : deliveryTime === '48h' ? '48h' : '7 dias'}
										<button
											onclick={() => updateURL({ entrega: undefined })}
											class="ml-1 text-orange-600 hover:text-red-600"
											aria-label="Remover filtro de tempo de entrega"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</span>
								{/if}
								
								{#if hasDiscount}
									<span class="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-sm rounded-full">
										% Em Promoção
										<button
											onclick={() => updateURL({ promocao: undefined })}
											class="ml-1 text-red-600 hover:text-red-700"
											aria-label="Remover filtro de promoção"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</span>
								{/if}
								
								{#if hasFreeShipping}
									<span class="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-sm rounded-full">
										✓ Frete Grátis
										<button
											onclick={() => updateURL({ frete_gratis: undefined })}
											class="ml-1 text-green-600 hover:text-red-600"
											aria-label="Remover filtro de frete grátis"
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</span>
								{/if}
								
								{#each selectedTags as tagId}
									{@const tag = searchResult?.facets.tags.find(t => t.id === tagId)}
									{#if tag}
										<span class="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-sm rounded-full">
											{tag.name}
											<button
												onclick={() => toggleTag(tagId)}
												class="ml-1 text-purple-600 hover:text-red-600"
												aria-label="Remover filtro de tag {tag.name}"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										</span>
									{/if}
								{/each}
							</div>
						</div>
					{/if}
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
								onclick={clearAllFilters}
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
			<div class="flex-1 overflow-y-auto p-4 space-y-6">
				<!-- Mesmos filtros do desktop -->
				<!-- Categorias -->
				{#if searchResult?.facets.categories.length}
					<div>
						<h3 class="font-medium text-gray-900 mb-3">Categorias</h3>
						<div class="space-y-2">
							{#each searchResult.facets.categories as category}
								<label class="flex items-center cursor-pointer hover:text-gray-700">
									<input 
										type="checkbox"
										checked={selectedCategories.includes(category.id)}
										onchange={() => toggleCategory(category.id)}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
									/>
									<span class="ml-2 text-sm flex-1">{category.name}</span>
									<span class="text-xs text-gray-500">({category.count})</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}
				
				<!-- Faixa de Preço -->
				<div>
					<h3 class="font-medium text-gray-900 mb-3">Faixa de Preço</h3>
					<div class="space-y-3">
						<div>
							<label for="price-min-mobile" class="text-sm text-gray-600">Mínimo</label>
							<div class="relative mt-1">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
								<input 
									id="price-min-mobile"
									type="number"
									bind:value={tempPriceMin}
									min="0"
									placeholder="0"
									class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								/>
							</div>
						</div>
						<div>
							<label for="price-max-mobile" class="text-sm text-gray-600">Máximo</label>
							<div class="relative mt-1">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
								<input 
									id="price-max-mobile"
									type="number"
									bind:value={tempPriceMax}
									min="0"
									placeholder="1000"
									class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								/>
							</div>
						</div>
						<button
							onclick={applyPriceFilter}
							class="w-full py-2 bg-[#00BFB3] text-white rounded-md hover:bg-[#00A89D] transition-colors text-sm"
						>
							Aplicar
						</button>
					</div>
				</div>
				
				<!-- Tags/Características -->
				{#if searchResult?.facets.tags.length}
					<div>
						<h3 class="font-medium text-gray-900 mb-3">Características</h3>
						<div class="flex flex-wrap gap-2">
							{#each searchResult.facets.tags as tag}
								<button
									onclick={() => toggleTag(tag.id)}
									class="px-3 py-1 text-xs rounded-full transition-colors {
										selectedTags.includes(tag.id)
											? 'bg-[#00BFB3] text-white'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}"
								>
									{tag.name}
									<span class="ml-1">({tag.count})</span>
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
								checked={hasFreeShipping}
								onchange={() => updateURL({ frete_gratis: !hasFreeShipping })}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
							/>
							<span class="ml-2 text-sm">Frete Grátis</span>
						</label>
						<label class="flex items-center cursor-pointer">
							<input 
								type="checkbox" 
								checked={hasDiscount}
								onchange={() => updateURL({ promocao: !hasDiscount })}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
							/>
							<span class="ml-2 text-sm">Em Promoção</span>
						</label>
						<label class="flex items-center cursor-pointer">
							<input 
								type="checkbox" 
								checked={inStock}
								onchange={() => updateURL({ disponivel: !inStock })}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]" 
							/>
							<span class="ml-2 text-sm">Disponível em estoque</span>
						</label>
					</div>
				</div>
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