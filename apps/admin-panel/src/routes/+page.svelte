<!-- Deploy seletivo do admin funcionando! -->
<script lang="ts">
	// Dashboard do Admin Panel - usando estilos unificados da Store
	import { onMount } from 'svelte';
	import Icon from '../lib/Icon.svelte';
	
	let currentTime = new Date().toLocaleString('pt-BR');
	
	// Dados simulados para admin
	let stats = {
		totalUsuarios: 1234,
		receitaTotal: 'R$ 45.678',
		pedidosHoje: 89,
		totalProdutos: 567
	};
	
	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date().toLocaleString('pt-BR');
		}, 1000);
		
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Dashboard - Admin Panel</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header do Dashboard -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				<Icon name="dashboard" size="lg" />
				Dashboard Admin
			</h1>
			<p class="text-gray-600 mt-1">Painel administrativo do Marketplace GDG</p>
			<p class="text-sm text-gray-500">{currentTime}</p>
		</div>
		<div class="flex space-x-3">
			<button class="btn btn-secondary">
				<Icon name="reports" size="md" />
				Relatórios
			</button>
			<button class="btn btn-primary">
				<Icon name="add" size="md" />
				Novo Item
			</button>
		</div>
	</div>

	<!-- Cards de Status -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
							<Icon name="users" size="lg" fallbackColor="text-cyan-600" />
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Usuários</p>
						<p class="text-2xl font-bold text-gray-900">{stats.totalUsuarios}</p>
						<p class="text-xs text-green-600">+12% este mês</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
							<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
							</svg>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Receita Total</p>
						<p class="text-2xl font-bold text-gray-900">{stats.receitaTotal}</p>
						<p class="text-xs text-green-600">+8% este mês</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
							<Icon name="orders" size="lg" fallbackColor="text-blue-600" />
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Pedidos Hoje</p>
						<p class="text-2xl font-bold text-gray-900">{stats.pedidosHoje}</p>
						<p class="text-xs text-green-600">+15% hoje</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
							<Icon name="products" size="lg" fallbackColor="text-purple-600" />
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Produtos</p>
						<p class="text-2xl font-bold text-gray-900">{stats.totalProdutos}</p>
						<p class="text-xs text-gray-500">23 novos esta semana</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Grid de Informações -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Vendas Recentes -->
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
						<tbody>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1234</td>
								<td>João Silva</td>
								<td class="font-medium">R$ 249,90</td>
								<td><span class="badge badge-info">Enviado</span></td>
							</tr>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1235</td>
								<td>Maria Santos</td>
								<td class="font-medium">R$ 89,50</td>
								<td><span class="badge badge-warning">Processando</span></td>
							</tr>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1236</td>
								<td>Pedro Costa</td>
								<td class="font-medium">R$ 159,90</td>
								<td><span class="badge badge-success">Entregue</span></td>
							</tr>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1237</td>
								<td>Ana Oliveira</td>
								<td class="font-medium">R$ 79,90</td>
								<td><span class="badge badge-danger">Pendente</span></td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Vendedores Top -->
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-medium text-gray-900">Top Vendedores</h3>
			</div>
			<div class="card-body">
				<div class="space-y-4">
					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center">
							<div class="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
								1
							</div>
							<div class="ml-3">
								<p class="font-medium text-gray-900">Loja Fashion</p>
								<p class="text-sm text-gray-500">142 vendas</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-bold text-gray-900">R$ 12.800,00</p>
						</div>
					</div>

					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center">
							<div class="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
								2
							</div>
							<div class="ml-3">
								<p class="font-medium text-gray-900">Tech Store</p>
								<p class="text-sm text-gray-500">98 vendas</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-bold text-gray-900">R$ 9.600,00</p>
						</div>
					</div>

					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center">
							<div class="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
								3
							</div>
							<div class="ml-3">
								<p class="font-medium text-gray-900">Casa & Lar</p>
								<p class="text-sm text-gray-500">76 vendas</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-bold text-gray-900">R$ 7.200,00</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Ações Rápidas -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-lg font-medium text-gray-900">
				<Icon name="dashboard" size="md" />
				Ações Rápidas
			</h2>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-cyan-100 group-hover:bg-cyan-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="add" size="md" fallbackColor="text-cyan-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Criar Produto</span>
							<p class="text-sm text-gray-500">Adicionar novo item</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="users" size="md" fallbackColor="text-blue-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Gerenciar Usuários</span>
							<p class="text-sm text-gray-500">Usuários e permissões</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="reports" size="md" fallbackColor="text-green-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Ver Relatórios</span>
							<p class="text-sm text-gray-500">Analytics e dados</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="orders" size="md" fallbackColor="text-purple-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Gerenciar Pedidos</span>
							<p class="text-sm text-gray-500">Status e entregas</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="settings" size="md" fallbackColor="text-gray-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Configurações</span>
							<p class="text-sm text-gray-500">Sistema e preferências</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-yellow-100 group-hover:bg-yellow-200 rounded-lg flex items-center justify-center transition-colors">
							<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
							</svg>
						</div>
						<div>
							<span class="font-medium text-gray-900">Analytics</span>
							<p class="text-sm text-gray-500">Métricas detalhadas</p>
						</div>
					</div>
				</button>
			</div>
		</div>
	</div>
</div>
