<script lang="ts">
	import { slide } from 'svelte/transition';
	import ModernIcon from '../shared/ModernIcon.svelte';
	import { Select, Input } from '$lib/components/ui';
	import EnhancedMultiSelect from './EnhancedMultiSelect.svelte';
	
	let {
		categories = [],
		brands = [],
		statusFilter = $bindable('all'),
		categoryFilter = $bindable('all'),
		brandFilter = $bindable('all'),
		priceRange = $bindable({ min: '', max: '' }),
		onFiltersChange = () => {},
		defaultOpen = true,
		// Props para controlar quais filtros mostrar
		showCategoryFilter = true,
		showBrandFilter = true,
		showPriceFilter = true,
		statusOptions = [
			{ value: 'all', label: 'Todos os Status' },
			{ value: 'active', label: 'Ativos' },
			{ value: 'inactive', label: 'Inativos' }
		],
		// 🎯 NOVOS: Filtros customizados específicos da página
		customFilters = [],
		customFilterValues = $bindable({}),
		onCustomFilterChange = () => {}
	} = $props();
	
	let isOpen = $state(defaultOpen);
	
	// Persistir estado no localStorage
	$effect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('admin-filters-accordion');
			if (saved !== null) {
				isOpen = JSON.parse(saved);
			}
		}
	});
	
	function toggleAccordion() {
		isOpen = !isOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('admin-filters-accordion', JSON.stringify(isOpen));
		}
	}
	
	// Watch for changes and notify parent
	$effect(() => {
		onFiltersChange({
			status: statusFilter,
			category: categoryFilter,
			brand: brandFilter,
			priceMin: priceRange.min,
			priceMax: priceRange.max
		});
	});
</script>

<div class="bg-white rounded-lg border border-gray-200 overflow-visible">
	<!-- Header do Acordeão -->
	<button
		type="button"
		onclick={toggleAccordion}
		class="w-full flex items-center justify-between text-left py-4 px-6 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-inset"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-3">
			<div class="p-2 bg-[#00BFB3]/10 rounded-lg">
				<ModernIcon name="filter" size="md" color="#00BFB3" />
			</div>
			<h3 class="text-lg font-semibold text-gray-900">Filtros de Busca</h3>
		</div>
		
		<svg 
			class="w-5 h-5 text-gray-400 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	
	<!-- Conteúdo do Acordeão -->
	{#if isOpen}
		<div 
			class="border-t border-gray-200 overflow-visible"
			transition:slide={{ duration: 300 }}
		>
			<div class="p-6">
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					<!-- Status -->
					<div class="space-y-2">
						<label class="block text-sm font-medium text-gray-700">Status</label>
						<Select
							bind:value={statusFilter}
							options={statusOptions}
						/>
					</div>
					
					<!-- Categoria com MultiSelect Enhanced -->
					{#if showCategoryFilter}
						<div class="space-y-2 relative">
							<label class="block text-sm font-medium text-gray-700">Categoria</label>
							<EnhancedMultiSelect
								items={categories}
								selected={categoryFilter === 'all' ? [] : [categoryFilter]}
								onSelectionChange={(selected) => {
									categoryFilter = selected.length > 0 ? selected[0] : 'all';
								}}
								placeholder="Todas as categorias"
								allowMultiple={false}
								searchable={true}
								portalMode={true}
							/>
						</div>
					{/if}
					
					<!-- Marca -->
					{#if showBrandFilter}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-gray-700">Marca</label>
							<Select
								bind:value={brandFilter}
								options={[
									{ value: 'all', label: 'Todas as Marcas' },
									...brands.map(b => ({ value: b.id, label: b.name }))
								]}
							/>
						</div>
					{/if}
					
					<!-- Faixa de Preço -->
					{#if showPriceFilter}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-gray-700">Preço</label>
							<div class="flex gap-2">
								<Input
									type="number"
									placeholder="Min"
									bind:value={priceRange.min}
									class="w-1/2"
								/>
								<Input
									type="number"
									placeholder="Max"
									bind:value={priceRange.max}
									class="w-1/2"
								/>
							</div>
						</div>
					{/if}
					
					<!-- 🎯 FILTROS CUSTOMIZADOS ESPECÍFICOS DA PÁGINA -->
					{#each customFilters as filter}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-gray-700">{filter.label}</label>
							{#if filter.type === 'select'}
								<select 
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
									value={customFilterValues[filter.key] || 'all'}
									onchange={(e) => {
										customFilterValues[filter.key] = e.target.value;
										onCustomFilterChange(filter.key, e.target.value);
									}}
								>
									{#each filter.options || [] as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
							{:else if filter.type === 'input'}
								<input 
									type="text"
									placeholder={filter.placeholder || `Filtrar por ${filter.label.toLowerCase()}`}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
									value={customFilterValues[filter.key] || ''}
									oninput={(e) => {
										customFilterValues[filter.key] = e.target.value;
										onCustomFilterChange(filter.key, e.target.value);
									}}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div> 