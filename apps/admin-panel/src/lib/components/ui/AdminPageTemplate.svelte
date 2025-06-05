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
	
	// Função genérica para carregar dados
	async function loadData() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: pageSize.toString(),
				search,
				status: statusFilter,
				category: categoryFilter,
				brand: brandFilter,
				sortBy,
				sortOrder
			});
			
			if (priceRange.min) params.append('priceMin', priceRange.min);
			if (priceRange.max) params.append('priceMax', priceRange.max);
			
			const response = await api.get(`${apiEndpoint}?${params}`);
			
			if (response.success) {
				let rawData = response.data || [];
				
				// Permitir transformação customizada dos dados
				if (onDataLoad) {
					rawData = onDataLoad(rawData);
				}
				
				data = rawData;
				totalItems = response.meta?.total || 0;
			}
		} catch (error) {
			console.error(`Erro ao carregar ${entityNamePlural}:`, error);
			toast.error(`Erro ao carregar ${entityNamePlural}`);
		} finally {
			loading = false;
		}
	}
	
	// Função genérica para carregar estatísticas
	async function loadStats() {
		if (!statsEndpoint || !statsConfig) return;
		
		try {
			const response = await api.get(statsEndpoint);
			if (response.success) {
				let rawStats = response.data || {};
				
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
		}
	}
	
	// Função genérica para carregar filtros
	async function loadFilters() {
		try {
			// Carregar categorias se endpoint fornecido
			if (categoriesEndpoint) {
				const catResponse = await api.get(categoriesEndpoint);
				if (catResponse.success) {
					categories = catResponse.data?.categories || catResponse.data || [];
				}
			}
			
			// Carregar marcas se endpoint fornecido
			if (brandsEndpoint) {
				const brandResponse = await api.get(brandsEndpoint);
				if (brandResponse.success) {
					brands = brandResponse.data?.brands || brandResponse.data || [];
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
	
	// Watchers padrão
	$effect(() => {
		if (search !== undefined) debouncedSearch();
	});
	
	$effect(() => {
		if (!loading && (statusFilter !== 'all' || categoryFilter !== 'all' || brandFilter !== 'all')) {
			page = 1;
			loadData();
		}
	});
	
	$effect(() => {
		if (page > 1) loadData();
	});
	
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
		const defaultActions = [
			{
				label: 'Editar',
				icon: 'Edit',
				onclick: () => goto(editItemRoute(row.id))
			},
			{
				label: 'Excluir',
				icon: 'delete',
				onclick: () => deleteItem(row)
			}
		];
		
		// Permitir ações customizadas
		if (customActions) {
			return [...defaultActions, ...customActions(row)];
		}
		
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
	
	// Verificação de autenticação padrão
	function checkAuthAndLoad() {
		if (typeof window === 'undefined') return;
		
		const token = localStorage.getItem('access_token');
		const userStr = localStorage.getItem('user');
		
		if (token && userStr) {
			loadData();
			loadStats();
			loadFilters();
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
	<!-- Header padrão -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">{title}</h1>
				<Button icon="Plus" onclick={() => goto(newItemRoute)}>
					Novo {entityName}
				</Button>
			</div>
		</div>
	</div>
	
	<!-- Content padrão -->
	<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
		<!-- Estatísticas (opcional) -->
		{#if statsConfig}
			<div class="mb-6">
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
		
		<!-- Filtros dinâmicos baseados na configuração -->
		<div class="mb-6">
			<FiltersAccordion
				categories={categoriesEndpoint ? categories : []}
				brands={brandsEndpoint ? brands : []}
				showCategoryFilter={!!categoriesEndpoint}
				showBrandFilter={!!brandsEndpoint}
				showPriceFilter={!!categoriesEndpoint || !!brandsEndpoint}
				statusOptions={getStatusOptionsForPage()}
				bind:statusFilter
				bind:categoryFilter
				bind:brandFilter
				bind:priceRange
				onFiltersChange={() => {
					page = 1;
					loadData();
				}}
			/>
		</div>
		
		<!-- Filtros customizados específicos da página -->
		{#if customFilters && customFilters.length > 0}
			<div class="bg-white rounded-lg border border-gray-200 mb-6 p-6">
				<div class="flex items-center gap-3 mb-4">
					<div class="p-2 bg-purple-100 rounded-lg">
						<ModernIcon name="settings" size="md" color="#7C3AED" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Filtros Específicos</h3>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					{#each customFilters as filter}
						<div class="space-y-2">
							<label class="block text-sm font-medium text-gray-700">{filter.label}</label>
							{#if filter.type === 'select'}
								<select 
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
									onchange={(e) => {
										const value = e.target.value;
										console.log(`Filtro ${filter.key}:`, value);
										// Aqui você pode adicionar lógica para aplicar o filtro
										page = 1;
										loadData();
									}}
								>
									{#each filter.options || [] as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
							{:else if filter.type === 'input'}
								<input 
									type="text"
									placeholder={filter.placeholder || `Filtrar por ${filter.label.toLowerCase()}`}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
									oninput={(e) => {
										const value = e.target.value;
										console.log(`Filtro ${filter.key}:`, value);
									}}
								/>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
		
		<!-- Tabela -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<div class="p-4">
				<!-- Ações em lote -->
				{#if selectedIds.length > 0}
					<div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
						<div class="flex items-center justify-between">
							<span class="text-sm text-blue-800">
								{selectedIds.length} {entityName}(s) selecionado(s)
							</span>
							<div class="flex gap-2">
								<Button
									size="sm"
									variant="ghost"
									onclick={deleteSelected}
								>
									Excluir ({selectedIds.length})
								</Button>
							</div>
						</div>
					</div>
				{/if}
				
				<DataTable
					{columns}
					{data}
					{loading}
					selectable={true}
					bind:selectedIds
					{page}
					{pageSize}
					{totalItems}
					onPageChange={(p) => page = p}
					{sortBy}
					{sortOrder}
					onSort={handleSort}
					actions={getTableActions}
					emptyMessage={`Nenhum ${entityName} encontrado`}
				/>
			</div>
		</div>
	</div>
</div> 