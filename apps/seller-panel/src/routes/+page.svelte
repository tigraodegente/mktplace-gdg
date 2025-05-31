<script lang="ts">
	// Dashboard profissional do Seller Panel
	
	// Mock data específico para vendedores
	const sellerStats = [
		{
			label: 'Vendas do Mês',
			value: 'R$ 8.542',
			change: '+18%',
			changeType: 'positive',
			icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
		},
		{
			label: 'Produtos Ativos',
			value: '45',
			change: '+3',
			changeType: 'positive',
			icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
		},
		{
			label: 'Pedidos Pendentes',
			value: '12',
			change: '-2',
			changeType: 'negative',
			icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
		},
		{
			label: 'Avaliação Média',
			value: '4.8',
			change: '+0.2',
			changeType: 'positive',
			icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
		}
	];
	
	const recentSales = [
		{ id: '#1234', product: 'iPhone 15 Pro', customer: 'João Silva', total: 'R$ 4.999,00', status: 'paid', time: '1h' },
		{ id: '#1235', product: 'AirPods Pro', customer: 'Maria Santos', total: 'R$ 899,00', status: 'processing', time: '3h' },
		{ id: '#1236', product: 'MacBook Air', customer: 'Pedro Costa', total: 'R$ 7.999,00', status: 'shipped', time: '1d' },
		{ id: '#1237', product: 'iPad Air', customer: 'Ana Oliveira', total: 'R$ 2.999,00', status: 'delivered', time: '2d' }
	];
	
	const topProducts = [
		{ name: 'iPhone 15 Pro', stock: 15, sales: 28, revenue: 'R$ 139.972' },
		{ name: 'AirPods Pro', stock: 45, sales: 56, revenue: 'R$ 50.344' },
		{ name: 'MacBook Air M2', stock: 8, sales: 12, revenue: 'R$ 95.988' },
		{ name: 'Apple Watch', stock: 22, sales: 34, revenue: 'R$ 68.966' }
	];
	
	function getStatusColor(status: string): string {
		const colors: Record<string, string> = {
			'paid': 'bg-green-100 text-green-800',
			'processing': 'bg-blue-100 text-blue-800',
			'shipped': 'bg-purple-100 text-purple-800',
			'delivered': 'bg-green-100 text-green-800'
		};
		return colors[status] || 'bg-gray-100 text-gray-800';
	}
	
	function getStatusLabel(status: string): string {
		const labels: Record<string, string> = {
			'paid': 'Pago',
			'processing': 'Processando',
			'shipped': 'Enviado',
			'delivered': 'Entregue'
		};
		return labels[status] || status;
	}
	
	function getStockStatus(stock: number): { color: string, label: string } {
		if (stock <= 5) return { color: 'text-red-600', label: 'Baixo' };
		if (stock <= 15) return { color: 'text-yellow-600', label: 'Médio' };
		return { color: 'text-green-600', label: 'Alto' };
	}
</script>

<svelte:head>
	<title>Dashboard - Seller Panel | Marketplace GDG</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Dashboard Vendedor</h1>
			<p class="text-gray-600 mt-2">Gerencie seus produtos e acompanhe suas vendas</p>
		</div>
		<div class="flex space-x-3">
			<button class="btn btn-secondary">
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
				</svg>
				Relatório
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
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		{#each sellerStats as stat}
			<div class="card hover:shadow-lg transition-shadow">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-600">{stat.label}</p>
							<p class="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
							<div class="flex items-center mt-2">
								<span class="text-sm font-medium {stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}">
									{stat.change}
								</span>
								<span class="text-gray-500 text-sm ml-1">vs. mês passado</span>
							</div>
						</div>
						<div class="w-12 h-12 bg-[#00BFB3] bg-opacity-10 rounded-xl flex items-center justify-center">
							<svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={stat.icon}/>
							</svg>
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Charts and Data -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		
		<!-- Recent Sales -->
		<div class="lg:col-span-2">
			<div class="card">
				<div class="card-header">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">Vendas Recentes</h3>
						<a href="/seller/vendas" class="text-[#00BFB3] hover:text-[#00A89D] text-sm font-medium">
							Ver todas
						</a>
					</div>
				</div>
				<div class="card-body p-0">
					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>Pedido</th>
									<th>Produto</th>
									<th>Cliente</th>
									<th>Total</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{#each recentSales as sale}
									<tr class="hover:bg-gray-50">
										<td class="font-medium text-gray-900">{sale.id}</td>
										<td class="font-medium">{sale.product}</td>
										<td>{sale.customer}</td>
										<td class="font-semibold text-gray-900">{sale.total}</td>
										<td>
											<span class="badge {getStatusColor(sale.status)}">
												{getStatusLabel(sale.status)}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>

		<!-- Top Products -->
		<div class="lg:col-span-1">
			<div class="card">
				<div class="card-header">
					<h3 class="text-lg font-semibold text-gray-900">Meus Produtos</h3>
				</div>
				<div class="card-body">
					<div class="space-y-4">
						{#each topProducts as product, index}
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-3">
									<div class="w-8 h-8 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center">
										<span class="text-[#00BFB3] font-bold text-sm">{index + 1}</span>
									</div>
									<div>
										<p class="font-medium text-gray-900 text-sm">{product.name}</p>
										<div class="flex items-center space-x-2 text-xs">
											<span class="text-gray-500">{product.sales} vendas</span>
											<span class="text-gray-300">•</span>
											<span class="{getStockStatus(product.stock).color} font-medium">
												{product.stock} em estoque
											</span>
										</div>
									</div>
								</div>
								<div class="text-right">
									<p class="font-semibold text-gray-900 text-sm">{product.revenue}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="card">
		<div class="card-header">
			<h3 class="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<a href="/seller/produtos/novo" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
							<svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-gray-900">Novo Produto</p>
							<p class="text-sm text-gray-500">Adicionar ao catálogo</p>
						</div>
					</div>
				</a>

				<a href="/seller/estoque" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
							<svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-gray-900">Gerenciar Estoque</p>
							<p class="text-sm text-gray-500">Controlar inventário</p>
						</div>
					</div>
				</a>

				<a href="/seller/pedidos" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
							<svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-gray-900">Pedidos</p>
							<p class="text-sm text-gray-500">Acompanhar vendas</p>
						</div>
					</div>
				</a>

				<a href="/seller/avaliacoes" class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group">
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-[#00BFB3] bg-opacity-10 rounded-lg flex items-center justify-center group-hover:bg-[#00BFB3] group-hover:bg-opacity-100 transition-all">
							<svg class="w-5 h-5 text-[#00BFB3] group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
							</svg>
						</div>
						<div>
							<p class="font-medium text-gray-900">Avaliações</p>
							<p class="text-sm text-gray-500">Feedback dos clientes</p>
						</div>
					</div>
				</a>
			</div>
		</div>
	</div>
</div>
