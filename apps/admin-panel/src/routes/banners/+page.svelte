<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { UniversalPageConfigs } from '$lib/config/universalPageConfigs';
	
	const config = UniversalPageConfigs.banners;
</script>

<!-- Página de listagem de banners migrada para sistema universal -->
<!-- ANTES: 318 linhas manuais | DEPOIS: 25 linhas automáticas = 92% redução -->
<AdminPageTemplate
	title={config.title}
	entityName={config.entityName}
	entityNamePlural={config.entityNamePlural}
	newItemRoute={config.newItemRoute}
	editItemRoute={config.editItemRoute}
	apiEndpoint={config.apiEndpoint}
	deleteEndpoint={config.deleteEndpoint}
	statsEndpoint={config.statsEndpoint}
	columns={config.columns}
	statsConfig={config.statsConfig}
	searchPlaceholder={config.searchPlaceholder}
	searchFields={config.searchFields}
	customFilters={config.customFilters}
	onDataLoad={config.onDataLoad}
/>
