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
	import { slide } from 'svelte/transition';
	
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
	
	// Estado dos grupos expandidos
	let expandedGroups = $state<Set<string>>(new Set(['categories', 'price', 'brands', 'benefits']));
	
	// Filtros selecionados
	let selectedCategories = $state<Set<string>>(new Set());
	let selectedBrands = $state<Set<string>>(new Set());
	let selectedPrice = $state(priceRange?.current || (priceRange ? { min: priceRange.min, max: priceRange.max } : { min: 0, max: 10000 }));
	
	// Sincronizar categorias e marcas selecionadas com as props
	$effect(() => {
		// Sincronizar categorias selecionadas
		const currentCategories = categories.filter(c => c.selected).map(c => c.slug || c.id);
		selectedCategories = new Set(currentCategories);
	});
	
	$effect(() => {
		// Sincronizar marcas selecionadas
		const currentBrands = brands.filter(b => b.selected).map(b => b.slug || b.id);
		selectedBrands = new Set(currentBrands);
	});
	
	// Atualizar selectedPrice quando priceRange mudar
	$effect(() => {
		if (priceRange && !priceRange.current) {
			selectedPrice = { min: priceRange.min, max: priceRange.max };
		} else if (priceRange?.current) {
			selectedPrice = priceRange.current;
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
	
	function toggleFilter(type: 'category' | 'brand', filter: Filter) {
		const filterValue = filter.slug || filter.id; // Usar slug se disponível, senão usar id
		const set = type === 'category' ? selectedCategories : selectedBrands;
		
		if (set.has(filterValue)) {
			set.delete(filterValue);
		} else {
			set.add(filterValue);
		}
		
		// Forçar reatividade
		if (type === 'category') {
			selectedCategories = new Set(selectedCategories);
		} else {
			selectedBrands = new Set(selectedBrands);
		}
		
		emitFilterChange();
	}
	
	function handlePriceChange(event: CustomEvent<{ min: number; max: number }>) {
		selectedPrice = event.detail;
		emitFilterChange();
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
		// Limpar filtros locais
		selectedCategories.clear();
		selectedBrands.clear();
		selectedPrice = priceRange?.current || (priceRange ? { min: priceRange.min, max: priceRange.max } : { min: 0, max: 10000 });
		
		// Forçar reatividade
		selectedCategories = new Set();
		selectedBrands = new Set();
		
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
		emitFilterChange();
	}
	
	function emitFilterChange() {
		const filterData: any = {
			categories: Array.from(selectedCategories),
			brands: Array.from(selectedBrands)
		};
		
		// Só incluir preço se foi alterado do valor padrão
		if (priceRange && (
			selectedPrice.min !== priceRange.min || 
			selectedPrice.max !== priceRange.max
		)) {
			filterData.priceRange = selectedPrice;
		}
		
		dispatch('filterChange', filterData);
	}
	
	// Contar filtros ativos
	let activeFilterCount = $derived(
		selectedCategories.size + 
		selectedBrands.size + 
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

<aside class="bg-white rounded-lg shadow-sm p-4 {className}">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-xl font-bold text-gray-900">Filtros</h2>
		<div class="flex items-center gap-2">
			{#if activeFilterCount > 0}
				<button
					onclick={clearFilters}
					class="text-sm font-medium text-[#00BFB3] hover:text-[#00A89D] transition-colors flex items-center gap-1"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
					Limpar ({activeFilterCount})
				</button>
			{/if}
			{#if showCloseButton && onClose}
				<button 
					onclick={onClose}
					class="p-1 hover:bg-gray-100 rounded-lg transition-colors"
					aria-label="Ocultar filtros"
					title="Ocultar filtros"
				>
					<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
	
	{#if loading}
		<!-- Loading State -->
		<div class="space-y-4">
			{#each Array(3) as _}
				<div class="space-y-2">
					<div class="h-5 bg-gray-200 rounded animate-pulse w-24"></div>
					<div class="space-y-2">
						{#each Array(4) as _}
							<div class="h-4 bg-gray-100 rounded animate-pulse"></div>
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
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Categorias</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('categories') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('categories')}
						<div class="mt-3 space-y-2" transition:slide={{ duration: 200 }}>
							{#each categories.filter(c => !c.parent_id) as category}
								{@const hasSubcategories = category.subcategories && category.subcategories.length > 0}
								{@const totalCount = category.count || 0}
								
								<div class="space-y-1">
									<!-- Categoria Principal -->
									<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors {totalCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
										<input
											type="checkbox"
											checked={selectedCategories.has(category.slug || category.id)}
											onchange={() => toggleFilter('category', category)}
											disabled={totalCount === 0}
											class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-0 disabled:opacity-50 transition-colors"
										/>
										<span class="ml-3 text-sm font-medium text-gray-700 flex-1 {totalCount === 0 ? 'text-gray-400' : ''}">{category.name}</span>
										<span class="text-xs font-medium {totalCount === 0 ? 'text-gray-400' : 'text-gray-500'}">({totalCount})</span>
									</label>
									
									<!-- Subcategorias sempre visíveis -->
									{#if hasSubcategories && category.subcategories}
										<div class="ml-6 space-y-1">
											{#each category.subcategories as subcategory}
												<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors text-sm {subcategory.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
													<input
														type="checkbox"
														checked={selectedCategories.has(subcategory.slug || subcategory.id)}
														onchange={() => toggleFilter('category', subcategory)}
														disabled={subcategory.count === 0}
														class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-0 disabled:opacity-50 transition-colors"
													/>
													<span class="ml-3 text-sm text-gray-600 flex-1 {subcategory.count === 0 ? 'text-gray-400' : ''}">
														{subcategory.name}
													</span>
													<span class="text-xs {subcategory.count === 0 ? 'text-gray-400' : 'text-gray-500'}">({subcategory.count})</span>
												</label>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
							
							<!-- Subcategorias órfãs (sem categoria pai na lista) -->
							{#each categories.filter(c => c.parent_id && !categories.find(p => p.id === c.parent_id)) as orphanSubcategory}
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors {orphanSubcategory.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
									<input
										type="checkbox"
										checked={selectedCategories.has(orphanSubcategory.slug || orphanSubcategory.id)}
										onchange={() => toggleFilter('category', orphanSubcategory)}
										disabled={orphanSubcategory.count === 0}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-0 disabled:opacity-50 transition-colors"
									/>
									<span class="ml-3 text-sm text-gray-700 flex-1 {orphanSubcategory.count === 0 ? 'text-gray-400' : ''}">{orphanSubcategory.name}</span>
									<span class="text-xs {orphanSubcategory.count === 0 ? 'text-gray-400' : 'text-gray-500'}">({orphanSubcategory.count})</span>
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
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Preço</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('price') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('price')}
						<div class="mt-4" transition:slide={{ duration: 200 }}>
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
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Marcas</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('brands') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('brands')}
						<div class="mt-3 space-y-2" transition:slide={{ duration: 200 }}>
							{#each brands.filter(b => !b.count || b.count > 0) as brand}
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors {brand.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
									<input
										type="checkbox"
										checked={selectedBrands.has(brand.slug || brand.id)}
										onchange={() => toggleFilter('brand', brand)}
										disabled={brand.count === 0}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-0 disabled:opacity-50 transition-colors"
									/>
									<span class="ml-3 text-sm text-gray-700 flex-1 {brand.count === 0 ? 'text-gray-400' : ''}">{brand.name}</span>
									{#if brand.count !== undefined}
										<span class="text-xs {brand.count === 0 ? 'text-gray-400' : 'text-gray-500'}">({brand.count})</span>
									{/if}
								</label>
							{/each}
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
					<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Ofertas e Benefícios</h3>
					<svg 
						class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('benefits') ? 'rotate-180' : ''}"
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if expandedGroups.has('benefits')}
					<div class="mt-3 space-y-3" transition:slide={{ duration: 200 }}>
						<!-- Em Promoção - Primeiro pois é gatilho de compra -->
						<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
							<input
								type="checkbox"
								checked={hasDiscount}
								onchange={(e) => handleBenefitChange('discount', e.currentTarget.checked)}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
							/>
							<div class="ml-3 flex-1">
								<span class="text-sm text-gray-700 flex items-center gap-2">
									<span class="text-red-600 font-bold">%</span>
									Em Promoção
								</span>
							</div>
							{#if benefitsCounts.discount > 0}
								<span class="text-xs text-gray-500">({benefitsCounts.discount})</span>
							{/if}
						</label>
						
						<!-- Frete Grátis -->
						<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
							<input
								type="checkbox"
								checked={hasFreeShipping}
								onchange={(e) => handleBenefitChange('freeShipping', e.currentTarget.checked)}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
							/>
							<div class="ml-3 flex-1">
								<span class="text-sm text-gray-700 flex items-center gap-2">
									<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									Frete Grátis
								</span>
							</div>
							{#if benefitsCounts.freeShipping > 0}
								<span class="text-xs text-gray-500">({benefitsCounts.freeShipping})</span>
							{/if}
						</label>
					</div>
				{/if}
			</div>
			
			<!-- 5. AVALIAÇÃO - Confiança é importante -->
			<div class="border-b border-gray-200 pb-4">
				<button
					onclick={() => toggleGroup('rating')}
					class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
					aria-expanded={expandedGroups.has('rating')}
				>
					<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Avaliação</h3>
					<svg 
						class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('rating') ? 'rotate-180' : ''}"
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if expandedGroups.has('rating')}
					<div class="mt-3" transition:slide={{ duration: 200 }}>
						<RatingFilter
							{currentRating}
							counts={ratingCounts}
							on:change={handleRatingChange}
						/>
					</div>
				{/if}
			</div>
			
			<!-- 6. CONDIÇÃO - Importante para eletrônicos -->
			{#if conditions.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('condition')}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has('condition')}
					>
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Condição</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('condition') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('condition')}
						<div class="mt-3" transition:slide={{ duration: 200 }}>
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
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Tempo de Entrega</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('delivery') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('delivery')}
						<div class="mt-3" transition:slide={{ duration: 200 }}>
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
			{#each dynamicOptions as option}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup(`dynamic_${option.slug}`)}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has(`dynamic_${option.slug}`)}
					>
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">{option.name}</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has(`dynamic_${option.slug}`) ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has(`dynamic_${option.slug}`)}
						<div class="mt-3" transition:slide={{ duration: 200 }}>
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
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Vendedores</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('sellers') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('sellers')}
						<div class="mt-3" transition:slide={{ duration: 200 }}>
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
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Localização</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('location') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('location')}
						<div class="mt-3" transition:slide={{ duration: 200 }}>
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
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">Características</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has('tags') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('tags')}
						<div class="mt-3" transition:slide={{ duration: 200 }}>
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
				<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
					<input
						type="checkbox"
						checked={showOutOfStock}
						onchange={(e) => handleBenefitChange('outOfStock', e.currentTarget.checked)}
						class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
					/>
					<div class="ml-3 flex-1">
						<span class="text-sm text-gray-700">
							Incluir produtos indisponíveis
						</span>
					</div>
					{#if benefitsCounts.outOfStock > 0}
						<span class="text-xs text-gray-500">({benefitsCounts.outOfStock})</span>
					{/if}
				</label>
			</div>
			
			<!-- Filtros Customizados (se houver) -->
			{#each customFilters as group}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup(group.id)}
						class="flex items-center justify-between w-full text-left py-2 hover:text-[#00BFB3] transition-colors group"
						aria-expanded={expandedGroups.has(group.id)}
					>
						<h3 class="font-semibold text-gray-900 group-hover:text-[#00BFB3]">{group.label}</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-all duration-200 group-hover:text-[#00BFB3] {expandedGroups.has(group.id) ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has(group.id)}
						<div class="mt-3 space-y-2" transition:slide={{ duration: 200 }}>
							{#each group.filters as filter}
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
									<input
										type={group.type || 'checkbox'}
										name={group.id}
										checked={filter.selected}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 {group.type === 'radio' ? '' : 'rounded'} focus:ring-[#00BFB3]"
									/>
									<span class="ml-3 text-sm text-gray-700 flex-1">{filter.name}</span>
									{#if filter.count !== undefined}
										<span class="text-xs text-gray-500">({filter.count})</span>
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