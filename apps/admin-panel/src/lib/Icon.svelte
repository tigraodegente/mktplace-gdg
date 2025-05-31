<script lang="ts">
	export let name: string;
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let fallbackColor: string = 'text-gray-600';
	
	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-6 h-6'
	};
	
	const icons: Record<string, string> = {
		dashboard: '📊',
		products: '��',
		orders: '��',
		gift: '🎁',
		users: '��',
		reports: '📈',
		settings: '⚙️',
		pages: '📄',
		switch: '🔄',
		logout: '🚪'
	};
	
	$: iconEmoji = icons[name] || '❓';
</script>

{#if icons[name]}
	<span class="inline-block {sizeClasses[size]} text-center">
		{iconEmoji}
	</span>
{:else}
	<!-- Fallback SVG icon -->
	<svg class="{sizeClasses[size]} {fallbackColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
	</svg>
{/if} 