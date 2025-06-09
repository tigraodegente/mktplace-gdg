<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	// Estados
	let alerts = $state<any[]>([]);
	let summary = $state<any>({});
	let stats = $state<any[]>([]);
	let loading = $state(true);
	let selectedAlerts = $state<string[]>([]);
	let showResolved = $state(false);
	
	// Filtros
	let filters = $state({
		alert_type: '',
		active: true
	});
	
	// Configurações de alertas
	const alertTypeConfig = {
		out_of_stock: {
			label: 'Sem Estoque',
			icon: '🔴',
			color: 'red',
			priority: 'critical'
		},
		low_stock: {
			label: 'Estoque Baixo',
			icon: '🟡',
			color: 'yellow',
			priority: 'high'
		},
		overstock: {
			label: 'Excesso de Estoque',
			icon: '🔵',
			color: 'blue',
			priority: 'medium'
		}
	};
	
	// Carregar alertas
	async function loadAlerts() {
		loading = true;
		try {
			const params = new URLSearchParams();
			params.append('active', filters.active.toString());
			if (filters.alert_type) params.append('type', filters.alert_type);
			
			const response = await fetch(`/api/stock/alerts?${params}`);
			const result = await response.json();
			
			if (result.success) {
				alerts = result.data.alerts || [];
				summary = result.data.summary || {};
				stats = result.data.stats || [];
				console.log('✅ Alertas carregados:', alerts.length);
			} else {
				toast.error(result.error || 'Erro ao carregar alertas');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao carregar alertas');
		} finally {
			loading = false;
		}
	}
	
	// Resolver alertas selecionados
	async function resolveAlerts() {
		if (selectedAlerts.length === 0) {
			toast.error('Selecione pelo menos um alerta');
			return;
		}
		
		try {
			const response = await fetch('/api/stock/alerts', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					alert_ids: selectedAlerts,
					action: 'resolve'
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				await loadAlerts();
				selectedAlerts = [];
				toast.success(`${result.data.updated_count} alertas resolvidos`);
			} else {
				toast.error(result.error || 'Erro ao resolver alertas');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao resolver alertas');
		}
	}
	
	// Marcar como enviado
	async function markAsSent() {
		if (selectedAlerts.length === 0) {
			toast.error('Selecione pelo menos um alerta');
			return;
		}
		
		try {
			const response = await fetch('/api/stock/alerts', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					alert_ids: selectedAlerts,
					action: 'mark_sent'
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				await loadAlerts();
				selectedAlerts = [];
				toast.success(`${result.data.updated_count} alertas marcados como enviados`);
			} else {
				toast.error(result.error || 'Erro ao marcar alertas');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao marcar alertas');
		}
	}
	
	// Selecionar/deselecionar todos
	function toggleSelectAll() {
		if (selectedAlerts.length === alerts.length) {
			selectedAlerts = [];
		} else {
			selectedAlerts = alerts.map(alert => alert.id);
		}
	}
	
	// Formatar data
	function formatDate(dateString: string) {
		if (!dateString) return 'Nunca';
		return new Date(dateString).toLocaleString('pt-BR');
	}
	
	// Obter configuração do tipo de alerta
	function getAlertConfig(type: string) {
		return alertTypeConfig[type as keyof typeof alertTypeConfig] || { label: type, icon: '❓', color: 'gray', priority: 'low' };
	}
	
	// Formatar prioridade
	function getPriorityBadge(priority: string) {
		const configs = {
			critical: { label: 'Crítico', color: 'red' },
			high: { label: 'Alto', color: 'orange' },
			medium: { label: 'Médio', color: 'yellow' },
			low: { label: 'Baixo', color: 'gray' }
		};
		return configs[priority as keyof typeof configs] || configs.low;
	}
	
	// Aplicar filtros
	function applyFilters() {
		loadAlerts();
	}
	
	onMount(() => {
		loadAlerts();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-2xl font-bold text-gray-900">Alertas de Estoque</h3>
			<p class="text-gray-600">Monitoramento de produtos com estoque baixo ou em falta</p>
		</div>
		<div class="flex gap-3">
			<button
				type="button"
				onclick={markAsSent}
				disabled={selectedAlerts.length === 0}
				class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				<ModernIcon name="Mail" size="sm" />
				Marcar como Enviado
			</button>
			<button
				type="button"
				onclick={resolveAlerts}
				disabled={selectedAlerts.length === 0}
				class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				<ModernIcon name="Check" size="sm" />
				Resolver Alertas
			</button>
		</div>
	</div>
	
	<!-- Resumo -->
	<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="AlertTriangle" size="md" class="text-blue-600" />
				</div>
				<div>
					<p class="text-sm font-medium text-gray-600">Total de Alertas</p>
					<p class="text-2xl font-bold text-gray-900">{summary.total_alerts || 0}</p>
				</div>
			</div>
		</div>
		
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="AlertCircle" size="md" class="text-orange-600" />
				</div>
				<div>
					<p class="text-sm font-medium text-gray-600">Alertas Ativos</p>
					<p class="text-2xl font-bold text-gray-900">{summary.active_alerts || 0}</p>
				</div>
			</div>
		</div>
		
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="XCircle" size="md" class="text-red-600" />
				</div>
				<div>
					<p class="text-sm font-medium text-gray-600">Sem Estoque</p>
					<p class="text-2xl font-bold text-gray-900">{summary.out_of_stock || 0}</p>
				</div>
			</div>
		</div>
		
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="AlertTriangle" size="md" class="text-yellow-600" />
				</div>
				<div>
					<p class="text-sm font-medium text-gray-600">Estoque Baixo</p>
					<p class="text-2xl font-bold text-gray-900">{summary.low_stock || 0}</p>
				</div>
			</div>
		</div>
		
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center gap-3">
				<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="Clock" size="md" class="text-green-600" />
				</div>
				<div>
					<p class="text-sm font-medium text-gray-600">Hoje</p>
					<p class="text-2xl font-bold text-gray-900">{summary.alerts_today || 0}</p>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Filtros -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-medium text-gray-900 mb-4">Filtros</h4>
		<div class="flex items-center gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Alerta</label>
				<select bind:value={filters.alert_type} onchange={applyFilters} class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]">
					<option value="">Todos os tipos</option>
					<option value="out_of_stock">🔴 Sem Estoque</option>
					<option value="low_stock">🟡 Estoque Baixo</option>
					<option value="overstock">🔵 Excesso</option>
				</select>
			</div>
			
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
				<div class="flex items-center gap-4">
					<label class="flex items-center gap-2">
						<input type="radio" bind:group={filters.active} value={true} onchange={applyFilters} class="text-[#00BFB3] focus:ring-[#00BFB3]" />
						<span class="text-sm">Apenas Ativos</span>
					</label>
					<label class="flex items-center gap-2">
						<input type="radio" bind:group={filters.active} value={false} onchange={applyFilters} class="text-[#00BFB3] focus:ring-[#00BFB3]" />
						<span class="text-sm">Resolvidos</span>
					</label>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Lista de Alertas -->
	<div class="bg-white border border-gray-200 rounded-lg">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
				<span class="ml-2 text-gray-600">Carregando alertas...</span>
			</div>
		{:else if alerts.length === 0}
			<div class="text-center py-12">
				<ModernIcon name="CheckCircle" size="xl" class="mx-auto text-green-400 mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum alerta encontrado</h3>
				<p class="text-gray-600">
					{filters.active ? 'Todos os produtos estão com estoque adequado!' : 'Nenhum alerta resolvido encontrado.'}
				</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<!-- Header da tabela -->
				<div class="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
					<input
						type="checkbox"
						checked={selectedAlerts.length === alerts.length && alerts.length > 0}
						onchange={toggleSelectAll}
						class="rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<span class="text-sm font-medium text-gray-700">
						{selectedAlerts.length > 0 ? `${selectedAlerts.length} selecionados` : 'Selecionar todos'}
					</span>
				</div>
				
				<!-- Lista de alertas -->
				<div class="divide-y divide-gray-200">
					{#each alerts as alert}
						{@const config = getAlertConfig(alert.alert_type)}
						{@const priorityConfig = getPriorityBadge(alert.priority)}
						<div class="px-6 py-4 hover:bg-gray-50 transition-colors">
							<div class="flex items-start gap-4">
								<input
									type="checkbox"
									bind:group={selectedAlerts}
									value={alert.id}
									class="mt-1 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
								/>
								
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-3 mb-2">
										<span class="text-2xl">{config.icon}</span>
										<div class="flex-1">
											<h4 class="text-lg font-medium text-gray-900">
												{alert.product_name}
											</h4>
											<p class="text-sm text-gray-500">SKU: {alert.product_sku}</p>
										</div>
										
										<div class="flex items-center gap-2">
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-{config.color}-100 text-{config.color}-800">
												{config.label}
											</span>
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-{priorityConfig.color}-100 text-{priorityConfig.color}-800">
												{priorityConfig.label}
											</span>
										</div>
									</div>
									
									<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
										<div>
											<p class="text-gray-500">Estoque Atual:</p>
											<p class="font-medium text-gray-900">{alert.current_value}</p>
										</div>
										<div>
											<p class="text-gray-500">Limite Mínimo:</p>
											<p class="font-medium text-gray-900">{alert.threshold_value}</p>
										</div>
										<div>
											<p class="text-gray-500">Armazém:</p>
											<p class="font-medium text-gray-900">{alert.warehouse_name || 'Principal'}</p>
										</div>
										<div>
											<p class="text-gray-500">Criado em:</p>
											<p class="font-medium text-gray-900">{formatDate(alert.created_at)}</p>
										</div>
									</div>
									
									{#if alert.last_sent_at}
										<div class="mt-2 text-xs text-gray-500">
											Última notificação enviada: {formatDate(alert.last_sent_at)}
										</div>
									{/if}
									
									{#if alert.resolved_at}
										<div class="mt-2 text-xs text-green-600">
											Resolvido em: {formatDate(alert.resolved_at)}
										</div>
									{/if}
								</div>
								
								<div class="flex flex-col items-end gap-2">
									<div class="text-right text-sm">
										<p class="text-gray-500">Há {Math.floor(alert.days_since_created)} dias</p>
									</div>
									
									{#if alert.is_active}
										<div class="flex gap-2">
											<button
												type="button"
												onclick={() => selectedAlerts = [alert.id]}
												class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
												title="Ver Produto"
											>
												<ModernIcon name="Eye" size="sm" />
											</button>
											<button
												type="button"
												onclick={() => { selectedAlerts = [alert.id]; resolveAlerts(); }}
												class="p-2 text-green-600 hover:text-green-700 transition-colors"
												title="Resolver Alerta"
											>
												<ModernIcon name="Check" size="sm" />
											</button>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div> 