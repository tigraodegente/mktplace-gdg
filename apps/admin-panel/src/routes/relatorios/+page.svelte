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
	interface StatCard {
		title: string;
		value: string | number;
		change?: number;
		icon: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
	}
	
	interface ReportData {
		name: string;
		value: string;
		change: string;
		type: 'positive' | 'negative';
		color: string;
	}
	
	interface TopProduct {
		name: string;
		sales: number;
		revenue: number;
		growth: number;
		image: string;
	}
	
	// Estado
	let loading = $state(true);
	let userRole = $state<'admin' | 'vendor'>('admin');
	let selectedPeriod = $state('month');
	let showCustomPeriod = $state(false);
	
	// Stats
	let stats = $state<StatCard[]>([]);
	
	// Report Data
	let reportData = $state<ReportData[]>([
		{ name: 'Vendas por Categoria', value: 'R$ 45.2K', change: '+12%', type: 'positive', color: 'from-blue-500 to-blue-600' },
		{ name: 'Produtos Mais Vendidos', value: '234 itens', change: '+8%', type: 'positive', color: 'from-green-500 to-green-600' },
		{ name: 'Taxa de Conversão', value: '3.2%', change: '-0.5%', type: 'negative', color: 'from-yellow-500 to-orange-500' },
		{ name: 'Ticket Médio', value: 'R$ 289', change: '+15%', type: 'positive', color: 'from-purple-500 to-purple-600' },
	]);
	
	// Top Products
	let topProducts = $state<TopProduct[]>([
		{ name: 'Smartphone Galaxy A54', sales: 234, revenue: 89200, growth: 15, image: '📱' },
		{ name: 'Tênis Nike Air Max', sales: 189, revenue: 67400, growth: 12, image: '👟' },
		{ name: 'Livro Clean Code', sales: 156, revenue: 14000, growth: 8, image: '📚' },
		{ name: 'Mouse Gamer RGB', sales: 134, revenue: 12600, growth: 22, image: '🖱️' },
		{ name: 'Headset Bluetooth', sales: 98, revenue: 9800, growth: 18, image: '🎧' },
	]);
	
	// Chart data mock
	let chartData = $state({
		labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
		datasets: [{
			label: 'Vendas 2024',
			data: [12000, 19000, 15000, 25000, 22000, 30000],
			borderColor: '#00BFB3',
			backgroundColor: 'rgba(0, 191, 179, 0.1)'
		}]
	});
	
	// Verificar role
	$effect(() => {
		const userParam = $page.url.searchParams.get('user');
		userRole = userParam === 'vendor' ? 'vendor' : 'admin';
		loadReportData();
	});
	
	onMount(() => {
		loadReportData();
	});
	
	function loadReportData() {
		loading = true;
		
		// Simular carregamento
		setTimeout(() => {
			stats = [
    { 
      title: 'Vendas Este Mês', 
      value: 'R$ 124,5K', 
					change: 26.8,
					icon: '💰',
					color: 'primary'
    },
    { 
      title: 'Pedidos Totais', 
      value: '1,543', 
					change: 18,
					icon: '📋',
					color: 'info'
    },
    { 
      title: 'Produtos Ativos', 
      value: '2,234', 
					change: 12,
					icon: '📦',
					color: 'success'
    },
    { 
      title: 'Usuários Ativos', 
      value: '1,234', 
					change: 8,
					icon: '👥',
					color: 'warning'
				}
			];
			
			loading = false;
		}, 1000);
	}

  function formatPrice(price: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
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

	function handleGenerateReport(type: string) {
    console.log('Gerar relatório:', type);
		// Implementar geração de relatório
  }

	function handleExportPDF() {
    console.log('Exportar relatório PDF');
		// Implementar exportação
  }

	function handleCustomPeriod() {
		showCustomPeriod = true;
		// Implementar seleção de período personalizado
  }
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" in:fly={{ y: -20, duration: 500, delay: 100 }}>
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				{userRole === 'admin' ? 'Relatórios e Analytics' : 'Meus Relatórios'}
			</h1>
			<p class="text-gray-600 mt-1">Análise completa de performance e vendas</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- Period Selector -->
			<select 
				bind:value={selectedPeriod}
				class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
			>
				<option value="today">Hoje</option>
				<option value="week">Esta Semana</option>
				<option value="month">Este Mês</option>
				<option value="year">Este Ano</option>
			</select>
			
        <button 
				onclick={handleCustomPeriod}
				class="btn btn-ghost"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Período Personalizado
        </button>
			
        <button 
				onclick={handleExportPDF}
				class="btn btn-primary"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Exportar PDF
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

  <!-- Charts Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Sales Chart -->
		<div class="card" in:fly={{ x: -20, duration: 600, delay: 400 }}>
			<div class="card-header">
				<h2 class="text-lg font-semibold text-gray-900">Vendas por Período</h2>
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
    
    <!-- Top Products -->
		<div class="card" in:fly={{ x: 20, duration: 600, delay: 400 }}>
			<div class="card-header">
				<h2 class="text-lg font-semibold text-gray-900">Produtos Mais Vendidos</h2>
			</div>
			<div class="card-body">
				{#if loading}
					<div class="space-y-4">
						{#each Array(5) as _}
							<div class="flex items-center gap-3 animate-pulse">
								<div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
								<div class="flex-1">
									<div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
									<div class="h-3 bg-gray-200 rounded w-1/2"></div>
								</div>
								<div class="text-right">
									<div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
									<div class="h-3 bg-gray-200 rounded w-12"></div>
								</div>
							</div>
						{/each}
      </div>
				{:else}
        <div class="space-y-4">
						{#each topProducts as product, i}
							<div 
								class="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer"
								in:fly={{ x: 20, duration: 400, delay: 500 + i * 50 }}
							>
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center text-lg transform hover:scale-110 transition-transform">
                  {product.image}
                </div>
                <div>
										<p class="font-medium text-gray-900">{product.name}</p>
										<p class="text-sm text-gray-500">{product.sales} vendas</p>
                </div>
              </div>
              <div class="text-right">
									<p class="font-medium text-gray-900">{formatPrice(product.revenue)}</p>
									<p class="text-sm text-green-600">+{product.growth}%</p>
              </div>
            </div>
          {/each}
        </div>
				{/if}
      </div>
    </div>
  </div>

  <!-- Reports Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		{#each reportData as report, i}
			<div 
				class="card text-center hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
				in:scale={{ duration: 400, delay: 600 + i * 50, easing: backOut }}
			>
				<div class="card-body">
        <h4 class="text-lg font-semibold text-gray-900 mb-3">{report.name}</h4>
					<p class="text-3xl font-bold text-cyan-600 mb-3">{report.value}</p>
        <div class="flex items-center justify-center text-sm">
          {#if report.type === 'positive'}
            <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
            </svg>
            <span class="text-green-600 font-semibold">{report.change}</span>
          {:else}
            <svg class="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
            </svg>
            <span class="text-red-600 font-semibold">{report.change}</span>
          {/if}
					</div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Detailed Reports -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<div 
			class="card group hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
			in:fly={{ y: 20, duration: 600, delay: 800 }}
		>
			<div class="card-body">
				<div class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      </div>
      <h4 class="text-lg font-semibold text-gray-900 mb-2">Relatório Financeiro</h4>
      <p class="text-gray-600 text-sm mb-4">Análise completa de receitas, despesas e lucros</p>
      <button 
					onclick={() => handleGenerateReport('financeiro')}
					class="btn btn-primary w-full"
      >
        Gerar Relatório
      </button>
			</div>
    </div>
    
		<div 
			class="card group hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
			in:fly={{ y: 20, duration: 600, delay: 900 }}
		>
			<div class="card-body">
				<div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
        </svg>
      </div>
      <h4 class="text-lg font-semibold text-gray-900 mb-2">Análise de Usuários</h4>
      <p class="text-gray-600 text-sm mb-4">Comportamento, engajamento e segmentação</p>
      <button 
					onclick={() => handleGenerateReport('usuarios')}
					class="btn btn-primary w-full"
      >
        Ver Análise
      </button>
			</div>
    </div>
    
		<div 
			class="card group hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
			in:fly={{ y: 20, duration: 600, delay: 1000 }}
		>
			<div class="card-body">
				<div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      </div>
      <h4 class="text-lg font-semibold text-gray-900 mb-2">Performance de Produtos</h4>
      <p class="text-gray-600 text-sm mb-4">Ranking de vendas e análise de estoque</p>
      <button 
					onclick={() => handleGenerateReport('produtos')}
					class="btn btn-primary w-full"
      >
        Ver Performance
      </button>
			</div>
		</div>
	</div>
	
	<!-- Quick Actions -->
	<div class="card" in:fly={{ y: 20, duration: 600, delay: 1100 }}>
		<div class="card-header">
			<h2 class="text-lg font-semibold text-gray-900">Ações Rápidas</h2>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
					<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</div>
					<p class="text-sm font-medium text-gray-700">Dashboard</p>
				</button>
				<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
					<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">📈</div>
					<p class="text-sm font-medium text-gray-700">Métricas</p>
				</button>
				<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
					<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">💾</div>
					<p class="text-sm font-medium text-gray-700">Exportar</p>
				</button>
				<button class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
					<div class="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
					<p class="text-sm font-medium text-gray-700">Configurar</p>
				</button>
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