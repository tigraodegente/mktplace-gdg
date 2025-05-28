<!-- Deploy seletivo configurado e funcionando! -->
<script lang="ts">
  import { formatCurrency } from '@mktplace/utils';
  import ProductCard from '$lib/components/product/ProductCard.svelte';
  import type { PageData } from './$types';
  import { onMount } from 'svelte';
  
  interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    [key: string]: any;
  }
  
  let { data }: { data: PageData } = $props();
  
  const { featuredProducts, categories } = data;
  
  let featuredProductsState = $state<Product[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  
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

<!-- Hero Section -->
<section class="relative bg-gradient-to-r from-[var(--cyan500)] to-[var(--cyan600)] text-white">
  <div class="w-full max-w-[1440px] mx-auto px-8 py-24">
    <div class="max-w-3xl">
      <h1 class="text-5xl font-bold mb-6">
        Bem-vindo ao Marketplace GDG
      </h1>
      <p class="text-xl mb-8 opacity-90">
        Descubra produtos incríveis de vendedores confiáveis. 
        Qualidade garantida e entrega rápida para todo o Brasil.
      </p>
      <div class="flex gap-4">
        <button class="btn btn-lg bg-white text-[var(--cyan600)] hover:bg-[var(--gray50)] font-semibold">
          Explorar Produtos
        </button>
        <button class="btn btn-lg btn-outline border-white text-white hover:bg-white hover:text-[var(--cyan600)]">
          Seja um Vendedor
        </button>
      </div>
    </div>
  </div>
  <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--gray50)] to-transparent"></div>
</section>

<!-- Categorias -->
<section class="py-16 bg-[var(--gray50)]">
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
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-600">{error}</p>
        <button 
          onclick={() => location.reload()} 
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    {:else if featuredProductsState.length === 0}
      <div class="bg-gray-100 rounded-lg p-12 text-center">
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

<!-- Benefícios -->
<section class="py-16 bg-[var(--gray50)]">
  <div class="w-full max-w-[1440px] mx-auto px-8">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center">
        <div class="w-16 h-16 bg-[var(--cyan100)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-[var(--cyan600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2 text-[var(--text-color)]">Compra Segura</h3>
        <p class="text-[var(--gray300)]">Proteção total em todas as suas compras com garantia de reembolso</p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-[var(--cyan100)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-[var(--cyan600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2 text-[var(--text-color)]">Entrega Rápida</h3>
        <p class="text-[var(--gray300)]">Receba seus produtos em tempo recorde com rastreamento em tempo real</p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-[var(--cyan100)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-[var(--cyan600)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2 text-[var(--text-color)]">Melhores Preços</h3>
        <p class="text-[var(--gray300)]">Compare preços e encontre as melhores ofertas do mercado</p>
      </div>
    </div>
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
  /* Removido o products-grid customizado pois agora usamos Tailwind grid */
</style>
