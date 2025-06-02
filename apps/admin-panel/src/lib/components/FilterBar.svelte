<script lang="ts">
	import { fly } from 'svelte/transition';
	import Icon from '../Icon.svelte';
	
	// Props
	let {
		searchValue = '',
		searchPlaceholder = 'Buscar...',
		filters = [],
		showSearch = true,
		onSearch = () => {},
		children
	} = $props<{
		searchValue?: string;
		searchPlaceholder?: string;
		filters?: Array<{
			label: string;
			value: string;
			options: Array<{ label: string; value: string }>;
			onChange?: (value: string) => void;
		}>;
		showSearch?: boolean;
		onSearch?: (value: string) => void;
		children?: any;
	}>();
</script>

<div class="px-6 py-4 bg-gray-50/50 border-b border-gray-100" in:fly={{ y: -10, duration: 300 }}>
	<div class="flex flex-col md:flex-row gap-4">
		{#if showSearch}
			<div class="flex-1">
				<div class="relative">
					<Icon 
						name="search" 
						size={20} 
						class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
					/>
					<input 
						type="text" 
						bind:value={searchValue}
						oninput={(e) => onSearch(e.currentTarget.value)}
						placeholder={searchPlaceholder}
						class="input pl-10"
					/>
				</div>
			</div>
		{/if}
		
		{#if filters.length > 0}
			<div class="flex gap-3">
				{#each filters as filter}
					<select 
						value={filter.value}
						onchange={(e) => filter.onChange?.(e.currentTarget.value)}
						class="input min-w-[150px]"
					>
						<option value="">{filter.label}</option>
						{#each filter.options as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				{/each}
			</div>
		{/if}
		
		{#if children}
			{@render children()}
		{/if}
	</div>
</div> 