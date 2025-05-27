<script lang="ts">
	interface Props {
		placeholder?: string;
		value?: string;
		onSearch?: (query: string) => void;
		onSuggestionClick?: (suggestion: SearchSuggestion) => void;
		getSuggestions?: (query: string) => Promise<SearchSuggestion[]>;
		showSuggestions?: boolean;
		minChars?: number;
		debounceMs?: number;
		class?: string;
	}
	
	export interface SearchSuggestion {
		id: string;
		text: string;
		type: 'product' | 'category' | 'brand' | 'query' | 'custom';
		url?: string;
		icon?: string;
		meta?: any;
	}
	
	let {
		placeholder = 'Buscar...',
		value = $bindable(''),
		onSearch,
		onSuggestionClick,
		getSuggestions,
		showSuggestions = true,
		minChars = 2,
		debounceMs = 300,
		class: className = ''
	}: Props = $props();
	
	// State
	let suggestions = $state<SearchSuggestion[]>([]);
	let isLoading = $state(false);
	let showDropdown = $state(false);
	let selectedIndex = $state(-1);
	let searchInput: HTMLInputElement;
	let debounceTimer: NodeJS.Timeout;
	
	// Computed
	const hasValue = $derived(value.trim().length > 0);
	const canShowSuggestions = $derived(
		showSuggestions && 
		showDropdown && 
		value.length >= minChars && 
		(suggestions.length > 0 || isLoading)
	);
	
	// Functions
	async function fetchSuggestions(query: string) {
		if (!getSuggestions || query.length < minChars) {
			suggestions = [];
			return;
		}
		
		isLoading = true;
		try {
			suggestions = await getSuggestions(query);
		} catch (error) {
			console.error('Erro ao buscar sugestões:', error);
			suggestions = [];
		} finally {
			isLoading = false;
		}
	}
	
	function debouncedFetch(query: string) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			fetchSuggestions(query);
		}, debounceMs);
	}
	
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		showDropdown = true;
		selectedIndex = -1;
		
		if (getSuggestions) {
			debouncedFetch(value);
		}
	}
	
	function handleSearch(e?: Event) {
		e?.preventDefault();
		if (value.trim() && onSearch) {
			onSearch(value.trim());
			showDropdown = false;
			searchInput?.blur();
		}
	}
	
	function handleSuggestionClick(suggestion: SearchSuggestion) {
		value = suggestion.text;
		showDropdown = false;
		
		if (onSuggestionClick) {
			onSuggestionClick(suggestion);
		} else if (onSearch) {
			onSearch(suggestion.text);
		}
		
		searchInput?.blur();
	}
	
	function handleKeyDown(e: KeyboardEvent) {
		if (!canShowSuggestions) return;
		
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
				if (selectedIndex >= 0 && suggestions[selectedIndex]) {
					handleSuggestionClick(suggestions[selectedIndex]);
				} else {
					handleSearch();
				}
				break;
			case 'Escape':
				e.preventDefault();
				showDropdown = false;
				searchInput?.blur();
				break;
		}
	}
	
	function handleFocus() {
		showDropdown = true;
		if (value.length >= minChars && getSuggestions) {
			fetchSuggestions(value);
		}
	}
	
	function handleBlur() {
		// Delay para permitir clique nas sugestões
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}
	
	function clearSearch() {
		value = '';
		suggestions = [];
		showDropdown = false;
		searchInput?.focus();
	}
	
	// Cleanup
	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
		};
	});
</script>

