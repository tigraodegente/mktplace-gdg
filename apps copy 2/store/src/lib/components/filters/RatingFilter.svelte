<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Rating from '$lib/components/ui/Rating.svelte';
	
	interface RatingFilterProps {
		selectedRating: number | null;
		onRatingChange: (rating: number | null) => void;
	}
	
	let { selectedRating, onRatingChange }: RatingFilterProps = $props();
	
	const ratings = [5, 4, 3, 2, 1];
</script>

<div class="space-y-3">
	<h3 class="text-sm font-semibold text-gray-900">Avaliação</h3>
	
	<div class="space-y-2">
		{#each ratings as rating}
			<label class="flex items-center gap-3 cursor-pointer group">
				<input
					type="radio"
					name="rating"
					value={rating}
					checked={selectedRating === rating}
					onchange={() => onRatingChange(rating)}
					class="w-4 h-4 text-[#00BFB3] border-gray-300 focus:ring-[#00BFB3]"
				/>
				<div class="flex items-center gap-2">
					<Rating rating={rating} size="sm" showValue={false} />
					<span class="text-sm text-gray-600">e acima</span>
				</div>
			</label>
		{/each}
		
		{#if selectedRating !== null}
			<button
				onclick={() => onRatingChange(null)}
				class="text-sm text-[#00BFB3] hover:text-[#00A89D] mt-2"
			>
				Limpar filtro
			</button>
		{/if}
	</div>
</div> 