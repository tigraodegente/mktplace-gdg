<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface RatingFilterProps {
		currentRating?: number;
		counts?: Record<number, number>;
		loading?: boolean;
	}
	
	let {
		currentRating = 0,
		counts = {},
		loading = false
	}: RatingFilterProps = $props();
	
	const dispatch = createEventDispatcher<{
		change: { rating: number | undefined };
	}>();
	
	function selectRating(rating: number) {
		const newRating = currentRating === rating ? undefined : rating;
		dispatch('change', { rating: newRating });
	}
	
	// Calcular total de produtos por rating
	const totalByRating = $derived(
		[5, 4, 3, 2, 1].map(rating => ({
			rating,
			count: counts[rating] || 0,
			percentage: counts[rating] ? (counts[rating] / Math.max(...Object.values(counts), 1)) * 100 : 0
		}))
	);
</script>

<div class="space-y-3">
	{#if loading}
		<div class="space-y-2">
			{#each Array(5) as _}
				<div class="h-6 bg-gray-100 rounded animate-pulse"></div>
			{/each}
		</div>
	{:else}
		{#each totalByRating as { rating, count, percentage }}
			<button
				onclick={() => selectRating(rating)}
				class="w-full text-left group hover:bg-gray-50 p-3 rounded-lg transition-all duration-200
					{currentRating === rating ? 'bg-[#00BFB3]/10 ring-2 ring-[#00BFB3]/30' : ''}"
				aria-label={`Filtrar por ${rating} estrelas ou mais`}
			>
				<div class="flex items-center gap-3">
					<!-- Estrelas -->
					<div class="flex items-center gap-0.5">
						{#each Array(5) as _, i}
							<svg 
								class="w-4 h-4 {i < rating ? 'text-yellow-400' : 'text-gray-300'} transition-colors"
								fill="currentColor" 
								viewBox="0 0 20 20"
							>
								<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
							</svg>
						{/each}
					</div>
					
					<!-- Texto -->
					<span class="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">
						{rating === 5 ? '5 estrelas' : `${rating} ou mais`}
					</span>
					
					<!-- Contagem -->
					<span class="text-xs font-medium text-gray-500">({count})</span>
				</div>
				
				<!-- Barra de progresso -->
				{#if count > 0}
					<div class="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
						<div 
							class="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300 ease-out"
							style="width: {percentage}%"
						></div>
					</div>
				{/if}
			</button>
		{/each}
		
		{#if currentRating > 0}
			<button
				onclick={() => selectRating(0)}
				class="text-sm font-medium text-[#00BFB3] hover:text-[#00A89D] mt-2 transition-colors flex items-center gap-1"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
				Limpar filtro de avaliação
			</button>
		{/if}
	{/if}
</div> 