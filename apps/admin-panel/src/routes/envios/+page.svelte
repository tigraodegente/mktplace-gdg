<script lang="ts">
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import { PageConfigs } from '$lib/config/pageConfigs';
  
  const config = PageConfigs.envios;
</script>

<AdminPageTemplate {...config} /> 