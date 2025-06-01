<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	
	// Interface do usuário
	interface User {
		id: string;
		name: string;
		email: string;
		role: 'admin' | 'vendor';
	}
	
	// Estado
	let user: User | null = null;
	let isLoading = true;
	
	// Buscar dados do usuário diretamente
	onMount(async () => {
		console.log('🏁 Dashboard carregando...');
		
		// Em desenvolvimento, sempre criar usuário baseado na URL
		const userParam = $page.url.searchParams.get('user');
		
		if (userParam === 'vendor') {
			user = {
				id: 'vendor-dev',
				name: 'João Vendedor',
				email: 'joao@vendor.local',
				role: 'vendor'
			};
		} else {
			// Default: admin
			user = {
				id: 'admin-dev',
				name: 'Maria Admin',  
				email: 'admin@dev.local',
				role: 'admin'
			};
		}
		
		console.log('✅ Dashboard carregado para:', user.name);
		isLoading = false;
	});
	
	// Dados mock baseados no role
	$: dashboardData = user?.role === 'admin' ? {
		// ADMIN - Dados globais
		stats: [
			{ 
				title: 'Receita Total', 
				value: 'R$ 284,5K', 
				change: '+26.8%', 
				changeType: 'positive',
				icon: '💰',
				gradient: true
			},
			{ 
				title: 'Vendedores Ativos', 
				value: '156', 
				change: '+12%', 
				changeType: 'positive',
				icon: '🏪'
			},
			{ 
				title: 'Produtos Totais', 
				value: '2,834', 
				change: '+18%', 
				changeType: 'positive',
				icon: '📦'
			},
			{ 
				title: 'Usuários Ativos', 
				value: '1,234', 
				change: '+8%', 
				changeType: 'positive',
				icon: '👥'
			}
		],
		recentActivity: [
			{ type: 'user', message: 'Novo vendedor cadastrado: João Silva', time: '5 min' },
			{ type: 'product', message: 'Produto "iPhone 15" aprovado', time: '12 min' },
			{ type: 'order', message: 'Pedido #1234 processado com sucesso', time: '18 min' },
			{ type: 'report', message: 'Relatório mensal gerado', time: '1h' }
		],
		quickActions: [
			{ title: 'Moderar Produtos', desc: 'Revisar produtos pendentes', href: '/produtos?status=pending', icon: '🔍' },
			{ title: 'Gerenciar Usuários', desc: 'Administrar vendedores e clientes', href: '/usuarios', icon: '👥' },
			{ title: 'Ver Relatórios', desc: 'Analytics e performance', href: '/relatorios', icon: '📊' },
			{ title: 'Configurações', desc: 'Configurar sistema', href: '/configuracoes', icon: '⚙️' }
		]
	} : {
		// VENDOR - Dados do vendedor
		stats: [
			{ 
				title: 'Minhas Vendas', 
				value: 'R$ 12,4K', 
				change: '+15.2%', 
				changeType: 'positive',
				icon: '💸',
				gradient: true
			},
			{ 
				title: 'Meus Produtos', 
				value: '23', 
				change: '+3', 
				changeType: 'positive',
				icon: '📦'
			},
			{ 
				title: 'Pedidos Pendentes', 
				value: '7', 
				change: '+2', 
				changeType: 'positive',
				icon: '📋'
			},
			{ 
				title: 'Avaliação Média', 
				value: '4.8★', 
				change: '+0.2', 
				changeType: 'positive',
				icon: '⭐'
			}
		],
		recentActivity: [
			{ type: 'order', message: 'Novo pedido recebido: Smartphone Galaxy', time: '3 min' },
			{ type: 'product', message: 'Estoque baixo: Fone Bluetooth', time: '15 min' },
			{ type: 'review', message: 'Nova avaliação 5★ recebida', time: '32 min' },
			{ type: 'sale', message: 'Venda confirmada: R$ 450,00', time: '1h' }
		],
		quickActions: [
			{ title: 'Adicionar Produto', desc: 'Cadastrar novo item', href: '/produtos/novo', icon: '➕' },
			{ title: 'Meus Pedidos', desc: 'Gerenciar vendas', href: '/pedidos', icon: '📋' },
			{ title: 'Meus Relatórios', desc: 'Performance de vendas', href: '/relatorios', icon: '📈' },
			{ title: 'Meu Perfil', desc: 'Dados da loja', href: '/configuracoes', icon: '🏪' }
		]
	};
