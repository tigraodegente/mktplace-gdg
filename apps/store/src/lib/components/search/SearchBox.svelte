<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { searchService, type SearchSuggestion } from '$lib/services/searchService';

	let { 
		placeholder = "O que você está procurando?",
		class: className = ""
	} = $props();

	let searchQuery = $state('');
	let searchFocused = $state(false);
	let suggestions = $state<SearchSuggestion[]>([]);
	let searchHistory = $state<string[]>([]);
	let popularSearches = $state<string[]>([]);
	let isSearching = $state(false);
	let selectedIndex = $state(-1);
	let searchDebounceTimer: ReturnType<typeof setTimeout>;
	let searchInput: HTMLInputElement;

	onMount(() => {
		// Carregar dados iniciais
		searchHistory = searchService.getHistory();
		// Buscar termos populares de forma assíncrona com tratamento de erro robusto
		searchService.getPopularSearches().then(terms => {
			popularSearches = terms;
		}).catch(error => {
			console.warn('⚠️ Falha ao carregar termos populares no SearchBox:', error);
			// Fallback padrão para evitar tela branca
			popularSearches = ['samsung', 'iphone', 'notebook', 'tv', 'smartphone'];
		});
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
	
	// Limpar sugestões quando focar no campo com texto
	function handleFocus() {
		searchFocused = true;
		// Se tem texto no campo mas não está buscando, limpar sugestões para mostrar histórico
		if (searchQuery.length > 0 && !isSearching) {
			suggestions = [];
		}
	}

	function handleSearchSubmit(e: Event) {
		e.preventDefault();
		if (searchQuery.trim()) {
			performSearch(searchQuery);
		}
	}

	function performSearch(query: string) {
		searchQuery = query; // Preencher o campo com o termo buscado
		searchService.addToHistory(query); // Agora é assíncrono mas não precisamos esperar
		searchFocused = false;
		goto(`/busca?q=${encodeURIComponent(query)}`);
	}

	function selectSuggestion(suggestion: SearchSuggestion, index: number) {
		// Fechar o dropdown imediatamente
		searchFocused = false;
		
		// Rastrear clique se for produto
		if (suggestion.type === 'product' && suggestion.id && searchQuery) {
			searchService.trackSearchClick(searchQuery, suggestion.id, index);
		}
		
		if (suggestion.type === 'product' && suggestion.slug) {
			goto(`/produto/${suggestion.slug}`);
		} else if (suggestion.type === 'category' && suggestion.slug) {
			goto(`/busca?categoria=${suggestion.slug}`);
		} else if (suggestion.type === 'brand' && suggestion.slug) {
			goto(`/busca?marca=${suggestion.id}`);
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
			(searchQuery.length === 0 ? searchHistory.length : 0);

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
						selectSuggestion(suggestions[selectedIndex], selectedIndex);
					} else if (searchQuery.length === 0 && selectedIndex < searchHistory.length) {
						// Selecionar do histórico
						performSearch(searchHistory[selectedIndex]);
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
		if (!searchFocused) return;
		
		// Usar timeout para evitar loops
		const timeoutId = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
		}, 0);
		
		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="search-container relative w-full {className}">
	<form onsubmit={handleSearchSubmit} class="relative w-full">
		<input
			bind:this={searchInput}
			type="search"
			{placeholder}
			bind:value={searchQuery}
			oninput={handleSearchInput}
			onfocus={handleFocus}
			onkeydown={handleKeyDown}
			class="w-full h-[42px] pl-6 pr-12 bg-white border border-gray-300 rounded-[8.42px] text-gray-600 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-[#00BFB3]/30 focus:border-[#00BFB3] transition-all"
			style="font-family: 'Lato', sans-serif;"
			autocomplete="off"
			aria-label="Buscar produtos"
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
	{#if searchFocused && (searchQuery.length >= 2 || searchQuery.length === 0)}
		<div 
			id="search-dropdown"
			class="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[600px] overflow-y-auto z-50"
		>
			<!-- Sugestões de busca -->
			{#if searchQuery.length >= 2 && suggestions.length > 0}
				<div class="py-2">
					{#each suggestions as suggestion, index}
						{@const isSelected = index === selectedIndex}
						<button
							onclick={() => selectSuggestion(suggestion, index)}
							class="w-full text-left transition-colors {isSelected ? 'bg-gray-50' : ''}"
						>
							{#if suggestion.type === 'product'}
								<div class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
									<div class="relative flex-shrink-0">
										<img 
											src={suggestion.image || '/api/placeholder/80/80'} 
											alt=""
											class="w-20 h-20 object-cover rounded-lg"
										/>
										{#if suggestion.discount}
											<span class="absolute -top-1 -left-1 bg-[#00BFB3] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
												-{suggestion.discount}%
											</span>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
											{@html suggestion.highlight || suggestion.text}
										</p>
										
										{#if suggestion.pieces}
											<p class="text-xs text-gray-600 mb-1">{suggestion.pieces} peças</p>
										{/if}
										
										<div class="flex items-center gap-2 flex-wrap">
											{#if suggestion.originalPrice && suggestion.originalPrice > (suggestion.price || 0)}
												<span class="text-xs text-gray-500 line-through">
													R$ {suggestion.originalPrice.toFixed(2).replace('.', ',')}
												</span>
											{/if}
											
											{#if suggestion.price}
												<div class="flex items-baseline gap-1">
													<span class="text-xs text-gray-600">por</span>
													<span class="text-base font-bold text-[#00BFB3]">
														R$ {suggestion.price.toFixed(2).replace('.', ',')}
													</span>
												</div>
											{/if}
											
											{#if suggestion.installments && suggestion.price}
												<span class="text-[11px] text-gray-600">
													{suggestion.installments}x R$ {(suggestion.price / suggestion.installments).toFixed(2).replace('.', ',')}
												</span>
											{/if}
										</div>
										
										{#if suggestion.hasFastDelivery}
											<div class="flex items-center gap-2 mt-2">
												<div class="badge badge--delivery">
													<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
														<path d="M8.50446 6.40097C8.44526 6.29319 8.33418 6.2249 8.21202 6.22119L5.23016 6.13067L6.57478 2.43905C6.61296 2.33376 6.5986 2.21623 6.53629 2.12333C6.47399 2.03031 6.37116 1.97315 6.25989 1.96965L2.79821 1.86457C2.64532 1.86005 2.50773 1.95706 2.45939 2.10333L0.173823 9.0212L0.173819 9.02132C0.139141 9.1259 0.155541 9.24103 0.218155 9.33159C0.280886 9.42204 0.382373 9.47741 0.491797 9.48062L3.60749 9.57519L3.472 14.1127C3.46712 14.2723 3.57018 14.4149 3.72235 14.4589C3.87453 14.503 4.03693 14.4373 4.11681 14.2995L8.50035 6.74639C8.56246 6.64019 8.56407 6.50864 8.50452 6.40085L8.50446 6.40097Z" fill="#FF8403"/>
													</svg>
													<span>Chega rapidinho</span>
												</div>
											</div>
										{/if}
									</div>
									<svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							{:else if suggestion.type === 'category'}
								<div class="flex items-center gap-3 p-2">
									<div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
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
						class="w-full mt-2 text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium text-center py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
					>
						Ver todos os resultados para "{searchQuery}" →
					</button>
				</div>
			{:else if searchQuery.length === 0 || (searchQuery.length > 0 && suggestions.length === 0 && !isSearching)}
				<!-- Histórico e sugestões quando campo vazio ou quando tem texto mas sem resultados ativos -->
				<div>
					{#if searchHistory.length > 0}
						<div class="p-4 border-b border-gray-100">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-semibold text-gray-700" style="font-family: 'Lato', sans-serif;">Buscas recentes</h3>
								<button 
									onclick={clearSearchHistory}
									class="text-xs text-gray-500 hover:text-gray-700"
									style="font-family: 'Lato', sans-serif;"
								>
									Limpar
								</button>
							</div>
							<div class="space-y-1">
								{#each searchHistory as historyItem, index}
									{@const isSelected = index === selectedIndex}
									<button 
										onclick={() => performSearch(historyItem)}
										class="flex items-center gap-2 w-full p-2 rounded-lg transition-colors text-left {isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'}"
									>
										<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										<span class="text-sm text-gray-700" style="font-family: 'Lato', sans-serif;">{historyItem}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
					
					<!-- Sugestões populares -->
					<div class="p-4">
						<h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2" style="font-family: 'Lato', sans-serif;">
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							Mais procurados
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each popularSearches.slice(0, 8) as popular}
								<button
									onclick={() => performSearch(popular)}
									class="px-3 py-1.5 bg-gray-50 hover:bg-[#00BFB3] hover:text-white rounded-full text-sm transition-colors"
									style="font-family: 'Lato', sans-serif;"
								>
									{popular}
								</button>
							{/each}
						</div>
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
	
	/* Badge styles */
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 5px;
		font-family: 'Lato', sans-serif;
		font-size: 12px;
		font-weight: 600;
		height: 24px;
		transition: all 0.2s ease;
	}
	
	.badge--delivery {
		background: #FBE7D1;
		color: #E07709;
	}
	
	.badge svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}
</style>
