<script lang="ts">
	import { MODERN_ICONS, MODERN_COLORS, ICON_SIZES } from '$lib/icons-modern';
	
	export let name: keyof typeof MODERN_ICONS = 'product';
	export let color: keyof typeof MODERN_COLORS | string = 'primary';
	export let size: number | keyof typeof ICON_SIZES = 'md';
	export let className: string = '';
	export let title: string = '';
	
	// Obter o ícone (pode ser string ou objeto)
	const iconData = MODERN_ICONS[name];
	let iconSvg = '';
	
	if (typeof iconData === 'string') {
		// Se for string, usar diretamente
		iconSvg = iconData;
	} else if (iconData && typeof iconData === 'object' && 'path' in iconData) {
		// Se for objeto, construir o SVG
		iconSvg = `<svg viewBox="${iconData.viewBox}" fill="none" stroke="currentColor">${iconData.path}</svg>`;
	}
	
	// Determinar classes
	let sizeClass = '';
	if (typeof size === 'string' && size in ICON_SIZES) {
		sizeClass = ICON_SIZES[size as keyof typeof ICON_SIZES];
	} else if (typeof size === 'number') {
		// Se for número, usar como width e height customizado
	}
	
	let colorClass = '';
	if (color in MODERN_COLORS) {
		colorClass = MODERN_COLORS[color as keyof typeof MODERN_COLORS];
	} else if (color.startsWith('#') || color.startsWith('rgb')) {
		// Se for cor customizada, aplicar como style
	} else {
		colorClass = color; // Assumir que é uma classe Tailwind
	}
	
	const classes = `${sizeClass} ${colorClass} ${className}`.trim();
	
	// Debug para verificar ícone
	if (!iconSvg) {
		console.warn(`Ícone não encontrado: ${name}`);
	}
</script>

{#if iconSvg}
	{#if typeof size === 'number'}
		<div 
			class={classes}
			style="width: {size}px; height: {size}px; color: {color.startsWith('#') || color.startsWith('rgb') ? color : ''}"
			{title}
		>
			{@html iconSvg}
		</div>
	{:else}
		<div 
			class={classes}
			style="color: {color.startsWith('#') || color.startsWith('rgb') ? color : ''}"
			{title}
		>
			{@html iconSvg}
		</div>
	{/if}
{:else}
	<div class="{sizeClass} {className}" title="Ícone não encontrado: {name}">
		<!-- Ícone de fallback -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
	</div>
{/if} 