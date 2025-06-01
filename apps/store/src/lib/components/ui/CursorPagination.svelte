<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher<{
		loadMore: void;
		loadPrevious: void;
		reset: void;
	}>();
	
	interface Props {
		hasMore?: boolean;
		loading?: boolean;
		totalItems?: number | undefined;
		currentItems?: number;
		itemsPerPage?: number;
		showLoadMore?: boolean;
		showProgress?: boolean;
		variant?: 'buttons' | 'infinite';
	}
	
	let {
		hasMore = false,
		loading = false,
		totalItems = undefined,
		currentItems = 0,
		itemsPerPage = 20,
		showLoadMore = true,
		showProgress = true,
		variant = 'buttons'
	}: Props = $props();
	
	// Auto-load more no infinite scroll
	let loadMoreButton: HTMLButtonElement;
	let observer: IntersectionObserver;
	
	$effect(() => {
		if (variant === 'infinite' && loadMoreButton && !loading) {
			observer?.disconnect();
			observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting && hasMore) {
						dispatch('loadMore');
					}
				},
				{ threshold: 0.1 }
			);
			observer.observe(loadMoreButton);
			
			return () => {
				observer?.disconnect();
			};
		}
	});
	
	const progressPercentage = $derived(
		!totalItems ? 0 : Math.min((currentItems / totalItems) * 100, 100)
	);
</script>

<nav class="flex flex-col items-center gap-4 py-6" aria-label="Paginação por cursor">
	{#if showProgress && totalItems}
		<div class="w-full max-w-md">
			<div class="flex justify-between text-sm text-gray-600 mb-2">
				<span>{currentItems} de {totalItems} produtos</span>
				<span>{Math.round(progressPercentage)}%</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div 
					class="bg-[#00BFB3] h-2 rounded-full transition-all duration-300"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</div>
	{/if}
	
	{#if variant === 'buttons'}
		<div class="flex items-center gap-3">
			{#if hasMore}
				<button
					onclick={() => dispatch('loadMore')}
					disabled={loading}
					class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
				>
					{#if loading}
						<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Carregando...
					{:else}
						Carregar mais produtos
					{/if}
				</button>
			{:else if currentItems > 0}
				<div class="text-gray-500 text-center py-4">
					<svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946A3.42 3.42 0 017.835 4.697z" />
					</svg>
					<p class="text-sm">Todos os produtos foram carregados</p>
				</div>
			{/if}
			
			{#if currentItems > itemsPerPage}
				<button
					onclick={() => dispatch('reset')}
					class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Voltar ao início
				</button>
			{/if}
		</div>
	{:else if variant === 'infinite'}
		{#if hasMore}
			<button
				bind:this={loadMoreButton}
				onclick={() => dispatch('loadMore')}
				disabled={loading}
				class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] disabled:opacity-50 transition-colors opacity-0"
				aria-hidden="true"
			>
				Carregando automaticamente...
			</button>
		{/if}
		
		{#if loading}
			<div class="flex items-center gap-2 text-gray-600">
				<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				<span>Carregando mais produtos...</span>
			</div>
		{/if}
	{/if}
</nav>

<style>
	/* Suavizar animações */
	button {
		transition: all 0.2s ease-in-out;
	}
	
	/* Loading state */
	button:disabled {
		transform: scale(0.98);
	}
</style>