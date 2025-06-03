<script lang="ts">
	import { onMount } from 'svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';
	
	// Props
	interface Props {
		loader: () => Promise<any>;
		placeholder?: any;
		delay?: number;
		fallback?: any;
		[key: string]: any; // Permitir props adicionais
	}
	
	let { 
		loader, 
		placeholder = LoadingSpinner,
		delay = 200,
		fallback = null,
		...componentProps
	}: Props = $props();
	
	// Estados
	let Component = $state<any>(null);
	let loading = $state(false);
	let error = $state<Error | null>(null);
	let showPlaceholder = $state(false);
	
	// Carregar componente
	onMount(async () => {
		// Timer para mostrar placeholder após delay
		const timer = setTimeout(() => {
			if (!Component) showPlaceholder = true;
		}, delay);
		
		loading = true;
		
		try {
			const module = await loader();
			Component = module.default || module;
		} catch (err) {
			error = err instanceof Error ? err : new Error('Failed to load component');
			console.error('LazyLoad error:', err);
		} finally {
			loading = false;
			clearTimeout(timer);
		}
	});
</script>

{#if error && fallback}
	<svelte:component this={fallback} {error} />
{:else if Component}
	<svelte:component this={Component} {...componentProps} />
{:else if showPlaceholder && placeholder}
	<svelte:component this={placeholder} />
{/if}

<style>
	/* Componente wrapper não precisa de estilos */
</style> 