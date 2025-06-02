<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';
	
	interface SearchSuggestion {
		type: 'product' | 'category' | 'brand' | 'history';
		text: string;
		slug?: string;
		count?: number;
		image?: string;
	}
	
	let {
		value = $bindable(''),
		placeholder = 'Buscar produtos...',
		class: className = ''
	} = $props();
	
	const dispatch = createEventDispatcher();
	
	let isOpen = $state(false);
	let suggestions = $state<SearchSuggestion[]>([]);
	let selectedIndex = $state(-1);
	let isLoading = $state(false);
	let searchTimeout: NodeJS.Timeout;
	
	// Buscar sugestões
	async function fetchSuggestions(query: string) {
		if (query.length < 2) {
			suggestions = [];
			return;
		}
		
		isLoading = true;
		
		try {
			const response = await fetch(`/api/products/search-suggestions?q=${encodeURIComponent(query)}`);
			const data = await response.json();
			
			if (data.success) {
				suggestions = data.data;
			}
		} catch (error) {
			console.error('Erro ao buscar sugestões:', error);
		} finally {
			isLoading = false;
		}
	}
	
	// Debounce da busca
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		
		clearTimeout(searchTimeout);
		
		if (value.length >= 2) {
			isOpen = true;
			searchTimeout = setTimeout(() => {
				fetchSuggestions(value);
			}, 300);
		} else {
			isOpen = false;
			suggestions = [];
		}
	}
	
	// Navegação com teclado
	function handleKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0) {
					selectSuggestion(suggestions[selectedIndex]);
				} else {
					performSearch();
				}
				break;
			case 'Escape':
				isOpen = false;
				selectedIndex = -1;
				break;
		}
	}
	
	// Selecionar sugestão
	function selectSuggestion(suggestion: SearchSuggestion) {
		switch (suggestion.type) {
			case 'product':
				goto(`/produto/${suggestion.slug}`);
				break;
			case 'category':
				goto(`/busca?categoria=${suggestion.slug}`);
				break;
			case 'brand':
				goto(`/busca?marca=${suggestion.slug}`);
				break;
			case 'history':
				value = suggestion.text;
				performSearch();
				break;
		}
		
		isOpen = false;
		selectedIndex = -1;
	}
	
	// Realizar busca
	function performSearch() {
		if (value.trim()) {
			goto(`/busca?q=${encodeURIComponent(value.trim())}`);
			isOpen = false;
		}
	}
	
	// Fechar ao clicar fora
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.search-autocomplete')) {
			isOpen = false;
		}
	}
	
	// Adicionar listener global
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<div class="search-autocomplete relative {className}">
	<form onsubmit={(e) => { e.preventDefault(); performSearch(); }}>
		<div class="relative">
			<input
				type="search"
				{value}
				{placeholder}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onfocus={() => value.length >= 2 && (isOpen = true)}
				class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
				autocomplete="off"
			/>
			
			<button
				type="submit"
				aria-label="Buscar"
				class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-[#00BFB3] transition-colors"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</button>
		</div>
	</form>
	
	<!-- Dropdown de sugestões -->
	{#if isOpen && (suggestions.length > 0 || isLoading)}
		<div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
			{#if isLoading}
				<div class="p-4 text-center text-gray-500">
					<svg class="animate-spin h-5 w-5 mx-auto text-[#00BFB3]" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				</div>
			{:else}
				{#each suggestions as suggestion, index}
					<button
						type="button"
						onclick={() => selectSuggestion(suggestion)}
						onmouseenter={() => selectedIndex = index}
						class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors {selectedIndex === index ? 'bg-gray-50' : ''}"
					>
						<!-- Ícone por tipo -->
						{#if suggestion.type === 'product'}
							{#if suggestion.image}
								<img src={suggestion.image} alt="" class="w-10 h-10 object-cover rounded" />
							{:else}
								<div class="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
									<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
									</svg>
								</div>
							{/if}
						{:else if suggestion.type === 'category'}
							<div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded flex items-center justify-center">
								<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
							</div>
						{:else if suggestion.type === 'brand'}
							<div class="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
								<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
								</svg>
							</div>
						{:else}
							<div class="w-10 h-10 bg-gray-50 rounded flex items-center justify-center">
								<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						{/if}
						
						<!-- Texto -->
						<div class="flex-1 text-left">
							<div class="text-sm font-medium text-gray-900">
								{#if suggestion.type === 'product'}
									{suggestion.text}
								{:else}
									<span class="text-gray-500">em</span> {suggestion.text}
								{/if}
							</div>
							{#if suggestion.count}
								<div class="text-xs text-gray-500">{suggestion.count} produtos</div>
							{/if}
						</div>
						
						<!-- Seta -->
						<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div> 