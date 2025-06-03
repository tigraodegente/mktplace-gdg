<script lang="ts">
	import ModernIcon from './ModernIcon.svelte';
	import type { MODERN_ICONS } from '$lib/icons-modern';
	
	export let title: string;
	export let value: string | number;
	export let subtitle: string = '';
	export let icon: keyof typeof MODERN_ICONS = 'info';
	export let iconColor: string = 'primary';
	export let iconBgColor: string = 'bg-[#00BFB3]/10';
	export let trend: number | null = null;
	export let trendLabel: string = '';
	export let layout: 'horizontal' | 'vertical' = 'vertical';
	export let size: 'sm' | 'md' | 'lg' = 'md';
	
	// Classes baseadas no tamanho
	const sizeClasses = {
		sm: {
			container: 'p-4',
			title: 'text-xs',
			value: 'text-xl',
			icon: 'w-10 h-10',
			iconSize: 'md' as const
		},
		md: {
			container: 'p-6',
			title: 'text-sm',
			value: 'text-3xl',
			icon: 'w-12 h-12',
			iconSize: 'lg' as const
		},
		lg: {
			container: 'p-8',
			title: 'text-base',
			value: 'text-4xl',
			icon: 'w-14 h-14',
			iconSize: 'xl' as const
		}
	};
	
	$: classes = sizeClasses[size];
</script>

<div class="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl {classes.container}">
	{#if layout === 'vertical'}
		<div class="flex items-center justify-between">
			<div>
				<p class="{classes.title} text-slate-600 mb-1">{title}</p>
				<p class="{classes.value} font-bold text-slate-900">{value}</p>
				{#if subtitle}
					<p class="text-xs text-slate-500 mt-1">{subtitle}</p>
				{/if}
				{#if trend !== null}
					<div class="flex items-center gap-1 mt-2">
						<ModernIcon 
							name={trend > 0 ? 'sales' : 'warning'} 
							size="xs" 
							color={trend > 0 ? 'success' : 'danger'}
						/>
						<span class="text-xs {trend > 0 ? 'text-emerald-600' : 'text-red-600'}">
							{trend > 0 ? '+' : ''}{trend}%
						</span>
						{#if trendLabel}
							<span class="text-xs text-slate-500">{trendLabel}</span>
						{/if}
					</div>
				{/if}
			</div>
			<div class="{classes.icon} {iconBgColor} rounded-xl flex items-center justify-center">
				<ModernIcon name={icon} size={classes.iconSize} color={iconColor} />
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-4">
			<div class="p-3 {iconBgColor} rounded-xl">
				<ModernIcon name={icon} size={classes.iconSize} color={iconColor} />
			</div>
			<div>
				<p class="{classes.title} text-slate-600">{title}</p>
				<p class="text-2xl font-bold text-slate-900 flex items-center gap-2">
					{value}
					{#if subtitle}
						<span class="text-xs text-slate-500 font-normal">{subtitle}</span>
					{/if}
				</p>
				{#if trend !== null}
					<div class="flex items-center gap-1 mt-1">
						<ModernIcon 
							name={trend > 0 ? 'sales' : 'warning'} 
							size="xs" 
							color={trend > 0 ? 'success' : 'danger'}
						/>
						<span class="text-xs {trend > 0 ? 'text-emerald-600' : 'text-red-600'}">
							{trend > 0 ? '+' : ''}{trend}%
						</span>
						{#if trendLabel}
							<span class="text-xs text-slate-500">{trendLabel}</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div> 