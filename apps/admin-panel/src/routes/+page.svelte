<!-- Deploy seletivo do admin funcionando! -->
<script lang="ts">
	import { onMount } from 'svelte';
	
	// Dados mockados para demonstração
	let stats = {
		totalRevenue: 125430.50,
		totalOrders: 342,
		totalProducts: 156,
		totalUsers: 1234,
		revenueGrowth: 12.5,
		ordersGrowth: 8.3,
		productsGrowth: 5.2,
		usersGrowth: 15.7
	};

	let recentOrders = [
		{ id: '1', customer: 'João Silva', total: 299.90, status: 'processing', date: '2024-01-15' },
		{ id: '2', customer: 'Maria Santos', total: 450.00, status: 'completed', date: '2024-01-15' },
		{ id: '3', customer: 'Pedro Oliveira', total: 189.90, status: 'pending', date: '2024-01-14' },
		{ id: '4', customer: 'Ana Costa', total: 750.00, status: 'completed', date: '2024-01-14' },
		{ id: '5', customer: 'Carlos Ferreira', total: 320.50, status: 'processing', date: '2024-01-13' }
	];

	let topProducts = [
		{ name: 'Notebook Dell XPS', sales: 45, revenue: 135000 },
		{ name: 'iPhone 15 Pro', sales: 38, revenue: 114000 },
		{ name: 'Samsung Galaxy S24', sales: 32, revenue: 64000 },
		{ name: 'iPad Air', sales: 28, revenue: 42000 },
		{ name: 'AirPods Pro', sales: 52, revenue: 26000 }
	];

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value);
	}

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'completed': return 'badge-success';
			case 'processing': return 'badge-warning';
			case 'pending': return 'badge-info';
			case 'cancelled': return 'badge-danger';
			default: return 'badge';
		}
	}

	function getStatusText(status: string): string {
		switch (status) {
			case 'completed': return 'Concluído';
			case 'processing': return 'Processando';
			case 'pending': return 'Pendente';
			case 'cancelled': return 'Cancelado';
			default: return status;
		}
	}
</script>

<svelte:head>
  <title>Dashboard - Admin Panel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b">
		<div class="px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-4">
				<h1 class="text-2xl font-semibold text-gray-900">Dashboard Administrativo</h1>
				<div class="flex items-center space-x-4">
					<button class="btn btn-secondary btn-sm">
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Atualizar
					</button>
					<button class="btn btn-primary btn-sm">
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Nova Venda
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="px-4 sm:px-6 lg:px-8 py-8">
		<!-- Stats Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<!-- Receita Total -->
			<div class="card">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Receita Total</p>
							<p class="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
						</div>
						<div class="p-3 bg-cyan-100 rounded-full">
							<svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					</div>
					<div class="mt-4 flex items-center text-sm">
						<span class="text-green-600 font-medium">+{stats.revenueGrowth}%</span>
						<span class="text-gray-500 ml-2">vs mês anterior</span>
					</div>
				</div>
			</div>

			<!-- Total de Pedidos -->
			<div class="card">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Total de Pedidos</p>
							<p class="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
						</div>
						<div class="p-3 bg-blue-100 rounded-full">
							<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
							</svg>
						</div>
					</div>
					<div class="mt-4 flex items-center text-sm">
						<span class="text-green-600 font-medium">+{stats.ordersGrowth}%</span>
						<span class="text-gray-500 ml-2">vs mês anterior</span>
					</div>
				</div>
			</div>

			<!-- Total de Produtos -->
			<div class="card">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Total de Produtos</p>
							<p class="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
						</div>
						<div class="p-3 bg-purple-100 rounded-full">
							<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
							</svg>
						</div>
					</div>
					<div class="mt-4 flex items-center text-sm">
						<span class="text-green-600 font-medium">+{stats.productsGrowth}%</span>
						<span class="text-gray-500 ml-2">vs mês anterior</span>
					</div>
				</div>
			</div>

			<!-- Total de Usuários -->
			<div class="card">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">Total de Usuários</p>
							<p class="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
						</div>
						<div class="p-3 bg-green-100 rounded-full">
							<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						</div>
					</div>
					<div class="mt-4 flex items-center text-sm">
						<span class="text-green-600 font-medium">+{stats.usersGrowth}%</span>
						<span class="text-gray-500 ml-2">vs mês anterior</span>
					</div>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Pedidos Recentes -->
			<div class="card">
				<div class="card-header">
					<div class="flex justify-between items-center">
						<h2 class="text-lg font-semibold text-gray-900">Pedidos Recentes</h2>
						<a href="/pedidos" class="text-sm text-cyan-600 hover:text-cyan-700">Ver todos</a>
					</div>
				</div>
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Cliente</th>
								<th>Total</th>
								<th>Status</th>
								<th>Data</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each recentOrders as order}
								<tr class="hover:bg-gray-50">
									<td class="font-medium">{order.customer}</td>
									<td>{formatCurrency(order.total)}</td>
									<td>
										<span class="badge {getStatusBadgeClass(order.status)}">
											{getStatusText(order.status)}
										</span>
									</td>
									<td class="text-gray-500">{new Date(order.date).toLocaleDateString('pt-BR')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Produtos Mais Vendidos -->
			<div class="card">
				<div class="card-header">
					<div class="flex justify-between items-center">
						<h2 class="text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h2>
						<a href="/produtos" class="text-sm text-cyan-600 hover:text-cyan-700">Ver todos</a>
					</div>
				</div>
				<div class="card-body">
					<div class="space-y-4">
						{#each topProducts as product, index}
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-3">
									<span class="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
									<div>
										<p class="font-medium text-gray-900">{product.name}</p>
										<p class="text-sm text-gray-500">{product.sales} vendas</p>
									</div>
								</div>
								<p class="font-medium text-gray-900">{formatCurrency(product.revenue)}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Gráficos (placeholder) -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
			<div class="card">
				<div class="card-header">
					<h2 class="text-lg font-semibold text-gray-900">Vendas por Mês</h2>
				</div>
				<div class="card-body">
					<div class="h-64 flex items-center justify-center text-gray-400">
						<p>Gráfico de vendas será implementado aqui</p>
					</div>
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<h2 class="text-lg font-semibold text-gray-900">Categorias Mais Vendidas</h2>
				</div>
				<div class="card-body">
					<div class="h-64 flex items-center justify-center text-gray-400">
						<p>Gráfico de categorias será implementado aqui</p>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>
