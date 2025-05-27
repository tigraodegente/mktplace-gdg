<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { searchService, type SearchSuggestion } from '$lib/services/searchService';
	import type { Product } from '@mktplace/shared-types';

	let { 
		placeholder = "O que você está procurando?",
		class: className = ""
	} = $props();

	let searchQuery = $state('');
	let searchFocused = $state(false);
	let suggestions = $state<SearchSuggestion[]>([]);
	let searchHistory = $state<string[]>([]);
	let popularSearches = $state<string[]>([]);
	let trendingSearches = $state<string[]>([]);
	let isSearching = $state(false);
	let selectedIndex = $state(-1);
	let searchDebounceTimer: ReturnType<typeof setTimeout>;
	let searchInput: HTMLInputElement;

	onMount(() => {
		// Carregar dados iniciais
		searchHistory = searchService.getHistory();
		popularSearches = searchService.getPopularSearches();
		trendingSearches = searchService.getTrendingSearches();
	});

	async function handleSearchInput() {
		clearTimeout(searchDebounceTimer);
		selectedIndex = -1;
		
		if (searchQuery.length < 2) {
			suggestions = [];
			isSearching = false;
			return;
		}
		
		isSearching = true;
		searchDebounceTimer = setTimeout(async () => {
			try {
				suggestions = await searchService.quickSearch(searchQuery);
			} catch (error) {
				console.error('Erro na busca:', error);
				suggestions = [];
			} finally {
				isSearching = false;
			}
		}, 300);
	}

	function handleSearchSubmit(e: Event) {
		e.preventDefault();
		if (searchQuery.trim()) {
			performSearch(searchQuery);
		}
	}

	function performSearch(query: string) {
		searchService.addToHistory(query);
		searchFocused = false;
		goto(`/busca?q=${encodeURIComponent(query)}`);
	}

	function selectSuggestion(suggestion: SearchSuggestion) {
		if (suggestion.type === 'product') {
			goto(`/produto/${suggestion.id}`);
		} else if (suggestion.type === 'category') {
			goto(`/categoria/${suggestion.id}`);
		} else {
			performSearch(suggestion.text);
		}
	}

	function clearSearchHistory() {
		searchService.clearHistory();
		searchHistory = [];
	}

	function handleKeyDown(e: KeyboardEvent) {
		const totalItems = suggestions.length || 
			(searchQuery.length < 2 ? searchHistory.length + popularSearches.length : 0);

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, totalItems - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0) {
					if (suggestions.length > 0) {
						selectSuggestion(suggestions[selectedIndex]);
					} else if (searchQuery.length < 2) {
						// Selecionar do histórico ou populares
						const allItems = [...searchHistory, ...popularSearches];
						if (selectedIndex < allItems.length) {
							performSearch(allItems[selectedIndex]);
						}
					}
				} else {
					handleSearchSubmit(e);
				}
				break;
			case 'Escape':
				searchFocused = false;
				searchInput?.blur();
				break;
		}
	}

	// Fechar ao clicar fora
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.search-container')) {
			searchFocused = false;
		}
	}

	$effect(() => {
		if (searchFocused) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="search-container relative {className}">
	<form onsubmit={handleSearchSubmit} class="relative">
		<input
			bind:this={searchInput}
			type="search"
			{placeholder}
			bind:value={searchQuery}
			oninput={handleSearchInput}
			onfocus={() => searchFocused = true}
			onkeydown={handleKeyDown}
			class="w-full h-[42px] pl-6 pr-12 bg-white border border-gray-300 rounded-[8.42px] text-gray-600 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-all"
			autocomplete="off"
			aria-label="Buscar produtos"
			aria-expanded={searchFocused}
			aria-controls="search-dropdown"
		/>
		
		<button 
			type="submit" 
			class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#00BFB3] hover:text-[#00A89D] transition-colors" 
			aria-label="Buscar"
		>
			{#if isSearching}
				<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
			{:else}
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			{/if}
		</button>
	</form>
	
	<!-- Search Dropdown -->
	{#if searchFocused}
		<div 
			id="search-dropdown"
			class="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[500px] overflow-y-auto z-50"
		>
			<!-- Sugestões de busca -->
			{#if searchQuery.length >= 2 && suggestions.length > 0}
				<div class="p-4">
					{#each suggestions as suggestion, index}
						{@const isSelected = index === selectedIndex}
						<button
							onclick={() => selectSuggestion(suggestion)}
							class="w-full text-left transition-colors rounded-lg {isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}"
						>
							{#if suggestion.type === 'product'}
								<div class="flex items-center gap-3 p-2">
									<img 
										src={suggestion.image || '/api/placeholder/60/60'} 
										alt=""
										class="w-12 h-12 object-cover rounded"
									/>
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-800 line-clamp-1">
											{@html suggestion.highlight || suggestion.text}
										</p>
										{#if suggestion.price}
											<p class="text-sm text-[#00BFB3] font-semibold">
												R$ {suggestion.price.toFixed(2)}
											</p>
										{/if}
									</div>
									<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							{:else if suggestion.type === 'category'}
								<div class="flex items-center gap-3 p-2">
									<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
										<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
										</svg>
									</div>
									<div class="flex-1">
										<p class="text-sm font-medium text-gray-800">{suggestion.text}</p>
										{#if suggestion.count}
											<p class="text-xs text-gray-500">{suggestion.count} produtos</p>
										{/if}
									</div>
								</div>
							{:else}
								<div class="flex items-center gap-3 p-2">
									<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
									</svg>
									<span class="text-sm text-gray-700">{suggestion.text}</span>
								</div>
							{/if}
						</button>
					{/each}
					
					<button 
						onclick={() => handleSearchSubmit(new Event('submit'))}
						class="w-full mt-3 text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium text-center py-2 border-t border-gray-100"
					>
						Ver todos os resultados para "{searchQuery}" →
					</button>
				</div>
			{:else if searchQuery.length < 2}
				<!-- Histórico e sugestões -->
				{#if searchHistory.length > 0}
					<div class="p-4 border-b border-gray-100">
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-sm font-semibold text-gray-700">Buscas recentes</h3>
							<button 
								onclick={clearSearchHistory}
								class="text-xs text-gray-500 hover:text-gray-700"
							>
								Limpar
							</button>
						</div>
						<div class="space-y-1">
							{#each searchHistory as historyItem, index}
								{@const isSelected = index === selectedIndex}
								<button 
									onclick={() => performSearch(historyItem)}
									class="flex items-center gap-2 w-full p-2 rounded-lg transition-colors text-left {isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}"
								>
									<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span class="text-sm text-gray-700">{historyItem}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
				
				<!-- Trending -->
				{#if trendingSearches.length > 0}
					<div class="p-4 border-b border-gray-100">
						<h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
							<svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
								<path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2M14.5 17.5C14.22 17.74 13.76 18 13.4 18.1C12.28 18.5 11.16 17.94 10.5 17.28C11.69 17 12.4 16.12 12.61 15.23C12.78 14.43 12.46 13.77 12.33 13C12.21 12.26 12.23 11.63 12.5 10.94C12.69 11.32 12.89 11.7 13.13 12C13.9 13 15.11 13.44 15.37 14.8C15.41 14.94 15.43 15.08 15.43 15.23C15.46 16.05 15.1 16.95 14.5 17.5H14.5Z"/>
							</svg>
							Em alta agora
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each trendingSearches.slice(0, 5) as trending, index}
								{@const isSelected = searchHistory.length + index === selectedIndex}
								<button 
									onclick={() => performSearch(trending)}
									class="px-3 py-1.5 rounded-full text-sm transition-colors {isSelected ? 'bg-[#00BFB3] text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}"
								>
									{trending}
								</button>
							{/each}
						</div>
					</div>
				{/if}
				
				<!-- Populares -->
				<div class="p-4">
					<h3 class="text-sm font-semibold text-gray-700 mb-3">Buscas populares</h3>
					<div class="flex flex-wrap gap-2">
						{#each popularSearches.slice(0, 8) as popular, index}
							{@const isSelected = searchHistory.length + trendingSearches.length + index === selectedIndex}
							<button 
								onclick={() => performSearch(popular)}
								class="px-3 py-1.5 rounded-full text-sm transition-colors {isSelected ? 'bg-[#00BFB3] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							>
								{popular}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<!-- Nenhum resultado -->
				<div class="p-8 text-center">
					<svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-gray-500 text-sm">Nenhum resultado encontrado</p>
					<p class="text-gray-400 text-xs mt-1">Tente buscar por outro termo</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Highlight de texto nas sugestões */
	:global(.search-container mark) {
		background-color: #fef3c7;
		color: inherit;
		font-weight: 600;
		padding: 0;
	}
</style> 