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
	interface Coupon {
		id: string;
		code: string;
		description: string;
		type: 'percentage' | 'fixed' | 'free_shipping';
		value: number;
		min_purchase?: number;
		max_discount?: number;
		usage_limit?: number;
		usage_count: number;
		user_limit?: number;
		start_date: string;
		end_date: string;
		is_active: boolean;
		categories?: string[];
		products?: string[];
		created_at: string;
		created_by?: string;
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
		type: string;
		status: string;
		dateRange: string;
	}
	
	// Estado
	let coupons = $state<Coupon[]>([]);
	let filteredCoupons = $state<Coupon[]>([]);
	let loading = $state(true);
	let selectedCoupons = $state<Set<string>>(new Set());
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(true);
	let showCreateModal = $state(false);
	let editingCoupon = $state<Coupon | null>(null);
	let userRole = $state<'admin' | 'vendor'>('admin');
	let formData = $state({
		code: '',
		description: '',
		type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
		value: 0,
		minPurchase: 0,
		maxDiscount: 0,
		usageLimit: 0,
		usagePerCustomer: 1,
		validFrom: new Date().toISOString().split('T')[0],
		validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		isActive: true,
		categories: [] as string[],
		products: [] as string[],
		excludeProducts: [] as string[],
		customerGroups: [] as string[]
	});
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		type: 'all',
		status: 'all',
		dateRange: 'month'
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
		loadCoupons();
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...coupons];
		
		// Busca
		if (filters.search) {
			result = result.filter(coupon => 
				coupon.code.toLowerCase().includes(filters.search.toLowerCase()) || 
				coupon.description.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Tipo
		if (filters.type !== 'all') {
			result = result.filter(coupon => coupon.type === filters.type);
		}
		
		// Status
		if (filters.status === 'active') {
			result = result.filter(coupon => 
				coupon.is_active && new Date(coupon.end_date) > new Date()
			);
		} else if (filters.status === 'expired') {
			result = result.filter(coupon => 
				new Date(coupon.end_date) <= new Date()
			);
		} else if (filters.status === 'inactive') {
			result = result.filter(coupon => !coupon.is_active);
		}
		
		filteredCoupons = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		// Atualizar estatísticas
		updateStats(result);
	});
	
	onMount(() => {
		loadCoupons();
	});
	
	async function loadCoupons() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock
			coupons = Array.from({ length: 25 }, (_, i) => ({
				id: `coupon-${i + 1}`,
				code: ['DESCONTO10', 'FRETEGRATIS', 'BLACKFRIDAY', 'NATAL2024', 'PRIMEIRACOMPRA'][i % 5] + (i > 4 ? i : ''),
				description: ['10% de desconto', 'Frete grátis', 'Black Friday 50% OFF', 'Promoção de Natal', 'Desconto primeira compra'][i % 5],
				type: ['percentage', 'fixed', 'free_shipping'][i % 3] as any,
				value: i % 3 === 0 ? 10 : i % 3 === 1 ? 50 : 0,
				min_purchase: i % 3 === 2 ? 100 : i % 3 === 1 ? 200 : 0,
				max_discount: i % 3 === 0 ? 100 : undefined,
				usage_limit: Math.floor(Math.random() * 1000) + 100,
				usage_count: Math.floor(Math.random() * 500),
				user_limit: i % 3 === 0 ? 1 : undefined,
				start_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				end_date: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
				is_active: Math.random() > 0.2,
				created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
				created_by: userRole === 'vendor' ? 'Minha Loja' : undefined
			}));
			
			if (userRole === 'vendor') {
				coupons = coupons.filter(c => c.created_by === 'Minha Loja');
			}
			
			loading = false;
		}, 1000);
	}
	
	function updateStats(cpns: Coupon[]) {
		const totalCoupons = cpns.length;
		const activeCoupons = cpns.filter(c => 
			c.is_active && new Date(c.end_date) > new Date()
		).length;
		const totalUsage = cpns.reduce((sum, c) => sum + c.usage_count, 0);
		const totalSavings = cpns.reduce((sum, c) => {
			if (c.type === 'percentage') {
				return sum + (c.usage_count * 100 * c.value / 100); // Estimativa
			} else if (c.type === 'fixed') {
				return sum + (c.usage_count * c.value);
			}
			return sum;
		}, 0);
		
		stats = [
			{
				title: 'Total de Cupons',
				value: totalCoupons,
				change: 12,
				icon: '🎟️',
				color: 'primary'
			},
			{
				title: 'Cupons Ativos',
				value: activeCoupons,
				change: 5,
				icon: '✅',
				color: 'success'
			},
			{
				title: 'Total de Usos',
				value: totalUsage.toLocaleString('pt-BR'),
				change: 28,
				icon: '📊',
				color: 'info'
			},
			{
				title: 'Economia Gerada',
				value: formatPrice(totalSavings),
				change: 15,
				icon: '💰',
				color: 'warning'
			}
		];
	}
	
	function toggleCouponSelection(id: string) {
		const newSet = new Set(selectedCoupons);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedCoupons = newSet;
	}
	
	function toggleAllCoupons() {
		if (selectedCoupons.size === paginatedCoupons.length) {
			selectedCoupons = new Set();
		} else {
			selectedCoupons = new Set(paginatedCoupons.map(c => c.id));
		}
	}
	
	function getTypeLabel(type: string) {
		const labels = {
			percentage: 'Percentual',
			fixed: 'Valor Fixo',
			free_shipping: 'Frete Grátis'
		};
		return labels[type as keyof typeof labels] || type;
	}
	
	function getTypeIcon(type: string) {
		const icons = {
			percentage: '%',
			fixed: 'R$',
			free_shipping: '🚚'
		};
		return icons[type as keyof typeof icons] || '🎟️';
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
	
	function getCouponStatus(coupon: Coupon) {
		if (!coupon.is_active) return 'inactive';
		const now = new Date();
		const start = new Date(coupon.start_date);
		const end = new Date(coupon.end_date);
		
		if (now < start) return 'scheduled';
		if (now > end) return 'expired';
		if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) return 'exhausted';
		return 'active';
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			active: 'badge-success',
			scheduled: 'badge-info',
			expired: 'badge-warning',
			exhausted: 'badge-danger',
			inactive: 'badge-secondary'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			active: 'Ativo',
			scheduled: 'Agendado',
			expired: 'Expirado',
			exhausted: 'Esgotado',
			inactive: 'Inativo'
		};
		return labels[status as keyof typeof labels] || status;
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
	
	function generateCode() {
		const prefixes = ['DESC', 'PROMO', 'OFF', 'SAVE'];
		const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
		const number = Math.floor(Math.random() * 9999) + 1000;
		formData.code = `${prefix}${number}`;
	}
	
	// Cupons paginados
	const paginatedCoupons = $derived(
		filteredCoupons.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Modal functions
	function openCreateModal() {
		formData = {
			code: '',
			description: '',
			type: 'percentage',
			value: 0,
			minPurchase: 0,
			maxDiscount: 0,
			usageLimit: 0,
			usagePerCustomer: 1,
			validFrom: new Date().toISOString().split('T')[0],
			validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
			isActive: true,
			categories: [],
			products: [],
			excludeProducts: [],
			customerGroups: []
		};
		editingCoupon = null;
		showCreateModal = true;
	}
	
	function openEditModal(coupon: Coupon) {
		formData = {
			code: coupon.code,
			description: coupon.description,
			type: coupon.type,
			value: coupon.value,
			minPurchase: coupon.min_purchase || 0,
			maxDiscount: coupon.max_discount || 0,
			usageLimit: coupon.usage_limit || 0,
			usagePerCustomer: coupon.user_limit || 1,
			validFrom: new Date(coupon.start_date).toISOString().split('T')[0],
			validUntil: new Date(coupon.end_date).toISOString().split('T')[0],
			isActive: coupon.is_active,
			categories: coupon.categories || [],
			products: coupon.products || [],
			excludeProducts: [],
			customerGroups: []
		};
		editingCoupon = coupon;
		showCreateModal = true;
	}
	
	function closeModal() {
		showCreateModal = false;
		editingCoupon = null;
	}
	
	async function saveCoupon() {
		console.log('Salvando cupom:', formData);
		loadCoupons();
		closeModal();
	}
	
	async function deleteCoupon(coupon: Coupon) {
		if (confirm(`Tem certeza que deseja excluir o cupom "${coupon.code}"?`)) {
			console.log('Excluindo cupom:', coupon);
			loadCoupons();
		}
	}
	
	async function toggleCouponStatus(coupon: Coupon) {
		coupon.is_active = !coupon.is_active;
		console.log('Alterando status do cupom:', coupon);
		coupons = [...coupons];
	}
	
	async function duplicateCoupon(coupon: Coupon) {
		formData = {
			code: coupon.code + '_COPY',
			description: coupon.description + ' (Cópia)',
			type: coupon.type,
			value: coupon.value,
			minPurchase: coupon.min_purchase || 0,
			maxDiscount: coupon.max_discount || 0,
			usageLimit: coupon.usage_limit || 0,
			usagePerCustomer: coupon.user_limit || 1,
			validFrom: new Date().toISOString().split('T')[0],
			validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
			isActive: false,
			categories: coupon.categories || [],
			products: coupon.products || [],
			excludeProducts: [],
			customerGroups: []
		};
		editingCoupon = null;
		showCreateModal = true;
	}
	
	// Ações em lote
	async function bulkActivate() {
		console.log('Ativando', selectedCoupons.size, 'cupons');
		selectedCoupons = new Set();
	}
	
	async function bulkDeactivate() {
		console.log('Desativando', selectedCoupons.size, 'cupons');
		selectedCoupons = new Set();
	}
	
	async function bulkDelete() {
		if (confirm(`Tem certeza que deseja excluir ${selectedCoupons.size} cupons?`)) {
			console.log('Excluindo', selectedCoupons.size, 'cupons');
			selectedCoupons = new Set();
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão de Cupons' : 'Meus Cupons'}
			</h1>
			<p class="text-gray-600 mt-1">Crie e gerencie cupons de desconto e promoções</p>
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
			
			<!-- Create Coupon -->
			<button 
				onclick={openCreateModal}
				class="btn btn-primary"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Novo Cupom
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
					<div>
						<label class="label">Buscar</label>
						<input
							type="text"
							bind:value={filters.search}
							placeholder="Código ou descrição..."
							class="input"
						/>
					</div>
					
					<!-- Type -->
					<div>
						<label class="label">Tipo</label>
						<select bind:value={filters.type} class="input">
							<option value="all">Todos</option>
							<option value="percentage">Percentual</option>
							<option value="fixed">Valor Fixo</option>
							<option value="free_shipping">Frete Grátis</option>
						</select>
					</div>
					
					<!-- Status -->
					<div>
						<label class="label">Status</label>
						<select bind:value={filters.status} class="input">
							<option value="all">Todos</option>
							<option value="active">Ativo</option>
							<option value="expired">Expirado</option>
							<option value="inactive">Inativo</option>
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
	{#if selectedCoupons.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedCoupons.size} {selectedCoupons.size === 1 ? 'cupom selecionado' : 'cupons selecionados'}
					</p>
					<div class="flex items-center gap-2">
						<button 
							onclick={bulkActivate}
							class="btn btn-sm btn-ghost text-green-600"
						>
							Ativar
						</button>
						<button 
							onclick={bulkDeactivate}
							class="btn btn-sm btn-ghost text-yellow-600"
						>
							Desativar
						</button>
						<button 
							onclick={bulkDelete}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Excluir
						</button>
						<button 
							onclick={() => selectedCoupons = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Coupons Table/Grid -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando cupons...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if filteredCoupons.length === 0}
		<div class="card">
			<div class="card-body text-center py-12">
				<div class="text-4xl mb-4">🎟️</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum cupom encontrado</h3>
				<p class="text-gray-600 mb-4">Crie seu primeiro cupom de desconto para atrair mais clientes.</p>
				<button onclick={openCreateModal} class="btn btn-primary">
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Criar Primeiro Cupom
				</button>
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
									checked={selectedCoupons.size === paginatedCoupons.length && paginatedCoupons.length > 0}
									onchange={toggleAllCoupons}
									class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
								/>
							</th>
							<th>Código</th>
							<th>Tipo/Valor</th>
							<th>Status</th>
							<th>Uso</th>
							<th>Validade</th>
							<th>Economia</th>
							<th class="text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedCoupons as coupon, i}
							{@const status = getCouponStatus(coupon)}
							<tr 
								class="hover:bg-gray-50 transition-colors"
								in:fly={{ x: -20, duration: 400, delay: i * 50 }}
							>
								<td>
									<input
										type="checkbox"
										checked={selectedCoupons.has(coupon.id)}
										onchange={() => toggleCouponSelection(coupon.id)}
										class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
									/>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
											{getTypeIcon(coupon.type)}
										</div>
										<div>
											<p class="font-medium text-gray-900 font-mono">{coupon.code}</p>
											<p class="text-sm text-gray-500">{coupon.description}</p>
										</div>
									</div>
								</td>
								<td>
									<div>
										<p class="font-medium text-gray-900">
											{coupon.type === 'percentage' ? `${coupon.value}%` : 
											 coupon.type === 'fixed' ? formatPrice(coupon.value) : 
											 'Frete Grátis'}
										</p>
										<p class="text-xs text-gray-500">{getTypeLabel(coupon.type)}</p>
									</div>
								</td>
								<td>
									<span class="badge {getStatusBadge(status)}">
										{getStatusLabel(status)}
									</span>
								</td>
								<td>
									<div class="flex items-center gap-2">
										<div class="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
											<div 
												class="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
												style="width: {coupon.usage_limit ? (coupon.usage_count / coupon.usage_limit * 100) : 0}%"
											></div>
										</div>
										<span class="text-sm text-gray-700">
											{coupon.usage_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
										</span>
									</div>
								</td>
								<td class="text-sm">
									<div>
										<p class="text-gray-900">{formatDate(coupon.start_date)}</p>
										<p class="text-gray-500">até {formatDate(coupon.end_date)}</p>
									</div>
								</td>
								<td class="font-medium text-green-600">
									{coupon.type === 'percentage' ? 
										formatPrice(coupon.usage_count * 100 * coupon.value / 100) : 
									 coupon.type === 'fixed' ? 
										formatPrice(coupon.usage_count * coupon.value) : 
									 '-'}
								</td>
								<td>
									<div class="flex items-center justify-end gap-1">
										<button
											onclick={() => duplicateCoupon(coupon)}
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Duplicar"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
											</svg>
										</button>
										<button
											onclick={() => openEditModal(coupon)}
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title="Editar"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											onclick={() => toggleCouponStatus(coupon)}
											class="p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-105"
											title={coupon.is_active ? 'Desativar' : 'Ativar'}
										>
											<svg class="w-4 h-4 {coupon.is_active ? 'text-green-600' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</button>
										<button
											onclick={() => deleteCoupon(coupon)}
											class="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-105 text-red-600"
											title="Excluir"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
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
							<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredCoupons.length)}</span> de 
							<span class="font-medium">{filteredCoupons.length}</span> resultados
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
			{#each paginatedCoupons as coupon, i}
				{@const status = getCouponStatus(coupon)}
				<div 
					class="card hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
					in:scale={{ duration: 400, delay: i * 50, easing: backOut }}
				>
					<div class="card-body">
						<div class="flex items-start justify-between mb-4">
							<div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
								{getTypeIcon(coupon.type)}
							</div>
							<span class="badge {getStatusBadge(status)}">
								{getStatusLabel(status)}
							</span>
						</div>
						
						<h3 class="font-mono font-bold text-gray-900 text-lg mb-1">{coupon.code}</h3>
						<p class="text-sm text-gray-600 mb-4">{coupon.description}</p>
						
						<div class="space-y-3">
							<!-- Valor -->
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-600">Desconto:</span>
								<span class="font-semibold text-gray-900">
									{coupon.type === 'percentage' ? `${coupon.value}%` : 
									 coupon.type === 'fixed' ? formatPrice(coupon.value) : 
									 'Frete Grátis'}
								</span>
							</div>
							
							<!-- Uso -->
							<div>
								<div class="flex justify-between text-sm mb-1">
									<span class="text-gray-600">Uso:</span>
									<span class="font-medium">
										{coupon.usage_count}{coupon.usage_limit ? `/${coupon.usage_limit}` : ''}
									</span>
								</div>
								<div class="bg-gray-200 rounded-full h-2">
									<div 
										class="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
										style="width: {coupon.usage_limit ? (coupon.usage_count / coupon.usage_limit * 100) : 0}%"
									></div>
								</div>
							</div>
							
							<!-- Validade -->
							<div class="flex items-center justify-between text-sm">
								<span class="text-gray-600">Válido até:</span>
								<span class="font-medium {new Date(coupon.end_date) < new Date() ? 'text-red-600' : 'text-gray-900'}">
									{formatDate(coupon.end_date)}
								</span>
							</div>
							
							<!-- Economia -->
							{#if coupon.type !== 'free_shipping'}
								<div class="flex items-center justify-between text-sm">
									<span class="text-gray-600">Economia gerada:</span>
									<span class="font-medium text-green-600">
										{coupon.type === 'percentage' ? 
											formatPrice(coupon.usage_count * 100 * coupon.value / 100) : 
											formatPrice(coupon.usage_count * coupon.value)}
									</span>
								</div>
							{/if}
						</div>
						
						<div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
							<button onclick={() => openEditModal(coupon)} class="btn btn-sm btn-ghost flex-1">
								Editar
							</button>
							<button onclick={() => duplicateCoupon(coupon)} class="btn btn-sm btn-primary flex-1">
								Duplicar
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal de criar/editar -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 200 }}>
		<div 
			class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
			in:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900">
						{editingCoupon ? 'Editar' : 'Novo'} Cupom
					</h2>
					<button 
						onclick={closeModal}
						class="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<form onsubmit={(e) => { e.preventDefault(); saveCoupon(); }} class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Código -->
						<div>
							<label class="label">Código do Cupom *</label>
							<div class="flex gap-2">
								<input 
									type="text" 
									bind:value={formData.code}
									class="input flex-1 font-mono uppercase"
									placeholder="DESCONTO10"
									required
								/>
								<button 
									type="button"
									onclick={generateCode}
									class="btn btn-ghost"
									title="Gerar código"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
								</button>
							</div>
						</div>
						
						<!-- Tipo -->
						<div>
							<label class="label">Tipo de Desconto *</label>
							<select bind:value={formData.type} class="input" required>
								<option value="percentage">Porcentagem (%)</option>
								<option value="fixed">Valor Fixo (R$)</option>
								<option value="free_shipping">Frete Grátis</option>
							</select>
						</div>
					</div>
					
					<!-- Descrição -->
					<div>
						<label class="label">Descrição *</label>
						<input 
							type="text" 
							bind:value={formData.description}
							class="input"
							placeholder="Ex: Desconto de 10% em toda a loja"
							required
						/>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Valor -->
						{#if formData.type !== 'free_shipping'}
							<div>
								<label class="label">
									Valor do Desconto *
									{formData.type === 'percentage' ? '(%)' : '(R$)'}
								</label>
								<input 
									type="number" 
									bind:value={formData.value}
									step={formData.type === 'percentage' ? '1' : '0.01'}
									min="0"
									max={formData.type === 'percentage' ? '100' : undefined}
									class="input"
									required
								/>
							</div>
						{/if}
						
						<!-- Compra Mínima -->
						<div>
							<label class="label">Compra Mínima (R$)</label>
							<input 
								type="number" 
								bind:value={formData.minPurchase}
								step="0.01"
								min="0"
								class="input"
								placeholder="0.00"
							/>
						</div>
						
						<!-- Desconto Máximo -->
						{#if formData.type === 'percentage'}
							<div>
								<label class="label">Desconto Máximo (R$)</label>
								<input 
									type="number" 
									bind:value={formData.maxDiscount}
									step="0.01"
									min="0"
									class="input"
									placeholder="Sem limite"
								/>
							</div>
						{/if}
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Data Início -->
						<div>
							<label class="label">Data de Início *</label>
							<input 
								type="date" 
								bind:value={formData.validFrom}
								class="input"
								required
							/>
						</div>
						
						<!-- Data Fim -->
						<div>
							<label class="label">Data de Término *</label>
							<input 
								type="date" 
								bind:value={formData.validUntil}
								min={formData.validFrom}
								class="input"
								required
							/>
						</div>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Limite de Uso Total -->
						<div>
							<label class="label">Limite de Uso Total</label>
							<input 
								type="number" 
								bind:value={formData.usageLimit}
								min="0"
								class="input"
								placeholder="Ilimitado"
							/>
						</div>
						
						<!-- Limite por Cliente -->
						<div>
							<label class="label">Limite por Cliente</label>
							<input 
								type="number" 
								bind:value={formData.usagePerCustomer}
								min="0"
								class="input"
								placeholder="1"
							/>
						</div>
					</div>
					
					<!-- Ativo -->
					<div class="flex items-center">
						<input 
							type="checkbox" 
							bind:checked={formData.isActive}
							id="is_active"
							class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
						/>
						<label for="is_active" class="ml-2 text-sm font-medium text-gray-700">
							Cupom ativo (disponível para uso)
						</label>
					</div>
					
					<!-- Restrições -->
					<div class="border-t pt-6">
						<h3 class="font-medium text-gray-900 mb-4">Restrições (Opcional)</h3>
						<p class="text-sm text-gray-600 mb-4">
							Deixe em branco para aplicar o cupom em toda a loja
						</p>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<!-- Categorias -->
							<div>
								<label class="label">Categorias Específicas</label>
								<select multiple class="input min-h-[100px]">
									<option>Eletrônicos</option>
									<option>Moda</option>
									<option>Casa e Decoração</option>
									<option>Esportes</option>
								</select>
								<p class="text-xs text-gray-500 mt-1">Segure Ctrl/Cmd para selecionar múltiplas</p>
							</div>
							
							<!-- Produtos -->
							<div>
								<label class="label">Produtos Específicos</label>
								<textarea 
									rows="4"
									class="input"
									placeholder="IDs dos produtos separados por vírgula"
								></textarea>
							</div>
						</div>
					</div>
					
					<!-- Botões -->
					<div class="flex justify-end gap-3 pt-6 border-t">
						<button 
							type="button"
							onclick={closeModal}
							class="btn btn-ghost"
						>
							Cancelar
						</button>
						<button 
							type="submit"
							class="btn btn-primary"
						>
							{editingCoupon ? 'Atualizar' : 'Criar'} Cupom
						</button>
					</div>
				</form>
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