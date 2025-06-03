<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { theme } from '$lib/config/theme';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	interface Props {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
		size?: 'sm' | 'md' | 'lg';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		icon?: string;
		iconPosition?: 'left' | 'right';
		class?: string;
		onclick?: (e: MouseEvent) => void;
		[key: string]: any;
	}
	
	let { 
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		icon = '',
		iconPosition = 'left',
		class: className = '',
		children,
		...restProps
	} = $props<Props>();
	
	// Usar variantes do tema centralizado
	const variants = theme.buttons;
	
	const sizes = {
		sm: "px-3 py-1.5 text-sm",
		md: "px-4 py-2 text-base",
		lg: "px-6 py-3 text-lg"
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	class={cn(
		"inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200",
		"focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-2",
		"disabled:opacity-50 disabled:cursor-not-allowed",
		variants[variant],
		sizes[size],
		className
	)}
	{...restProps}
>
	{#if loading}
		<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
	{:else if icon && iconPosition === 'left'}
		<ModernIcon name={icon} size={16} />
	{/if}
	
	{#if children}
		{@render children()}
	{/if}
	
	{#if icon && iconPosition === 'right' && !loading}
		<ModernIcon name={icon} size={16} />
	{/if}
</button> 