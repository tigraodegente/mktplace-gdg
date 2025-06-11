<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { PageConfigs } from '$lib/config/pageConfigs';
	
	const config = PageConfigs['analytics-vendedores'];
</script>

<!-- Página de analytics vendedores migrada para arquitetura PageConfigs centralizada -->
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
	customFilters={config.customFilters}
	customActions={config.customActions}
	onDataLoad={config.onDataLoad}
	onStatsLoad={config.onStatsLoad}
	onBulkDelete={config.onBulkDelete}
/>
