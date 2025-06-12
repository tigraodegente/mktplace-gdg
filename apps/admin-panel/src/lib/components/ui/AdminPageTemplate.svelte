<script lang="ts">
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { DataTable, Button } from '$lib/components/ui';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import StatsAccordion from '$lib/components/ui/StatsAccordion.svelte';
	import FiltersAccordion from '$lib/components/ui/FiltersAccordion.svelte';
	import { api } from '$lib/services/api';
	import { toast } from '$lib/stores/toast';
	import { useDebounce } from '$lib/hooks/useDebounce';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	// Props genéricas para qualquer página administrativa
	interface Props {
		// Configuração da página
		title: string;
		newItemRoute: string;
		editItemRoute: (id: string) => string;
		
		// API endpoints
		apiEndpoint: string;
		deleteEndpoint?: string;
		statsEndpoint?: string;
		categoriesEndpoint?: string;
		brandsEndpoint?: string;
		
		// Configurações da tabela
		columns: any[];
		entityName: string; // 'produto', 'pedido', 'usuário'
		entityNamePlural: string; // 'produtos', 'pedidos', 'usuários'
		
		// Configurações de estatísticas (opcional)
		statsConfig?: {
			total: string;
			active: string; 
			pending: string;
			lowStock: string;
		};
		
		// Filtros personalizados (opcional)
		customFilters?: any[];
		
		// Ações customizadas (opcional)
		customActions?: (row: any) => any[];
		
		// Callbacks customizados
		onDataLoad?: (data: any[]) => any[];
		onStatsLoad?: (stats: any) => any;
		onDelete?: (item: any) => Promise<void>;
		onBulkDelete?: (ids: string[]) => Promise<void>;
		
		// Configurações de busca
		searchPlaceholder?: string;
		searchFields?: string[];
	}
	
	let {
		title,
		newItemRoute,
		editItemRoute,
		apiEndpoint,
		deleteEndpoint,
		statsEndpoint,
		categoriesEndpoint,
		brandsEndpoint,
		columns,
		entityName,
		entityNamePlural,
		statsConfig,
		customFilters = [],
		customActions,
		onDataLoad,
		onStatsLoad,
		onDelete,
		onBulkDelete,
		searchPlaceholder = `Buscar ${entityNamePlural}...`,
		searchFields = ['name']
	}: Props = $props();
	
	// Estados padrão - sempre os mesmos para qualquer página
	let data = $state<any[]>([]);
	let loading = $state(true);
	let search = $state('');
	let statusFilter = $state('all');
	let categoryFilter = $state('all');
	let brandFilter = $state('all');
	let selectedIds = $state<string[]>([]);
	let priceRange = $state({ min: '', max: '' });
	let customFilterValues = $state<Record<string, any>>({});
	
	// Paginação padrão
	let page = $state(1);
	let pageSize = $state(20);
	let totalItems = $state(0);
	
	// Ordenação padrão
	let sortBy = $state('created_at');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	
	// Estatísticas padrão
	let stats = $state({
		total: 0,
		active: 0,
		pending: 0,
		lowStock: 0
	});
	
	// Dialog de confirmação padrão
	let showConfirmDialog = $state(false);
	let confirmDialogConfig = $state({
		title: '',
		message: '',
		variant: 'danger' as 'danger' | 'warning' | 'info',
		onConfirm: () => {}
	});
	
	// Dados para filtros
	let categories = $state<any[]>([]);
	let brands = $state<any[]>([]);
	
	// Verificar se deve mostrar filtros específicos de produtos
	const shouldShowProductFilters = !!categoriesEndpoint || !!brandsEndpoint;
	
	// Verificar quais filtros são necessários
	const hasCategories = !!categoriesEndpoint;
	const hasBrands = !!brandsEndpoint;
	const hasStats = !!statsEndpoint && !!statsConfig;
	
	// Cache para evitar requests duplicados
	let lastLoadParams: string | null = null;
	let isLoadingData = $state(false);
	let isLoadingStats = $state(false);
	
	// Função para obter opções de status baseadas no tipo de página
	function getStatusOptionsForPage() {
		// Produtos têm mais opções de status
		if (categoriesEndpoint || brandsEndpoint) {
			return [
				{ value: 'all', label: 'Todos os Status' },
				{ value: 'active', label: 'Ativos' },
				{ value: 'inactive', label: 'Inativos' },
				{ value: 'draft', label: 'Rascunho' },
				{ value: 'low_stock', label: 'Estoque Baixo' },
				{ value: 'out_of_stock', label: 'Sem Estoque' }
			];
		}
		
		// Outras páginas têm opções simples
		return [
			{ value: 'all', label: 'Todos os Status' },
			{ value: 'active', label: 'Ativos' },
			{ value: 'inactive', label: 'Inativos' }
		];
	}
	
	// Labels dinâmicos para estatísticas
	function getStatsLabels() {
		if (!statsConfig) return {};
		
		// Para produtos
		if (categoriesEndpoint || brandsEndpoint) {
			return {
				total: 'Produtos',
				active: 'Ativos', 
				pending: 'Inativos',
				lowStock: 'Estoque Baixo'
			};
		}
		
		// Para frete
		if (apiEndpoint.includes('shipping')) {
			return {
				total: 'Modalidades',
				active: 'Ativas',
				pending: 'Inativas', 
				lowStock: 'Sem Cobertura'
			};
		}
		
		// Para outros
		return {
			total: entityNamePlural,
			active: 'Ativos',
			pending: 'Inativos',
			lowStock: 'Outros'
		};
	}
	
	// Função genérica para carregar dados com cache
	async function loadData() {
		// Evitar carregamentos duplicados
		const currentParams = JSON.stringify({ page, pageSize, search, statusFilter, categoryFilter, brandFilter, priceRange, customFilterValues });
		
		if (isLoadingData || lastLoadParams === currentParams) {
			return;
		}
		
		isLoadingData = true;
		loading = true;
		
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: pageSize.toString(),
				search: search.trim(),
				status: statusFilter,
				sortBy,
				sortOrder
			});
			
			// Categorias (suporte a múltiplas)
			if (categoryFilter && categoryFilter !== 'all') {
				if (Array.isArray(categoryFilter)) {
					params.append('categories', categoryFilter.join(','));
				} else {
					params.append('categories', categoryFilter);
				}
			}
			
			// Marca
			if (brandFilter && brandFilter !== 'all') {
				params.append('brand', brandFilter);
			}
			
			// Preços
			if (priceRange.min) params.append('priceMin', priceRange.min);
			if (priceRange.max) params.append('priceMax', priceRange.max);
			
			// Filtros customizados específicos da página
			if (customFilters && customFilters.length > 0) {
				customFilters.forEach(filter => {
					const value = customFilterValues[filter.key];
					if (value && value !== '' && value !== 'all') {
						params.append(filter.key, value);
					}
				});
			}
			
			const token = localStorage.getItem('access_token');
			
			// Headers para autenticação
			const headers = {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			};
			
			// Usar AbortController para cancelar requests anteriores
			const controller = new AbortController();
			
			// Usar fetch diretamente para evitar duplicação de /api/
			const response = await fetch(`${apiEndpoint}?${params}`, { 
				headers,
				signal: controller.signal
			});
			
			const result = await response.json();
			
			if (result.success) {
				let rawData = result.data || [];
				
				// Permitir transformação customizada dos dados
				if (onDataLoad) {
					rawData = onDataLoad(rawData);
				}
				
				data = rawData;
				totalItems = result.meta?.total || 0;
				lastLoadParams = currentParams; // Cache do último request
			} else {
				console.error('❌ [AdminPageTemplate] Erro na resposta:', result);
				
				// Se erro de autenticação, redirecionar para login
				if (result.error?.code === 'UNAUTHENTICATED') {
					console.log('🔒 [AdminPageTemplate] Erro de autenticação, redirecionando para login');
					goto('/login');
					return;
				}
				
				const errorMessage = result.error?.message || result.error || `Erro ao carregar ${entityNamePlural}`;
				console.error('❌ [AdminPageTemplate] Mensagem de erro:', errorMessage);
			}
		} catch (error: any) {
			// Ignorar erros de abort
			if (error.name === 'AbortError') {
				console.log('🚫 Request cancelado');
				return;
			}
			
			console.error(`❌ [AdminPageTemplate] Erro ao carregar ${entityNamePlural}:`, error);
			
			// Se erro de rede/autenticação, tentar redirecionar
			if (error.message?.includes('Failed to fetch') || error.message?.includes('401')) {
				console.log('🔒 [AdminPageTemplate] Problema de autenticação detectado, redirecionando...');
				goto('/login');
				return;
			}
		} finally {
			loading = false;
			isLoadingData = false;
		}
	}
	
	// Função genérica para carregar estatísticas com cache
	async function loadStats() {
		if (!statsEndpoint || !statsConfig || isLoadingStats) return;
		
		isLoadingStats = true;
		
		try {
			// Usar fetch diretamente para evitar duplicação de /api/
			const response = await fetch(statsEndpoint, {
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
					'Content-Type': 'application/json'
				}
			});
			
			const result = await response.json();
			
			if (result.success) {
				let rawStats = result.data || {};
				
				// Permitir transformação customizada das estatísticas
				if (onStatsLoad) {
					rawStats = onStatsLoad(rawStats);
				}
				
				stats = {
					total: rawStats[statsConfig.total] || 0,
					active: rawStats[statsConfig.active] || 0,
					pending: rawStats[statsConfig.pending] || 0,
					lowStock: rawStats[statsConfig.lowStock] || 0
				};
			}
		} catch (error) {
			console.error('Erro ao carregar estatísticas:', error);
		} finally {
			isLoadingStats = false;
		}
	}
	
	// Função genérica para carregar filtros
	async function loadFilters() {
		try {
			// Carregar categorias se endpoint fornecido
			if (categoriesEndpoint) {
				const catResponse = await fetch(categoriesEndpoint, {
					headers: {
						'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
						'Content-Type': 'application/json'
					}
				});
				const catResult = await catResponse.json();
				if (catResult.success) {
					const loadedCategories = catResult.data?.categories || catResult.data || [];
					categories = loadedCategories;
				}
			}
			
			// Carregar marcas se endpoint fornecido
			if (brandsEndpoint) {
				const brandResponse = await fetch(brandsEndpoint, {
					headers: {
						'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
						'Content-Type': 'application/json'
					}
				});
				const brandResult = await brandResponse.json();
				if (brandResult.success) {
					brands = brandResult.data?.brands || brandResult.data || [];
				}
			}
		} catch (error) {
			console.error('Erro ao carregar filtros:', error);
		}
	}
	
	// Debounce para busca
	const debouncedSearch = useDebounce(() => {
		page = 1;
		loadData();
	}, 500);
	
	// Funções para controlar filtros sem $effect (evita loops infinitos)
	function handleSearchChange() {
		debouncedSearch();
	}
	
	function handleFiltersChange() {
			page = 1;
			loadData();
		}
	
	function handlePageChange(newPage: number) {
		page = newPage;
		loadData();
	}
	
	// Função genérica para ordenação
	function handleSort(column: string) {
		if (sortBy === column) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortOrder = 'asc';
		}
		page = 1;
		loadData();
	}
	
	// Ações padrão da tabela
	function getTableActions(row: any) {
		// Se há ações customizadas, usar apenas elas
		if (customActions) {
			return customActions(row);
		}
		
		// Caso contrário, usar ações padrão
		const defaultActions = [
			{
				label: 'Editar',
				icon: 'Edit',
				onclick: () => goto(editItemRoute(row.id))
			},
			{
				label: 'Excluir',
				icon: 'Delete',
				onclick: () => deleteItem(row)
			}
		];
		
		return defaultActions;
	}
	
	// Função genérica para excluir item
	async function deleteItem(item: any) {
		confirmDialogConfig = {
			title: `Excluir ${entityName}`,
			message: `Tem certeza que deseja excluir ${entityName} "${item.name || item.title || item.id}"? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					if (onDelete) {
						await onDelete(item);
					} else {
						const endpoint = deleteEndpoint || `${apiEndpoint}/${item.id}`;
						await api.delete(endpoint, {
							showSuccess: true,
							successMessage: `${entityName} excluído com sucesso!`
						});
					}
					loadData();
				} catch (error) {
					console.error(`Erro ao excluir ${entityName}:`, error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Função genérica para excluir selecionados
	async function deleteSelected() {
		if (selectedIds.length === 0) return;
		
		confirmDialogConfig = {
			title: `Excluir ${entityNamePlural}`,
			message: `Tem certeza que deseja excluir ${selectedIds.length} ${entityName}(s)? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					if (onBulkDelete) {
						await onBulkDelete(selectedIds);
					} else {
						const endpoint = deleteEndpoint || apiEndpoint;
						await api.delete(endpoint, {
							body: JSON.stringify({ ids: selectedIds }),
							showSuccess: true,
							successMessage: `${selectedIds.length} ${entityName}(s) excluído(s) com sucesso!`
						});
					}
					selectedIds = [];
					loadData();
				} catch (error) {
					console.error(`Erro ao excluir ${entityNamePlural}:`, error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Preload da próxima página para melhor UX
	function preloadNextPage() {
		if (page < Math.ceil(totalItems / pageSize) && !isLoadingData) {
			const nextPageParams = new URLSearchParams({
				page: (page + 1).toString(),
				limit: pageSize.toString(),
				search: search.trim(),
				status: statusFilter,
				sortBy,
				sortOrder
			});
			
			// Preload silencioso da próxima página
			fetch(`${apiEndpoint}?${nextPageParams}`, {
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
					'Content-Type': 'application/json'
				}
			}).catch(() => {}); // Ignorar erros do preload
		}
	}
	
	// Verificação de autenticação padrão com preload
	async function checkAuthAndLoad() {
		if (typeof window === 'undefined') return;
		
		const token = localStorage.getItem('access_token');
		const userStr = localStorage.getItem('user');
		
		if (token && userStr) {
			await Promise.all([
				loadData(),
				loadStats(),
				loadFilters()
			]);
			
			// Preload da próxima página após carregar a atual
			setTimeout(preloadNextPage, 1000);
		} else {
			goto('/login');
		}
	}
	
	// Lifecycle
	onMount(() => {
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
	<!-- Header responsivo -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-20px)] sm:max-w-[calc(100vw-100px)] mx-auto px-4 py-4 sm:py-6">
			<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
				<h1 class="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
				<Button 
					icon="plus" 
					onclick={() => goto(newItemRoute)}
					class="w-full sm:w-auto text-sm sm:text-base bg-[#00BFB3] hover:bg-[#00A89D] text-white border-[#00BFB3] hover:border-[#00A89D] transition-all duration-200"
				>
					<span class="sm:hidden">Novo</span>
					<span class="hidden sm:inline">Novo {entityName}</span>
				</Button>
			</div>
		</div>
	</div>
	
	<!-- Content responsivo -->
	<div class="max-w-[calc(100vw-20px)] sm:max-w-[calc(100vw-100px)] mx-auto p-4 sm:p-6">
		<!-- Estatísticas (opcional) -->
		{#if statsConfig}
			<div class="mb-4 sm:mb-6">
				<StatsAccordion 
					stats={stats} 
					labels={{
						title: `Estatísticas de ${entityNamePlural}`,
						total: `Total de ${entityNamePlural}`,
						active: `${entityNamePlural} Ativos`,
						pending: `${entityNamePlural} Inativos`,
						lowStock: apiEndpoint.includes('shipping') ? 'Sem Cobertura' : 'Outros'
					}}
				/>
			</div>
		{/if}
		
		<!-- Filtros -->
		<div class="mb-4 sm:mb-6">
			<FiltersAccordion
				categories={categoriesEndpoint ? categories : []}
				brands={brandsEndpoint ? brands : []}
				showCategoryFilter={!!categoriesEndpoint}
				showBrandFilter={!!brandsEndpoint}
				showPriceFilter={!!categoriesEndpoint || !!brandsEndpoint}
				statusOptions={getStatusOptionsForPage()}
				customFilters={customFilters || []}
				bind:statusFilter
				bind:categoryFilter
				bind:brandFilter
				bind:priceRange
				bind:search
				bind:customFilterValues
				{searchPlaceholder}
				onFiltersChange={handleFiltersChange}
				onSearchChange={handleSearchChange}
				onCustomFilterChange={(key, value) => {
					customFilterValues[key] = value;
					handleFiltersChange();
				}}
			/>
		</div>
		
		<!-- Tabela Responsiva -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<div class="p-3 sm:p-6">
				<!-- Ações em lote -->
				{#if selectedIds.length > 0}
					<div class="mb-4 p-4 bg-[#00BFB3]/10 rounded-lg border border-[#00BFB3]/20">
						<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
							<div class="flex items-center gap-2">
								<div class="w-2 h-2 bg-[#00BFB3] rounded-full"></div>
								<span class="text-sm font-medium text-[#00BFB3]">
								{selectedIds.length} {entityName}(s) selecionado(s)
							</span>
							</div>
							<div class="flex gap-2 w-full sm:w-auto">
								<Button
									size="sm"
									variant="danger"
									onclick={deleteSelected}
									class="flex-1 sm:flex-initial text-xs sm:text-sm bg-gray-600 hover:bg-gray-700 border-gray-600 hover:border-gray-700 transition-all duration-200"
								>
									<span class="sm:hidden">Excluir</span>
									<span class="hidden sm:inline">Excluir ({selectedIds.length})</span>
								</Button>
							</div>
						</div>
					</div>
				{/if}
				
				<!-- Desktop Table / Mobile Cards -->
				<div class="hidden lg:block">
				<DataTable
					{columns}
					{data}
					{loading}
					selectable={true}
					selectedIds={selectedIds}
					onSelectionChange={(ids: string[]) => selectedIds = ids}
					{page}
					{pageSize}
					{totalItems}
						onPageChange={handlePageChange}
					showHeaderPagination={true}
					{sortBy}
					{sortOrder}
					onSort={handleSort}
					actions={getTableActions}
					emptyMessage={`Nenhum ${entityName} encontrado`}
				/>
				</div>

				<!-- Mobile Cards -->
				<div class="lg:hidden">
					{#if loading}
						<div class="space-y-4">
							{#each Array(5) as _, i}
								<div class="bg-gray-50 rounded-lg p-4 animate-pulse">
									<div class="flex space-x-4">
										<div class="w-16 h-16 bg-gray-200 rounded-lg"></div>
										<div class="flex-1 space-y-2">
											<div class="h-4 bg-gray-200 rounded w-3/4"></div>
											<div class="h-3 bg-gray-200 rounded w-1/2"></div>
											<div class="h-3 bg-gray-200 rounded w-1/4"></div>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else if data.length === 0}
						<div class="text-center py-12">
							<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m0 0V4h10v1M7 5v1h10V5"></path>
							</svg>
							<h3 class="mt-2 text-sm font-medium text-gray-900">{`Nenhum ${entityName} encontrado`}</h3>
							<p class="mt-1 text-sm text-gray-500">Comece criando um novo {entityName}.</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each data as item}
								<div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
									<!-- Mobile Card Content -->
									<div class="flex items-start space-x-3">
										<!-- Checkbox -->
										<input 
											type="checkbox" 
											checked={selectedIds.includes(item.id)}
											onchange={(e) => {
												const target = e.target as HTMLInputElement;
												if (target.checked) {
													selectedIds = [...selectedIds, item.id];
												} else {
													selectedIds = selectedIds.filter(id => id !== item.id);
												}
											}}
											class="mt-1 h-4 w-4 text-[#00BFB3] focus:ring-[#00BFB3] border-gray-300 rounded transition-all duration-200"
										/>
										
										<!-- Image -->
										{#if item.image || item.images?.[0]}
											<img 
												src={item.image || item.images[0]} 
												alt={item.name}
												class="w-16 h-16 rounded-lg object-cover flex-shrink-0 shadow-sm"
												loading="lazy"
											/>
										{:else}
											<div class="w-16 h-16 bg-gradient-to-br from-[#00BFB3]/20 to-[#00A89D]/30 rounded-lg flex items-center justify-center flex-shrink-0">
												<svg class="w-8 h-8 text-[#00BFB3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
												</svg>
											</div>
										{/if}
										
										<!-- Content -->
										<div class="flex-1 min-w-0">
											<div class="flex items-start justify-between">
												<div class="flex-1">
													<h3 class="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
													<p class="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
													{#if item.category}
														<p class="text-xs text-gray-400 mt-1">{item.category}</p>
													{/if}
												</div>
												
												<!-- Actions -->
												<div class="flex space-x-2 ml-2">
													{#each getTableActions(item) as action}
														<button
															onclick={action.onclick}
															class="px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 text-[#00BFB3] hover:text-white hover:bg-[#00BFB3] border border-[#00BFB3]/20 hover:border-[#00BFB3]"
														>
															{action.label}
														</button>
													{/each}
												</div>
											</div>
											
											<!-- Price and Status -->
											<div class="flex items-center justify-between mt-3">
												<div class="flex items-center space-x-4">
													{#if item.price}
														<span class="text-lg font-semibold text-gray-900">R$ {item.price.toFixed(2)}</span>
													{/if}
													{#if item.quantity !== undefined}
														<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {item.quantity === 0 ? 'bg-red-100 text-red-800' : item.quantity < 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
															Estoque: {item.quantity}
														</span>
													{/if}
												</div>
												
												{#if item.is_active !== undefined}
													<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
														{item.is_active ? 'Ativo' : 'Inativo'}
													</span>
												{/if}
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>
						
						<!-- Mobile Pagination -->
						{#if totalItems > pageSize}
							<div class="mt-6 flex items-center justify-between">
								<button
									onclick={() => handlePageChange(page - 1)}
									disabled={page <= 1}
									class="inline-flex items-center px-4 py-2 border border-[#00BFB3]/30 text-sm font-medium rounded-md text-[#00BFB3] bg-white hover:bg-[#00BFB3] hover:text-white hover:border-[#00BFB3] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#00BFB3] transition-all duration-200"
								>
									Anterior
								</button>
								
								<span class="text-sm text-gray-700 font-medium">
									Página {page} de {Math.ceil(totalItems / pageSize)}
								</span>
								
								<button
									onclick={() => handlePageChange(page + 1)}
									disabled={page >= Math.ceil(totalItems / pageSize)}
									class="inline-flex items-center px-4 py-2 border border-[#00BFB3]/30 text-sm font-medium rounded-md text-[#00BFB3] bg-white hover:bg-[#00BFB3] hover:text-white hover:border-[#00BFB3] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#00BFB3] transition-all duration-200"
								>
									Próxima
								</button>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div> 