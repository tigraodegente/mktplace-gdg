<script lang="ts">
	import { onMount } from 'svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import StockMovements from '$lib/components/estoque/StockMovements.svelte';
	import StockAlerts from '$lib/components/estoque/StockAlerts.svelte';
	
	// Estados
	let activeTab = $state('overview');
	let dashboardData = $state<any>({});
	let loading = $state(true);
	
	// Abas disponíveis
	const tabs = [
		{ id: 'overview', label: 'Visão Geral', icon: 'BarChart3' },
		{ id: 'movements', label: 'Movimentações', icon: 'ArrowUpDown' },
		{ id: 'alerts', label: 'Alertas', icon: 'AlertTriangle' },
		{ id: 'reports', label: 'Relatórios', icon: 'FileText' }
	];
	
	// Carregar dados do dashboard
	async function loadDashboardData() {
		loading = true;
		try {
			const [summaryRes, alertsRes] = await Promise.all([
				fetch('/api/stock/reports?type=summary'),
				fetch('/api/stock/alerts?active=true&limit=5')
			]);
			
			const summaryResult = await summaryRes.json();
			const alertsResult = await alertsRes.json();
			
			if (summaryResult.success) {
				dashboardData.summary = summaryResult.data;
			}
			
			if (alertsResult.success) {
				dashboardData.recentAlerts = alertsResult.data.alerts || [];
				dashboardData.alertsSummary = alertsResult.data.summary || {};
			}
			
			console.log('✅ Dashboard data loaded:', dashboardData);
		} catch (error) {
			console.error('Erro ao carregar dashboard:', error);
		} finally {
			loading = false;
		}
	}
	
	// Formatar valor monetário
	function formatCurrency(value: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value || 0);
	}
	
	// Formatar número
	function formatNumber(value: number) {
		return new Intl.NumberFormat('pt-BR').format(value || 0);
	}
	
	onMount(() => {
		loadDashboardData();
	});
</script>

