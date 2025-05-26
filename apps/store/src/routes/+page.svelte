<script lang="ts">
  // Dados mockados por enquanto
  const featuredProducts = [
    {
      id: '1',
      name: 'Notebook Dell Inspiron',
      price: 3499.99,
      image: 'https://via.placeholder.com/300x200',
      category: 'Eletrônicos'
    },
    {
      id: '2',
      name: 'Smartphone Samsung Galaxy',
      price: 2199.99,
      image: 'https://via.placeholder.com/300x200',
      category: 'Eletrônicos'
    },
    {
      id: '3',
      name: 'Fone de Ouvido JBL',
      price: 299.99,
      image: 'https://via.placeholder.com/300x200',
      category: 'Acessórios'
    },
    {
      id: '4',
      name: 'Smart TV LG 50"',
      price: 2799.99,
      image: 'https://via.placeholder.com/300x200',
      category: 'Eletrônicos'
    }
  ];
  
  const categories = [
    'Eletrônicos',
    'Moda',
    'Casa e Decoração',
    'Esportes',
    'Livros',
    'Beleza'
  ];
</script>

<svelte:head>
  <title>Marketplace GDG - Sua loja online</title>
</svelte:head>

<!-- Hero Section -->
<section class="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
    <div class="text-center">
      <h1 class="text-4xl md:text-6xl font-bold mb-6">
        Bem-vindo ao Marketplace GDG
      </h1>
      <p class="text-xl md:text-2xl mb-8 text-blue-100">
        Encontre os melhores produtos com os melhores preços
      </p>
      <div class="max-w-xl mx-auto">
        <div class="flex">
          <input
            type="text"
            placeholder="O que você está procurando?"
            class="flex-1 px-4 py-3 rounded-l-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button class="bg-blue-900 hover:bg-blue-950 px-6 py-3 rounded-r-lg font-medium transition-colors">
            Buscar
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Categorias -->
<section class="py-12 bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Categorias Populares</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {#each categories as category}
        <a
          href="/categoria/{category.toLowerCase().replace(/ /g, '-')}"
          class="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-center"
        >
          <div class="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3"></div>
          <span class="text-sm font-medium text-gray-900">{category}</span>
        </a>
      {/each}
    </div>
  </div>
</section>

<!-- Produtos em Destaque -->
<section class="py-12">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Produtos em Destaque</h2>
      <a href="/produtos" class="text-blue-600 hover:text-blue-700 font-medium">
        Ver todos →
      </a>
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each featuredProducts as product}
        <div class="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow">
          <a href="/produto/{product.id}">
            <img
              src={product.image}
              alt={product.name}
              class="w-full h-48 object-cover rounded-t-lg"
            />
            <div class="p-4">
              <p class="text-sm text-gray-500 mb-1">{product.category}</p>
              <h3 class="font-semibold text-gray-900 mb-2">{product.name}</h3>
              <p class="text-2xl font-bold text-blue-600">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </a>
          <div class="px-4 pb-4">
            <button class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors">
              Adicionar ao Carrinho
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- Newsletter -->
<section class="bg-gray-900 text-white py-12">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold mb-4">Fique por dentro das novidades</h2>
      <p class="text-gray-300 mb-8">
        Receba ofertas exclusivas e lançamentos em primeira mão
      </p>
      <form class="max-w-md mx-auto flex gap-4">
        <input
          type="email"
          placeholder="Seu melhor email"
          class="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          class="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Inscrever
        </button>
      </form>
    </div>
  </div>
</section>
