<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/services/api';
	import { toast } from '$lib/stores/toast';
	import { DataTable, Input, Select, Button } from '$lib/components/ui';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { useDebounce } from '$lib/hooks/useDebounce';
	import type { Product, PaginatedResponse } from '$lib/types';
	
	// Estados
	let products = $state<Product[]>([]);
	let loading = $state(true);
	let search = $state('');
	let statusFilter = $state('all');
	let categoryFilter = $state('all');
	let selectedIds = $state<string[]>([]);
	
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
	
	// Buscar produtos
	async function loadProducts() {
		loading = true;
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: pageSize.toString(),
				search,
				status: statusFilter,
				category: categoryFilter,
				sortBy,
				sortOrder
			});
			
			const response = await api.get<PaginatedResponse<Product>>(`/products?${params}`);
			
			if (response.success) {
				products = response.data.products || [];
				totalItems = response.data.pagination?.total || 0;
				stats = response.data.stats || stats;
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
	
	// Watchers
	$effect(() => {
		if (search !== undefined) debouncedSearch();
	});
	
	$effect(() => {
		if (statusFilter || categoryFilter || page) {
			loadProducts();
		}
	});
	
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
		if (!confirm(`Deseja excluir o produto "${product.name}"?`)) return;
		
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
	
	// Excluir produtos selecionados
	async function deleteSelected() {
		if (selectedIds.length === 0) return;
		
		if (!confirm(`Deseja excluir ${selectedIds.length} produto(s)?`)) return;
		
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
	
	// Buscar categorias e marcas
	async function loadFilters() {
		try {
			// Buscar categorias
			const catResponse = await api.get('/categories');
			if (catResponse.success) {
				categories = catResponse.data || [];
			}
			
			// Buscar marcas
			const brandResponse = await api.get('/brands');
			if (brandResponse.success) {
				brands = brandResponse.data || [];
			}
		} catch (error) {
			console.error('Erro ao carregar filtros:', error);
		}
	}
	
	// Lifecycle
	onMount(() => {
		loadProducts();
		loadFilters();
	});
</script>

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
		<!-- Cards de Estatísticas -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
			<div class="bg-white rounded-lg p-6 border border-gray-200">
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
			
			<div class="bg-white rounded-lg p-6 border border-gray-200">
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
			
			<div class="bg-white rounded-lg p-6 border border-gray-200">
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
			
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Estoque Baixo</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.lowStock}</p>
					</div>
					<div class="p-3 bg-red-100 rounded-lg">
						<ModernIcon name="AlertTriangle" size={24} color="#DC2626" />
					</div>
				</div>
			</div>
		</div>
		
		<!-- Filtros -->
		<div class="bg-white rounded-lg p-4 mb-6 border border-gray-200">
			<div class="flex flex-col gap-4">
				<!-- Primeira linha: Busca e ações -->
				<div class="flex flex-col md:flex-row gap-4">
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
					{/if}
				</div>
				
				<!-- Segunda linha: Filtros -->
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
					<Select
						bind:value={statusFilter}
						options={statusOptions}
						label="Status"
					/>
					
					<Select
						bind:value={categoryFilter}
						options={[
							{ value: 'all', label: 'Todas as Categorias' },
							...categories.map(c => ({ value: c.id, label: c.name }))
						]}
						label="Categoria"
					/>
					
					<Select
						bind:value={brandFilter}
						options={[
							{ value: 'all', label: 'Todas as Marcas' },
							...brands.map(b => ({ value: b.id, label: b.name }))
						]}
						label="Marca"
					/>
					
					<div class="flex gap-2">
						<Input
							type="number"
							placeholder="Min"
							bind:value={priceRange.min}
							label="Preço"
							class="w-1/2"
						/>
						<Input
							type="number"
							placeholder="Max"
							bind:value={priceRange.max}
							label="&nbsp;"
							class="w-1/2"
						/>
					</div>
				</div>
			</div>
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