<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface ConditionOption {
		value: 'new' | 'used' | 'refurbished';
		label: string;
		description?: string;
		icon?: string;
		count?: number;
	}
	
	interface ConditionFilterProps {
		selected?: string[];
		options?: ConditionOption[];
		loading?: boolean;
	}
	
	let {
		selected = [],
		options = [
			{ 
				value: 'new', 
				label: 'Novo', 
				description: 'Produto sem uso',
				icon: '✨'
			},
			{ 
				value: 'used', 
				label: 'Usado', 
				description: 'Produto com uso anterior',
				icon: '📦'
			},
			{ 
				value: 'refurbished', 
				label: 'Recondicionado', 
				description: 'Restaurado e testado',
				icon: '🔧'
			}
		],
		loading = false
	}: ConditionFilterProps = $props();
	
	const dispatch = createEventDispatcher<{
		change: { conditions: string[] };
	}>();
	
	function toggleCondition(value: string) {
		const newSelected = selected.includes(value)
			? selected.filter(v => v !== value)
			: [...selected, value];
		
		dispatch('change', { conditions: newSelected });
	}
</script>

<div class="space-y-2">
	{#if loading}
		<div class="space-y-2">
			{#each Array(3) as _}
				<div class="h-12 bg-gray-50 rounded animate-pulse"></div>
			{/each}
		</div>
	{:else}
		{#each options as option}
			<label 
				class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
					{selected.includes(option.value) 
						? 'border-[#00BFB3] bg-[#00BFB3]/5' 
						: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
			>
				<input
					type="checkbox"
					checked={selected.includes(option.value)}
					onchange={() => toggleCondition(option.value)}
					class="mt-0.5 w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
				/>
				
				<div class="flex-1">
					<div class="flex items-center gap-2">
						{#if option.icon}
							<span class="text-lg">{option.icon}</span>
						{/if}
						<span class="font-medium text-gray-900">{option.label}</span>
						{#if option.count !== undefined}
							<span class="text-xs text-gray-500">({option.count})</span>
						{/if}
					</div>
					{#if option.description}
						<p class="text-xs text-gray-600 mt-0.5">{option.description}</p>
					{/if}
				</div>
			</label>
		{/each}
	{/if}
</div> 