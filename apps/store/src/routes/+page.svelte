<!-- Deploy seletivo configurado e funcionando! -->
<script lang="ts">

  import { formatCurrency } from '$lib/utils';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import type { PageData } from './$types';
  import '../app.css';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import SmartHomeBanner from '$lib/components/layout/SmartHomeBanner.svelte';
  import BenefitsSection from '$lib/components/layout/BenefitsSection.svelte';
  import FastDeliveryProductCarousel from '$lib/components/product/FastDeliveryProductCarousel.svelte';
  import { invalidateAll } from '$app/navigation';
  
  let { data }: { data: PageData } = $props();
  
  // Estados reativo baseado nos dados do servidor
  let featuredProducts = $state(data.featuredProducts || []);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  

  
  // Função para recarregar a página
  async function handleRetry() {
    await invalidateAll();
  }
  

</script>

<svelte:head>
  <title>Marketplace GDG - Produtos para Bebê e Maternidade</title>
  <meta name="description" content="Encontre os melhores produtos para bebê e maternidade no Marketplace GDG. Ofertas especiais, entrega rápida e produtos de qualidade." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://marketplace-gdg.com/" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="Marketplace GDG - Produtos para Bebê e Maternidade" />
  <meta property="og:description" content="Encontre os melhores produtos para bebê e maternidade" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://marketplace-gdg.com/" />
  <meta property="og:image" content="https://marketplace-gdg.com/og-image.jpg" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:site_name" content="Marketplace GDG" />
</svelte:head>

<div class="min-h-screen bg-white">
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
  <!-- Banner Principal Inteligente (com countdown integrado) -->
  <SmartHomeBanner />

  <!-- Seção de Benefícios -->
  <BenefitsSection />

  <!-- Carrossel de Produtos com Entrega Rápida -->
  <FastDeliveryProductCarousel 
    autoPlay={true}
    autoPlayInterval={5000}
  />
  
  <!-- Produtos em Destaque -->
  {#if data.featuredProducts && data.featuredProducts.length > 0}
    <section class="py-12 bg-white">
      <div class="container mx-auto px-4">
        <h2 class="text-2xl font-bold text-gray-900 mb-8 text-center">
          Produtos em Destaque
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {#each data.featuredProducts as product}
            <ProductCard {product} />
          {/each}
        </div>
      </div>
    </section>
  {:else if !data.error}
    <!-- Mensagem quando não há produtos mas não é erro -->
    <section class="py-12 bg-white">
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

<!-- Estilos movidos para os componentes individuais -->
