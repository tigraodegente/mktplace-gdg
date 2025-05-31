<script lang="ts">
  import { page } from '$app/stores';
  import { 
    generateWebsiteSchema, 
    generateOrganizationSchema,
    generateBreadcrumbSchema,
    generateEcommerceSiteSchema,
    combineSchemas,
    serializeSchema,
    type BreadcrumbItem 
  } from '$lib/utils/schema';

  interface Props {
    breadcrumbs?: BreadcrumbItem[];
    includeWebsite?: boolean;
    includeOrganization?: boolean;
    includeEcommerce?: boolean;
    customSchema?: any;
  }

  let { 
    breadcrumbs = [],
    includeWebsite = true,
    includeOrganization = true,
    includeEcommerce = false,
    customSchema = null
  }: Props = $props();

  // Dados base do website
  const websiteData = {
    name: 'Marketplace Grão de Gente',
    url: 'https://marketplace-gdg.com',
    description: 'O melhor marketplace brasileiro para produtos infantis de qualidade',
    logo: 'https://marketplace-gdg.com/logo-512.png'
  };

  // Gerar schemas baseado nas props
  const schemas = [];

  if (includeWebsite) {
    schemas.push(generateWebsiteSchema(websiteData));
  }

  if (includeOrganization) {
    schemas.push(generateOrganizationSchema());
  }

  if (includeEcommerce) {
    schemas.push(generateEcommerceSiteSchema());
  }

  if (breadcrumbs.length > 0) {
    schemas.push(generateBreadcrumbSchema(breadcrumbs));
  }

  if (customSchema) {
    schemas.push(customSchema);
  }

  // Combinar todos os schemas
  const finalSchema = schemas.length > 1 ? combineSchemas(...schemas) : schemas[0];
</script>

<svelte:head>
  {#if finalSchema}
    {@html `<script type="application/ld+json">${serializeSchema(finalSchema)}</script>`}
  {/if}
</svelte:head> 