<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { PageConfigs } from '$lib/config/pageConfigs';
	
	const config = PageConfigs.produtos;
</script>

<!-- Página de produtos otimizada -->
<AdminPageTemplate
	title={config.title}
	entityName={config.entityName}
	entityNamePlural={config.entityNamePlural}
	newItemRoute={config.newItemRoute}
	editItemRoute={config.editItemRoute}
	apiEndpoint={config.apiEndpoint}
	deleteEndpoint={config.deleteEndpoint}
	statsEndpoint={config.statsEndpoint}
	categoriesEndpoint={config.categoriesEndpoint}
	brandsEndpoint={config.brandsEndpoint}
	columns={config.columns}
	statsConfig={config.statsConfig}
	searchPlaceholder={config.searchPlaceholder}
	searchFields={config.searchFields}
	customFilters={config.customFilters}
	onDataLoad={config.onDataLoad}
	onStatsLoad={config.onStatsLoad}
	customActions={config.customActions}
	onBulkDelete={config.onBulkDelete}
	useInfiniteScroll={config.useInfiniteScroll}
/> 