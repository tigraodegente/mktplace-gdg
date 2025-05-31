<script lang="ts">
	// Dashboard do Seller Panel - usando estilos unificados da Store
	import { onMount } from 'svelte';
	import Icon from '../lib/Icon.svelte';
	
	let currentTime = new Date().toLocaleString('pt-BR');
	
	// Dados simulados
	let stats = {
		totalProdutos: 89,
		vendasMes: 'R$ 8.450,00',
		pedidosHoje: 45,
		estoque: 234
	};
	
	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date().toLocaleString('pt-BR');
		}, 1000);
		
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Dashboard - Seller Panel</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header do Dashboard -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				<Icon name="dashboard" size="lg" />
				Dashboard Vendedor
			</h1>
			<p class="text-gray-600 mt-1">Gerencie suas vendas e produtos</p>
			<p class="text-sm text-gray-500">{currentTime}</p>
		</div>
		<div class="flex space-x-3">
			<button class="btn btn-secondary">
				<Icon name="stock" size="md" />
				Relatórios
			</button>
			<button class="btn btn-primary">
				<Icon name="add" size="md" />
				Novo Produto
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
							<Icon name="products" size="lg" fallbackColor="text-cyan-600" />
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Meus Produtos</p>
						<p class="text-2xl font-bold text-gray-900">{stats.totalProdutos}</p>
						<p class="text-xs text-green-600">5 novos esta semana</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
							<Icon name="financial" size="lg" fallbackColor="text-green-600" />
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Vendas do Mês</p>
						<p class="text-2xl font-bold text-gray-900">{stats.vendasMes}</p>
						<p class="text-xs text-green-600">+12% vs mês anterior</p>
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
						<p class="text-sm font-medium text-gray-600">Pedidos</p>
						<p class="text-2xl font-bold text-gray-900">{stats.pedidosHoje}</p>
						<p class="text-xs text-green-600">+8% hoje</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
							<Icon name="stock" size="lg" fallbackColor="text-purple-600" />
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Estoque</p>
						<p class="text-2xl font-bold text-gray-900">{stats.estoque}</p>
						<p class="text-xs text-gray-500">15 com baixo estoque</p>
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
						<tbody>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1234</td>
								<td>Camiseta Básica</td>
								<td class="font-medium">R$ 49,90</td>
								<td><span class="badge badge-info">Enviado</span></td>
							</tr>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1235</td>
								<td>Calça Jeans</td>
								<td class="font-medium">R$ 89,50</td>
								<td><span class="badge badge-warning">Processando</span></td>
							</tr>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1236</td>
								<td>Tênis Esportivo</td>
								<td class="font-medium">R$ 159,90</td>
								<td><span class="badge badge-success">Entregue</span></td>
							</tr>
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="font-medium">#1237</td>
								<td>Vestido Casual</td>
								<td class="font-medium">R$ 79,90</td>
								<td><span class="badge badge-danger">Pendente</span></td>
							</tr>
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
					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center">
							<div class="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
								1
							</div>
							<div class="ml-3">
								<p class="font-medium text-gray-900">Camiseta Básica</p>
								<p class="text-sm text-gray-500">32 vendas</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-bold text-gray-900">R$ 1.600,00</p>
						</div>
					</div>

					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center">
							<div class="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
								2
							</div>
							<div class="ml-3">
								<p class="font-medium text-gray-900">Calça Jeans</p>
								<p class="text-sm text-gray-500">18 vendas</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-bold text-gray-900">R$ 1.800,00</p>
						</div>
					</div>

					<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div class="flex items-center">
							<div class="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
								3
							</div>
							<div class="ml-3">
								<p class="font-medium text-gray-900">Tênis Esportivo</p>
								<p class="text-sm text-gray-500">15 vendas</p>
							</div>
						</div>
						<div class="text-right">
							<p class="font-bold text-gray-900">R$ 2.400,00</p>
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
							<Icon name="products" size="md" fallbackColor="text-cyan-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Adicionar Produto</span>
							<p class="text-sm text-gray-500">Novo item na loja</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="orders" size="md" fallbackColor="text-blue-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Gerenciar Pedidos</span>
							<p class="text-sm text-gray-500">Status e entregas</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="financial" size="md" fallbackColor="text-green-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Financeiro</span>
							<p class="text-sm text-gray-500">Vendas e comissões</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="stock" size="md" fallbackColor="text-purple-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Controle Estoque</span>
							<p class="text-sm text-gray-500">Inventário e alertas</p>
						</div>
					</div>
				</button>
				
				<button class="p-4 text-left bg-gray-50 hover:bg-cyan-50 hover:border-cyan-200 border border-gray-200 rounded-lg transition-all duration-200 group">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-yellow-100 group-hover:bg-yellow-200 rounded-lg flex items-center justify-center transition-colors">
							<Icon name="reviews" size="md" fallbackColor="text-yellow-600" />
						</div>
						<div>
							<span class="font-medium text-gray-900">Avaliações</span>
							<p class="text-sm text-gray-500">Feedback dos clientes</p>
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
							<p class="text-sm text-gray-500">Loja e preferências</p>
						</div>
					</div>
				</button>
			</div>
		</div>
	</div>
</div>
