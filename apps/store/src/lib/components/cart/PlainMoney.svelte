<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	
	interface Props {
		value: number;
		prefix?: string;
	}
	
	let { value, prefix = '' }: Props = $props();
	
	// Criar o texto formatado uma única vez
	const formattedValue = prefix + formatCurrency(value);
</script>

{formattedValue} 