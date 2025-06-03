<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	interface Item {
		id: string;
		name: string;
		parent_id?: string | null;
		children?: Item[];
		level?: number;
	}
	
	interface Props {
		node: Item;
		selected: string[];
		primarySelection: string | null;
		expandedCategories: Set<string>;
		allowMultiple: boolean;
		onToggleSelection: (id: string) => void;
		onToggleExpand: (id: string, e: Event) => void;
		onSetPrimary: (id: string, e: Event) => void;
		onPrimaryChange?: (id: string | null) => void;
	}
	
	let {
		node,
		selected,
		primarySelection,
		expandedCategories,
		allowMultiple,
		onToggleSelection,
		onToggleExpand,
		onSetPrimary,
		onPrimaryChange
	}: Props = $props();
	
	let isSelected = $derived(selected.includes(node.id));
	let isPrimary = $derived(primarySelection === node.id);
	let hasChildren = $derived(node.children && node.children.length > 0);
	let isExpanded = $derived(expandedCategories.has(node.id));
</script>

<div class="select-none">
	<div 
		class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer {isSelected ? 'bg-[#00BFB3]/10' : ''}"
		style="padding-left: {(node.level || 0) * 20 + 12}px"
	>
		{#if hasChildren}
			<button 
				type="button" 
				class="p-1 hover:bg-gray-200 rounded"
				onclick={(e) => onToggleExpand(node.id, e)}
			>
				<ModernIcon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} size={12} />
			</button>
		{:else}
			<div class="w-6"></div>
		{/if}
		
		<label class="flex-1 flex items-center gap-3 cursor-pointer">
			<input
				type={allowMultiple ? 'checkbox' : 'radio'}
				name="category-select"
				checked={isSelected}
				onchange={() => onToggleSelection(node.id)}
				class="w-4 h-4 text-[#00BFB3] rounded border-gray-300 focus:ring-[#00BFB3]"
			/>
			<span class="text-sm {isSelected ? 'font-medium' : ''}">
				{node.name}
			</span>
		</label>
		
		{#if allowMultiple && onPrimaryChange && isSelected}
			<button
				type="button"
				onclick={(e) => onSetPrimary(node.id, e)}
				class="px-2 py-1 text-xs rounded {isPrimary ? 'bg-[#00BFB3] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}"
				title={isPrimary ? 'Categoria principal' : 'Definir como principal'}
			>
				{isPrimary ? 'Principal' : 'Definir'}
			</button>
		{/if}
	</div>
	
	{#if hasChildren && isExpanded && node.children}
		<div class="ml-4">
			{#each node.children as child}
				<svelte:self 
					node={child}
					{selected}
					{primarySelection}
					{expandedCategories}
					{allowMultiple}
					{onToggleSelection}
					{onToggleExpand}
					{onSetPrimary}
					{onPrimaryChange}
				/>
			{/each}
		</div>
	{/if}
</div> 