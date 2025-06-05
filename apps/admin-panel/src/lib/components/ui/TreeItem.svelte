<script lang="ts">
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	interface Item {
		id: string;
		name: string;
		parent_id?: string | null;
		children?: Item[];
		level?: number;
		[key: string]: any;
	}
	
	interface Props {
		item?: Item;
		selected?: string[];
		primarySelection?: string | null;
		expandedItems?: Set<string>;
		allowMultiple?: boolean;
		onToggleSelection?: (id: string) => void;
		onToggleExpand?: (id: string) => void;
		onSetPrimary?: (id: string) => void;
		onPrimaryChange?: ((id: string | null) => void) | undefined;
	}
	
	let {
		item = { id: '', name: '', level: 0 },
		selected = [],
		primarySelection = null,
		expandedItems = new Set<string>(),
		allowMultiple = true,
		onToggleSelection = () => {},
		onToggleExpand = () => {},
		onSetPrimary = () => {},
		onPrimaryChange = undefined
	}: Props = $props();
	
	const isExpanded = $derived(expandedItems.has(item.id));
	const isSelected = $derived(selected.includes(item.id));
	const isPrimary = $derived(primarySelection === item.id);
	const hasChildren = $derived(item.children && item.children.length > 0);
	
	function handleToggleExpand(e: Event) {
		e.stopPropagation();
		onToggleExpand(item.id);
	}
	
	function handleSetPrimary(e: Event) {
		e.stopPropagation();
		onSetPrimary(item.id);
	}
</script>

<div class="select-none">
	<div 
		class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer {isSelected ? 'bg-[#00BFB3]/10' : ''}"
		style="padding-left: {(item.level || 0) * 20 + 12}px"
	>
		{#if hasChildren}
			<button 
				type="button" 
				class="p-1 hover:bg-gray-200 rounded"
				onclick={handleToggleExpand}
			>
				<ModernIcon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} size="xs" />
			</button>
		{:else}
			<div class="w-6"></div>
		{/if}
		
		<label class="flex-1 flex items-center gap-3 cursor-pointer">
			<input
				type={allowMultiple ? 'checkbox' : 'radio'}
				name="category-select"
				checked={isSelected}
				onchange={() => onToggleSelection(item.id)}
				class="w-4 h-4 text-[#00BFB3] rounded border-gray-300 focus:ring-[#00BFB3]"
			/>
			<span class="text-sm {isSelected ? 'font-medium' : ''}">
				{item.name}
			</span>
		</label>
		
		{#if allowMultiple && onPrimaryChange && isSelected}
			<button
				type="button"
				onclick={handleSetPrimary}
				class="px-2 py-1 text-xs rounded {isPrimary ? 'bg-[#00BFB3] text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}"
				title={isPrimary ? 'Categoria principal' : 'Definir como principal'}
			>
				{isPrimary ? 'Principal' : 'Definir'}
			</button>
		{/if}
	</div>
	
	{#if hasChildren && isExpanded && item.children}
		<div class="ml-4">
			{#each item.children as child}
				<svelte:self 
					item={child}
					{selected}
					{primarySelection}
					{expandedItems}
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