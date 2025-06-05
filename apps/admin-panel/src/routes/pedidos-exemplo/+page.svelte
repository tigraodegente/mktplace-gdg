<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { PageConfigs } from '$lib/config/pageConfigs';
	
	// TODA a configuração vem do arquivo centralizado!
	const config = PageConfigs.pedidos;
</script>

<!-- APENAS UMA LINHA! Toda a página usando o template -->
<AdminPageTemplate {...config} /> 