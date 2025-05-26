<script lang="ts">
  // Dados mockados por enquanto
  const stats = {
    totalRevenue: 45678.90,
    totalOrders: 234,
    totalProducts: 567,
    totalUsers: 1234
  };

  type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered';

  const recentOrders: Array<{
    id: string;
    customer: string;
    total: number;
    status: OrderStatus;
    date: string;
  }> = [
    { id: '1', customer: 'João Silva', total: 299.90, status: 'processing', date: '2024-01-20' },
    { id: '2', customer: 'Maria Santos', total: 599.90, status: 'shipped', date: '2024-01-20' },
    { id: '3', customer: 'Pedro Oliveira', total: 199.90, status: 'delivered', date: '2024-01-19' },
    { id: '4', customer: 'Ana Costa', total: 899.90, status: 'pending', date: '2024-01-19' }
  ];

  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800'
  };
</script>

<svelte:head>
  <title>Dashboard - Admin Panel</title>
</svelte:head>

<div class="min-h-screen bg-gray-100">
  <!-- Header -->
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-6">
        <h1 class="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Novo Produto
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
              R$ {stats.totalRevenue.toFixed(2).replace('.', ',')}
            </p>
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
            <p class="text-sm font-medium text-gray-600">Total de Pedidos</p>
            <p class="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="flex-1">
            <p class="text-sm font-medium text-gray-600">Total de Produtos</p>
            <p class="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
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
            <p class="text-sm font-medium text-gray-600">Total de Usuários</p>
            <p class="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
          </div>
          <div class="p-3 bg-orange-100 rounded-full">
            <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="bg-white shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Pedidos Recentes</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each recentOrders as order}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{order.id}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.customer}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  R$ {order.total.toFixed(2).replace('.', ',')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full {statusColors[order.status]}">
                    {order.status}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.date}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a href="/pedidos/{order.id}" class="text-blue-600 hover:text-blue-900">
                    Ver detalhes
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </main>
</div>
