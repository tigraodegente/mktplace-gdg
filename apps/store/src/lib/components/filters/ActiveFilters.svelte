<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '@mktplace/utils';
	
	interface ActiveFilter {
		id: string;
		type: 'category' | 'brand' | 'price' | 'custom';
		label: string;
		value?: any;
	}
	
	interface ActiveFiltersProps {
		filters?: ActiveFilter[];
		class?: string;
	}
	
	let {
		filters = [],
		class: className = ''
	}: ActiveFiltersProps = $props();
	
	const dispatch = createEventDispatcher();
	
	function removeFilter(filter: ActiveFilter) {
		dispatch('remove', filter);
	}
	
	function clearAll() {
		dispatch('clearAll');
	}
	
	function getFilterLabel(filter: ActiveFilter): string {
		if (filter.type === 'price' && filter.value) {
			return `${formatCurrency(filter.value.min)} - ${formatCurrency(filter.value.max)}`;
		}
		return filter.label;
	}
	
	function getFilterIcon(type: string) {
		switch (type) {
			case 'category':
				return 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z';
			case 'brand':
				return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
			case 'price':
				return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z';
		}
	}
</script>

{#if filters.length > 0}
	<div class="bg-white rounded-lg shadow-sm p-4 {className}">
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-sm font-medium text-gray-900">Filtros ativos</h3>
			<button
				onclick={clearAll}
				class="text-xs text-[#00BFB3] hover:text-[#00A89D] transition-colors"
			>
				Limpar todos
			</button>
		</div>
		
		<div class="flex flex-wrap gap-2">
			{#each filters as filter}
				<div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-sm">
					<svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getFilterIcon(filter.type)} />
					</svg>
					
					<span class="text-gray-700">{getFilterLabel(filter)}</span>
					
					<button
						onclick={() => removeFilter(filter)}
						class="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
						aria-label="Remover filtro {filter.label}"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if} 