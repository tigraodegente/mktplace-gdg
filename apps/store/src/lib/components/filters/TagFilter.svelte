<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface Tag {
		id: string;
		name: string;
		count?: number;
	}
	
	interface TagFilterProps {
		tags: Tag[];
		selected: string[];
		maxVisible?: number;
	}
	
	let {
		tags = [],
		selected = [],
		maxVisible = 10
	}: TagFilterProps = $props();
	
	const dispatch = createEventDispatcher();
	
	let showAll = $state(false);
	let searchQuery = $state('');
	
	// Filtrar tags baseado na busca
	let filteredTags = $derived(
		tags.filter(tag => 
			tag.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
	
	// Tags visíveis (limitadas ou todas)
	let visibleTags = $derived(
		showAll ? filteredTags : filteredTags.slice(0, maxVisible)
	);
	
	// Verificar se há mais tags para mostrar
	let hasMore = $derived(filteredTags.length > maxVisible);
	
	function toggleTag(tagId: string) {
		const newSelected = selected.includes(tagId)
			? selected.filter(id => id !== tagId)
			: [...selected, tagId];
		
		dispatch('change', { tags: newSelected });
	}
	
	function clearAll() {
		dispatch('change', { tags: [] });
	}
	
	// Cores para tags populares
	function getTagColor(tag: Tag): string {
		const colors = [
			'bg-blue-100 text-blue-700 hover:bg-blue-200',
			'bg-green-100 text-green-700 hover:bg-green-200',
			'bg-purple-100 text-purple-700 hover:bg-purple-200',
			'bg-pink-100 text-pink-700 hover:bg-pink-200',
			'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
			'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
			'bg-red-100 text-red-700 hover:bg-red-200',
			'bg-orange-100 text-orange-700 hover:bg-orange-200'
		];
		
		// Usar hash do nome para selecionar cor consistente
		const hash = tag.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
		return colors[hash % colors.length];
	}
</script>

<div class="space-y-3">
	{#if tags.length > 10}
		<!-- Campo de busca para muitas tags -->
		<div class="relative">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Buscar características..."
				class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-[#00BFB3] focus:border-[#00BFB3]"
			/>
			<svg 
				class="absolute right-3 top-2.5 w-4 h-4 text-gray-400"
				fill="none" 
				stroke="currentColor" 
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>
	{/if}
	
	{#if selected.length > 0}
		<div class="flex items-center justify-between">
			<span class="text-xs text-gray-600">{selected.length} selecionada{selected.length > 1 ? 's' : ''}</span>
			<button
				onclick={clearAll}
				class="text-xs text-[#00BFB3] hover:text-[#00A89D]"
			>
				Limpar
			</button>
		</div>
	{/if}
	
	<!-- Tags -->
	<div class="flex flex-wrap gap-2">
		{#each visibleTags as tag}
			<button
				onclick={() => toggleTag(tag.id)}
				class="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full transition-all {
					selected.includes(tag.id)
						? 'bg-[#00BFB3] text-white hover:bg-[#00A89D]'
						: getTagColor(tag)
				} {tag.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
				disabled={tag.count === 0}
			>
				<span>{tag.name}</span>
				{#if tag.count !== undefined && tag.count > 0}
					<span class="text-xs opacity-75">({tag.count})</span>
				{/if}
			</button>
		{/each}
	</div>
	
	{#if hasMore && !searchQuery}
		<button
			onclick={() => showAll = !showAll}
			class="text-sm text-[#00BFB3] hover:text-[#00A89D] flex items-center gap-1"
		>
			{showAll ? 'Mostrar menos' : `Mostrar todas (${filteredTags.length})`}
			<svg 
				class="w-4 h-4 transition-transform {showAll ? 'rotate-180' : ''}"
				fill="none" 
				stroke="currentColor" 
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	{/if}
	
	{#if searchQuery && filteredTags.length === 0}
		<p class="text-sm text-gray-500 text-center py-2">
			Nenhuma característica encontrada para "{searchQuery}"
		</p>
	{/if}
</div> 