<script lang="ts">
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  function formatPrice(price: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  }
</script>

<svelte:head>
  <title>Marketplace GDG - Sua loja online completa</title>
</svelte:head>

<!-- Hero Section -->
<section class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <div class="text-center">
      <h1 class="text-4xl md:text-6xl font-bold mb-6">
        Bem-vindo ao Marketplace GDG
      </h1>
      <p class="text-xl md:text-2xl mb-8 opacity-90">
        Encontre os melhores produtos com os melhores preços
      </p>
      <a href="/produtos" class="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition">
        Explorar Produtos
      </a>
    </div>
  </div>
</section>

<!-- Categories Section -->
<section class="py-16 bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl font-bold text-gray-900 mb-8">Categorias Populares</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {#each data.categories as category}
        <a href="/categoria/{category.slug}" class="group">
          <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition p-6 text-center">
            <div class="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:bg-blue-200 transition">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 class="font-semibold text-gray-900">{category.name}</h3>
            {#if category.description}
              <p class="text-sm text-gray-600 mt-1">{category.description}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<!-- Featured Products Section -->
<section class="py-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-3xl font-bold text-gray-900 mb-8">Produtos em Destaque</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each data.featuredProducts as product}
        <a href="/produto/{product.slug}" class="group">
          <div class="bg-white rounded-lg shadow-sm hover:shadow-lg transition">
            {#if product.images && product.images.length > 0}
              <img 
                src={product.images[0]} 
                alt={product.name}
                class="w-full h-48 object-cover rounded-t-lg"
              />
            {:else}
              <div class="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            {/if}
            <div class="p-4">
              {#if product.category}
                <p class="text-sm text-gray-500 mb-1">{product.category.name}</p>
              {/if}
              <h3 class="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                {product.name}
              </h3>
              {#if product.seller}
                <p class="text-sm text-gray-600 mt-1">
                  Por {product.seller.name}
                  {#if product.seller.rating > 0}
                    <span class="text-yellow-500">★ {product.seller.rating}</span>
                  {/if}
                </p>
              {/if}
              <div class="mt-3">
                {#if product.compareAtPrice && product.compareAtPrice > product.price}
                  <span class="text-sm text-gray-500 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                {/if}
                <p class="text-xl font-bold text-gray-900">
                  {formatPrice(product.price)}
                </p>
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
    
    {#if data.featuredProducts.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-500">Nenhum produto em destaque no momento.</p>
      </div>
    {/if}
  </div>
</section>

<!-- Newsletter Section -->
<section class="bg-gray-900 text-white py-16">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h2 class="text-3xl font-bold mb-4">Fique por dentro das novidades</h2>
    <p class="text-xl mb-8 opacity-90">Receba ofertas exclusivas e lançamentos em primeira mão</p>
    <form class="max-w-md mx-auto flex gap-4">
      <input 
        type="email" 
        placeholder="Seu melhor e-mail"
        class="flex-1 px-4 py-3 rounded-lg text-gray-900"
        required
      />
      <button type="submit" class="bg-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
        Inscrever
      </button>
    </form>
  </div>
</section>
