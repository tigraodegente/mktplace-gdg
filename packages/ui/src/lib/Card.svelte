<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	
	interface Props extends HTMLAttributes<HTMLDivElement> {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		shadow?: 'none' | 'sm' | 'md' | 'lg';
	}
	
	let { 
		padding = 'md', 
		shadow = 'sm',
		children,
		class: className = '',
		...rest 
	}: Props = $props();
	
	const paddingClasses = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8'
	};
	
	const shadowClasses = {
		none: '',
		sm: 'shadow-sm',
		md: 'shadow-md',
		lg: 'shadow-lg'
	};
	
	const classes = $derived([
		'bg-white rounded-lg border border-gray-200',
		paddingClasses[padding],
		shadowClasses[shadow],
		className
	].filter(Boolean).join(' '));
</script>

<div 
	{...rest}
	class={classes}
>
	{@render children?.()}
</div> 