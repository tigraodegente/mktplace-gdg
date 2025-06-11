<script lang="ts">
	import FormPageTemplate from '$lib/components/ui/FormPageTemplate.svelte';
	import { FormConfigs } from '$lib/config/formConfigs';
	
	const config = FormConfigs.produtos;
</script>

<!-- Página de criação de produtos migrada para FormPageTemplate -->
<FormPageTemplate 
	{config} 
	isEdit={false} 
/>

<style>
	:global(.btn) {
		@apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
	}
	
	:global(.btn-primary) {
		@apply bg-[#00BFB3] text-white hover:bg-[#00A89D];
	}
	
	:global(.btn-secondary) {
		@apply bg-gray-200 text-gray-700 hover:bg-gray-300;
	}
	
	:global(.spinner) {
		@apply border-4 border-gray-200 border-t-[#00BFB3] rounded-full animate-spin;
	}
</style> 