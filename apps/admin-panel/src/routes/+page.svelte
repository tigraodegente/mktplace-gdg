<script lang="ts">
  // Dashboard profissional do Admin Panel
  
  // Mock data - seria substituído por dados reais da API
  const stats = [
    {
      label: 'Vendas Hoje',
      value: 'R$ 12.847',
      change: '+12%',
      changeType: 'positive',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
    },
    {
      label: 'Pedidos Pendentes',
      value: '24',
      change: '-8%',
      changeType: 'negative',
      icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
    },
    {
      label: 'Novos Usuários',
      value: '156',
      change: '+23%',
      changeType: 'positive',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
    },
    {
      label: 'Produtos Ativos',
      value: '1.234',
      change: '+5%',
      changeType: 'positive',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    }
  ];
  
  const recentOrders = [
    { id: '#1234', customer: 'João Silva', total: 'R$ 299,90', status: 'pending', time: '2 min' },
    { id: '#1235', customer: 'Maria Santos', total: 'R$ 156,50', status: 'confirmed', time: '5 min' },
    { id: '#1236', customer: 'Pedro Costa', total: 'R$ 89,90', status: 'shipped', time: '10 min' },
    { id: '#1237', customer: 'Ana Oliveira', total: 'R$ 234,80', status: 'delivered', time: '15 min' }
  ];
  
  function getStatusColor(status: string): string {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }
  
  function getStatusLabel(status: string): string {
    const labels = {
      'pending': 'Pendente',
      'confirmed': 'Confirmado',
      'shipped': 'Enviado',
      'delivered': 'Entregue'
    };
    return labels[status] || status;
  }
</script>

<svelte:head>
  <title>Dashboard - Admin Panel | Marketplace GDG</title>
</svelte:head>

<div class="space-y-8">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
      <p class="text-gray-600 mt-2">Visão geral das operações do marketplace</p>
    </div>
    <div class="flex space-x-3">
      <button class="btn btn-secondary">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Exportar
      </button>
      <button class="btn btn-primary">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Novo Produto
      </button>
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {#each stats as stat}
      <div class="card hover:shadow-lg transition-shadow">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">{stat.label}</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              <div class="flex items-center mt-2">
                <span class="text-sm font-medium {stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}">
                  {stat.change}
                </span>
                <span class="text-gray-500 text-sm ml-1">vs. mês passado</span>
              </div>
            </div>
            <div class="w-12 h-12 bg-[#00BFB3] bg-opacity-10 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={stat.icon}/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Recent Orders -->
  <div class="card">
    <div class="card-header">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Pedidos Recentes</h3>
        <a href="/admin/pedidos" class="text-[#00BFB3] hover:text-[#00A89D] text-sm font-medium">
          Ver todos
        </a>
      </div>
    </div>
    <div class="card-body p-0">
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Status</th>
              <th>Tempo</th>
            </tr>
          </thead>
          <tbody>
            {#each recentOrders as order}
              <tr class="hover:bg-gray-50">
                <td class="font-medium text-gray-900">{order.id}</td>
                <td>{order.customer}</td>
                <td class="font-semibold text-gray-900">{order.total}</td>
                <td>
                  <span class="badge {getStatusColor(order.status)}">
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td class="text-gray-500">{order.time} atrás</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="card">
    <div class="card-header">
      <h3 class="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
    </div>
    <div class="card-body">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/admin/produtos/novo" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
              <svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Novo Produto</p>
              <p class="text-sm text-gray-500">Adicionar item ao catálogo</p>
            </div>
          </div>
        </a>

        <a href="/admin/usuarios" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
              <svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Gerenciar Usuários</p>
              <p class="text-sm text-gray-500">Clientes e vendedores</p>
            </div>
          </div>
        </a>

        <a href="/admin/relatorios" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
              <svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Relatórios</p>
              <p class="text-sm text-gray-500">Análises e estatísticas</p>
            </div>
          </div>
        </a>

        <a href="/admin/configuracoes" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
              <svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Configurações</p>
              <p class="text-sm text-gray-500">Personalizar sistema</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  </div>
</div> 