<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import { api } from '$lib/services/api';
	import { toast } from '$lib/stores/toast';
	import { authStore } from '$lib/stores/auth';
	import { DataTable, Input, Select, Button } from '$lib/components/ui';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import MultiSelect from '$lib/components/ui/MultiSelect.svelte';
	import BatchEnrichmentProgress from '$lib/components/produtos/BatchEnrichmentProgress.svelte';
	import { useDebounce } from '$lib/hooks/useDebounce';
	import type { Product, PaginatedResponse } from '$lib/types';
	
	// Estados
	let products = $state<Product[]>([]);
	let loading = $state(true);
	let search = $state('');
	let statusFilter = $state('all');
	let categoryFilter = $state('all');
	let selectedIds = $state<string[]>([]);
	
	// Estados para enriquecimento em lote
	let showBatchEnrichmentModal = $state(false);
	let enrichingBatch = $state(false);
	
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
		total: 0,
		active: 0,
		pending: 0,
		lowStock: 0
	});
	
	// Estados para acordeões
	let statsAccordionOpen = $state(true);
	let filtersAccordionOpen = $state(true);
	
	// Opções de filtros
	const statusOptions = [
		{ value: 'all', label: 'Todos os Status' },
		{ value: 'active', label: 'Ativos' },
		{ value: 'inactive', label: 'Inativos' },
		{ value: 'draft', label: 'Rascunho' },
		{ value: 'low_stock', label: 'Estoque Baixo' },
		{ value: 'out_of_stock', label: 'Sem Estoque' }
	];
	
	// Estados para filtros adicionais
	let categories = $state<Array<{id: string, name: string}>>([]);
	let brands = $state<Array<{id: string, name: string}>>([]);
	let priceRange = $state({ min: '', max: '' });
	let brandFilter = $state('all');
	let selectedCategories = $state<string[]>([]);
	
	// Estados de inicialização
	let hasLoadedInitialData = $state(false);
	
	// Verificar autenticação simples
	function checkAuthAndLoad() {
		if (typeof window === 'undefined') return;
		
		const token = localStorage.getItem('access_token');
		const userStr = localStorage.getItem('user');
		
		if (token && userStr) {
			// Usuário autenticado, carregar dados
			if (!hasLoadedInitialData) {
				hasLoadedInitialData = true;
				loadProducts();
				loadStats();
				loadFilters();
			}
		} else {
			// Não autenticado, redirecionar
			goto('/login');
		}
	}
	
	// Colunas da tabela
	const columns = [
		{
			key: 'image',
			label: 'Imagem',
			width: '80px',
			render: (value: string, row: Product) => `
				<img src="${row.images?.[0] || `/api/placeholder/60/60?text=${encodeURIComponent(row.name)}`}" 
					alt="${row.name}" 
					class="w-12 h-12 rounded-lg object-cover"
				/>
			`
		},
		{
			key: 'name',
			label: 'Produto',
			sortable: true,
			render: (value: string, row: Product) => `
				<div>
					<div class="font-medium text-gray-900">${row.name}</div>
					<div class="text-sm text-gray-500">SKU: ${row.sku}</div>
				</div>
			`
		},
		{
			key: 'category_id',
			label: 'Categoria',
			sortable: true,
			hideOnMobile: true,
			render: (value: string, row: Product) => {
				// TODO: Buscar nome da categoria
				return `<span class="text-sm text-gray-600">${value || 'Sem categoria'}</span>`;
			}
		},
		{
			key: 'brand_id',
			label: 'Marca',
			sortable: true,
			hideOnMobile: true,
			render: (value: string, row: Product) => {
				// TODO: Buscar nome da marca
				return `<span class="text-sm text-gray-600">${value || 'Sem marca'}</span>`;
			}
		},
		{
			key: 'price',
			label: 'Preço',
			sortable: true,
			align: 'right' as const,
			render: (value: number) => `
				<span class="font-medium">R$ ${value.toFixed(2)}</span>
			`
		},
		{
			key: 'quantity',
			label: 'Estoque',
			sortable: true,
			align: 'center' as const,
			render: (value: number) => {
				const color = value === 0 ? 'red' : value < 10 ? 'amber' : 'green';
				return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-800">${value}</span>`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			hideOnMobile: true,
			render: (value: string, row: Product) => {
				const status = row.is_active ? 'Ativo' : 'Inativo';
				const color = row.is_active ? 'green' : 'gray';
				return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-800">${status}</span>`;
			}
		},
		{
			key: 'created_at',
			label: 'Criado em',
			sortable: true,
			hideOnMobile: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		}
	];
	
	// Buscar estatísticas corretas
	async function loadStats() {
		try {
			// Buscar total de produtos
			const totalResponse = await api.get<any>(`/products?page=1&limit=1`);
			const total = totalResponse.meta?.total || 0;
			
			// Buscar produtos ativos (is_active=true e quantity>0)
			const activeResponse = await api.get<any>(`/products?page=1&limit=1&status=active`);
			const active = activeResponse.meta?.total || 0;
			
			// Buscar produtos pendentes (status=draft)
			const pendingResponse = await api.get<any>(`/products?page=1&limit=1&status=draft`);
			const pending = pendingResponse.meta?.total || 0;
			
			// Buscar produtos sem estoque (quantity=0)
			const outOfStockResponse = await api.get<any>(`/products?page=1&limit=1&status=out_of_stock`);
			const lowStock = outOfStockResponse.meta?.total || 0;
			
			stats = {
				total,
				active,
				pending,
				lowStock
			};
			
			console.log('📊 Estatísticas carregadas:', {
				total: `${total} produtos`,
				active: `${active} ativos`,
				pending: `${pending} pendentes`,
				lowStock: `${lowStock} sem estoque`
			});
		} catch (error) {
			console.error('Erro ao carregar estatísticas:', error);
			stats = {
				total: 0,
				active: 0,
				pending: 0,
				lowStock: 0
			};
		}
	}
	
	// Buscar produtos
	async function loadProducts() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: pageSize.toString(),
				search,
				status: statusFilter,
				categories: selectedCategories.join(','),
				sortBy,
				sortOrder
			});
			
			const response = await api.get<any>(`/products?${params}`);
			
			if (response.success) {
				// A API retorna os produtos diretamente em .data como array
				products = response.data || [];
				
				// O total está em .meta.total
				totalItems = response.meta?.total || 0;
				
				console.log('✅ Produtos carregados:', products.length, 'de', totalItems);
			}
		} catch (error) {
			console.error('Erro ao carregar produtos:', error);
		} finally {
			loading = false;
		}
	}
	
	// Debounce da busca
	const debouncedSearch = useDebounce(() => {
		page = 1;
		loadProducts();
	}, 500);
	
	// Watchers
	$effect(() => {
		if (search !== undefined) debouncedSearch();
	});
	
	// Watcher para filtros - só executa se não estamos carregando
	$effect(() => {
		if (!loading && (statusFilter !== 'all' || selectedCategories.length > 0)) {
			page = 1;
			loadProducts();
		}
	});

	// Watcher para mudança de página
	$effect(() => {
		if (page > 1) {
			loadProducts();
		}
	});
	
	// Handle ordenação
	function handleSort(column: string) {
		if (sortBy === column) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortOrder = 'asc';
		}
		page = 1;
		loadProducts();
	}
	
	// Ações da tabela
	function getTableActions(row: Product) {
		return [
			{
				label: 'Editar',
				icon: 'Edit',
				onclick: () => goto(`/produtos/${row.id}`)
			},
			{
				label: 'Excluir',
				icon: 'delete',
				onclick: () => deleteProduct(row)
			}
		];
	}
	
	// Excluir produto individual
	async function deleteProduct(product: Product) {
		confirmDialogConfig = {
			title: 'Excluir Produto',
			message: `Tem certeza que deseja excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					await api.delete(`/products/${product.id}`, {
						showSuccess: true,
						successMessage: 'Produto excluído com sucesso!'
					});
					
					loadProducts();
				} catch (error) {
					console.error('Erro ao excluir produto:', error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Excluir produtos selecionados
	async function deleteSelected() {
		if (selectedIds.length === 0) return;
		
		confirmDialogConfig = {
			title: 'Excluir Produtos',
			message: `Tem certeza que deseja excluir ${selectedIds.length} produto(s)? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					await api.delete('/products', {
						body: JSON.stringify({ ids: selectedIds }),
						showSuccess: true,
						successMessage: `${selectedIds.length} produto(s) excluído(s) com sucesso!`
					});
					
					selectedIds = [];
					loadProducts();
				} catch (error) {
					console.error('Erro ao excluir produtos:', error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Enriquecer produtos selecionados com IA
	async function enrichSelectedProducts() {
		if (selectedIds.length === 0) return;
		
		// Buscar os dados dos produtos selecionados
		const selectedProducts: Product[] = [];
		for (const id of selectedIds) {
			const product = products.find(p => p.id === id);
			if (product) {
				selectedProducts.push(product);
			}
		}
		
		if (selectedProducts.length === 0) {
			toast.error('Nenhum produto válido selecionado');
			return;
		}
		
		// Abrir modal de progresso
		enrichingBatch = true;
		showBatchEnrichmentModal = true;
	}
	
	// Callbacks do modal de enriquecimento em lote
	function handleBatchEnrichmentComplete(result: any) {
		console.log('🎉 Enriquecimento em lote concluído:', result);
		
		// Fechar modal
		showBatchEnrichmentModal = false;
		enrichingBatch = false;
		
		// Limpar seleção
		selectedIds = [];
		
		// Recarregar produtos
		loadProducts();
		
		// Mostrar resultado
		if (result.success) {
			toast.success(`✅ ${result.successCount || 0} produto(s) enriquecido(s) com sucesso!`);
			if (result.errorCount > 0) {
				toast.warning(`⚠️ ${result.errorCount} produto(s) falharam no enriquecimento`);
			}
		} else {
			toast.error('Erro no enriquecimento em lote');
		}
	}
	
	function handleBatchEnrichmentCancel() {
		console.log('🛑 Enriquecimento em lote cancelado');
		showBatchEnrichmentModal = false;
		enrichingBatch = false;
		selectedIds = [];
		toast.info('Enriquecimento cancelado');
	}
	
	// Buscar categorias e marcas
	async function loadFilters() {
		try {
			// Buscar categorias
			const catResponse = await api.get('/categories');
			
			if (catResponse.success && catResponse.data) {
				const rawData = catResponse.data;
				
				// A API retorna { categories: [...], stats: {...} }
				if (rawData.categories && Array.isArray(rawData.categories)) {
					categories = rawData.categories.map((cat: any) => ({
						id: cat.id,
						name: cat.name,
						parent_id: cat.parentId || null
					}));
				} else if (Array.isArray(rawData)) {
					// Caso seja diretamente um array
					categories = rawData.map((cat: any) => ({
						id: cat.id,
						name: cat.name,
						parent_id: cat.parentId || null
					}));
				} else {
					categories = [];
				}
				
				console.log('✅ Categorias carregadas:', categories.length);
			} else {
				categories = [];
			}
			
			// Buscar marcas
			const brandResponse = await api.get('/brands');
			if (brandResponse.success && brandResponse.data) {
				// A API retorna { brands: [...], pagination: {...} }
				brands = brandResponse.data.brands || [];
				console.log('✅ Marcas carregadas:', brands.length);
			} else {
				brands = [];
			}
		} catch (error) {
			console.error('Erro ao carregar filtros:', error);
			categories = [];
			brands = [];
		}
	}
	
	// Carregar estados dos acordeões do localStorage
	$effect(() => {
		if (typeof window !== 'undefined') {
			const statsState = localStorage.getItem('admin-stats-accordion');
			const filtersState = localStorage.getItem('admin-filters-accordion');
			
			if (statsState !== null) {
				statsAccordionOpen = JSON.parse(statsState);
			}
			if (filtersState !== null) {
				filtersAccordionOpen = JSON.parse(filtersState);
			}
		}
	});
	
	// Função para toggle dos acordeões
	function toggleStatsAccordion() {
		statsAccordionOpen = !statsAccordionOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('admin-stats-accordion', JSON.stringify(statsAccordionOpen));
		}
	}
	
	function toggleFiltersAccordion() {
		filtersAccordionOpen = !filtersAccordionOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('admin-filters-accordion', JSON.stringify(filtersAccordionOpen));
		}
	}
	
	// Lifecycle
	onMount(async () => {
		// Verificar se já está autenticado
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

<!-- Modal de Enriquecimento em Lote -->
{#if showBatchEnrichmentModal}
	<BatchEnrichmentProgress 
		selectedProducts={selectedIds.map(id => products.find(p => p.id === id)).filter(Boolean)}
		onComplete={handleBatchEnrichmentComplete}
		onCancel={handleBatchEnrichmentCancel}
	/>
{/if}

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">Produtos</h1>
				<Button icon="Plus" onclick={() => goto('/produtos/novo')}>
					Novo Produto
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
						<ModernIcon name="bar-chart" size="md" color="#00BFB3" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Estatísticas de Produtos</h3>
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
							<!-- Total de Produtos -->
							<div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Total de Produtos</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
									</div>
									<div class="p-3 bg-[#00BFB3]/10 rounded-lg">
										<ModernIcon name="Package" size={24} color="#00BFB3" />
									</div>
								</div>
							</div>
							
							<!-- Produtos Ativos -->
							<div class="bg-green-50 rounded-lg p-4 border border-green-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Produtos Ativos</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
									</div>
									<div class="p-3 bg-green-100 rounded-lg">
										<ModernIcon name="Check" size={24} color="#16A34A" />
									</div>
								</div>
							</div>
							
							<!-- Pendentes -->
							<div class="bg-amber-50 rounded-lg p-4 border border-amber-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Pendentes</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
									</div>
									<div class="p-3 bg-amber-100 rounded-lg">
										<ModernIcon name="Clock" size={24} color="#D97706" />
									</div>
								</div>
							</div>
							
							<!-- Estoque Baixo -->
							<div class="bg-red-50 rounded-lg p-4 border border-red-100">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Sem Estoque</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.lowStock}</p>
									</div>
									<div class="p-3 bg-red-100 rounded-lg">
										<ModernIcon name="AlertTriangle" size={24} color="#DC2626" />
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
						<ModernIcon name="search" size="md" color="#00BFB3" />
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
					style="overflow: visible;"
					transition:slide={{ duration: 300 }}
				>
					<div class="p-6">
						<!-- Busca e Ações -->
						<div class="flex flex-col md:flex-row gap-4 mb-6">
							<div class="flex-1">
								<Input
									type="search"
									placeholder="Buscar produtos..."
									bind:value={search}
									icon="🔍"
								/>
							</div>
							
							{#if selectedIds.length > 0}
								<Button
									variant="ghost"
									onclick={deleteSelected}
									class="text-red-600 hover:text-red-700 hover:bg-red-50"
								>
									Excluir ({selectedIds.length})
								</Button>
								
								<Button
									variant="secondary"
									onclick={() => enrichSelectedProducts()}
									class="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
								>
									🤖 Enriquecer com IA ({selectedIds.length})
								</Button>
							{/if}
						</div>
						
						<!-- Filtros -->
						<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
							<Select
								bind:value={statusFilter}
								options={statusOptions}
								label="Status"
							/>
							
							<!-- Categoria usando MultiSelect -->
							<div class="relative z-[9999]" style="overflow: visible;">
								<MultiSelect
									items={Array.isArray(categories) ? categories : []}
									selected={selectedCategories}
									onSelectionChange={(selected) => {
										selectedCategories = selected;
									}}
									label="Categoria"
									placeholder="Selecione categorias..."
									hierarchical={true}
									allowMultiple={true}
									searchable={true}
								/>
							</div>
							
							<Select
								bind:value={brandFilter}
								options={[
									{ value: 'all', label: 'Todas as Marcas' },
									...(Array.isArray(brands) ? brands.map(b => ({ value: b.id, label: b.name })) : [])
								]}
								label="Marca"
							/>
							
							<div class="space-y-2">
								<label class="block text-sm font-medium text-gray-700">Preço</label>
								<div class="flex gap-2">
									<Input
										type="number"
										placeholder="Min"
										bind:value={priceRange.min}
										class="w-1/2"
									/>
									<Input
										type="number"
										placeholder="Max"
										bind:value={priceRange.max}
										class="w-1/2"
									/>
								</div>
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
					data={products}
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
				/>
			</div>
		</div>
	</div>
</div> 