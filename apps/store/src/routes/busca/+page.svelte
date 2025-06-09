<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	import ProductCardSkeleton from '$lib/components/ui/ProductCardSkeleton.svelte';
	import FilterSidebar from '$lib/components/filters/FilterSidebar.svelte';
	import SaveSearchButton from '$lib/components/search/SaveSearchButton.svelte';

	// Props do servidor
	let { data } = $props();

	// ✅ CARREGAMENTO DIRETO DOS DADOS DO SERVIDOR 
	let products = $state<any[]>(data?.serverData?.products || []);
	let totalCount = $state(data?.serverData?.totalCount || 0);
	let isLoading = $state(false);
	
	// ✅ CARREGAMENTO DIRETO DOS FACETS DO SERVIDOR
	let facets = $state<any>(data?.serverData?.facets || {
		categories: [],
		brands: [],
		tags: [],
		priceRange: { min: 0, max: 10000 },
		ratings: [],
		conditions: [],
		deliveryOptions: [],
		sellers: [],
		benefits: { discount: 0, freeShipping: 0, outOfStock: 0 },
		dynamicOptions: []
	});

	// ✅ OTIMIZAÇÕES DE PERFORMANCE SIMPLIFICADAS
	let searchCache = new Map<string, any>();
	let lastCacheCleanup = Date.now();
	const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
	
	// Estados para optimistic updates
	let optimisticProducts = $state<any[]>([]);
	let optimisticTotalCount = $state(0);
	let optimisticFilters = $state<any>({});
	let hasOptimisticUpdates = $state(false);

	// Controles de interface
	let showDesktopFilters = $state(true);
	let showMobileFilters = $state(false);
	
	// ✅ CONTROLE DE NAVEGAÇÃO - DECLARAR ANTES DO USO
	let isInternalNavigation = $state(false);
	
	// Opções de ordenação
	const sortOptions = [
		{ value: 'relevancia', label: 'Mais relevantes' },
		{ value: 'menor-preco', label: 'Menor preço' },
		{ value: 'maior-preco', label: 'Maior preço' },
		{ value: 'mais-vendidos', label: 'Mais vendidos' },
		{ value: 'melhor-avaliados', label: 'Melhor avaliados' },
		{ value: 'lancamentos', label: 'Lançamentos' }
	];
	
	// ✅ FUNÇÃO UTILITÁRIA: Extrair parâmetros completos da URL
	function getUrlParams() {
		const params = new URLSearchParams($page.url.searchParams);
		
		return {
			q: params.get('q') || '',
			categoria: params.get('categoria')?.split(',').filter(Boolean) || [],
			marca: params.get('marca')?.split(',').filter(Boolean) || [],
			preco_min: params.get('preco_min') || '',
			preco_max: params.get('preco_max') || '',
			promocao: params.get('promocao') === 'true',
			disponivel: params.get('disponivel') !== 'false',
			frete_gratis: params.get('frete_gratis') === 'true',
			condicao: params.get('condicao')?.split(',').filter(Boolean) || [],
			avaliacao: params.get('avaliacao') || '',
			vendedor: params.get('vendedor')?.split(',').filter(Boolean) || [],
			localizacao: params.get('localizacao') || '',
			beneficio: params.get('beneficio')?.split(',').filter(Boolean) || [],
			tema: params.get('tema')?.split(',').filter(Boolean) || [],
			tempo_entrega: params.get('tempo_entrega') || '',
			estado: params.get('estado') || '',
			cidade: params.get('cidade') || '',
			ordenar: params.get('ordenar') || 'relevancia',
			pagina: Math.max(1, Number(params.get('pagina')) || 1),
			itens: Math.min(100, Math.max(1, Number(params.get('itens')) || 20))
		};
	}

	// ✅ FUNÇÃO UTILITÁRIA: Extrair opções dinâmicas
	function extractDynamicOptions() {
		const options: Record<string, string[]> = {};
		for (const [key, value] of $page.url.searchParams.entries()) {
			if (key.startsWith('opcao_')) {
				const optionSlug = key.replace('opcao_', '');
				options[optionSlug] = value.split(',').filter(Boolean);
			}
		}
		return options;
	}
	
	// ✅ FUNÇÃO SIMPLES: Atualizar URL - COM MARCAÇÃO INTERNA
	function updateURL(params: Record<string, any>) {
		console.log('🌐 updateURL chamada com:', params);
		isInternalNavigation = true; // ⚠️ MARCAR como navegação interna
		
		const urlParams = new URLSearchParams($page.url.searchParams);
		console.log('🌐 URL atual:', $page.url.search);
		
		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
				console.log(`🌐 Removendo parâmetro: ${key}`);
				urlParams.delete(key);
			} else if (Array.isArray(value)) {
				console.log(`🌐 Definindo array: ${key} = ${value.join(',')}`);
				urlParams.set(key, value.join(','));
			} else {
				console.log(`🌐 Definindo valor: ${key} = ${String(value)}`);
				urlParams.set(key, String(value));
			}
		});

		// Resetar para página 1 quando mudar filtros (exceto se for mudança de página)
		if (!params.hasOwnProperty('pagina')) {
			urlParams.set('pagina', '1');
		}

		const newUrl = `?${urlParams.toString()}`;
		console.log('🌐 Nova URL (interna):', newUrl);
		goto(newUrl, { replaceState: true });
	}

	// ✅ FUNÇÃO SIMPLES: Ordenar produtos
	function sortProducts(productsToSort: any[], sortBy: string): any[] {
		const sorted = [...productsToSort];
		
		switch (sortBy) {
			case 'menor-preco':
				return sorted.sort((a, b) => a.price - b.price);
			case 'maior-preco':
				return sorted.sort((a, b) => b.price - a.price);
			case 'mais-vendidos':
				return sorted.sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0));
			case 'melhor-avaliados':
				return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
			case 'lancamentos':
				return sorted.sort((a, b) => 
					new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
				);
			default:
				return sorted;
		}
	}
	
	// 🚀 FUNÇÃO OTIMIZADA: Executar busca com cache e performance
	async function executeSearch(forceRefresh = false, overrideParams?: any) {
		// Limpar cache antigo periodicamente
		cleanupCache();
		
		// Usar parâmetros passados ou ler da URL
		const urlParams = overrideParams || getUrlParams();
		const cacheKey = generateCacheKey(urlParams);
		
		console.log('🔍 executeSearch - INICIANDO:', {
			forceRefresh,
			overrideParams: !!overrideParams,
			urlParams,
			cacheKey,
			cacheSize: searchCache.size,
			hasCache: searchCache.has(cacheKey)
		});
		
		// Verificar cache primeiro (só se não for um refresh forçado)
		if (!forceRefresh && searchCache.has(cacheKey)) {
			const cachedResult = searchCache.get(cacheKey);
			console.log('⚡ USANDO RESULTADO DO CACHE:', {
				cacheKey,
				cachedProducts: cachedResult.products.length,
				cachedTotal: cachedResult.totalCount
			});
			
			products = cachedResult.products;
			totalCount = cachedResult.totalCount;
			facets = cachedResult.facets;
			resetOptimisticUpdates();
			return;
		}

		isLoading = true;
		console.log('🔍 EXECUTANDO BUSCA COMPLETA...', { forceRefresh, cacheKey });

		try {
			const queryParams = new URLSearchParams();
			
			// Parâmetros básicos
			if (urlParams.q) queryParams.set('q', urlParams.q);
			if (urlParams.categoria?.length) queryParams.set('categoria', urlParams.categoria.join(','));
			if (urlParams.marca?.length) queryParams.set('marca', urlParams.marca.join(','));
			if (urlParams.preco_min) queryParams.set('preco_min', urlParams.preco_min);
			if (urlParams.preco_max) queryParams.set('preco_max', urlParams.preco_max);
			
			// Novos filtros
			if (urlParams.promocao) queryParams.set('promocao', 'true');
			if (urlParams.frete_gratis) queryParams.set('frete_gratis', 'true');
			if (!urlParams.disponivel) queryParams.set('disponivel', 'false');
			if (urlParams.avaliacao) queryParams.set('avaliacao', String(urlParams.avaliacao));
			if (urlParams.condicao.length) queryParams.set('condicao', urlParams.condicao.join(','));
			if (urlParams.vendedor?.length) queryParams.set('vendedor', urlParams.vendedor.join(','));
			if (urlParams.beneficio?.length) queryParams.set('beneficio', urlParams.beneficio.join(','));
			if (urlParams.tema?.length) queryParams.set('tema', urlParams.tema.join(','));
			
			// Meta
			if (urlParams.ordenar) queryParams.set('ordenar', urlParams.ordenar);
			if (urlParams.pagina) queryParams.set('pagina', String(urlParams.pagina));

			// Filtros dinâmicos
			const dynamicOptions = extractDynamicOptions();
			Object.entries(dynamicOptions).forEach(([key, values]) => {
				if (values.length > 0) {
					queryParams.set(`opcao_${key}`, values.join(','));
				}
			});

			const response = await fetch(`/api/products?${queryParams.toString()}`);
			const result = await response.json();

			if (result.success) {
				console.log('✅ BUSCA CONCLUÍDA:', {
					products: result.data?.products?.length || 0,
					totalCount: result.data?.pagination?.total || 0,
					cached: false
				});

				const searchResult = {
					products: sortProducts(result.data?.products || [], urlParams.ordenar),
					totalCount: result.data?.pagination?.total || 0,
					facets: {
						categories: result.data.facets?.categories || [],
						brands: result.data.facets?.brands || [],
						tags: result.data.facets?.tags || [],
						priceRange: result.data.facets?.priceRange || { min: 0, max: 10000 },
						ratings: result.data.facets?.ratings || [],
						conditions: result.data.facets?.conditions || [],
						deliveryOptions: result.data.facets?.deliveryOptions || [],
						sellers: result.data.facets?.sellers || [],
						benefits: result.data.facets?.benefits || { discount: 0, freeShipping: 0, outOfStock: 0 },
						dynamicOptions: result.data.facets?.dynamicOptions || []
					}
				};

				// Atualizar estados
				products = searchResult.products;
				totalCount = searchResult.totalCount;
				facets = searchResult.facets;
				
				// Salvar no cache
				searchCache.set(cacheKey, searchResult);
				console.log('💾 Resultado salvo no cache:', cacheKey);
				
				// Resetar optimistic updates
				resetOptimisticUpdates();
			} else {
				console.error('❌ BUSCA FALHOU:', result);
				products = [];
				totalCount = 0;
				resetOptimisticUpdates();
			}
		} catch (error) {
			console.error('❌ ERRO NA BUSCA:', error);
			products = [];
			totalCount = 0;
			resetOptimisticUpdates();
		} finally {
			isLoading = false;
		}
	}

	// ✅ FUNÇÃO REMOVIDA: debouncedSearch não é mais necessária

	// ✅ FUNÇÃO SIMPLES: Limpar filtros
	function clearAllFilters() {
		const dynamicOptions = extractDynamicOptions();
		const clearParams = {
			categoria: undefined,
			marca: undefined,
			preco_min: undefined,
			preco_max: undefined,
			promocao: undefined,
			frete_gratis: undefined,
			disponivel: undefined,
			avaliacao: undefined,
			condicao: undefined,
			vendedor: undefined,
			beneficio: undefined,
			tema: undefined,
			tempo_entrega: undefined,
			estado: undefined,
			cidade: undefined,
			...Object.keys(dynamicOptions).reduce((acc, key) => ({
				...acc,
				[`opcao_${key}`]: undefined
			}), {}),
			pagina: 1
		};
		updateURL(clearParams);
	}

	// ✅ FUNÇÃO SIMPLES: Verificar filtros ativos
	function hasActiveFilters(): boolean {
		const params = getUrlParams();
		const dynamicOptions = extractDynamicOptions();
		
		return !!(
			params.categoria.length ||
			params.marca.length ||
			params.preco_min ||
			params.preco_max ||
			params.promocao ||
			params.frete_gratis ||
			!params.disponivel ||
			params.avaliacao ||
			params.condicao.length ||
			params.vendedor.length ||
			params.beneficio.length ||
			params.tema.length ||
			Object.keys(dynamicOptions).length
		);
	}
	
	// ✅ HANDLERS SIMPLIFICADOS - SEM CONFLITOS
	function handleFilterChange(event: CustomEvent) {
		const { categories, brands, priceRange } = event.detail;
		const updateParams = {
			categoria: categories?.length ? categories : undefined,
			marca: brands?.length ? brands : undefined,
			preco_min: priceRange?.min ? String(priceRange.min) : undefined,
			preco_max: priceRange?.max ? String(priceRange.max) : undefined
		};
		
		console.log('🎯 handleFilterChange:', updateParams);
		updateURL(updateParams);
		// ⚠️ REMOVIDO debouncedSearch - deixar o effect() da URL cuidar disso
	}

	function handleRatingChange(event: CustomEvent) {
		const updateParams = { avaliacao: event.detail.rating || undefined };
		updateURL(updateParams);
	}

	function handleConditionChange(event: CustomEvent) {
		const updateParams = { condicao: event.detail.conditions?.length ? event.detail.conditions : undefined };
		updateURL(updateParams);
	}

	function handleDeliveryChange(event: CustomEvent) {
		const updateParams = { tempo_entrega: event.detail.deliveryTime || undefined };
		updateURL(updateParams);
	}

	function handleSellerChange(event: CustomEvent) {
		const updateParams = { vendedor: event.detail.sellers?.length ? event.detail.sellers : undefined };
		updateURL(updateParams);
	}

	function handleLocationChange(event: CustomEvent) {
		const updateParams = { 
			estado: event.detail.state || undefined,
			cidade: event.detail.city || undefined
		};
		updateURL(updateParams);
	}

	function handleBenefitChange(event: CustomEvent) {
		const { benefit, value } = event.detail;
		const updateParams = { 
			[benefit === 'discount' ? 'promocao' : 
			  benefit === 'freeShipping' ? 'frete_gratis' :
			  'disponivel']: benefit === 'outOfStock' ? !value : value || undefined
		};
		updateURL(updateParams);
	}

	function handleTagChange(event: CustomEvent) {
		const updateParams = { tema: event.detail.tags?.length ? event.detail.tags : undefined };
		updateURL(updateParams);
	}

	function handleDynamicOptionChange(event: CustomEvent) {
		const { optionSlug, values } = event.detail;
		const updateParams = { [`opcao_${optionSlug}`]: values?.length ? values : undefined };
		updateURL(updateParams);
	}

	function handleClearAll() {
		console.log('🧹 Limpando todos os filtros');
		clearAllFilters();
	}

	// ✅ HANDLER: Mudança de ordenação simplificada
	function handleSortChange(newSort: string) {
		console.log('🔄 Mudando ordenação para:', newSort);
		const updateParams = { ordenar: newSort };
		updateURL(updateParams);
	}

	// 🚀 FUNÇÃO: Limpar cache antigo
	function cleanupCache() {
		const now = Date.now();
		if (now - lastCacheCleanup > CACHE_DURATION) {
			searchCache.clear();
			lastCacheCleanup = now;
		}
	}

	// 🚀 FUNÇÃO: Gerar chave do cache
	function generateCacheKey(params: Record<string, any>): string {
		// Criar uma chave consistente baseada nos parâmetros
		const sortedEntries = Object.entries(params)
			.filter(([key, value]) => {
				// Filtros mais específicos para evitar valores vazios
				if (value === undefined || value === null) return false;
				if (value === '') return false;
				if (Array.isArray(value) && value.length === 0) return false;
				if (typeof value === 'boolean' && value === false && key !== 'disponivel') return false;
				return true;
			})
			.sort(([a], [b]) => a.localeCompare(b));
		
		const cacheKey = JSON.stringify(sortedEntries);
		return cacheKey;
	}

	// 🚀 FUNÇÃO: Aplicar optimistic updates
	function applyOptimisticUpdates(newFilters: Record<string, any>) {
		// Atualizar filtros imediatamente para visual instantâneo
		optimisticFilters = { ...optimisticFilters, ...newFilters };
		hasOptimisticUpdates = true;
		
		// Simular ordenação local se possível (sem filtros muito específicos)
		if (products.length > 0 && !newFilters.categoria && !newFilters.marca) {
			const currentSort = newFilters.ordenar || getUrlParams().ordenar;
			optimisticProducts = sortProducts([...products], currentSort);
		}
	}

	// 🚀 FUNÇÃO: Resetar optimistic updates
	function resetOptimisticUpdates() {
		hasOptimisticUpdates = false;
		optimisticFilters = {};
		optimisticProducts = [];
		optimisticTotalCount = 0;
	}

	// ✅ REMOVIDO: onMount não é mais necessário pois dados são carregados diretamente do servidor

	// ✅ REAÇÃO CONTROLADA: Executar busca quando URL muda
	let lastSearchParams = $state('');
	
	$effect(() => {
		const currentSearchParams = $page.url.search;
		
		// ⚠️ EXECUTAR BUSCA para qualquer mudança de URL (interna ou externa)
		if (currentSearchParams !== lastSearchParams && lastSearchParams !== '') {
			console.log('🌐 URL mudou, executando busca:', {
				current: currentSearchParams,
				last: lastSearchParams,
				internal: isInternalNavigation
			});
			
			// Busca com delay mínimo para evitar conflitos
			setTimeout(() => {
				executeSearch(true);
			}, isInternalNavigation ? 50 : 0); // Delay menor para mudanças internas
		}
		
		// Sempre atualizar o último estado
		lastSearchParams = currentSearchParams;
		
		// Reset flag após processamento
		if (isInternalNavigation) {
			setTimeout(() => {
				isInternalNavigation = false;
			}, 150);
		}
	});

	// ✅ PREPARAR DADOS PARA FILTERSIDEBAR
	function prepareFilterSidebarData() {
		const params = getUrlParams();
		const dynamicOptions = extractDynamicOptions();

			// ✅ CORRIGIDO: Processar categorias COM FALLBACK para categoria selecionada
	let categoriesWithSelection = (facets.categories || []).map((cat: any) => {
		const isSelected = params.categoria.includes(cat.slug || cat.id);
		return {
			...cat,
			selected: isSelected
		};
	});

		// ✅ MARKETPLACE PATTERN: Se há categoria ativa mas facets.categories está vazio,
		// manter dados da categoria selecionada para UI (header, filtros ativos, etc.)
		if (params.categoria.length > 0 && categoriesWithSelection.length === 0) {
			// Buscar dados da categoria selecionada do cache ou dados iniciais
			for (const categorySlug of params.categoria) {
				// Tentar encontrar a categoria nos dados iniciais do servidor
				let categoryData = data?.serverData?.facets?.categories?.find((c: any) => 
					(c.slug || c.id) === categorySlug
				);
				
				// OU criar dados mínimos para categoria selecionada
				if (!categoryData) {
					// Mapeamento correto de nomes de categorias
					const categoryNames: Record<string, string> = {
						'alimentacao-e-higiene': 'Alimentação e Higiene',
						'almofadas': 'Almofadas',
						'decoracao': 'Decoração',
						'quarto-de-bebe': 'Quarto de Bebê',
						'enxoval': 'Enxoval',
						'maternidade': 'Maternidade'
					};
					
					categoryData = {
						id: categorySlug,
						slug: categorySlug,
						name: categoryNames[categorySlug] || categorySlug.split('-').map(word => 
							word.charAt(0).toUpperCase() + word.slice(1)
						).join(' '),
						count: totalCount || 0 // Usar total real de produtos encontrados
					};
				}
				
				categoriesWithSelection.push({
					...categoryData,
					selected: true
				});
			}
		}

		// Processar marcas
		const brandsWithSelection = (facets.brands || []).map((brand: any) => {
			const isSelected = params.marca.includes(brand.slug || brand.id);
			return {
				...brand,
				selected: isSelected
			};
		});

		// Processar tags
		const tagsWithSelection = (facets.tags || []).map((tag: any) => {
			const isSelected = params.tema.includes(tag.slug || tag.id);
			return {
				...tag,
				selected: isSelected
			};
		});

		const result = {
			// Categorias com seleção
			categories: categoriesWithSelection,
			
			// Marcas com seleção
			brands: brandsWithSelection,
			
			// Tags com seleção
			tags: tagsWithSelection,
			
			// Range de preços
			priceRange: {
				min: facets.priceRange?.min || 0,
				max: facets.priceRange?.max || 10000,
				current: {
					min: Number(params.preco_min) || facets.priceRange?.min || 0,
					max: Number(params.preco_max) || facets.priceRange?.max || 10000
				}
			},
			
			// ✅ NOVOS FILTROS IMPLEMENTADOS
			
			// Rating/Avaliação com contadores reais
			ratingCounts: (facets.ratings || []).reduce((acc: any, rating: any) => {
				acc[rating.value] = rating.count;
				return acc;
			}, {}),
			currentRating: Number(params.avaliacao) || 0,
			
			// Condições do produto (Novo/Usado/Recondicionado)
			conditions: facets.conditions || [],
			selectedConditions: params.condicao || [],
			
			// Tempo de entrega
			deliveryOptions: facets.deliveryOptions || [],
			selectedDeliveryTime: params.tempo_entrega || '',
			
			// Vendedores
			sellers: facets.sellers || [],
			selectedSellers: params.vendedor || [],
			
			// Benefícios (Promoção, Frete Grátis, Indisponíveis)
			hasDiscount: params.promocao || false,
			hasFreeShipping: params.frete_gratis || false,
			showOutOfStock: !params.disponivel,
			benefitsCounts: facets.benefits || { discount: 0, freeShipping: 0, outOfStock: 0 },
			
			// Tags temáticas
			selectedTags: params.tema || [],
			
			// Filtros dinâmicos (Cor, Tamanho, Material, etc.)
			dynamicOptions: facets.dynamicOptions || [],
			selectedDynamicOptions: dynamicOptions,
			
			// Estados e cidades (por enquanto vazios - podem ser implementados depois)
			states: [],
			cities: [],
			selectedLocation: { state: params.estado, city: params.cidade },
			userLocation: undefined
		};
		
		return result;
	}

	// 🚀 VALORES DERIVADOS OTIMIZADOS - Com suporte a optimistic updates
	let currentParams = $derived(getUrlParams());
	let totalPages = $derived(Math.ceil((hasOptimisticUpdates && optimisticTotalCount > 0 ? optimisticTotalCount : totalCount) / 20));
	let sidebarData = $derived(prepareFilterSidebarData());
	
	// 🚀 PRODUTOS EXIBIDOS - Optimistic primeiro, depois real
	let displayProducts = $derived(
		hasOptimisticUpdates && optimisticProducts.length > 0 
			? optimisticProducts 
			: products
	);
	
	// 🚀 TOTAL EXIBIDO - Optimistic primeiro, depois real  
	let displayTotalCount = $derived(
		hasOptimisticUpdates && optimisticTotalCount > 0 
			? optimisticTotalCount 
			: totalCount
	);
