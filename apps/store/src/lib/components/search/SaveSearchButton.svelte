<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	
	interface SaveSearchButtonProps {
		searchQuery?: string;
		filters?: any;
		resultCount?: number;
		class?: string;
	}
	
	let {
		searchQuery = '',
		filters = {},
		resultCount = 0,
		class: className = ''
	}: SaveSearchButtonProps = $props();
	
	const dispatch = createEventDispatcher();
	
	let showModal = $state(false);
	let searchName = $state('');
	let enableNotifications = $state(true);
	let savedSearches = $state<any[]>([]);
	
	// Carregar buscas salvas
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('savedSearches');
			if (saved) {
				savedSearches = JSON.parse(saved);
			}
		}
	});
	
	// Gerar nome padrão
	$effect(() => {
		if (searchQuery) {
			searchName = `Busca: ${searchQuery}`;
		} else if (filters.categories?.length) {
			searchName = `Categoria: ${filters.categories.join(', ')}`;
		} else {
			searchName = `Busca salva em ${new Date().toLocaleDateString()}`;
		}
	});
	
	function saveSearch() {
		const newSearch = {
			id: Date.now().toString(),
			name: searchName,
			query: searchQuery,
			filters,
			resultCount,
			notifications: enableNotifications,
			createdAt: new Date().toISOString(),
			url: window.location.search
		};
		
		// Salvar no localStorage
		const updated = [newSearch, ...savedSearches].slice(0, 10); // Máximo 10 buscas
		localStorage.setItem('savedSearches', JSON.stringify(updated));
		savedSearches = updated;
		
		// Emitir evento
		dispatch('save', newSearch);
		
		// Fechar modal
		showModal = false;
		searchName = '';
		
		// Mostrar feedback de sucesso
		setTimeout(() => {
			alert('Busca salva com sucesso! Você receberá notificações quando houver atualizações.');
		}, 100);
	}
	
	function deleteSearch(id: string) {
		savedSearches = savedSearches.filter(s => s.id !== id);
		localStorage.setItem('savedSearches', JSON.stringify(savedSearches));
	}
</script>

<div class={className}>
	<button
		onclick={() => showModal = true}
		class="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
		title="Salvar esta busca"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
		</svg>
		Salvar busca
	</button>
</div>

<!-- Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button 
			class="absolute inset-0 bg-black bg-opacity-50" 
			onclick={() => showModal = false}
			aria-label="Fechar modal"
		></button>
		
		<div class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h3 class="text-lg font-semibold mb-4">Salvar busca</h3>
			
			<div class="space-y-4">
				<!-- Nome da busca -->
				<div>
					<label for="search-name" class="block text-sm font-medium text-gray-700 mb-1">
						Nome da busca
					</label>
					<input
						id="search-name"
						type="text"
						bind:value={searchName}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						placeholder="Ex: iPhone em promoção"
					/>
				</div>
				
				<!-- Notificações -->
				<label class="flex items-start gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={enableNotifications}
						class="mt-1 w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-700">
							Receber notificações
						</span>
						<p class="text-xs text-gray-500 mt-0.5">
							Avisaremos quando houver novos produtos ou mudanças de preço
						</p>
					</div>
				</label>
				
				<!-- Info -->
				<div class="bg-gray-50 rounded-lg p-3">
					<p class="text-sm text-gray-600">
						{#if searchQuery}
							Busca por: <span class="font-medium">"{searchQuery}"</span>
						{/if}
						{#if resultCount > 0}
							<br>
							<span class="text-xs">{resultCount} produtos encontrados</span>
						{/if}
					</p>
				</div>
			</div>
			
			<!-- Ações -->
			<div class="flex gap-2 mt-6">
				<button
					onclick={() => showModal = false}
					class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
				>
					Cancelar
				</button>
				<button
					onclick={saveSearch}
					disabled={!searchName.trim()}
					class="flex-1 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Salvar
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Lista de buscas salvas (para debug) -->
{#if savedSearches.length > 0 && false}
	<div class="mt-4 p-4 bg-gray-50 rounded-lg">
		<h4 class="font-medium mb-2">Buscas salvas:</h4>
		<ul class="space-y-2">
			{#each savedSearches as search}
				<li class="flex items-center justify-between p-2 bg-white rounded border">
					<span class="text-sm">{search.name}</span>
					<button
						onclick={() => deleteSearch(search.id)}
						class="text-red-500 hover:text-red-700 text-sm"
					>
						Remover
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
