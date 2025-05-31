<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  const products = [
    { 
      id: 1, 
      name: 'Smartphone Galaxy A54', 
      category: 'Eletrônicos', 
      price: 'R$ 1.899,00', 
      stock: 45, 
      status: 'Ativo',
      image: '/placeholder.jpg',
      seller: 'TechStore GDG'
    },
    { 
      id: 2, 
      name: 'Tênis Nike Air Max', 
      category: 'Calçados', 
      price: 'R$ 449,90', 
      stock: 12, 
      status: 'Ativo',
      image: '/placeholder.jpg',
      seller: 'SportsWorld'
    },
    { 
      id: 3, 
      name: 'Livro Clean Code', 
      category: 'Livros', 
      price: 'R$ 89,90', 
      stock: 0, 
      status: 'Inativo',
      image: '/placeholder.jpg',
      seller: 'BookCenter'
    },
  ];
</script>

<div class="page-header">
  <div>
    <h1 class="page-title">Produtos</h1>
    <p class="page-subtitle">Gerencie todos os produtos da plataforma</p>
  </div>
  <div class="flex space-x-3">
    <button class="btn btn-secondary">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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
<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">2,543</div>
        <div class="stat-label">Total Produtos</div>
      </div>
      <div class="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+18% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">2,234</div>
        <div class="stat-label">Ativos</div>
      </div>
      <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+12% este mês</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">309</div>
        <div class="stat-label">Sem Estoque</div>
      </div>
      <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.73-.833-2.5 0L5.314 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
      </div>
    </div>
    <div class="stat-change negative">+45 hoje</div>
  </div>
  
  <div class="stat-card">
    <div class="flex items-center justify-between">
      <div>
        <div class="stat-value">R$ 45.2K</div>
        <div class="stat-label">Valor Total</div>
      </div>
      <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
        <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
        </svg>
      </div>
    </div>
    <div class="stat-change positive">+8% este mês</div>
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
        <input type="text" placeholder="Nome do produto" class="input">
      </div>
      <div>
        <label class="label">Categoria</label>
        <select class="input">
          <option>Todas</option>
          <option>Eletrônicos</option>
          <option>Calçados</option>
          <option>Livros</option>
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
      <div>
        <label class="label">Vendedor</label>
        <select class="input">
          <option>Todos</option>
          <option>TechStore GDG</option>
          <option>SportsWorld</option>
        </select>
      </div>
      <div class="flex items-end">
        <button class="btn btn-primary mr-2">Filtrar</button>
        <button class="btn btn-secondary">Limpar</button>
      </div>
    </div>
  </div>
</div>

<!-- Grid de Produtos -->
<div class="card">
  <div class="card-header">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">Lista de Produtos</h3>
      <div class="flex space-x-2">
        <button class="btn btn-sm btn-secondary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-secondary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
  <div class="card-body p-0">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th>Vendedor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each products as product}
            <tr>
              <td>
                <div class="flex items-center space-x-4">
                  <img src={product.image} alt={product.name} class="w-12 h-12 rounded-lg object-cover bg-gray-100">
                  <div>
                    <div class="font-medium text-gray-900">{product.name}</div>
                    <div class="text-sm text-gray-500">ID: {product.id}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge badge-info">{product.category}</span>
              </td>
              <td class="font-medium text-gray-900">{product.price}</td>
              <td>
                <span class="badge {product.stock > 0 ? 'badge-success' : 'badge-danger'}">
                  {product.stock > 0 ? `${product.stock} unidades` : 'Sem estoque'}
                </span>
              </td>
              <td class="text-gray-600">{product.seller}</td>
              <td>
                <span class="badge {product.status === 'Ativo' ? 'badge-success' : 'badge-danger'}">
                  {product.status}
                </span>
              </td>
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
      <span class="text-sm text-gray-600">Mostrando 1-3 de 2,543 produtos</span>
      <div class="flex space-x-2">
        <button class="btn btn-sm btn-secondary">Anterior</button>
        <button class="btn btn-sm btn-primary">Próximo</button>
      </div>
    </div>
  </div>
</div> 