<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	
	// Dados mockados
	const products = [
		{
			id: '1',
			name: 'Notebook Gamer Pro',
			sku: 'NTB-001',
			price: 4999.99,
			stock: 5,
			status: 'active',
			category: 'Eletrônicos',
			image: 'https://via.placeholder.com/150'
		},
		{
			id: '2',
			name: 'Mouse Wireless',
			sku: 'MSE-002',
			price: 99.99,
			stock: 15,
			status: 'active',
			category: 'Acessórios',
			image: 'https://via.placeholder.com/150'
		},
		{
			id: '3',
			name: 'Teclado Mecânico RGB',
			sku: 'TEC-003',
			price: 199.99,
			stock: 0,
			status: 'out_of_stock',
			category: 'Acessórios',
			image: 'https://via.placeholder.com/150'
		},
		{
			id: '4',
			name: 'Monitor 27" 4K',
			sku: 'MON-004',
			price: 1999.99,
			stock: 3,
			status: 'inactive',
			category: 'Eletrônicos',
			image: 'https://via.placeholder.com/150'
		}
	];
	
	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return 'badge-success';
			case 'inactive':
				return 'badge-warning';
			case 'out_of_stock':
				return 'badge-danger';
			default:
				return 'badge';
		}
	}
	
	function getStatusText(status: string) {
		switch (status) {
			case 'active':
				return 'Ativo';
			case 'inactive':
				return 'Inativo';
			case 'out_of_stock':
				return 'Sem Estoque';
			default:
				return status;
		}
	}
</script>

<svelte:head>
	<title>Produtos - Painel do Vendedor</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">Produtos</h1>
				<p class="text-gray-600 mt-1">Gerencie seus produtos e estoque</p>
			</div>
			<a href="/produtos/novo" class="btn btn-primary">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
				</svg>
				Adicionar Produto
			</a>
		</div>
	</div>
	
	<!-- Filtros -->
	<div class="card mb-6">
		<div class="card-body">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div>
					<label for="search" class="label">Buscar</label>
					<input 
						type="text" 
						id="search"
						class="input" 
						placeholder="Nome, SKU..."
					/>
				</div>
				<div>
					<label for="category" class="label">Categoria</label>
					<select id="category" class="input">
						<option value="">Todas</option>
						<option value="eletronicos">Eletrônicos</option>
						<option value="acessorios">Acessórios</option>
					</select>
				</div>
				<div>
					<label for="status" class="label">Status</label>
					<select id="status" class="input">
						<option value="">Todos</option>
						<option value="active">Ativo</option>
						<option value="inactive">Inativo</option>
						<option value="out_of_stock">Sem Estoque</option>
					</select>
				</div>
				<div class="flex items-end">
					<button class="btn btn-secondary w-full">
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
						</svg>
						Filtrar
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Tabela de Produtos -->
	<div class="card">
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Produto</th>
						<th>SKU</th>
						<th>Categoria</th>
						<th>Preço</th>
						<th>Estoque</th>
						<th>Status</th>
						<th>Ações</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each products as product}
						<tr class="hover:bg-gray-50">
							<td>
								<div class="flex items-center">
									<img 
										src={product.image} 
										alt={product.name}
										class="w-10 h-10 rounded-lg object-cover mr-3"
									/>
									<div>
										<p class="font-medium text-gray-900">{product.name}</p>
									</div>
								</div>
							</td>
							<td class="text-gray-500">{product.sku}</td>
							<td>{product.category}</td>
							<td class="font-medium">{formatCurrency(product.price)}</td>
							<td>
								<span class="{product.stock === 0 ? 'text-red-600' : 'text-gray-900'}">
									{product.stock} unidades
								</span>
							</td>
							<td>
								<span class="badge {getStatusBadge(product.status)}">
									{getStatusText(product.status)}
								</span>
							</td>
							<td>
								<div class="flex items-center space-x-2">
									<button 
										class="text-gray-400 hover:text-gray-600"
										aria-label="Editar produto"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
										</svg>
									</button>
									<button 
										class="text-gray-400 hover:text-red-600"
										aria-label="Excluir produto"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		<!-- Paginação -->
		<div class="card-footer">
			<div class="flex items-center justify-between">
				<p class="text-sm text-gray-700">
					Mostrando <span class="font-medium">1</span> a <span class="font-medium">4</span> de{' '}
					<span class="font-medium">4</span> resultados
				</p>
				<div class="flex space-x-2">
					<button class="btn btn-secondary btn-sm" disabled>
						Anterior
					</button>
					<button class="btn btn-secondary btn-sm">
						Próximo
					</button>
				</div>
			</div>
		</div>
	</div>
</div> 