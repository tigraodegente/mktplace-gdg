<script lang="ts">
	import { SearchBox } from '@mktplace/ui';
	import type { SearchSuggestion } from '@mktplace/ui';
	import { goto } from '$app/navigation';
	import { searchService } from '$lib/services/searchService';
	
	// State
	let searchQuery = $state('');
	
	// Handlers
	async function getSuggestions(query: string): Promise<SearchSuggestion[]> {
		try {
			const results = await searchService.quickSearch(query);
			return results.map(result => ({
				id: result.id,
				text: result.text,
				type: result.type as 'product' | 'category' | 'brand' | 'query',
				url: result.type === 'product' ? `/produto/${result.id}` : 
				     result.type === 'category' ? `/categoria/${result.id}` : 
				     `/busca?q=${encodeURIComponent(result.text)}`,
				meta: result
			}));
		} catch (error) {
			console.error('Erro ao buscar sugestões:', error);
			return [];
		}
	}
	
	function handleSearch(query: string) {
		searchService.addToHistory(query);
		goto(`/busca?q=${encodeURIComponent(query)}`);
	}
	
	function handleSuggestionClick(suggestion: SearchSuggestion) {
		if (suggestion.url) {
			goto(suggestion.url);
		}
	}
</script>

<!-- Usar o SearchBox do @mktplace/ui com configurações específicas da store -->
<SearchBox
	bind:value={searchQuery}
	placeholder="Buscar produtos, categorias..."
	onSearch={handleSearch}
	onSuggestionClick={handleSuggestionClick}
	getSuggestions={getSuggestions}
	showSuggestions={true}
	minChars={2}
	debounceMs={300}
	class="w-full"
/> 