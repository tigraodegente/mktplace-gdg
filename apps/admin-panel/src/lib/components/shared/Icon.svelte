<script lang="ts">
	import { EMOJIS, SVGS, ICON_COLORS, type keyof } from '$lib/icons';
	
	export let name: keyof typeof SVGS | null = null;
	export let emoji: keyof typeof EMOJIS | null = null;
	export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
	export let color: keyof typeof ICON_COLORS | string = 'primary';
	export let className: string = '';

	// Tamanhos dos ícones
	const sizes = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5', 
		lg: 'w-6 h-6',
		xl: 'w-8 h-8'
	};

	// Determinar a classe de cor
	$: colorClass = ICON_COLORS[color as keyof typeof ICON_COLORS] || color;
	
	// Classe final do SVG
	$: svgClass = `${sizes[size]} ${colorClass} ${className}`;
</script>

<!-- Emoji -->
{#if emoji}
	<span class="inline-block {className}" style="font-size: {size === 'sm' ? '1rem' : size === 'lg' ? '1.5rem' : size === 'xl' ? '2rem' : '1.25rem'}">
		{EMOJIS[emoji]}
	</span>
<!-- SVG Icon -->
{:else if name}
	<svg class={svgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
		{@html SVGS[name]}
	</svg>
{/if} 