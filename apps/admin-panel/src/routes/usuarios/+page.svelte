<script lang="ts">
  // Interface para tipagem
  interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    created: string;
    avatar: string;
  }

  // Mock data - seria substituído por dados reais da API
  const users: User[] = [
    { 
      id: 1, 
      name: 'João Silva', 
      email: 'joao@email.com', 
      role: 'Cliente', 
      status: 'Ativo', 
      created: '2024-01-15',
      avatar: 'https://ui-avatars.com/api/?name=João+Silva&background=00BFB3&color=fff'
    },
    { 
      id: 2, 
      name: 'Maria Santos', 
      email: 'maria@email.com', 
      role: 'Vendedor', 
      status: 'Ativo', 
      created: '2024-01-10',
      avatar: 'https://ui-avatars.com/api/?name=Maria+Santos&background=00BFB3&color=fff'
    },
    { 
      id: 3, 
      name: 'Pedro Costa', 
      email: 'pedro@email.com', 
      role: 'Admin', 
      status: 'Inativo', 
      created: '2024-01-05',
      avatar: 'https://ui-avatars.com/api/?name=Pedro+Costa&background=00BFB3&color=fff'
    },
  ];

  let searchTerm = '';
  let selectedRole = '';
  let selectedStatus = '';

  // Filtros reativos
  $: filteredUsers = users.filter(user => {
    return (
      (searchTerm === '' || user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedRole === '' || user.role === selectedRole) &&
      (selectedStatus === '' || user.status === selectedStatus)
    );
  });

  function getRoleBadgeClass(role: string): string {
    const classes = {
      'Admin': 'bg-red-100 text-red-800 border-red-200',
      'Vendedor': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Cliente': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return classes[role as keyof typeof classes] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function getStatusBadgeClass(status: string): string {
    return status === 'Ativo' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  function handleEditUser(user: User): void {
    console.log('Editar', user);
  }

  function handleDeleteUser(user: User): void {
    console.log('Excluir', user);
  }

  function handleCreateUser(): void {
    console.log('Criar novo usuário');
  }

  function handleExport(): void {
    console.log('Exportar dados');
  }
</script>

<svelte:head>
  <title>Usuários - Admin Panel</title>
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
          <span class="text-gray-900 font-medium">Usuários</span>
        </li>
      </ol>
    </nav>

    <!-- Title & Actions -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Gestão de Usuários</h1>
        <p class="text-lg text-gray-600">Gerencie todos os usuários da plataforma</p>
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
          on:click={handleCreateUser}
          class="inline-flex items-center px-4 py-2 bg-primary-500 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-sm"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Novo Usuário
        </button>
      </div>
    </div>
  </div>
</div>

<div class="space-y-8">
  <!-- Stats Cards Melhorados -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Total de Usuários</p>
          <p class="text-3xl font-bold text-gray-900">1,234</p>
        </div>
        <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-600 font-semibold">+12%</span>
        <span class="text-gray-500 ml-1">vs. mês anterior</span>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Usuários Ativos</p>
          <p class="text-3xl font-bold text-gray-900">1,089</p>
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
        <span class="text-green-600 font-semibold">+5%</span>
        <span class="text-gray-500 ml-1">vs. mês anterior</span>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-gray-600 mb-2">Vendedores</p>
          <p class="text-3xl font-bold text-gray-900">89</p>
        </div>
        <div class="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-600 font-semibold">+2%</span>
        <span class="text-gray-500 ml-1">vs. mês anterior</span>
      </div>
    </div>

    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-white">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-sm font-medium text-purple-100 mb-2">Novos Hoje</p>
          <p class="text-3xl font-bold text-white">23</p>
        </div>
        <div class="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
          </svg>
        </div>
      </div>
      <div class="flex items-center text-sm">
        <svg class="w-4 h-4 text-green-300 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
        </svg>
        <span class="text-green-200 font-semibold">+15%</span>
        <span class="text-purple-100 ml-1">vs. ontem</span>
      </div>
    </div>
  </div>

  <!-- Advanced Table -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <!-- Table Header -->
    <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-semibold text-gray-900">Lista de Usuários</h3>
          <p class="text-sm text-gray-600 mt-1">Todos os usuários cadastrados na plataforma</p>
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
              placeholder="Buscar usuários..."
              class="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200"
            />
          </div>
        </div>
        <div class="flex gap-3">
          <select 
            bind:value={selectedRole}
            class="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200 min-w-[150px]"
          >
            <option value="">Todas as Funções</option>
            <option value="Cliente">Cliente</option>
            <option value="Vendedor">Vendedor</option>
            <option value="Admin">Admin</option>
          </select>
          <select 
            bind:value={selectedStatus}
            class="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200 min-w-[150px]"
          >
            <option value="">Todos os Status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50/50">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuário</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Função</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Criado em</th>
            <th class="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each filteredUsers as user}
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-3">
                  <img src={user.avatar} alt={user.name} class="w-10 h-10 rounded-full ring-2 ring-gray-100">
                  <div>
                    <div class="font-medium text-gray-900">{user.name}</div>
                    <div class="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 text-xs font-medium rounded-full border {getRoleBadgeClass(user.role)}">
                  {user.role}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 text-xs font-medium rounded-full border {getStatusBadgeClass(user.status)}">
                  {user.status}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {formatDate(user.created)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    on:click={() => handleEditUser(user)}
                    class="inline-flex items-center px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                  >
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Editar
                  </button>
                  <button 
                    on:click={() => handleDeleteUser(user)}
                    class="inline-flex items-center px-3 py-1 border border-red-300 rounded-lg text-xs font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                  >
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Excluir
                  </button>
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
          Mostrando {filteredUsers.length} de {users.length} usuários
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