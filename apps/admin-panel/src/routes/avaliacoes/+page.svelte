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
	interface Review {
		id: string;
		product_id: string;
		product_name: string;
		product_image?: string;
		customer_id: string;
		customer_name: string;
		customer_avatar?: string;
		rating: number;
		title?: string;
		comment: string;
		pros?: string[];
		cons?: string[];
		images?: string[];
		verified_purchase: boolean;
		helpful_count: number;
		not_helpful_count: number;
		status: 'pending' | 'approved' | 'rejected' | 'flagged';
		response?: {
			text: string;
			created_at: string;
			author: string;
		};
		created_at: string;
		vendor_id?: string;
		vendor_name?: string;
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
		rating: string;
		status: string;
		verified: string;
		dateRange: string;
		sort: string;
	}
	
	// Estado
	let reviews = $state<Review[]>([]);
	let filteredReviews = $state<Review[]>([]);
	let loading = $state(true);
	let selectedReviews = $state<Set<string>>(new Set());
	let showResponseModal = $state(false);
	let respondingReview = $state<Review | null>(null);
	let responseText = $state('');
	let showFilters = $state(false);
	let userRole = $state<'admin' | 'vendor'>('admin');
	let activeTab = $state<'all' | 'pending' | 'flagged'>('all');
	
	// Filtros
	let filters = $state<Filter>({
		search: '',
		rating: 'all',
		status: 'all',
		verified: 'all',
		dateRange: 'month',
		sort: 'recent'
	});
	
	// Paginação
	let currentPage = $state(1);
	let itemsPerPage = $state(10);
	let totalPages = $state(1);
	
	// Stats
	let stats = $state<StatCard[]>([]);
	let ratingDistribution = $state<{ rating: number; count: number; percentage: number }[]>([]);
	
	// Modal states
	let showReviewModal = $state(false);
	let selectedReview = $state<Review | null>(null);
	let replyText = $state('');
	let moderationAction = $state<'approve' | 'reject' | 'flag'>('approve');
	let moderationReason = $state('');
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadReviews();
	});
	
	// Aplicar filtros
	$effect(() => {
		let result = [...reviews];
		
		// Tab filter
		if (activeTab === 'pending') {
			result = result.filter(r => r.status === 'pending');
		} else if (activeTab === 'flagged') {
			result = result.filter(r => r.status === 'flagged');
		}
		
		// Search
		if (filters.search) {
			result = result.filter(review => 
				review.comment.toLowerCase().includes(filters.search.toLowerCase()) ||
				review.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
				review.customer_name.toLowerCase().includes(filters.search.toLowerCase()) ||
				review.product_name.toLowerCase().includes(filters.search.toLowerCase())
			);
		}
		
		// Rating
		if (filters.rating !== 'all') {
			const rating = parseInt(filters.rating);
			result = result.filter(review => review.rating === rating);
		}
		
		// Status
		if (filters.status !== 'all') {
			result = result.filter(review => review.status === filters.status);
		}
		
		// Verified
		if (filters.verified !== 'all') {
			result = result.filter(review => 
				filters.verified === 'yes' ? review.verified_purchase : !review.verified_purchase
			);
		}
		
		// Sort
		if (filters.sort === 'recent') {
			result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
		} else if (filters.sort === 'helpful') {
			result.sort((a, b) => b.helpful_count - a.helpful_count);
		} else if (filters.sort === 'rating_high') {
			result.sort((a, b) => b.rating - a.rating);
		} else if (filters.sort === 'rating_low') {
			result.sort((a, b) => a.rating - b.rating);
		}
		
		filteredReviews = result;
		totalPages = Math.ceil(result.length / itemsPerPage);
		currentPage = 1;
		
		updateStats(result);
		updateRatingDistribution(result);
	});
	
	onMount(() => {
		loadReviews();
	});
	
	async function loadReviews() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			// Dados mock
			reviews = Array.from({ length: 50 }, (_, i) => ({
				id: `review-${i + 1}`,
				product_id: `prod-${(i % 10) + 1}`,
				product_name: ['Smartphone X1', 'Notebook Pro', 'Fone Bluetooth', 'Smart TV 4K', 'Câmera Digital'][i % 5],
				product_image: '/placeholder.jpg',
				customer_id: `cust-${i + 1}`,
				customer_name: ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Lima'][i % 5],
				customer_avatar: `/avatar-${(i % 5) + 1}.jpg`,
				rating: Math.ceil(Math.random() * 5),
				title: ['Excelente produto!', 'Muito bom', 'Decepcionante', 'Superou expectativas', 'Razoável'][i % 5],
				comment: [
					'Produto de excelente qualidade, chegou rápido e bem embalado. Recomendo!',
					'Atendeu minhas expectativas, mas o preço poderia ser melhor.',
					'Não gostei, veio com defeito e o suporte não resolveu.',
					'Melhor compra que fiz! Qualidade superior e entrega rápida.',
					'Produto ok, nada de excepcional mas funciona bem.'
				][i % 5],
				pros: i % 3 === 0 ? ['Qualidade', 'Preço justo', 'Entrega rápida'] : undefined,
				cons: i % 4 === 0 ? ['Embalagem frágil', 'Manual confuso'] : undefined,
				images: i % 5 === 0 ? ['/review-1.jpg', '/review-2.jpg'] : undefined,
				verified_purchase: Math.random() > 0.3,
				helpful_count: Math.floor(Math.random() * 100),
				not_helpful_count: Math.floor(Math.random() * 20),
				status: ['pending', 'approved', 'rejected', 'flagged'][Math.floor(Math.random() * 4)] as any,
				response: i % 3 === 0 ? {
					text: 'Agradecemos seu feedback! Estamos sempre buscando melhorar.',
					created_at: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
					author: 'Equipe de Suporte'
				} : undefined,
				created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
				vendor_id: userRole === 'vendor' ? 'vendor-1' : `vendor-${(i % 3) + 1}`,
				vendor_name: userRole === 'vendor' ? 'Minha Loja' : ['Loja A', 'Loja B', 'Loja C'][i % 3]
			}));
			
			if (userRole === 'vendor') {
				reviews = reviews.filter(r => r.vendor_id === 'vendor-1');
			}
			
			loading = false;
		}, 1000);
	}
	
	function updateStats(revs: Review[]) {
		const totalReviews = revs.length;
		const avgRating = revs.reduce((sum, r) => sum + r.rating, 0) / totalReviews || 0;
		const pendingCount = revs.filter(r => r.status === 'pending').length;
		const flaggedCount = revs.filter(r => r.status === 'flagged').length;
		const responseRate = (revs.filter(r => r.response).length / totalReviews * 100) || 0;
		
		stats = [
			{
				title: 'Total de Avaliações',
				value: totalReviews,
				change: 15,
				icon: '⭐',
				color: 'primary'
			},
			{
				title: 'Média de Avaliação',
				value: avgRating.toFixed(1),
				change: 0.3,
				icon: '📊',
				color: 'success'
			},
			{
				title: 'Pendentes',
				value: pendingCount,
				change: -10,
				icon: '⏳',
				color: 'warning'
			},
			{
				title: 'Taxa de Resposta',
				value: `${responseRate.toFixed(0)}%`,
				change: 5,
				icon: '💬',
				color: 'info'
			}
		];
		
		// Calcular distribuição de ratings
		const distribution = [5, 4, 3, 2, 1].map(rating => {
			const count = revs.filter(r => r.rating === rating).length;
			return {
				rating,
				count,
				percentage: (count / totalReviews * 100) || 0
			};
		});
		ratingDistribution = distribution;
	}
	
	function updateRatingDistribution(revs: Review[]) {
		const distribution = [5, 4, 3, 2, 1].map(rating => {
			const count = revs.filter(r => r.rating === rating).length;
			return {
				rating,
				count,
				percentage: revs.length > 0 ? (count / revs.length) * 100 : 0
			};
		});
		ratingDistribution = distribution;
	}
	
	function getRatingStars(rating: number) {
		return Array(5).fill(0).map((_, i) => i < rating ? '⭐' : '☆').join('');
	}
	
	function getStatusBadge(status: string) {
		const badges = {
			pending: 'badge-warning',
			approved: 'badge-success',
			rejected: 'badge-danger',
			flagged: 'badge-danger'
		};
		return badges[status as keyof typeof badges] || 'badge';
	}
	
	function getStatusLabel(status: string) {
		const labels = {
			pending: 'Pendente',
			approved: 'Aprovada',
			rejected: 'Rejeitada',
			flagged: 'Denunciada'
		};
		return labels[status as keyof typeof labels] || status;
	}
	
	function formatDate(date: string) {
		return new Date(date).toLocaleDateString('pt-BR');
	}
	
	function formatTime(date: string) {
		return new Date(date).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit'
		});
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
	
	function getRatingColor(rating: number) {
		if (rating >= 4) return 'text-green-600';
		if (rating >= 3) return 'text-yellow-600';
		return 'text-red-600';
	}
	
	// Paginação
	const paginatedReviews = $derived(
		filteredReviews.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Ações
	function toggleReviewSelection(id: string) {
		const newSet = new Set(selectedReviews);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedReviews = newSet;
	}
	
	function toggleAllReviews() {
		if (selectedReviews.size === paginatedReviews.length) {
			selectedReviews = new Set();
		} else {
			selectedReviews = new Set(paginatedReviews.map(r => r.id));
		}
	}
	
	async function approveReview(review: Review) {
		review.status = 'approved';
		console.log('Aprovando avaliação:', review);
		reviews = [...reviews];
	}
	
	async function rejectReview(review: Review) {
		if (confirm(`Tem certeza que deseja rejeitar a avaliação de ${review.customer_name}?`)) {
			review.status = 'rejected';
			console.log('Rejeitando avaliação:', review);
			reviews = [...reviews];
		}
	}
	
	async function flagReview(review: Review) {
		review.status = 'flagged';
		console.log('Denunciando avaliação:', review);
		reviews = [...reviews];
	}
	
	function openResponseModal(review: Review) {
		respondingReview = review;
		responseText = review.response?.text || '';
		showResponseModal = true;
	}
	
	function closeResponseModal() {
		showResponseModal = false;
		respondingReview = null;
		responseText = '';
	}
	
	async function saveResponse() {
		if (!respondingReview || !responseText.trim()) return;
		
		respondingReview.response = {
			text: responseText,
			created_at: new Date().toISOString(),
			author: userRole === 'vendor' ? 'Vendedor' : 'Admin'
		};
		
		console.log('Salvando resposta:', respondingReview);
		reviews = [...reviews];
		closeResponseModal();
	}
	
	// Bulk actions
	async function bulkApprove() {
		console.log('Aprovando', selectedReviews.size, 'avaliações');
		selectedReviews = new Set();
	}
	
	async function bulkReject() {
		if (confirm(`Tem certeza que deseja rejeitar ${selectedReviews.size} avaliações?`)) {
			console.log('Rejeitando', selectedReviews.size, 'avaliações');
			selectedReviews = new Set();
		}
	}
	
	// Funções do modal
	function openReviewModal(review: Review) {
		selectedReview = review;
		replyText = '';
		moderationAction = review.status === 'pending' ? 'approve' : 'flag';
		moderationReason = '';
		showReviewModal = true;
	}
	
	function closeReviewModal() {
		selectedReview = null;
		replyText = '';
		moderationAction = 'approve';
		moderationReason = '';
		showReviewModal = false;
	}
	
	async function saveReply() {
		if (!selectedReview) return;
		
		if (!replyText.trim()) {
			alert('Digite uma resposta');
			return;
		}
		
		console.log('Salvando resposta:', {
			reviewId: selectedReview.id,
			reply: replyText
		});
		
		// Simular salvamento
		setTimeout(() => {
			alert('Resposta enviada com sucesso!');
			if (selectedReview) {
				selectedReview.response = {
					text: replyText,
					created_at: new Date().toISOString(),
					author: userRole === 'admin' ? 'Admin' : 'Vendedor'
				};
			}
			reviews = [...reviews];
			closeReviewModal();
		}, 500);
	}
	
	async function moderateReview() {
		if (!selectedReview) return;
		
		if (moderationAction === 'reject' && !moderationReason.trim()) {
			alert('Informe o motivo da rejeição');
			return;
		}
		
		console.log('Moderando avaliação:', {
			reviewId: selectedReview.id,
			action: moderationAction,
			reason: moderationReason
		});
		
		// Simular moderação
		setTimeout(() => {
			if (selectedReview) {
				if (moderationAction === 'approve') {
					selectedReview.status = 'approved';
					alert('Avaliação aprovada!');
				} else if (moderationAction === 'reject') {
					selectedReview.status = 'rejected';
					alert('Avaliação rejeitada!');
				} else if (moderationAction === 'flag') {
					selectedReview.status = 'flagged';
					alert('Avaliação marcada para revisão!');
				}
			}
			reviews = [...reviews];
			closeReviewModal();
		}, 500);
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Gestão de Avaliações' : 'Minhas Avaliações'}
			</h1>
			<p class="text-gray-600 mt-1">Gerencie e responda avaliações de produtos</p>
		</div>
		
		<div class="flex items-center gap-3">
			<select bind:value={filters.sort} class="input">
				<option value="recent">Mais Recentes</option>
				<option value="helpful">Mais Úteis</option>
				<option value="rating_high">Melhor Avaliação</option>
				<option value="rating_low">Pior Avaliação</option>
			</select>
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
	
	<!-- Rating Distribution -->
	<div class="card">
		<div class="card-body">
			<h3 class="font-semibold text-gray-900 mb-4">Distribuição de Avaliações</h3>
			<div class="space-y-2">
				{#each ratingDistribution as dist}
					<div class="flex items-center gap-3" in:fly={{ x: -20, duration: 400, delay: (5 - dist.rating) * 50 }}>
						<div class="flex items-center gap-1 w-20">
							<span class="text-sm font-medium">{dist.rating}</span>
							<span class="text-yellow-500">⭐</span>
						</div>
						<div class="flex-1 bg-gray-200 rounded-full h-2">
							<div 
								class="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-500"
								style="width: {dist.percentage}%"
							></div>
						</div>
						<span class="text-sm text-gray-600 w-20 text-right">
							{dist.count} ({dist.percentage.toFixed(0)}%)
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
	
	<!-- Tabs -->
	<div class="border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => activeTab = 'all'}
				class="py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 {activeTab === 'all' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Todas
			</button>
			<button
				onclick={() => activeTab = 'pending'}
				class="py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 {activeTab === 'pending' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Pendentes
				{#if reviews.filter(r => r.status === 'pending').length > 0}
					<span class="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
						{reviews.filter(r => r.status === 'pending').length}
					</span>
				{/if}
			</button>
			<button
				onclick={() => activeTab = 'flagged'}
				class="py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 {activeTab === 'flagged' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Denunciadas
				{#if reviews.filter(r => r.status === 'flagged').length > 0}
					<span class="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
						{reviews.filter(r => r.status === 'flagged').length}
					</span>
				{/if}
			</button>
		</nav>
	</div>
	
	<!-- Filters -->
	<div class="card">
		<div class="card-body">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
				<div>
					<label class="label">Buscar</label>
					<input
						type="text"
						bind:value={filters.search}
						placeholder="Cliente, produto, comentário..."
						class="input"
					/>
				</div>
				<div>
					<label class="label">Avaliação</label>
					<select bind:value={filters.rating} class="input">
						<option value="all">Todas</option>
						<option value="5">5 ⭐</option>
						<option value="4">4 ⭐</option>
						<option value="3">3 ⭐</option>
						<option value="2">2 ⭐</option>
						<option value="1">1 ⭐</option>
					</select>
				</div>
				<div>
					<label class="label">Status</label>
					<select bind:value={filters.status} class="input">
						<option value="all">Todos</option>
						<option value="pending">Pendente</option>
						<option value="approved">Aprovada</option>
						<option value="rejected">Rejeitada</option>
						<option value="flagged">Denunciada</option>
					</select>
				</div>
				<div>
					<label class="label">Compra Verificada</label>
					<select bind:value={filters.verified} class="input">
						<option value="all">Todas</option>
						<option value="yes">Sim</option>
						<option value="no">Não</option>
					</select>
				</div>
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
	
	<!-- Bulk Actions -->
	{#if selectedReviews.size > 0}
		<div class="card bg-cyan-50 border-cyan-200" transition:slide={{ duration: 300 }}>
			<div class="card-body py-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-cyan-900">
						{selectedReviews.size} {selectedReviews.size === 1 ? 'avaliação selecionada' : 'avaliações selecionadas'}
					</p>
					<div class="flex items-center gap-2">
						<button 
							onclick={bulkApprove}
							class="btn btn-sm btn-ghost text-green-600"
						>
							Aprovar
						</button>
						<button 
							onclick={bulkReject}
							class="btn btn-sm btn-ghost text-red-600"
						>
							Rejeitar
						</button>
						<button 
							onclick={() => selectedReviews = new Set()}
							class="btn btn-sm btn-ghost"
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
	
	<!-- Reviews List -->
	{#if loading}
		<div class="card">
			<div class="card-body">
				<div class="flex items-center justify-center py-12">
					<div class="text-center">
						<div class="spinner w-12 h-12 mx-auto mb-4"></div>
						<p class="text-gray-600">Carregando avaliações...</p>
					</div>
				</div>
			</div>
		</div>
	{:else if filteredReviews.length === 0}
		<div class="card">
			<div class="card-body text-center py-12">
				<div class="text-4xl mb-4">⭐</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma avaliação encontrada</h3>
				<p class="text-gray-600">Ajuste os filtros para ver outras avaliações.</p>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			{#each paginatedReviews as review, i}
				<div 
					class="card hover:shadow-lg transition-all"
					in:fly={{ x: -20, duration: 400, delay: i * 50 }}
				>
					<div class="card-body">
						<div class="flex items-start gap-4">
							<!-- Checkbox -->
							<input
								type="checkbox"
								checked={selectedReviews.has(review.id)}
								onchange={() => toggleReviewSelection(review.id)}
								class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 mt-1"
							/>
							
							<!-- Avatar -->
							<div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xl">
								{review.customer_name.charAt(0)}
							</div>
							
							<!-- Content -->
							<div class="flex-1">
								<div class="flex items-start justify-between">
									<div>
										<div class="flex items-center gap-2 mb-1">
											<h3 class="font-semibold text-gray-900">{review.customer_name}</h3>
											{#if review.verified_purchase}
												<span class="badge badge-success badge-sm">Compra Verificada</span>
											{/if}
											<span class="badge {getStatusBadge(review.status)} badge-sm">
												{getStatusLabel(review.status)}
											</span>
										</div>
										<div class="flex items-center gap-3 text-sm text-gray-500 mb-2">
											<span class="{getRatingColor(review.rating)} font-medium">
												{getRatingStars(review.rating)}
											</span>
											<span>•</span>
											<span>{formatDate(review.created_at)}</span>
											<span>•</span>
											<a href="#" class="text-cyan-600 hover:text-cyan-700 font-medium">
												{review.product_name}
											</a>
										</div>
									</div>
									
									<!-- Actions -->
									<div class="flex justify-end gap-1">
										{#if review.status === 'pending'}
											<button
												onclick={() => openReviewModal(review)}
												class="btn btn-sm btn-success"
											>
												✓ Aprovar
											</button>
										{/if}
										{#if !review.response}
											<button
												onclick={() => openReviewModal(review)}
												class="btn btn-sm btn-primary"
											>
												💬 Responder
											</button>
										{/if}
										<button
											onclick={() => openReviewModal(review)}
											class="btn btn-sm btn-ghost"
										>
											👁️ Ver
										</button>
									</div>
								</div>
								
								<!-- Review Title -->
								{#if review.title}
									<h4 class="font-semibold text-gray-900 mb-1">{review.title}</h4>
								{/if}
								
								<!-- Review Comment -->
								<p class="text-gray-700 mb-3">{review.comment}</p>
								
								<!-- Pros and Cons -->
								{#if review.pros || review.cons}
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
										{#if review.pros}
											<div>
												<p class="text-sm font-medium text-green-600 mb-1">✓ Pontos Positivos</p>
												<ul class="text-sm text-gray-600 space-y-1">
													{#each review.pros as pro}
														<li>• {pro}</li>
													{/each}
												</ul>
											</div>
										{/if}
										{#if review.cons}
											<div>
												<p class="text-sm font-medium text-red-600 mb-1">✗ Pontos Negativos</p>
												<ul class="text-sm text-gray-600 space-y-1">
													{#each review.cons as con}
														<li>• {con}</li>
													{/each}
												</ul>
											</div>
										{/if}
									</div>
								{/if}
								
								<!-- Images -->
								{#if review.images && review.images.length > 0}
									<div class="flex gap-2 mb-3">
										{#each review.images as image}
											<div class="w-20 h-20 bg-gray-200 rounded-lg"></div>
										{/each}
									</div>
								{/if}
								
								<!-- Helpful -->
								<div class="flex items-center gap-4 text-sm text-gray-500">
									<button class="flex items-center gap-1 hover:text-gray-700">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
										</svg>
										<span>Útil ({review.helpful_count})</span>
									</button>
									<button class="flex items-center gap-1 hover:text-gray-700">
										<svg class="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
										</svg>
										<span>Não útil ({review.not_helpful_count})</span>
									</button>
								</div>
								
								<!-- Response -->
								{#if review.response}
									<div class="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-cyan-500">
										<div class="flex items-start gap-3">
											<div class="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 text-sm font-bold">
												{review.response.author.charAt(0)}
											</div>
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-1">
													<span class="font-medium text-gray-900">{review.response.author}</span>
													<span class="text-sm text-gray-500">{formatDate(review.response.created_at)}</span>
												</div>
												<p class="text-gray-700 text-sm">{review.response.text}</p>
											</div>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
		
		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="card">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<p class="text-sm text-gray-700">
							Mostrando <span class="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> até 
							<span class="font-medium">{Math.min(currentPage * itemsPerPage, filteredReviews.length)}</span> de 
							<span class="font-medium">{filteredReviews.length}</span> resultados
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
			</div>
		{/if}
	{/if}
</div>

<!-- Response Modal -->
{#if showResponseModal && respondingReview}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" transition:fade={{ duration: 200 }}>
		<div 
			class="bg-white rounded-xl shadow-xl max-w-2xl w-full"
			in:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900">Responder Avaliação</h2>
					<button 
						onclick={closeResponseModal}
						class="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				
				<!-- Review Preview -->
				<div class="bg-gray-50 p-4 rounded-lg mb-6">
					<div class="flex items-start gap-3">
						<div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
							{respondingReview.customer_name.charAt(0)}
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-1">
								<span class="font-medium text-gray-900">{respondingReview.customer_name}</span>
								<span class="text-yellow-500">{getRatingStars(respondingReview.rating)}</span>
							</div>
							<p class="text-gray-700 text-sm">{respondingReview.comment}</p>
						</div>
					</div>
				</div>
				
				<!-- Response Form -->
				<form onsubmit={(e) => { e.preventDefault(); saveResponse(); }}>
					<div>
						<label class="label">Sua Resposta</label>
						<textarea
							bind:value={responseText}
							rows="4"
							class="input"
							placeholder="Digite sua resposta para esta avaliação..."
							required
						></textarea>
						<p class="text-xs text-gray-500 mt-1">
							Seja profissional e cortês. Esta resposta será visível publicamente.
						</p>
					</div>
					
					<!-- Templates -->
					<div class="mt-4">
						<p class="text-sm font-medium text-gray-700 mb-2">Respostas Rápidas:</p>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								onclick={() => responseText = 'Obrigado pelo seu feedback! Sua opinião é muito importante para nós.'}
								class="btn btn-sm btn-ghost"
							>
								Agradecer
							</button>
							<button
								type="button"
								onclick={() => responseText = 'Lamentamos que teve essa experiência. Entre em contato conosco para resolvermos.'}
								class="btn btn-sm btn-ghost"
							>
								Experiência Negativa
							</button>
							<button
								type="button"
								onclick={() => responseText = 'Ficamos felizes que gostou! Volte sempre!'}
								class="btn btn-sm btn-ghost"
							>
								Experiência Positiva
							</button>
						</div>
					</div>
					
					<!-- Buttons -->
					<div class="flex justify-end gap-3 mt-6 pt-6 border-t">
						<button 
							type="button"
							onclick={closeResponseModal}
							class="btn btn-ghost"
						>
							Cancelar
						</button>
						<button 
							type="submit"
							class="btn btn-primary"
						>
							Enviar Resposta
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Modal de Avaliação -->
{#if showReviewModal && selectedReview}
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		onclick={closeReviewModal}
	>
		<div 
			class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
			transition:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold flex items-center gap-3">
						⭐ Detalhes da Avaliação
					</h2>
					<button 
						onclick={closeReviewModal}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						✕
					</button>
				</div>
			</div>
			
			<!-- Content -->
			<div class="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
				<!-- Review Details -->
				<div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
					<div class="flex items-start gap-4">
						<img
							src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedReview.customer_name)}&background=6366f1&color=fff`}
							alt={selectedReview.customer_name}
							class="w-16 h-16 rounded-full"
						/>
						<div class="flex-1">
							<div class="flex items-start justify-between">
								<div>
									<h3 class="text-lg font-semibold text-gray-900">{selectedReview.customer_name}</h3>
									<p class="text-sm text-gray-600">
										{formatDate(selectedReview.created_at)} às {formatTime(selectedReview.created_at)}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<div class="text-2xl">
										{getRatingStars(selectedReview.rating)}
									</div>
									<span class="badge {getStatusBadge(selectedReview.status)}">
										{getStatusLabel(selectedReview.status)}
									</span>
								</div>
							</div>
							
							<!-- Product Info -->
							<div class="mt-3 p-3 bg-white rounded-lg border border-gray-200">
								<p class="text-sm text-gray-600">Produto:</p>
								<p class="font-medium">{selectedReview.product_name}</p>
							</div>
							
							<!-- Review Comment -->
							<div class="mt-4">
								<p class="text-gray-800 leading-relaxed">{selectedReview.comment}</p>
							</div>
							
							<!-- Photos -->
							{#if selectedReview.images && selectedReview.images.length > 0}
								<div class="mt-4">
									<p class="text-sm text-gray-600 mb-2">Fotos enviadas:</p>
									<div class="flex gap-2">
										{#each selectedReview.images as image}
											<img
												src={image}
												alt="Foto da avaliação"
												class="w-20 h-20 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform"
											/>
										{/each}
									</div>
								</div>
							{/if}
							
							<!-- Verified Purchase Badge -->
							{#if selectedReview.verified_purchase}
								<div class="mt-4 inline-flex items-center gap-2 text-green-600 text-sm">
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
									</svg>
									Compra Verificada
								</div>
							{/if}
						</div>
					</div>
				</div>
				
				<!-- Current Response -->
				{#if selectedReview.response}
					<div class="bg-blue-50 rounded-xl p-6">
						<div class="flex items-start gap-3">
							<div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
								R
							</div>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-2">
									<span class="font-medium text-gray-900">{selectedReview.response.author}</span>
									<span class="text-sm text-gray-600">
										{formatDate(selectedReview.response.created_at)}
									</span>
								</div>
								<p class="text-gray-700">{selectedReview.response.text}</p>
							</div>
						</div>
					</div>
				{/if}
				
				<!-- Response Form -->
				{#if !selectedReview.response}
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							💬 Responder Avaliação
						</h3>
						<textarea
							bind:value={replyText}
							rows="4"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							placeholder="Digite sua resposta aqui. Seja profissional e cortês..."
						></textarea>
						<p class="text-xs text-gray-500 mt-1">
							Esta resposta será visível publicamente junto com a avaliação.
						</p>
					</div>
				{/if}
				
				<!-- Moderation Actions -->
				{#if userRole === 'admin' && selectedReview.status !== 'approved'}
					<div>
						<h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
							🛡️ Ações de Moderação
						</h3>
						<div class="space-y-3">
							<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 {moderationAction === 'approve' ? 'border-green-500 bg-green-50' : 'border-gray-300'}">
								<input
									type="radio"
									bind:group={moderationAction}
									value="approve"
									class="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
								/>
								<div class="ml-3">
									<span class="font-medium text-gray-900">✅ Aprovar</span>
									<p class="text-sm text-gray-600">Tornar a avaliação visível publicamente</p>
								</div>
							</label>
							
							<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 {moderationAction === 'reject' ? 'border-red-500 bg-red-50' : 'border-gray-300'}">
								<input
									type="radio"
									bind:group={moderationAction}
									value="reject"
									class="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
								/>
								<div class="ml-3">
									<span class="font-medium text-gray-900">❌ Rejeitar</span>
									<p class="text-sm text-gray-600">Ocultar a avaliação por violar políticas</p>
								</div>
							</label>
							
							<label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 {moderationAction === 'flag' ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}">
								<input
									type="radio"
									bind:group={moderationAction}
									value="flag"
									class="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
								/>
								<div class="ml-3">
									<span class="font-medium text-gray-900">🚩 Sinalizar</span>
									<p class="text-sm text-gray-600">Marcar para revisão adicional</p>
								</div>
							</label>
						</div>
						
						{#if moderationAction === 'reject'}
							<div class="mt-4">
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Motivo da Rejeição *
								</label>
								<select
									bind:value={moderationReason}
									class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
									required
								>
									<option value="">Selecione um motivo</option>
									<option value="spam">Spam ou conteúdo irrelevante</option>
									<option value="offensive">Linguagem ofensiva ou inadequada</option>
									<option value="fake">Avaliação falsa ou fraudulenta</option>
									<option value="other">Outro motivo</option>
								</select>
							</div>
						{/if}
					</div>
				{/if}
				
				<!-- Statistics -->
				<div class="bg-gray-50 rounded-lg p-4">
					<h4 class="text-sm font-medium text-gray-700 mb-3">📊 Informações Adicionais</h4>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-600">ID da Avaliação:</span>
							<span class="font-mono text-gray-900 ml-2">{selectedReview.id}</span>
						</div>
						<div>
							<span class="text-gray-600">Nota:</span>
							<span class="font-medium text-gray-900 ml-2">{selectedReview.rating}/5</span>
						</div>
						<div>
							<span class="text-gray-600">Útil para:</span>
							<span class="font-medium text-gray-900 ml-2">{selectedReview.helpful_count} pessoas</span>
						</div>
						<div>
							<span class="text-gray-600">Denúncias:</span>
							<span class="font-medium text-gray-900 ml-2">{selectedReview.not_helpful_count} pessoas</span>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="border-t border-gray-200 p-6">
				<div class="flex items-center justify-between">
					<button
						onclick={closeReviewModal}
						class="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						Cancelar
					</button>
					<div class="flex items-center gap-3">
						{#if !selectedReview.response && replyText.trim()}
							<button
								onclick={saveReply}
								class="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200"
							>
								💬 Enviar Resposta
							</button>
						{/if}
						{#if userRole === 'admin' && selectedReview.status !== 'approved'}
							<button
								onclick={moderateReview}
								class="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:shadow-lg transition-all duration-200"
							>
								🛡️ Aplicar Moderação
							</button>
						{/if}
					</div>
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