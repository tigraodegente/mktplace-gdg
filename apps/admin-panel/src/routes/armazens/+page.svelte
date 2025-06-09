<script lang="ts">
	import { onMount } from 'svelte';
	import { DataTable, Button, Input, Select } from '$lib/components/ui';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	// Estados
	let warehouses = $state<any[]>([]);
	let loading = $state(true);
	let search = $state('');
	let activeFilter = $state('all');
	let selectedIds = $state<string[]>([]);
	
	// Paginação
	let page = $state(1);
	let pageSize = $state(20);
	let totalItems = $state(0);
	
	// Modal
	let showModal = $state(false);
	let editingWarehouse = $state<any>(null);
	let saving = $state(false);
	
	// Formulário
	let formData = $state({
		name: '',
		code: '',
		type: 'main',
		address: '',
		city: '',
		state: '',
		country: 'BR',
		postal_code: '',
		phone: '',
		email: '',
		is_active: true,
		is_default: false
	});
	
	// Stats
	let stats = $state({
		total: 0,
		active: 0,
		inactive: 0,
		main: 0,
		branch: 0
	});
	
	// Tipos de armazém
	const warehouseTypes = [
		{ value: 'main', label: 'Principal' },
		{ value: 'branch', label: 'Filial' },
		{ value: 'distribution', label: 'Distribuição' },
		{ value: 'storage', label: 'Armazenagem' }
	];
	
	// Estados brasileiros
	const brazilianStates = [
		{ value: 'SP', label: 'São Paulo' },
		{ value: 'RJ', label: 'Rio de Janeiro' },
		{ value: 'MG', label: 'Minas Gerais' },
		{ value: 'RS', label: 'Rio Grande do Sul' },
		{ value: 'PR', label: 'Paraná' },
		{ value: 'SC', label: 'Santa Catarina' },
		{ value: 'BA', label: 'Bahia' },
		{ value: 'GO', label: 'Goiás' },
		{ value: 'DF', label: 'Distrito Federal' },
		{ value: 'ES', label: 'Espírito Santo' }
	];
	
	// Colunas da tabela
	const columns = [
		{ key: 'name', label: 'Nome', sortable: true },
		{ key: 'code', label: 'Código', sortable: true },
		{ 
			key: 'type', 
			label: 'Tipo', 
			sortable: true,
			render: (value: string) => renderType(value)
		},
		{ key: 'city', label: 'Cidade', sortable: true },
		{ key: 'state', label: 'Estado', sortable: true },
		{ key: 'product_count', label: 'Produtos', sortable: true },
		{ 
			key: 'is_active', 
			label: 'Status', 
			sortable: true,
			render: (value: boolean) => renderStatus(value)
		},
		{ 
			key: 'actions', 
			label: 'Ações', 
			sortable: false,
			render: (value: any, row: any) => renderActions(row)
		}
	];
	
	// Buscar armazéns
	async function loadWarehouses() {
		loading = true;
		try {
			const params = new URLSearchParams({
				search,
				active: activeFilter,
				limit: pageSize.toString(),
				offset: ((page - 1) * pageSize).toString()
			});
			
			const response = await fetch(`/api/warehouses?${params}`);
			const result = await response.json();
			
			if (result.success) {
				warehouses = result.data;
				totalItems = result.meta.total;
				
				// Calcular estatísticas
				stats.total = result.meta.total;
				stats.active = warehouses.filter(w => w.is_active).length;
				stats.inactive = warehouses.filter(w => !w.is_active).length;
				stats.main = warehouses.filter(w => w.type === 'main').length;
				stats.branch = warehouses.filter(w => w.type === 'branch').length;
			} else {
				toast.error(result.error || 'Erro ao carregar armazéns');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao carregar armazéns');
		} finally {
			loading = false;
		}
	}
	
	// Abrir modal para criar
	function openCreateModal() {
		editingWarehouse = null;
		formData = {
			name: '',
			code: '',
			type: 'main',
			address: '',
			city: '',
			state: '',
			country: 'BR',
			postal_code: '',
			phone: '',
			email: '',
			is_active: true,
			is_default: false
		};
		showModal = true;
	}
	
	// Abrir modal para editar
	function openEditModal(warehouse: any) {
		editingWarehouse = warehouse;
		formData = {
			name: warehouse.name || '',
			code: warehouse.code || '',
			type: warehouse.type || 'main',
			address: warehouse.address || '',
			city: warehouse.city || '',
			state: warehouse.state || '',
			country: warehouse.country || 'BR',
			postal_code: warehouse.postal_code || '',
			phone: warehouse.phone || '',
			email: warehouse.email || '',
			is_active: warehouse.is_active ?? true,
			is_default: warehouse.is_default ?? false
		};
		showModal = true;
	}
	
	// Salvar armazém
	async function saveWarehouse() {
		if (!formData.name || !formData.code) {
			toast.error('Nome e código são obrigatórios');
			return;
		}
		
		saving = true;
		try {
			const method = editingWarehouse ? 'PUT' : 'POST';
			const data = editingWarehouse 
				? { ...formData, id: editingWarehouse.id }
				: formData;
			
			const response = await fetch('/api/warehouses', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			
			const result = await response.json();
			
			if (result.success) {
				toast.success(result.message);
				showModal = false;
				await loadWarehouses();
			} else {
				toast.error(result.error || 'Erro ao salvar armazém');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao salvar armazém');
		} finally {
			saving = false;
		}
	}
	
	// Excluir armazéns
	async function deleteWarehouses(ids: string[]) {
		if (!confirm(`Deseja excluir ${ids.length} armazém(ns)?`)) return;
		
		try {
			const response = await fetch('/api/warehouses', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids })
			});
			
			const result = await response.json();
			
			if (result.success) {
				toast.success(result.message);
				selectedIds = [];
				await loadWarehouses();
			} else {
				toast.error(result.error || 'Erro ao excluir armazéns');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao excluir armazéns');
		}
	}
	
	// Renderizar status
	function renderStatus(active: boolean) {
		return active
			? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>'
			: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inativo</span>';
	}
	
	// Renderizar tipo
	function renderType(type: string) {
		const types: Record<string, string> = {
			main: 'Principal',
			branch: 'Filial',
			distribution: 'Distribuição',
			storage: 'Armazenagem'
		};
		return types[type] || type;
	}
	
	// Renderizar ações
	function renderActions(warehouse: any) {
		return `
			<div class="flex items-center gap-2">
				<button onclick="editWarehouse('${warehouse.id}')" 
					class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
						<path d="m18.5 2.5 3 3L12 15l-4 1 1-4Z"></path>
					</svg>
				</button>
				<button onclick="deleteWarehouse('${warehouse.id}')" 
					class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m3 6 3 0"></path>
						<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
						<path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
						<path d="m10 11 0 6"></path>
						<path d="m14 11 0 6"></path>
					</svg>
				</button>
			</div>
		`;
	}
	
	// Handlers para os botões da tabela
	function setupTableHandlers() {
		(window as any).editWarehouse = (id: string) => {
			const warehouse = warehouses.find(w => w.id === id);
			if (warehouse) openEditModal(warehouse);
		};
		
		(window as any).deleteWarehouse = (id: string) => {
			deleteWarehouses([id]);
		};
	}
	
	// Lifecycle
	onMount(() => {
		loadWarehouses();
		setupTableHandlers();
	});
	
	// Watchers
	$effect(() => {
		if (search !== undefined || activeFilter !== undefined) {
			page = 1;
			loadWarehouses();
		}
	});
</script>

<svelte:head>
	<title>Armazéns - Admin Panel</title>
</svelte:head>

<div class="p-6 space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
				<ModernIcon name="Package" size="lg" />
				Gestão de Armazéns
			</h1>
			<p class="text-gray-600">Gerencie seus armazéns e centros de distribuição</p>
		</div>
		
		<div class="flex items-center gap-3">
			{#if selectedIds.length > 0}
				<Button 
					variant="danger" 
					onclick={() => deleteWarehouses(selectedIds)}
				>
					<ModernIcon name="trash" size="sm" />
					Excluir ({selectedIds.length})
				</Button>
			{/if}
			
			<Button onclick={openCreateModal} class="bg-[#00BFB3] hover:bg-[#00A89D] text-white">
				<ModernIcon name="plus" size="sm" />
				Novo Armazém
			</Button>
		</div>
	</div>
	
	<!-- Stats Cards -->
	<div class="grid grid-cols-1 md:grid-cols-5 gap-4">
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total</p>
					<p class="text-2xl font-bold text-gray-900">{stats.total}</p>
				</div>
				<div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="Package" size="sm" color="text-blue-600" />
				</div>
			</div>
		</div>
		
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Ativos</p>
					<p class="text-2xl font-bold text-green-600">{stats.active}</p>
				</div>
				<div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="check-circle" size="sm" color="text-green-600" />
				</div>
			</div>
		</div>
		
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Inativos</p>
					<p class="text-2xl font-bold text-red-600">{stats.inactive}</p>
				</div>
				<div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="x" size="sm" color="text-red-600" />
				</div>
			</div>
		</div>
		
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Principais</p>
					<p class="text-2xl font-bold text-purple-600">{stats.main}</p>
				</div>
				<div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="box" size="sm" color="text-purple-600" />
				</div>
			</div>
		</div>
		
		<div class="bg-white rounded-lg border border-gray-200 p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Filiais</p>
					<p class="text-2xl font-bold text-orange-600">{stats.branch}</p>
				</div>
				<div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="location" size="sm" color="text-orange-600" />
				</div>
			</div>
		</div>
	</div>
	
	<!-- Filtros -->
	<div class="bg-white rounded-lg border border-gray-200 p-4">
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<Input
				bind:value={search}
				placeholder="Buscar por nome, código ou cidade..."
				class="flex-1"
			>
				<ModernIcon name="search" size="sm" slot="prepend" />
			</Input>
			
			<Select bind:value={activeFilter}>
				<option value="all">Todos os status</option>
				<option value="true">Apenas ativos</option>
				<option value="false">Apenas inativos</option>
			</Select>
			
			<Button 
				variant="secondary" 
				onclick={loadWarehouses}
				disabled={loading}
			>
				<ModernIcon name="refresh" size="sm" />
				Atualizar
			</Button>
		</div>
	</div>
	
	<!-- Tabela -->
	<div class="bg-white rounded-lg border border-gray-200">
		<DataTable
			{columns}
			data={warehouses}
			bind:selectedIds
			{loading}
			{page}
			{pageSize}
			{totalItems}
			onPageChange={(newPage) => { page = newPage; loadWarehouses(); }}
		/>
	</div>
</div>

<!-- Modal de Criação/Edição -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
		<div class="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
			<div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-gray-900">
						{editingWarehouse ? 'Editar Armazém' : 'Novo Armazém'}
					</h2>
					<button 
						onclick={() => showModal = false}
						class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ModernIcon name="X" size="sm" />
					</button>
				</div>
			</div>
			
			<div class="p-6 space-y-6">
				<!-- Informações Básicas -->
				<div class="space-y-4">
					<h3 class="text-lg font-medium text-gray-900">Informações Básicas</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Nome do Armazém *
							</label>
							<input
								type="text"
								bind:value={formData.name}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								placeholder="Ex: Armazém Principal"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Código *
							</label>
							<input
								type="text"
								bind:value={formData.code}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								placeholder="Ex: ARM001"
							/>
						</div>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Tipo de Armazém
						</label>
						<select
							bind:value={formData.type}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
						>
							{#each warehouseTypes as type}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</div>
				</div>
				
				<!-- Endereço -->
				<div class="space-y-4">
					<h3 class="text-lg font-medium text-gray-900">Endereço</h3>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Endereço
						</label>
						<input
							type="text"
							bind:value={formData.address}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							placeholder="Rua, número, bairro"
						/>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Cidade
							</label>
							<input
								type="text"
								bind:value={formData.city}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								placeholder="Ex: São Paulo"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Estado
							</label>
							<select
								bind:value={formData.state}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
							>
								<option value="">Selecione...</option>
								{#each brazilianStates as state}
									<option value={state.value}>{state.label}</option>
								{/each}
							</select>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								CEP
							</label>
							<input
								type="text"
								bind:value={formData.postal_code}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								placeholder="00000-000"
							/>
						</div>
					</div>
				</div>
				
				<!-- Contato -->
				<div class="space-y-4">
					<h3 class="text-lg font-medium text-gray-900">Contato</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Telefone
							</label>
							<input
								type="tel"
								bind:value={formData.phone}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								placeholder="(11) 99999-9999"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								E-mail
							</label>
							<input
								type="email"
								bind:value={formData.email}
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
								placeholder="armazem@exemplo.com"
							/>
						</div>
					</div>
				</div>
				
				<!-- Configurações -->
				<div class="space-y-4">
					<h3 class="text-lg font-medium text-gray-900">Configurações</h3>
					
					<div class="space-y-3">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="is_active"
								bind:checked={formData.is_active}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
							/>
							<label for="is_active" class="ml-2 text-sm text-gray-700">
								Armazém ativo
							</label>
						</div>
						
						<div class="flex items-center">
							<input
								type="checkbox"
								id="is_default"
								bind:checked={formData.is_default}
								class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3]"
							/>
							<label for="is_default" class="ml-2 text-sm text-gray-700">
								Armazém padrão (principal)
							</label>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
				<div class="flex items-center justify-end gap-3">
					<Button 
						variant="outline" 
						onclick={() => showModal = false}
						disabled={saving}
					>
						Cancelar
					</Button>
					
					<Button 
						onclick={saveWarehouse}
						disabled={saving || !formData.name || !formData.code}
						class="bg-[#00BFB3] hover:bg-[#00A89D] text-white"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							Salvando...
						{:else}
							<ModernIcon name="Save" size="sm" />
							{editingWarehouse ? 'Atualizar' : 'Criar'} Armazém
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if} 