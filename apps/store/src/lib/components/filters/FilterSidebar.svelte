<script lang="ts">
	import { createEventDispatcher } from 'svelte';
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
		values: Array<{ value: string; count: number }>;
	}
	
	interface FilterSidebarProps {
		categories?: Filter[];
		brands?: Filter[];
		priceRange?: { min: number; max: number; current: { min: number; max: number } };
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
		priceRange,
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
	
	// Estado dos grupos expansíveis - ajustado para incluir mais grupos
	let expandedGroups = $state<Set<string>>(new Set(['categories', 'price', 'brands', 'benefits', 'dynamic_armazenamento', 'dynamic_memoria-ram', 'dynamic_cor', 'dynamic_processador', 'dynamic_tamanho']));
	
	// Estado para controlar "ver mais" nas categorias e marcas
	let showMoreCategories = $state(false);
	let showMoreBrands = $state(false);
	const INITIAL_CATEGORIES_COUNT = 6;
	const INITIAL_BRANDS_COUNT = 8;
	
	// Estado para controlar expansão de categorias pai
	let expandedCategories = $state<Set<string>>(new Set());
	
	// Filtros selecionados - SIMPLIFICADO: usar diretamente as props ao invés de state interno
	let selectedPrice = $state(priceRange?.current || (priceRange ? { min: priceRange.min, max: priceRange.max } : { min: 0, max: 10000 }));
	
	// CORRIGIDO: Usar estado local que sincroniza com props mas permite atualizações imediatas
	let localSelectedCategories = $state<Set<string>>(new Set());
	let localSelectedBrands = $state<Set<string>>(new Set());
	
	// Flag para evitar conflitos de sincronização
	let isUserInteracting = false;
	
	// Sincronizar estado local com props quando elas mudam
	$effect(() => {
		// Só sincronizar se o usuário não estiver interagindo
		if (!isUserInteracting) {
			const newSelectedCategories = new Set(categories.filter(c => c.selected).map(c => c.slug || c.id));
			// Só atualizar se realmente mudou para evitar loops
			if (newSelectedCategories.size !== localSelectedCategories.size || 
				[...newSelectedCategories].some(id => !localSelectedCategories.has(id))) {
				localSelectedCategories = newSelectedCategories;
			}
		}
	});
	
	$effect(() => {
		// Só sincronizar se o usuário não estiver interagindo
		if (!isUserInteracting) {
			const newSelectedBrands = new Set(brands.filter(b => b.selected).map(b => b.slug || b.id));
			// Só atualizar se realmente mudou para evitar loops
			if (newSelectedBrands.size !== localSelectedBrands.size || 
				[...newSelectedBrands].some(id => !localSelectedBrands.has(id))) {
				localSelectedBrands = newSelectedBrands;
			}
		}
	});
	
	// Atualizar selectedPrice quando priceRange mudar
	$effect(() => {
		if (priceRange) {
			const newPrice = priceRange.current || { min: priceRange.min, max: priceRange.max };
			if (selectedPrice.min !== newPrice.min || selectedPrice.max !== newPrice.max) {
				selectedPrice = newPrice;
			}
		}
	});
	
	function toggleGroup(groupId: string) {
		if (expandedGroups.has(groupId)) {
			expandedGroups.delete(groupId);
		} else {
			expandedGroups.add(groupId);
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
	
	function toggleFilter(type: 'category' | 'brand', filter: Filter) {
		// Marcar que o usuário está interagindo
		isUserInteracting = true;
		
		const filterValue = filter.slug || filter.id;
		const currentSelected = type === 'category' ? localSelectedCategories : localSelectedBrands;
		
		// Atualizar estado local IMEDIATAMENTE
		if (currentSelected.has(filterValue)) {
			// Remover filtro
			currentSelected.delete(filterValue);
		} else {
			// Adicionar filtro
			currentSelected.add(filterValue);
		}
		
		// Forçar reatividade
		if (type === 'category') {
			localSelectedCategories = new Set([...localSelectedCategories]);
		} else {
			localSelectedBrands = new Set([...localSelectedBrands]);
		}
		
		// Criar nova lista de selecionados para emitir
		const newSelected = Array.from(currentSelected);
		
		// Emitir mudança imediatamente
		const eventData = type === 'category' ? {
			categories: newSelected,
			brands: Array.from(localSelectedBrands),
			priceRange: undefined // Não alterar preço neste evento
		} : {
			categories: Array.from(localSelectedCategories),
			brands: newSelected,
			priceRange: undefined // Não alterar preço neste evento
		};
		
		dispatch('filterChange', eventData);
		
		// Resetar flag após um pequeno delay para permitir que o evento seja processado
		setTimeout(() => {
			isUserInteracting = false;
		}, 100);
	}
	
	function handlePriceChange(event: CustomEvent<{ min: number; max: number }>) {
		selectedPrice = event.detail;
		dispatch('filterChange', {
			categories: Array.from(localSelectedCategories),
			brands: Array.from(localSelectedBrands),
			priceRange: selectedPrice
		});
	}
	
	function handleRatingChange(event: CustomEvent<{ rating: number | undefined }>) {
		dispatch('ratingChange', event.detail);
	}
	
	function handleConditionChange(event: CustomEvent<{ conditions: string[] }>) {
		dispatch('conditionChange', event.detail);
	}
	
	function handleDeliveryChange(event: CustomEvent<{ deliveryTime: string | undefined }>) {
		dispatch('deliveryChange', event.detail);
	}
	
	function handleSellerChange(event: CustomEvent<{ sellers: string[] }>) {
		dispatch('sellerChange', event.detail);
	}
	
	function handleLocationChange(event: CustomEvent<{ state?: string; city?: string }>) {
		dispatch('locationChange', event.detail);
	}
	
	function handleBenefitChange(benefit: 'discount' | 'freeShipping' | 'outOfStock', value: boolean) {
		dispatch('benefitChange', { benefit, value });
	}
	
	function handleTagChange(event: CustomEvent<{ tags: string[] }>) {
		dispatch('tagChange', event.detail);
	}
	
	function handleDynamicOptionChange(optionSlug: string, event: CustomEvent<{ values: string[] }>) {
		dispatch('dynamicOptionChange', { optionSlug, values: event.detail.values });
	}
	
	function clearFilters() {
		// Limpar estados locais IMEDIATAMENTE
		localSelectedCategories = new Set();
		localSelectedBrands = new Set();
		
		// Emitir evento para limpar todos os filtros externos
		dispatch('clearAll');
		
		// Também emitir eventos individuais para resetar cada filtro
		dispatch('ratingChange', { rating: undefined });
		dispatch('conditionChange', { conditions: [] });
		dispatch('deliveryChange', { deliveryTime: undefined });
		dispatch('sellerChange', { sellers: [] });
		dispatch('locationChange', { state: undefined, city: undefined });
		dispatch('tagChange', { tags: [] });
		dispatch('benefitChange', { benefit: 'discount', value: false });
		dispatch('benefitChange', { benefit: 'freeShipping', value: false });
		dispatch('benefitChange', { benefit: 'outOfStock', value: false });
		
		// Limpar filtros dinâmicos
		for (const option of dynamicOptions) {
			dispatch('dynamicOptionChange', { optionSlug: option.slug, values: [] });
		}
		
		// Emitir mudança dos filtros locais
		dispatch('filterChange', {
			categories: [],
			brands: [],
			priceRange: undefined
		});
	}
	
	// Contar filtros ativos
	let activeFilterCount = $derived(
		localSelectedCategories.size + 
		localSelectedBrands.size + 
		(selectedPrice.min > (priceRange?.min || 0) || selectedPrice.max < (priceRange?.max || 1000) ? 1 : 0) +
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
</script>

<aside class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 {className} no-shift" use:preventFlicker style="font-family: 'Lato', sans-serif;">
	<!-- Header compacto em uma linha -->
	<div class="border-b border-gray-200 pb-4 mb-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<svg class="h-5 w-5 text-[#00BFB3] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				<h2 class="text-lg font-semibold text-gray-900 whitespace-nowrap">Filtros</h2>
				{#if activeFilterCount > 0}
					<span class="text-sm text-gray-600 whitespace-nowrap">{activeFilterCount} {activeFilterCount === 1 ? 'ativo' : 'ativos'}</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if activeFilterCount > 0}
					<button
						onclick={clearFilters}
						class="px-3 py-1.5 text-sm font-medium text-[#00BFB3] hover:text-white hover:bg-[#00BFB3] border border-[#00BFB3] rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
						Limpar
					</button>
				{/if}
				{#if showCloseButton && onClose}
					<button 
						onclick={onClose}
						class="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-lg transition-colors flex-shrink-0"
						aria-label="Ocultar filtros"
						title="Ocultar filtros"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>
	
	{#if loading}
		<!-- Loading State melhorado -->
		<div class="space-y-6">
			{#each Array(3) as _}
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<div class="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
						<div class="h-5 bg-gray-200 rounded animate-pulse w-32"></div>
					</div>
					<div class="space-y-2 ml-6">
						{#each Array(4) as _}
							<div class="flex items-center gap-2">
								<div class="h-4 w-4 bg-gray-100 rounded animate-pulse"></div>
								<div class="h-4 bg-gray-100 rounded animate-pulse flex-1"></div>
								<div class="h-4 w-8 bg-gray-100 rounded-full animate-pulse"></div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="space-y-4">
			<!-- 1. CATEGORIAS - Sempre primeiro, é a navegação principal -->
			{#if categories.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('categories')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('categories')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-4H9m10 8H5m6 4H5" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Categorias</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('categories') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('categories')}
						{@const mainCategories = categories.filter(c => !c.parent_id)}
						{@const categoriesToShow = showMoreCategories ? mainCategories : mainCategories.slice(0, INITIAL_CATEGORIES_COUNT)}
						{@const remainingCount = mainCategories.length - INITIAL_CATEGORIES_COUNT}
						
						<div class="mt-3 space-y-2">
							{#each categoriesToShow as category (category.id)}
								{@const hasSubcategories = category.subcategories && category.subcategories.length > 0}
								{@const totalCount = category.count || 0}
								
								<div class="space-y-1">
									<!-- Categoria Principal -->
									<div class="flex items-center hover:bg-[#00BFB3]/5 p-3 rounded-lg transition-colors {totalCount === 0 ? 'opacity-50' : ''}">
										<input
											type="checkbox"
											checked={localSelectedCategories.has(category.slug || category.id)}
											onchange={() => toggleFilter('category', category)}
											disabled={totalCount === 0}
											class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] disabled:opacity-50 transition-colors"
											onclick={(e) => e.stopPropagation()}
										/>
										<button
											onclick={() => hasSubcategories ? toggleCategory(category.id) : toggleFilter('category', category)}
											class="ml-3 text-sm font-medium text-gray-700 flex-1 pr-3 text-left {totalCount === 0 ? 'text-gray-400' : ''} {hasSubcategories ? 'cursor-pointer hover:text-[#00BFB3]' : 'cursor-pointer'}"
										>
											{category.name}
										</button>
										{#if hasSubcategories}
											<button
												onclick={() => toggleCategory(category.id)}
												class="p-1 text-gray-400 hover:text-[#00BFB3] transition-colors"
												aria-label="{expandedCategories.has(category.id) ? 'Ocultar' : 'Mostrar'} subcategorias"
											>
												<svg class="w-4 h-4 transition-transform {expandedCategories.has(category.id) ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
												</svg>
											</button>
										{/if}
										<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0 {totalCount === 0 ? 'bg-gray-50 text-gray-400' : ''}">{totalCount}</span>
									</div>
									
									<!-- Subcategorias condicionais -->
									{#if hasSubcategories && category.subcategories && expandedCategories.has(category.id)}
										<div class="ml-6 space-y-1">
											{#each category.subcategories as subcategory (subcategory.id)}
												<label class="flex items-center cursor-pointer hover:bg-[#00BFB3]/5 p-2 rounded-lg transition-colors text-sm {subcategory.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
													<input
														type="checkbox"
														checked={localSelectedCategories.has(subcategory.slug || subcategory.id)}
														onchange={() => toggleFilter('category', subcategory)}
														disabled={subcategory.count === 0}
														class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] disabled:opacity-50 transition-colors"
													/>
													<span class="ml-3 text-sm text-gray-600 flex-1 pr-3 {subcategory.count === 0 ? 'text-gray-400' : ''}">
														{subcategory.name}
													</span>
													<span class="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full flex-shrink-0 {subcategory.count === 0 ? 'bg-gray-50 text-gray-400' : ''}">{subcategory.count}</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
							
							<!-- Botão Ver Mais/Menos -->
							{#if remainingCount > 0}
								<button
									onclick={() => showMoreCategories = !showMoreCategories}
									class="flex items-center gap-2 w-full p-2 text-left text-sm font-medium text-[#00BFB3] hover:text-[#00A89D] hover:bg-[#00BFB3]/5 rounded-lg transition-colors"
								>
									<svg class="w-4 h-4 transition-transform {showMoreCategories ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
									{#if showMoreCategories}
										Ver menos categorias
									{:else}
										Ver mais {remainingCount} categorias
									{/if}
								</button>
							{/if}
							
							<!-- Subcategorias órfãs (sem categoria pai na lista) -->
							{#each categories.filter(c => c.parent_id && !categories.find(p => p.id === c.parent_id)) as orphanSubcategory (orphanSubcategory.id)}
								<label class="flex items-center cursor-pointer hover:bg-[#00BFB3]/5 p-3 rounded-lg transition-colors {orphanSubcategory.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
									<input
										type="checkbox"
										checked={localSelectedCategories.has(orphanSubcategory.slug || orphanSubcategory.id)}
										onchange={() => toggleFilter('category', orphanSubcategory)}
										disabled={orphanSubcategory.count === 0}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] disabled:opacity-50 transition-colors"
									/>
									<span class="ml-3 text-sm font-medium text-gray-700 flex-1 pr-3 {orphanSubcategory.count === 0 ? 'text-gray-400' : ''}">{orphanSubcategory.name}</span>
									<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0 {orphanSubcategory.count === 0 ? 'bg-gray-50 text-gray-400' : ''}">{orphanSubcategory.count}</span>
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 2. FAIXA DE PREÇO - Segundo filtro mais usado -->
			{#if priceRange}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('price')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('price')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Preço</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('price') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('price')}
						<div class="mt-4">
							<PriceRangeFilter
								min={priceRange.min}
								max={priceRange.max}
								currentMin={selectedPrice.min}
								currentMax={selectedPrice.max}
								on:change={handlePriceChange}
							/>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 3. MARCAS - Terceiro mais importante -->
			{#if brands.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('brands')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('brands')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Marcas</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('brands') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('brands')}
						{@const filteredBrands = brands.filter(b => !b.count || b.count > 0)}
						{@const brandsToShow = showMoreBrands ? filteredBrands : filteredBrands.slice(0, INITIAL_BRANDS_COUNT)}
						{@const remainingBrandsCount = filteredBrands.length - INITIAL_BRANDS_COUNT}
						
						<div class="mt-3 space-y-2">
							{#each brandsToShow as brand (brand.id)}
								<label class="flex items-center cursor-pointer hover:bg-[#00BFB3]/5 p-3 rounded-lg transition-colors {brand.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
									<input
										type="checkbox"
										checked={localSelectedBrands.has(brand.slug || brand.id)}
										onchange={() => toggleFilter('brand', brand)}
										disabled={brand.count === 0}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] disabled:opacity-50 transition-colors"
									/>
									<span class="ml-3 text-sm font-medium text-gray-700 flex-1 pr-3 {brand.count === 0 ? 'text-gray-400' : ''}">{brand.name}</span>
									{#if brand.count !== undefined}
										<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0 {brand.count === 0 ? 'bg-gray-50 text-gray-400' : ''}">{brand.count}</span>
									{/if}
								</label>
							{/each}
							
							<!-- Botão Ver Mais/Menos para Marcas -->
							{#if remainingBrandsCount > 0}
								<button
									onclick={() => showMoreBrands = !showMoreBrands}
									class="flex items-center gap-2 w-full p-2 text-left text-sm font-medium text-[#00BFB3] hover:text-[#00A89D] hover:bg-[#00BFB3]/5 rounded-lg transition-colors"
								>
									<svg class="w-4 h-4 transition-transform {showMoreBrands ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					{/if}
				</div>
			{/if}
			
			<!-- 4. OFERTAS E BENEFÍCIOS - Gatilhos de conversão -->
			<div class="border-b border-gray-200 pb-4">
				<button
					onclick={() => toggleGroup('benefits')}
					class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
					aria-expanded={expandedGroups.has('benefits')}
				>
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
						</svg>
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Ofertas e Benefícios</h3>
					</div>
					<svg 
						class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('benefits') ? 'rotate-180' : ''}"
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if expandedGroups.has('benefits')}
					<div class="mt-3 space-y-3">
						<!-- Em Promoção - Primeiro pois é gatilho de compra -->
						<label class="flex items-center cursor-pointer hover:bg-[#00BFB3]/5 p-3 rounded-lg transition-colors">
							<input
								type="checkbox"
								checked={hasDiscount}
								onchange={(e) => handleBenefitChange('discount', e.currentTarget.checked)}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-colors"
							/>
							<div class="ml-3 flex-1 pr-3">
								<span class="text-sm font-medium text-gray-700 flex items-center gap-2">
									<span class="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold">%</span>
									Em Promoção
								</span>
							</div>
							{#if benefitsCounts.discount > 0}
								<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full flex-shrink-0">{benefitsCounts.discount}</span>
							{/if}
						</label>
						
						<!-- Frete Grátis -->
						<label class="flex items-center cursor-pointer hover:bg-[#00BFB3]/5 p-3 rounded-lg transition-colors">
							<input
								type="checkbox"
								checked={hasFreeShipping}
								onchange={(e) => handleBenefitChange('freeShipping', e.currentTarget.checked)}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-colors"
							/>
							<div class="ml-3 flex-1 pr-3">
								<span class="text-sm font-medium text-gray-700 flex items-center gap-2">
									<div class="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
										<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</div>
									Frete Grátis
								</span>
							</div>
							{#if benefitsCounts.freeShipping > 0}
								<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full flex-shrink-0">{benefitsCounts.freeShipping}</span>
							{/if}
						</label>
					</div>
				{/if}
			</div>
			
			<!-- 5. AVALIAÇÃO - TEMPORARIAMENTE DESABILITADO -->
			<!-- TODO: Corrigir tipos do RatingFilter depois de resolver filtros de categoria -->
			
			<!-- 6. CONDIÇÃO - Importante para eletrônicos -->
			{#if conditions.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('condition')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('condition')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Condição</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('condition') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('condition')}
						<div class="mt-3">
							<ConditionFilter
								selected={selectedConditions}
								options={conditions}
								on:change={handleConditionChange}
							/>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 7. TEMPO DE ENTREGA -->
			{#if deliveryOptions.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('delivery')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('delivery')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Tempo de Entrega</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('delivery') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('delivery')}
						<div class="mt-3">
							<DeliveryTimeFilter
								selected={selectedDeliveryTime}
								options={deliveryOptions}
								on:change={handleDeliveryChange}
							/>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 8. FILTROS DINÂMICOS (Cor, Tamanho, etc) - Específicos por categoria -->
			{#each dynamicOptions as option, index (`${option.name}-${option.slug}-${index}`)}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup(`dynamic_${option.slug}`)}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has(`dynamic_${option.slug}`)}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">{option.name}</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has(`dynamic_${option.slug}`) ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has(`dynamic_${option.slug}`)}
						<div class="mt-3">
							<DynamicOptionFilter
								optionName={option.name}
								optionSlug={option.slug}
								facets={option.values}
								selectedValues={selectedDynamicOptions[option.slug] || []}
								on:change={(e) => handleDynamicOptionChange(option.slug, e)}
							/>
						</div>
					{/if}
				</div>
			{/each}
			
			<!-- 9. VENDEDORES - Menos prioritário -->
			{#if sellers.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('sellers')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('sellers')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Vendedores</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('sellers') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('sellers')}
						<div class="mt-3">
							<SellerFilter
								selected={selectedSellers}
								{sellers}
								on:change={handleSellerChange}
							/>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 10. LOCALIZAÇÃO - Útil mas não prioritário -->
			{#if states.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('location')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('location')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Localização</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('location') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('location')}
						<div class="mt-3">
							<LocationFilter
								selectedState={selectedLocation?.state}
								selectedCity={selectedLocation?.city}
								{states}
								{cities}
								{userLocation}
								on:change={handleLocationChange}
							/>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 11. CARACTERÍSTICAS/TAGS - Menos usado -->
			{#if tags.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('tags')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('tags')}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">Características</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has('tags') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('tags')}
						<div class="mt-3">
							<TagFilter
								{tags}
								selected={selectedTags}
								on:change={handleTagChange}
							/>
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- 12. DISPONIBILIDADE - Por último, é mais uma preferência -->
			<div class="border-b border-gray-200 pb-4">
				<div class="mb-3">
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
						</svg>
						<h3 class="font-semibold text-gray-900">Disponibilidade</h3>
					</div>
				</div>
				<label class="flex items-center cursor-pointer hover:bg-[#00BFB3]/5 p-3 rounded-lg transition-colors">
					<input
						type="checkbox"
						checked={showOutOfStock}
						onchange={(e) => handleBenefitChange('outOfStock', e.currentTarget.checked)}
						class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-colors"
					/>
					<div class="ml-3 flex-1 pr-3">
						<span class="text-sm font-medium text-gray-700">
							Incluir produtos indisponíveis
						</span>
					</div>
					{#if benefitsCounts.outOfStock > 0}
						<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0">{benefitsCounts.outOfStock}</span>
					{/if}
				</label>
			</div>
			
			<!-- Filtros Customizados (se houver) -->
			{#each customFilters as group (group.id)}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup(group.id)}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has(group.id)}
					>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-4H9m10 8H5m6 4H5" />
							</svg>
							<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3] transition-colors">{group.label}</h3>
						</div>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform group-hover:text-[#00BFB3] {expandedGroups.has(group.id) ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has(group.id)}
						<div class="mt-3 space-y-2">
							{#each group.filters as filter (filter.id)}
								<label class="flex items-center cursor-pointer hover:bg-[#00BFB3]/5 p-3 rounded-lg transition-colors">
									<input
										type={group.type || 'checkbox'}
										name={group.id}
										checked={filter.selected}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 {group.type === 'radio' ? '' : 'rounded'} focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-colors"
									/>
									<span class="ml-3 text-sm font-medium text-gray-700 flex-1 pr-3">{filter.name}</span>
									{#if filter.count !== undefined}
										<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0">{filter.count}</span>
									{/if}
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</aside> 