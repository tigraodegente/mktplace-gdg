<!-- Deploy seletivo configurado e funcionando! -->
<script lang="ts">
  import { formatCurrency } from '@mktplace/utils';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import HomeBanner from '$lib/components/layout/HomeBanner.svelte';
  import OfferCountdown from '$lib/components/layout/OfferCountdown.svelte';
  import BenefitsSection from '$lib/components/layout/BenefitsSection.svelte';
  import ProductGridSkeleton from '$lib/components/ui/ProductGridSkeleton.svelte';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  
  let { data }: { data: PageData } = $props();
  
  // Estados reativo baseado nos dados do servidor
  let featuredProducts = $state(data.featuredProducts || []);
  let categories = $state(data.categories || []);
  let isLoading = $state(false);
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
  
  // Função para recarregar produtos se necessário
  async function reloadProducts() {
    if (featuredProducts.length > 0) return; // Já temos produtos
    
    isLoading = true;
    error = null;
    
    try {
      console.log('🔄 Recarregando produtos em destaque...');
      const response = await fetch('/api/products/featured?limit=8');
      const result = await response.json();
      
      if (result.success && result.data?.products) {
        featuredProducts = result.data.products;
      } else {
        error = result.error?.message || 'Erro ao carregar produtos';
        console.error('❌ Erro na resposta da API:', result);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar produtos:', err);
      error = 'Erro ao conectar com o servidor';
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    // Só recarrega se não temos produtos do servidor
    if (featuredProducts.length === 0) {
      console.log('⚠️ Nenhum produto carregado do servidor, tentando reload...');
      reloadProducts();
    }
  });
</script>

<svelte:head>
  <title>Grão de Gente - Marketplace | Sua loja online completa</title>
  <meta name="description" content="Encontre os melhores produtos com os melhores preços no Marketplace Grão de Gente" />
</svelte:head>

{#if data.dataSource && typeof window !== 'undefined' && window.location.hostname === 'localhost'}
  <!-- Developer Info - mostrar apenas em desenvolvimento -->
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm mx-8">
    <div class="flex items-center gap-2 mb-2">
      <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="font-medium text-blue-900">Status da Integração</span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="flex items-center gap-2">
        <span class="text-blue-700">Produtos:</span>
        {#if data.dataSource.products === 'database'}
          <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">✅ Banco de Dados</span>
        {:else}
          <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">⚠️ Mock</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-blue-700">Categorias:</span>
        {#if data.dataSource.categories === 'database'}
          <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">✅ Banco de Dados</span>
        {:else}
          <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">⚠️ Mock</span>
        {/if}
      </div>
    </div>
    {#if data.stats}
      <div class="mt-2 text-xs text-blue-600">
        Estatísticas: {data.stats.totalProducts} produtos • {data.stats.totalCategories} categorias • {data.stats.totalSellers} vendedores
      </div>
    {/if}
  </div>
{/if}

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
        <a href="/categorias/{category.slug || ''}" class="card hover:shadow-lg transition text-center group block">
          <div class="card-body">
            <div class="text-4xl mb-3 group-hover:scale-110 transition">{category.icon}</div>
            <h3 class="font-semibold text-[var(--text-color)]">{category.name}</h3>
            <p class="text-sm text-[var(--gray300)] mt-1">{category.count} produtos</p>
          </div>
        </a>
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
      <ProductGridSkeleton itemCount={8} columns={4} />
    {:else if error}
      <div class="bg-white border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-600">{error}</p>
        <button 
          onclick={reloadProducts} 
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    {:else if featuredProducts.length === 0}
      <div class="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p class="text-gray-600 mb-4">Nenhum produto em destaque no momento</p>
        <button 
          onclick={reloadProducts} 
          class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
        >
          Recarregar Produtos
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {#each featuredProducts as product}
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
