<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface Seller {
		id: string;
		name: string;
		slug?: string;
		rating?: number;
		totalSales?: number;
		verified?: boolean;
		count?: number;
	}
	
	interface SellerFilterProps {
		selected?: string[];
		sellers?: Seller[];
		loading?: boolean;
		showSearch?: boolean;
	}
	
	let {
		selected = [],
		sellers = [],
		loading = false,
		showSearch = true
	}: SellerFilterProps = $props();
	
	const dispatch = createEventDispatcher<{
		change: { sellers: string[] };
	}>();
	
	let searchQuery = $state('');
	
	// Filtrar vendedores pela busca
	let filteredSellers = $derived(
		sellers.filter(seller => 
			seller.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
	
	function toggleSeller(seller: Seller) {
		const sellerValue = seller.slug || seller.id;
		const newSelected = selected.includes(sellerValue)
			? selected.filter(id => id !== sellerValue)
			: [...selected, sellerValue];
		
		dispatch('change', { sellers: newSelected });
	}
	
	function formatSalesCount(count?: number): string {
		if (!count) return '';
		if (count >= 1000) return `${(count / 1000).toFixed(1)}k vendas`;
		return `${count} vendas`;
	}
</script>

<div class="space-y-3">
	{#if showSearch && sellers.length > 5}
		<div class="relative">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Buscar vendedor..."
				class="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md 
					focus:ring-[#00BFB3] focus:border-[#00BFB3]"
			/>
			<svg 
				class="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
				fill="none" 
				stroke="currentColor" 
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>
	{/if}
	
	{#if loading}
		<div class="space-y-2">
			{#each Array(4) as _}
				<div class="h-12 bg-gray-50 rounded animate-pulse"></div>
			{/each}
		</div>
	{:else if filteredSellers.length === 0}
		<p class="text-sm text-gray-500 text-center py-4">
			{searchQuery ? 'Nenhum vendedor encontrado' : 'Nenhum vendedor disponível'}
		</p>
	{:else}
		<div class="space-y-2 max-h-64 overflow-y-auto">
			{#each filteredSellers as seller}
				<label 
					class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all
						hover:bg-gray-50 {selected.includes(seller.id) ? 'bg-[#00BFB3]/5' : ''}"
				>
					<input
						type="checkbox"
						checked={selected.includes(seller.slug || seller.id)}
						onchange={() => toggleSeller(seller)}
						class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
					/>
					
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<span class="font-medium text-gray-900 truncate">{seller.name}</span>
							{#if seller.verified}
								<svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
								</svg>
							{/if}
						</div>
						
						<div class="flex items-center gap-3 text-xs text-gray-600 mt-0.5">
							{#if seller.rating}
								<div class="flex items-center gap-1">
									<svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
									<span>{seller.rating.toFixed(1)}</span>
								</div>
							{/if}
							{#if seller.totalSales}
								<span>{formatSalesCount(seller.totalSales)}</span>
							{/if}
						</div>
					</div>
					
					{#if seller.count !== undefined}
						<span class="text-sm text-gray-500">({seller.count})</span>
					{/if}
				</label>
			{/each}
		</div>
	{/if}
</div> 