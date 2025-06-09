<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import type { Snippet } from 'svelte';
	
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		icon?: string;
		onclick?: () => void;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children?: Snippet;
	}
	
	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		icon,
		onclick,
		type = 'button',
		class: className = '',
		children
	}: Props = $props();
	
	// Classes para variantes
	const variants = {
		primary: 'bg-[#00BFB3] text-white hover:bg-[#00A69C] focus:ring-[#00BFB3]',
		secondary: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500 border border-gray-300',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
	};
	
	// Classes para tamanhos
	const sizes = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};
	
	const classes = cn(
		'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
		variants[variant],
		sizes[size],
		disabled && 'opacity-50 cursor-not-allowed',
		className
	);
</script>

<button
	{type}
	{disabled}
	class={classes}
	{onclick}
>
	{#if loading}
		<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
	{:else}
		{#if icon}
			<ModernIcon name={icon} size="sm" class={children ? 'mr-2' : ''} />
		{/if}
		
		{#if children}
			{@render children()}
		{/if}
	{/if}
</button> 