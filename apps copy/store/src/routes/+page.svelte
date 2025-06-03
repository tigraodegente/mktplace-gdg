<!-- Deploy seletivo configurado e funcionando! -->
<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import CategorySection from '$lib/components/category/CategorySection.svelte';
  import SchemaMarkup from '$lib/components/SEO/SchemaMarkup.svelte';
  import type { PageData } from './$types';
  import '../app.css';
  import FeaturedProducts from '$lib/components/product/FeaturedProducts.svelte';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import { invalidateAll } from '$app/navigation';
  
  let { data }: { data: PageData } = $props();
  
  // Estados reativo baseado nos dados do servidor
  let featuredProducts = $state(data.featuredProducts || []);
  let categories = $state(data.categories || []);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  // Função para recarregar a página
  async function handleRetry() {
    await invalidateAll();
  }
</script>

<svelte:head>
  <title>Grão de Gente - Marketplace | Sua loja online completa</title>
  <meta name="description" content="Encontre os melhores produtos com os melhores preços no Marketplace Grão de Gente" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://marketplace-gdg.com/" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="Grão de Gente - Marketplace | Sua loja online completa" />
  <meta property="og:description" content="Encontre os melhores produtos com os melhores preços no Marketplace Grão de Gente" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://marketplace-gdg.com/" />
  <meta property="og:image" content="https://marketplace-gdg.com/og-image.jpg" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="Marketplace GDG" />
</svelte:head>

<!-- Schema.org Markup para Homepage -->
<SchemaMarkup 
  includeWebsite={true}
  includeOrganization={true}
  includeEcommerce={true}
  breadcrumbs={[
    { name: 'Início', url: 'https://marketplace-gdg.com/' }
  ]}
/>

<div class="min-h-screen bg-gray-50">
	<!-- Header simples -->
	<header class="bg-white shadow-sm">
		<div class="container mx-auto px-4 py-4">
			<h1 class="text-2xl font-bold text-gray-900">Grão de Gente Marketplace</h1>
		</div>
	</header>
	
	{#if data.error}
		<!-- Mostrar mensagem de erro -->
		<div class="container mx-auto px-4 py-16">
			<ErrorMessage 
				title="Ops! Não conseguimos carregar os produtos"
				message={data.error}
				onRetry={handleRetry}
			/>
		</div>
	{:else}
		<!-- Categorias -->
		{#if data.categories && data.categories.length > 0}
			<section class="py-12 bg-white">
				<div class="container mx-auto px-4">
					<h2 class="text-2xl font-bold text-gray-900 mb-8 text-center">
						Categorias Populares
					</h2>
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
						{#each data.categories as category}
							<div class="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
								<div class="text-4xl mb-2">{category.icon || '📦'}</div>
								<h3 class="font-medium text-gray-900">{category.name}</h3>
								<p class="text-sm text-gray-500">{category.count} produtos</p>
							</div>
						{/each}
					</div>
				</div>
			</section>
		{/if}
		
		<!-- Produtos em Destaque -->
		{#if data.featuredProducts && data.featuredProducts.length > 0}
			<section class="py-12">
				<div class="container mx-auto px-4">
					<FeaturedProducts 
						products={data.featuredProducts}
						title="Produtos em Destaque"
						showHeader={true}
						columns={4}
					/>
				</div>
			</section>
		{:else if !data.error}
			<!-- Mensagem quando não há produtos mas não é erro -->
			<section class="py-12">
				<div class="container mx-auto px-4 text-center">
					<p class="text-gray-600">Nenhum produto em destaque no momento.</p>
				</div>
			</section>
		{/if}
		
		<!-- Newsletter simples -->
		<section class="py-12 bg-teal-500 text-white">
			<div class="container mx-auto px-4 text-center">
				<h2 class="text-2xl font-bold mb-4">Fique por dentro das novidades</h2>
				<p class="mb-6">Receba ofertas exclusivas e lançamentos em primeira mão</p>
				<div class="max-w-md mx-auto flex gap-4">
					<input 
						type="email" 
						placeholder="Seu melhor e-mail"
						class="flex-1 px-4 py-2 rounded-lg text-gray-900"
					/>
					<button type="submit" class="px-6 py-2 bg-white text-teal-500 rounded-lg font-medium hover:bg-gray-100 transition-colors">
						Inscrever
					</button>
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
  /* Garantindo que toda a página tenha fundo branco */
  :global(body) {
    background-color: white !important;
  }
  
  :global(main) {
    background-color: white !important;
  }
  
  /* Container principal da página */
  :global(.page-container) {
    background-color: white !important;
  }
</style>
