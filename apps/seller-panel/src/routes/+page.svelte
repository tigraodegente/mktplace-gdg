<script lang="ts">
  // Dados mockados por enquanto
  const sellerStats = {
    totalRevenue: 12345.67,
    totalSales: 89,
    activeProducts: 23,
    averageRating: 4.5
  };

  const recentSales = [
    { id: '1', product: 'Notebook Dell', quantity: 1, total: 3499.90, date: '2024-01-20' },
    { id: '2', product: 'Mouse Gamer', quantity: 2, total: 159.80, date: '2024-01-20' },
    { id: '3', product: 'Teclado Mecânico', quantity: 1, total: 299.90, date: '2024-01-19' },
    { id: '4', product: 'Monitor 24"', quantity: 1, total: 899.90, date: '2024-01-19' }
  ];

  const topProducts = [
    { name: 'Notebook Dell', sales: 45, revenue: 157495.50 },
    { name: 'Mouse Gamer', sales: 123, revenue: 9839.70 },
    { name: 'Teclado Mecânico', sales: 67, revenue: 20093.30 },
    { name: 'Monitor 24"', sales: 34, revenue: 30596.60 }
  ];
</script>

<svelte:head>
  <title>Dashboard - Painel do Vendedor</title>
</svelte:head>

<div class="min-h-screen bg-gray-100">
  <!-- Header -->
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Painel do Vendedor</h1>
          <p class="text-sm text-gray-600 mt-1">Bem-vindo de volta, João!</p>
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Adicionar Produto
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-600">Receita Total</p>
            <p class="text-2xl font-bold text-gray-900">
              R$ {sellerStats.totalRevenue.toFixed(2).replace('.', ',')}
            </p>
            <p class="text-xs text-green-600 mt-1">+12% vs mês anterior</p>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-600">Total de Vendas</p>
            <p class="text-2xl font-bold text-gray-900">{sellerStats.totalSales}</p>
            <p class="text-xs text-green-600 mt-1">+5 vendas hoje</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-600">Produtos Ativos</p>
            <p class="text-2xl font-bold text-gray-900">{sellerStats.activeProducts}</p>
            <p class="text-xs text-gray-600 mt-1">3 com estoque baixo</p>
          </div>
          <div class="p-3 bg-purple-100 rounded-full">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-600">Avaliação Média</p>
            <p class="text-2xl font-bold text-gray-900">{sellerStats.averageRating}</p>
            <div class="flex items-center mt-1">
              {#each Array(5) as _, i}
                <svg class="w-4 h-4 {i < Math.floor(sellerStats.averageRating) ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              {/each}
            </div>
          </div>
          <div class="p-3 bg-yellow-100 rounded-full">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Recent Sales -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Vendas Recentes</h2>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            {#each recentSales as sale}
              <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p class="font-medium text-gray-900">{sale.product}</p>
                  <p class="text-sm text-gray-500">Qtd: {sale.quantity} • {sale.date}</p>
                </div>
                <p class="font-semibold text-gray-900">
                  R$ {sale.total.toFixed(2).replace('.', ',')}
                </p>
              </div>
            {/each}
          </div>
          <a href="/vendas" class="block mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
            Ver todas as vendas →
          </a>
        </div>
      </div>

      <!-- Top Products -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h2>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            {#each topProducts as product}
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <p class="font-medium text-gray-900">{product.name}</p>
                  <div class="flex items-center mt-1">
                    <span class="text-sm text-gray-500">{product.sales} vendas</span>
                    <span class="mx-2 text-gray-300">•</span>
                    <span class="text-sm font-medium text-green-600">
                      R$ {product.revenue.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          <a href="/produtos" class="block mt-4 text-center text-blue-600 hover:text-blue-700 font-medium">
            Ver todos os produtos →
          </a>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mt-8 bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
          <svg class="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="text-sm font-medium text-gray-900">Novo Produto</span>
        </button>
        <button class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
          <svg class="w-8 h-8 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span class="text-sm font-medium text-gray-900">Ver Pedidos</span>
        </button>
        <button class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
          <svg class="w-8 h-8 mx-auto mb-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span class="text-sm font-medium text-gray-900">Relatórios</span>
        </button>
        <button class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center">
          <svg class="w-8 h-8 mx-auto mb-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-sm font-medium text-gray-900">Configurações</span>
        </button>
      </div>
    </div>
  </main>
</div>
