<!-- Deploy seletivo do admin funcionando! -->
<script lang="ts">
	// Dashboard do Admin Panel - usando estilos unificados da Store
	import { onMount } from 'svelte';
	
	// Dados simulados
	let stats = {
		totalPedidos: 245,
		vendas: 'R$ 12.450,00',
		usuarios: 89,
		produtos: 156
	};
	
	let pedidosRecentes = [
		{ id: '#1234', cliente: 'João Silva', valor: 'R$ 89,90', status: 'Entregue' },
		{ id: '#1235', cliente: 'Maria Santos', valor: 'R$ 156,50', status: 'Enviado' },
		{ id: '#1236', cliente: 'Pedro Costa', valor: 'R$ 203,80', status: 'Processando' },
		{ id: '#1237', cliente: 'Ana Oliveira', valor: 'R$ 98,70', status: 'Pendente' }
	];
	
	let produtosMaisVendidos = [
		{ nome: 'Camiseta Básica', vendas: 45, receita: 'R$ 2.250,00' },
		{ nome: 'Calça Jeans', vendas: 32, receita: 'R$ 3.200,00' },
		{ nome: 'Tênis Esportivo', vendas: 28, receita: 'R$ 2.800,00' },
		{ nome: 'Vestido Casual', vendas: 22, receita: 'R$ 1.980,00' }
	];
</script>

<svelte:head>
	<title>Dashboard - Admin Panel | Marketplace GDG</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
			<p class="text-gray-600">Visão geral do marketplace</p>
		</div>
		<button class="btn btn-primary">
			<span class="mr-2">📊</span>
			Relatório Completo
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
						<h3 class="text-sm font-medium text-gray-500">Total de Pedidos</h3>
						<p class="text-2xl font-bold text-gray-900">{stats.totalPedidos}</p>
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
							<span class="text-blue-600 text-lg">👥</span>
						</div>
					</div>
					<div class="ml-4">
						<h3 class="text-sm font-medium text-gray-500">Usuários Ativos</h3>
						<p class="text-2xl font-bold text-gray-900">{stats.usuarios}</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
							<span class="text-yellow-600 text-lg">🛍️</span>
						</div>
					</div>
					<div class="ml-4">
						<h3 class="text-sm font-medium text-gray-500">Produtos</h3>
						<p class="text-2xl font-bold text-gray-900">{stats.produtos}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Grid de Conteúdo -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Pedidos Recentes -->
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-medium text-gray-900">Pedidos Recentes</h3>
			</div>
			<div class="card-body p-0">
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Pedido</th>
								<th>Cliente</th>
								<th>Valor</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each pedidosRecentes as pedido}
								<tr class="hover:bg-gray-50 transition-colors">
									<td class="font-medium text-gray-900">{pedido.id}</td>
									<td class="text-gray-600">{pedido.cliente}</td>
									<td class="font-medium text-gray-900">{pedido.valor}</td>
									<td>
										{#if pedido.status === 'Entregue'}
											<span class="badge badge-success">{pedido.status}</span>
										{:else if pedido.status === 'Enviado'}
											<span class="badge badge-info">{pedido.status}</span>
										{:else if pedido.status === 'Processando'}
											<span class="badge badge-warning">{pedido.status}</span>
										{:else}
											<span class="badge badge-danger">{pedido.status}</span>
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
					Novo Produto
				</button>
				<button class="btn btn-outline transition-fast">
					<span class="mr-2">👤</span>
					Gerenciar Usuários
				</button>
				<button class="btn btn-outline transition-fast">
					<span class="mr-2">📈</span>
					Ver Relatórios
				</button>
			</div>
		</div>
	</div>
</div>