<svelte:head>
	<title>Gestão de Estoque - Admin Panel</title>
	<meta name="description" content="Sistema completo de gestão de estoque com controle de movimentações, alertas e relatórios" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b border-gray-200">
		<div class="px-4 lg:px-8 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Gestão de Estoque</h1>
					<p class="text-gray-600 mt-1">Controle completo de inventário, movimentações e alertas</p>
				</div>
				
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => loadDashboardData()}
						class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
					>
						<ModernIcon name="RotateCcw" size="sm" />
						Atualizar
					</button>
					<button
						type="button"
						class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2"
					>
						<ModernIcon name="Download" size="sm" />
						Exportar Relatório
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Navegação das Abas -->
	<div class="bg-white border-b border-gray-200 sticky top-0 z-10">
		<div class="px-4 lg:px-8">
			<div class="flex gap-1 overflow-x-auto">
				{#each tabs as tab}
					<button
						type="button"
						onclick={() => activeTab = tab.id}
						class="py-4 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap font-medium {
							activeTab === tab.id
								? 'border-[#00BFB3] text-[#00BFB3] bg-[#00BFB3]/5'
								: 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
						}"
					>
						<span class="text-sm">
							{#if tab.id === 'overview'}📊
							{:else if tab.id === 'movements'}📋
							{:else if tab.id === 'alerts'}🚨
							{:else if tab.id === 'reports'}📈
							{:else}📦{/if}
						</span>
						{tab.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
	
	<!-- Conteúdo -->
	<div class="px-4 lg:px-8 py-6">
		{#if activeTab === 'overview'}
			<!-- Visão Geral -->
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="w-8 h-8 border-4 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
					<span class="ml-3 text-gray-600">Carregando dados...</span>
				</div>
			{:else}
				<div class="space-y-6">
					<!-- Estatísticas Principais -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<div class="bg-white rounded-xl border border-gray-200 p-6">
							<div class="flex items-center gap-4">
								<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
									<ModernIcon name="Package" size="md" class="text-[#00BFB3]" />
								</div>
								<div>
									<p class="text-sm font-medium text-gray-600">Total de Produtos</p>
									<p class="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.summary?.general_stats?.total_products || 0)}</p>
									<p class="text-xs text-gray-500">Em {dashboardData.summary?.general_stats?.total_warehouses || 1} armazéns</p>
								</div>
							</div>
						</div>
						
						<div class="bg-white rounded-xl border border-gray-200 p-6">
							<div class="flex items-center gap-4">
								<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
									<ModernIcon name="TrendingUp" size="md" class="text-green-600" />
								</div>
								<div>
									<p class="text-sm font-medium text-gray-600">Valor Total</p>
									<p class="text-2xl font-bold text-gray-900">{formatCurrency(dashboardData.summary?.general_stats?.total_value || 0)}</p>
									<p class="text-xs text-gray-500">Em estoque</p>
								</div>
							</div>
						</div>
						
						<div class="bg-white rounded-xl border border-gray-200 p-6">
							<div class="flex items-center gap-4">
								<div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
									<ModernIcon name="AlertCircle" size="md" class="text-red-600" />
								</div>
								<div>
									<p class="text-sm font-medium text-gray-600">Produtos em Falta</p>
									<p class="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.summary?.general_stats?.out_of_stock_count || 0)}</p>
									<p class="text-xs text-gray-500">Sem estoque</p>
								</div>
							</div>
						</div>
						
						<div class="bg-white rounded-xl border border-gray-200 p-6">
							<div class="flex items-center gap-4">
								<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
									<ModernIcon name="AlertTriangle" size="md" class="text-yellow-600" />
								</div>
								<div>
									<p class="text-sm font-medium text-gray-600">Estoque Baixo</p>
									<p class="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.summary?.general_stats?.low_stock_count || 0)}</p>
									<p class="text-xs text-gray-500">Abaixo do mínimo</p>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Grid com informações detalhadas -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Produtos Críticos -->
						<div class="bg-white rounded-xl border border-gray-200 p-6">
							<div class="flex items-center justify-between mb-6">
								<h3 class="text-lg font-semibold text-gray-900">Produtos em Situação Crítica</h3>
								<ModernIcon name="AlertTriangle" size="md" class="text-red-500" />
							</div>
							
							{#if dashboardData.summary?.critical_products?.length > 0}
								<div class="space-y-4">
									{#each dashboardData.summary.critical_products.slice(0, 5) as product}
										<div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
											<div>
												<p class="font-medium text-gray-900">{product.name}</p>
												<p class="text-sm text-gray-500">SKU: {product.sku}</p>
											</div>
											<div class="text-right">
												<p class="text-sm font-medium text-red-600">Estoque: {product.quantity}</p>
												<p class="text-xs text-gray-500">{product.warehouse_name || 'Principal'}</p>
											</div>
										</div>
									{/each}
								</div>
								<div class="mt-4 pt-4 border-t border-gray-200">
									<button
										type="button"
										onclick={() => activeTab = 'alerts'}
										class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium"
									>
										Ver todos os alertas →
									</button>
								</div>
							{:else}
								<div class="text-center py-8">
									<ModernIcon name="CheckCircle" size="xl" class="mx-auto text-green-400 mb-3" />
									<p class="text-gray-600">Nenhum produto em situação crítica</p>
								</div>
							{/if}
						</div>
						
						<!-- Top Produtos por Valor -->
						<div class="bg-white rounded-xl border border-gray-200 p-6">
							<div class="flex items-center justify-between mb-6">
								<h3 class="text-lg font-semibold text-gray-900">Produtos de Maior Valor</h3>
								<ModernIcon name="DollarSign" size="md" class="text-green-500" />
							</div>
							
							{#if dashboardData.summary?.top_value_products?.length > 0}
								<div class="space-y-4">
									{#each dashboardData.summary.top_value_products.slice(0, 5) as product}
										<div class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
											<div>
												<p class="font-medium text-gray-900">{product.name}</p>
												<p class="text-sm text-gray-500">SKU: {product.sku}</p>
											</div>
											<div class="text-right">
												<p class="text-sm font-medium text-green-600">{formatCurrency(product.total_value)}</p>
												<p class="text-xs text-gray-500">{product.quantity} unid.</p>
											</div>
										</div>
									{/each}
								</div>
								<div class="mt-4 pt-4 border-t border-gray-200">
									<button
										type="button"
										onclick={() => activeTab = 'reports'}
										class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium"
									>
										Ver relatório completo →
									</button>
								</div>
							{:else}
								<div class="text-center py-8">
									<ModernIcon name="Package" size="xl" class="mx-auto text-gray-400 mb-3" />
									<p class="text-gray-600">Nenhum produto encontrado</p>
								</div>
							{/if}
						</div>
					</div>
					
					<!-- Alertas Recentes -->
					{#if dashboardData.recentAlerts?.length > 0}
						<div class="bg-white rounded-xl border border-gray-200 p-6">
							<div class="flex items-center justify-between mb-6">
								<h3 class="text-lg font-semibold text-gray-900">Alertas Recentes</h3>
								<button
									type="button"
									onclick={() => activeTab = 'alerts'}
									class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium"
								>
									Ver todos →
								</button>
							</div>
							
							<div class="space-y-3">
								{#each dashboardData.recentAlerts.slice(0, 3) as alert}
									<div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
										<div class="w-2 h-2 rounded-full {alert.alert_type === 'out_of_stock' ? 'bg-red-500' : 'bg-yellow-500'}"></div>
										<div class="flex-1">
											<p class="font-medium text-gray-900">{alert.product_name}</p>
											<p class="text-sm text-gray-500">
												{alert.alert_type === 'out_of_stock' ? 'Produto sem estoque' : `Estoque baixo: ${alert.current_value} unidades`}
											</p>
										</div>
										<div class="text-xs text-gray-400">
											{new Date(alert.created_at).toLocaleDateString('pt-BR')}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		{:else if activeTab === 'movements'}
			<!-- Movimentações -->
			<StockMovements />
		{:else if activeTab === 'alerts'}
			<!-- Alertas -->
			<StockAlerts />
		{:else if activeTab === 'reports'}
			<!-- Relatórios -->
			<div class="bg-white rounded-xl border border-gray-200 p-8">
				<div class="text-center">
					<ModernIcon name="FileText" size="xl" class="mx-auto text-gray-400 mb-4" />
					<h3 class="text-lg font-medium text-gray-900 mb-2">Relatórios de Estoque</h3>
					<p class="text-gray-600 mb-6">Gere relatórios detalhados sobre seu estoque</p>
					
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
						<button
							type="button"
							class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
						>
							<div class="text-2xl mb-2">📊</div>
							<h4 class="font-medium text-gray-900">Relatório de Valorização</h4>
							<p class="text-sm text-gray-500 mt-1">Valor total do estoque por produto</p>
						</button>
						
						<button
							type="button"
							class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
						>
							<div class="text-2xl mb-2">🔄</div>
							<h4 class="font-medium text-gray-900">Giro de Estoque</h4>
							<p class="text-sm text-gray-500 mt-1">Análise de rotatividade dos produtos</p>
						</button>
						
						<button
							type="button"
							class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
						>
							<div class="text-2xl mb-2">📈</div>
							<h4 class="font-medium text-gray-900">Previsão de Reposição</h4>
							<p class="text-sm text-gray-500 mt-1">Estimativas baseadas no histórico</p>
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div> 