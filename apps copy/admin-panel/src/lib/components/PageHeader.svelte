<script lang="ts">
	import { fly } from 'svelte/transition';
	
	// Props
	let {
		title,
		description,
		breadcrumbs = [],
		actions,
		children
	} = $props<{
		title: string;
		description?: string;
		breadcrumbs?: Array<{ label: string; href?: string }>;
		actions?: any;
		children?: any;
	}>();
</script>

<div class="space-y-6" in:fly={{ y: -20, duration: 500, delay: 100 }}>
	<!-- Breadcrumbs -->
	{#if breadcrumbs.length > 0}
		<nav class="flex" aria-label="Breadcrumb">
			<ol class="flex items-center space-x-2 text-sm">
				{#each breadcrumbs as crumb, i}
					<li class="flex items-center">
						{#if i > 0}
							<svg class="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
							</svg>
						{/if}
						{#if crumb.href}
							<a href={crumb.href} class="text-gray-500 hover:text-cyan-600 transition-colors">
								{crumb.label}
							</a>
						{:else}
							<span class="text-gray-900 font-medium">{crumb.label}</span>
						{/if}
					</li>
				{/each}
			</ol>
		</nav>
	{/if}
	
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">{title}</h1>
			{#if description}
				<p class="text-gray-600 mt-1">{description}</p>
			{/if}
		</div>
		
		{#if actions}
			<div class="flex items-center gap-3">
				{@render actions()}
			</div>
		{/if}
	</div>
	
	{#if children}
		{@render children()}
	{/if}
</div> 