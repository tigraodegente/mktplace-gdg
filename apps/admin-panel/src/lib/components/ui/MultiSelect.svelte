<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	import TreeItem from './TreeItem.svelte';
	
	interface Item {
		id: string;
		name: string;
		parent_id?: string | null;
		children?: Item[];
		level?: number;
		[key: string]: any;
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
		searchable?: boolean;
		maxHeight?: string;
		class?: string;
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
		onPrimaryChange = () => {},
		searchable = true,
		maxHeight = '300px',
		class: className = ''
	}: Props = $props();
	
	let isOpen = $state(false);
	let searchQuery = $state('');
	let dropdownRef = $state<HTMLDivElement>();
	
	// Computed values using $derived
	const selectedItems = $derived(
		items.filter(item => selected.includes(item.id))
	);
	
	const rootItems = $derived(
		hierarchical 
			? items.filter(item => !item.parent_id || item.parent_id === null)
			: items
	);
	
	const filteredItems = $derived(
		searchQuery
			? items.filter(item => 
					item.name.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: rootItems
	);
	
	let expandedItems = $state(new Set<string>());
	
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
	let filteredTree = $derived(filterTree(tree, searchQuery));
	
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
	
	function toggleExpanded(id: string) {
		const newExpanded = new Set(expandedItems);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		expandedItems = newExpanded;
	}
	
	function handleItemToggle(id: string) {
		if (allowMultiple) {
			const newSelected = selected.includes(id)
				? selected.filter(s => s !== id)
				: [...selected, id];
			onSelectionChange(newSelected);
		} else {
			const newSelected = selected.includes(id) ? [] : [id];
			onSelectionChange(newSelected);
			if (newSelected.length === 0 && onPrimaryChange) {
				onPrimaryChange(null);
			}
		}
	}
	
	function handlePrimarySet(id: string) {
		if (!selected.includes(id)) {
			onSelectionChange([...selected, id]);
		}
		if (onPrimaryChange) {
			onPrimaryChange(id);
		}
	}
	
	function removeItem(id: string) {
		const newSelected = selected.filter(s => s !== id);
		onSelectionChange(newSelected);
		
		if (primarySelection === id && onPrimaryChange) {
			onPrimaryChange(newSelected[0] || null);
		}
	}
	
	// Obter nome do item por ID
	function getItemName(id: string): string {
		const item = items.find(i => i.id === id);
		return item?.name || 'Desconhecido';
	}
	
	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}
	
	// Setup global click handler
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
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
		onclick={() => isOpen = !isOpen}
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
	{#if isOpen}
		<div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
			<!-- Busca -->
			<div class="p-3 border-b">
				<input
					type="text"
					bind:value={searchQuery}
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
							item={node}
							{selected}
							{primarySelection}
							{expandedItems}
							{allowMultiple}
							onToggleSelection={handleItemToggle}
							onToggleExpand={toggleExpanded}
							onSetPrimary={handlePrimarySet}
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
							onclick={() => isOpen = false}
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
{#if isOpen}
	<div 
		class="fixed inset-0 z-40" 
		onclick={() => isOpen = false}
	></div>
{/if} 