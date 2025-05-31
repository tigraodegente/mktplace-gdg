<script lang="ts">
  import { RichPageHeader, RichStatsCard } from '@mktplace/ui';

  // Mock data - seria substituído por dados reais da API
  const dashboardStats = [
    { 
      title: 'Total de Usuários', 
      value: '1,234', 
      change: '+12% este mês', 
      changeType: 'positive' as const, 
      icon: 'users',
      href: '/usuarios'
    },
    { 
      title: 'Produtos Ativos', 
      value: '2,543', 
      change: '+18% este mês', 
      changeType: 'positive' as const, 
      icon: 'products',
      href: '/produtos'
    },
    { 
      title: 'Pedidos Hoje', 
      value: '89', 
      change: '+25% este mês', 
      changeType: 'positive' as const, 
      icon: 'orders',
      href: '/pedidos'
    },
    { 
      title: 'Faturamento Mensal', 
      value: 'R$ 124.5K', 
      change: '+32% este mês', 
      changeType: 'positive' as const, 
      icon: 'revenue',
      gradient: true
    },
  ];
  
  const recentActivity = [
    { type: 'user', message: 'Novo usuário cadastrado: João Silva', time: '2 min atrás', icon: 'user' },
    { type: 'order', message: 'Pedido #12345 foi processado', time: '5 min atrás', icon: 'orders' },
    { type: 'product', message: 'Produto "Smartphone" foi atualizado', time: '10 min atrás', icon: 'products' },
    { type: 'system', message: 'Backup do sistema realizado', time: '1 hora atrás', icon: 'settings' },
  ];

  const breadcrumbs = [
    { label: 'Admin Panel', href: '/' }
  ];

  const actions = [
    { 
      label: 'Atualizar', 
      icon: 'refresh', 
      variant: 'secondary' as const,
      onClick: () => window.location.reload()
    },
    { 
      label: 'Relatório', 
      icon: 'download', 
      variant: 'primary' as const,
      href: '/relatorios'
    }
  ];

  function handleActivityClick() {
    console.log('Ver todas as atividades');
  }
</script>

<svelte:head>
  <title>Dashboard - Admin Panel</title>
</svelte:head>

<RichPageHeader 
  title="Dashboard"
  subtitle="Visão geral do marketplace"
  {breadcrumbs}
  {actions}
/>

<!-- Stats Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {#each dashboardStats as stat}
    <RichStatsCard 
      title={stat.title}
      value={stat.value}
      change={stat.change}
      changeType={stat.changeType}
      icon={stat.icon}
      href={stat.href}
      gradient={stat.gradient || false}
    />
  {/each}
</div>

<!-- Content Grid -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
  
  <!-- Chart Section -->
  <div class="lg:col-span-2">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
        <h3 class="text-xl font-semibold text-gray-900">Vendas dos Últimos 30 Dias</h3>
      </div>
      <div class="p-6">
        <div class="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
          <div class="text-center">
            <svg class="w-16 h-16 text-primary-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p class="text-lg font-medium text-gray-700 mb-2">Gráfico será implementado aqui</p>
            <p class="text-sm text-gray-500">Integração com Chart.js ou similar</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Recent Activity -->
  <div class="lg:col-span-1">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
      <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
        <h3 class="text-xl font-semibold text-gray-900">Atividade Recente</h3>
      </div>
      <div class="p-6 flex-1">
        <div class="space-y-4">
          {#each recentActivity as activity}
            <div class="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                {#if activity.icon === 'user'}
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                {:else if activity.icon === 'orders'}
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                {:else if activity.icon === 'products'}
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                {:else}
                  <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                {/if}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{activity.message}</p>
                <p class="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div class="px-6 py-4 bg-gray-50/30 border-t border-gray-100">
        <button 
          on:click={handleActivityClick}
          class="w-full btn btn-secondary"
        >
          Ver Todas as Atividades
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Quick Actions -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <a href="/usuarios" class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
    <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
      <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
      </svg>
    </div>
    <h4 class="text-lg font-semibold text-gray-900 mb-2">Gerenciar Usuários</h4>
    <p class="text-gray-600 text-sm">Administrar usuários, vendedores e permissões</p>
  </a>
  
  <a href="/produtos" class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
    <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
      <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    </div>
    <h4 class="text-lg font-semibold text-gray-900 mb-2">Produtos</h4>
    <p class="text-gray-600 text-sm">Moderar e gerenciar todos os produtos</p>
  </a>
  
  <a href="/pedidos" class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
    <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
      <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
      </svg>
    </div>
    <h4 class="text-lg font-semibold text-gray-900 mb-2">Pedidos</h4>
    <p class="text-gray-600 text-sm">Monitorar e processar pedidos</p>
  </a>
  
  <a href="/relatorios" class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
    <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
      <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    </div>
    <h4 class="text-lg font-semibold text-gray-900 mb-2">Relatórios</h4>
    <p class="text-gray-600 text-sm">Analytics e performance</p>
  </a>
</div>

<style>
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm;
  }
  
  .btn-primary {
    @apply bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm;
  }
  
  .btn-secondary {
    @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border-gray-200;
  }
</style> 