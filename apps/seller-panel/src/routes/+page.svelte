<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	
	// Dados mockados por enquanto
	const stats = {
		totalRevenue: 15750.90,
		totalOrders: 47,
		pendingOrders: 5,
		totalProducts: 23,
		averageRating: 4.8,
		totalReviews: 89
	};
	
	const recentOrders = [
		{
			id: '1',
			orderNumber: '#2024001',
			customer: 'João Silva',
			total: 299.90,
			status: 'pending',
			date: new Date('2024-05-26')
		},
		{
			id: '2',
			orderNumber: '#2024002',
			customer: 'Maria Santos',
			total: 599.90,
			status: 'processing',
			date: new Date('2024-05-25')
		},
		{
			id: '3',
			orderNumber: '#2024003',
			customer: 'Pedro Oliveira',
			total: 149.90,
			status: 'shipped',
			date: new Date('2024-05-24')
		}
	];
	
	const topProducts = [
		{
			id: '1',
			name: 'Notebook Gamer Pro',
			sales: 12,
			revenue: 59999.88,
			stock: 5
		},
		{
			id: '2',
			name: 'Mouse Wireless',
			sales: 28,
			revenue: 2799.72,
			stock: 15
		},
		{
			id: '3',
			name: 'Teclado Mecânico RGB',
			sales: 18,
			revenue: 3599.82,
			stock: 8
		}
	];
	
	function getStatusColor(status: string) {
		switch (status) {
			case 'pending': return 'bg-yellow-100 text-yellow-800';
			case 'processing': return 'bg-blue-100 text-blue-800';
			case 'shipped': return 'bg-green-100 text-green-800';
			case 'delivered': return 'bg-gray-100 text-gray-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
	
	function getStatusText(status: string) {
		switch (status) {
			case 'pending': return 'Pendente';
			case 'processing': return 'Processando';
			case 'shipped': return 'Enviado';
			case 'delivered': return 'Entregue';
			default: return status;
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Painel do Vendedor</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
		<p class="text-gray-600 mt-2">Bem-vindo ao seu painel de vendas</p>
	</div>
	
	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
		<!-- Receita Total -->
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Receita Total</p>
					<p class="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalRevenue)}</p>
				</div>
				<div class="bg-green-100 rounded-full p-3">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
				</div>
			</div>
			<p class="text-sm text-green-600 mt-4">+12% em relação ao mês anterior</p>
		</div>
		
		<!-- Total de Pedidos -->
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total de Pedidos</p>
					<p class="text-2xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
				</div>
				<div class="bg-blue-100 rounded-full p-3">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
					</svg>
				</div>
			</div>
			<p class="text-sm text-yellow-600 mt-4">{stats.pendingOrders} pedidos pendentes</p>
		</div>
		
		<!-- Avaliação Média -->
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Avaliação Média</p>
					<div class="flex items-center mt-2">
						<p class="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
						<svg class="w-5 h-5 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
							<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
						</svg>
					</div>
				</div>
				<div class="bg-purple-100 rounded-full p-3">
					<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
					</svg>
				</div>
			</div>
			<p class="text-sm text-gray-600 mt-4">Baseado em {stats.totalReviews} avaliações</p>
		</div>
	</div>
	
	<!-- Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- Pedidos Recentes -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900">Pedidos Recentes</h2>
					<a href="/pedidos" class="text-sm text-blue-600 hover:text-blue-700">Ver todos →</a>
				</div>
			</div>
			<div class="p-6">
				<div class="space-y-4">
					{#each recentOrders as order}
						<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
							<div class="flex-1">
								<div class="flex items-center justify-between mb-1">
									<p class="font-medium text-gray-900">{order.orderNumber}</p>
									<span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(order.status)}">
										{getStatusText(order.status)}
									</span>
								</div>
								<p class="text-sm text-gray-600">{order.customer}</p>
								<p class="text-sm text-gray-500 mt-1">
									{order.date.toLocaleDateString('pt-BR')}
								</p>
							</div>
							<div class="ml-4">
								<p class="font-semibold text-gray-900">{formatCurrency(order.total)}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
		
		<!-- Produtos Mais Vendidos -->
		<div class="bg-white rounded-lg shadow">
			<div class="px-6 py-4 border-b border-gray-200">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h2>
					<a href="/produtos" class="text-sm text-blue-600 hover:text-blue-700">Ver todos →</a>
				</div>
			</div>
			<div class="p-6">
				<div class="space-y-4">
					{#each topProducts as product}
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<p class="font-medium text-gray-900">{product.name}</p>
								<p class="text-sm text-gray-600 mt-1">
									{product.sales} vendas • {product.stock} em estoque
								</p>
							</div>
							<div class="text-right">
								<p class="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
	
	<!-- Quick Actions -->
	<div class="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
		<a href="/produtos/novo" class="bg-blue-600 text-white rounded-lg p-4 text-center hover:bg-blue-700 transition">
			<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
			</svg>
			<p class="font-medium">Adicionar Produto</p>
		</a>
		
		<a href="/pedidos" class="bg-gray-100 text-gray-700 rounded-lg p-4 text-center hover:bg-gray-200 transition">
			<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
			</svg>
			<p class="font-medium">Gerenciar Pedidos</p>
		</a>
		
		<a href="/financeiro" class="bg-gray-100 text-gray-700 rounded-lg p-4 text-center hover:bg-gray-200 transition">
			<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
			</svg>
			<p class="font-medium">Relatórios</p>
		</a>
		
		<a href="/configuracoes" class="bg-gray-100 text-gray-700 rounded-lg p-4 text-center hover:bg-gray-200 transition">
			<svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
			</svg>
			<p class="font-medium">Configurações</p>
		</a>
	</div>
</div>
