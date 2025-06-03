<script lang="ts">
	import { fly, scale, fade } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	
	// Props
	let {
		title,
		value,
		change,
		changeType = 'increase' as 'increase' | 'decrease' | 'neutral',
		icon,
		iconBg = 'from-cyan-500 to-cyan-600',
		delay = 0,
		href = '',
		subtitle = ''
	} = $props<{
		title: string;
		value: string | number;
		change?: number | string;
		changeType?: 'increase' | 'decrease' | 'neutral';
		icon?: string;
		iconBg?: string;
		delay?: number;
		href?: string;
		subtitle?: string;
	}>();
	
	// Classes para mudanças
	const changeClasses: Record<string, string> = {
		increase: 'text-green-600',
		decrease: 'text-red-600',
		neutral: 'text-gray-600'
	};
	
	const changeIcons: Record<string, string> = {
		increase: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
		decrease: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6',
		neutral: 'M5 12h14'
	};
</script>

<div 
	class="stat-card group"
	in:fly={{ y: 30, duration: 500, delay, easing: backOut }}
>
	<div class="relative z-10">
		<div class="flex items-center justify-between mb-4">
			<div>
				<p class="text-sm font-medium text-gray-600">{title}</p>
				<p class="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:scale-105">
					{value}
				</p>
				{#if subtitle}
					<p class="text-xs text-gray-500 mt-1">{subtitle}</p>
				{/if}
			</div>
			{#if icon}
				<div class="w-12 h-12 bg-gradient-to-br {iconBg} rounded-lg flex items-center justify-center transition-transform duration-300 hover:scale-110 shadow-lg">
					<span class="text-2xl text-white">{icon}</span>
				</div>
			{/if}
		</div>
		
		{#if change !== undefined}
			<div class="flex items-center gap-1" in:fade={{ duration: 300, delay: delay + 200 }}>
				<svg class="w-4 h-4 {changeClasses[changeType]}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={changeIcons[changeType]} />
				</svg>
				<span class="text-sm font-semibold {changeClasses[changeType]}">
					{typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : change}
				</span>
			</div>
		{/if}
		
		{#if href}
			<a 
				{href}
				class="absolute inset-0 z-20"
				aria-label="Ver detalhes de {title}"
			></a>
		{/if}
	</div>
	
	<!-- Background decoration -->
	<div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br {iconBg} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500"></div>
</div> 