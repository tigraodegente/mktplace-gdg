<script lang="ts">
  import { page } from '$app/stores';
  import UniversalFormPageTemplate from '$lib/components/universal/UniversalFormPageTemplate.svelte';
  import { FormConfigs } from '$lib/config/formConfigs';
  
  const config = FormConfigs.banners;
  const entityId = $page.params.id;
</script>

<!-- Página de edição de banners usando sistema universal -->
<UniversalFormPageTemplate 
	{config} 
	{entityId} 
	isEdit={true} 
/> 