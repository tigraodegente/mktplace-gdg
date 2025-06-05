<script lang="ts">
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import { PageConfigs } from '$lib/config/pageConfigs';
  
  // Configuração da página
  const config = PageConfigs['modalidades-frete'];
</script>

<AdminPageTemplate 
  {...config}
/>

<svelte:head>
  <title>Modalidades de Frete - Admin</title>
  <meta name="description" content="Gerencie modalidades de frete: PAC, SEDEX, Express e configurações de entrega" />
</svelte:head>