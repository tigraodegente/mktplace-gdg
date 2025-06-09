<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import { api } from '$lib/services/api';
	import { toast } from '$lib/stores/toast';
	import { DataTable, Input, Select, Button } from '$lib/components/ui';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { useDebounce } from '$lib/hooks/useDebounce';
	
	// Estados
	let configs = $state<any[]>([]);
	let loading = $state(true);
	let search = $state('');
	let statusFilter = $state('all');
	let sellerFilter = $state('all');
	let carrierFilter = $state('all');
	let selectedIds = $state<string[]>([]);
	
	// Estados do dialog de confirmação
	let showConfirmDialog = $state(false);
	let confirmDialogConfig = $state({
		title: '',
		message: '',
		variant: 'danger' as 'danger' | 'warning' | 'info',
		onConfirm: () => {}
	});
	
	// Paginação
	let page = $state(1);
	let pageSize = $state(20);
	let totalItems = $state(0);
	
	// Ordenação
	let sortBy = $state('created_at');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	
	// Estatísticas
	let stats = $state({
		totalConfigs: 0,
		activeConfigs: 0,
		inactiveConfigs: 0,
		withoutCoverage: 0
	});
	
	// Estados para acordeões
	let statsAccordionOpen = $state(true);
	let filtersAccordionOpen = $state(true);
	
	// Opções de filtros
	const statusOptions = [
		{ value: 'all', label: 'Todos os Status' },
		{ value: 'active', label: 'Ativos' },
		{ value: 'inactive', label: 'Inativos' }
	];
	
	// Estados para filtros
	let sellers = $state<Array<{id: string, name: string, email: string}>>([]);
	let carriers = $state<Array<{id: string, name: string}>>([]);
	
	// Estados de inicialização
	let hasLoadedInitialData = $state(false);
	let isFiltering = $state(false);
	
	// Verificar autenticação
	function checkAuthAndLoad() {
		if (typeof window === 'undefined') return;
		
		const token = localStorage.getItem('access_token');
		const userStr = localStorage.getItem('user');
		
		if (token && userStr) {
			if (!hasLoadedInitialData) {
				hasLoadedInitialData = true;
				loadConfigs();
				loadStats();
				loadFilters();
			}
		} else {
			goto('/login');
		}
	}
	
	// Colunas da tabela
	const columns = [
		{
			key: 'seller_name',
			label: 'Seller',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<div class="font-medium text-gray-900">${row.seller_name || 'Configuração Global'}</div>
					<div class="text-sm text-gray-500">${row.seller_email || 'Todas as lojas'}</div>
				</div>
			`
		},
		{
			key: 'carrier_name',
			label: 'Transportadora',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<div class="font-medium text-gray-900">${row.carrier_name}</div>
					<div class="text-sm text-gray-500">${row.carrier_type || 'N/A'}</div>
				</div>
			`
		},
		{
			key: 'markup_percentage',
			label: 'Markup (%)',
			sortable: true,
			align: 'right' as const,
			render: (value: number) => `
				<span class="font-medium">${value?.toFixed(1) || '0.0'}%</span>
			`
		},
		{
			key: 'free_shipping_threshold',
			label: 'Frete Grátis (R$)',
			sortable: true,
			align: 'right' as const,
			render: (value: number) => `
				<span class="font-medium">R$ ${value?.toFixed(2) || '0.00'}</span>
			`
		},
		{
			key: 'priority',
			label: 'Prioridade',
			sortable: true,
			align: 'center' as const,
			render: (value: number) => `
				<span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
					${value || 1}
				</span>
			`
		},
		{
			key: 'available_rates',
			label: 'Tarifas',
			sortable: false,
			align: 'center' as const,
			render: (value: number) => `
				<span class="px-2 py-1 text-xs font-medium rounded-full ${
					(value || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
				}">
					${value || 0} tarifas
				</span>
			`
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: boolean) => {
				const status = value ? 'Ativo' : 'Inativo';
				const bgClass = value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
				return `<span class="px-2 py-1 text-xs font-medium rounded-full ${bgClass}">${status}</span>`;
			}
		},
		{
			key: 'created_at',
			label: 'Criado em',
			sortable: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		}
	];
	
	// Buscar estatísticas
	async function loadStats() {
		try {
			const response = await api.get<any>('/shipping/seller-configs/stats');
			
			if (response.success && response.data) {
				stats = {
					totalConfigs: response.data.totalConfigs || 0,
					activeConfigs: response.data.activeConfigs || 0,
					inactiveConfigs: response.data.inactiveConfigs || 0,
					withoutCoverage: response.data.coverage?.withoutConfig || 0
				};
				
				console.log('📊 Estatísticas de frete carregadas:', stats);
			}
		} catch (error) {
			console.error('Erro ao carregar estatísticas:', error);
			stats = {
				totalConfigs: 0,
				activeConfigs: 0,
				inactiveConfigs: 0,
				withoutCoverage: 0
			};
		}
	}
	
	// Buscar configurações
	async function loadConfigs() {
		loading = true;
		isFiltering = true;
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: pageSize.toString(),
				search,
				sortBy,
				sortOrder
			});
			
			// Adicionar filtros se selecionados
			if (statusFilter && statusFilter !== 'all') {
				params.append('status', statusFilter);
			}
			
			if (sellerFilter && sellerFilter !== 'all') {
				params.append('sellerId', sellerFilter);
			}
			
			if (carrierFilter && carrierFilter !== 'all') {
				params.append('carrierId', carrierFilter);
			}
			
			console.log('🔍 [FILTROS] Parâmetros enviados:', params.toString());
			
			const response = await api.get<any>(`/shipping/seller-configs?${params}`);
			
			if (response.success) {
				configs = response.data.configs || [];
				totalItems = response.data.pagination?.total || 0;
				
				console.log('✅ [RESULTADO] Configurações carregadas:', {
					configurações: configs.length,
					totalItens: totalItems,
					paginaAtual: page
				});
			}
		} catch (error) {
			console.error('❌ [ERRO] Erro ao carregar configurações:', error);
		} finally {
			loading = false;
			isFiltering = false;
		}
	}
	
	// Buscar filtros (sellers e transportadoras) - já vem da API principal
	async function loadFilters() {
		try {
			// Os filtros já vêm da API principal, mas se necessário buscar separadamente:
			const response = await api.get('/shipping/seller-configs?page=1&limit=1');
			if (response.success && response.data?.filters) {
				sellers = response.data.filters.sellers || [];
				carriers = response.data.filters.carriers || [];
				console.log('✅ Filtros carregados:', { sellers: sellers.length, carriers: carriers.length });
			}
		} catch (error) {
			console.error('Erro ao carregar filtros:', error);
		}
	}
	
	// Debounce da busca
	const debouncedSearch = useDebounce(() => {
		console.log('🔍 [DEBOUNCE] Search executing:', { search });
		page = 1;
		loadConfigs();
	}, 500);
	
	// Debounce para filtros
	const debouncedFilters = useDebounce(() => {
		console.log('🔍 [DEBOUNCE] Filters executing');
		page = 1;
		loadConfigs();
	}, 300);
	
	// Aplicar filtros
	function applyFilters() {
		if (hasLoadedInitialData && !isFiltering) {
			debouncedFilters();
		}
	}
	
	// Aplicar busca
	function applySearch() {
		if (hasLoadedInitialData && !isFiltering) {
			debouncedSearch();
		}
	}
	
	// Handle filter changes
	function handleFilterChange() {
		if (hasLoadedInitialData) {
			applyFilters();
		}
	}
	
	// Handle search change
	function handleSearchChange() {
		if (hasLoadedInitialData) {
			applySearch();
		}
	}
	
	// Limpar filtros
	function clearAllFilters() {
		search = '';
		statusFilter = 'all';
		sellerFilter = 'all';
		carrierFilter = 'all';
		page = 1;
		loadConfigs();
	}
	
	// Verificar filtros ativos
	function hasActiveFilters() {
		return search !== '' || 
			   statusFilter !== 'all' || 
			   sellerFilter !== 'all' || 
			   carrierFilter !== 'all';
	}
	
	// Handle ordenação
	function handleSort(column: string) {
		if (sortBy === column) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortOrder = 'asc';
		}
		page = 1;
		loadConfigs();
	}
	
	// Handle mudança de página
	function handlePageChange(newPage: number) {
		console.log('📄 [PAGINATION] Changing from page', page, 'to page', newPage);
		page = newPage;
		loadConfigs();
	}
	
	// Ações da tabela
	function getTableActions(row: any) {
		return [
			{
				label: 'Editar',
				icon: 'Edit',
				onclick: () => goto(`/configuracoes-frete/${row.id}`)
			},
			{
				label: 'Excluir',
				icon: 'delete',
				onclick: () => deleteConfig(row)
			}
		];
	}
	
	// Excluir configuração
	async function deleteConfig(config: any) {
		confirmDialogConfig = {
			title: 'Excluir Configuração',
			message: `Tem certeza que deseja excluir a configuração de frete? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					await api.delete(`/shipping/seller-configs/${config.id}`, {
						showSuccess: true,
						successMessage: 'Configuração excluída com sucesso!'
					});
					
					loadConfigs();
					loadStats();
				} catch (error) {
					console.error('Erro ao excluir configuração:', error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Toggle acordeões
	function toggleStatsAccordion() {
		statsAccordionOpen = !statsAccordionOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('admin-shipping-stats-accordion', JSON.stringify(statsAccordionOpen));
		}
	}
	
	function toggleFiltersAccordion() {
		filtersAccordionOpen = !filtersAccordionOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('admin-shipping-filters-accordion', JSON.stringify(filtersAccordionOpen));
		}
	}
	
	// Carregar estados dos acordeões
	$effect(() => {
		if (typeof window !== 'undefined') {
			const statsState = localStorage.getItem('admin-shipping-stats-accordion');
			const filtersState = localStorage.getItem('admin-shipping-filters-accordion');
			
			if (statsState !== null) {
				statsAccordionOpen = JSON.parse(statsState);
			}
			if (filtersState !== null) {
				filtersAccordionOpen = JSON.parse(filtersState);
			}
		}
	});
	
	// Lifecycle
	onMount(async () => {
		checkAuthAndLoad();
	});
</script>

<!-- Dialog de Confirmação -->
<ConfirmDialog
	show={showConfirmDialog}
	title={confirmDialogConfig.title}
	message={confirmDialogConfig.message}
	variant={confirmDialogConfig.variant}
	confirmText="Excluir"
	cancelText="Cancelar"
	onConfirm={confirmDialogConfig.onConfirm}
	onCancel={() => showConfirmDialog = false}
/>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">Configurações de Frete</h1>
				<Button icon="Plus" onclick={() => goto('/configuracoes-frete/nova')}>
					Nova Configuração
				</Button>
			</div>
		</div>
	</div>
	
	<!-- Content -->
	<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
		<!-- Acordeão de Estatísticas -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
			<!-- Header do Acordeão de Stats -->
			<button
				type="button"
				onclick={toggleStatsAccordion}
				class="w-full flex items-center justify-between text-left py-4 px-6 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-inset"
				aria-expanded={statsAccordionOpen}
			>
				<div class="flex items-center gap-3">
					<div class="p-2 bg-[#00BFB3]/10 rounded-lg">
						<ModernIcon name="bar-chart" size={20} color="#00BFB3" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Estatísticas de configurações de frete</h3>
				</div>
				
				<svg 
					class="w-5 h-5 text-gray-400 transition-transform duration-200 {statsAccordionOpen ? 'rotate-180' : ''}"
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			
			<!-- Conteúdo das Estatísticas -->
			{#if statsAccordionOpen}
				<div 
					class="border-t border-gray-200"
					transition:slide={{ duration: 300 }}
				>
					<div class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
							<!-- Total de configurações de frete -->
							<div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Total de configurações de frete</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.totalConfigs}</p>
									</div>
									<div class="p-3 bg-[#00BFB3]/10 rounded-lg">
										<ModernIcon name="truck" size={20} color="#00BFB3" />
									</div>
								</div>
							</div>
							
							<!-- configurações de frete Ativos -->
							<div class="bg-green-50 rounded-lg p-4 border border-green-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">configurações de frete Ativos</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.activeConfigs}</p>
									</div>
									<div class="p-3 bg-green-100 rounded-lg">
										<ModernIcon name="check" size={20} color="#16A34A" />
									</div>
								</div>
							</div>
							
							<!-- configurações de frete Inativos -->
							<div class="bg-amber-50 rounded-lg p-4 border border-amber-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">configurações de frete Inativos</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.inactiveConfigs}</p>
									</div>
									<div class="p-3 bg-amber-100 rounded-lg">
										<ModernIcon name="AlertTriangle" size={20} color="#D97706" />
									</div>
								</div>
							</div>
							
							<!-- Sem Cobertura -->
							<div class="bg-red-50 rounded-lg p-4 border border-red-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Sem Cobertura</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.withoutCoverage}</p>
									</div>
									<div class="p-3 bg-red-100 rounded-lg">
										<ModernIcon name="AlertTriangle" size={20} color="#DC2626" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Acordeão de Filtros -->
		<div class="bg-white rounded-lg border border-gray-200 mb-6">
			<!-- Header do Acordeão de Filtros -->
			<button
				type="button"
				onclick={toggleFiltersAccordion}
				class="w-full flex items-center justify-between text-left py-4 px-6 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-inset"
				aria-expanded={filtersAccordionOpen}
			>
				<div class="flex items-center gap-3">
					<div class="p-2 bg-[#00BFB3]/10 rounded-lg">
						<ModernIcon name="search" size={20} color="#00BFB3" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Filtros de Busca</h3>
				</div>
				
				<svg 
					class="w-5 h-5 text-gray-400 transition-transform duration-200 {filtersAccordionOpen ? 'rotate-180' : ''}"
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			
			<!-- Conteúdo dos Filtros -->
			{#if filtersAccordionOpen}
				<div 
					class="border-t border-gray-200"
					transition:slide={{ duration: 300 }}
				>
					<div class="p-6">
						<!-- Busca e Ações -->
						<div class="flex flex-col md:flex-row gap-4 mb-6">
							<div class="flex-1">
								<Input
									type="search"
									placeholder="Buscar configurações..."
									bind:value={search}
									icon="🔍"
									oninput={() => {
										console.log('🔍 [INPUT] Search changed to:', search);
										handleSearchChange();
									}}
								/>
							</div>
							
							<!-- Botão para limpar filtros -->
							{#if hasActiveFilters()}
								<Button
									variant="ghost"
									onclick={clearAllFilters}
									disabled={isFiltering}
									class="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
								>
									<ModernIcon name="x" size={16} className="mr-2" />
									Limpar Filtros
								</Button>
							{/if}
						</div>
						
						<!-- Indicador de filtros ativos -->
						{#if hasActiveFilters() && !isFiltering}
							<div class="mb-4 p-3 bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg">
								<div class="flex items-center justify-between text-sm">
									<div class="flex items-center gap-2">
										<ModernIcon name="filter" size={16} color="#00BFB3" />
										<span class="text-gray-700">
											Filtros ativos aplicados - {totalItems} configuração(ões) encontrada(s)
										</span>
									</div>
									<button
										onclick={clearAllFilters}
										class="text-[#00BFB3] hover:text-[#00BFB3]/80 font-medium"
									>
										Limpar todos
									</button>
								</div>
							</div>
						{/if}
						
						<!-- Indicador de carregamento -->
						{#if isFiltering}
							<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<div class="flex items-center gap-2 text-sm text-blue-700">
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
									<span>Aplicando filtros...</span>
								</div>
							</div>
						{/if}
						
						<!-- Filtros -->
						<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
							<div class="relative">
								<Select
									bind:value={statusFilter}
									options={statusOptions}
									label="Status"
									disabled={isFiltering}
									onchange={() => {
										console.log('📋 [SELECT] Status filter changed to:', statusFilter);
										handleFilterChange();
									}}
								/>
								{#if statusFilter !== 'all'}
									<div class="absolute -top-1 -right-1 w-2 h-2 bg-[#00BFB3] rounded-full"></div>
								{/if}
							</div>
							
							<div class="relative">
								<Select
									bind:value={sellerFilter}
									options={[
										{ value: 'all', label: 'Todos os Sellers' },
										...sellers.map(s => ({ value: s.id, label: s.name }))
									]}
									label="Seller"
									disabled={isFiltering}
									onchange={() => {
										console.log('📋 [SELECT] Seller filter changed to:', sellerFilter);
										handleFilterChange();
									}}
								/>
								{#if sellerFilter !== 'all'}
									<div class="absolute -top-1 -right-1 w-2 h-2 bg-[#00BFB3] rounded-full"></div>
								{/if}
							</div>
							
							<div class="relative">
								<Select
									bind:value={carrierFilter}
									options={[
										{ value: 'all', label: 'Todas as Transportadoras' },
										...carriers.map(c => ({ value: c.id, label: c.name }))
									]}
									label="Transportadora"
									disabled={isFiltering}
									onchange={() => {
										console.log('📋 [SELECT] Carrier filter changed to:', carrierFilter);
										handleFilterChange();
									}}
								/>
								{#if carrierFilter !== 'all'}
									<div class="absolute -top-1 -right-1 w-2 h-2 bg-[#00BFB3] rounded-full"></div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Tabela -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<div class="p-4">
				<DataTable
					{columns}
					data={configs}
					{loading}
					selectable={true}
					bind:selectedIds
					{page}
					{pageSize}
					{totalItems}
					onPageChange={handlePageChange}
					showHeaderPagination={true}
					{sortBy}
					{sortOrder}
					onSort={handleSort}
					actions={getTableActions}
				/>
			</div>
		</div>
	</div>
</div> 