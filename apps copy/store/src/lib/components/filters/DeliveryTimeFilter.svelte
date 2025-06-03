<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface DeliveryOption {
		value: string;
		label: string;
		description?: string;
		highlight?: boolean;
		count?: number;
	}
	
	interface DeliveryTimeFilterProps {
		selected?: string;
		options?: DeliveryOption[];
		loading?: boolean;
	}
	
	let {
		selected = '',
		options = [
			{ 
				value: '24h', 
				label: 'Entrega em 24h', 
				description: 'Receba amanhã',
				highlight: true
			},
			{ 
				value: '48h', 
				label: 'Até 2 dias', 
				description: 'Entrega rápida'
			},
			{ 
				value: '3days', 
				label: 'Até 3 dias úteis'
			},
			{ 
				value: '7days', 
				label: 'Até 7 dias úteis'
			},
			{ 
				value: '15days', 
				label: 'Até 15 dias'
			}
		],
		loading = false
	}: DeliveryTimeFilterProps = $props();
	
	const dispatch = createEventDispatcher<{
		change: { deliveryTime: string | undefined };
	}>();
	
	function selectDeliveryTime(value: string) {
		const newValue = selected === value ? undefined : value;
		dispatch('change', { deliveryTime: newValue });
	}
</script>

<div class="space-y-2">
	{#if loading}
		<div class="space-y-2">
			{#each Array(5) as _}
				<div class="h-10 bg-gray-50 rounded animate-pulse"></div>
			{/each}
		</div>
	{:else}
		{#each options as option}
			<button
				onclick={() => selectDeliveryTime(option.value)}
				class="w-full text-left p-3 rounded-lg border transition-all
					{selected === option.value 
						? 'border-[#00BFB3] bg-[#00BFB3]/5' 
						: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
					{option.highlight && !selected ? 'ring-2 ring-yellow-400/20' : ''}"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span class="font-medium text-gray-900">{option.label}</span>
							{#if option.highlight}
								<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
									Rápido
								</span>
							{/if}
						</div>
						{#if option.description}
							<p class="text-xs text-gray-600 mt-0.5 ml-6">{option.description}</p>
						{/if}
					</div>
					{#if option.count !== undefined}
						<span class="text-sm text-gray-500">({option.count})</span>
					{/if}
				</div>
			</button>
		{/each}
	{/if}
</div> 