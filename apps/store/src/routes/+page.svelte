<!-- Deploy seletivo configurado e funcionando! -->
<script lang="ts">
  import { formatCurrency } from '@mktplace/utils';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import HomeBanner from '$lib/components/layout/HomeBanner.svelte';
  import OfferCountdown from '$lib/components/layout/OfferCountdown.svelte';
  import BenefitsSection from '$lib/components/layout/BenefitsSection.svelte';
  import type { Product } from '@mktplace/shared-types';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  
  let { data }: { data: PageData } = $props();
  
  const { featuredProducts, categories } = data;
  
  let featuredProductsState = $state<Product[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  
  // Dados dos slides do banner
  const bannerSlides = [
    {
      id: '1',
      image: '/api/placeholder/1115/560',
      imageAlt: 'Ofertas Especiais - Até 50% OFF',
      title: 'Ofertas Especiais',
      subtitle: 'Até 50% OFF em produtos selecionados',
      ctaText: 'COMPRAR AGORA',
      ctaLink: '/promocoes',
      mobileImage: '/api/placeholder/767/767'
    },
    {
      id: '2',
      image: '/api/placeholder/1115/560',
      imageAlt: 'Novidades da temporada',
      title: 'Novidades',
      subtitle: 'Confira os últimos lançamentos da temporada',
      ctaText: 'VER MAIS',
      ctaLink: '/novidades',
      mobileImage: '/api/placeholder/767/767'
    },
    {
      id: '3',
      image: '/api/placeholder/1115/560',
      imageAlt: 'Frete Grátis para todo o Brasil',
      title: 'Frete Grátis',
      subtitle: 'Em compras acima de R$ 199 para todo o Brasil',
      ctaText: 'APROVEITAR',
      ctaLink: '/frete-gratis',
      mobileImage: '/api/placeholder/767/767'
    }
  ];
  
  // Configuração do countdown - 6 horas a partir de agora para demonstração
  const offerEndTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
  
  onMount(async () => {
    try {
      const response = await fetch('/api/products/featured');
      const result = await response.json();
      
      if (result.success) {
        featuredProductsState = result.data.products;
      } else {
        error = result.error?.message || 'Erro ao carregar produtos';
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
      error = 'Erro ao conectar com o servidor';
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Grão de Gente - Marketplace | Sua loja online completa</title>
  <meta name="description" content="Encontre os melhores produtos com os melhores preços no Marketplace Grão de Gente" />
</svelte:head>

<!-- Contador de Ofertas -->
<OfferCountdown 
  endTime={offerEndTime}
  text="Ofertas terminam em:"
/>

<!-- Banner Principal com Carrossel -->
<HomeBanner 
  slides={bannerSlides}
  autoPlay={true}
  autoPlayInterval={5000}
  showIndicators={true}
  showArrows={true}
  fullWidth={true}
  class="mb-8 lg:mb-12"
/>

<!-- Seção de Benefícios -->
<BenefitsSection />

<!-- Categorias -->
<section class="py-16 bg-white">
  <div class="w-full max-w-[1440px] mx-auto px-8">
    <h2 class="text-3xl font-bold text-center mb-12 text-[var(--text-color)]">Explore por Categoria</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {#each categories as category}
        <button class="card hover:shadow-lg transition text-center group">
          <div class="card-body">
            <div class="text-4xl mb-3 group-hover:scale-110 transition">{category.icon}</div>
            <h3 class="font-semibold text-[var(--text-color)]">{category.name}</h3>
            <p class="text-sm text-[var(--gray300)] mt-1">{category.count} produtos</p>
          </div>
        </button>
      {/each}
    </div>
  </div>
</section>

<!-- Produtos em Destaque -->
<section class="py-16 bg-white">
  <div class="w-full max-w-[1440px] mx-auto px-8">
    <div class="flex justify-between items-center mb-12">
      <h2 class="text-3xl font-bold text-[var(--text-color)]">Produtos em Destaque</h2>
      <a href="/produtos" class="text-[var(--cyan500)] hover:text-[var(--cyan600)] font-semibold transition">
        Ver todos →
      </a>
    </div>
    
    {#if isLoading}
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="w-12 h-12 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-gray-600">Carregando produtos...</p>
        </div>
      </div>
    {:else if error}
      <div class="bg-white border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-600">{error}</p>
        <button 
          onclick={() => location.reload()} 
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    {:else if featuredProductsState.length === 0}
      <div class="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p class="text-gray-600">Nenhum produto em destaque no momento</p>
      </div>
    {:else}
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {#each featuredProductsState as product}
          <ProductCard {product} />
        {/each}
      </div>
      
      <div class="text-center mt-8">
        <a 
          href="/busca" 
          class="inline-block px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
        >
          Ver Todos os Produtos
        </a>
      </div>
    {/if}
  </div>
</section>

<!-- Newsletter -->
<section class="py-16 bg-[var(--cyan500)] text-white">
  <div class="w-full max-w-[1440px] mx-auto px-8 text-center">
    <h2 class="text-3xl font-bold mb-4">Fique por dentro das novidades</h2>
    <p class="text-xl mb-8 opacity-90">Receba ofertas exclusivas e lançamentos em primeira mão</p>
    <form class="max-w-md mx-auto flex gap-4">
      <input 
        type="email" 
        placeholder="Seu melhor e-mail"
        class="input flex-1 text-[var(--text-color)]"
      />
      <button type="submit" class="btn bg-white text-[var(--cyan600)] hover:bg-[var(--gray50)]">
        Inscrever
      </button>
    </form>
  </div>
</section>

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
