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
	let lastValue: number = -1;
	let lastPrefix: string = '';
	
	onMount(() => {
		mounted = true;
		// Criar elemento fora do Svelte
		const span = document.createElement('span');
		span.className = className;
		const formattedValue = prefix + formatCurrency(value);
		span.textContent = formattedValue;
		container.appendChild(span);
		
		// Armazenar valores iniciais
		lastValue = value;
		lastPrefix = prefix;
		
		return () => {
			if (container && container.firstChild) {
				container.removeChild(container.firstChild);
			}
		};
	});
	
	// Atualizar valor quando mudar
	$effect(() => {
		if (mounted && container && container.firstChild && 
			(lastValue !== value || lastPrefix !== prefix)) {
			const formattedValue = prefix + formatCurrency(value);
			container.firstChild.textContent = formattedValue;
			lastValue = value;
			lastPrefix = prefix;
		}
	});
</script>

<div bind:this={container} style="display: contents;"></div> 