</script>

<svelte:head>
	<title>{user?.role === 'admin' ? 'Admin Dashboard' : 'Seller Dashboard'} - Marketplace GDG</title>
</svelte:head>

{#if isLoading}
	<!-- Loading local -->
	<div class="flex items-center justify-center py-12">
		<div class="text-center">
			<div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600">Carregando dashboard...</p>
		</div>
	</div>
{:else if !user}
	<!-- Erro -->
	<div class="text-center py-12">
		<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
			<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
		</div>
		<h3 class="text-lg font-medium text-gray-900 mb-2">Erro no Dashboard</h3>
		<p class="text-gray-500 mb-4">Não foi possível carregar os dados</p>
	</div>
{:else}
	<!-- Dashboard Unificado -->
	<div class="space-y-8">
		<!-- Header do Dashboard -->
		<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="bg-gradient-to-r from-primary-500 to-primary-600 px-8 py-6 text-white">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold mb-2">
							{#if user.role === 'admin'}
								Bem-vindo, Administrador! 👨‍💼
							{:else}
								Bem-vindo, {user.name}! 🏪
							{/if}
						</h1>
						<p class="text-primary-100 text-lg">
							{#if user.role === 'admin'}
								Gerencie todo o marketplace com facilidade
							{:else}
								Gerencie sua loja e vendas de forma eficiente
							{/if}
						</p>
					</div>
					<div class="hidden md:block">
						<div class="w-20 h-20 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
							<span class="text-4xl">
								{user.role === 'admin' ? '🎯' : '🚀'}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	
		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each dashboardData.stats as stat}
				<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 {stat.gradient ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white' : ''}">
					<div class="flex items-center justify-between mb-4">
						<div>
							<p class="text-sm font-medium {stat.gradient ? 'text-primary-100' : 'text-gray-600'} mb-2">{stat.title}</p>
							<p class="text-3xl font-bold {stat.gradient ? 'text-white' : 'text-gray-900'}">{stat.value}</p>
						</div>
						<div class="w-12 h-12 {stat.gradient ? 'bg-white bg-opacity-20' : 'bg-primary-500'} rounded-xl flex items-center justify-center text-2xl">
							{#if stat.gradient}
								<span class="opacity-80">{stat.icon}</span>
							{:else}
								<span>{stat.icon}</span>
							{/if}
						</div>
					</div>
					<div class="flex items-center text-sm">
						<svg class="w-4 h-4 {stat.gradient ? 'text-green-200' : 'text-green-500'} mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
						</svg>
						<span class="{stat.gradient ? 'text-green-200' : 'text-green-600'} font-semibold">{stat.change}</span>
						<span class="{stat.gradient ? 'text-primary-100' : 'text-gray-500'} ml-1">este mês</span>
					</div>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Atividade Recente -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
					<h3 class="text-xl font-semibold text-gray-900">Atividade Recente</h3>
				</div>
				<div class="p-6">
					<div class="space-y-4">
						{#each dashboardData.recentActivity as activity}
							<div class="flex items-start space-x-3">
								<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
									{#if activity.type === 'user'}
										<svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
										</svg>
									{:else if activity.type === 'product'}
										<svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
										</svg>
									{:else if activity.type === 'order'}
										<svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
										</svg>
									{:else}
										<svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
										</svg>
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm text-gray-900">{activity.message}</p>
									<p class="text-xs text-gray-500 mt-1">{activity.time} atrás</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Ações Rápidas -->
			<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
					<h3 class="text-xl font-semibold text-gray-900">Ações Rápidas</h3>
				</div>
				<div class="p-6">
					<div class="grid grid-cols-1 gap-4">
						{#each dashboardData.quickActions as action}
							<a href={action.href} class="group block p-4 rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200">
								<div class="flex items-center space-x-3">
									<div class="w-10 h-10 bg-primary-100 group-hover:bg-primary-200 rounded-lg flex items-center justify-center transition-colors">
										<span class="text-lg">{action.icon}</span>
									</div>
									<div>
										<h4 class="font-medium text-gray-900 group-hover:text-primary-700">{action.title}</h4>
										<p class="text-sm text-gray-500">{action.desc}</p>
									</div>
								</div>
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if} 