<div class="search-box {className}">
	<form class="search-form" onsubmit={handleSearch}>
		<div class="search-input-wrapper">
			<input
				bind:this={searchInput}
				type="search"
				class="search-input"
				{placeholder}
				{value}
				oninput={handleInput}
				onkeydown={handleKeyDown}
				onfocus={handleFocus}
				onblur={handleBlur}
				autocomplete="off"
				aria-label="Campo de busca"
				aria-autocomplete="list"
				aria-controls="search-suggestions"
				aria-expanded={canShowSuggestions}
			/>
			
			{#if hasValue}
				<button
					type="button"
					class="clear-button"
					onclick={clearSearch}
					aria-label="Limpar busca"
				>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			{/if}
			
			<button
				type="submit"
				class="search-button"
				aria-label="Buscar"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M21 21L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		</div>
		
		{#if canShowSuggestions}
			<div 
				id="search-suggestions"
				class="search-suggestions"
				role="listbox"
			>
				{#if isLoading}
					<div class="suggestion-item suggestion-loading">
						<span class="loading-spinner"></span>
						Buscando...
					</div>
				{:else if suggestions.length > 0}
					{#each suggestions as suggestion, index}
						<button
							type="button"
							class="suggestion-item"
							class:suggestion-item--selected={index === selectedIndex}
							onclick={() => handleSuggestionClick(suggestion)}
							role="option"
							aria-selected={index === selectedIndex}
						>
							{#if suggestion.icon}
								<span class="suggestion-icon">{suggestion.icon}</span>
							{:else if suggestion.type === 'category'}
								<svg class="suggestion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M2 4.5C2 3.67157 2.67157 3 3.5 3H6.5C7.32843 3 8 3.67157 8 4.5V7.5C8 8.32843 7.32843 9 6.5 9H3.5C2.67157 9 2 8.32843 2 7.5V4.5Z" stroke="currentColor" stroke-width="1.5"/>
									<path d="M8 8.5C8 7.67157 8.67157 7 9.5 7H12.5C13.3284 7 14 7.67157 14 8.5V11.5C14 12.3284 13.3284 13 12.5 13H9.5C8.67157 13 8 12.3284 8 11.5V8.5Z" stroke="currentColor" stroke-width="1.5"/>
								</svg>
							{:else if suggestion.type === 'brand'}
								<svg class="suggestion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M8 2L10.5 7H14L11 9.5L12.5 14L8 11L3.5 14L5 9.5L2 7H5.5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
								</svg>
							{:else}
								<svg class="suggestion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
									<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
									<path d="M14 14L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
								</svg>
							{/if}
							
							<span class="suggestion-text">{suggestion.text}</span>
							
							{#if suggestion.type !== 'query'}
								<span class="suggestion-type">em {suggestion.type === 'product' ? 'Produtos' : suggestion.type === 'category' ? 'Categorias' : 'Marcas'}</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	</form>
</div>

<style>
	.search-box {
		position: relative;
		width: 100%;
		max-width: 600px;
	}
	
	.search-form {
		position: relative;
	}
	
	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		background: white;
		border: 2px solid #E5E7EB;
		border-radius: 12px;
		overflow: hidden;
		transition: all 0.2s ease;
	}
	
	.search-input-wrapper:focus-within {
		border-color: var(--primary-color, #00BFB3);
		box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.1);
	}
	
	.search-input {
		flex: 1;
		padding: 12px 16px;
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 16px;
		color: #1F2937;
		background: transparent;
		border: none;
		outline: none;
	}
	
	.search-input::placeholder {
		color: #9CA3AF;
	}
	
	.search-input::-webkit-search-cancel-button {
		display: none;
	}
	
	.clear-button,
	.search-button {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		color: #6B7280;
	}
	
	.clear-button:hover,
	.search-button:hover {
		color: var(--primary-color, #00BFB3);
	}
	
	.search-button {
		padding: 8px 16px;
		margin-right: 4px;
	}
	
	/* Suggestions Dropdown */
	.search-suggestions {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #E5E7EB;
		border-radius: 12px;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		max-height: 400px;
		overflow-y: auto;
		z-index: 50;
	}
	
	.suggestion-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 12px 16px;
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 15px;
		color: #374151;
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.suggestion-item:hover,
	.suggestion-item--selected {
		background: #F9FAFB;
		color: var(--primary-color, #00BFB3);
	}
	
	.suggestion-item:not(:last-child) {
		border-bottom: 1px solid #F3F4F6;
	}
	
	.suggestion-icon {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		color: currentColor;
		opacity: 0.6;
	}
	
	.suggestion-text {
		flex: 1;
		font-weight: 500;
	}
	
	.suggestion-type {
		font-size: 13px;
		color: #9CA3AF;
		font-weight: 400;
	}
	
	.suggestion-loading {
		justify-content: center;
		color: #6B7280;
		pointer-events: none;
	}
	
	.loading-spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid #E5E7EB;
		border-top-color: var(--primary-color, #00BFB3);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	/* Mobile adjustments */
	@media (max-width: 640px) {
		.search-input {
			font-size: 16px; /* Previne zoom no iOS */
		}
		
		.search-suggestions {
			position: fixed;
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			max-height: 60vh;
			border-radius: 24px 24px 0 0;
			box-shadow: 0 -20px 25px -5px rgba(0, 0, 0, 0.1), 0 -10px 10px -5px rgba(0, 0, 0, 0.04);
		}
	}
</style> 