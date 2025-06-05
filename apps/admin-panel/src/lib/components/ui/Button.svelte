<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { theme } from '$lib/config/theme';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	interface Props {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		loading?: boolean;
		icon?: string;
		iconPosition?: 'left' | 'right';
		class?: string;
		onclick?: () => void;
		type?: 'button' | 'submit' | 'reset';
		title?: string;
	}
	
	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		icon,
		iconPosition = 'left',
		class: className = '',
		onclick,
		type = 'button',
		title,
		children
	}: Props = $props();
	
	// Classes base para variantes
	const variantClasses = {
		primary: 'bg-[#00BFB3] text-white hover:bg-[#00A69C] focus:ring-[#00BFB3] border-transparent',
		secondary: 'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500 border-gray-300',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border-transparent',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent'
	};
	
	// Classes para tamanhos
	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};
	
	// Tamanhos de ícone baseados no tamanho do botão
	const iconSizes = {
		sm: 'sm',
		md: 'sm', 
		lg: 'md'
	} as const;
	
	const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
	
	const classes = cn(
		baseClasses,
		variantClasses[variant],
		sizeClasses[size],
		disabled && 'opacity-50 cursor-not-allowed',
		className
	);
</script>

<button
	{type}
	{disabled}
	{title}
	class={classes}
	onclick={onclick}
>
	{#if loading}
		<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
	{:else}
		{#if icon && iconPosition === 'left'}
			<ModernIcon name={icon} size={iconSizes[size]} class={children ? 'mr-2' : ''} />
		{/if}
		
		{#if children}
			{@render children()}
		{/if}
		
		{#if icon && iconPosition === 'right'}
			<ModernIcon name={icon} size={iconSizes[size]} class={children ? 'ml-2' : ''} />
		{/if}
	{/if}
</button> 