<script lang="ts">
	// Dashboard do Seller Panel - EXATAMENTE igual ao Admin Panel
	
	// Dados simulados específicos do vendedor
	let stats = {
		totalProdutos: 89,
		vendas: 'R$ 8.450,00',
		pedidos: 45,
		estoque: 234
	};
	
	let vendasRecentes = [
		{ id: '#1234', produto: 'Camiseta Básica', valor: 'R$ 49,90', status: 'Enviado' },
		{ id: '#1235', produto: 'Calça Jeans', valor: 'R$ 89,50', status: 'Processando' },
		{ id: '#1236', produto: 'Tênis Esportivo', valor: 'R$ 159,90', status: 'Entregue' },
		{ id: '#1237', produto: 'Vestido Casual', valor: 'R$ 79,90', status: 'Pendente' }
	];
	
	let produtosMaisVendidos = [
		{ nome: 'Camiseta Básica', vendas: 32, receita: 'R$ 1.600,00' },
		{ nome: 'Calça Jeans', vendas: 18, receita: 'R$ 1.800,00' },
		{ nome: 'Tênis Esportivo', vendas: 15, receita: 'R$ 2.400,00' },
		{ nome: 'Vestido Casual', vendas: 12, receita: 'R$ 960,00' }
	];
</script>

<svelte:head>
	<title>Dashboard - Seller Panel | Marketplace GDG</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
			<p class="text-gray-600">Gerencie suas vendas e produtos</p>
		</div>
		<button class="btn btn-primary">
			<span class="mr-2">➕</span>
			Novo Produto
		</button>
	</div>

	<!-- Cards de Estatísticas -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
							<span class="text-cyan-600 text-lg">📦</span>
						</div>
					</div>
					<div class="ml-4">
						<h3 class="text-sm font-medium text-gray-500">Meus Produtos</h3>
						<p class="text-2xl font-bold text-gray-900">{stats.totalProdutos}</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
							<span class="text-green-600 text-lg">💰</span>
						</div>
					</div>
					<div class="ml-4">
						<h3 class="text-sm font-medium text-gray-500">Vendas do Mês</h3>
						<p class="text-2xl font-bold text-gray-900">{stats.vendas}</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
							<span class="text-blue-600 text-lg">🛒</span>
						</div>
					</div>
					<div class="ml-4">
						<h3 class="text-sm font-medium text-gray-500">Pedidos</h3>
						<p class="text-2xl font-bold text-gray-900">{stats.pedidos}</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
							<span class="text-yellow-600 text-lg">📋</span>
						</div>
					</div>
					<div class="ml-4">
						<h3 class="text-sm font-medium text-gray-500">Estoque</h3>
						<p class="text-2xl font-bold text-gray-900">{stats.estoque}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Grid de Conteúdo -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Vendas Recentes -->
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-medium text-gray-900">Vendas Recentes</h3>
			</div>
			<div class="card-body p-0">
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Pedido</th>
								<th>Produto</th>
								<th>Valor</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each vendasRecentes as venda}
								<tr class="hover:bg-gray-50 transition-colors">
									<td class="font-medium text-gray-900">{venda.id}</td>
									<td class="text-gray-600">{venda.produto}</td>
									<td class="font-medium text-gray-900">{venda.valor}</td>
									<td>
										{#if venda.status === 'Entregue'}
											<span class="badge badge-success">{venda.status}</span>
										{:else if venda.status === 'Enviado'}
											<span class="badge badge-info">{venda.status}</span>
										{:else if venda.status === 'Processando'}
											<span class="badge badge-warning">{venda.status}</span>
										{:else}
											<span class="badge badge-danger">{venda.status}</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Produtos Mais Vendidos -->
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-medium text-gray-900">Produtos Mais Vendidos</h3>
			</div>
			<div class="card-body">
				<div class="space-y-4">
					{#each produtosMaisVendidos as produto, index}
						<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
							<div class="flex items-center">
								<div class="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
									{index + 1}
								</div>
								<div class="ml-3">
									<p class="font-medium text-gray-900">{produto.nome}</p>
									<p class="text-sm text-gray-500">{produto.vendas} vendas</p>
								</div>
							</div>
							<div class="text-right">
								<p class="font-bold text-gray-900">{produto.receita}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Ações Rápidas -->
	<div class="card">
		<div class="card-header">
			<h3 class="text-lg font-medium text-gray-900">Ações Rápidas</h3>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<button class="btn btn-outline transition-fast">
					<span class="mr-2">➕</span>
					Adicionar Produto
				</button>
				<button class="btn btn-outline transition-fast">
					<span class="mr-2">📊</span>
					Ver Relatórios
				</button>
				<button class="btn btn-outline transition-fast">
					<span class="mr-2">💰</span>
					Gerenciar Financeiro
				</button>
			</div>
		</div>
	</div>
</div>
