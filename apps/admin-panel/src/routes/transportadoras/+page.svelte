<script lang="ts">
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import { PageConfigs } from '$lib/config/pageConfigs';
  
  const config = PageConfigs.transportadoras;
</script>

<!-- Página de transportadoras com sistema centralizado -->
<AdminPageTemplate
  title={config.title}
  entityName={config.entityName}
  entityNamePlural={config.entityNamePlural}
  newItemRoute={config.newItemRoute}
  editItemRoute={config.editItemRoute}
  apiEndpoint={config.apiEndpoint}
  statsEndpoint={config.statsEndpoint}
  columns={config.columns}
  statsConfig={config.statsConfig}
  customFilters={config.customFilters}
  customActions={config.customActions}
  searchPlaceholder={config.searchPlaceholder}
  searchFields={config.searchFields}
/> 