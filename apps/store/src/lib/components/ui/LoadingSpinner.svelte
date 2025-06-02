<script lang="ts">
	interface Props {
		size?: 'small' | 'medium' | 'large';
		color?: string;
	}
	
	let { 
		size = 'medium',
		color = '#00BFB3'
	}: Props = $props();
	
	const sizeClasses = {
		small: 'w-4 h-4',
		medium: 'w-8 h-8',
		large: 'w-12 h-12'
	};
	
	const classes = $derived(`inline-block border-2 border-transparent border-t-current rounded-full animate-spin ${sizeClasses[size]}`);
</script>

<div 
	class={classes}
	style="color: {color}; border-top-color: {color};"
	role="status"
	aria-label="Carregando..."
>
	<span class="sr-only">Carregando...</span>
</div>

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	
	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style> 