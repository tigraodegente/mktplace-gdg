<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import ResponsiveTable from '$lib/components/ResponsiveTable.svelte';
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
		number: string;
		date: string;
		customer: string;
		items: number;
		total: number;
		status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
		payment: string;
		shipping: string;
		// Propriedades extras quando selectedOrder
		orderNumber?: string;
		createdAt?: string;
		paymentMethod?: 'credit_card' | 'pix' | 'boleto';
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
		startDate?: string;
		endDate?: string;
		vendor?: string;
	}
	
	// Estado
	let orders = $state<Order[]>([]);
	let filteredOrders = $state<Order[]>([]);
	let loading = $state(true);
	let selectedOrders = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(false);
	let userRole = $state<'admin' | 'vendor'>('admin');
	
	// Modal states
	let showOrderModal = $state(false);
	let selectedOrder = $state<Order | null>(null);
	let showCreateModal = $state(false);
	let orderFormData = $state({
		customerName: '',
		customerEmail: '',
		customerPhone: '',
		items: [] as Array<{
			id: string;
			name: string;
			quantity: number;
			price: number;
		}>,
		shippingAddress: {
			street: '',
			city: '',
			state: '',
			zipCode: '',
			country: 'Brasil'
		},
		paymentMethod: 'credit_card' as 'credit_card' | 'pix' | 'boleto',
		notes: '',
		status: 'pending' as Order['status']
	});
	
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
	
	// Configuração das colunas da tabela
	const tableColumns = [
		{
			key: 'id',
			label: 'Pedido',
			render: (value: string, row: Order) => `
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-semibold">
						#${value.slice(-3)}
					</div>
					<div>
						<p class="font-medium text-gray-900">#${value}</p>
						<p class="text-sm text-gray-500">${row.items} ${row.items > 1 ? 'itens' : 'item'}</p>
					</div>
				</div>
			`
		},
		{
			key: 'customer',
			label: 'Cliente'
		},
		{
			key: 'status',
			label: 'Status',
			render: (value: string) => `
				<span class="badge ${getStatusBadge(value)}">
					${getStatusLabel(value)}
				</span>
			`
		},
		{
			key: 'total',
			label: 'Total',
			render: (value: number) => formatPrice(value)
		},
		{
			key: 'payment',
			label: 'Pagamento',
			mobileHidden: true
		},
		{
			key: 'vendor',
			label: 'Vendedor',
			mobileHidden: true
		},
		{
			key: 'date',
			label: 'Data',
			render: (value: string) => formatDate(value),
			mobileHidden: true
		}
	].filter(col => !(col.key === 'vendor' && userRole !== 'admin'));
	
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
	});
	
	// Funções do modal
	function openOrderDetails(order: Order) {
		selectedOrder = order;
		showOrderModal = true;
	}
	
	function closeOrderModal() {
		selectedOrder = null;
		showOrderModal = false;
	}
	
	function openCreateModal() {
		orderFormData = {
			customerName: '',
			customerEmail: '',
			customerPhone: '',
			items: [],
			shippingAddress: {
				street: '',
				city: '',
				state: '',
				zipCode: '',
				country: 'Brasil'
			},
			paymentMethod: 'credit_card',
			notes: '',
			status: 'pending'
		};
		showCreateModal = true;
	}
	
	function closeCreateModal() {
		showCreateModal = false;
	}
	
	function addItem() {
		orderFormData.items = [...orderFormData.items, {
			id: crypto.randomUUID(),
			name: '',
			quantity: 1,
			price: 0
		}];
	}
	
	function removeItem(id: string) {
		orderFormData.items = orderFormData.items.filter(item => item.id !== id);
	}
	
	function updateOrderStatus(orderId: string, newStatus: Order['status']) {
		const order = orders.find(o => o.id === orderId);
		if (order) {
			order.status = newStatus;
			// Aqui faria a chamada para API
			console.log(`Atualizando pedido ${orderId} para status ${newStatus}`);
		}
	}
	
	async function saveOrder() {
		// Validações
		if (!orderFormData.customerName || !orderFormData.customerEmail) {
			alert('Nome e email do cliente são obrigatórios');
			return;
		}
		
		if (orderFormData.items.length === 0) {
			alert('Adicione pelo menos um item ao pedido');
			return;
		}
		
		console.log('Salvando pedido:', orderFormData);
		// Simular salvamento
		setTimeout(() => {
			alert('Pedido criado com sucesso!');
			closeCreateModal();
			loadOrders();
		}, 500);
	}
	
	onMount(() => {
		loadOrders();
	});
	
	async function loadOrders() {
		loading = true;
		
		try {
			// Construir query params
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: itemsPerPage.toString()
			});
			
			if (filters.search) params.append('search', filters.search);
			if (filters.status !== 'all') params.append('status', filters.status);
			if (filters.payment !== 'all') params.append('payment', filters.payment);
			if (filters.dateRange === 'custom' && filters.startDate) {
				params.append('dateFrom', filters.startDate);
			}
			if (filters.dateRange === 'custom' && filters.endDate) {
				params.append('dateTo', filters.endDate);
			}
			
			// Buscar pedidos da API
			const response = await fetch(`/api/orders?${params}`);
			const result = await response.json();
			
			if (result.success) {
				orders = result.data.orders.map((order: any) => ({
					id: order.id,
					number: order.orderNumber,
					date: order.createdAt,
					customer: order.customer.name,
					items: order.itemCount,
					total: order.total,
					status: order.status,
					payment: order.paymentStatus,
					shipping: order.shippingAddress || 'Não informado'
				}));
				
				// Inicializar filteredOrders se estiver vazio
				if (filteredOrders.length === 0) {
					filteredOrders = [...orders];
				}
				
				totalPages = result.data.pagination.totalPages;
				
				// Atualizar estatísticas
				updateStats(result.data.stats);
			} else {
				console.error('Erro ao carregar pedidos:', result.error);
			}
		} catch (error) {
			console.error('Erro ao carregar pedidos:', error);
			orders = [];
		} finally {
			loading = false;
		}
	}
	
	function updateStats(apiStats: any) {
		stats = [
			{
				title: 'Total de Pedidos',
				value: apiStats.total.toLocaleString('pt-BR'),
				change: 15,
				icon: '📦',
				color: 'primary'
			},
			{
				title: 'Pedidos Pendentes',
				value: apiStats.pending.toLocaleString('pt-BR'),
				change: -5,
				icon: '⏳',
				color: 'warning'
			},
			{
				title: 'Faturamento Total',
				value: `R$ ${apiStats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
				change: 12,
				icon: '💰',
				color: 'success'
			},
			{
				title: 'Taxa de Conversão',
				value: '2.5%',
				change: 8,
				icon: '📈',
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
			pending: 'badge-warning',
			processing: 'badge-warning',
			shipped: 'badge-info',
			delivered: 'badge-success',
			cancelled: 'badge-danger'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
		
	function getStatusLabel(status: string) {
		const labels = {
			pending: 'Pendente',
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
			<!-- View Toggle -->
			<div class="flex items-center gap-2">
				<button
					onclick={() => viewMode = 'list'}
					class="p-2 rounded-lg transition-colors {viewMode === 'list' ? 'bg-cyan-100 text-cyan-600' : 'text-gray-500 hover:bg-gray-100'}"
					title="Visualização em lista"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
				</button>
				<button
					onclick={() => viewMode = 'grid'}
					class="p-2 rounded-lg transition-colors {viewMode === 'grid' ? 'bg-cyan-100 text-cyan-600' : 'text-gray-500 hover:bg-gray-100'}"
					title="Visualização em grade"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
				</button>
			</div>
			
			<!-- Add Order Button -->
			<button 
				onclick={() => openCreateModal()}
				class="btn btn-primary"
			>
				➕ Novo Pedido
			</button>
			
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
							<option value="pending">Pendente</option>
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
							<option value="credit_card">Cartão de Crédito</option>
							<option value="pix">PIX</option>
							<option value="boleto">Boleto</option>
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
		<ResponsiveTable
			columns={tableColumns}
			data={paginatedOrders}
			keyField="id"
			selectable={true}
			selectedRows={selectedOrders}
			onRowSelect={toggleOrderSelection}
			onSelectAll={toggleAllOrders}
			loading={loading}
			emptyMessage="Nenhum pedido encontrado"
			emptyDescription={filters.search || filters.status !== 'all' || filters.payment !== 'all' 
				? 'Tente ajustar os filtros de busca' 
				: 'Ainda não há pedidos cadastrados'}
		>
			<svelte:fragment slot="actions" let:row>
									<div class="flex items-center justify-end gap-1">
				<button
						onclick={() => openOrderDetails(row)}
											class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
											title="Ver detalhes"
										>
											<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					{#if row.status !== 'cancelled' && row.status !== 'delivered'}
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
			</svelte:fragment>
			
			<svelte:fragment slot="mobile-card-footer" let:row>
				<div class="flex gap-2">
					<button 
						onclick={() => openOrderDetails(row)}
						class="btn btn-sm btn-ghost flex-1"
					>
						Ver Detalhes
					</button>
					<button 
						onclick={() => updateOrderStatus(row.id, 'processing')}
						class="btn btn-sm btn-primary flex-1"
					>
						Gerenciar
					</button>
			</div>
			</svelte:fragment>
		</ResponsiveTable>
			
			<!-- Pagination -->
			{#if totalPages > 1}
			<div class="card mt-4">
				<div class="px-6 py-4">
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
							<div class="hidden md:flex gap-1">
								{#each Array(Math.min(5, totalPages)) as _, i}
									<button
										onclick={() => currentPage = i + 1}
										class="w-8 h-8 rounded {currentPage === i + 1 ? 'bg-cyan-500 text-white' : 'hover:bg-gray-100'} transition-all"
									>
										{i + 1}
									</button>
								{/each}
							</div>
							<span class="md:hidden text-sm text-gray-600">
								{currentPage} / {totalPages}
							</span>
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
		</div>
		{/if}
	{:else}
		<!-- Grid View -->
		{#if paginatedOrders.length === 0}
			<div class="card">
				<div class="card-body py-20 text-center">
					<svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<p class="text-lg font-medium mb-2 text-gray-700">Nenhum pedido encontrado</p>
					<p class="text-sm text-gray-500">
						{filters.search || filters.status !== 'all' || filters.payment !== 'all' 
							? 'Tente ajustar os filtros de busca' 
							: 'Ainda não há pedidos cadastrados'}
					</p>
				</div>
			</div>
		{:else}
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
									<p class="text-sm text-gray-500">{formatDate(order.date)}</p>
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
							<button 
								onclick={() => openOrderDetails(order)}
								class="btn btn-sm btn-ghost flex-1"
							>
								Ver Detalhes
							</button>
							<button 
								onclick={() => updateOrderStatus(order.id, 'processing')}
								class="btn btn-sm btn-primary flex-1"
							>
								Gerenciar
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
		{/if}
	{/if}
	
	<!-- Modal de Detalhes do Pedido -->
	{#if showOrderModal && selectedOrder}
		<div 
			class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
			transition:fade={{ duration: 200 }}
			onclick={closeOrderModal}
		>
			<div 
				class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
				transition:scale={{ duration: 300, easing: backOut }}
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Header -->
				<div class="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-2xl font-bold flex items-center gap-3">
								📦 Pedido #{selectedOrder.id}
							</h2>
							<p class="text-cyan-100 mt-1">Criado em {formatDate(selectedOrder.date)}</p>
						</div>
						<button 
							onclick={closeOrderModal}
							class="p-2 hover:bg-white/20 rounded-lg transition-colors"
						>
							✕
						</button>
					</div>
				</div>
				
				<!-- Content -->
				<div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
					<!-- Status e Ações -->
					<div class="flex items-center justify-between bg-gray-50 rounded-lg p-4">
						<div class="flex items-center gap-4">
							<span class="text-lg font-semibold">Status:</span>
							<span class="badge badge-lg {getStatusBadge(selectedOrder.status)}">
								{getStatusLabel(selectedOrder.status)}
							</span>
						</div>
						<div class="flex items-center gap-2">
							{#if selectedOrder.status === 'pending'}
								<button 
									onclick={() => updateOrderStatus(selectedOrder.id, 'processing')}
									class="btn btn-sm btn-primary"
								>
									Processar Pedido
								</button>
							{:else if selectedOrder.status === 'processing'}
								<button 
									onclick={() => updateOrderStatus(selectedOrder.id, 'shipped')}
									class="btn btn-sm btn-info"
								>
									Marcar como Enviado
								</button>
							{:else if selectedOrder.status === 'shipped'}
								<button 
									onclick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
									class="btn btn-sm btn-success"
								>
									Marcar como Entregue
								</button>
							{/if}
							{#if selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered'}
								<button 
									onclick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
									class="btn btn-sm btn-danger"
								>
									Cancelar Pedido
								</button>
							{/if}
						</div>
					</div>
					
					<!-- Informações do Cliente -->
					<div class="bg-white border border-gray-200 rounded-lg p-4">
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							👤 Informações do Cliente
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<p class="text-sm text-gray-600">Nome</p>
								<p class="font-medium">{selectedOrder.customer}</p>
							</div>
							<div>
								<p class="text-sm text-gray-600">Email</p>
								<p class="font-medium">{selectedOrder.orderNumber}</p>
							</div>
						</div>
					</div>
					
					<!-- Itens do Pedido -->
					<div class="bg-white border border-gray-200 rounded-lg p-4">
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							🛍️ Itens do Pedido
						</h3>
						<div class="space-y-3">
							{#each Array(selectedOrder.items) as _, i}
								<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
									<div class="flex items-center gap-3">
										<div class="w-12 h-12 bg-gray-200 rounded-lg"></div>
										<div>
											<p class="font-medium">Produto {i + 1}</p>
											<p class="text-sm text-gray-600">SKU: PROD-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
										</div>
									</div>
									<div class="text-right">
										<p class="font-medium">{formatPrice(Math.random() * 500 + 50)}</p>
										<p class="text-sm text-gray-600">Qtd: {Math.floor(Math.random() * 3) + 1}</p>
									</div>
								</div>
							{/each}
						</div>
						
						<!-- Resumo -->
						<div class="mt-4 pt-4 border-t border-gray-200 space-y-2">
							<div class="flex justify-between text-sm">
								<span class="text-gray-600">Subtotal</span>
								<span>{formatPrice(selectedOrder.total * 0.85)}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600">Frete</span>
								<span>{formatPrice(selectedOrder.total * 0.1)}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600">Impostos</span>
								<span>{formatPrice(selectedOrder.total * 0.05)}</span>
							</div>
							<div class="flex justify-between font-semibold text-lg pt-2 border-t">
								<span>Total</span>
								<span>{formatPrice(selectedOrder.total)}</span>
							</div>
						</div>
					</div>
					
					<!-- Informações de Pagamento -->
					<div class="bg-white border border-gray-200 rounded-lg p-4">
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							💳 Informações de Pagamento
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<p class="text-sm text-gray-600">Método</p>
								<p class="font-medium">
									{selectedOrder.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 
									 selectedOrder.paymentMethod === 'pix' ? 'PIX' : 'Boleto'}
								</p>
							</div>
							<div>
								<p class="text-sm text-gray-600">Status do Pagamento</p>
								<p class="font-medium text-green-600">Aprovado</p>
							</div>
						</div>
					</div>
					
					<!-- Timeline -->
					<div class="bg-white border border-gray-200 rounded-lg p-4">
						<h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
							📍 Histórico do Pedido
						</h3>
						<div class="space-y-4">
							<div class="flex gap-4">
								<div class="flex flex-col items-center">
									<div class="w-3 h-3 bg-green-500 rounded-full"></div>
									<div class="w-0.5 h-full bg-gray-200"></div>
								</div>
								<div class="pb-4">
									<p class="font-medium">Pedido Criado</p>
									<p class="text-sm text-gray-600">{formatDate(selectedOrder.date)} às 10:30</p>
								</div>
							</div>
							{#if selectedOrder.status !== 'pending'}
								<div class="flex gap-4">
									<div class="flex flex-col items-center">
										<div class="w-3 h-3 bg-green-500 rounded-full"></div>
										<div class="w-0.5 h-full bg-gray-200"></div>
									</div>
									<div class="pb-4">
										<p class="font-medium">Pagamento Aprovado</p>
										<p class="text-sm text-gray-600">{formatDate(selectedOrder.date)} às 10:35</p>
									</div>
								</div>
							{/if}
							{#if ['processing', 'shipped', 'delivered'].includes(selectedOrder.status)}
								<div class="flex gap-4">
									<div class="flex flex-col items-center">
										<div class="w-3 h-3 bg-green-500 rounded-full"></div>
										<div class="w-0.5 h-full bg-gray-200"></div>
									</div>
									<div class="pb-4">
										<p class="font-medium">Em Processamento</p>
										<p class="text-sm text-gray-600">{formatDate(selectedOrder.date)} às 11:00</p>
									</div>
								</div>
							{/if}
							{#if ['shipped', 'delivered'].includes(selectedOrder.status)}
								<div class="flex gap-4">
									<div class="flex flex-col items-center">
										<div class="w-3 h-3 bg-green-500 rounded-full"></div>
										<div class="w-0.5 h-full bg-gray-200"></div>
									</div>
									<div class="pb-4">
										<p class="font-medium">Enviado</p>
										<p class="text-sm text-gray-600">{formatDate(selectedOrder.date)} às 14:00</p>
									</div>
								</div>
							{/if}
							{#if selectedOrder.status === 'delivered'}
								<div class="flex gap-4">
									<div class="flex flex-col items-center">
										<div class="w-3 h-3 bg-green-500 rounded-full"></div>
									</div>
									<div>
										<p class="font-medium">Entregue</p>
										<p class="text-sm text-gray-600">{formatDate(selectedOrder.date)} às 16:30</p>
									</div>
								</div>
							{/if}
							{#if selectedOrder.status === 'cancelled'}
								<div class="flex gap-4">
									<div class="flex flex-col items-center">
										<div class="w-3 h-3 bg-red-500 rounded-full"></div>
									</div>
									<div>
										<p class="font-medium text-red-600">Cancelado</p>
										<p class="text-sm text-gray-600">{formatDate(selectedOrder.date)} às 12:00</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Modal de Criar Pedido -->
	{#if showCreateModal}
		<div 
			class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
			transition:fade={{ duration: 200 }}
			onclick={closeCreateModal}
		>
			<div 
				class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
				transition:scale={{ duration: 300, easing: backOut }}
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Header -->
				<div class="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
					<div class="flex items-center justify-between">
						<h2 class="text-2xl font-bold flex items-center gap-3">
							📦 Novo Pedido
						</h2>
						<button 
							onclick={closeCreateModal}
							class="p-2 hover:bg-white/20 rounded-lg transition-colors"
						>
							✕
						</button>
					</div>
				</div>
				
				<!-- Content -->
				<div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
					<!-- Cliente -->
					<div class="space-y-4">
						<h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
							👤 Informações do Cliente
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Nome *
								</label>
								<input
									type="text"
									bind:value={orderFormData.customerName}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="João Silva"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Email *
								</label>
								<input
									type="email"
									bind:value={orderFormData.customerEmail}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="joao@email.com"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Telefone
								</label>
								<input
									type="tel"
									bind:value={orderFormData.customerPhone}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="(11) 98765-4321"
								/>
							</div>
						</div>
					</div>
					
					<!-- Itens -->
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
								🛍️ Itens do Pedido
							</h3>
							<button
								onclick={addItem}
								class="btn btn-sm btn-primary"
							>
								➕ Adicionar Item
							</button>
						</div>
						
						{#if orderFormData.items.length === 0}
							<div class="text-center py-8 bg-gray-50 rounded-lg">
								<p class="text-gray-500">Nenhum item adicionado</p>
								<button
									onclick={addItem}
									class="mt-2 text-cyan-600 hover:text-cyan-700"
								>
									Adicionar primeiro item
								</button>
							</div>
						{:else}
							<div class="space-y-3">
								{#each orderFormData.items as item, index}
									<div class="bg-gray-50 rounded-lg p-4">
										<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
											<div class="md:col-span-2">
												<label class="block text-sm font-medium text-gray-700 mb-1">
													Produto
												</label>
												<input
													type="text"
													bind:value={item.name}
													class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
													placeholder="Nome do produto"
												/>
											</div>
											<div>
												<label class="block text-sm font-medium text-gray-700 mb-1">
													Quantidade
												</label>
												<input
													type="number"
													bind:value={item.quantity}
													min="1"
													class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
												/>
											</div>
											<div>
												<label class="block text-sm font-medium text-gray-700 mb-1">
													Preço
												</label>
												<div class="relative">
													<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
													<input
														type="number"
														bind:value={item.price}
														step="0.01"
														min="0"
														class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
													/>
												</div>
											</div>
										</div>
										<div class="mt-3 flex items-center justify-between">
											<p class="text-sm text-gray-600">
												Subtotal: {formatPrice(item.quantity * item.price)}
											</p>
											<button
												onclick={() => removeItem(item.id)}
												class="text-red-600 hover:text-red-700"
											>
												🗑️ Remover
											</button>
										</div>
									</div>
								{/each}
							</div>
							
							<!-- Total -->
							<div class="bg-cyan-50 rounded-lg p-4 text-right">
								<p class="text-lg font-semibold">
									Total: {formatPrice(orderFormData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0))}
								</p>
							</div>
						{/if}
					</div>
					
					<!-- Endereço -->
					<div class="space-y-4">
						<h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
							📍 Endereço de Entrega
						</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="md:col-span-2">
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Endereço
								</label>
								<input
									type="text"
									bind:value={orderFormData.shippingAddress.street}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="Rua das Flores, 123"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Cidade
								</label>
								<input
									type="text"
									bind:value={orderFormData.shippingAddress.city}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="São Paulo"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Estado
								</label>
								<input
									type="text"
									bind:value={orderFormData.shippingAddress.state}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="SP"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									CEP
								</label>
								<input
									type="text"
									bind:value={orderFormData.shippingAddress.zipCode}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									placeholder="01234-567"
								/>
							</div>
						</div>
					</div>
					
					<!-- Pagamento e Observações -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Método de Pagamento
							</label>
							<select
								bind:value={orderFormData.paymentMethod}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							>
								<option value="credit_card">Cartão de Crédito</option>
								<option value="pix">PIX</option>
								<option value="boleto">Boleto</option>
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Status do Pedido
							</label>
							<select
								bind:value={orderFormData.status}
								class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							>
								<option value="pending">Pendente</option>
								<option value="processing">Processando</option>
								<option value="shipped">Enviado</option>
								<option value="delivered">Entregue</option>
							</select>
						</div>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Observações
						</label>
						<textarea
							bind:value={orderFormData.notes}
							rows="3"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							placeholder="Observações sobre o pedido..."
						></textarea>
					</div>
				</div>
				
				<!-- Footer -->
				<div class="border-t border-gray-200 p-6">
					<div class="flex items-center justify-between">
						<button
							onclick={closeCreateModal}
							class="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
						>
							Cancelar
						</button>
						<button
							onclick={saveOrder}
							class="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
						>
							Criar Pedido
						</button>
					</div>
				</div>
			</div>
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