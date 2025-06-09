<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	let { productId = $bindable() } = $props();
	
	let stocks = $state<any[]>([]);
	let warehouses = $state<any[]>([]);
	let loading = $state(true);
	let showAddForm = $state(false);
	
	let newStock = $state({
		warehouse_id: '',
		quantity: 0,
		reserved_quantity: 0,
		location: '',
		low_stock_alert: 10,
		notes: ''
	});
	
	// Carregar dados
	async function loadData() {
		if (!productId) return;
		
		loading = true;
		try {
			const [stocksRes, warehousesRes] = await Promise.all([
				fetch(`/api/products/${productId}/stocks`),
				fetch('/api/warehouses')
			]);
			
			const stocksResult = await stocksRes.json();
			const warehousesResult = await warehousesRes.json();
			
			if (stocksResult.success) stocks = stocksResult.data || [];
			if (warehousesResult.success) warehouses = warehousesResult.data || [];
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao carregar dados');
		} finally {
			loading = false;
		}
	}
	
	// Adicionar estoque
	async function addStock() {
		if (!newStock.warehouse_id) {
			toast.error('Selecione um armazém');
			return;
		}
		
		try {
			const response = await fetch(`/api/products/${productId}/stocks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newStock)
			});
			
			const result = await response.json();
			
			if (result.success) {
				await loadData(); // Recarregar dados
				resetForm();
				toast.success('Estoque atualizado!');
			} else {
				toast.error(result.message || 'Erro ao salvar');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao salvar estoque');
		}
	}
	
	function resetForm() {
		newStock = {
			warehouse_id: '',
			quantity: 0,
			reserved_quantity: 0,
			location: '',
			low_stock_alert: 10,
			notes: ''
		};
		showAddForm = false;
	}
	
	// Calcular total de estoque
	let totalStock = $derived(stocks.reduce((total, stock) => total + (stock.quantity || 0), 0));
	let totalAvailable = $derived(stocks.reduce((total, stock) => total + (stock.available_quantity || 0), 0));
	
	// Validar se productId é um UUID válido
	function isValidUUID(id: string | undefined | null): boolean {
		if (!id || typeof id !== 'string') return false;
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		return uuidRegex.test(id);
	}
	
	$effect(() => {
		if (isValidUUID(productId)) {
			loadData();
		} else {
			// Para produtos novos ou sem ID válido, definir loading como false
			loading = false;
			stocks = [];
			warehouses = [];
		}
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h4 class="font-semibold text-gray-900 flex items-center gap-2">
			<ModernIcon name="Package" size="md" /> Estoques por Armazém
		</h4>
		<button
			type="button"
			onclick={() => showAddForm = !showAddForm}
			class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2"
		>
			<ModernIcon name="Plus" size="sm" /> Gerenciar Estoque
		</button>
	</div>
	
	<!-- Resumo Total -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
			<h5 class="font-medium text-gray-900">Total em Estoque</h5>
			<p class="text-2xl font-bold text-[#00BFB3]">{totalStock}</p>
		</div>
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
			<h5 class="font-medium text-gray-900">Disponível</h5>
			<p class="text-2xl font-bold text-[#00BFB3]">{totalAvailable}</p>
		</div>
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
			<h5 class="font-medium text-gray-900">Armazéns</h5>
			<p class="text-2xl font-bold text-[#00BFB3]">{stocks.length}</p>
		</div>
	</div>
	
	<!-- Loading -->
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
			<span class="ml-2 text-gray-600">Carregando estoques...</span>
		</div>
	{:else if !isValidUUID(productId)}
		<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
			<div class="text-4xl text-gray-300 mb-4">
				<ModernIcon name="Package" size="2xl" color="muted" />
			</div>
			<p class="text-gray-500">💡 Salve o produto primeiro</p>
			<p class="text-xs text-gray-500 mt-1">O gerenciamento de estoques estará disponível após salvar o produto</p>
		</div>
	{/if}
	
	<!-- Formulário -->
	{#if showAddForm && !loading}
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
			<h5 class="font-medium text-gray-900 mb-4">Gerenciar Estoque</h5>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Armazém *</label>
					<select bind:value={newStock.warehouse_id} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors">
						<option value="">Selecione um armazém</option>
						{#each warehouses as warehouse}
							<option value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Quantidade *</label>
					<input type="number" bind:value={newStock.quantity} min="0" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors" />
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Reservado</label>
					<input type="number" bind:value={newStock.reserved_quantity} min="0" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors" />
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Localização</label>
					<input type="text" bind:value={newStock.location} placeholder="A1-B2-C3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors" />
				</div>
			</div>
			
			<div class="flex gap-3 mt-6">
				<button type="button" onclick={addStock} class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2">
					<ModernIcon name="save" size="sm" /> Salvar
				</button>
				<button type="button" onclick={resetForm} class="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors">
					Cancelar
				</button>
			</div>
		</div>
	{/if}
	
	<!-- Lista de Estoques -->
	{#if !loading && stocks.length > 0}
		<div class="space-y-4">
			{#each stocks as stock}
				<div class="bg-white border border-gray-200 rounded-lg p-6">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<h5 class="font-medium text-gray-900">{stock.warehouse_name}</h5>
							<p class="text-sm text-gray-500 mb-3">{stock.warehouse_city}, {stock.warehouse_state}</p>
							
							<div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
								<div>
									<p class="text-gray-500">Quantidade:</p>
									<p class="font-bold text-lg">{stock.quantity || 0}</p>
								</div>
								<div>
									<p class="text-gray-500">Reservado:</p>
									<p class="font-medium text-orange-600">{stock.reserved_quantity || 0}</p>
								</div>
								<div>
									<p class="text-gray-500">Disponível:</p>
									<p class="font-medium text-green-600">{stock.available_quantity || 0}</p>
								</div>
								<div>
									<p class="text-gray-500">Localização:</p>
									<p class="font-medium">{stock.location || 'N/A'}</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if !loading && stocks.length === 0}
		<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
			<div class="text-4xl text-gray-300 mb-4">
				<ModernIcon name="Package" size="2xl" color="muted" />
			</div>
			<p class="text-gray-500">Nenhum estoque cadastrado</p>
			<p class="text-xs text-gray-500 mt-1">Gerencie estoque por armazém</p>
		</div>
	{/if}
</div> 