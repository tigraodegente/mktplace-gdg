<script lang="ts">
	import UniversalFormPageTemplate from '$lib/components/universal/UniversalFormPageTemplate.svelte';
	import { FormConfigs } from '$lib/config/formConfigs';
	
	const config = FormConfigs.banners;
</script>

<!-- Página de criação de banners usando sistema universal -->
<UniversalFormPageTemplate 
	{config} 
	isEdit={false} 
/> 