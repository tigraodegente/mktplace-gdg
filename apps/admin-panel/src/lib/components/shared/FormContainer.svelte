<script lang="ts">
	export let title: string = '';
	export let subtitle: string = '';
	export let icon: string = '';
	export let variant: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary' = 'primary';
	export let columns: 1 | 2 | 3 | 4 | 6 = 2;
	export let gap: number = 6;
	export let padding: number = 6;
	export let rounded: boolean = true;
	export let shadow: boolean = false;
	export let border: boolean = true;
	export let fullWidth: boolean = false;
	export let containerClass: string = '';
	export let contentClass: string = '';

	// Variações de cores baseadas no verde principal #00BFB3
	const variants = {
		primary: 'bg-gradient-to-r from-[#00BFB3]/10 to-[#00BFB3]/5 border-[#00BFB3]/20',
		secondary: 'bg-gradient-to-r from-[#00BFB3]/8 to-[#00BFB3]/12 border-[#00BFB3]/25',
		tertiary: 'bg-gradient-to-r from-[#00BFB3]/6 to-[#00BFB3]/10 border-[#00BFB3]/20',
		quaternary: 'bg-gradient-to-r from-[#00BFB3]/4 to-[#00BFB3]/8 border-[#00BFB3]/15',
		quinary: 'bg-gradient-to-r from-[#00BFB3]/3 to-[#00BFB3]/6 border-[#00BFB3]/10'
	};

	// Classes computadas
	$: containerClasses = `
		${fullWidth ? 'w-full' : 'max-w-full'}
		${rounded ? 'rounded-xl' : ''}
		${shadow ? 'shadow-lg' : ''}
		${border ? `border ${variants[variant]}` : variants[variant].split(' ').slice(0, -1).join(' ')}
		${containerClass}
	`.trim().replace(/\s+/g, ' ');

	$: gridClasses = `
		grid gap-${gap}
		${columns === 1 ? 'grid-cols-1' : ''}
		${columns === 2 ? 'grid-cols-1 md:grid-cols-2' : ''}
		${columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}
		${columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : ''}
		${columns === 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : ''}
		${contentClass}
	`.trim().replace(/\s+/g, ' ');

	$: paddingClass = `p-${padding}`;
</script>

<div class={containerClasses}>
	{#if title || subtitle || icon}
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

	<div class={`${paddingClass} ${title || subtitle || icon ? '' : 'pt-0'}`}>
		<div class={gridClasses}>
			<slot />
		</div>
	</div>
</div> 