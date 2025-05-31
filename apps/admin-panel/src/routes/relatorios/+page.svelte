<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  const salesData = {
    thisMonth: 124500,
    lastMonth: 98200,
    growth: 26.8
  };
  
  const reportData = [
    { name: 'Vendas por Categoria', value: 'R$ 45.2K', change: '+12%', type: 'positive' },
    { name: 'Produtos Mais Vendidos', value: '234 itens', change: '+8%', type: 'positive' },
    { name: 'Taxa de Conversão', value: '3.2%', change: '-0.5%', type: 'negative' },
    { name: 'Ticket Médio', value: 'R$ 289', change: '+15%', type: 'positive' },
  ];
</script>

<div class="page-header">
  <div>
    <h1 class="page-title">Relatórios</h1>
    <p class="page-subtitle">Análise completa de performance e vendas</p>
  </div>
  <div class="flex space-x-3">
    <button class="btn btn-secondary">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      Período Personalizado
    </button>
    <button class="btn btn-primary">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Exportar PDF
    </button>
  </div>
</div>

<!-- Performance Overview -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">R$ 124.5K</div>
        <div class="stat-label">Vendas Este Mês</div>
      </div>
      <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+26.8% vs mês anterior</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">1,543</div>
        <div class="stat-label">Pedidos Totais</div>
      </div>
      <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+18% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">2,234</div>
        <div class="stat-label">Produtos Ativos</div>
      </div>
      <div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+12% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">1,234</div>
        <div class="stat-label">Usuários Ativos</div>
      </div>
      <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+8% este mês</div>
  </div>
</div>

<!-- Charts Section -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <!-- Sales Chart -->
  <div class="card">
    <div class="card-header">
      <h3 class="text-lg font-semibold text-gray-900">Vendas por Período</h3>
    </div>
    <div class="card-body">
      <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div class="text-center">
          <svg class="w-16 h-16 text-cyan-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <p class="text-gray-600">Gráfico de vendas será implementado aqui</p>
          <p class="text-sm text-gray-500 mt-1">Integração com biblioteca de charts</p>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Top Products -->
  <div class="card">
    <div class="card-header">
      <h3 class="text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h3>
    </div>
    <div class="card-body">
      <div class="space-y-4">
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg"></div>
            <div>
              <div class="font-medium text-gray-900">Smartphone Galaxy A54</div>
              <div class="text-sm text-gray-500">234 vendas</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-900">R$ 89.2K</div>
            <div class="text-sm text-green-600">+15%</div>
          </div>
        </div>
        
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg"></div>
            <div>
              <div class="font-medium text-gray-900">Tênis Nike Air Max</div>
              <div class="text-sm text-gray-500">189 vendas</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-900">R$ 67.4K</div>
            <div class="text-sm text-green-600">+12%</div>
          </div>
        </div>
        
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg"></div>
            <div>
              <div class="font-medium text-gray-900">Livro Clean Code</div>
              <div class="text-sm text-gray-500">156 vendas</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-900">R$ 14.0K</div>
            <div class="text-sm text-green-600">+8%</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Reports Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {#each reportData as report}
    <div class="card hover-lift">
      <div class="card-body text-center">
        <h4 class="text-lg font-semibold text-gray-900 mb-2">{report.name}</h4>
        <div class="text-3xl font-bold text-cyan-600 mb-2">{report.value}</div>
        <div class="stat-change {report.type}">{report.change}</div>
      </div>
    </div>
  {/each}
</div>

<!-- Detailed Reports -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Relatório Financeiro</h4>
      <p class="text-gray-600 mt-1">Análise completa de receitas, despesas e lucros</p>
      <button class="btn btn-sm btn-primary mt-3">Gerar Relatório</button>
    </div>
  </div>
  
  <div class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Análise de Usuários</h4>
      <p class="text-gray-600 mt-1">Comportamento, engajamento e segmentação</p>
      <button class="btn btn-sm btn-primary mt-3">Ver Análise</button>
    </div>
  </div>
  
  <div class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Performance de Produtos</h4>
      <p class="text-gray-600 mt-1">Ranking de vendas e análise de estoque</p>
      <button class="btn btn-sm btn-primary mt-3">Ver Performance</button>
    </div>
  </div>
</div> 