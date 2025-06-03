<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade, scale, slide } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	interface Integration {
		id: string;
		name: string;
		type: 'marketplace' | 'payment' | 'shipping' | 'erp' | 'analytics' | 'marketing' | 'other';
		icon: string;
		description: string;
		status: 'connected' | 'disconnected' | 'error' | 'configuring';
		features: string[];
		lastSync?: Date;
		stats?: {
			totalSynced?: number;
			successRate?: number;
		};
		isPremium?: boolean;
	}

	let integrations = $state<Integration[]>([]);
	let filteredIntegrations = $derived(applyFilters());
	let searchQuery = $state('');
	let selectedType = $state('all');
	let selectedStatus = $state('all');
	let viewMode = $state<'grid' | 'list'>('grid');

	// Estatísticas
	let stats = $derived({
		total: integrations.length,
		connected: integrations.filter(i => i.status === 'connected').length,
		errors: integrations.filter(i => i.status === 'error').length,
		totalSyncs: integrations.reduce((sum, i) => sum + (i.stats?.totalSynced || 0), 0),
		successRate: calculateAverageSuccessRate()
	});

	onMount(() => {
		loadIntegrations();
	});

	function loadIntegrations() {
		// Mock data
		integrations = [
			{
				id: '1',
				name: 'Mercado Livre',
				type: 'marketplace',
				icon: '🛍️',
				description: 'Integração completa com o Mercado Livre',
				status: 'connected',
				features: ['Produtos', 'Pedidos', 'Estoque', 'Q&A'],
				lastSync: new Date('2024-01-25T10:30:00'),
				stats: { totalSynced: 1523, successRate: 98.5 }
			},
			{
				id: '2',
				name: 'PagSeguro',
				type: 'payment',
				icon: '💳',
				description: 'Gateway de pagamento completo',
				status: 'connected',
				features: ['Cartão', 'Boleto', 'PIX', 'Split'],
				lastSync: new Date('2024-01-25T11:00:00'),
				stats: { totalSynced: 3842, successRate: 99.8 }
			},
			{
				id: '3',
				name: 'Correios',
				type: 'shipping',
				icon: '📦',
				description: 'Cálculo de frete e rastreamento',
				status: 'error',
				features: ['Frete', 'Rastreamento', 'Etiquetas'],
				lastSync: new Date('2024-01-24T15:30:00'),
				stats: { totalSynced: 892, successRate: 85.2 }
			},
			{
				id: '4',
				name: 'Tiny ERP',
				type: 'erp',
				icon: '📊',
				description: 'Sistema de gestão empresarial',
				status: 'connected',
				features: ['Estoque', 'NF-e', 'Financeiro'],
				lastSync: new Date('2024-01-25T08:00:00'),
				stats: { totalSynced: 5421, successRate: 99.2 },
				isPremium: true
			},
			{
				id: '5',
				name: 'Google Analytics',
				type: 'analytics',
				icon: '📈',
				description: 'Análise de tráfego e conversões',
				status: 'connected',
				features: ['Eventos', 'E-commerce', 'Funis'],
				lastSync: new Date('2024-01-25T11:30:00'),
				stats: { totalSynced: 15420, successRate: 100 }
			},
			{
				id: '6',
				name: 'Mailchimp',
				type: 'marketing',
				icon: '📧',
				description: 'E-mail marketing automatizado',
				status: 'disconnected',
				features: ['Listas', 'Campanhas', 'Templates']
			},
			{
				id: '7',
				name: 'WhatsApp Business',
				type: 'other',
				icon: '💬',
				description: 'Atendimento via WhatsApp',
				status: 'configuring',
				features: ['Mensagens', 'Catálogo', '24/7'],
				isPremium: true
			},
			{
				id: '8',
				name: 'Instagram Shopping',
				type: 'marketplace',
				icon: '📸',
				description: 'Venda pelo Instagram',
				status: 'disconnected',
				features: ['Catálogo', 'Tags', 'Checkout'],
				isPremium: true
			}
		];
	}

	function applyFilters() {
		let result = [...integrations];

		if (searchQuery) {
			result = result.filter(i => 
				i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				i.description.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		if (selectedType !== 'all') {
			result = result.filter(i => i.type === selectedType);
		}

		if (selectedStatus !== 'all') {
			result = result.filter(i => i.status === selectedStatus);
		}

		return result;
	}

	function calculateAverageSuccessRate() {
		const withStats = integrations.filter(i => i.stats?.successRate !== undefined);
		if (withStats.length === 0) return 0;
		
		const total = withStats.reduce((sum, i) => sum + (i.stats?.successRate || 0), 0);
		return Math.round(total / withStats.length * 10) / 10;
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function getStatusColor(status: Integration['status']) {
		const colors = {
			connected: 'bg-green-100 text-green-800 border-green-200',
			disconnected: 'bg-gray-100 text-gray-800 border-gray-200',
			error: 'bg-red-100 text-red-800 border-red-200',
			configuring: 'bg-yellow-100 text-yellow-800 border-yellow-200'
		};
		return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
	}

	function getStatusLabel(status: Integration['status']) {
		const labels = {
			connected: 'Conectado',
			disconnected: 'Desconectado',
			error: 'Erro',
			configuring: 'Configurando'
		};
		return labels[status] || status;
	}

	function getTypeColor(type: Integration['type']) {
		const colors = {
			marketplace: 'from-purple-400 to-pink-600',
			payment: 'from-green-400 to-emerald-600',
			shipping: 'from-blue-400 to-cyan-600',
			erp: 'from-orange-400 to-red-600',
			analytics: 'from-indigo-400 to-purple-600',
			marketing: 'from-pink-400 to-rose-600',
			other: 'from-gray-400 to-gray-600'
		};
		return colors[type] || 'from-gray-400 to-gray-600';
	}

	function getTypeLabel(type: Integration['type']) {
		const labels = {
			marketplace: 'Marketplace',
			payment: 'Pagamento',
			shipping: 'Envio',
			erp: 'ERP',
			analytics: 'Analytics',
			marketing: 'Marketing',
			other: 'Outros'
		};
		return labels[type] || type;
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
	<!-- Header -->
	<div class="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<div in:fly={{ x: -20, duration: 500, easing: quintOut }}>
					<h1 class="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
						Integrações
					</h1>
					<p class="text-gray-600 mt-1">Conecte sua loja com serviços externos</p>
				</div>
				
				<div class="flex items-center gap-3" in:fly={{ x: 20, duration: 500, delay: 100, easing: quintOut }}>
					<button
						class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Nova Integração
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
			{#each [
				{ label: 'Total de Integrações', value: stats.total, icon: '🔗', color: 'from-blue-400 to-blue-600', delay: 0 },
				{ label: 'Conectadas', value: stats.connected, icon: '✅', color: 'from-green-400 to-emerald-600', delay: 50 },
				{ label: 'Com Erros', value: stats.errors, icon: '⚠️', color: 'from-red-400 to-rose-600', delay: 100 },
				{ label: 'Total de Sincronizações', value: stats.totalSyncs.toLocaleString('pt-BR'), icon: '🔄', color: 'from-purple-400 to-pink-600', delay: 150 },
				{ label: 'Taxa de Sucesso', value: `${stats.successRate}%`, icon: '📊', color: 'from-cyan-400 to-blue-600', delay: 200 }
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
							placeholder="Buscar integrações..."
							class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
						>
						<svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>

				<!-- Filters -->
				<div class="flex items-center gap-3" in:fly={{ x: 20, duration: 500, delay: 100, easing: quintOut }}>
					<select
						bind:value={selectedType}
						class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
					>
						<option value="all">Todos os tipos</option>
						<option value="marketplace">Marketplace</option>
						<option value="payment">Pagamento</option>
						<option value="shipping">Envio</option>
						<option value="erp">ERP</option>
						<option value="analytics">Analytics</option>
						<option value="marketing">Marketing</option>
						<option value="other">Outros</option>
					</select>

					<select
						bind:value={selectedStatus}
						class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
					>
						<option value="all">Todos os status</option>
						<option value="connected">Conectado</option>
						<option value="disconnected">Desconectado</option>
						<option value="error">Com erro</option>
						<option value="configuring">Configurando</option>
					</select>

					<div class="flex items-center border border-gray-300 rounded-lg">
						<button
							onclick={() => viewMode = 'grid'}
							class="p-2 {viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
							</svg>
						</button>
						<button
							onclick={() => viewMode = 'list'}
							class="p-2 {viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Integrations Grid/List -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
		{#if viewMode === 'grid'}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each filteredIntegrations as integration, i}
					<div
						in:scale={{ duration: 300, delay: i * 50, easing: backOut }}
						class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
					>
						<div class="p-6">
							<!-- Header -->
							<div class="flex items-start justify-between mb-4">
								<div class="flex items-center gap-3">
									<div class="text-4xl bg-gradient-to-br {getTypeColor(integration.type)} p-3 rounded-lg text-white flex items-center justify-center">
										{integration.icon}
									</div>
									<div>
										<h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
											{integration.name}
											{#if integration.isPremium}
												<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
													Premium
												</span>
											{/if}
										</h3>
										<p class="text-sm text-gray-500">{getTypeLabel(integration.type)}</p>
									</div>
								</div>
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(integration.status)}">
									{getStatusLabel(integration.status)}
								</span>
							</div>

							<!-- Description -->
							<p class="text-gray-600 text-sm mb-4">{integration.description}</p>

							<!-- Features -->
							<div class="mb-4">
								<p class="text-xs font-medium text-gray-500 mb-2">Recursos:</p>
								<div class="flex flex-wrap gap-1">
									{#each integration.features as feature}
										<span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
											{feature}
										</span>
									{/each}
								</div>
							</div>

							<!-- Stats -->
							{#if integration.stats}
								<div class="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
									<div>
										<p class="text-xs text-gray-500">Sincronizações</p>
										<p class="text-sm font-semibold text-gray-900">{integration.stats.totalSynced?.toLocaleString('pt-BR')}</p>
									</div>
									<div>
										<p class="text-xs text-gray-500">Taxa de Sucesso</p>
										<p class="text-sm font-semibold text-gray-900">{integration.stats.successRate}%</p>
									</div>
								</div>
							{/if}

							<!-- Last Sync -->
							{#if integration.lastSync}
								<div class="flex items-center justify-between text-xs text-gray-500 mb-4">
									<span>Última sincronização:</span>
									<span>{formatDate(integration.lastSync)}</span>
								</div>
							{/if}

							<!-- Actions -->
							<div class="flex items-center gap-2">
								{#if integration.status === 'connected' || integration.status === 'error'}
									<button
										class="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
									>
										Configurar
									</button>
									<button
										class="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
									>
										Desconectar
									</button>
								{:else if integration.status === 'disconnected'}
									<button
										class="w-full px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all text-sm"
									>
										Conectar
									</button>
								{:else if integration.status === 'configuring'}
									<button
										disabled
										class="w-full px-3 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed text-sm flex items-center justify-center gap-2"
									>
										<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Configurando...
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- List View -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Integração
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Tipo
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Sincronizações
								</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Última Sync
								</th>
								<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Ações
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredIntegrations as integration, i}
								<tr
									in:fly={{ x: -20, duration: 300, delay: i * 50 }}
									class="hover:bg-gray-50 transition-colors"
								>
									<td class="px-6 py-4">
										<div class="flex items-center">
											<div class="text-2xl mr-3">{integration.icon}</div>
											<div>
												<div class="text-sm font-medium text-gray-900 flex items-center gap-2">
													{integration.name}
													{#if integration.isPremium}
														<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
															Premium
														</span>
													{/if}
												</div>
												<div class="text-xs text-gray-500">{integration.description}</div>
											</div>
										</div>
									</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
											{getTypeLabel(integration.type)}
										</span>
									</td>
									<td class="px-6 py-4">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(integration.status)}">
											{getStatusLabel(integration.status)}
										</span>
									</td>
									<td class="px-6 py-4 text-sm text-gray-900">
										{integration.stats?.totalSynced?.toLocaleString('pt-BR') || '-'}
									</td>
									<td class="px-6 py-4 text-sm text-gray-500">
										{integration.lastSync ? formatDate(integration.lastSync) : '-'}
									</td>
									<td class="px-6 py-4 text-right">
										<div class="flex items-center justify-end gap-2">
											<button
												class="text-cyan-600 hover:text-cyan-900 transition-colors"
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
												</svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div> 