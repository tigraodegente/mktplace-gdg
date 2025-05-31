<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  const dashboardStats = [
    { 
      title: 'Vendas Este Mês', 
      value: 'R$ 124,5K', 
      change: '+26.8% vs mês anterior', 
      changeType: 'positive' as const, 
      icon: 'revenue',
      gradient: true
    },
    { 
      title: 'Pedidos Totais', 
      value: '1,543', 
      change: '+18% este mês', 
      changeType: 'positive' as const, 
      icon: 'orders'
    },
    { 
      title: 'Produtos Ativos', 
      value: '2,234', 
      change: '+12% este mês', 
      changeType: 'positive' as const, 
      icon: 'products'
    },
    { 
      title: 'Usuários Ativos', 
      value: '1,234', 
      change: '+8% este mês', 
      changeType: 'positive' as const, 
      icon: 'users'
    },
  ];
  
  const reportData = [
    { name: 'Vendas por Categoria', value: 'R$ 45.2K', change: '+12%', type: 'positive', color: 'from-blue-500 to-blue-600' },
    { name: 'Produtos Mais Vendidos', value: '234 itens', change: '+8%', type: 'positive', color: 'from-green-500 to-green-600' },
    { name: 'Taxa de Conversão', value: '3.2%', change: '-0.5%', type: 'negative', color: 'from-yellow-500 to-orange-500' },
    { name: 'Ticket Médio', value: 'R$ 289', change: '+15%', type: 'positive', color: 'from-purple-500 to-purple-600' },
  ];

  const topProducts = [
    { name: 'Smartphone Galaxy A54', sales: 234, revenue: 89200, growth: 15, image: '📱' },
    { name: 'Tênis Nike Air Max', sales: 189, revenue: 67400, growth: 12, image: '👟' },
    { name: 'Livro Clean Code', sales: 156, revenue: 14000, growth: 8, image: '📚' },
    { name: 'Mouse Gamer RGB', sales: 134, revenue: 12600, growth: 22, image: '🖱️' },
  ];

  function formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function handleGenerateReport(type: string): void {
    console.log('Gerar relatório:', type);
  }

  function handleExportPDF(): void {
    console.log('Exportar relatório PDF');
  }

  function handleCustomPeriod(): void {
    console.log('Abrir seletor de período');
  }
</script>

<svelte:head>
  <title>Relatórios - Admin Panel</title>
</svelte:head>

<!-- Page Header Melhorado -->
<div class="bg-white border-b border-gray-200 px-8 py-6 mb-8">
  <div class="max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-4" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2 text-sm">
        <li>
          <a href="/" class="text-gray-500 hover:text-primary-600 transition-colors">Dashboard</a>
        </li>
        <li class="flex items-center">
          <svg class="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          <span class="text-gray-900 font-medium">Relatórios</span>
        </li>
      </ol>
    </nav>

    <!-- Title & Actions -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Relatórios e Analytics</h1>
        <p class="text-lg text-gray-600">Análise completa de performance e vendas</p>
      </div>
      <div class="flex items-center space-x-3">
        <button 
          on:click={handleCustomPeriod}
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Período Personalizado
        </button>
        <button 
          on:click={handleExportPDF}
          class="inline-flex items-center px-4 py-2 bg-primary-500 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-sm"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Exportar PDF
        </button>
      </div>
    </div>
  </div>
</div>

<div class="space-y-8">
  <!-- Performance Overview Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- Vendas Este Mês -->
    <div class="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-white">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-primary-100 mb-2">Vendas Este Mês</p>
          <p class="text-3xl font-bold text-white">R$ 124,5K</p>
        </div>
        <div class="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-300 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-200 font-semibold">+26.8%</span>
        <span class="text-primary-100 ml-1">vs mês anterior</span>
      </div>
    </div>
    
    <!-- Pedidos Totais -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Pedidos Totais</p>
          <p class="text-3xl font-bold text-gray-900">1,543</p>
        </div>
        <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-600 font-semibold">+18%</span>
        <span class="text-gray-500 ml-1">este mês</span>
      </div>
    </div>

    <!-- Produtos Ativos -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Produtos Ativos</p>
          <p class="text-3xl font-bold text-gray-900">2,234</p>
        </div>
        <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-600 font-semibold">+12%</span>
        <span class="text-gray-500 ml-1">este mês</span>
      </div>
    </div>

    <!-- Usuários Ativos -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Usuários Ativos</p>
          <p class="text-3xl font-bold text-gray-900">1,234</p>
        </div>
        <div class="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-600 font-semibold">+8%</span>
        <span class="text-gray-500 ml-1">este mês</span>
      </div>
    </div>
  </div>

  <!-- Charts Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Sales Chart -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
        <h3 class="text-xl font-semibold text-gray-900">Vendas por Período</h3>
      </div>
      <div class="p-6">
        <div class="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
          <div class="text-center">
            <svg class="w-16 h-16 text-primary-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-lg font-medium text-gray-700 mb-2">Gráfico de vendas será implementado aqui</p>
            <p class="text-sm text-gray-500">Integração com Chart.js ou similar</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Top Products -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
        <h3 class="text-xl font-semibold text-gray-900">Produtos Mais Vendidos</h3>
      </div>
      <div class="p-6">
        <div class="space-y-4">
          {#each topProducts as product, index}
            <div class="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-lg">
                  {product.image}
                </div>
                <div>
                  <div class="font-medium text-gray-900">{product.name}</div>
                  <div class="text-sm text-gray-500">{product.sales} vendas</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-medium text-gray-900">{formatPrice(product.revenue)}</div>
                <div class="text-sm text-green-600">+{product.growth}%</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Reports Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {#each reportData as report}
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center">
        <h4 class="text-lg font-semibold text-gray-900 mb-3">{report.name}</h4>
        <div class="text-3xl font-bold text-primary-600 mb-3">{report.value}</div>
        <div class="flex items-center justify-center text-sm">
          {#if report.type === 'positive'}
            <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
            </svg>
            <span class="text-green-600 font-semibold">{report.change}</span>
          {:else}
            <svg class="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
            </svg>
            <span class="text-red-600 font-semibold">{report.change}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Detailed Reports -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
      <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
        <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <h4 class="text-lg font-semibold text-gray-900 mb-2">Relatório Financeiro</h4>
      <p class="text-gray-600 text-sm mb-4">Análise completa de receitas, despesas e lucros</p>
      <button 
        on:click={() => handleGenerateReport('financeiro')}
        class="btn btn-primary btn-sm"
      >
        Gerar Relatório
      </button>
    </div>
    
    <div class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
      <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
        <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
        </svg>
      </div>
      <h4 class="text-lg font-semibold text-gray-900 mb-2">Análise de Usuários</h4>
      <p class="text-gray-600 text-sm mb-4">Comportamento, engajamento e segmentação</p>
      <button 
        on:click={() => handleGenerateReport('usuarios')}
        class="btn btn-primary btn-sm"
      >
        Ver Análise
      </button>
    </div>
    
    <div class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
      <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
        <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      </div>
      <h4 class="text-lg font-semibold text-gray-900 mb-2">Performance de Produtos</h4>
      <p class="text-gray-600 text-sm mb-4">Ranking de vendas e análise de estoque</p>
      <button 
        on:click={() => handleGenerateReport('produtos')}
        class="btn btn-primary btn-sm"
      >
        Ver Performance
      </button>
    </div>
  </div>
</div>

<style>
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm;
  }
  
  .btn-primary {
    @apply bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm;
  }
  
  .btn-sm {
    @apply text-xs px-3 py-1.5;
  }
</style> 