<!-- Deploy seletivo configurado e funcionando! -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { formatCurrency } from '$lib/utils';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import type { PageData } from './$types';
  import '../app.css';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import HomeBanner from '$lib/components/layout/HomeBanner.svelte';
  import BenefitsSection from '$lib/components/layout/BenefitsSection.svelte';
  import FastDeliveryBanner from '$lib/components/layout/FastDeliveryBanner.svelte';
  import OfferCountdown from '$lib/components/layout/OfferCountdown.svelte';
  import CategorySection from '$lib/components/category/CategorySection.svelte';
  import { invalidateAll } from '$app/navigation';
  
  // Services for dynamic content
  import { bannerService } from '$lib/services/bannerService';
  import { countdownService, type CountdownData } from '$lib/services/countdownService';

  let { data }: { data: PageData } = $props();
  
  // Estados reativo baseado nos dados do servidor
  let featuredProducts = $state(data.featuredProducts || []);
  let categories = $state(data.categories || []);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  // Countdown state
  let activeCountdown = $state<CountdownData | null>(null);
  let showCountdown = $state(false);
  
  // Banner state
  let bannerSlides = $state([
    {
      id: '1',
      image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-1.jpg',
      imageAlt: 'Banner promocional 1',
      link: '/promocoes'
    },
    {
      id: '2',
      image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-2.jpg',
      imageAlt: 'Banner promocional 2',
      link: '/novidades'
    },
    {
      id: '3',
      image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-3.jpg',
      imageAlt: 'Banner promocional 3',
      link: '/ofertas'
    }
  ]);
  
  let fastDeliverySlides = $state([
    {
      id: '1',
      image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/entrega-rapida-1.jpg',
      alt: 'Produtos com entrega expressa'
    },
    {
      id: '2',
      image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/entrega-rapida-2.jpg',
      alt: 'Entrega em 24 horas'
    },
    {
      id: '3',
      image: 'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/entrega-rapida-3.jpg',
      alt: 'Receba hoje mesmo'
    }
  ]);
  
  // Função para recarregar a página
  async function handleRetry() {
    await invalidateAll();
  }
  
  // Load dynamic content on mount
  onMount(async () => {
    try {
      const [homeBanners, deliveryBanners, countdownData] = await Promise.all([
        bannerService.getHomeBanners(),
        bannerService.getDeliveryBanners(),
        countdownService.getActiveCountdown()
      ]);
      
      // Use dynamic banners if available
      if (homeBanners.length > 0) {
        bannerSlides = homeBanners.map(banner => ({
          id: banner.id,
          image: banner.image,
          imageAlt: banner.title,
          link: banner.link
        }));
      }
      
      if (deliveryBanners.length > 0) {
        fastDeliverySlides = deliveryBanners.map(banner => ({
          id: banner.id,
          image: banner.image,
          alt: banner.title
        }));
      }

      // Configure countdown
      if (countdownData && countdownService.isValidCountdown(countdownData)) {
        activeCountdown = countdownData;
        showCountdown = true;
      } else {
        showCountdown = false;
      }
      
    } catch (err) {
      console.warn('Usando conteúdo padrão:', err);
      // Keep fallback content
    }
  });
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
  <!-- Contador de Ofertas - Dinâmico do banco de dados -->
  {#if showCountdown && activeCountdown}
    <OfferCountdown 
      endTime={new Date(activeCountdown.endTime)}
      text={activeCountdown.text}
      class="countdown-connected"
    />
  {/if}
  
  <!-- Banner Principal -->
  <HomeBanner 
    slides={bannerSlides}
    autoPlay={true}
    autoPlayInterval={5000}
    showIndicators={true}
    showArrows={true}
    hasCountdown={showCountdown}
    class="banner-connected"
  />

  <!-- Seção de Benefícios -->
  <BenefitsSection />

  <!-- Compre por Categoria -->
  <CategorySection />

  <!-- Banner de Entrega Rápida -->
  <FastDeliveryBanner 
    slides={fastDeliverySlides}
    title="Produtos que chegam <strong>rapidinho</strong>"
    autoPlay={true}
    autoPlayInterval={6000}
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

<style>
  /* Conectar contador com banner */
  :global(.banner-connected) {
    margin-top: 0 !important;
  }
  
  /* Mobile ≤899px */
  @media (max-width: 899px) {
    :global(.banner-connected .banner-wrapper) { padding: 0 !important; }
    :global(.banner-connected .banner-container) { border-radius: 0 !important; }
  }
  
  /* Tablet 900px-1023px - garantir conexão perfeita */
  @media (min-width: 900px) and (max-width: 1023px) {
    :global(.banner-connected .banner-wrapper) { margin-top: 0 !important; }
    :global(.banner-connected .banner-container) {
      border-radius: 0 0 24px 24px !important; 
      margin-top: 0 !important;
    }
    :global(.countdown-connected) { margin-bottom: 0 !important; }
  }
  
  /* Desktop ≥1024px */
  @media (min-width: 1024px) {
    :global(.banner-connected .banner-container) {
      border-radius: 0 0 32px 32px !important; 
      max-width: calc(1440px - 64px) !important; 
    }
  }
</style>
