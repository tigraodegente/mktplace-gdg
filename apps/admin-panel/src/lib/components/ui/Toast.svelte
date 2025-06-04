<script lang="ts">
	import { toast, type Toast } from '$lib/stores/toast';
	import { cn } from '$lib/utils/cn';
	import { fade, fly } from 'svelte/transition';
	
	const typeConfig = {
		success: {
			icon: '✅',
			bgColor: 'bg-green-50',
			borderColor: 'border-green-200',
			iconColor: 'text-green-600',
			titleColor: 'text-green-800',
			messageColor: 'text-green-700'
		},
		error: {
			icon: '❌',
			bgColor: 'bg-red-50',
			borderColor: 'border-red-200',
			iconColor: 'text-red-600',
			titleColor: 'text-red-800',
			messageColor: 'text-red-700'
		},
		warning: {
			icon: '⚠️',
			bgColor: 'bg-amber-50',
			borderColor: 'border-amber-200',
			iconColor: 'text-amber-600',
			titleColor: 'text-amber-800',
			messageColor: 'text-amber-700'
		},
		info: {
			icon: 'ℹ️',
			bgColor: 'bg-blue-50',
			borderColor: 'border-blue-200',
			iconColor: 'text-blue-600',
			titleColor: 'text-blue-800',
			messageColor: 'text-blue-700'
		}
	};
</script>

<div class="fixed top-4 right-4 z-50 space-y-4 pointer-events-none">
	{#each $toast as item (item.id)}
		{@const config = typeConfig[item.type]}
		<div
			transition:fly={{ x: 100, duration: 300 }}
			class={cn(
				"pointer-events-auto max-w-sm w-full shadow-lg rounded-lg p-4 border",
				config.bgColor,
				config.borderColor
			)}
		>
			<div class="flex items-start gap-3">
				<div class={cn("flex-shrink-0 text-lg", config.iconColor)}>
					{config.icon}
				</div>
				
				<div class="flex-1">
					<h3 class={cn("font-medium", config.titleColor)}>
						{item.title}
					</h3>
					{#if item.message}
						<p class={cn("mt-1 text-sm", config.messageColor)}>
							{item.message}
						</p>
					{/if}
				</div>
				
				<button
					onclick={() => toast.remove(item.id)}
					class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
				>
					🗑️
				</button>
			</div>
		</div>
	{/each}
</div> 