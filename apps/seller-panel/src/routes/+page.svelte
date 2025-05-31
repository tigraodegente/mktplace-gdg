<script lang="ts">
	// Dashboard profissional do Seller Panel
	
	// Mock data - seria substituído por dados reais da API
	const dashboardStats = [
		{ 
			title: 'Vendas Este Mês', 
			value: 'R$ 12,5K', 
			change: '+15% vs. mês anterior', 
			changeType: 'positive' as const, 
			icon: 'revenue',
			gradient: true
		},
		{ 
			title: 'Produtos Ativos', 
			value: '24', 
			change: '+3 novos produtos', 
			changeType: 'positive' as const, 
			icon: 'products'
		},
		{ 
			title: 'Pedidos Hoje', 
			value: '8', 
			change: '+2 vs. ontem', 
			changeType: 'positive' as const, 
			icon: 'orders'
		},
		{ 
			title: 'Avaliação Média', 
			value: '4.8', 
			change: 'Excelente', 
			changeType: 'positive' as const, 
			icon: 'star'
		},
	];
	
	const recentOrders = [
		{ id: 12345, customer: 'Ana Silva', product: 'Smartphone Galaxy S24', amount: 2999.99, status: 'Pago', time: '5 min atrás' },
		{ id: 12344, customer: 'Carlos Santos', product: 'Notebook Dell', amount: 3599.99, status: 'Processando', time: '1 hora atrás' },
		{ id: 12343, customer: 'Maria Costa', product: 'Headphone Sony', amount: 1299.99, status: 'Enviado', time: '2 horas atrás' },
		{ id: 12342, customer: 'João Oliveira', product: 'Mouse Gamer', amount: 199.99, status: 'Entregue', time: '1 dia atrás' },
	];

	const topProducts = [
		{ name: 'Smartphone Galaxy S24', sales: 45, revenue: 134975 },
		{ name: 'Notebook Dell Inspiron', sales: 12, revenue: 43199 },
		{ name: 'Headphone Sony WH-1000XM5', sales: 28, revenue: 36398 },
		{ name: 'Mouse Gamer RGB', sales: 89, revenue: 17801 },
	];

	const breadcrumbs = [
		{ label: 'Seller Panel', href: '/' }
	];

	const actions = [
		{ 
			label: 'Adicionar Produto', 
			icon: 'add', 
			variant: 'primary' as const,
			href: '/produtos/novo'
		},
		{ 
			label: 'Ver Relatórios', 
			icon: 'download', 
			variant: 'secondary' as const,
			href: '/relatorios'
		}
	];

	function formatPrice(price: number): string {
		return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	}

	function getStatusBadgeClass(status: string): string {
		const classes = {
			'Pago': 'bg-green-100 text-green-800',
			'Processando': 'bg-yellow-100 text-yellow-800',
			'Enviado': 'bg-blue-100 text-blue-800',
			'Entregue': 'bg-purple-100 text-purple-800'
		};
		return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
	}
</script>

<svelte:head>
	<title>Dashboard - Seller Panel</title>
</svelte:head>

<!-- Page Header Melhorado -->
<div class="bg-white border-b border-gray-200 px-8 py-6 mb-8">
	<div class="max-w-7xl mx-auto">
		<!-- Title & Actions -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Dashboard do Vendedor</h1>
				<p class="text-lg text-gray-600">Gerencie suas vendas e produtos</p>
			</div>
			<div class="flex items-center space-x-3">
				<a 
					href="/relatorios"
					class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
					</svg>
					Ver Relatórios
				</a>
				<a 
					href="/produtos/novo"
					class="inline-flex items-center px-4 py-2 bg-primary-500 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-sm"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
					</svg>
					Adicionar Produto
				</a>
			</div>
		</div>
	</div>
</div>

