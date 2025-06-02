<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import Icon from '$lib/Icon.svelte';
	
	// Crossfade para transições entre views
	const [send, receive] = crossfade({
		duration: 400,
		fallback(node) {
			return blur(node, { amount: 10, duration: 400 });
		}
	});
	
	// Interface
	interface Order {
		id: string;
		customer: string;
		email: string;
		status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
		total: number;
		items: number;
		created: string;
		payment: string;
		vendor?: string;
	}
	
	interface StatCard {
		title: string;
		value: string | number;
		change?: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
	}
	
	interface Filter {
		search: string;
		status: string;
		payment: string;
		dateRange: string;
	}
	
	// Estado
	let orders = $state<Order[]>([]);
	let filteredOrders = $state<Order[]>([]);
	let loading = $state(true);
	let selectedOrders = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(true);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		status: 'all',
		payment: 'all',
		dateRange: 'week'
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	
	// Stats
	let stats = $state<StatCard[]>([]);
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadOrders();
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...orders];
		
		// Busca
		if (filters.search) {
			result = result.filter(order => 
				order.customer.toLowerCase().includes(filters.search.toLowerCase()) || 
				order.email.toLowerCase().includes(filters.search.toLowerCase()) ||
				order.id.includes(filters.search)
			);
		}
		
		// Status
		if (filters.status !== 'all') {
			result = result.filter(order => order.status === filters.status);
		}
		
		// Pagamento
		if (filters.payment !== 'all') {
			result = result.filter(order => order.payment === filters.payment);
		}
		
		filteredOrders = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		// Atualizar estatísticas
		updateStats(result);
	});
	
	onMount(() => {
		loadOrders();
	});
	
	async function loadOrders() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock
			orders = Array.from({ length: 50 }, (_, i) => ({
				id: `${12345 + i}`,
				customer: `Cliente ${i + 1}`,
				email: `cliente${i + 1}@email.com`,
				status: ['processing', 'shipped', 'delivered', 'cancelled'][Math.floor(Math.random() * 4)] as any,
				total: Math.floor(Math.random() * 5000) + 100,
				items: Math.floor(Math.random() * 5) + 1,
				created: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				payment: ['Cartão de Crédito', 'PIX', 'Boleto', 'Cartão de Débito'][Math.floor(Math.random() * 4)],
				vendor: userRole === 'vendor' ? 'Minha Loja' : `Vendedor ${Math.floor(Math.random() * 10) + 1}`
			}));
			
			if (userRole === 'vendor') {
				orders = orders.filter(o => o.vendor === 'Minha Loja');
			}
			
			loading = false;
		}, 1000);
	}
	
	function updateStats(ords: Order[]) {
		const today = new Date().setHours(0, 0, 0, 0);
		const ordersToday = ords.filter(o => new Date(o.created).setHours(0, 0, 0, 0) === today).length;
		const processing = ords.filter(o => o.status === 'processing').length;
		const delivered = ords.filter(o => o.status === 'delivered').length;
		const revenue = ords.reduce((sum, o) => sum + o.total, 0);
		
		stats = [
			{
				title: 'Pedidos Hoje',
				value: ordersToday,
				change: 25,
				icon: '📋',
				color: 'primary'
			},
			{
				title: 'Processando',
				value: processing,
				icon: '⏳',
				color: 'warning'
			},
			{
				title: 'Entregues',
				value: delivered.toLocaleString('pt-BR'),
				change: 12,
				icon: '✅',
				color: 'success'
			},
			{
				title: 'Faturamento',
				value: formatPrice(revenue),
				change: 32,
				icon: '💰',
				color: 'info'
			}
		];
	}
	
	function toggleOrderSelection(id: string) {
		const newSet = new Set(selectedOrders);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedOrders = newSet;
	}
	
	function toggleAllOrders() {
		if (selectedOrders.size === paginatedOrders.length) {
			selectedOrders = new Set();
		} else {
			selectedOrders = new Set(paginatedOrders.map(o => o.id));
		}
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			processing: 'badge-warning',
			shipped: 'badge-info',
			delivered: 'badge-success',
			cancelled: 'badge-danger'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			processing: 'Processando',
			shipped: 'Enviado',
			delivered: 'Entregue',
			cancelled: 'Cancelado'
		};
		return labels[status as keyof typeof labels] || status;
	}
	
	function formatPrice(price: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
	}
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	function getColorClasses(color: string) {
		const colors = {
			primary: 'from-cyan-500 to-cyan-600',
			success: 'from-green-500 to-green-600',
			warning: 'from-yellow-500 to-yellow-600',
			danger: 'from-red-500 to-red-600',
			info: 'from-blue-500 to-blue-600'
		};
		return colors[color as keyof typeof colors] || colors.primary;
	}
	
	// Pedidos paginados
	const paginatedOrders = $derived(
		filteredOrders.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Ações em lote
	async function bulkUpdateStatus(status: Order['status']) {
		console.log('Atualizando status de', selectedOrders.size, 'pedidos para', status);
		selectedOrders = new Set();
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedOrders.size} pedidos?`)) {
			console.log('Excluindo', selectedOrders.size, 'pedidos');
			selectedOrders = new Set();
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão de Pedidos' : 'Meus Pedidos'}
			</h1>
			<p class="text-gray-600 mt-1">Monitore e processe todos os pedidos do marketplace</p>
		</div>
		
		<div class="flex items-center gap-3">
			<!-- View Mode -->
			<div class="flex items-center bg-gray-100 rounded-lg p-1">
				<button 
					onclick={() => viewMode = 'list'}
					class="p-2 rounded {viewMode === 'list' ? 'bg-white shadow-sm' : ''} transition-all duration-300 hover:scale-105"
					title="Visualização em lista"
				>
					<svg class="w-5 h-5 transition-transform duration-300 {viewMode === 'list' ? 'scale-110' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<button 
					onclick={() => viewMode = 'grid'}
					class="p-2 rounded {viewMode === 'grid' ? 'bg-white shadow-sm' : ''} transition-all duration-300 hover:scale-105"
					title="Visualização em grade"
				>
					<svg class="w-5 h-5 transition-transform duration-300 {viewMode === 'grid' ? 'scale-110' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
				</button>
			</div>
			
			<!-- Toggle Filters -->
			<button
				onclick={() => showFilters = !showFilters}
				class="btn btn-ghost"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
				</svg>
				Filtros
			</button>
			
			<!-- Export -->
			<button class="btn btn-primary">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				Exportar
			</button>
		</div>
	</div>
	
	<!-- Stats Cards -->
	{#if loading}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each Array(4) as _, i}
				<div class="stat-card animate-pulse">
					<div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
					<div class="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
					<div class="h-3 bg-gray-200 rounded w-1/3"></div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each stats as stat, i (stat.title)}
				<div 
					class="stat-card group"
					in:fly={{ y: 50, duration: 500, delay: 200 + i * 100, easing: backOut }}
					out:scale={{ duration: 200 }}
				>
					<div class="relative z-10">
						<div class="flex items-center justify-between mb-4">
							<div class="text-2xl transform group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
							{#if stat.change}
								<div class="flex items-center gap-1" in:fade={{ duration: 300, delay: 400 + i * 100 }}>
									{#if stat.change > 0}
										<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										<span class="text-sm font-semibold text-green-500">+{stat.change}%</span>
									{:else}
										<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
										</svg>
										<span class="text-sm font-semibold text-red-500">{stat.change}%</span>
									{/if}
								</div>
							{/if}
						</div>
						<h3 class="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
						<p class="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:scale-105">{stat.value}</p>
					</div>
					
					<!-- Background decoration -->
					<div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br {getColorClasses(stat.color)} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-500"></div>
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Filters -->
	{#if showFilters}
		<div class="card" transition:slide={{ duration: 300 }}>
			<div class="card-body">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Search -->
					<div class="lg:col-span-1">
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="ID, cliente ou email..."
							class="input"
						/>
					</div>
					
					<!-- Status -->
					<div>
						<label class="label">Status</label>
						<select bind:value={filters.status} class="input">
							<option value="all">Todos</option>
							<option value="processing">Processando</option>
							<option value="shipped">Enviado</option>
							<option value="delivered">Entregue</option>
							<option value="cancelled">Cancelado</option>
						</select>
					</div>
					
					<!-- Payment -->
					<div>
						<label class="label">Pagamento</label>
						<select bind:value={filters.payment} class="input">
							<option value="all">Todos</option>
							<option value="Cartão de Crédito">Cartão de Crédito</option>
							<option value="Cartão de Débito">Cartão de Débito</option>
							<option value="PIX">PIX</option>
							<option value="Boleto">Boleto</option>
						</select>
					</div>
					
					<!-- Date Range -->
					<div>
						<label class="label">Período</label>
						<select bind:value={filters.dateRange} class="input">
							<option value="today">Hoje</option>
							<option value="week">Esta Semana</option>
							<option value="month">Este Mês</option>
							<option value="year">Este Ano</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Bulk Actions -->
	{#if selectedOrders.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedOrders.size} {selectedOrders.size === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
					</p>
					<div class="flex items-center gap-2">
						<button 
							onclick={() => bulkUpdateStatus('shipped')}
							class="btn btn-sm btn-ghost text-blue-600"
						>
							Marcar como Enviado
						</button>
						<button 
							onclick={() => bulkUpdateStatus('delivered')}
							class="btn btn-sm btn-ghost text-green-600"
						>
							Marcar como Entregue
						</button>
						<button 
							onclick={() => bulkUpdateStatus('cancelled')}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Cancelar
						</button>
						<button 
							onclick={() => selectedOrders = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Limpar Seleção
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Orders Table/Grid -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando pedidos...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if viewMode === 'list'}
		<!-- List View -->
		<div class="card overflow-hidden">
			<div class="overflow-x-auto">
				<table class="table-modern">
					<thead>
						<tr>
							<th class="w-12">
								<input
									type="checkbox"
									checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
									onchange={toggleAllOrders}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
							<th>Pedido</th>
							<th>Cliente</th>
							<th>Status</th>
							<th>Total</th>
							<th>Pagamento</th>
							{#if userRole === 'admin'}
								<th>Vendedor</th>
							{/if}
							<th>Data</th>
							<th class="text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedOrders as order, i}
							<tr 
								class="hover:bg-gray-50 transition-colors"
								in:fly={{ x: -20, duration: 400, delay: i * 50 }}
							>
								<td>
									<input
										type="checkbox"
										checked={selectedOrders.has(order.id)}
										onchange={() => toggleOrderSelection(order.id)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-semibold">
											#{order.id.slice(-3)}
										</div>
										<div>
											<p class="font-medium text-gray-900">#{order.id}</p>
											<p class="text-sm text-gray-500">{order.items} {order.items > 1 ? 'itens' : 'item'}</p>
										</div>
									</div>
								</td>
								<td>
									<div>
										<p class="font-medium text-gray-900">{order.customer}</p>
										<p class="text-sm text-gray-500">{order.email}</p>
									</div>
								</td>
								<td>
									<span class="badge {getStatusBadge(order.status)}">
										{getStatusLabel(order.status)}
									</span>
								</td>
								<td class="font-medium">{formatPrice(order.total)}</td>
								<td>{order.payment}</td>
								{#if userRole === 'admin'}
									<td>{order.vendor}</td>
								{/if}
								<td>{formatDate(order.created)}</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										<button
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Ver detalhes"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										</button>
										<button
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Editar"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										{#if order.status !== 'cancelled' && order.status !== 'delivered'}
											<button
												class="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-105 text-red-600"
												title="Cancelar"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="px-6 py-4 border-t border-gray-200">
					<div class="flex items-center justify-between">
						<p class="text-sm text-gray-700">
							Mostrando <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até 
							<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> de 
							<span class="font-medium">{filteredOrders.length}</span> resultados
						</p>
						<div class="flex items-center gap-2">
							<button
								onclick={() => currentPage = Math.max(1, currentPage - 1)}
								disabled={currentPage === 1}
								class="btn btn-sm btn-ghost"
							>
								Anterior
							</button>
							<div class="flex gap-1">
								{#each Array(Math.min(5, totalPages)) as _, i}
									<button
										onclick={() => currentPage = i + 1}
										class="w-8 h-8 rounded {currentPage === i + 1 ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'} transition-all"
									>
										{i + 1}
									</button>
								{/each}
							</div>
							<button
								onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
								disabled={currentPage === totalPages}
								class="btn btn-sm btn-ghost"
							>
								Próximo
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Grid View -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each paginatedOrders as order, i}
				<div 
					class="card hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
					in:scale={{ duration: 400, delay: i * 50, easing: backOut }}
				>
					<div class="card-body">
						<div class="flex items-start justify-between mb-4">
							<div class="flex items-center gap-3">
								<div class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold">
									#{order.id.slice(-3)}
								</div>
								<div>
									<p class="font-semibold text-gray-900">Pedido #{order.id}</p>
									<p class="text-sm text-gray-500">{formatDate(order.created)}</p>
								</div>
							</div>
							<span class="badge {getStatusBadge(order.status)}">
								{getStatusLabel(order.status)}
							</span>
						</div>
						
						<div class="space-y-3">
							<div>
								<p class="text-sm text-gray-600">Cliente</p>
								<p class="font-medium">{order.customer}</p>
								<p class="text-sm text-gray-500">{order.email}</p>
							</div>
							
							<div class="flex justify-between items-center">
								<div>
									<p class="text-sm text-gray-600">Total</p>
									<p class="text-xl font-bold text-gray-900">{formatPrice(order.total)}</p>
								</div>
								<div class="text-right">
									<p class="text-sm text-gray-600">{order.items} {order.items > 1 ? 'itens' : 'item'}</p>
									<p class="text-sm font-medium">{order.payment}</p>
								</div>
							</div>
						</div>
						
						<div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
							<button class="btn btn-sm btn-ghost flex-1">
								Ver Detalhes
							</button>
							<button class="btn btn-sm btn-primary flex-1">
								Gerenciar
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Animações customizadas para os cards */
	:global(.stat-card) {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	:global(.stat-card:hover) {
		transform: translateY(-4px) scale(1.02);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}
</style> 