</script>

<svelte:head>
	<title>{currentParams.q ? `${currentParams.q} - Busca | Marketplace GDG` : 'Busca | Marketplace GDG'}</title>
	<meta name="description" content={currentParams.q ? `Resultados para "${currentParams.q}"` : 'Encontre os melhores produtos no Marketplace GDG'} />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={$page.url.href} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<!-- Breadcrumb -->
		<nav class="mb-4" aria-label="Breadcrumb">
			<div class="flex items-center gap-2 text-sm" style="font-family: 'Lato', sans-serif;">
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
					{#if currentParams.q}
						<span class="text-gray-400 font-normal">para</span>
						<span class="bg-[#00BFB3]/10 text-[#00BFB3] px-2 py-1 rounded-full font-medium max-w-[200px] truncate">
							"{currentParams.q}"
						</span>
					{/if}
				</span>
			</div>
		</nav>
		
		<!-- Header -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
					<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</div>
				<div>
					<h1 class="text-2xl sm:text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">
						{#if currentParams.q}
							Resultados para "{currentParams.q}"
						{:else if currentParams.categoria.length}
							{@const categoryNames = currentParams.categoria.map(id => {
								const cat = facets.categories.find((c: any) => (c.slug || c.id) === id || c.id === id);
								return cat?.name || id;
							})}
							{categoryNames.join(', ')}
						{:else}
							Busca de Produtos
						{/if}
					</h1>
					<p class="mt-1 text-gray-600 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">
						{#if !isLoading}
							{displayTotalCount} {displayTotalCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
							{#if hasOptimisticUpdates}
								<span class="text-[#00BFB3] text-xs">⚡</span>
							{/if}
						{:else}
							Buscando produtos...
						{/if}
					</p>
				</div>
			</div>
			
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
			<aside class="w-80 flex-shrink-0 hidden lg:block {showDesktopFilters ? '' : 'lg:hidden'}">
				<FilterSidebar
					{...sidebarData}
					showCloseButton={false}
					on:filterChange={handleFilterChange}
					on:ratingChange={handleRatingChange}
					on:conditionChange={handleConditionChange}
					on:deliveryChange={handleDeliveryChange}
					on:sellerChange={handleSellerChange}
					on:locationChange={handleLocationChange}
					on:benefitChange={handleBenefitChange}
					on:tagChange={handleTagChange}
					on:dynamicOptionChange={handleDynamicOptionChange}
					on:clearAll={handleClearAll}
				/>
			</aside>
			
			<!-- Conteúdo Principal -->
			<main class="flex-1 min-w-0">
				<!-- Barra de Ações -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
					<div class="flex flex-col lg:flex-row lg:items-center gap-4">
						<!-- Botão Filtros Mobile -->
								<button 
							onclick={() => showMobileFilters = !showMobileFilters}
							class="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
									</svg>
							Filtros
								{#if hasActiveFilters()}
								<span class="bg-[#00BFB3] text-white text-xs px-2 py-1 rounded-full">●</span>
								{/if}
							</button>
							
						<!-- Botão Toggle Filtros Desktop -->
								<button
							onclick={() => showDesktopFilters = !showDesktopFilters}
							class="hidden lg:flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
									</svg>
							{showDesktopFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
								</button>

						<div class="flex-1"></div>

						<!-- Ordenação -->
						<div class="flex items-center gap-3">
							<label for="sort-select" class="text-sm font-medium text-gray-700 whitespace-nowrap">Ordenar por:</label>
									<select 
								id="sort-select"
								value={currentParams.ordenar}
								onchange={(e) => {
									const target = e.target as HTMLSelectElement;
									handleSortChange(target.value);
								}}
								class="border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] min-w-[180px]"
							>
								{#each sortOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
									</select>
							{#if hasOptimisticUpdates}
								<span class="text-[#00BFB3] text-xs animate-pulse">⚡</span>
							{/if}
									</div>

						<!-- Botão Salvar Busca -->
						{#if currentParams.q}
							<SaveSearchButton 
								searchQuery={currentParams.q} 
								resultCount={displayTotalCount}
							/>
						{/if}
							</div>
							
					<!-- Filtros Ativos -->
					{#if hasActiveFilters()}
						<div class="mt-4 pt-4 border-t border-gray-200">
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-sm font-medium text-gray-700">Filtros ativos:</span>
								
								{#each currentParams.categoria as categoryId}
									{@const category = facets.categories.find((c: any) => (c.slug || c.id) === categoryId)}
									{#if category}
										<span class="inline-flex items-center gap-1 bg-[#00BFB3]/10 text-[#00BFB3] px-3 py-1 rounded-full text-sm">
											{category.name}
											<button onclick={() => updateURL({ categoria: currentParams.categoria.filter(id => id !== categoryId) })} aria-label="Remover categoria {category.name}">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
											</button>
										</span>
							{/if}
								{/each}

								{#each currentParams.marca as brandId}
									{@const brand = facets.brands.find((b: any) => (b.slug || b.id) === brandId)}
									{#if brand}
										<span class="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
											{brand.name}
											<button onclick={() => updateURL({ marca: currentParams.marca.filter(id => id !== brandId) })} aria-label="Remover marca {brand.name}">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
											</button>
										</span>
									{/if}
										{/each}

								{#if currentParams.preco_min || currentParams.preco_max}
									<span class="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
										{#if currentParams.preco_min && currentParams.preco_max}
											R$ {currentParams.preco_min} - R$ {currentParams.preco_max}
										{:else if currentParams.preco_min}
											A partir de R$ {currentParams.preco_min}
										{:else}
											Até R$ {currentParams.preco_max}
										{/if}
										<button onclick={() => updateURL({ preco_min: undefined, preco_max: undefined })} aria-label="Remover filtro de preço">
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
										</button>
									</span>
								{/if}

								<!-- Botão de limpar removido - existe no FilterSidebar -->
									</div>
								</div>
					{/if}
							</div>

				<!-- Filtros Mobile Modal -->
				{#if showMobileFilters}
					<div class="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onclick={() => showMobileFilters = false}>
						<div class="bg-white w-full max-w-sm h-full overflow-y-auto" onclick={(e) => e.stopPropagation()}>
							<div class="p-4 border-b border-gray-200 flex items-center justify-between">
								<h3 class="text-lg font-semibold">Filtros</h3>
								<button onclick={() => showMobileFilters = false}>
									<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
						</div>
							<div class="p-4">
								<FilterSidebar
									{...sidebarData}
									showCloseButton={false}
									class="border-0 shadow-none p-0"
									on:filterChange={handleFilterChange}
									on:ratingChange={handleRatingChange}
									on:conditionChange={handleConditionChange}
									on:deliveryChange={handleDeliveryChange}
									on:sellerChange={handleSellerChange}
									on:locationChange={handleLocationChange}
									on:benefitChange={handleBenefitChange}
									on:tagChange={handleTagChange}
									on:dynamicOptionChange={handleDynamicOptionChange}
									on:clearAll={() => {
										handleClearAll();
										showMobileFilters = false;
									}}
								/>
					</div>
				</div>
					</div>
				{/if}
				
				<!-- Grid de Produtos -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
				{#if isLoading}
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
							{#each Array(12) as _}
									<ProductCardSkeleton />
							{/each}
								</div>
					{:else if displayProducts.length > 0}
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
							{#each displayProducts as product}
								<ProductCard {product} />
						{/each}
					</div>
					{:else}
						<div class="text-center py-12">
							<svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
							<h3 class="text-lg font-semibold text-gray-900 mb-2">Nenhum produto encontrado</h3>
							<p class="text-gray-600 mb-4">
								{#if currentParams.q}
									Não encontramos produtos para "{currentParams.q}".
							{:else}
									Não encontramos produtos com os filtros selecionados.
							{/if}
						</p>
							<!-- Botão de limpar removido - use o FilterSidebar -->
						</div>
					{/if}
				</div>

				<!-- Paginação -->
				{#if totalPages > 1 && !isLoading}
					<div class="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
						<nav class="flex items-center justify-between">
							<div class="flex-1 flex justify-between sm:hidden">
								<button 
									onclick={() => updateURL({ pagina: Math.max(1, currentParams.pagina - 1) })}
									disabled={currentParams.pagina === 1}
									class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
								>
									Anterior
								</button>
								<button
									onclick={() => updateURL({ pagina: Math.min(totalPages, currentParams.pagina + 1) })}
									disabled={currentParams.pagina === totalPages}
									class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
								>
									Próxima
												</button>
											</div>
							<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
								<div>
									<p class="text-sm text-gray-700">
										Mostrando 
										<span class="font-medium">{((currentParams.pagina - 1) * 20) + 1}</span>
										até 
										<span class="font-medium">{Math.min(currentParams.pagina * 20, displayTotalCount)}</span>
										de 
										<span class="font-medium">{displayTotalCount}</span>
										resultados
										{#if hasOptimisticUpdates}
											<span class="text-[#00BFB3] text-xs">⚡</span>
						{/if}
									</p>
					</div>
								<div>
									<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
							<button 
											onclick={() => updateURL({ pagina: Math.max(1, currentParams.pagina - 1) })}
											disabled={currentParams.pagina === 1}
											class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
									>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
											</svg>
							</button>
							
									{#each Array.from({length: Math.min(totalPages, 5)}, (_, i) => i + Math.max(1, currentParams.pagina - 2)) as pageNum}
										{#if pageNum <= totalPages}
										<button 
											onclick={() => updateURL({ pagina: pageNum })}
												class="relative inline-flex items-center px-4 py-2 border {pageNum === currentParams.pagina ? 'bg-[#00BFB3] border-[#00BFB3] text-white' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'} text-sm font-medium"
										>
											{pageNum}
										</button>
									{/if}
								{/each}
							
							<button 
											onclick={() => updateURL({ pagina: Math.min(totalPages, currentParams.pagina + 1) })}
											disabled={currentParams.pagina === totalPages}
											class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
									>
											<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
											</svg>
							</button>
									</nav>
						</div>
			</div>
						</nav>
		</div>
				{/if}
			</main>
	</div>
</div>
			</div>
