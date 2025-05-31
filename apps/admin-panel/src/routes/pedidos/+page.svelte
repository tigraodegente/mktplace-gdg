<script lang="ts">
  // Interface para tipagem
  interface Order {
    id: number;
    customer: string;
    email: string;
    status: string;
    total: number;
    items: number;
    created: string;
    payment: string;
  }

  // Mock data - seria substituído por dados reais da API
  const orders: Order[] = [
    { 
      id: 12345, 
      customer: 'João Silva', 
      email: 'joao@email.com',
      status: 'Processando', 
      total: 2999.99, 
      items: 2,
      created: '2024-01-15',
      payment: 'Cartão de Crédito'
    },
    { 
      id: 12346, 
      customer: 'Maria Santos', 
      email: 'maria@email.com',
      status: 'Enviado', 
      total: 1299.99, 
      items: 1,
      created: '2024-01-14',
      payment: 'PIX'
    },
    { 
      id: 12347, 
      customer: 'Pedro Costa', 
      email: 'pedro@email.com',
      status: 'Entregue', 
      total: 849.99, 
      items: 3,
      created: '2024-01-12',
      payment: 'Boleto'
    },
    { 
      id: 12348, 
      customer: 'Ana Oliveira', 
      email: 'ana@email.com',
      status: 'Cancelado', 
      total: 599.99, 
      items: 1,
      created: '2024-01-10',
      payment: 'Cartão de Débito'
    },
  ];

  let searchTerm = '';
  let selectedStatus = '';
  let selectedPayment = '';

  // Filtros reativos
  $: filteredOrders = orders.filter(order => {
    return (
      (searchTerm === '' || order.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
       order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.id.toString().includes(searchTerm)) &&
      (selectedStatus === '' || order.status === selectedStatus) &&
      (selectedPayment === '' || order.payment === selectedPayment)
    );
  });

  function getStatusBadgeClass(status: string): string {
    const classes = {
      'Processando': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Enviado': 'bg-blue-100 text-blue-800 border-blue-200',
      'Entregue': 'bg-green-100 text-green-800 border-green-200',
      'Cancelado': 'bg-red-100 text-red-800 border-red-200'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function formatPrice(price: number): string {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  function handleViewOrder(order: Order): void {
    console.log('Ver detalhes', order);
  }

  function handleEditOrder(order: Order): void {
    console.log('Editar', order);
  }

  function handleCancelOrder(order: Order): void {
    console.log('Cancelar', order);
  }

  function handleExport(): void {
    console.log('Exportar dados');
  }
</script>

<svelte:head>
  <title>Pedidos - Admin Panel</title>
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
          <span class="text-gray-900 font-medium">Pedidos</span>
        </li>
      </ol>
    </nav>

    <!-- Title & Actions -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Gestão de Pedidos</h1>
        <p class="text-lg text-gray-600">Monitore e processe todos os pedidos do marketplace</p>
      </div>
      <div class="flex items-center space-x-3">
        <button 
          on:click={handleExport}
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Exportar
        </button>
        <button 
          class="inline-flex items-center px-4 py-2 bg-primary-500 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-sm"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Atualizar
        </button>
      </div>
    </div>
  </div>
</div>
  
<div class="space-y-8">
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Pedidos Hoje</p>
          <p class="text-3xl font-bold text-gray-900">89</p>
        </div>
        <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-600 font-semibold">+25%</span>
        <span class="text-gray-500 ml-1">vs. ontem</span>
      </div>
    </div>
  
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Processando</p>
          <p class="text-3xl font-bold text-gray-900">156</p>
        </div>
        <div class="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-orange-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
        <span class="text-orange-600 font-semibold">Requer atenção</span>
      </div>
    </div>
  
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Entregues</p>
          <p class="text-3xl font-bold text-gray-900">1,456</p>
        </div>
        <div class="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
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

    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-white">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-purple-100 mb-2">Faturamento</p>
          <p class="text-3xl font-bold text-white">R$ 124.5K</p>
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
        <span class="text-green-200 font-semibold">+32%</span>
        <span class="text-purple-100 ml-1">este mês</span>
      </div>
    </div>
  </div>

  <!-- Advanced Table -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <!-- Table Header -->
    <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-semibold text-gray-900">Lista de Pedidos</h3>
          <p class="text-sm text-gray-600 mt-1">Todos os pedidos realizados na plataforma</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
              type="text" 
              bind:value={searchTerm}
              placeholder="Buscar pedidos..."
              class="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200"
            />
          </div>
        </div>
        <div class="flex gap-3">
          <select 
            bind:value={selectedStatus}
            class="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200 min-w-[150px]"
          >
            <option value="">Todos os Status</option>
            <option value="Processando">Processando</option>
            <option value="Enviado">Enviado</option>
            <option value="Entregue">Entregue</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <select 
            bind:value={selectedPayment}
            class="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200 min-w-[150px]"
          >
            <option value="">Todas as Formas</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
            <option value="PIX">PIX</option>
            <option value="Boleto">Boleto</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50/50">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pedido</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pagamento</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data</th>
            <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each filteredOrders as order}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="font-medium text-gray-900">#{order.id}</div>
                  <div class="text-sm text-gray-500">{order.items} {order.items > 1 ? 'itens' : 'item'}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="font-medium text-gray-900">{order.customer}</div>
                  <div class="text-sm text-gray-500">{order.email}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 text-xs font-medium rounded-full border {getStatusBadgeClass(order.status)}">
                  {order.status}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatPrice(order.total)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {order.payment}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {formatDate(order.created)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    on:click={() => handleViewOrder(order)}
                    class="inline-flex items-center px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                  >
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    Ver
                  </button>
                  <button 
                    on:click={() => handleEditOrder(order)}
                    class="inline-flex items-center px-3 py-1 border border-blue-300 rounded-lg text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Editar
                  </button>
                  {#if order.status !== 'Cancelado' && order.status !== 'Entregue'}
                    <button 
                      on:click={() => handleCancelOrder(order)}
                      class="inline-flex items-center px-3 py-1 border border-red-300 rounded-lg text-xs font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                    >
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      Cancelar
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Table Footer -->
    <div class="px-6 py-4 bg-gray-50/30 border-t border-gray-100">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-600">
          Mostrando {filteredOrders.length} de {orders.length} pedidos
        </div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            Anterior
          </button>
          <button class="px-3 py-1 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors">
            1
          </button>
          <button class="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            Próximo
          </button>
        </div>
      </div>
    </div>
  </div>
</div> 