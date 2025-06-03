<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade, scale, slide, blur, crossfade } from 'svelte/transition';
	import { quintOut, elasticOut, backOut } from 'svelte/easing';

	interface Return {
		id: string;
		orderId: string;
		orderNumber: string;
		customer: {
			name: string;
			email: string;
			avatar?: string;
		};
		items: Array<{
			id: string;
			name: string;
			image: string;
			price: number;
			quantity: number;
			reason: string;
		}>;
		status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'refunded';
		type: 'exchange' | 'refund' | 'credit';
		reason: string;
		description?: string;
		tracking?: {
			carrier: string;
			code: string;
			url?: string;
		};
		timeline: Array<{
			status: string;
			date: Date;
			description: string;
			user?: string;
		}>;
		refund?: {
			amount: number;
			method: string;
			date?: Date;
			transactionId?: string;
		};
		images?: string[];
		createdAt: Date;
		updatedAt: Date;
		totalAmount: number;
		approvedBy?: string;
		notes?: string;
	}

	let returns = $state<Return[]>([]);
	let filteredReturns = $derived(applyFilters());
	let selectedReturns = $state<Set<string>>(new Set());
	let searchQuery = $state('');
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(false);
	let showDetailModal = $state(false);
	let selectedReturn = $state<Return | null>(null);
	let currentPage = $state(1);
	let itemsPerPage = 10;

	// Filtros
	let filters = $state({
		status: 'all',
		type: 'all',
		dateRange: 'all',
		reason: 'all'
	});

	// Estatísticas
	let stats = $derived({
		total: returns.length,
		pending: returns.filter(r => r.status === 'pending').length,
		processing: returns.filter(r => ['approved', 'processing'].includes(r.status)).length,
		completed: returns.filter(r => ['completed', 'refunded'].includes(r.status)).length,
		totalValue: returns.reduce((sum, r) => sum + r.totalAmount, 0),
		avgProcessingTime: calculateAvgProcessingTime()
	});

	onMount(() => {
		loadReturns();
	});

	function loadReturns() {
		// Mock data
		returns = [
			{
				id: '1',
				orderId: 'order-1',
				orderNumber: '#2024001',
				customer: {
					name: 'Maria Silva',
					email: 'maria@email.com',
					avatar: 'https://i.pravatar.cc/150?img=1'
				},
				items: [
					{
						id: 'item-1',
						name: 'Notebook Dell Inspiron 15',
						image: 'https://picsum.photos/100/100?random=1',
						price: 3499.90,
						quantity: 1,
						reason: 'Defeito de fabricação'
					}
				],
				status: 'pending',
				type: 'refund',
				reason: 'defective',
				description: 'Notebook apresentou defeito na tela após 2 dias de uso',
				timeline: [
					{
						status: 'Solicitação criada',
						date: new Date('2024-01-20'),
						description: 'Cliente solicitou devolução',
						user: 'Maria Silva'
					}
				],
				images: ['https://picsum.photos/400/300?random=10'],
				createdAt: new Date('2024-01-20'),
				updatedAt: new Date('2024-01-20'),
				totalAmount: 3499.90
			},
			{
				id: '2',
				orderId: 'order-2',
				orderNumber: '#2024002',
				customer: {
					name: 'João Santos',
					email: 'joao@email.com',
					avatar: 'https://i.pravatar.cc/150?img=2'
				},
				items: [
					{
						id: 'item-2',
						name: 'Mouse Gamer RGB',
						image: 'https://picsum.photos/100/100?random=2',
						price: 189.90,
						quantity: 1,
						reason: 'Produto diferente do anunciado'
					},
					{
						id: 'item-3',
						name: 'Mousepad Gamer XL',
						image: 'https://picsum.photos/100/100?random=3',
						price: 79.90,
						quantity: 1,
						reason: 'Produto diferente do anunciado'
					}
				],
				status: 'approved',
				type: 'exchange',
				reason: 'wrong_product',
				description: 'Produtos enviados não correspondem ao pedido',
				tracking: {
					carrier: 'Correios',
					code: 'BR123456789BR',
					url: 'https://rastreamento.correios.com.br'
				},
				timeline: [
					{
						status: 'Solicitação criada',
						date: new Date('2024-01-18'),
						description: 'Cliente solicitou troca',
						user: 'João Santos'
					},
					{
						status: 'Aprovada',
						date: new Date('2024-01-19'),
						description: 'Devolução aprovada pelo suporte',
						user: 'Admin'
					},
					{
						status: 'Etiqueta gerada',
						date: new Date('2024-01-19'),
						description: 'Código de rastreamento: BR123456789BR',
						user: 'Sistema'
					}
				],
				createdAt: new Date('2024-01-18'),
				updatedAt: new Date('2024-01-19'),
				totalAmount: 269.80,
				approvedBy: 'Admin'
			},
			{
				id: '3',
				orderId: 'order-3',
				orderNumber: '#2024003',
				customer: {
					name: 'Ana Costa',
					email: 'ana@email.com',
					avatar: 'https://i.pravatar.cc/150?img=3'
				},
				items: [
					{
						id: 'item-4',
						name: 'Smartphone Samsung Galaxy',
						image: 'https://picsum.photos/100/100?random=4',
						price: 2899.00,
						quantity: 1,
						reason: 'Arrependimento'
					}
				],
				status: 'refunded',
				type: 'refund',
				reason: 'changed_mind',
				description: 'Cliente desistiu da compra',
				refund: {
					amount: 2899.00,
					method: 'Cartão de Crédito',
					date: new Date('2024-01-15'),
					transactionId: 'REF-2024-0003'
				},
				timeline: [
					{
						status: 'Solicitação criada',
						date: new Date('2024-01-10'),
						description: 'Cliente solicitou reembolso',
						user: 'Ana Costa'
					},
					{
						status: 'Aprovada',
						date: new Date('2024-01-11'),
						description: 'Reembolso aprovado',
						user: 'Admin'
					},
					{
						status: 'Produto recebido',
						date: new Date('2024-01-14'),
						description: 'Produto devolvido em perfeitas condições',
						user: 'Estoque'
					},
					{
						status: 'Reembolsado',
						date: new Date('2024-01-15'),
						description: 'Valor estornado no cartão',
						user: 'Sistema'
					}
				],
				createdAt: new Date('2024-01-10'),
				updatedAt: new Date('2024-01-15'),
				totalAmount: 2899.00,
				approvedBy: 'Admin'
			},
			{
				id: '4',
				orderId: 'order-4',
				orderNumber: '#2024004',
				customer: {
					name: 'Pedro Oliveira',
					email: 'pedro@email.com'
				},
				items: [
					{
						id: 'item-5',
						name: 'Teclado Mecânico',
						image: 'https://picsum.photos/100/100?random=5',
						price: 449.90,
						quantity: 1,
						reason: 'Defeito após uso'
					}
				],
				status: 'processing',
				type: 'refund',
				reason: 'defective',
				description: 'Algumas teclas pararam de funcionar',
				timeline: [
					{
						status: 'Solicitação criada',
						date: new Date('2024-01-22'),
						description: 'Cliente relatou defeito',
						user: 'Pedro Oliveira'
					},
					{
						status: 'Em análise',
						date: new Date('2024-01-23'),
						description: 'Produto em análise técnica',
						user: 'Técnico'
					}
				],
				createdAt: new Date('2024-01-22'),
				updatedAt: new Date('2024-01-23'),
				totalAmount: 449.90
			},
			{
				id: '5',
				orderId: 'order-5',
				orderNumber: '#2024005',
				customer: {
					name: 'Carla Mendes',
					email: 'carla@email.com',
					avatar: 'https://i.pravatar.cc/150?img=5'
				},
				items: [
					{
						id: 'item-6',
						name: 'Fone Bluetooth',
						image: 'https://picsum.photos/100/100?random=6',
						price: 299.90,
						quantity: 2,
						reason: 'Não atendeu expectativas'
					}
				],
				status: 'rejected',
				type: 'refund',
				reason: 'not_satisfied',
				description: 'Som não é tão bom quanto esperado',
				timeline: [
					{
						status: 'Solicitação criada',
						date: new Date('2024-01-15'),
						description: 'Cliente insatisfeito com qualidade',
						user: 'Carla Mendes'
					},
					{
						status: 'Rejeitada',
						date: new Date('2024-01-16'),
						description: 'Produto funcionando normalmente, sem defeitos',
						user: 'Admin'
					}
				],
				notes: 'Produto está em perfeito funcionamento. Insatisfação subjetiva não é coberta pela política de devolução.',
				createdAt: new Date('2024-01-15'),
				updatedAt: new Date('2024-01-16'),
				totalAmount: 599.80
			}
		];
	}

	function applyFilters() {
		let result = [...returns];

		// Busca
		if (searchQuery) {
			result = result.filter(r => 
				r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
			);
		}

		// Status
		if (filters.status !== 'all') {
			result = result.filter(r => r.status === filters.status);
		}

		// Tipo
		if (filters.type !== 'all') {
			result = result.filter(r => r.type === filters.type);
		}

		// Data
		if (filters.dateRange !== 'all') {
			const now = new Date();
			const ranges: Record<string, number> = {
				today: 0,
				week: 7,
				month: 30,
				quarter: 90
			};
			const days = ranges[filters.dateRange];
			if (days !== undefined) {
				result = result.filter(r => {
					const diff = (now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
					return diff <= days;
				});
			}
		}

		// Motivo
		if (filters.reason !== 'all') {
			result = result.filter(r => r.reason === filters.reason);
		}

		return result;
	}

	function calculateAvgProcessingTime() {
		const completed = returns.filter(r => r.status === 'completed' || r.status === 'refunded');
		if (completed.length === 0) return 0;

		const totalDays = completed.reduce((sum, r) => {
			const days = (r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
			return sum + days;
		}, 0);

		return Math.round(totalDays / completed.length);
	}

	function handleSelectAll() {
		if (selectedReturns.size === filteredReturns.length) {
			selectedReturns.clear();
		} else {
			selectedReturns = new Set(filteredReturns.map(r => r.id));
		}
		selectedReturns = selectedReturns;
	}

	function handleSelect(id: string) {
		if (selectedReturns.has(id)) {
			selectedReturns.delete(id);
		} else {
			selectedReturns.add(id);
		}
		selectedReturns = selectedReturns;
	}

	function handleBulkAction(action: string) {
		if (selectedReturns.size === 0) return;

		switch (action) {
			case 'approve':
				alert(`Aprovando ${selectedReturns.size} devoluções`);
				break;
			case 'reject':
				alert(`Rejeitando ${selectedReturns.size} devoluções`);
				break;
			case 'export':
				alert(`Exportando ${selectedReturns.size} devoluções`);
				break;
		}
		selectedReturns.clear();
		selectedReturns = selectedReturns;
	}

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(date);
	}

	function formatDateTime(date: Date): string {
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getStatusColor(status: Return['status']) {
		const colors = {
			pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
			approved: 'bg-blue-100 text-blue-800 border-blue-200',
			rejected: 'bg-red-100 text-red-800 border-red-200',
			processing: 'bg-orange-100 text-orange-800 border-orange-200',
			completed: 'bg-green-100 text-green-800 border-green-200',
			refunded: 'bg-purple-100 text-purple-800 border-purple-200'
		};
		return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
	}

	function getStatusLabel(status: Return['status']) {
		const labels = {
			pending: 'Pendente',
			approved: 'Aprovada',
			rejected: 'Rejeitada',
			processing: 'Processando',
			completed: 'Concluída',
			refunded: 'Reembolsada'
		};
		return labels[status] || status;
	}

	function getTypeLabel(type: Return['type']) {
		const labels = {
			exchange: 'Troca',
			refund: 'Reembolso',
			credit: 'Crédito'
		};
		return labels[type] || type;
	}

	function getReasonLabel(reason: string) {
		const labels: Record<string, string> = {
			defective: 'Defeito',
			wrong_product: 'Produto errado',
			damaged: 'Danificado',
			not_satisfied: 'Insatisfeito',
			changed_mind: 'Arrependimento',
			other: 'Outro'
		};
		return labels[reason] || reason;
	}

	function openDetailModal(ret: Return) {
		selectedReturn = ret;
		showDetailModal = true;
	}

	// Paginação
	let paginatedReturns = $derived(
		filteredReturns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);
	let totalPages = $derived(Math.ceil(filteredReturns.length / itemsPerPage));
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
	<!-- Header -->
	<div class="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<div in:fly={{ x: -20, duration: 500, easing: quintOut }}>
					<h1 class="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
						Devoluções
					</h1>
					<p class="text-gray-600 mt-1">Gerencie solicitações de devolução e trocas</p>
				</div>
				
				<div class="flex items-center gap-3" in:fly={{ x: 20, duration: 500, delay: 100, easing: quintOut }}>
					<button
						class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						Exportar
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
			{#each [
				{ label: 'Total de Devoluções', value: stats.total, icon: '📦', color: 'from-blue-400 to-blue-600', delay: 0 },
				{ label: 'Pendentes', value: stats.pending, icon: '⏳', color: 'from-yellow-400 to-orange-500', delay: 50 },
				{ label: 'Em Processamento', value: stats.processing, icon: '🔄', color: 'from-orange-400 to-red-500', delay: 100 },
				{ label: 'Concluídas', value: stats.completed, icon: '✅', color: 'from-green-400 to-emerald-600', delay: 150 },
				{ label: 'Valor Total', value: formatPrice(stats.totalValue), icon: '💰', color: 'from-purple-400 to-pink-600', delay: 200 }
			] as stat, i}
				<div
					in:fly={{ y: 20, duration: 500, delay: stat.delay, easing: quintOut }}
					class="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-100"
				>
					<div class="flex items-center justify-between">
						<div>
							<p class="text-gray-600 text-sm">{stat.label}</p>
							<p class="text-2xl font-bold mt-1 bg-gradient-to-r {stat.color} bg-clip-text text-transparent">
								{stat.value}
							</p>
						</div>
						<div class="text-3xl transform hover:scale-110 transition-transform duration-200">
							{stat.icon}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Tempo médio -->
		<div in:fade={{ duration: 500, delay: 250 }} class="mt-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-200">
			<div class="flex items-center gap-3">
				<span class="text-2xl">⏱️</span>
				<div>
					<p class="text-sm text-gray-600">Tempo médio de processamento</p>
					<p class="text-lg font-semibold text-cyan-700">{stats.avgProcessingTime} dias</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Filters and Search -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
			<div class="flex flex-col lg:flex-row gap-4">
				<!-- Search -->
				<div class="flex-1" in:fly={{ x: -20, duration: 500, easing: quintOut }}>
					<div class="relative">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Buscar por pedido, cliente ou produto..."
							class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
						>
						<svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-3" in:fly={{ x: 20, duration: 500, delay: 100, easing: quintOut }}>
					<button
						onclick={() => showFilters = !showFilters}
						class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
						</svg>
						Filtros
						{#if showFilters}
							<svg class="w-4 h-4 transform rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						{:else}
							<svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						{/if}
					</button>

					<div class="flex items-center border border-gray-300 rounded-lg">
						<button
							onclick={() => viewMode = 'list'}
							class="p-2 {viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
						<button
							onclick={() => viewMode = 'grid'}
							class="p-2 {viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
							</svg>
						</button>
					</div>

					{#if selectedReturns.size > 0}
						<div class="flex items-center gap-2" in:scale={{ duration: 200 }}>
							<span class="text-sm text-gray-600">{selectedReturns.size} selecionado(s)</span>
							<button
								onclick={() => handleBulkAction('approve')}
								class="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
							>
								Aprovar
							</button>
							<button
								onclick={() => handleBulkAction('reject')}
								class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
							>
								Rejeitar
							</button>
						</div>
					{/if}
				</div>
			</div>

			<!-- Expandable Filters -->
			{#if showFilters}
				<div in:slide={{ duration: 300, easing: quintOut }} class="mt-4 pt-4 border-t border-gray-200">
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
							<select
								bind:value={filters.status}
								class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							>
								<option value="all">Todos</option>
								<option value="pending">Pendente</option>
								<option value="approved">Aprovada</option>
								<option value="rejected">Rejeitada</option>
								<option value="processing">Processando</option>
								<option value="completed">Concluída</option>
								<option value="refunded">Reembolsada</option>
							</select>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
							<select
								bind:value={filters.type}
								class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							>
								<option value="all">Todos</option>
								<option value="exchange">Troca</option>
								<option value="refund">Reembolso</option>
								<option value="credit">Crédito</option>
							</select>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Período</label>
							<select
								bind:value={filters.dateRange}
								class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							>
								<option value="all">Todo período</option>
								<option value="today">Hoje</option>
								<option value="week">Última semana</option>
								<option value="month">Último mês</option>
								<option value="quarter">Último trimestre</option>
							</select>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
							<select
								bind:value={filters.reason}
								class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
							>
								<option value="all">Todos</option>
								<option value="defective">Defeito</option>
								<option value="wrong_product">Produto errado</option>
								<option value="damaged">Danificado</option>
								<option value="not_satisfied">Insatisfeito</option>
								<option value="changed_mind">Arrependimento</option>
								<option value="other">Outro</option>
							</select>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Returns List/Grid - Simplified version -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
		{#if viewMode === 'list'}
			<!-- List View -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th class="px-6 py-3 text-left">
									<input
										type="checkbox"
										checked={selectedReturns.size === filteredReturns.length && filteredReturns.length > 0}
										onchange={handleSelectAll}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									>
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Pedido
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Cliente
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Itens
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Tipo
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Valor
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Data
								</th>
								<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Ações
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each paginatedReturns as ret, i}
								<tr
									in:fly={{ x: -20, duration: 300, delay: i * 50 }}
									class="hover:bg-gray-50 transition-colors"
								>
									<td class="px-6 py-4">
										<input
											type="checkbox"
											checked={selectedReturns.has(ret.id)}
											onchange={() => handleSelect(ret.id)}
											class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
										>
									</td>
									<td class="px-6 py-4">
										<div class="text-sm font-medium text-gray-900">{ret.orderNumber}</div>
										<div class="text-xs text-gray-500">ID: {ret.orderId}</div>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center">
											{#if ret.customer.avatar}
												<img
													src={ret.customer.avatar}
													alt={ret.customer.name}
													class="w-8 h-8 rounded-full mr-3"
												>
											{:else}
												<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
													<span class="text-xs font-medium text-gray-600">
														{ret.customer.name.charAt(0)}
													</span>
												</div>
											{/if}
											<div>
												<div class="text-sm font-medium text-gray-900">{ret.customer.name}</div>
												<div class="text-xs text-gray-500">{ret.customer.email}</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center -space-x-2">
											{#each ret.items.slice(0, 3) as item}
												<img
													src={item.image}
													alt={item.name}
													class="w-8 h-8 rounded-full border-2 border-white"
												>
											{/each}
											{#if ret.items.length > 3}
												<div class="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
													<span class="text-xs font-medium text-gray-600">+{ret.items.length - 3}</span>
												</div>
											{/if}
										</div>
										<div class="text-xs text-gray-500 mt-1">{ret.items.length} item(ns)</div>
									</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
											{getTypeLabel(ret.type)}
										</span>
									</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(ret.status)}">
											{getStatusLabel(ret.status)}
										</span>
									</td>
									<td class="px-6 py-4 text-sm text-gray-900">
										{formatPrice(ret.totalAmount)}
									</td>
									<td class="px-6 py-4 text-sm text-gray-500">
										{formatDate(ret.createdAt)}
									</td>
									<td class="px-6 py-4 text-right">
										<button
											onclick={() => openDetailModal(ret)}
											class="text-cyan-600 hover:text-cyan-900 transition-colors"
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
											</svg>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<!-- Grid View -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each paginatedReturns as ret, i}
					<div
						in:scale={{ duration: 300, delay: i * 50, easing: backOut }}
						class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
					>
						<div class="p-4">
							<!-- Header -->
							<div class="flex items-start justify-between mb-3">
								<div>
									<div class="font-semibold text-gray-900">{ret.orderNumber}</div>
									<div class="text-sm text-gray-500">{formatDate(ret.createdAt)}</div>
								</div>
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(ret.status)}">
									{getStatusLabel(ret.status)}
								</span>
							</div>

							<!-- Customer -->
							<div class="flex items-center mb-3">
								{#if ret.customer.avatar}
									<img
										src={ret.customer.avatar}
										alt={ret.customer.name}
										class="w-10 h-10 rounded-full mr-3"
									>
								{:else}
									<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
										<span class="text-sm font-medium text-gray-600">
											{ret.customer.name.charAt(0)}
										</span>
									</div>
								{/if}
								<div>
									<div class="font-medium text-gray-900">{ret.customer.name}</div>
									<div class="text-sm text-gray-500">{ret.customer.email}</div>
								</div>
							</div>

							<!-- Items -->
							<div class="mb-3">
								<div class="text-sm font-medium text-gray-700 mb-2">Itens para devolução:</div>
								<div class="space-y-2">
									{#each ret.items.slice(0, 2) as item}
										<div class="flex items-center gap-2">
											<img
												src={item.image}
												alt={item.name}
												class="w-12 h-12 object-cover rounded"
											>
											<div class="flex-1 min-w-0">
												<div class="text-sm text-gray-900 truncate">{item.name}</div>
												<div class="text-xs text-gray-500">{item.reason}</div>
											</div>
											<div class="text-sm font-medium text-gray-900">
												{formatPrice(item.price)}
											</div>
										</div>
									{/each}
									{#if ret.items.length > 2}
										<div class="text-xs text-gray-500 text-center">
											+{ret.items.length - 2} mais item(ns)
										</div>
									{/if}
								</div>
							</div>

							<!-- Info -->
							<div class="flex items-center justify-between pt-3 border-t border-gray-100">
								<div class="flex items-center gap-4 text-sm">
									<span class="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
										{getTypeLabel(ret.type)}
									</span>
									<span class="text-gray-500">{getReasonLabel(ret.reason)}</span>
								</div>
								<div class="text-lg font-semibold text-gray-900">
									{formatPrice(ret.totalAmount)}
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
								<input
									type="checkbox"
									checked={selectedReturns.has(ret.id)}
									onchange={() => handleSelect(ret.id)}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								>
								<button
									onclick={() => openDetailModal(ret)}
									class="px-3 py-1 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
								>
									Ver detalhes
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="mt-6 flex items-center justify-center gap-2">
				<button
					onclick={() => currentPage = Math.max(1, currentPage - 1)}
					disabled={currentPage === 1}
					class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				
				{#each Array(totalPages) as _, page}
					{#if page === 0 || page === totalPages - 1 || (page >= currentPage - 2 && page <= currentPage + 2)}
						<button
							onclick={() => currentPage = page + 1}
							class="px-3 py-1 rounded-lg {currentPage === page + 1 ? 'bg-cyan-500 text-white' : 'border border-gray-300 hover:bg-gray-50'} transition-colors"
						>
							{page + 1}
						</button>
					{:else if page === currentPage - 3 || page === currentPage + 3}
						<span class="px-2 text-gray-400">...</span>
					{/if}
				{/each}
				
				<button
					onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
					disabled={currentPage === totalPages}
					class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Detail Modal -->
{#if showDetailModal && selectedReturn}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		in:fade={{ duration: 200 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) showDetailModal = false;
		}}
	>
		<div
			class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
			in:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Detalhes da Devolução</h2>
						<p class="text-cyan-100 mt-1">Pedido {selectedReturn.orderNumber}</p>
					</div>
					<button
						onclick={() => showDetailModal = false}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Modal Content -->
			<div class="overflow-y-auto max-h-[calc(90vh-200px)]">
				<div class="p-6 space-y-6">
					<!-- Status and Type -->
					<div class="flex items-center gap-4">
						<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getStatusColor(selectedReturn.status)}">
							{getStatusLabel(selectedReturn.status)}
						</span>
						<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
							{getTypeLabel(selectedReturn.type)}
						</span>
						<span class="text-sm text-gray-500">
							Motivo: {getReasonLabel(selectedReturn.reason)}
						</span>
					</div>

					<!-- Customer Info -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="font-semibold text-gray-900 mb-3">Informações do Cliente</h3>
						<div class="flex items-center gap-4">
							{#if selectedReturn.customer.avatar}
								<img
									src={selectedReturn.customer.avatar}
									alt={selectedReturn.customer.name}
									class="w-16 h-16 rounded-full"
								>
							{:else}
								<div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
									<span class="text-xl font-medium text-gray-600">
										{selectedReturn.customer.name.charAt(0)}
									</span>
								</div>
							{/if}
							<div>
								<div class="font-medium text-gray-900">{selectedReturn.customer.name}</div>
								<div class="text-sm text-gray-500">{selectedReturn.customer.email}</div>
							</div>
						</div>
					</div>

					<!-- Items -->
					<div>
						<h3 class="font-semibold text-gray-900 mb-3">Itens para Devolução</h3>
						<div class="space-y-3">
							{#each selectedReturn.items as item}
								<div class="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
									<img
										src={item.image}
										alt={item.name}
										class="w-16 h-16 object-cover rounded"
									>
									<div class="flex-1">
										<div class="font-medium text-gray-900">{item.name}</div>
										<div class="text-sm text-gray-500">Quantidade: {item.quantity}</div>
										<div class="text-sm text-gray-500">Motivo: {item.reason}</div>
									</div>
									<div class="text-lg font-semibold text-gray-900">
										{formatPrice(item.price * item.quantity)}
									</div>
								</div>
							{/each}
						</div>
						<div class="mt-3 pt-3 border-t border-gray-200 text-right">
							<span class="text-lg font-semibold text-gray-900">
								Total: {formatPrice(selectedReturn.totalAmount)}
							</span>
						</div>
					</div>

					<!-- Description -->
					{#if selectedReturn.description}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">Descrição</h3>
							<p class="text-gray-600">{selectedReturn.description}</p>
						</div>
					{/if}

					<!-- Images -->
					{#if selectedReturn.images && selectedReturn.images.length > 0}
						<div>
							<h3 class="font-semibold text-gray-900 mb-2">Imagens Anexadas</h3>
							<div class="grid grid-cols-3 gap-2">
								{#each selectedReturn.images as image}
									<img
										src={image}
										alt="Imagem da devolução"
										class="w-full h-32 object-cover rounded-lg"
									>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Tracking -->
					{#if selectedReturn.tracking}
						<div class="bg-blue-50 rounded-lg p-4">
							<h3 class="font-semibold text-blue-900 mb-2">Informações de Rastreamento</h3>
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-sm text-blue-700">Transportadora:</span>
									<span class="font-medium text-blue-900">{selectedReturn.tracking.carrier}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-blue-700">Código:</span>
									<span class="font-medium text-blue-900">{selectedReturn.tracking.code}</span>
								</div>
								{#if selectedReturn.tracking.url}
									<a
										href={selectedReturn.tracking.url}
										target="_blank"
										class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
									>
										Rastrear envio
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</a>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Refund Info -->
					{#if selectedReturn.refund}
						<div class="bg-green-50 rounded-lg p-4">
							<h3 class="font-semibold text-green-900 mb-2">Informações do Reembolso</h3>
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-sm text-green-700">Valor:</span>
									<span class="font-medium text-green-900">{formatPrice(selectedReturn.refund.amount)}</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-green-700">Método:</span>
									<span class="font-medium text-green-900">{selectedReturn.refund.method}</span>
								</div>
								{#if selectedReturn.refund.date}
									<div class="flex items-center justify-between">
										<span class="text-sm text-green-700">Data:</span>
										<span class="font-medium text-green-900">{formatDate(selectedReturn.refund.date)}</span>
									</div>
								{/if}
								{#if selectedReturn.refund.transactionId}
									<div class="flex items-center justify-between">
										<span class="text-sm text-green-700">ID da Transação:</span>
										<span class="font-medium text-green-900">{selectedReturn.refund.transactionId}</span>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Timeline -->
					<div>
						<h3 class="font-semibold text-gray-900 mb-3">Histórico</h3>
						<div class="relative">
							<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
							<div class="space-y-4">
								{#each selectedReturn.timeline as event, i}
									<div class="relative flex items-start">
										<div class="absolute left-4 w-2 h-2 bg-cyan-500 rounded-full -translate-x-1/2 {i === 0 ? 'ring-4 ring-cyan-100' : ''}"></div>
										<div class="ml-10">
											<div class="font-medium text-gray-900">{event.status}</div>
											<div class="text-sm text-gray-500">{event.description}</div>
											<div class="text-xs text-gray-400 mt-1">
												{formatDateTime(event.date)}
												{#if event.user}
													por {event.user}
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Notes -->
					{#if selectedReturn.notes}
						<div class="bg-yellow-50 rounded-lg p-4">
							<h3 class="font-semibold text-yellow-900 mb-2">Notas Internas</h3>
							<p class="text-yellow-700">{selectedReturn.notes}</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
				<div class="flex items-center gap-2">
					{#if selectedReturn.status === 'pending'}
						<button
							class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
						>
							Aprovar
						</button>
						<button
							class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
						>
							Rejeitar
						</button>
					{:else if selectedReturn.status === 'approved'}
						<button
							class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
						>
							Gerar Etiqueta
						</button>
					{:else if selectedReturn.status === 'processing'}
						<button
							class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
						>
							Processar Reembolso
						</button>
					{/if}
				</div>
				<button
					onclick={() => showDetailModal = false}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Fechar
				</button>
			</div>
		</div>
	</div>
{/if} 