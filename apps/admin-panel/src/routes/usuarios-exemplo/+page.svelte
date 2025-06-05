<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { PageConfigs } from '$lib/config/pageConfigs';
	
	// Configuração de usuários - apenas 1 linha!
	const config = PageConfigs.usuarios;
</script>

<!-- Página completa de usuários em 1 linha! -->
<AdminPageTemplate {...config} /> 