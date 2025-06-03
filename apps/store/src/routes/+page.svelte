<!-- Deploy seletivo configurado e funcionando! -->
<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import HomeBanner from '$lib/components/layout/HomeBanner.svelte';
  import OfferCountdown from '$lib/components/layout/OfferCountdown.svelte';
  import BenefitsSection from '$lib/components/layout/BenefitsSection.svelte';
  import FastDeliveryBanner from '$lib/components/layout/FastDeliveryBanner.svelte';
  import CategorySection from '$lib/components/category/CategorySection.svelte';
  import ProductGridSkeleton from '$lib/components/ui/ProductGridSkeleton.svelte';
  import SchemaMarkup from '$lib/components/SEO/SchemaMarkup.svelte';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  import '../app.css';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth, user, isAuthenticated } from '$lib/stores/authStore';
  import Footer from '$lib/components/layout/Footer.svelte';
  import SearchBox from '$lib/components/search/SearchBox.svelte';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
  import { cartStore } from '$lib/stores/cartStore';
  import { wishlistCount } from '$lib/stores/wishlistStore';
  import { notificationStore } from '$lib/stores/notificationStore';
  import Header from '$lib/components/layout/Header.svelte';
  import MobileHeader from '$lib/components/layout/MobileHeader.svelte';
  import DesktopCategoryMenu from '$lib/components/navigation/DesktopCategoryMenu.svelte';
  import MobileCategoryMenu from '$lib/components/navigation/MobileCategoryMenu.svelte';
  import BannerCarousel from '$lib/components/layout/BannerCarousel.svelte';
  import Toast from '$lib/components/ui/Toast.svelte';
  import { frontendCache } from '$lib/cache/frontend-cache';
  import ChatWidget from '$lib/components/chat/ChatWidget.svelte';
  import { toastStore } from '$lib/stores/toastStore';
  import { unreadCount } from '$lib/stores/notificationStore';
  import FeaturedProducts from '$lib/components/product/FeaturedProducts.svelte';
  import CategoryGrid from '$lib/components/category/CategoryGrid.svelte';
  import HeroBanner from '$lib/components/layout/HeroBanner.svelte';
  import NewsletterSection from '$lib/components/layout/NewsletterSection.svelte';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import { invalidateAll } from '$app/navigation';
  
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
      image: 'https://picsum.photos/1440/640?random=1',
      imageAlt: 'Ofertas Especiais - Até 50% OFF',
      mobileImage: 'https://picsum.photos/767/767?random=1',
      link: '/promocoes'
    },
    {
      id: '2',
      image: 'https://picsum.photos/1440/640?random=2',
      imageAlt: 'Novidades da temporada',
      mobileImage: 'https://picsum.photos/767/767?random=2',
      link: '/novidades'
    },
    {
      id: '3',
      image: 'https://picsum.photos/1440/640?random=3',
      imageAlt: 'Frete Grátis para todo o Brasil',
      mobileImage: 'https://picsum.photos/767/767?random=3',
      link: '/frete-gratis'
    }
  ];
  
  // Configuração do countdown - 6 horas a partir de agora para demonstração
  const offerEndTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
  
  // Estados para demonstrar as novas funcionalidades do countdown
  let countdownPaused = $state(false);
  let urgentAlert = $state(false);
  let criticalAlert = $state(false);
  let countdownCompleted = $state(false);
  
  // Handlers para eventos do countdown
  function handleCountdownExpired() {
    console.log('🚨 Oferta expirou!');
    countdownCompleted = true;
    // Aqui poderia redirecionar, mostrar modal, etc.
  }
  
  function handleUrgentTime(event: CustomEvent<{ secondsLeft: number }>) {
    console.log(`⚠️ Tempo urgente! ${event.detail.secondsLeft} segundos restantes`);
    urgentAlert = true;
    
    // Remove alerta após 5 segundos
    setTimeout(() => {
      urgentAlert = false;
    }, 5000);
  }
  
  function handleCriticalTime(event: CustomEvent<{ secondsLeft: number }>) {
    console.log(`🔥 Tempo crítico! ${event.detail.secondsLeft} segundos restantes`);
    criticalAlert = true;
    
    // Remove alerta após 3 segundos
    setTimeout(() => {
      criticalAlert = false;
    }, 3000);
  }
  
  function handleCountdownTick(event: CustomEvent) {
    // Log a cada minuto para não spammar
    const { minutes, seconds } = event.detail;
    if (seconds === 0) {
      console.log(`⏰ Countdown tick: ${event.detail.hours}h ${minutes}m`);
    }
  }
  
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

<!-- Contador de Ofertas -->
<OfferCountdown 
  endTime={offerEndTime}
  text="🔥 MEGA OFERTA termina em:"
  showDays={false}
  autoHide={false}
  pulse={true}
  class="enhanced-countdown"
/>

<!-- Banner Principal com Carrossel -->
<HomeBanner 
  slides={bannerSlides}
  autoPlay={true}
  autoPlayInterval={5000}
  showIndicators={true}
  showArrows={true}
  hasCountdown={true}
  class="lg:mb-12"
/>

<!-- Seção de Benefícios -->
<BenefitsSection />

<!-- Fast Delivery Banner -->
<FastDeliveryBanner />

<!-- Compre por categoria -->
<CategorySection />

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
  
  /* Customização do Countdown Refatorado */
  :global(.enhanced-countdown) {
    /* Cores customizadas para demo */
    --color-border-urgent: #ff8500;
    --color-border-critical: #ff2d2d;
    
    /* Animações mais suaves */
    --pulse-duration: 1.5s;
    --shake-duration: 0.4s;
    
    /* Transições mais fluidas */
    --transition-base: 0.4s ease-in-out;
  }
  
  /* Mobile: ajustes específicos */
  @media (max-width: 767px) {
    :global(.enhanced-countdown) {
      --font-size-text: 13px;
      --unit-width: 28px;
      --unit-height: 24px;
    }
  }
</style>

<div class="min-h-screen bg-gray-50">
	<!-- Hero Banner -->
	<HeroBanner />
	
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
					<CategoryGrid categories={data.categories} />
				</div>
			</section>
		{/if}
		
		<!-- Produtos em Destaque -->
		{#if data.featuredProducts && data.featuredProducts.length > 0}
			<section class="py-12">
				<div class="container mx-auto px-4">
					<h2 class="text-2xl font-bold text-gray-900 mb-8 text-center">
						Produtos em Destaque
					</h2>
					<FeaturedProducts products={data.featuredProducts} />
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
		
		<!-- Newsletter -->
		<NewsletterSection />
	{/if}
</div>
