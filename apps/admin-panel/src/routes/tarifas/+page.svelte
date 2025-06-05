<script lang="ts">
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import { PageConfigs } from '$lib/config/pageConfigs';
  
  const config = PageConfigs.tarifas;
</script>

<AdminPageTemplate {...config} /> 