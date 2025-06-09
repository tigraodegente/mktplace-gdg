<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { DataTable, Button, Input, Select } from '$lib/components/ui';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	// Estados
	let variations = $state<any[]>([]);
	let loading = $state(true);
	let search = $state('');
	let typeFilter = $state('all');
	let selectedIds = $state<string[]>([]);
	
	// Paginação
	let page = $state(1);
	let pageSize = $state(20);
	let totalItems = $state(0);
	
	// Stats
	let stats = $state({
		total: 0,
		active: 0,
		types: 0,
		products: 0
	});
	
	// Tipos de variação
	const variationTypes = [
		{ value: 'all', label: 'Todos os Tipos' },
		{ value: 'color', label: 'Cor' },
		{ value: 'size', label: 'Tamanho' },
		{ value: 'material', label: 'Material' },
		{ value: 'style', label: 'Estilo' },
		{ value: 'weight', label: 'Peso' },
		{ value: 'voltage', label: 'Voltagem' },
		{ value: 'capacity', label: 'Capacidade' },
		{ value: 'flavor', label: 'Sabor' }
	];
	
	// Colunas da tabela
	const columns = [
		{
			key: 'name',
			label: 'Nome da Variação',
			sortable: true,
			render: (value: string, row: any) => `
				<div>
					<div class="font-medium text-gray-900">${row.name}</div>
					<div class="text-sm text-gray-500">Tipo: ${row.type}</div>
				</div>
			`
		},
		{
			key: 'values',
			label: 'Valores',
			render: (value: string[], row: any) => {
				const values = Array.isArray(value) ? value : [];
				const displayValues = values.slice(0, 3);
				const remaining = values.length - 3;
				
				return `
					<div class="flex flex-wrap gap-1">
						${displayValues.map(v => `<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${v}</span>`).join('')}
						${remaining > 0 ? `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">+${remaining}</span>` : ''}
					</div>
				`;
			}
		},
		{
			key: 'products_count',
			label: 'Produtos',
			sortable: true,
			align: 'center' as const,
			render: (value: number) => `
				<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
					${value || 0} produtos
				</span>
			`
		},
		{
			key: 'is_active',
			label: 'Status',
			sortable: true,
			align: 'center' as const,
			render: (value: boolean) => {
				const status = value ? 'Ativa' : 'Inativa';
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
	
	// Carregar variações
	async function loadVariations() {
		loading = true;
		try {
			// Simular dados enquanto não há API
			const mockVariations = [
				{
					id: '1',
					name: 'Cor',
					type: 'color',
					values: ['Azul', 'Vermelho', 'Verde', 'Amarelo', 'Preto', 'Branco'],
					products_count: 45,
					is_active: true,
					created_at: '2024-01-15T10:00:00Z'
				},
				{
					id: '2',
					name: 'Tamanho Roupa',
					type: 'size',
					values: ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
					products_count: 32,
					is_active: true,
					created_at: '2024-01-10T14:30:00Z'
				},
				{
					id: '3',
					name: 'Material',
					type: 'material',
					values: ['Algodão', 'Poliéster', 'Linho', 'Seda'],
					products_count: 18,
					is_active: true,
					created_at: '2024-01-05T09:15:00Z'
				},
				{
					id: '4',
					name: 'Voltagem',
					type: 'voltage',
					values: ['110V', '220V', 'Bivolt'],
					products_count: 12,
					is_active: false,
					created_at: '2024-01-01T16:45:00Z'
				}
			];
			
			// Filtrar por busca e tipo
			let filtered = mockVariations;
			
			if (search) {
				filtered = filtered.filter(v => 
					v.name.toLowerCase().includes(search.toLowerCase()) ||
					v.type.toLowerCase().includes(search.toLowerCase()) ||
					v.values.some(val => val.toLowerCase().includes(search.toLowerCase()))
				);
			}
			
			if (typeFilter !== 'all') {
				filtered = filtered.filter(v => v.type === typeFilter);
			}
			
			variations = filtered;
			totalItems = filtered.length;
			
			// Atualizar stats
			stats = {
				total: mockVariations.length,
				active: mockVariations.filter(v => v.is_active).length,
				types: [...new Set(mockVariations.map(v => v.type))].length,
				products: mockVariations.reduce((sum, v) => sum + v.products_count, 0)
			};
			
		} catch (error) {
			console.error('Erro ao carregar variações:', error);
			toast.error('Erro ao carregar variações');
		} finally {
			loading = false;
		}
	}
	
	// Filtros
	function applyFilters() {
		page = 1;
		loadVariations();
	}
	
	function clearFilters() {
		search = '';
		typeFilter = 'all';
		applyFilters();
	}
	
	function hasActiveFilters() {
		return search !== '' || typeFilter !== 'all';
	}
	
	// Ações da tabela
	function getTableActions(row: any) {
		return [
			{
				label: 'Editar',
				icon: 'Edit',
				onclick: () => goto(`/variacoes/${row.id}`)
			},
			{
				label: 'Excluir',
				icon: 'delete',
				onclick: () => deleteVariation(row)
			}
		];
	}
	
	// Excluir variação
	function deleteVariation(variation: any) {
		if (confirm(`Tem certeza que deseja excluir a variação "${variation.name}"?`)) {
			toast.success('Variação excluída com sucesso!');
			loadVariations();
		}
	}
	
	// Excluir selecionados
	function deleteSelected() {
		if (selectedIds.length === 0) return;
		
		if (confirm(`Tem certeza que deseja excluir ${selectedIds.length} variação(ões)?`)) {
			toast.success(`${selectedIds.length} variação(ões) excluída(s) com sucesso!`);
			selectedIds = [];
			loadVariations();
		}
	}
	
	onMount(() => {
		loadVariations();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Variações de Produtos</h1>
					<p class="text-sm text-gray-500 mt-1">
						Gerencie os tipos de variações disponíveis para seus produtos
					</p>
				</div>
				
				<div class="flex items-center gap-3">
					<Button onclick={() => goto('/variacoes/nova')} class="flex items-center gap-2">
						<ModernIcon name="plus" size="sm" />
						Nova Variação
					</Button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Stats Cards -->
	<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
			<!-- Total -->
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Total de Variações</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
					</div>
					<div class="p-3 bg-blue-100 rounded-lg">
						<ModernIcon name="layers" size={24} color="#3B82F6" />
					</div>
				</div>
			</div>
			
			<!-- Ativas -->
			<div class="bg-green-50 rounded-lg p-6 border border-green-100">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Ativas</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
					</div>
					<div class="p-3 bg-green-100 rounded-lg">
						<ModernIcon name="check-circle" size={24} color="#10B981" />
					</div>
				</div>
			</div>
			
			<!-- Tipos -->
			<div class="bg-purple-50 rounded-lg p-6 border border-purple-100">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Tipos Diferentes</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.types}</p>
					</div>
					<div class="p-3 bg-purple-100 rounded-lg">
						<ModernIcon name="tag" size={24} color="#8B5CF6" />
					</div>
				</div>
			</div>
			
			<!-- Produtos -->
			<div class="bg-orange-50 rounded-lg p-6 border border-orange-100">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Produtos com Variações</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.products}</p>
					</div>
					<div class="p-3 bg-orange-100 rounded-lg">
						<ModernIcon name="package" size={24} color="#F59E0B" />
					</div>
				</div>
			</div>
		</div>
		
		<!-- Filtros -->
		<div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
			<div class="flex items-center gap-3 mb-4">
				<ModernIcon name="filter" size="md" color="#6B7280" />
				<h3 class="text-lg font-semibold text-gray-900">Filtros</h3>
				{#if hasActiveFilters()}
					<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
						Filtros ativos
					</span>
				{/if}
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Busca -->
				<div>
					<label for="search" class="block text-sm font-medium text-gray-700 mb-1">
						Buscar variações
					</label>
					<Input
						id="search"
						bind:value={search}
						oninput={applyFilters}
						placeholder="Nome, tipo ou valores..."
						class="w-full"
					/>
				</div>
				
				<!-- Tipo -->
				<div>
					<label for="type" class="block text-sm font-medium text-gray-700 mb-1">
						Tipo
					</label>
					<Select
						id="type"
						bind:value={typeFilter}
						onchange={applyFilters}
						options={variationTypes}
						class="w-full"
					/>
				</div>
				
				<!-- Limpar -->
				<div class="flex items-end">
					{#if hasActiveFilters()}
						<Button variant="secondary" onclick={clearFilters} class="w-full">
							<ModernIcon name="x" size="sm" class="mr-1" />
							Limpar Filtros
						</Button>
					{/if}
				</div>
			</div>
		</div>
		
		<!-- Tabela -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			{#if selectedIds.length > 0}
				<div class="p-4 border-b border-gray-200 bg-blue-50">
					<div class="flex items-center gap-2">
						<span class="text-sm text-gray-600">
							{selectedIds.length} item(s) selecionado(s)
						</span>
						<Button 
							onclick={deleteSelected}
							variant="secondary" 
							size="sm"
							class="ml-auto"
						>
							<ModernIcon name="trash" size="sm" class="mr-1" />
							Excluir Selecionados
						</Button>
					</div>
				</div>
			{/if}
			
			<div class="p-4">
				<DataTable
					data={variations}
					{columns}
					{loading}
					showSelection={true}
					bind:selectedIds
					getActions={getTableActions}
					emptyMessage="Nenhuma variação encontrada"
					class="w-full"
				/>
			</div>
		</div>
	</div>
</div> 