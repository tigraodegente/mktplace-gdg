<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  const orders = [
    { 
      id: '#12345', 
      customer: 'Ana Silva', 
      items: 3, 
      total: 'R$ 2.349,00', 
      status: 'Pendente', 
      date: '2024-01-20',
      payment: 'Cartão de Crédito'
    },
    { 
      id: '#12344', 
      customer: 'Carlos Santos', 
      items: 1, 
      total: 'R$ 449,90', 
      status: 'Enviado', 
      date: '2024-01-19',
      payment: 'PIX'
    },
    { 
      id: '#12343', 
      customer: 'Maria Costa', 
      items: 2, 
      total: 'R$ 179,80', 
      status: 'Entregue', 
      date: '2024-01-18',
      payment: 'Boleto'
    },
  ];
</script>

<div class="page-header">
  <div>
    <h1 class="page-title">Pedidos</h1>
    <p class="page-subtitle">Gerencie todos os pedidos da plataforma</p>
  </div>
  <div class="flex space-x-3">
    <button class="btn btn-secondary">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Exportar Relatório
    </button>
  </div>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">1,543</div>
        <div class="stat-label">Total Pedidos</div>
      </div>
      <div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+25% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">234</div>
        <div class="stat-label">Pendentes</div>
      </div>
      <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change negative">+8 hoje</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">1,234</div>
        <div class="stat-label">Entregues</div>
      </div>
      <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+18% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">R$ 124.5K</div>
        <div class="stat-label">Faturamento</div>
      </div>
      <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+32% este mês</div>
  </div>
</div>

<!-- Filtros -->
<div class="card mb-6">
  <div class="card-header">
    <h3 class="text-lg font-semibold text-gray-900">Filtros</h3>
  </div>
  <div class="card-body">
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label class="label">Buscar</label>
        <input type="text" placeholder="ID ou cliente" class="input">
      </div>
      <div>
        <label class="label">Status</label>
        <select class="input">
          <option>Todos</option>
          <option>Pendente</option>
          <option>Processando</option>
          <option>Enviado</option>
          <option>Entregue</option>
          <option>Cancelado</option>
        </select>
      </div>
      <div>
        <label class="label">Período</label>
        <select class="input">
          <option>Últimos 7 dias</option>
          <option>Últimos 30 dias</option>
          <option>Últimos 90 dias</option>
          <option>Este ano</option>
        </select>
      </div>
      <div>
        <label class="label">Pagamento</label>
        <select class="input">
          <option>Todos</option>
          <option>PIX</option>
          <option>Cartão de Crédito</option>
          <option>Boleto</option>
        </select>
      </div>
      <div class="flex items-end">
        <button class="btn btn-primary mr-2">Filtrar</button>
        <button class="btn btn-secondary">Limpar</button>
      </div>
    </div>
  </div>
</div>

<!-- Tabela de Pedidos -->
<div class="card">
  <div class="card-header">
    <h3 class="text-lg font-semibold text-gray-900">Lista de Pedidos</h3>
  </div>
  <div class="card-body p-0">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Itens</th>
            <th>Total</th>
            <th>Pagamento</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each orders as order}
            <tr>
              <td>
                <div class="font-medium text-cyan-600">{order.id}</div>
              </td>
              <td>
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-medium text-sm">{order.customer.charAt(0)}</span>
                  </div>
                  <span class="font-medium text-gray-900">{order.customer}</span>
                </div>
              </td>
              <td class="text-gray-600">{order.items} itens</td>
              <td class="font-medium text-gray-900">{order.total}</td>
              <td class="text-gray-600">{order.payment}</td>
              <td>
                <span class="badge {
                  order.status === 'Entregue' ? 'badge-success' : 
                  order.status === 'Enviado' ? 'badge-info' : 
                  order.status === 'Pendente' ? 'badge-warning' : 
                  'badge-danger'
                }">
                  {order.status}
                </span>
              </td>
              <td class="text-gray-600">{order.date}</td>
              <td>
                <div class="flex items-center space-x-2">
                  <button class="btn btn-sm btn-secondary">Ver</button>
                  <button class="btn btn-sm btn-primary">Atualizar</button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
  <div class="card-footer">
    <div class="flex items-center justify-between">
      <span class="text-sm text-gray-600">Mostrando 1-3 de 1,543 pedidos</span>
      <div class="flex space-x-2">
        <button class="btn btn-sm btn-secondary">Anterior</button>
        <button class="btn btn-sm btn-primary">Próximo</button>
      </div>
    </div>
  </div>
</div>

<!-- Actions Cards -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
  <div class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Pedidos Pendentes</h4>
      <p class="text-gray-600 mt-1">234 pedidos aguardando processamento</p>
      <button class="btn btn-sm btn-primary mt-3">Processar Agora</button>
    </div>
  </div>
  
  <div class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Etiquetas de Envio</h4>
      <p class="text-gray-600 mt-1">Gerar etiquetas para pedidos aprovados</p>
      <button class="btn btn-sm btn-primary mt-3">Gerar Etiquetas</button>
    </div>
  </div>
  
  <div class="action-card">
    <div class="action-icon">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    </div>
    <div class="mt-4">
      <h4 class="text-lg font-semibold text-gray-900">Relatório de Vendas</h4>
      <p class="text-gray-600 mt-1">Análise detalhada das vendas mensais</p>
      <button class="btn btn-sm btn-primary mt-3">Ver Relatório</button>
    </div>
  </div>
</div> 