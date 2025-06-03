<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	import TreeItem from './TreeItem.svelte';
	
	interface Item {
		id: string;
		name: string;
		parent_id?: string | null;
		children?: Item[];
		level?: number;
	}
	
	interface Props {
		items?: Item[];
		selected?: string[];
		onSelectionChange?: (selected: string[]) => void;
		placeholder?: string;
		label?: string;
		hierarchical?: boolean;
		allowMultiple?: boolean;
		primarySelection?: string | null;
		onPrimaryChange?: (id: string | null) => void;
	}
	
	let {
		items = [],
		selected = [],
		onSelectionChange = () => {},
		placeholder = 'Selecione...',
		label = '',
		hierarchical = true,
		allowMultiple = true,
		primarySelection = null,
		onPrimaryChange = () => {}
	}: Props = $props();
	
	let showDropdown = $state(false);
	let searchTerm = $state('');
	let expandedCategories = $state<Set<string>>(new Set());
	
	// Construir árvore hierárquica
	function buildTree(items: Item[]): Item[] {
		const map = new Map<string, Item>();
		const roots: Item[] = [];
		
		// Primeiro, criar um mapa de todos os itens
		items.forEach(item => {
			map.set(item.id, { ...item, children: [], level: 0 });
		});
		
		// Construir a árvore
		items.forEach(item => {
			const node = map.get(item.id)!;
			if (!item.parent_id) {
				roots.push(node);
			} else {
				const parent = map.get(item.parent_id);
				if (parent) {
					parent.children!.push(node);
					node.level = (parent.level || 0) + 1;
				} else {
					roots.push(node); // Se pai não encontrado, tratar como raiz
				}
			}
		});
		
		return roots;
	}
	
	let tree = $derived(hierarchical ? buildTree(items) : items.map(i => ({ ...i, level: 0 })));
	let filteredTree = $derived(filterTree(tree, searchTerm));
	
	// Filtrar árvore baseado no termo de busca
	function filterTree(nodes: Item[], term: string): Item[] {
		if (!term) return nodes;
		
		const filtered: Item[] = [];
		nodes.forEach(node => {
			const matches = node.name.toLowerCase().includes(term.toLowerCase());
			const childrenFiltered = node.children ? filterTree(node.children, term) : [];
			
			if (matches || childrenFiltered.length > 0) {
				filtered.push({
					...node,
					children: childrenFiltered
				});
			}
		});
		
		return filtered;
	}
	
	// Toggle seleção
	function toggleSelection(id: string) {
		if (allowMultiple) {
			if (selected.includes(id)) {
				onSelectionChange(selected.filter(s => s !== id));
			} else {
				onSelectionChange([...selected, id]);
			}
		} else {
			onSelectionChange([id]);
			showDropdown = false;
		}
	}
	
	// Definir como primário
	function setPrimary(id: string, e: Event) {
		e.stopPropagation();
		if (onPrimaryChange) {
			onPrimaryChange(id === primarySelection ? null : id);
		}
	}
	
	// Toggle expansão de categoria
	function toggleExpand(id: string, e: Event) {
		e.stopPropagation();
		const newExpanded = new Set(expandedCategories);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		expandedCategories = newExpanded;
	}
	
	// Obter nome do item por ID
	function getItemName(id: string): string {
		const findItem = (nodes: Item[]): string | null => {
			for (const node of nodes) {
				if (node.id === id) return node.name;
				if (node.children) {
					const found = findItem(node.children);
					if (found) return found;
				}
			}
			return null;
		};
		return findItem(tree) || 'Desconhecido';
	}
</script>

<div class="relative">
	{#if label}
		<label class="block text-sm font-medium text-gray-700 mb-2">
			{label}
		</label>
	{/if}
	
	<!-- Trigger -->
	<button
		type="button"
		onclick={() => showDropdown = !showDropdown}
		class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00BFB3]"
	>
		<span class="flex-1 truncate">
			{#if selected.length === 0}
				<span class="text-gray-500">{placeholder}</span>
			{:else if selected.length === 1}
				{getItemName(selected[0])}
				{#if primarySelection === selected[0]}
					<span class="text-xs text-[#00BFB3] ml-1">(Principal)</span>
				{/if}
			{:else}
				{selected.length} selecionados
				{#if primarySelection}
					<span class="text-xs text-[#00BFB3] ml-1">
						(Principal: {getItemName(primarySelection)})
					</span>
				{/if}
			{/if}
		</span>
		<ModernIcon name="ChevronDown" size={16} />
	</button>
	
	<!-- Dropdown -->
	{#if showDropdown}
		<div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
			<!-- Busca -->
			<div class="p-3 border-b">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Buscar..."
					class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00BFB3]"
				/>
			</div>
			
			<!-- Lista -->
			<div class="max-h-64 overflow-y-auto">
				{#if filteredTree.length === 0}
					<div class="px-4 py-3 text-sm text-gray-500 text-center">
						Nenhum item encontrado
					</div>
				{:else}
					{#each filteredTree as node}
						<TreeItem 
							{node}
							{selected}
							{primarySelection}
							{expandedCategories}
							{allowMultiple}
							onToggleSelection={toggleSelection}
							onToggleExpand={toggleExpand}
							onSetPrimary={setPrimary}
							{onPrimaryChange}
						/>
					{/each}
				{/if}
			</div>
			
			<!-- Rodapé com ações -->
			{#if allowMultiple}
				<div class="p-3 border-t bg-gray-50 flex justify-between items-center">
					<span class="text-sm text-gray-600">
						{selected.length} selecionado(s)
					</span>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => {
								onSelectionChange([]);
								if (onPrimaryChange) onPrimaryChange(null);
							}}
							class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
						>
							Limpar
						</button>
						<button
							type="button"
							onclick={() => showDropdown = false}
							class="px-3 py-1 text-sm bg-[#00BFB3] text-white rounded hover:bg-[#00A89D]"
						>
							Fechar
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Overlay para fechar dropdown -->
{#if showDropdown}
	<div 
		class="fixed inset-0 z-40" 
		onclick={() => showDropdown = false}
	></div>
{/if} 