<!-- Stats Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
	<!-- Vendas Este Mês -->
	<div class="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-sm p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-white">
		<div class="flex items-center justify-between mb-4">
			<div>
				<p class="text-sm font-medium text-primary-100 mb-2">Vendas Este Mês</p>
				<p class="text-3xl font-bold text-white">R$ 12,5K</p>
			</div>
			<div class="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
				</svg>
			</div>
		</div>
		<div class="flex items-center text-sm">
			<svg class="w-4 h-4 text-green-300 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
			</svg>
			<span class="text-green-200 font-semibold">+15%</span>
			<span class="text-primary-100 ml-1">vs. mês anterior</span>
		</div>
	</div>

	<!-- Produtos Ativos -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
		<div class="flex items-center justify-between mb-4">
			<div>
				<p class="text-sm font-medium text-gray-600 mb-2">Produtos Ativos</p>
				<p class="text-3xl font-bold text-gray-900">24</p>
			</div>
			<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
				</svg>
			</div>
		</div>
		<div class="flex items-center text-sm">
			<svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
			</svg>
			<span class="text-green-600 font-semibold">+3</span>
			<span class="text-gray-500 ml-1">novos produtos</span>
		</div>
	</div>

	<!-- Pedidos Hoje -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
		<div class="flex items-center justify-between mb-4">
			<div>
				<p class="text-sm font-medium text-gray-600 mb-2">Pedidos Hoje</p>
				<p class="text-3xl font-bold text-gray-900">8</p>
			</div>
			<div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
				</svg>
			</div>
		</div>
		<div class="flex items-center text-sm">
			<svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
			</svg>
			<span class="text-green-600 font-semibold">+2</span>
			<span class="text-gray-500 ml-1">vs. ontem</span>
		</div>
	</div>

	<!-- Avaliação -->
	<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
		<div class="flex items-center justify-between mb-4">
			<div>
				<p class="text-sm font-medium text-gray-600 mb-2">Avaliação Média</p>
				<p class="text-3xl font-bold text-gray-900">4.8</p>
			</div>
			<div class="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
				</svg>
			</div>
		</div>
		<div class="flex items-center text-sm">
			<span class="text-green-600 font-semibold">Excelente</span>
			<span class="text-gray-500 ml-1">avaliação</span>
		</div>
	</div>
</div>

<!-- Content Grid -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
	
	<!-- Recent Orders -->
	<div class="lg:col-span-2">
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
				<h3 class="text-xl font-semibold text-gray-900">Pedidos Recentes</h3>
			</div>
			<div class="p-6">
				<div class="space-y-4">
					{#each recentOrders as order}
						<div class="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
							<div class="flex-1">
								<div class="flex items-center justify-between mb-2">
									<div class="font-medium text-gray-900">#{order.id}</div>
									<span class="px-2 py-1 text-xs font-medium rounded-full {getStatusBadgeClass(order.status)}">
										{order.status}
									</span>
								</div>
								<div class="text-sm text-gray-600 mb-1">{order.customer} • {order.product}</div>
								<div class="flex items-center justify-between text-sm">
									<span class="font-medium text-gray-900">{formatPrice(order.amount)}</span>
									<span class="text-gray-500">{order.time}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div class="px-6 py-4 bg-gray-50/30 border-t border-gray-100">
				<a href="/pedidos" class="btn-link text-primary-600 hover:text-primary-700 font-medium">
					Ver todos os pedidos →
				</a>
			</div>
		</div>
	</div>
	
	<!-- Top Products -->
	<div class="lg:col-span-1">
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
			<div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
				<h3 class="text-xl font-semibold text-gray-900">Produtos Mais Vendidos</h3>
			</div>
			<div class="p-6 flex-1">
				<div class="space-y-4">
					{#each topProducts as product, index}
						<div class="flex items-center space-x-3">
							<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
								<span class="text-primary-600 font-medium text-sm">#{index + 1}</span>
							</div>
							<div class="flex-1 min-w-0">
								<div class="font-medium text-gray-900 truncate">{product.name}</div>
								<div class="text-sm text-gray-500">{product.sales} vendas • {formatPrice(product.revenue)}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div class="px-6 py-4 bg-gray-50/30 border-t border-gray-100">
				<a href="/produtos" class="btn-link text-primary-600 hover:text-primary-700 font-medium">
					Ver todos os produtos →
				</a>
			</div>
		</div>
	</div>
</div>

<!-- Quick Actions -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	<a href="/produtos/novo" class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
		<div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
			<svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
			</svg>
		</div>
		<h4 class="text-lg font-semibold text-gray-900 mb-2">Adicionar Produto</h4>
		<p class="text-gray-600 text-sm">Cadastre novos produtos em sua loja</p>
	</a>
	
	<a href="/pedidos" class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
		<div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
			<svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
			</svg>
		</div>
		<h4 class="text-lg font-semibold text-gray-900 mb-2">Gerenciar Pedidos</h4>
		<p class="text-gray-600 text-sm">Acompanhe e processe seus pedidos</p>
	</a>
	
	<a href="/relatorios" class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
		<div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
			<svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
			</svg>
		</div>
		<h4 class="text-lg font-semibold text-gray-900 mb-2">Relatórios</h4>
		<p class="text-gray-600 text-sm">Analytics e performance de vendas</p>
	</a>
</div>

<style>
	.btn-link {
		@apply text-sm font-medium transition-colors;
	}
</style>
