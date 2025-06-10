<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { fly, slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import PriceRangeFilter from './PriceRangeFilter.svelte';
	import RatingFilter from './RatingFilter.svelte';
	import ConditionFilter from './ConditionFilter.svelte';
	import DeliveryTimeFilter from './DeliveryTimeFilter.svelte';
	import SellerFilter from './SellerFilter.svelte';
	import LocationFilter from './LocationFilter.svelte';
	import TagFilter from './TagFilter.svelte';
	import DynamicOptionFilter from './DynamicOptionFilter.svelte';
	import { preventFlicker } from '$lib/utils/transitions';
	
	interface Filter {
		id: string;
		name: string;
		count?: number;
		selected?: boolean;
		slug?: string;
		subcategories?: Filter[];
		parent_id?: string;
	}
	
	interface FilterGroup {
		id: string;
		label: string;
		filters: Filter[];
		type?: 'checkbox' | 'radio';
		expanded?: boolean;
	}
	
	interface DynamicOption {
		name: string;
		slug: string;
		options: Array<{ value: string; label: string; count: number }>;
		totalProducts?: number;
	}
	
	interface FilterSidebarProps {
		categories?: Filter[];
		brands?: Filter[];
		selectedPriceRanges?: string[]; // ✅ MUDANÇA: Array de faixas selecionadas
		priceRanges?: Array<{ // ✅ NOVO: Faixas dinâmicas do backend
			label: string;
			value: string;
			min: number;
			max: number | null;
			products: number;
		}>;
		customFilters?: FilterGroup[];
		loading?: boolean;
		class?: string;
		// Novos props
		ratingCounts?: Record<number, number>;
		currentRating?: number;
		conditions?: Array<{ value: 'new' | 'used' | 'refurbished'; label: string; count?: number }>;
		selectedConditions?: string[];
		deliveryOptions?: Array<{ value: string; label: string; count?: number }>;
		selectedDeliveryTime?: string;
		sellers?: Array<{ id: string; name: string; rating?: number; count?: number; slug?: string }>;
		selectedSellers?: string[];
		states?: Array<{ code: string; name: string; count?: number }>;
		cities?: Array<{ name: string; state: string; count?: number }>;
		selectedLocation?: { state?: string; city?: string };
		userLocation?: { state?: string; city?: string };
		// Props para filtros de benefícios
		hasDiscount?: boolean;
		hasFreeShipping?: boolean;
		showOutOfStock?: boolean;
		benefitsCounts?: {
			discount: number;
			freeShipping: number;
			outOfStock: number;
		};
		// Props para tags
		tags?: Array<{ id: string; name: string; count?: number }>;
		selectedTags?: string[];
		// Props para filtros dinâmicos
		dynamicOptions?: DynamicOption[];
		selectedDynamicOptions?: Record<string, string[]>;
		// Props para botão de fechar
		showCloseButton?: boolean;
		onClose?: () => void;
	}
	
	let {
		categories = [],
		brands = [],
		selectedPriceRanges = [], // ✅ MUDANÇA: Array de faixas selecionadas
		priceRanges = [], // ✅ NOVO: Faixas dinâmicas do backend
		customFilters = [],
		loading = false,
		class: className = '',
		// Novos props
		ratingCounts = {},
		currentRating = 0,
		conditions = [],
		selectedConditions = [],
		deliveryOptions = [],
		selectedDeliveryTime = '',
		sellers = [],
		selectedSellers = [],
		states = [],
		cities = [],
		selectedLocation = {},
		userLocation,
		// Props para filtros de benefícios
		hasDiscount = false,
		hasFreeShipping = false,
		showOutOfStock = false,
		benefitsCounts = { discount: 0, freeShipping: 0, outOfStock: 0 },
		// Props para tags
		tags = [],
		selectedTags = [],
		// Props para filtros dinâmicos
		dynamicOptions = [],
		selectedDynamicOptions = {},
		// Props para botão de fechar
		showCloseButton = false,
		onClose
	}: FilterSidebarProps = $props();
	

	
	const dispatch = createEventDispatcher();
	
	// ✅ ESTADOS DE UX E ACESSIBILIDADE
	let isApplyingFilters = $state(false);
	let searchTermBrands = $state('');
	let searchTermSellers = $state('');
	let searchTermTags = $state('');
	let focusedFilterIndex = $state(-1);
	let isMobile = $state(false);
	let announceText = $state('');
	
	// Estado dos grupos expansíveis - ajustado para incluir mais grupos
	let expandedGroups = $state<Set<string>>(new Set(['categories', 'price', 'brands', 'benefits', 'rating', 'dynamic_cor', 'dynamic_tamanho', 'dynamic_material']));
	
	// Estado para controlar "ver mais" nas categorias e marcas
	let showMoreCategories = $state(false);
	let showMoreBrands = $state(false);
	let showMoreSellers = $state(false);
	let showMoreTags = $state(false);
	const INITIAL_CATEGORIES_COUNT = 6;
	const INITIAL_BRANDS_COUNT = 8;
	const INITIAL_SELLERS_COUNT = 6;
	const INITIAL_TAGS_COUNT = 10;
	
	// Estado para controlar expansão de categorias pai
	let expandedCategories = $state<Set<string>>(new Set());
	
	// CORRIGIDO: Usar estado local que sincroniza com props mas permite atualizações imediatas
	let localSelectedCategories = $state<Set<string>>(new Set());
	let localSelectedBrands = $state<Set<string>>(new Set());
	
	// Flag para evitar conflitos de sincronização
	let isUserInteracting = false;
	
	// ✅ FILTROS COMPUTADOS PARA BUSCA
	let filteredBrands = $derived(
		brands.filter(brand => 
			searchTermBrands === '' || 
			brand.name.toLowerCase().includes(searchTermBrands.toLowerCase())
		)
	);
	
	let filteredSellers = $derived(
		sellers.filter(seller => 
			searchTermSellers === '' || 
			seller.name.toLowerCase().includes(searchTermSellers.toLowerCase())
		)
	);
	
	let filteredTags = $derived(
		tags.filter(tag => 
			searchTermTags === '' || 
			tag.name.toLowerCase().includes(searchTermTags.toLowerCase())
		)
	);
	
	// ✅ CONTADOR DE FILTROS ATIVOS - MELHORADO
	let activeFilterCount = $derived(
		localSelectedCategories.size + 
		localSelectedBrands.size + 
		selectedPriceRanges.length +
		(currentRating > 0 ? 1 : 0) +
		selectedConditions.length +
		(selectedDeliveryTime ? 1 : 0) +
		selectedSellers.length +
		(selectedLocation?.state || selectedLocation?.city ? 1 : 0) +
		(hasDiscount ? 1 : 0) +
		(hasFreeShipping ? 1 : 0) +
		(showOutOfStock ? 1 : 0) +
		selectedTags.length +
		Object.values(selectedDynamicOptions).reduce((sum, values) => sum + values.length, 0)
	);

	// ✅ MARKETPLACE PATTERN: Detectar se está em categoria específica
	let hasActiveCategoryFilter = $derived(
		categories.some((cat: any) => cat.selected)
	);

	// ✅ CATEGORIAS DISPONÍVEIS PARA MOSTRAR (sempre exibir se há dados)
	let availableCategories = $derived(categories || []);


	
	// ✅ DETECTAR MOBILE
	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		
		checkMobile();
		window.addEventListener('resize', checkMobile);
		
		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});
	
	// ✅ SINCRONIZAÇÃO COM PROPS - CORRIGIDA para remoção individual
	$effect(() => {
		const newSelectedCategories = new Set(categories.filter(c => c.selected).map(c => c.slug || c.id));
		
		// ✅ VERIFICAR MUDANÇAS EM AMBAS AS DIREÇÕES
		const hasChanges = newSelectedCategories.size !== localSelectedCategories.size || 
			[...newSelectedCategories].some(id => !localSelectedCategories.has(id)) ||
			[...localSelectedCategories].some(id => !newSelectedCategories.has(id));
		
		if (hasChanges) {
			console.log('🔄 ========================================');
			console.log('🔄 SINCRONIZAÇÃO CATEGORIAS (props → local)');
			console.log('🔄 ========================================');
			console.log('📥 Props recebidas:', Array.from(newSelectedCategories));
			console.log('💾 Estado local atual:', Array.from(localSelectedCategories));
			console.log('👤 isUserInteracting:', isUserInteracting);
			console.log('🔀 hasChanges:', hasChanges);
			console.log('📂 Total categories disponíveis:', categories.length);
			
			// ✅ SEMPRE sincronizar se há mudanças nas props (vem da página principal)
			localSelectedCategories = newSelectedCategories;
			
			console.log('✅ Sincronização APLICADA:', Array.from(localSelectedCategories));
			console.log('🔄 ========================================');
		}
	});
	
	$effect(() => {
		const newSelectedBrands = new Set(brands.filter(b => b.selected).map(b => b.slug || b.id));
		
		// ✅ VERIFICAR MUDANÇAS EM AMBAS AS DIREÇÕES
		const hasChanges = newSelectedBrands.size !== localSelectedBrands.size || 
			[...newSelectedBrands].some(id => !localSelectedBrands.has(id)) ||
			[...localSelectedBrands].some(id => !newSelectedBrands.has(id));
		
		if (hasChanges) {
			console.log('🔄 ========================================');
			console.log('🔄 SINCRONIZAÇÃO MARCAS (props → local)');
			console.log('🔄 ========================================');
			console.log('📥 Props recebidas:', Array.from(newSelectedBrands));
			console.log('💾 Estado local atual:', Array.from(localSelectedBrands));
			console.log('👤 isUserInteracting:', isUserInteracting);
			console.log('🔀 hasChanges:', hasChanges);
			console.log('🏷️ Total brands disponíveis:', brands.length);
			
			// ✅ SEMPRE sincronizar se há mudanças nas props (vem da página principal)
			localSelectedBrands = newSelectedBrands;
			
			console.log('✅ Sincronização APLICADA:', Array.from(localSelectedBrands));
			console.log('🔄 ========================================');
		}
	});
	
	// ✅ Removed old price effect - now using price ranges
	
	// ✅ FUNÇÕES DE UX MELHORADAS
	function toggleGroup(groupId: string) {
		if (expandedGroups.has(groupId)) {
			expandedGroups.delete(groupId);
			announceText = `Seção ${groupId} fechada`;
		} else {
			expandedGroups.add(groupId);
			announceText = `Seção ${groupId} aberta`;
		}
		expandedGroups = new Set(expandedGroups);
	}
	
	function toggleCategory(categoryId: string) {
		if (expandedCategories.has(categoryId)) {
			expandedCategories.delete(categoryId);
		} else {
			expandedCategories.add(categoryId);
		}
		expandedCategories = new Set(expandedCategories);
	}
	
	// ✅ FUNÇÃO OTIMIZADA DE TOGGLE FILTER COM FEEDBACK
	function toggleFilter(type: 'category' | 'brand', filter: Filter) {
		console.log('🔘 ========================================');
		console.log('🔘 FILTRO CLICADO - TOGGLE');
		console.log('🔘 ========================================');
		console.log('📂 Tipo:', type);
		console.log('🏷️ Filtro:', filter.name);
		console.log('🆔 ID/Slug:', filter.slug || filter.id);
		console.log('📊 Produtos prometidos por este filtro:', filter.count || 'N/A');
		console.log('📊 Estado ANTES:', {
			categoriesLocal: Array.from(localSelectedCategories),
			brandsLocal: Array.from(localSelectedBrands),
			isUserInteracting: isUserInteracting
		});
		
		isUserInteracting = true;
		isApplyingFilters = true;
		
		const filterValue = filter.slug || filter.id;
		const currentSelected = type === 'category' ? localSelectedCategories : localSelectedBrands;
		
		// Atualizar estado local IMEDIATAMENTE
		let wasAdded = false;
		if (currentSelected.has(filterValue)) {
			currentSelected.delete(filterValue);
			announceText = `Filtro ${filter.name} removido`;
			console.log('➖ REMOVENDO filtro:', filterValue);
		} else {
			currentSelected.add(filterValue);
			announceText = `Filtro ${filter.name} adicionado`;
			wasAdded = true;
			console.log('➕ ADICIONANDO filtro:', filterValue);
		}
		
		// Forçar reatividade
		if (type === 'category') {
			localSelectedCategories = new Set([...localSelectedCategories]);
		} else {
			localSelectedBrands = new Set([...localSelectedBrands]);
		}
		
		console.log('📊 Estado DEPOIS:', {
			categoriesLocal: Array.from(localSelectedCategories),
			brandsLocal: Array.from(localSelectedBrands),
			wasAdded: wasAdded
		});
		
		// Emitir evento para atualizar a busca
		const categories = Array.from(localSelectedCategories);
		const brands = Array.from(localSelectedBrands);
		
		console.log('📡 EMITINDO evento filterChange:', {
			categories,
			brands,
			priceRanges: selectedPriceRanges
		});
		
		dispatch('filterChange', {
			categories,
			brands,
			priceRanges: selectedPriceRanges
		});
		
		// Reset flag com delay
		setTimeout(() => {
			isUserInteracting = false;
			isApplyingFilters = false;
			console.log('🔄 Reset flags: isUserInteracting = false');
		}, 300);
	}
	
	// ✅ NAVEGAÇÃO POR TECLADO
	function handleKeyDown(event: KeyboardEvent, action: () => void) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			action();
		}
	}
	
	// ✅ SKIP LINKS
	function skipToSection(sectionId: string) {
		const element = document.getElementById(sectionId);
		if (element) {
			element.focus();
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}
	
	// ✅ HANDLERS PARA FILTROS AVANÇADOS
	function handlePriceChange(event: CustomEvent<{ ranges: string[] }>) {
		isApplyingFilters = true;
		announceText = `Faixas de preço alteradas: ${event.detail.ranges.length} faixas selecionadas`;
		
		dispatch('priceRangeChange', {
			ranges: event.detail.ranges
		});
		
		setTimeout(() => {
			isApplyingFilters = false;
		}, 300);
	}
	
	function handleRatingChange(event: CustomEvent<{ rating: number | undefined }>) {
		announceText = event.detail.rating ? `Filtro de avaliação: ${event.detail.rating} estrelas ou mais` : 'Filtro de avaliação removido';
		dispatch('ratingChange', event.detail);
	}
	
	function handleConditionChange(event: CustomEvent<{ conditions: string[] }>) {
		announceText = `Condições selecionadas: ${event.detail.conditions.join(', ') || 'nenhuma'}`;
		dispatch('conditionChange', event.detail);
	}
	
	function handleDeliveryChange(event: CustomEvent<{ deliveryTime: string | undefined }>) {
		announceText = event.detail.deliveryTime ? `Tempo de entrega: ${event.detail.deliveryTime}` : 'Filtro de entrega removido';
		dispatch('deliveryChange', event.detail);
	}
	
	function handleSellerChange(event: CustomEvent<{ sellers: string[] }>) {
		announceText = `Vendedores selecionados: ${event.detail.sellers.length}`;
		dispatch('sellerChange', event.detail);
	}
	
	function handleLocationChange(event: CustomEvent<{ state?: string; city?: string }>) {
		announceText = 'Localização alterada';
		dispatch('locationChange', event.detail);
	}
	
	function handleBenefitChange(benefit: 'discount' | 'freeShipping' | 'outOfStock', value: boolean) {
		isApplyingFilters = true;
		const benefitNames = {
			discount: 'Em promoção',
			freeShipping: 'Frete grátis', 
			outOfStock: 'Incluir indisponíveis'
		};
		announceText = `${benefitNames[benefit]} ${value ? 'ativado' : 'desativado'}`;
		
		dispatch('benefitChange', { benefit, value });
		
		setTimeout(() => {
			isApplyingFilters = false;
		}, 300);
	}
	
	function handleTagChange(event: CustomEvent<{ tags: string[] }>) {
		announceText = `Tags selecionadas: ${event.detail.tags.length}`;
		dispatch('tagChange', event.detail);
	}
	
	function handleDynamicOptionChange(optionSlug: string, event: CustomEvent<{ values: string[] }>) {
		console.log('🎨 ========================================');
		console.log('🎨 FILTRO DINÂMICO ALTERADO');
		console.log('🎨 ========================================');
		console.log('🔤 Option Slug:', optionSlug);
		console.log('📋 Valores selecionados:', event.detail.values);
		console.log('📊 Quantidade de valores:', event.detail.values.length);
		
		// Encontrar o filtro dinâmico para mostrar contadores
		const dynamicOption = dynamicOptions.find(opt => opt.slug === optionSlug);
		if (dynamicOption) {
			console.log('📊 Filtro encontrado:', dynamicOption.name);
			console.log('📊 Total de produtos para esta opção:', dynamicOption.totalProducts);
			console.log('📊 Valores prometidos:');
			event.detail.values.forEach(value => {
				const optionValue = dynamicOption.options?.find(o => o.value === value);
				if (optionValue) {
					console.log(`  🎨 ${value}: ${optionValue.count} produtos prometidos`);
				} else {
					console.log(`  🎨 ${value}: contagem não encontrada`);
				}
			});
		} else {
			console.log('❌ Filtro dinâmico não encontrado:', optionSlug);
		}
		
		announceText = `Filtro ${optionSlug} alterado`;
		console.log('📡 Emitindo evento dynamicOptionChange...');
		dispatch('dynamicOptionChange', { optionSlug, values: event.detail.values });
		console.log('🎨 ========================================');
	}
	
	// ✅ FUNÇÃO MELHORADA DE LIMPAR FILTROS - CORRIGIDA
	function clearFilters() {
		console.log('🧹 ========================================');
		console.log('🧹 BOTÃO LIMPAR CLICADO');
		console.log('🧹 ========================================');
		console.log('📊 ESTADO ANTES da limpeza:', {
			categorias: Array.from(localSelectedCategories),
			marcas: Array.from(localSelectedBrands),
			priceRanges: selectedPriceRanges,
			activeCount: activeFilterCount,
			isUserInteracting: isUserInteracting,
			isApplyingFilters: isApplyingFilters
		});
		
		isApplyingFilters = true;
		announceText = 'Todos os filtros removidos';
		
		// ✅ PERMITIR sincronização durante limpeza
		isUserInteracting = false;
		
		console.log('🔄 Flags alteradas: isUserInteracting = false, isApplyingFilters = true');
		
		// Limpar estados locais IMEDIATAMENTE
		localSelectedCategories = new Set();
		localSelectedBrands = new Set();
		
		console.log('🗑️ Estados locais LIMPOS:');
		console.log('  📂 localSelectedCategories:', Array.from(localSelectedCategories));
		console.log('  🏷️ localSelectedBrands:', Array.from(localSelectedBrands));
		
		console.log('📡 EMITINDO evento clearAll para página principal...');
		
		// ⚠️ EMITIR APENAS clearAll - a página principal cuida da atualização da URL
		dispatch('clearAll');
		
		setTimeout(() => {
			isApplyingFilters = false;
			console.log('🧹 FilterSidebar: Limpeza CONCLUÍDA', {
				categorias: Array.from(localSelectedCategories),
				marcas: Array.from(localSelectedBrands),
				priceRanges: selectedPriceRanges,
				activeCount: activeFilterCount,
				isUserInteracting: isUserInteracting,
				isApplyingFilters: isApplyingFilters
			});
			console.log('🧹 ========================================');
		}, 300);
	}
	
	// ✅ GESTURE PARA MOBILE
	let startY = 0;
	let currentY = 0;
	let isDragging = false;
	
	function handleTouchStart(event: TouchEvent) {
		if (!isMobile) return;
		startY = event.touches[0].clientY;
		isDragging = true;
	}
	
	function handleTouchMove(event: TouchEvent) {
		if (!isMobile || !isDragging) return;
		currentY = event.touches[0].clientY;
		const deltaY = currentY - startY;
		
		// Se deslizar para baixo mais de 100px, fechar modal
		if (deltaY > 100 && onClose) {
			onClose();
		}
	}
	
	function handleTouchEnd() {
		isDragging = false;
	}
</script>

<!-- ✅ LIVE REGION PARA ANÚNCIOS DE ACESSIBILIDADE -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
	{announceText}
</div>

<!-- ✅ SKIP LINKS PARA NAVEGAÇÃO RÁPIDA -->
<nav class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50" aria-label="Links de navegação rápida">
	<button 
		onclick={() => skipToSection('filter-categories')}
		class="bg-[#00BFB3] text-white px-3 py-1 rounded focus:ring-2 focus:ring-white"
	>
		Ir para Categorias
	</button>
	<button 
		onclick={() => skipToSection('filter-price')}
		class="bg-[#00BFB3] text-white px-3 py-1 rounded focus:ring-2 focus:ring-white ml-2"
	>
		Ir para Preço
	</button>
	<button 
		onclick={() => skipToSection('filter-brands')}
		class="bg-[#00BFB3] text-white px-3 py-1 rounded focus:ring-2 focus:ring-white ml-2"
	>
		Ir para Marcas
	</button>
</nav>

<!-- ✅ CONTAINER PRINCIPAL COM GESTURE SUPPORT -->
<aside 
	class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 {className} transition-all duration-300 ease-out" 
	use:preventFlicker 
	style="font-family: 'Lato', sans-serif;"
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	role="complementary"
	aria-label="Filtros de busca"
>
	<!-- ✅ HEADER MELHORADO COM CONTADOR E LOADING -->
	<header class="border-b border-gray-200 pb-4 mb-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
					</svg>
					Filtros
				</h2>
				
				<!-- ✅ CONTADOR DE FILTROS ATIVOS -->
				{#if activeFilterCount > 0}
					<span 
						class="bg-[#00BFB3] text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse"
						aria-label="{activeFilterCount} filtros ativos"
						transition:fly={{ y: -10, duration: 200 }}
					>
						{activeFilterCount}
					</span>
				{/if}
				
				<!-- ✅ INDICADOR DE LOADING -->
				{#if isApplyingFilters}
					<div class="flex items-center gap-1 text-[#00BFB3] text-xs" aria-label="Aplicando filtros">
						<div class="w-3 h-3 border border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
						<span>Aplicando...</span>
					</div>
				{/if}
			</div>
			
			<div class="flex items-center gap-2">
				<!-- ✅ BOTÃO LIMPAR MELHORADO -->
				{#if activeFilterCount > 0}
					<button
						onclick={clearFilters}
						class="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded hover:bg-red-50 transition-all duration-200 focus:ring-2 focus:ring-red-200 focus:outline-none"
						aria-label="Limpar todos os {activeFilterCount} filtros ativos"
						disabled={isApplyingFilters}
						transition:fly={{ x: 20, duration: 200 }}
					>
						<svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Limpar todos
					</button>
				{/if}
				
				<!-- ✅ BOTÃO FECHAR PARA MOBILE -->
				{#if showCloseButton && onClose}
					<button
						onclick={onClose}
						class="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors focus:ring-2 focus:ring-[#00BFB3] focus:outline-none"
						aria-label="Fechar filtros"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
		
		<!-- ✅ BARRA DE PROGRESSO SUTIL PARA LOADING -->
		{#if isApplyingFilters}
			<div class="mt-2 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
				<div class="bg-[#00BFB3] h-1 rounded-full animate-pulse" style="width: 100%"></div>
			</div>
		{/if}
	</header>
	
	{#if loading}
		<!-- ✅ SKELETON LOADING MELHORADO -->
		<div class="space-y-6" aria-label="Carregando filtros">
			{#each Array(6) as _, i}
				<div class="animate-pulse">
					<div class="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
					<div class="space-y-2">
						{#each Array(4) as _, j}
							<div class="flex items-center gap-3">
								<div class="w-4 h-4 bg-gray-200 rounded"></div>
								<div class="h-3 bg-gray-200 rounded flex-1"></div>
								<div class="w-8 h-3 bg-gray-200 rounded"></div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- ✅ FILTROS PRINCIPAIS COM UX MELHORADA -->
		<div class="space-y-6" role="region" aria-label="Filtros disponíveis">
			
			<!-- ✅ 1. CATEGORIAS - VERSÃO SIMPLES E FUNCIONAL -->
			<div class="border-b border-gray-200 pb-4">
				<h3 class="font-semibold text-gray-900 mb-4">
					Categorias
					{#if localSelectedCategories.size > 0}
						<span class="ml-2 text-xs bg-[#00BFB3] text-white px-2 py-1 rounded-full">
							{localSelectedCategories.size}
						</span>
					{/if}
				</h3>
				

				
				<!-- Lista de categorias -->
				{#if categories.length > 0}
					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#each categories as category}
							<label class="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
								<div class="flex items-center flex-1">
									<input
										type="checkbox"
										checked={localSelectedCategories.has(category.slug || category.id)}
										onchange={() => toggleFilter('category', category)}
										class="w-4 h-4 mr-3 text-[#00BFB3] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]"
									/>
									<span class="text-sm text-gray-700 truncate flex-1">
										{category.name}
									</span>
								</div>
								{#if category.count !== undefined}
									<span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-2">
										{category.count}
									</span>
								{/if}
							</label>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-gray-500 text-center py-4">
						Nenhuma categoria disponível
					</div>
				{/if}
			</div>

			
			<!-- ✅ 2. FAIXA DE PREÇO - Sistema de faixas inteligentes -->
			<section id="filter-price" class="border-b border-gray-200 pb-4">
				<button
					onclick={() => toggleGroup('price')}
					onkeydown={(e) => handleKeyDown(e, () => toggleGroup('price'))}
					class="flex items-center justify-between w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none group"
					aria-expanded={expandedGroups.has('price')}
					aria-controls="price-content"
					tabindex="0"
				>
					<div class="flex items-center gap-3">
						<svg class="w-5 h-5 text-[#00BFB3] transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
						</svg>
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">
							Faixa de preço
							{#if selectedPriceRanges.length > 0}
								<span class="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
									{selectedPriceRanges.length} faixas
								</span>
							{/if}
						</h3>
					</div>
					<svg 
						class="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-[#00BFB3] {expandedGroups.has('price') ? 'rotate-180' : ''}"
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if expandedGroups.has('price')}
					<div 
						id="price-content"
						class="mt-4 px-2"
						transition:slide={{ duration: 300, easing: quintOut }}
						role="group"
						aria-labelledby="filter-price"
					>
						<PriceRangeFilter
							selectedRanges={selectedPriceRanges}
							priceRanges={priceRanges}
							on:change={handlePriceChange}
						/>
					</div>
				{/if}
			</section>
			
			<!-- ✅ 3. MARCAS - Com busca e animações -->
			{#if brands.length > 0}
				<section id="filter-brands" class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('brands')}
						onkeydown={(e) => handleKeyDown(e, () => toggleGroup('brands'))}
						class="flex items-center justify-between w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none group"
						aria-expanded={expandedGroups.has('brands')}
						aria-controls="brands-content"
						tabindex="0"
					>
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-[#00BFB3] transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">
								Marcas
								{#if localSelectedBrands.size > 0}
									<span class="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
										{localSelectedBrands.size}
									</span>
								{/if}
							</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-[#00BFB3] {expandedGroups.has('brands') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('brands')}
						<div 
							id="brands-content"
							class="mt-4 space-y-3"
							transition:slide={{ duration: 300, easing: quintOut }}
							role="group"
							aria-labelledby="filter-brands"
						>
							<!-- ✅ CAMPO DE BUSCA DE MARCAS -->
							{#if brands.length > 6}
								<div class="relative">
									<input
										type="text"
										bind:value={searchTermBrands}
										placeholder="Buscar marca..."
										class="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-all duration-200"
										aria-label="Buscar marcas"
									/>
									<svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									
									{#if searchTermBrands}
										<button
											onclick={() => searchTermBrands = ''}
											class="absolute right-2 top-2 p-1 hover:bg-gray-100 rounded transition-colors focus:ring-2 focus:ring-[#00BFB3] focus:outline-none"
											aria-label="Limpar busca"
										>
											<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									{/if}
								</div>
							{/if}
							
							<!-- ✅ LISTA DE MARCAS COM ANIMAÇÕES -->
							{#if filteredBrands.length > 0}
								{@const selectedBrands = filteredBrands.filter(b => localSelectedBrands.has(b.slug || b.id))}
								{@const unselectedBrands = filteredBrands.filter(b => !localSelectedBrands.has(b.slug || b.id))}
								{@const brandsToShow = showMoreBrands 
									? [...selectedBrands, ...unselectedBrands] 
									: [...selectedBrands, ...unselectedBrands.slice(0, Math.max(0, INITIAL_BRANDS_COUNT - selectedBrands.length))]}
								{@const remainingBrandsCount = filteredBrands.length - brandsToShow.length}
								
								<div class="space-y-1">
									{#each brandsToShow as brand, index (brand.id)}
										{@const isSelected = localSelectedBrands.has(brand.slug || brand.id)}
										{@const brandCount = brand.count || 0}
									
									<label 
										class="flex items-center py-2 px-3 hover:bg-[#00BFB3]/5 rounded-lg cursor-pointer transition-all duration-200 group/brand"
										transition:fly={{ y: 20, duration: 200, delay: index * 30 }}
									>
										<input
											type="checkbox"
											checked={isSelected}
											onchange={() => toggleFilter('brand', brand)}
											disabled={brandCount === 0}
											class="w-4 h-4 mr-3 text-[#00BFB3] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] disabled:opacity-50 transition-all duration-200"
											aria-describedby="brand-{brand.id}-count"
										/>
										
										<span class="flex-1 text-sm font-medium text-gray-700 group-hover/brand:text-[#00BFB3] transition-colors {brandCount === 0 ? 'text-gray-400' : ''} {isSelected ? 'text-[#00BFB3] font-semibold' : ''}">
											{brand.name}
										</span>
										
										<span 
											id="brand-{brand.id}-count"
											class="flex-shrink-0 ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full transition-all duration-200 {brandCount === 0 ? 'bg-gray-50 text-gray-400' : ''} {isSelected ? 'bg-[#00BFB3]/10 text-[#00BFB3] font-medium' : ''}"
										>
											{brandCount}
										</span>
									</label>
								{/each}
								
								<!-- Botão Ver Mais/Menos Marcas -->
								{#if remainingBrandsCount > 0}
									<button
										onclick={() => showMoreBrands = !showMoreBrands}
										onkeydown={(e) => handleKeyDown(e, () => showMoreBrands = !showMoreBrands)}
										class="flex items-center gap-2 w-full p-3 text-left text-sm font-medium text-[#00BFB3] hover:text-[#00A89D] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none"
										aria-expanded={showMoreBrands}
										tabindex="0"
									>
										<svg class="w-4 h-4 transition-transform duration-200 {showMoreBrands ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
										{#if showMoreBrands}
											Ver menos marcas
										{:else}
											Ver mais {remainingBrandsCount} marcas
										{/if}
									</button>
								{/if}
								</div>
							{:else}
								<!-- Resultado da busca vazio -->
								<div class="text-center py-6 text-gray-500">
									<svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<p class="text-sm">
										{#if searchTermBrands}
											Nenhuma marca encontrada para "{searchTermBrands}"
										{:else}
											Nenhuma marca disponível
										{/if}
									</p>
								</div>
							{/if}
						</div>
					{/if}
				</section>
			{/if}
			
			<!-- ✅ 4. OFERTAS E BENEFÍCIOS - Com melhor UX -->
			<section class="border-b border-gray-200 pb-4">
				<button
					onclick={() => toggleGroup('benefits')}
					onkeydown={(e) => handleKeyDown(e, () => toggleGroup('benefits'))}
					class="flex items-center justify-between w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none group"
					aria-expanded={expandedGroups.has('benefits')}
					aria-controls="benefits-content"
					tabindex="0"
				>
					<div class="flex items-center gap-3">
						<svg class="w-5 h-5 text-[#00BFB3] transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
						</svg>
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">
							Ofertas e Benefícios
							{#if hasDiscount || hasFreeShipping || showOutOfStock}
								<span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
									{(hasDiscount ? 1 : 0) + (hasFreeShipping ? 1 : 0) + (showOutOfStock ? 1 : 0)}
								</span>
							{/if}
						</h3>
					</div>
					<svg 
						class="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-[#00BFB3] {expandedGroups.has('benefits') ? 'rotate-180' : ''}"
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if expandedGroups.has('benefits')}
					<div 
						id="benefits-content"
						class="mt-4 space-y-3"
						transition:slide={{ duration: 300, easing: quintOut }}
						role="group"
						aria-labelledby="benefits"
					>
						<!-- Promoção -->
						<label class="flex items-center py-2 px-3 hover:bg-red-50 rounded-lg cursor-pointer transition-all duration-200 group/promo">
							<input
								type="checkbox"
								checked={hasDiscount}
								onchange={() => handleBenefitChange('discount', !hasDiscount)}
								class="w-4 h-4 mr-3 text-red-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-red-200 focus:border-red-500 transition-all duration-200"
							/>
							<span class="text-sm font-medium text-gray-700 group-hover/promo:text-red-600 transition-colors flex-1">
								Em promoção
							</span>
							<span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
								{benefitsCounts.discount}
							</span>
						</label>
						
						<!-- Frete Grátis -->
						<label class="flex items-center py-2 px-3 hover:bg-green-50 rounded-lg cursor-pointer transition-all duration-200 group/shipping">
							<input
								type="checkbox"
								checked={hasFreeShipping}
								onchange={() => handleBenefitChange('freeShipping', !hasFreeShipping)}
								class="w-4 h-4 mr-3 text-green-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-200 focus:border-green-500 transition-all duration-200"
							/>
							<span class="text-sm font-medium text-gray-700 group-hover/shipping:text-green-600 transition-colors flex-1">
								Frete grátis
							</span>
							<span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
								{benefitsCounts.freeShipping}
							</span>
						</label>
						
						<!-- Incluir Indisponíveis -->
						<label class="flex items-center py-2 px-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-all duration-200 group/stock">
							<input
								type="checkbox"
								checked={showOutOfStock}
								onchange={() => handleBenefitChange('outOfStock', !showOutOfStock)}
								class="w-4 h-4 mr-3 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200"
							/>
							<span class="text-sm font-medium text-gray-700 group-hover/stock:text-blue-600 transition-colors flex-1">
								Incluir indisponíveis
							</span>
							<span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
								{benefitsCounts.outOfStock}
							</span>
						</label>
					</div>
				{/if}
			</section>
			
			<!-- ✅ 5. AVALIAÇÃO -->
			{#if Object.keys(ratingCounts).length > 0}
				<section class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('rating')}
						onkeydown={(e) => handleKeyDown(e, () => toggleGroup('rating'))}
						class="flex items-center justify-between w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none group"
						aria-expanded={expandedGroups.has('rating')}
						tabindex="0"
					>
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">
								Avaliação
								{#if currentRating > 0}
									<span class="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
										{currentRating}+ estrelas
									</span>
								{/if}
							</h3>
						</div>
						<svg class="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-[#00BFB3] {expandedGroups.has('rating') ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('rating')}
						<div class="mt-4 space-y-2" transition:slide={{ duration: 300, easing: quintOut }}>
							<RatingFilter selectedRating={currentRating || null} onRatingChange={(rating) => dispatch('ratingChange', { rating: rating || undefined })} />
						</div>
					{/if}
				</section>
			{/if}
			
			<!-- ✅ 6. CONDIÇÃO -->
			{#if conditions.length > 0}
				<section class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('condition')}
						onkeydown={(e) => handleKeyDown(e, () => toggleGroup('condition'))}
						class="flex items-center justify-between w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none group"
						aria-expanded={expandedGroups.has('condition')}
						tabindex="0"
					>
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">
								Condição
								{#if selectedConditions.length > 0}
									<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
										{selectedConditions.length}
									</span>
								{/if}
							</h3>
						</div>
						<svg class="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-[#00BFB3] {expandedGroups.has('condition') ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('condition')}
						<div class="mt-4 space-y-2" transition:slide={{ duration: 300, easing: quintOut }}>
							<ConditionFilter selected={selectedConditions} options={conditions} on:change={handleConditionChange} />
						</div>
					{/if}
				</section>
			{/if}
			
			<!-- ✅ 7. TEMPO DE ENTREGA -->
			{#if deliveryOptions.length > 0}
				<section class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('delivery')}
						onkeydown={(e) => handleKeyDown(e, () => toggleGroup('delivery'))}
						class="flex items-center justify-between w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none group"
						aria-expanded={expandedGroups.has('delivery')}
						tabindex="0"
					>
						<div class="flex items-center gap-3">
							<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">
								Tempo de Entrega
								{#if selectedDeliveryTime}
									<span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
										{deliveryOptions.find(o => o.value === selectedDeliveryTime)?.label}
									</span>
								{/if}
							</h3>
						</div>
						<svg class="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-[#00BFB3] {expandedGroups.has('delivery') ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('delivery')}
						<div class="mt-4 space-y-2" transition:slide={{ duration: 300, easing: quintOut }}>
							<DeliveryTimeFilter selected={selectedDeliveryTime} options={deliveryOptions} on:change={handleDeliveryChange} />
						</div>
					{/if}
				</section>
			{/if}
			
			<!-- ✅ 8. FILTROS DINÂMICOS -->
			{#if dynamicOptions && dynamicOptions.length > 0}
				{#each dynamicOptions as option, index (`${option.name}-${option.slug}-${index}`)}
					<section class="border-b border-gray-200 pb-4">
						<button
							onclick={() => toggleGroup(`dynamic_${option.slug}`)}
							onkeydown={(e) => handleKeyDown(e, () => toggleGroup(`dynamic_${option.slug}`))}
							class="flex items-center justify-between w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-[#00BFB3] focus:outline-none group"
							aria-expanded={expandedGroups.has(`dynamic_${option.slug}`)}
							tabindex="0"
						>
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
								</svg>
								<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">
									{option.name}
									{#if selectedDynamicOptions[option.slug]?.length > 0}
										<span class="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
											{selectedDynamicOptions[option.slug].length}
										</span>
									{/if}
								</h3>
							</div>
							<svg class="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-[#00BFB3] {expandedGroups.has(`dynamic_${option.slug}`) ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						
						{#if expandedGroups.has(`dynamic_${option.slug}`)}
							<div class="mt-4 space-y-2" transition:slide={{ duration: 300, easing: quintOut }}>
								<DynamicOptionFilter optionName={option.name} optionSlug={option.slug} facets={option.options} selectedValues={selectedDynamicOptions[option.slug] || []} on:change={(e) => handleDynamicOptionChange(option.slug, e)} />
							</div>
						{/if}
					</section>
				{/each}
			{/if}
			
			<!-- ✅ 12. DISPONIBILIDADE -->
			<section class="pt-4">
				<div class="flex items-center justify-between py-3 px-2">
					<div class="flex items-center gap-3">
						<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<h3 class="font-semibold text-gray-900">Disponibilidade</h3>
					</div>
				</div>
				
				<div class="px-2">
					<label class="flex items-center py-2 px-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-all duration-200 group/stock">
						<input
							type="checkbox"
							checked={showOutOfStock}
							onchange={() => handleBenefitChange('outOfStock', !showOutOfStock)}
							class="w-4 h-4 mr-3 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200"
						/>
						<span class="text-sm font-medium text-gray-700 group-hover/stock:text-blue-600 transition-colors">
							Mostrar produtos indisponíveis
						</span>
					</label>
				</div>
			</section>
		</div>
	{/if}
	
	<!-- ✅ BOTTOM SHEET PARA MOBILE -->
	{#if isMobile && showCloseButton}
		<div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden" 
			 transition:fly={{ y: 100, duration: 300 }}>
			<div class="flex items-center justify-between gap-4">
				<button
					onclick={clearFilters}
					disabled={activeFilterCount === 0 || isApplyingFilters}
					class="flex-1 py-3 px-4 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
				>
					Limpar ({activeFilterCount})
				</button>
				
				<button
					onclick={onClose}
					disabled={isApplyingFilters}
					class="flex-1 py-3 px-4 text-sm font-medium text-white bg-[#00BFB3] rounded-lg hover:bg-[#00A89D] disabled:opacity-50 transition-all duration-200"
				>
					{#if isApplyingFilters}
						<div class="flex items-center justify-center gap-2">
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							Aplicando...
						</div>
					{:else}
						Ver Resultados
					{/if}
				</button>
			</div>
		</div>
	{/if}
</aside>

<style>
	/* ✅ ESTILOS PARA ACESSIBILIDADE E UX */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	
	.sr-only:focus {
		position: static;
		width: auto;
		height: auto;
		padding: inherit;
		margin: inherit;
		overflow: visible;
		clip: auto;
		white-space: normal;
	}
	
	/* Smooth scrolling para skip links */
	html {
		scroll-behavior: smooth;
	}
	
	/* Estados de foco melhorados */
	input[type="checkbox"]:focus {
		outline: 2px solid transparent;
		outline-offset: 2px;
	}
	
	/* Animações otimizadas */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
	
	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.border-gray-200 {
			border-color: currentColor;
		}
		.text-gray-500, .text-gray-400 {
			color: currentColor;
		}
	}
</style> 