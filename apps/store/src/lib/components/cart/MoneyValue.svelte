<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	
	interface Props {
		value: number;
		class?: string;
	}
	
	let { value, class: className = '' }: Props = $props();
	
	let element: HTMLSpanElement;
	let rafId: number;
	
	function updateValue(newValue: number) {
		if (rafId) {
			cancelAnimationFrame(rafId);
		}
		
		rafId = requestAnimationFrame(() => {
			if (element) {
				element.textContent = formatCurrency(newValue);
			}
		});
	}
	
	$effect(() => {
		updateValue(value);
		
		return () => {
			if (rafId) {
				cancelAnimationFrame(rafId);
			}
		};
	});
</script>

<span bind:this={element} class={className}></span> 