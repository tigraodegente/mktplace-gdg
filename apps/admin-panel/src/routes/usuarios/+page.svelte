<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  const users = [
    { id: 1, name: 'João Silva', email: 'joao@email.com', role: 'Cliente', status: 'Ativo', created: '2024-01-15' },
    { id: 2, name: 'Maria Santos', email: 'maria@email.com', role: 'Vendedor', status: 'Ativo', created: '2024-01-10' },
    { id: 3, name: 'Pedro Costa', email: 'pedro@email.com', role: 'Admin', status: 'Inativo', created: '2024-01-05' },
  ];
</script>

<div class="page-header">
  <div>
    <h1 class="page-title">Usuários</h1>
    <p class="page-subtitle">Gerencie todos os usuários da plataforma</p>
  </div>
  <button class="btn btn-primary">
    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
    </svg>
    Novo Usuário
  </button>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">1,234</div>
        <div class="stat-label">Total Usuários</div>
      </div>
      <div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+12% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">456</div>
        <div class="stat-label">Ativos</div>
      </div>
      <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+5% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">89</div>
        <div class="stat-label">Vendedores</div>
      </div>
      <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+2% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">23</div>
        <div class="stat-label">Novos Hoje</div>
      </div>
      <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+15% hoje</div>
  </div>
</div>

<!-- Filtros -->
<div class="card mb-6">
  <div class="card-header">
    <h3 class="text-lg font-semibold text-gray-900">Filtros</h3>
  </div>
  <div class="card-body">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="label">Buscar</label>
        <input type="text" placeholder="Nome ou email" class="input">
      </div>
      <div>
        <label class="label">Role</label>
        <select class="input">
          <option>Todos</option>
          <option>Cliente</option>
          <option>Vendedor</option>
          <option>Admin</option>
        </select>
      </div>
      <div>
        <label class="label">Status</label>
        <select class="input">
          <option>Todos</option>
          <option>Ativo</option>
          <option>Inativo</option>
        </select>
      </div>
      <div class="flex items-end">
        <button class="btn btn-primary mr-2">Filtrar</button>
        <button class="btn btn-secondary">Limpar</button>
      </div>
    </div>
  </div>
</div>

<!-- Tabela de Usuários -->
<div class="card">
  <div class="card-header">
    <h3 class="text-lg font-semibold text-gray-900">Lista de Usuários</h3>
  </div>
  <div class="card-body p-0">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Criado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each users as user}
            <tr>
              <td>
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-medium text-sm">{user.name.charAt(0)}</span>
                  </div>
                  <span class="font-medium text-gray-900">{user.name}</span>
                </div>
              </td>
              <td class="text-gray-600">{user.email}</td>
              <td>
                <span class="badge {user.role === 'Admin' ? 'badge-danger' : user.role === 'Vendedor' ? 'badge-warning' : 'badge-info'}">
                  {user.role}
                </span>
              </td>
              <td>
                <span class="badge {user.status === 'Ativo' ? 'badge-success' : 'badge-danger'}">
                  {user.status}
                </span>
              </td>
              <td class="text-gray-600">{user.created}</td>
              <td>
                <div class="flex items-center space-x-2">
                  <button class="btn btn-sm btn-secondary">Editar</button>
                  <button class="btn btn-sm btn-danger">Excluir</button>
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
      <span class="text-sm text-gray-600">Mostrando 1-3 de 1,234 usuários</span>
      <div class="flex space-x-2">
        <button class="btn btn-sm btn-secondary">Anterior</button>
        <button class="btn btn-sm btn-primary">Próximo</button>
      </div>
    </div>
  </div>
</div> 