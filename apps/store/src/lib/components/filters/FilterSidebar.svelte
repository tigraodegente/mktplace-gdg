<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import PriceRangeFilter from './PriceRangeFilter.svelte';
	import { slide } from 'svelte/transition';
	
	interface Filter {
		id: string;
		name: string;
		count?: number;
		selected?: boolean;
	}
	
	interface FilterGroup {
		id: string;
		label: string;
		filters: Filter[];
		type?: 'checkbox' | 'radio';
		expanded?: boolean;
	}
	
	interface FilterSidebarProps {
		categories?: Filter[];
		brands?: Filter[];
		priceRange?: { min: number; max: number; current: { min: number; max: number } };
		customFilters?: FilterGroup[];
		loading?: boolean;
		class?: string;
	}
	
	let {
		categories = [],
		brands = [],
		priceRange,
		customFilters = [],
		loading = false,
		class: className = ''
	}: FilterSidebarProps = $props();
	
	const dispatch = createEventDispatcher();
	
	// Estado dos grupos expandidos
	let expandedGroups = $state<Set<string>>(new Set(['categories', 'brands', 'price']));
	
	// Filtros selecionados
	let selectedCategories = $state<Set<string>>(new Set());
	let selectedBrands = $state<Set<string>>(new Set());
	let selectedPrice = $state(priceRange?.current || { min: 0, max: 1000 });
	
	function toggleGroup(groupId: string) {
		if (expandedGroups.has(groupId)) {
			expandedGroups.delete(groupId);
		} else {
			expandedGroups.add(groupId);
		}
		expandedGroups = new Set(expandedGroups);
	}
	
	function toggleFilter(type: 'category' | 'brand', filterId: string) {
		const set = type === 'category' ? selectedCategories : selectedBrands;
		
		if (set.has(filterId)) {
			set.delete(filterId);
		} else {
			set.add(filterId);
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
	
	function clearFilters() {
		selectedCategories.clear();
		selectedBrands.clear();
		selectedPrice = priceRange?.current || { min: 0, max: 1000 };
		
		// Forçar reatividade
		selectedCategories = new Set();
		selectedBrands = new Set();
		
		emitFilterChange();
	}
	
	function emitFilterChange() {
		dispatch('filterChange', {
			categories: Array.from(selectedCategories),
			brands: Array.from(selectedBrands),
			priceRange: selectedPrice
		});
	}
	
	// Contar filtros ativos
	let activeFilterCount = $derived(
		selectedCategories.size + selectedBrands.size + 
		(selectedPrice.min > (priceRange?.min || 0) || selectedPrice.max < (priceRange?.max || 1000) ? 1 : 0)
	);
</script>

<aside class="bg-white rounded-lg shadow-sm p-4 {className}">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-semibold text-gray-900">Filtros</h2>
		{#if activeFilterCount > 0}
			<button
				onclick={clearFilters}
				class="text-sm text-[#00BFB3] hover:text-[#00A89D] transition-colors"
			>
				Limpar ({activeFilterCount})
			</button>
		{/if}
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
			<!-- Categorias -->
			{#if categories.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('categories')}
						class="flex items-center justify-between w-full text-left"
						aria-expanded={expandedGroups.has('categories')}
					>
						<h3 class="font-medium text-gray-900">Categorias</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform {expandedGroups.has('categories') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('categories')}
						<div class="mt-3 space-y-2" transition:slide={{ duration: 200 }}>
							{#each categories as category}
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
									<input
										type="checkbox"
										checked={selectedCategories.has(category.id)}
										onchange={() => toggleFilter('category', category.id)}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
									/>
									<span class="ml-2 text-sm text-gray-700 flex-1">{category.name}</span>
									{#if category.count !== undefined}
										<span class="text-xs text-gray-500">({category.count})</span>
									{/if}
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- Marcas -->
			{#if brands.length > 0}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('brands')}
						class="flex items-center justify-between w-full text-left"
						aria-expanded={expandedGroups.has('brands')}
					>
						<h3 class="font-medium text-gray-900">Marcas</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform {expandedGroups.has('brands') ? 'rotate-180' : ''}"
							fill="none" 
							stroke="currentColor" 
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if expandedGroups.has('brands')}
						<div class="mt-3 space-y-2" transition:slide={{ duration: 200 }}>
							{#each brands as brand}
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
									<input
										type="checkbox"
										checked={selectedBrands.has(brand.id)}
										onchange={() => toggleFilter('brand', brand.id)}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
									/>
									<span class="ml-2 text-sm text-gray-700 flex-1">{brand.name}</span>
									{#if brand.count !== undefined}
										<span class="text-xs text-gray-500">({brand.count})</span>
									{/if}
								</label>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
			
			<!-- Faixa de Preço -->
			{#if priceRange}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup('price')}
						class="flex items-center justify-between w-full text-left"
						aria-expanded={expandedGroups.has('price')}
					>
						<h3 class="font-medium text-gray-900">Preço</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform {expandedGroups.has('price') ? 'rotate-180' : ''}"
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
			
			<!-- Filtros Customizados -->
			{#each customFilters as group}
				<div class="border-b border-gray-200 pb-4">
					<button
						onclick={() => toggleGroup(group.id)}
						class="flex items-center justify-between w-full text-left"
						aria-expanded={expandedGroups.has(group.id)}
					>
						<h3 class="font-medium text-gray-900">{group.label}</h3>
						<svg 
							class="w-5 h-5 text-gray-400 transition-transform {expandedGroups.has(group.id) ? 'rotate-180' : ''}"
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
								<label class="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
									<input
										type={group.type || 'checkbox'}
										name={group.id}
										checked={filter.selected}
										class="w-4 h-4 text-[#00BFB3] border-gray-300 {group.type === 'radio' ? '' : 'rounded'} focus:ring-[#00BFB3]"
									/>
									<span class="ml-2 text-sm text-gray-700 flex-1">{filter.name}</span>
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