<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { PageConfigs } from '$lib/config/pageConfigs';
	
	// Configuração completa de frete - apenas 1 linha!
	const config = PageConfigs.frete;
</script>

<!-- Página de frete funcionando com a configuração básica -->
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
  searchPlaceholder={config.searchPlaceholder}
  searchFields={config.searchFields}
/>

<!-- Debug: Verificar se filtros estão sendo carregados -->
{#if config.customFilters}
  <div class="fixed bottom-4 right-4 p-2 bg-black text-white text-xs rounded">
    Filtros carregados: {config.customFilters.length}
  </div>
{/if} 