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
	
	// Interface para Page
	interface Page {
		id: string;
		title: string;
		slug: string;
		content: string;
		isPublished: boolean;
		createdAt: string;
		updatedAt: string;
	}
	
	// Estados
	let pages = $state<Page[]>([]);
	let loading = $state(true);
	let search = $state('');
	let statusFilter = $state('all');
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
		{ value: 'published', label: 'Publicadas' },
		{ value: 'draft', label: 'Rascunho' }
	];
	
	// Estados de inicialização
	let hasLoadedInitialData = $state(false);
	let isFiltering = $state(false);
	
	// Verificar autenticação simples
	function checkAuthAndLoad() {
		if (typeof window === 'undefined') return;
		
		const token = localStorage.getItem('access_token');
		const userStr = localStorage.getItem('user');
		
		if (token && userStr) {
			if (!hasLoadedInitialData) {
				hasLoadedInitialData = true;
				loadPages();
				loadStats();
			}
		} else {
			goto('/login');
		}
	}
	
	// Colunas da tabela
	const columns = [
		{
			key: 'title',
			label: 'Título',
			sortable: true,
			render: (value: string, row: Page) => `
				<div>
					<div class="font-medium text-gray-900">${row.title}</div>
					<div class="text-sm text-gray-500">/${row.slug}</div>
				</div>
			`
		},
		{
			key: 'isPublished',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: boolean) => {
				const status = value ? 'Publicada' : 'Rascunho';
				const color = value ? 'green' : 'amber';
				return `<span class="px-2 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-800">${status}</span>`;
			}
		},
		{
			key: 'createdAt',
			label: 'Criado em',
			sortable: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
			}
		},
		{
			key: 'updatedAt',
			label: 'Atualizado em',
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
			const response = await api.get<any>('/pages?page=1&limit=1');
			if (response.success && response.data?.stats) {
				const apiStats = response.data.stats;
				stats = {
					total: apiStats.total || 0,
					active: apiStats.published || 0,
					pending: apiStats.draft || 0,
					lowStock: 0 // Posts do blog (não implementado ainda)
				};
			}
		} catch (error) {
			console.error('Erro ao carregar estatísticas:', error);
			stats = { total: 0, active: 0, pending: 0, lowStock: 0 };
		}
	}
	
	// Buscar páginas
  async function loadPages() {
		loading = true;
		isFiltering = true;
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: pageSize.toString(),
				search,
				status: statusFilter,
				sortBy,
				sortOrder
			});
			
			const response = await api.get<any>(`/pages?${params}`);
			
			if (response.success && response.data) {
				const apiPages = response.data.pages || [];
				pages = apiPages;
				totalItems = response.data.pagination?.total || 0;
				
				// Atualizar estatísticas se disponível
				if (response.data.stats) {
					const apiStats = response.data.stats;
					stats = {
						total: apiStats.total || 0,
						active: apiStats.published || 0,
						pending: apiStats.draft || 0,
						lowStock: 0
					};
				}
			}
		} catch (error) {
			console.error('❌ [ERRO] Erro ao carregar páginas:', error);
		} finally {
			loading = false;
			isFiltering = false;
		}
	}
	
	// Debounce da busca
	const debouncedSearch = useDebounce(() => {
		page = 1;
		loadPages();
	}, 500);
	
	// Debounce para filtros
	const debouncedFilters = useDebounce(() => {
		page = 1;
		loadPages();
	}, 300);
	
	// Handle mudança de busca
	function handleSearchChange() {
		if (hasLoadedInitialData && !isFiltering) {
			debouncedSearch();
		}
	}
	
	// Handle mudança de filtros
	function handleFilterChange() {
		if (hasLoadedInitialData && !isFiltering) {
			debouncedFilters();
		}
	}
	
	// Limpar filtros
	function clearAllFilters() {
		search = '';
		statusFilter = 'all';
		page = 1;
		loadPages();
	}
	
	// Verificar filtros ativos
	function hasActiveFilters() {
		return search !== '' || statusFilter !== 'all';
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
		loadPages();
	}
	
	// Handle mudança de página
	function handlePageChange(newPage: number) {
		page = newPage;
		loadPages();
	}
	
	// Ações da tabela
	function getTableActions(row: Page) {
		return [
			{
				label: 'Editar',
				icon: 'edit',
				onclick: () => goto(`/paginas/${row.id}`)
			},
			{
				label: 'Visualizar',
				icon: 'preview',
				onclick: () => window.open(`/${row.slug}`, '_blank')
			},
			{
				label: 'Excluir',
				icon: 'Delete',
				onclick: () => deletePage(row)
			}
		];
	}
	
	// Excluir página individual
	async function deletePage(pagina: Page) {
		confirmDialogConfig = {
			title: 'Excluir Página',
			message: `Tem certeza que deseja excluir a página "${pagina.title}"? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					await api.delete('/pages', {
						body: JSON.stringify({ id: pagina.id }),
						showSuccess: true,
						successMessage: 'Página excluída com sucesso!'
					});
				loadPages();
					loadStats();
					showConfirmDialog = false;
		} catch (error) {
					console.error('Erro ao excluir página:', error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Excluir páginas selecionadas
	async function deleteSelected() {
		if (selectedIds.length === 0) return;
		
		confirmDialogConfig = {
			title: 'Excluir Páginas',
			message: `Tem certeza que deseja excluir ${selectedIds.length} página(s)? Esta ação não pode ser desfeita.`,
			variant: 'danger',
			onConfirm: async () => {
				try {
					for (const id of selectedIds) {
						await api.delete('/pages', {
					body: JSON.stringify({ id })
				});
					}
					selectedIds = [];
					toast.success(`Páginas excluídas com sucesso!`);
					loadPages();
					loadStats();
					showConfirmDialog = false;
			} catch (error) {
					console.error('Erro ao excluir páginas:', error);
				}
			}
		};
		showConfirmDialog = true;
	}
	
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
  <!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-bold text-gray-900">Páginas</h1>
				<Button icon="Plus" onclick={() => goto('/paginas/nova')}>
					Nova Página
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
						<ModernIcon name="analytics" size="md" color="#00BFB3" />
					</div>
					<h3 class="text-lg font-semibold text-gray-900">Estatísticas de Páginas</h3>
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
							<!-- Total de Páginas -->
							<div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
								<div class="flex items-center justify-between">
					<div>
										<p class="text-sm font-medium text-gray-600">Total de Páginas</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
					</div>
									<div class="p-3 bg-[#00BFB3]/10 rounded-lg">
										<ModernIcon name="totalProducts" size={24} color="#00BFB3" />
					</div>
					</div>
				</div>
							
							<!-- Páginas Publicadas -->
							<div class="bg-green-50 rounded-lg p-4 border border-green-100">
				<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Páginas Publicadas</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
					</div>
									<div class="p-3 bg-green-100 rounded-lg">
										<ModernIcon name="check" size={24} color="#16A34A" />
				</div>
			</div>
		</div>
							
							<!-- Rascunhos -->
							<div class="bg-amber-50 rounded-lg p-4 border border-amber-100">
								<div class="flex items-center justify-between">
										<div>
										<p class="text-sm font-medium text-gray-600">Rascunhos</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                </div>
									<div class="p-3 bg-amber-100 rounded-lg">
										<ModernIcon name="Clock" size={24} color="#D97706" />
              </div>
									</div>
			</div>
			
							<!-- Posts do Blog -->
							<div class="bg-red-50 rounded-lg p-4 border border-red-100">
					<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-600">Posts do Blog</p>
										<p class="text-2xl font-bold text-gray-900 mt-1">{stats.lowStock}</p>
							</div>
									<div class="p-3 bg-red-100 rounded-lg">
										<ModernIcon name="lowStock" size={24} color="#DC2626" />
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
					transition:slide={{ duration: 300 }}
				>
					<div class="p-6">
						<!-- Busca e Ações -->
						<div class="flex flex-col md:flex-row gap-4 mb-6">
							<div class="flex-1">
								<Input
									type="search"
									placeholder="Buscar páginas..."
									bind:value={search}
									icon="🔍"
									oninput={handleSearchChange}
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
									<ModernIcon name="X" size={16} className="mr-2" />
									Limpar Filtros
								</Button>
						{/if}
						
							{#if selectedIds.length > 0}
								<Button
									variant="ghost"
									onclick={deleteSelected}
									class="text-red-600 hover:text-red-700 hover:bg-red-50"
								>
									Excluir ({selectedIds.length})
								</Button>
							{/if}
						</div>
						

						
						<!-- Indicador de carregamento de filtros -->
						{#if isFiltering}
							<div class="mb-4 p-3 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg">
								<div class="flex items-center gap-2 text-sm text-[#00BFB3]">
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00BFB3]"></div>
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
									onchange={handleFilterChange}
								/>
								{#if statusFilter !== 'all'}
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
					data={pages}
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
					emptyMessage="Nenhuma página encontrada"
				/>
					</div>
				</div>
			</div>
		</div>

<svelte:head>
	<title>Páginas - Admin</title>
	<meta name="description" content="Gerencie páginas e posts do blog do sistema" />
</svelte:head> 