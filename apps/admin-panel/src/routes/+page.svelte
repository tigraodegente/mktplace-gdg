<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  const dashboardStats = [
    { label: 'Total de Usuários', value: '1,234', change: '+12%', trend: 'up', icon: 'users' },
    { label: 'Produtos Ativos', value: '2,543', change: '+18%', trend: 'up', icon: 'products' },
    { label: 'Pedidos Hoje', value: '89', change: '+25%', trend: 'up', icon: 'orders' },
    { label: 'Faturamento Mensal', value: 'R$ 124.5K', change: '+32%', trend: 'up', icon: 'revenue' },
  ];
  
  const recentActivity = [
    { type: 'user', message: 'Novo usuário cadastrado: João Silva', time: '2 min atrás' },
    { type: 'order', message: 'Pedido #12345 foi processado', time: '5 min atrás' },
    { type: 'product', message: 'Produto "Smartphone" foi atualizado', time: '10 min atrás' },
    { type: 'system', message: 'Backup do sistema realizado', time: '1 hora atrás' },
  ];
</script>

<svelte:head>
  <title>Dashboard - Admin Panel</title>
</svelte:head>

<!-- Page Header -->
<div class="page-header">
  <div>
    <h1 class="page-title">Dashboard</h1>
    <p class="page-subtitle">Visão geral do marketplace</p>
  </div>
  <div class="flex space-x-3">
    <button class="btn btn-secondary">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Atualizar
    </button>
    <button class="btn btn-primary">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Relatório
    </button>
  </div>
</div>

<!-- Stats Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {#each dashboardStats as stat}
    <div class="stat-card">
      <div class="flex items-center justify-between">
        <div>
          <div class="stat-value">{stat.value}</div>
          <div class="stat-label">{stat.label}</div>
        </div>
        <div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
          {#if stat.icon === 'users'}
            <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          {:else if stat.icon === 'products'}
            <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          {:else if stat.icon === 'orders'}
            <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          {:else}
            <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
          {/if}
        </div>
      </div>
      <div class="stat-change positive">{stat.change} este mês</div>
    </div>
  {/each}
</div>

<!-- Content Grid -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
  
  <!-- Chart Placeholder -->
  <div class="lg:col-span-2">
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">Vendas dos Últimos 30 Dias</h3>
      </div>
      <div class="card-body">
        <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div class="text-center">
            <svg class="w-16 h-16 text-cyan-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-gray-600">Gráfico será implementado aqui</p>
            <p class="text-sm text-gray-500 mt-1">Integração com Chart.js ou similar</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Recent Activity -->
  <div class="lg:col-span-1">
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">Atividade Recente</h3>
      </div>
      <div class="card-body">
        <div class="space-y-4">
          {#each recentActivity as activity}
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                {#if activity.type === 'user'}
                  <svg class="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                {:else if activity.type === 'order'}
                  <svg class="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                {:else if activity.type === 'product'}
                  <svg class="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                {:else}
                  <svg class="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
                  </svg>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900">{activity.message}</p>
                <p class="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-sm btn-secondary w-full">Ver Todas as Atividades</button>
      </div>
    </div>
  </div>
</div>

<!-- Quick Actions -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <a href="/usuarios" class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Gerenciar Usuários</h4>
      <p class="text-gray-600 mt-1">Administrar usuários, vendedores e permissões</p>
    </div>
  </a>
  
  <a href="/produtos" class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Produtos</h4>
      <p class="text-gray-600 mt-1">Moderar e gerenciar todos os produtos</p>
    </div>
  </a>
  
  <a href="/pedidos" class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Pedidos</h4>
      <p class="text-gray-600 mt-1">Monitorar e processar pedidos</p>
    </div>
  </a>
  
  <a href="/relatorios" class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Relatórios</h4>
      <p class="text-gray-600 mt-1">Analytics e performance</p>
    </div>
  </a>
</div> 