<script lang="ts">
  import { formatCurrency } from '@mktplace/utils';
  
  // Dados mockados por enquanto
  const featuredProducts = [
    {
      id: '1',
      name: 'Notebook Gamer Pro',
      price: 4999.99,
      image: 'https://via.placeholder.com/300x300/4F46E5/ffffff?text=Notebook',
      discount: 10
    },
    {
      id: '2',
      name: 'Smartphone Ultra',
      price: 2499.99,
      image: 'https://via.placeholder.com/300x300/7C3AED/ffffff?text=Smartphone',
      discount: 15
    },
    {
      id: '3',
      name: 'Fone Bluetooth Premium',
      price: 299.99,
      image: 'https://via.placeholder.com/300x300/EC4899/ffffff?text=Fone',
      discount: 0
    },
    {
      id: '4',
      name: 'Smartwatch Fitness',
      price: 899.99,
      image: 'https://via.placeholder.com/300x300/F59E0B/ffffff?text=Smartwatch',
      discount: 20
    }
  ];

  const categories = [
    { name: 'Eletrônicos', icon: '📱', count: 1234 },
    { name: 'Moda', icon: '👕', count: 5678 },
    { name: 'Casa', icon: '🏠', count: 910 },
    { name: 'Esportes', icon: '⚽', count: 432 },
    { name: 'Livros', icon: '📚', count: 789 },
    { name: 'Beleza', icon: '💄', count: 567 }
  ];
</script>

<svelte:head>
  <title>Marketplace GDG - Sua loja online completa</title>
  <meta name="description" content="Encontre os melhores produtos com os melhores preços no Marketplace GDG" />
</svelte:head>

<!-- Hero Section -->
<section class="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white">
  <div class="container mx-auto px-4 py-24">
    <div class="max-w-3xl">
      <h1 class="text-5xl font-bold mb-6">
        Bem-vindo ao Marketplace GDG
      </h1>
      <p class="text-xl mb-8 opacity-90">
        Descubra produtos incríveis de vendedores confiáveis. 
        Qualidade garantida e entrega rápida para todo o Brasil.
      </p>
      <div class="flex gap-4">
        <button class="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
          Explorar Produtos
        </button>
        <button class="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition">
          Seja um Vendedor
        </button>
      </div>
    </div>
  </div>
  <div class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
</section>

<!-- Categorias -->
<section class="py-16 bg-gray-50">
  <div class="container mx-auto px-4">
    <h2 class="text-3xl font-bold text-center mb-12">Explore por Categoria</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {#each categories as category}
        <button class="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition text-center group">
          <div class="text-4xl mb-3 group-hover:scale-110 transition">{category.icon}</div>
          <h3 class="font-semibold text-gray-800">{category.name}</h3>
          <p class="text-sm text-gray-500 mt-1">{category.count} produtos</p>
        </button>
      {/each}
    </div>
  </div>
</section>

<!-- Produtos em Destaque -->
<section class="py-16">
  <div class="container mx-auto px-4">
    <div class="flex justify-between items-center mb-12">
      <h2 class="text-3xl font-bold">Produtos em Destaque</h2>
      <a href="/produtos" class="text-purple-600 hover:text-purple-700 font-semibold">
        Ver todos →
      </a>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each featuredProducts as product}
        <div class="bg-white rounded-xl shadow-sm hover:shadow-lg transition group">
          <div class="relative overflow-hidden rounded-t-xl">
            <img 
              src={product.image} 
              alt={product.name}
              class="w-full h-64 object-cover group-hover:scale-105 transition duration-300"
            />
            {#if product.discount > 0}
              <span class="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                -{product.discount}%
              </span>
            {/if}
          </div>
          <div class="p-6">
            <h3 class="font-semibold text-lg mb-2 text-gray-800">{product.name}</h3>
            <div class="flex items-center gap-2">
              {#if product.discount > 0}
                <span class="text-2xl font-bold text-purple-600">
                  {formatCurrency(product.price * (1 - product.discount / 100))}
                </span>
                <span class="text-sm text-gray-400 line-through">
                  {formatCurrency(product.price)}
                </span>
              {:else}
                <span class="text-2xl font-bold text-purple-600">
                  {formatCurrency(product.price)}
                </span>
              {/if}
            </div>
            <button class="w-full mt-4 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition font-semibold">
              Adicionar ao Carrinho
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Benefícios -->
<section class="py-16 bg-gray-50">
  <div class="container mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center">
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2">Compra Segura</h3>
        <p class="text-gray-600">Proteção total em todas as suas compras com garantia de reembolso</p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2">Entrega Rápida</h3>
        <p class="text-gray-600">Receba seus produtos em tempo recorde com rastreamento em tempo real</p>
      </div>
      <div class="text-center">
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2">Melhores Preços</h3>
        <p class="text-gray-600">Compare preços e encontre as melhores ofertas do mercado</p>
      </div>
    </div>
  </div>
</section>

<!-- Newsletter -->
<section class="py-16 bg-purple-600 text-white">
  <div class="container mx-auto px-4 text-center">
    <h2 class="text-3xl font-bold mb-4">Fique por dentro das novidades</h2>
    <p class="text-xl mb-8 opacity-90">Receba ofertas exclusivas e lançamentos em primeira mão</p>
    <form class="max-w-md mx-auto flex gap-4">
      <input 
        type="email" 
        placeholder="Seu melhor e-mail"
        class="flex-1 px-4 py-3 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
      <button type="submit" class="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
        Inscrever
      </button>
    </form>
  </div>
</section>
