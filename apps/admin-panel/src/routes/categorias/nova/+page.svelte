<script lang="ts">
  import UniversalFormPageTemplate from '$lib/components/universal/UniversalFormPageTemplate.svelte';
  import { FormConfigs } from '$lib/config/formConfigs';
  
  const config = FormConfigs.categorias;
</script>

<!-- Página de criação de categorias usando sistema dinâmico -->
<UniversalFormPageTemplate 
  {config} 
  isEdit={false} 
/> 