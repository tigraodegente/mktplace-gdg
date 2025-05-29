<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	import { untrack } from 'svelte';
	
	interface Props {
		value: number;
		class?: string;
	}
	
	let { value, class: className = '' }: Props = $props();
	
	let element: HTMLSpanElement;
	let rafId: number;
	let lastValue: number = -1;
	
	function updateValue(newValue: number) {
		if (rafId) {
			cancelAnimationFrame(rafId);
		}
		
		rafId = requestAnimationFrame(() => {
			if (element && lastValue !== newValue) {
				element.textContent = formatCurrency(newValue);
				lastValue = newValue;
			}
		});
	}
	
	$effect(() => {
		// Usar untrack para evitar loops infinitos
		untrack(() => {
			if (lastValue !== value) {
				updateValue(value);
			}
		});
		
		return () => {
			if (rafId) {
				cancelAnimationFrame(rafId);
			}
		};
	});
</script>

<span bind:this={element} class={className}></span> 