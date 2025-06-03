<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut, elasticOut } from 'svelte/easing';
	
	// Crossfade para transições entre views
	const [send, receive] = crossfade({
		duration: 400,
		fallback(node) {
			return blur(node, { amount: 10, duration: 400 });
		}
	});
	
	// Interfaces
	interface Transaction {
		id: string;
		type: 'income' | 'expense' | 'refund' | 'payout';
		description: string;
		amount: number;
		fee?: number;
		net_amount: number;
		status: 'pending' | 'completed' | 'failed' | 'cancelled';
		payment_method?: string;
		order_id?: string;
		customer_name?: string;
		vendor_id?: string;
		vendor_name?: string;
		created_at: string;
		processed_at?: string;
		notes?: string;
	}
	
	interface Payout {
		id: string;
		vendor_id: string;
		vendor_name: string;
		amount: number;
		fee: number;
		net_amount: number;
		status: 'scheduled' | 'processing' | 'completed' | 'failed';
		bank_account?: string;
		scheduled_date: string;
		processed_date?: string;
		transactions_count: number;
	}
	
	interface FinancialSummary {
		gross_revenue: number;
		net_revenue: number;
		total_fees: number;
		pending_payouts: number;
		total_refunds: number;
		average_order_value: number;
		transactions_count: number;
		growth_percentage: number;
	}
	
	interface StatCard {
		title: string;
		value: string | number;
		change?: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
		trend?: 'up' | 'down' | 'stable';
	}
	
	// Estado
	let loading = $state(true);
	let activeTab = $state<'overview' | 'transactions' | 'payouts' | 'reports'>('overview');
	let transactions = $state<Transaction[]>([]);
	let payouts = $state<Payout[]>([]);
	let summary = $state<FinancialSummary | null>(null);
	let stats = $state<StatCard[]>([]);
	let userRole = $state<'admin' | 'vendor'>('admin');
	let selectedPeriod = $state('month');
	let chartData = $state<any>(null);
	let showExportModal = $state(false);
	
	// Filtros de transações
	let transactionFilters = $state({
		search: '',
		type: 'all',
		status: 'all',
		dateRange: 'month',
		payment_method: 'all'
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadFinancialData();
	});
	
	onMount(() => {
		loadFinancialData();
	});
	
	async function loadFinancialData() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Mock summary
			summary = {
				gross_revenue: 125650.50,
				net_revenue: 113085.45,
				total_fees: 12565.05,
				pending_payouts: 25300.00,
				total_refunds: 3200.00,
				average_order_value: 285.50,
				transactions_count: 440,
				growth_percentage: 23.5
			};
			
			// Update stats
			stats = [
				{
					title: 'Receita Bruta',
					value: formatPrice(summary.gross_revenue),
					change: 23.5,
					icon: '💰',
					color: 'success',
					trend: 'up'
				},
				{
					title: 'Receita Líquida',
					value: formatPrice(summary.net_revenue),
					change: 18.2,
					icon: '💵',
					color: 'primary',
					trend: 'up'
				},
				{
					title: 'Pagamentos Pendentes',
					value: formatPrice(summary.pending_payouts),
					change: -12.3,
					icon: '⏳',
					color: 'warning',
					trend: 'down'
				},
				{
					title: 'Ticket Médio',
					value: formatPrice(summary.average_order_value),
					change: 5.8,
					icon: '📊',
					color: 'info',
					trend: 'up'
				}
			];
			
			// Mock transactions
			transactions = Array.from({ length: 50 }, (_, i) => ({
				id: `trans-${i + 1}`,
				type: ['income', 'expense', 'refund', 'payout'][Math.floor(Math.random() * 4)] as any,
				description: ['Venda #12345', 'Taxa de processamento', 'Reembolso pedido #12344', 'Pagamento vendedor'][Math.floor(Math.random() * 4)],
				amount: Math.random() * 1000 + 50,
				fee: Math.random() * 50,
				net_amount: 0,
				status: ['pending', 'completed', 'failed', 'cancelled'][Math.floor(Math.random() * 4)] as any,
				payment_method: ['credit_card', 'pix', 'boleto', 'debit_card'][Math.floor(Math.random() * 4)],
				order_id: `ORD-${1000 + i}`,
				customer_name: ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa'][i % 4],
				vendor_id: userRole === 'vendor' ? 'vendor-1' : `vendor-${(i % 3) + 1}`,
				vendor_name: userRole === 'vendor' ? 'Minha Loja' : ['Loja A', 'Loja B', 'Loja C'][i % 3],
				created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
			}));
			
			// Calculate net amounts
			transactions = transactions.map(t => ({
				...t,
				net_amount: t.type === 'income' ? t.amount - (t.fee || 0) : t.amount
			}));
			
			// Mock payouts
			payouts = Array.from({ length: 10 }, (_, i) => ({
				id: `payout-${i + 1}`,
				vendor_id: userRole === 'vendor' ? 'vendor-1' : `vendor-${(i % 3) + 1}`,
				vendor_name: userRole === 'vendor' ? 'Minha Loja' : ['Loja A', 'Loja B', 'Loja C'][i % 3],
				amount: Math.random() * 5000 + 1000,
				fee: Math.random() * 200 + 50,
				net_amount: 0,
				status: ['scheduled', 'processing', 'completed', 'failed'][Math.floor(Math.random() * 4)] as any,
				bank_account: '**** 1234',
				scheduled_date: new Date(Date.now() + Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
				processed_date: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString() : undefined,
				transactions_count: Math.floor(Math.random() * 50) + 10
			}));
			
			// Calculate net amounts
			payouts = payouts.map(p => ({
				...p,
				net_amount: p.amount - p.fee
			}));
			
			// Filter by vendor if needed
			if (userRole === 'vendor') {
				transactions = transactions.filter(t => t.vendor_id === 'vendor-1');
				payouts = payouts.filter(p => p.vendor_id === 'vendor-1');
			}
			
			// Mock chart data
			chartData = {
				labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
				datasets: [
					{
						label: 'Receita',
						data: [12000, 15000, 18000, 22000, 25000, 28000],
						borderColor: '#06b6d4',
						backgroundColor: 'rgba(6, 182, 212, 0.1)'
					},
					{
						label: 'Despesas',
						data: [2000, 2500, 3000, 3500, 4000, 4500],
						borderColor: '#ef4444',
						backgroundColor: 'rgba(239, 68, 68, 0.1)'
					}
				]
			};
			
			loading = false;
		}, 1000);
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
	
	function formatDateTime(date: string) {
		return new Date(date).toLocaleString('pt-BR');
	}
	
	function getTransactionIcon(type: string) {
		const icons = {
			income: '💵',
			expense: '💸',
			refund: '↩️',
			payout: '🏦'
		};
		return icons[type as keyof typeof icons] || '💰';
	}
	
	function getTransactionColor(type: string) {
		const colors = {
			income: 'text-green-600',
			expense: 'text-red-600',
			refund: 'text-orange-600',
			payout: 'text-blue-600'
		};
		return colors[type as keyof typeof colors] || 'text-gray-600';
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			pending: 'badge-warning',
			processing: 'badge-info',
			completed: 'badge-success',
			failed: 'badge-danger',
			cancelled: 'badge-secondary',
			scheduled: 'badge-primary'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			pending: 'Pendente',
			processing: 'Processando',
			completed: 'Completo',
			failed: 'Falhou',
			cancelled: 'Cancelado',
			scheduled: 'Agendado'
		};
		return labels[status as keyof typeof labels] || status;
	}
	
	function getPaymentMethodIcon(method: string) {
		const icons = {
			credit_card: '💳',
			debit_card: '💳',
			pix: '📱',
			boleto: '📄'
		};
		return icons[method as keyof typeof icons] || '💰';
	}
	
	function getPaymentMethodLabel(method: string) {
		const labels = {
			credit_card: 'Cartão de Crédito',
			debit_card: 'Cartão de Débito',
			pix: 'PIX',
			boleto: 'Boleto'
		};
		return labels[method as keyof typeof labels] || method;
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
	
	// Filtered transactions
	const filteredTransactions = $derived(() => {
		let result = [...transactions];
		
		// Search
		if (transactionFilters.search) {
			result = result.filter(t => 
				t.description.toLowerCase().includes(transactionFilters.search.toLowerCase()) ||
				t.order_id?.toLowerCase().includes(transactionFilters.search.toLowerCase()) ||
				t.customer_name?.toLowerCase().includes(transactionFilters.search.toLowerCase())
			);
		}
		
		// Type
		if (transactionFilters.type !== 'all') {
			result = result.filter(t => t.type === transactionFilters.type);
		}
		
		// Status
		if (transactionFilters.status !== 'all') {
			result = result.filter(t => t.status === transactionFilters.status);
		}
		
		// Payment method
		if (transactionFilters.payment_method !== 'all') {
			result = result.filter(t => t.payment_method === transactionFilters.payment_method);
		}
		
		totalPages = Math.ceil(result.length / itemsPerPage);
		return result;
	});
	
	// Paginated transactions
	const paginatedTransactions = $derived(
		filteredTransactions().slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	async function exportReport(format: 'csv' | 'excel' | 'pdf') {
		console.log(`Exportando relatório em formato ${format}`);
		showExportModal = false;
	}
	
	async function processPayout(payout: Payout) {
		console.log('Processando pagamento:', payout);
		loadFinancialData();
	}
	
	async function cancelPayout(payout: Payout) {
		if (confirm(`Tem certeza que deseja cancelar o pagamento para ${payout.vendor_name}?`)) {
			console.log('Cancelando pagamento:', payout);
			loadFinancialData();
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão Financeira' : 'Meu Financeiro'}
			</h1>
			<p class="text-gray-600 mt-1">Acompanhe receitas, despesas e pagamentos</p>
		</div>
		
		<div class="flex items-center gap-3">
			<!-- Period Selector -->
			<select bind:value={selectedPeriod} class="input">
				<option value="today">Hoje</option>
				<option value="week">Esta Semana</option>
				<option value="month">Este Mês</option>
				<option value="quarter">Este Trimestre</option>
				<option value="year">Este Ano</option>
			</select>
			
			<!-- Export Button -->
			<button 
				onclick={() => showExportModal = true}
				class="btn btn-ghost"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
									{#if stat.trend === 'up'}
										<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
										</svg>
										<span class="text-sm font-semibold text-green-500">+{stat.change}%</span>
									{:else if stat.trend === 'down'}
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
	
	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => activeTab = 'overview'}
				class="py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 {activeTab === 'overview' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Visão Geral
			</button>
			<button
				onclick={() => activeTab = 'transactions'}
				class="py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 {activeTab === 'transactions' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Transações
			</button>
			<button
				onclick={() => activeTab = 'payouts'}
				class="py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 {activeTab === 'payouts' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Pagamentos
			</button>
			<button
				onclick={() => activeTab = 'reports'}
				class="py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 {activeTab === 'reports' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Relatórios
			</button>
		</nav>
	</div>
	
	<!-- Tab Content -->
	<div class="mt-6">
		{#if activeTab === 'overview'}
			<!-- Overview Tab -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6" in:fade={{ duration: 300 }}>
				<!-- Revenue Chart -->
				<div class="card">
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 mb-4">Receita vs Despesas</h3>
						{#if chartData}
							<div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
								<p class="text-gray-500 text-sm">Gráfico de linhas mostrando receita e despesas</p>
							</div>
						{:else}
							<div class="h-64 animate-pulse bg-gray-200 rounded-lg"></div>
						{/if}
					</div>
				</div>
				
				<!-- Payment Methods Chart -->
				<div class="card">
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 mb-4">Métodos de Pagamento</h3>
						<div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
							<p class="text-gray-500 text-sm">Gráfico de pizza dos métodos de pagamento</p>
						</div>
					</div>
				</div>
				
				<!-- Recent Transactions -->
				<div class="card lg:col-span-2">
					<div class="card-body">
						<div class="flex items-center justify-between mb-4">
							<h3 class="font-semibold text-gray-900">Transações Recentes</h3>
							<button 
								onclick={() => activeTab = 'transactions'}
								class="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
							>
								Ver todas →
							</button>
						</div>
						<div class="space-y-3">
							{#each transactions.slice(0, 5) as transaction, i}
								<div 
									class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
									in:fly={{ x: -20, duration: 400, delay: i * 50 }}
								>
									<div class="flex items-center gap-3">
										<div class="text-2xl {getTransactionColor(transaction.type)}">
											{getTransactionIcon(transaction.type)}
										</div>
										<div>
											<p class="font-medium text-gray-900">{transaction.description}</p>
											<p class="text-sm text-gray-500">{formatDateTime(transaction.created_at)}</p>
										</div>
									</div>
									<div class="text-right">
										<p class="font-semibold {transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
											{transaction.type === 'income' ? '+' : '-'}{formatPrice(transaction.amount)}
										</p>
										<span class="badge {getStatusBadge(transaction.status)} badge-sm">
											{getStatusLabel(transaction.status)}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'transactions'}
			<!-- Transactions Tab -->
			<div class="space-y-6" in:fade={{ duration: 300 }}>
				<!-- Filters -->
				<div class="card">
					<div class="card-body">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
							<div>
								<label class="label">Buscar</label>
								<input
									type="text"
									bind:value={transactionFilters.search}
									placeholder="Descrição, pedido..."
									class="input"
								/>
							</div>
							<div>
								<label class="label">Tipo</label>
								<select bind:value={transactionFilters.type} class="input">
									<option value="all">Todos</option>
									<option value="income">Receita</option>
									<option value="expense">Despesa</option>
									<option value="refund">Reembolso</option>
									<option value="payout">Pagamento</option>
								</select>
							</div>
							<div>
								<label class="label">Status</label>
								<select bind:value={transactionFilters.status} class="input">
									<option value="all">Todos</option>
									<option value="pending">Pendente</option>
									<option value="completed">Completo</option>
									<option value="failed">Falhou</option>
									<option value="cancelled">Cancelado</option>
								</select>
							</div>
							<div>
								<label class="label">Método</label>
								<select bind:value={transactionFilters.payment_method} class="input">
									<option value="all">Todos</option>
									<option value="credit_card">Cartão de Crédito</option>
									<option value="debit_card">Cartão de Débito</option>
									<option value="pix">PIX</option>
									<option value="boleto">Boleto</option>
								</select>
							</div>
							<div>
								<label class="label">Período</label>
								<select bind:value={transactionFilters.dateRange} class="input">
									<option value="today">Hoje</option>
									<option value="week">Esta Semana</option>
									<option value="month">Este Mês</option>
									<option value="year">Este Ano</option>
								</select>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Transactions Table -->
				<div class="card overflow-hidden">
					<div class="overflow-x-auto">
						<table class="table-modern">
							<thead>
								<tr>
									<th>Transação</th>
									<th>Tipo</th>
									<th>Valor</th>
									<th>Taxa</th>
									<th>Líquido</th>
									<th>Método</th>
									<th>Status</th>
									<th>Data</th>
								</tr>
							</thead>
							<tbody>
								{#each paginatedTransactions as transaction, i}
									<tr 
										class="hover:bg-gray-50 transition-colors"
										in:fly={{ x: -20, duration: 400, delay: i * 50 }}
									>
										<td>
											<div>
												<p class="font-medium text-gray-900">{transaction.description}</p>
												{#if transaction.order_id}
													<p class="text-sm text-gray-500">Pedido: {transaction.order_id}</p>
												{/if}
												{#if transaction.customer_name}
													<p class="text-sm text-gray-500">{transaction.customer_name}</p>
												{/if}
											</div>
										</td>
										<td>
											<div class="flex items-center gap-2">
												<span class="text-xl {getTransactionColor(transaction.type)}">
													{getTransactionIcon(transaction.type)}
												</span>
												<span class="text-sm capitalize">{transaction.type}</span>
											</div>
										</td>
										<td class="font-medium {transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
											{transaction.type === 'income' ? '+' : '-'}{formatPrice(transaction.amount)}
										</td>
										<td class="text-sm text-gray-600">
											{transaction.fee ? formatPrice(transaction.fee) : '-'}
										</td>
										<td class="font-semibold text-gray-900">
											{formatPrice(transaction.net_amount)}
										</td>
										<td>
											{#if transaction.payment_method}
												<div class="flex items-center gap-2">
													<span class="text-lg">{getPaymentMethodIcon(transaction.payment_method)}</span>
													<span class="text-sm">{getPaymentMethodLabel(transaction.payment_method)}</span>
												</div>
											{:else}
												-
											{/if}
										</td>
										<td>
											<span class="badge {getStatusBadge(transaction.status)}">
												{getStatusLabel(transaction.status)}
											</span>
										</td>
										<td class="text-sm text-gray-600">
											{formatDateTime(transaction.created_at)}
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
									<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredTransactions().length)}</span> de 
									<span class="font-medium">{filteredTransactions().length}</span> resultados
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
			</div>
		{:else if activeTab === 'payouts'}
			<!-- Payouts Tab -->
			<div class="space-y-6" in:fade={{ duration: 300 }}>
				<!-- Upcoming Payouts -->
				<div class="card">
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 mb-4">Próximos Pagamentos</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each payouts.filter(p => p.status === 'scheduled') as payout, i}
								<div 
									class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:scale-[1.02]"
									in:scale={{ duration: 400, delay: i * 50, easing: backOut }}
								>
									<div class="flex items-start justify-between mb-3">
										<div class="text-2xl">🏦</div>
										<span class="badge {getStatusBadge(payout.status)}">
											{getStatusLabel(payout.status)}
										</span>
									</div>
									<h4 class="font-semibold text-gray-900">{payout.vendor_name}</h4>
									<p class="text-sm text-gray-600 mb-3">Conta: {payout.bank_account}</p>
									
									<div class="space-y-2 text-sm">
										<div class="flex justify-between">
											<span class="text-gray-600">Valor bruto:</span>
											<span class="font-medium">{formatPrice(payout.amount)}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-gray-600">Taxa:</span>
											<span class="font-medium text-red-600">-{formatPrice(payout.fee)}</span>
										</div>
										<div class="flex justify-between pt-2 border-t">
											<span class="text-gray-900 font-medium">Líquido:</span>
											<span class="font-semibold text-green-600">{formatPrice(payout.net_amount)}</span>
										</div>
									</div>
									
									<div class="mt-4 flex items-center justify-between text-sm">
										<span class="text-gray-600">Agendado para:</span>
										<span class="font-medium">{formatDate(payout.scheduled_date)}</span>
									</div>
									
									<div class="mt-4 flex gap-2">
										<button 
											onclick={() => processPayout(payout)}
											class="btn btn-sm btn-primary flex-1"
										>
											Processar
										</button>
										<button 
											onclick={() => cancelPayout(payout)}
											class="btn btn-sm btn-ghost flex-1"
										>
											Cancelar
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Payout History -->
				<div class="card">
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 mb-4">Histórico de Pagamentos</h3>
						<div class="overflow-x-auto">
							<table class="table-modern">
								<thead>
									<tr>
										<th>Vendedor</th>
										<th>Valor</th>
										<th>Taxa</th>
										<th>Líquido</th>
										<th>Transações</th>
										<th>Status</th>
										<th>Data</th>
									</tr>
								</thead>
								<tbody>
									{#each payouts as payout, i}
										<tr 
											class="hover:bg-gray-50 transition-colors"
											in:fly={{ x: -20, duration: 400, delay: i * 50 }}
										>
											<td class="font-medium text-gray-900">{payout.vendor_name}</td>
											<td>{formatPrice(payout.amount)}</td>
											<td class="text-red-600">-{formatPrice(payout.fee)}</td>
											<td class="font-semibold text-green-600">{formatPrice(payout.net_amount)}</td>
											<td class="text-center">{payout.transactions_count}</td>
											<td>
												<span class="badge {getStatusBadge(payout.status)}">
													{getStatusLabel(payout.status)}
												</span>
											</td>
											<td class="text-sm text-gray-600">
												{payout.processed_date ? formatDate(payout.processed_date) : formatDate(payout.scheduled_date)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'reports'}
			<!-- Reports Tab -->
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6" in:fade={{ duration: 300 }}>
				<!-- Financial Summary -->
				<div class="card">
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
						{#if summary}
							<div class="space-y-3">
								<div class="flex justify-between items-center py-2 border-b">
									<span class="text-gray-600">Receita Bruta</span>
									<span class="font-semibold text-gray-900">{formatPrice(summary.gross_revenue)}</span>
								</div>
								<div class="flex justify-between items-center py-2 border-b">
									<span class="text-gray-600">Total de Taxas</span>
									<span class="font-semibold text-red-600">-{formatPrice(summary.total_fees)}</span>
								</div>
								<div class="flex justify-between items-center py-2 border-b">
									<span class="text-gray-600">Reembolsos</span>
									<span class="font-semibold text-orange-600">-{formatPrice(summary.total_refunds)}</span>
								</div>
								<div class="flex justify-between items-center py-2 border-b">
									<span class="text-gray-900 font-medium">Receita Líquida</span>
									<span class="font-bold text-green-600 text-lg">{formatPrice(summary.net_revenue)}</span>
								</div>
								<div class="flex justify-between items-center py-2">
									<span class="text-gray-600">Crescimento</span>
									<span class="font-semibold {summary.growth_percentage > 0 ? 'text-green-600' : 'text-red-600'}">
										{summary.growth_percentage > 0 ? '+' : ''}{summary.growth_percentage}%
									</span>
								</div>
							</div>
						{/if}
					</div>
				</div>
				
				<!-- Top Products -->
				<div class="card">
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 mb-4">Produtos Mais Vendidos</h3>
						<div class="space-y-3">
							{#each Array(5) as _, i}
								<div 
									class="flex items-center justify-between"
									in:fly={{ x: -20, duration: 400, delay: i * 50 }}
								>
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
										<div>
											<p class="font-medium text-gray-900">Produto {i + 1}</p>
											<p class="text-sm text-gray-500">{Math.floor(Math.random() * 100) + 50} vendas</p>
										</div>
									</div>
									<p class="font-semibold text-gray-900">
										{formatPrice(Math.random() * 5000 + 1000)}
									</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Export Options -->
				<div class="card lg:col-span-2">
					<div class="card-body">
						<h3 class="font-semibold text-gray-900 mb-4">Exportar Relatórios</h3>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<button 
								onclick={() => exportReport('csv')}
								class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:scale-[1.02] text-center"
							>
								<div class="text-3xl mb-2">📄</div>
								<h4 class="font-medium text-gray-900">Exportar CSV</h4>
								<p class="text-sm text-gray-600 mt-1">Dados em formato CSV para Excel</p>
							</button>
							<button 
								onclick={() => exportReport('excel')}
								class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:scale-[1.02] text-center"
							>
								<div class="text-3xl mb-2">📊</div>
								<h4 class="font-medium text-gray-900">Exportar Excel</h4>
								<p class="text-sm text-gray-600 mt-1">Relatório formatado em Excel</p>
							</button>
							<button 
								onclick={() => exportReport('pdf')}
								class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all hover:scale-[1.02] text-center"
							>
								<div class="text-3xl mb-2">📑</div>
								<h4 class="font-medium text-gray-900">Exportar PDF</h4>
								<p class="text-sm text-gray-600 mt-1">Relatório completo em PDF</p>
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Export Modal -->
{#if showExportModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 200 }}>
		<div 
			class="bg-white rounded-xl shadow-xl max-w-md w-full"
			in:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900">Exportar Relatório</h2>
					<button 
						onclick={() => showExportModal = false}
						class="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<div class="space-y-4">
					<div>
						<label class="label">Período</label>
						<select class="input">
							<option>Este Mês</option>
							<option>Último Mês</option>
							<option>Este Trimestre</option>
							<option>Este Ano</option>
							<option>Personalizado</option>
						</select>
					</div>
					
					<div>
						<label class="label">Formato</label>
						<div class="grid grid-cols-3 gap-3">
							<button class="p-3 border border-gray-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-all text-center">
								<div class="text-2xl mb-1">📄</div>
								<span class="text-sm">CSV</span>
							</button>
							<button class="p-3 border border-gray-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-all text-center">
								<div class="text-2xl mb-1">📊</div>
								<span class="text-sm">Excel</span>
							</button>
							<button class="p-3 border border-gray-200 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-all text-center">
								<div class="text-2xl mb-1">📑</div>
								<span class="text-sm">PDF</span>
							</button>
						</div>
					</div>
					
					<div>
						<label class="label">Incluir</label>
						<div class="space-y-2">
							<label class="flex items-center gap-2">
								<input type="checkbox" checked class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
								<span class="text-sm">Transações</span>
							</label>
							<label class="flex items-center gap-2">
								<input type="checkbox" checked class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
								<span class="text-sm">Resumo Financeiro</span>
							</label>
							<label class="flex items-center gap-2">
								<input type="checkbox" class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
								<span class="text-sm">Gráficos</span>
							</label>
						</div>
					</div>
				</div>
				
				<div class="flex justify-end gap-3 mt-6 pt-6 border-t">
					<button 
						onclick={() => showExportModal = false}
						class="btn btn-ghost"
					>
						Cancelar
					</button>
					<button 
						onclick={() => exportReport('csv')}
						class="btn btn-primary"
					>
						Exportar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

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