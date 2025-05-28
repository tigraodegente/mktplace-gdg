<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	import { onMount } from 'svelte';
	
	interface Props {
		value: number;
		class?: string;
		prefix?: string;
	}
	
	let { value, class: className = '', prefix = '' }: Props = $props();
	
	let container: HTMLDivElement;
	let mounted = false;
	
	onMount(() => {
		mounted = true;
		// Criar elemento fora do Svelte
		const span = document.createElement('span');
		span.className = className;
		span.textContent = prefix + formatCurrency(value);
		container.appendChild(span);
		
		return () => {
			if (container && container.firstChild) {
				container.removeChild(container.firstChild);
			}
		};
	});
	
	// Atualizar valor quando mudar
	$effect(() => {
		if (mounted && container && container.firstChild) {
			container.firstChild.textContent = prefix + formatCurrency(value);
		}
	});
</script>

<div bind:this={container} style="display: contents;"></div> 