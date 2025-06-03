<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, blur, crossfade } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';
	
	// Crossfade para transições coordenadas
	const [send, receive] = crossfade({
		duration: 300,
		fallback(node) {
			return scale(node, { start: 0.5, duration: 300 });
		}
	});
	
	// Interfaces
	interface StatCard {
		title: string;
		value: string | number;
		change: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger';
	}
	
	interface Activity {
		id: string;
		type: 'order' | 'product' | 'user' | 'payment';
		title: string;
		description: string;
		time: string;
		icon: string;
	}
	
	// Estado
	let loading = $state(true);
	let userRole = $state<'admin' | 'vendor'>('admin');
	let selectedPeriod = $state('week');
	
	// Dados do dashboard
	let stats = $state<StatCard[]>([]);
	let recentActivities = $state<Activity[]>([]);
	let chartData = $state<any>(null);
	
	// Verificar role do usuário
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadDashboardData();
	});
	
	onMount(() => {
		// Simular carregamento de dados
		setTimeout(() => {
			loadDashboardData();
			loading = false;
		}, 1000);
	});
	
	function loadDashboardData() {
		if (userRole === 'admin') {
			stats = [
				{
					title: 'Vendas Totais',
					value: 'R$ 45.231,89',
					change: 12.5,
					icon: '💰',
					color: 'primary'
				},
				{
					title: 'Novos Pedidos',
					value: 156,
					change: 8.2,
					icon: '📦',
					color: 'success'
				},
				{
					title: 'Usuários Ativos',
					value: '2.3k',
					change: -2.4,
					icon: '👥',
					color: 'warning'
				},
				{
					title: 'Taxa de Conversão',
					value: '3.2%',
					change: 0.8,
					icon: '📈',
					color: 'danger'
				}
			];
		} else {
			stats = [
				{
					title: 'Minhas Vendas',
					value: 'R$ 12.450,00',
					change: 15.3,
					icon: '💵',
					color: 'primary'
				},
				{
					title: 'Pedidos Pendentes',
					value: 23,
					change: -5.2,
					icon: '⏳',
					color: 'warning'
				},
				{
					title: 'Produtos Ativos',
					value: 87,
					change: 3.1,
					icon: '🛍️',
					color: 'success'
				},
				{
					title: 'Avaliação Média',
					value: '4.8',
					change: 0.2,
					icon: '⭐',
					color: 'primary'
				}
			];
		}
		
		// Atividades recentes
		recentActivities = [
			{
				id: '1',
				type: 'order',
				title: 'Novo Pedido',
				description: 'Pedido #1234 realizado por João Silva',
				time: 'Há 5 minutos',
				icon: '🛒'
			},
			{
				id: '2',
				type: 'product',
				title: 'Produto Atualizado',
				description: 'Estoque do produto "Tênis Nike" atualizado',
				time: 'Há 15 minutos',
				icon: '📦'
			},
			{
				id: '3',
				type: 'user',
				title: 'Novo Usuário',
				description: 'Maria Santos se cadastrou na plataforma',
				time: 'Há 1 hora',
				icon: '👤'
			},
			{
				id: '4',
				type: 'payment',
				title: 'Pagamento Recebido',
				description: 'Pagamento de R$ 350,00 confirmado',
				time: 'Há 2 horas',
				icon: '💳'
			}
		];
		
		// Dados do gráfico (simulado)
		chartData = {
			labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
			datasets: [{
				label: 'Vendas',
				data: [1200, 1900, 1500, 2100, 2400, 1800, 2600],
				borderColor: '#00BFB3',
				backgroundColor: 'rgba(0, 191, 179, 0.1)'
			}]
		};
	}
	
	function getColorClasses(color: string) {
		const colors = {
			primary: 'from-cyan-500 to-cyan-600',
			success: 'from-green-500 to-green-600',
			warning: 'from-yellow-500 to-yellow-600',
			danger: 'from-red-500 to-red-600'
		};
		return colors[color as keyof typeof colors] || colors.primary;
	}
	
	function getActivityIcon(type: string) {
		const icons = {
			order: 'text-cyan-600 bg-cyan-100',
			product: 'text-purple-600 bg-purple-100',
			user: 'text-green-600 bg-green-100',
			payment: 'text-yellow-600 bg-yellow-100'
		};
		return icons[type as keyof typeof icons] || 'text-gray-600 bg-gray-100';
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Dashboard Administrativo' : 'Dashboard do Vendedor'}
			</h1>
			<p class="text-gray-600 mt-1">Bem-vindo de volta! Aqui está um resumo do seu negócio.</p>
		</div>
		
		<!-- Period Selector -->
		<div class="flex items-center gap-2">
			<select 
				bind:value={selectedPeriod}
				class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
			>
				<option value="today">Hoje</option>
				<option value="week">Esta Semana</option>
				<option value="month">Este Mês</option>
				<option value="year">Este Ano</option>
			</select>
			
			<button class="btn btn-primary">
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
	
	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Chart Section -->
		<div class="lg:col-span-2">
			<div class="card" in:fly={{ x: -20, duration: 600, delay: 400 }}>
				<div class="card-header">
					<h2 class="text-lg font-semibold text-gray-900">Visão Geral de Vendas</h2>
				</div>
				<div class="card-body">
					{#if loading}
						<div class="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
					{:else}
						<!-- Chart placeholder -->
						<div class="h-64 flex items-center justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg">
							<div class="text-center">
								<svg class="w-16 h-16 text-cyan-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
								<p class="text-cyan-700 font-medium">Gráfico de vendas aqui</p>
								<p class="text-cyan-600 text-sm mt-1">Integração com biblioteca de gráficos</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Quick Actions -->
			<div class="card mt-6" in:fly={{ x: -20, duration: 600, delay: 500 }}>
				<div class="card-header">
					<h2 class="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
				</div>
				<div class="card-body">
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
							<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">📦</div>
							<p class="text-sm font-medium text-gray-700">Novo Produto</p>
						</button>
						<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
							<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">📋</div>
							<p class="text-sm font-medium text-gray-700">Ver Pedidos</p>
						</button>
						<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
							<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</div>
							<p class="text-sm font-medium text-gray-700">Relatórios</p>
						</button>
						<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
							<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
							<p class="text-sm font-medium text-gray-700">Configurações</p>
						</button>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Activity Feed -->
		<div class="lg:col-span-1">
			<div class="card" in:fly={{ x: 20, duration: 600, delay: 400 }}>
				<div class="card-header">
					<h2 class="text-lg font-semibold text-gray-900">Atividade Recente</h2>
				</div>
				<div class="card-body">
					{#if loading}
						<div class="space-y-4">
							{#each Array(4) as _}
								<div class="flex items-start gap-3 animate-pulse">
									<div class="w-10 h-10 bg-gray-200 rounded-full"></div>
									<div class="flex-1">
										<div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
										<div class="h-3 bg-gray-200 rounded w-1/2"></div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="space-y-4">
							{#each recentActivities as activity, i (activity.id)}
								<div 
									class="flex items-start gap-3 hover:bg-gray-50 p-2 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer"
									in:fly={{ x: 20, duration: 400, delay: 500 + i * 50 }}
									out:fade={{ duration: 200 }}
								>
									<div 
										class="w-10 h-10 rounded-full flex items-center justify-center text-lg {getActivityIcon(activity.type)} transition-transform duration-300 hover:scale-110"
										in:scale={{ duration: 300, delay: 600 + i * 50 }}
									>
										{activity.icon}
									</div>
									<div class="flex-1">
										<h4 class="text-sm font-semibold text-gray-900 transition-colors duration-200 hover:text-cyan-600">{activity.title}</h4>
										<p class="text-sm text-gray-600">{activity.description}</p>
										<p class="text-xs text-gray-500 mt-1">{activity.time}</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
					
					<button class="w-full mt-4 btn btn-ghost text-sm">
						Ver toda atividade
						<svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
			
			<!-- Mini Stats -->
			<div class="card mt-6" in:fly={{ x: 20, duration: 600, delay: 600 }}>
				<div class="card-header">
					<h2 class="text-lg font-semibold text-gray-900">Métricas Rápidas</h2>
				</div>
				<div class="card-body space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Taxa de Abandono</span>
						<span class="text-sm font-semibold text-gray-900">24.3%</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Tempo Médio no Site</span>
						<span class="text-sm font-semibold text-gray-900">3m 42s</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Páginas por Sessão</span>
						<span class="text-sm font-semibold text-gray-900">4.2</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-600">Taxa de Retorno</span>
						<span class="text-sm font-semibold text-gray-900">18.5%</span>
					</div>
				</div>
			</div>
		</div>
	</div>
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