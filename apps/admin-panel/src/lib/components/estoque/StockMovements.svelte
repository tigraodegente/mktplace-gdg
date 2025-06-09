<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import DataTable from '$lib/components/ui/DataTable.svelte';
	
	// Props
	interface Props {
		productId?: string;
		warehouseId?: string;
	}
	
	let { productId, warehouseId }: Props = $props();
	
	// Estados
	let movements = $state<any[]>([]);
	let stats = $state<any[]>([]);
	let loading = $state(true);
	let showAddForm = $state(false);
	let pagination = $state({ page: 1, limit: 20, total: 0, totalPages: 0 });
	
	// Filtros
	let filters = $state({
		movement_type: '',
		start_date: '',
		end_date: '',
		page: 1
	});
	
	// Formulário de nova movimentação
	let newMovement = $state({
		product_id: productId || '',
		warehouse_id: warehouseId || '',
		movement_type: '',
		quantity_change: 0,
		unit_cost: 0,
		reference_type: 'manual',
		reference_id: '',
		notes: ''
	});
	
	// Produtos e armazéns para seleção
	let products = $state<any[]>([]);
	let warehouses = $state<any[]>([]);
	
	// Tipos de movimentação
	const movementTypes = [
		{ value: 'purchase', label: '📦 Compra', color: 'green' },
		{ value: 'sale', label: '🛒 Venda', color: 'blue' },
		{ value: 'adjustment', label: '⚖️ Ajuste', color: 'yellow' },
		{ value: 'transfer', label: '🔄 Transferência', color: 'purple' },
		{ value: 'return', label: '↩️ Devolução', color: 'orange' },
		{ value: 'loss', label: '❌ Perda', color: 'red' },
		{ value: 'found', label: '✅ Encontrado', color: 'green' }
	];
	
	// Colunas da tabela
	const columns = [
		{ key: 'created_at', label: 'Data/Hora', sortable: true },
		{ key: 'product_name', label: 'Produto' },
		{ key: 'movement_type', label: 'Tipo' },
		{ key: 'quantity_change', label: 'Quantidade' },
		{ key: 'quantity_after', label: 'Saldo Final' },
		{ key: 'total_cost', label: 'Valor' },
		{ key: 'user_name', label: 'Usuário' },
		{ key: 'actions', label: 'Ações' }
	];
	
	// Carregar dados
	async function loadData() {
		loading = true;
		try {
			const params = new URLSearchParams();
			
			if (productId) params.append('product_id', productId);
			if (warehouseId) params.append('warehouse_id', warehouseId);
			if (filters.movement_type) params.append('movement_type', filters.movement_type);
			if (filters.start_date) params.append('start_date', filters.start_date);
			if (filters.end_date) params.append('end_date', filters.end_date);
			params.append('page', filters.page.toString());
			params.append('limit', pagination.limit.toString());
			
			const response = await fetch(`/api/stock/movements?${params}`);
			const result = await response.json();
			
			if (result.success) {
				movements = result.data.movements || [];
				stats = result.data.stats || [];
				pagination = result.data.pagination;
				console.log('✅ Movimentações carregadas:', movements.length);
			} else {
				toast.error(result.error || 'Erro ao carregar movimentações');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao carregar dados');
		} finally {
			loading = false;
		}
	}
	
	// Carregar produtos e armazéns
	async function loadSelectOptions() {
		try {
			const [productsRes, warehousesRes] = await Promise.all([
				fetch('/api/products?limit=1000'),
				fetch('/api/warehouses')
			]);
			
			const productsResult = await productsRes.json();
			const warehousesResult = await warehousesRes.json();
			
			if (productsResult.success) {
				products = productsResult.data?.products || [];
			}
			
			if (warehousesResult.success) {
				warehouses = warehousesResult.data || [];
			}
		} catch (error) {
			console.error('Erro ao carregar opções:', error);
		}
	}
	
	// Adicionar movimentação
	async function addMovement() {
		try {
			if (!newMovement.product_id || !newMovement.movement_type || !newMovement.quantity_change) {
				toast.error('Preencha todos os campos obrigatórios');
				return;
			}
			
			const response = await fetch('/api/stock/movements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newMovement)
			});
			
			const result = await response.json();
			
			if (result.success) {
				await loadData();
				resetForm();
				toast.success('Movimentação registrada com sucesso!');
			} else {
				toast.error(result.error || 'Erro ao registrar movimentação');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao registrar movimentação');
		}
	}
	
	// Resetar formulário
	function resetForm() {
		newMovement = {
			product_id: productId || '',
			warehouse_id: warehouseId || '',
			movement_type: '',
			quantity_change: 0,
			unit_cost: 0,
			reference_type: 'manual',
			reference_id: '',
			notes: ''
		};
		showAddForm = false;
	}
	
	// Formatar data
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString('pt-BR');
	}
	
	// Formatar valor monetário
	function formatCurrency(value: number) {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(value || 0);
	}
	
	// Obter configuração do tipo de movimentação
	function getMovementTypeConfig(type: string) {
		return movementTypes.find(t => t.value === type) || { label: type, color: 'gray' };
	}
	
	// Aplicar filtros
	function applyFilters() {
		filters.page = 1;
		loadData();
	}
	
	// Limpar filtros
	function clearFilters() {
		filters = {
			movement_type: '',
			start_date: '',
			end_date: '',
			page: 1
		};
		loadData();
	}
	
	onMount(() => {
		loadData();
		loadSelectOptions();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-2xl font-bold text-gray-900">Movimentações de Estoque</h3>
			<p class="text-gray-600">Histórico de entradas e saídas de produtos</p>
		</div>
		<button
			type="button"
			onclick={() => showAddForm = !showAddForm}
			class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2"
		>
			<ModernIcon name="Plus" size="sm" />
			Nova Movimentação
		</button>
	</div>
	
	<!-- Estatísticas Resumidas -->
	{#if stats.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
			{#each stats as stat}
				{@const config = getMovementTypeConfig(stat.movement_type)}
				<div class="bg-white border border-gray-200 rounded-lg p-4">
					<div class="flex items-center gap-3">
						<div class="w-3 h-3 rounded-full bg-{config.color}-500"></div>
						<div class="flex-1">
							<p class="text-sm text-gray-600">{config.label}</p>
							<p class="text-lg font-bold text-gray-900">{stat.count}</p>
							<p class="text-xs text-gray-500">
								{stat.total_quantity} unid. • {formatCurrency(stat.total_value)}
							</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	
	<!-- Filtros -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-medium text-gray-900 mb-4">Filtros</h4>
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimentação</label>
				<select bind:value={filters.movement_type} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]">
					<option value="">Todos os tipos</option>
					{#each movementTypes as type}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>
			
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
				<input type="date" bind:value={filters.start_date} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]" />
			</div>
			
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
				<input type="date" bind:value={filters.end_date} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]" />
			</div>
			
			<div class="flex items-end gap-2">
				<button type="button" onclick={applyFilters} class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
					Filtrar
				</button>
				<button type="button" onclick={clearFilters} class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
					Limpar
				</button>
			</div>
		</div>
	</div>
	
	<!-- Formulário de Nova Movimentação -->
	{#if showAddForm}
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<h4 class="font-medium text-gray-900 mb-4">Nova Movimentação</h4>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Produto *</label>
					<select bind:value={newMovement.product_id} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]">
						<option value="">Selecione um produto</option>
						{#each products as product}
							<option value={product.id}>{product.name} ({product.sku})</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Armazém</label>
					<select bind:value={newMovement.warehouse_id} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]">
						<option value="">Armazém principal</option>
						{#each warehouses as warehouse}
							<option value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimentação *</label>
					<select bind:value={newMovement.movement_type} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]">
						<option value="">Selecione o tipo</option>
						{#each movementTypes as type}
							<option value={type.value}>{type.label}</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Quantidade *</label>
					<input type="number" bind:value={newMovement.quantity_change} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]" />
					<p class="text-xs text-gray-500 mt-1">Use números negativos para saídas</p>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Custo Unitário (R$)</label>
					<input type="number" step="0.01" bind:value={newMovement.unit_cost} class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]" />
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Referência</label>
					<input type="text" bind:value={newMovement.reference_id} placeholder="ID do pedido, compra, etc." class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]" />
				</div>
				
				<div class="md:col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-2">Observações</label>
					<textarea bind:value={newMovement.notes} rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"></textarea>
				</div>
			</div>
			
			<div class="flex gap-3 mt-6">
				<button type="button" onclick={addMovement} class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
					Registrar Movimentação
				</button>
				<button type="button" onclick={resetForm} class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
					Cancelar
				</button>
			</div>
		</div>
	{/if}
	
	<!-- Tabela de Movimentações -->
	<div class="bg-white border border-gray-200 rounded-lg">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
				<span class="ml-2 text-gray-600">Carregando movimentações...</span>
			</div>
		{:else if movements.length === 0}
			<div class="text-center py-12">
				<ModernIcon name="Package" size="xl" class="mx-auto text-gray-400 mb-4" />
				<h3 class="text-lg font-medium text-gray-900 mb-2">Nenhuma movimentação encontrada</h3>
				<p class="text-gray-600">Registre a primeira movimentação de estoque</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							{#each columns as column}
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									{column.label}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each movements as movement}
							{@const config = getMovementTypeConfig(movement.movement_type)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatDate(movement.created_at)}
								</td>
								<td class="px-6 py-4 text-sm">
									<div>
										<div class="font-medium text-gray-900">{movement.product_name}</div>
										<div class="text-gray-500">{movement.product_sku}</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-{config.color}-100 text-{config.color}-800">
										{config.label}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm">
									<span class="font-medium {movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}">
										{movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
									{movement.quantity_after}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
									{formatCurrency(movement.total_cost)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{movement.user_name || 'Sistema'}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{#if movement.notes}
										<button type="button" title={movement.notes} class="text-[#00BFB3] hover:text-[#00A89D]">
											<ModernIcon name="MessageSquare" size="sm" />
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			
			<!-- Paginação -->
			{#if pagination.totalPages > 1}
				<div class="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
					<div class="text-sm text-gray-700">
						Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
					</div>
					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => { filters.page = Math.max(1, filters.page - 1); loadData(); }}
							disabled={pagination.page <= 1}
							class="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
						>
							Anterior
						</button>
						<span class="px-3 py-2 text-sm text-gray-700">
							Página {pagination.page} de {pagination.totalPages}
						</span>
						<button
							type="button"
							onclick={() => { filters.page = Math.min(pagination.totalPages, filters.page + 1); loadData(); }}
							disabled={pagination.page >= pagination.totalPages}
							class="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
						>
							Próximo
						</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div> 