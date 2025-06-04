<script lang="ts">
	let { 
		title = '', 
		subtitle = '', 
		icon = '',
		variant = 'primary' as 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary',
		columns = 2 as 1 | 2 | 3 | 4 | 6,
		gap = 6,
		padding = 6,
		rounded = 'lg',
		borderStyle = 'solid',
		showHeader = true,
		showBorder = true,
		maxWidth = 'full' as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full',
		centerContent = false,
		customClass = '',
		fullWidth = false,
		containerClass = '',
		contentClass = ''
	} = $props();

	// Variações de cores baseadas no verde principal #00BFB3
	const variants = {
		primary: 'bg-gradient-to-r from-[#00BFB3]/10 to-[#00BFB3]/5 border-[#00BFB3]/20',
		secondary: 'bg-gradient-to-r from-[#00BFB3]/8 to-[#00BFB3]/12 border-[#00BFB3]/25',
		tertiary: 'bg-gradient-to-r from-[#00BFB3]/6 to-[#00BFB3]/10 border-[#00BFB3]/20',
		quaternary: 'bg-gradient-to-r from-[#00BFB3]/4 to-[#00BFB3]/8 border-[#00BFB3]/15',
		quinary: 'bg-gradient-to-r from-[#00BFB3]/3 to-[#00BFB3]/6 border-[#00BFB3]/10'
	};

	// Classes computadas
	const containerClasses = $derived(`
		${fullWidth ? 'w-full' : 'max-w-full'}
		${rounded ? 'rounded-xl' : ''}
		${showBorder ? `border ${variants[variant]}` : variants[variant].split(' ').slice(0, -1).join(' ')}
		${containerClass}
	`.trim().replace(/\s+/g, ' '));

	const gridClasses = $derived(`
		grid gap-${gap}
		${columns === 1 ? 'grid-cols-1' : ''}
		${columns === 2 ? 'grid-cols-1 md:grid-cols-2' : ''}
		${columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}
		${columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : ''}
		${columns === 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : ''}
		${contentClass}
	`.trim().replace(/\s+/g, ' '));

	const paddingClass = $derived(`p-${padding}`);
</script>

<div class={containerClasses}>
	{#if showHeader && (title || subtitle || icon)}
		<div class={`mb-${Math.max(4, padding - 2)} ${paddingClass}`}>
			<h4 class="font-semibold text-slate-900 flex items-center gap-2">
				{#if icon}
					<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon} />
					</svg>
				{/if}
				{title}
			</h4>
			{#if subtitle}
				<p class="text-slate-600 text-sm mt-1">{subtitle}</p>
			{/if}
		</div>
	{/if}

	<div class={`${paddingClass} ${showHeader && (title || subtitle || icon) ? '' : 'pt-0'}`}>
		<div class={gridClasses}>
			<slot />
		</div>
	</div>
</div> 