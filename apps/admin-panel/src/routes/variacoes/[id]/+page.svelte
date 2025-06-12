<script lang="ts">
	import { page } from '$app/stores';
	import FormPageTemplate from '$lib/components/ui/FormPageTemplate.svelte';
	import { FormConfigs } from '$lib/config/formConfigs';
	
	const config = FormConfigs.variacoes;
	const entityId = $page.params.id;
</script>

<!-- Página de edição de variações migrada para FormPageTemplate -->
<FormPageTemplate 
	{config} 
	{entityId} 
	isEdit={true} 
/> 