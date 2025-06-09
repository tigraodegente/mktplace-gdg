<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	
	let { productId = $bindable() } = $props();
	
	// Estados
	let suppliers = $state<any[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let showAddForm = $state(false);
	
	// Novo fornecedor
	let newSupplier = $state({
		supplier_id: '',
		supplier_name: '',
		supplier_sku: '',
		cost: 0,
		currency: 'BRL',
		lead_time_days: 7,
		minimum_order_quantity: 1,
		is_primary: false,
		notes: ''
	});
	
	// Carregar fornecedores do produto
	async function loadSuppliers() {
		if (!productId) return;
		
		loading = true;
		try {
			const response = await fetch(`/api/suppliers?product_id=${productId}`);
			const result = await response.json();
			
			if (result.success) {
				suppliers = result.data || [];
			} else {
				toast.error('Erro ao carregar fornecedores');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao conectar com o servidor');
		} finally {
			loading = false;
		}
	}
	
	// Adicionar fornecedor
	async function addSupplier() {
		if (!newSupplier.supplier_name.trim()) {
			toast.error('Nome do fornecedor é obrigatório');
			return;
		}
		
		saving = true;
		try {
			const response = await fetch('/api/suppliers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...newSupplier,
					product_id: productId,
					supplier_id: newSupplier.supplier_id || crypto.randomUUID()
				})
			});
			
			const result = await response.json();
			
			if (result.success) {
				suppliers = [...suppliers, result.data];
				resetForm();
				toast.success('Fornecedor adicionado com sucesso!');
			} else {
				toast.error(result.message || 'Erro ao adicionar fornecedor');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao salvar fornecedor');
		} finally {
			saving = false;
		}
	}
	
	// Definir como fornecedor primário
	async function setPrimary(supplierId: string) {
		suppliers = suppliers.map(s => ({
			...s,
			is_primary: s.id === supplierId
		}));
		toast.success('Fornecedor principal atualizado');
	}
	
	// Remover fornecedor
	async function removeSupplier(supplierId: string) {
		if (!confirm('Tem certeza que deseja remover este fornecedor?')) return;
		suppliers = suppliers.filter(s => s.id !== supplierId);
		toast.success('Fornecedor removido');
	}
	
	// Resetar formulário
	function resetForm() {
		newSupplier = {
			supplier_id: '',
			supplier_name: '',
			supplier_sku: '',
			cost: 0,
			currency: 'BRL',
			lead_time_days: 7,
			minimum_order_quantity: 1,
			is_primary: false,
			notes: ''
		};
		showAddForm = false;
	}
	
	// Carregar quando o productId mudar
	$effect(() => {
		if (productId) {
			loadSuppliers();
		} else {
			// Para produtos novos ou sem ID, definir loading como false
			loading = false;
			suppliers = [];
		}
	});
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h4 class="font-semibold text-gray-900 flex items-center gap-2">
			<ModernIcon name="truck" size="md" /> Fornecedores ({suppliers.length})
		</h4>
		<button
			type="button"
			onclick={() => showAddForm = !showAddForm}
			class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2"
		>
			<ModernIcon name="Plus" size="sm" /> Adicionar Fornecedor
		</button>
	</div>
	
	<!-- Loading -->
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
			<span class="ml-2 text-gray-600">Carregando fornecedores...</span>
		</div>
	{:else if !productId}
		<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
			<div class="text-4xl text-gray-300 mb-4">
				<ModernIcon name="truck" size="2xl" color="muted" />
			</div>
			<p class="text-gray-500">💡 Salve o produto primeiro</p>
			<p class="text-xs text-gray-500 mt-1">O gerenciamento de fornecedores estará disponível após salvar o produto</p>
		</div>
	{/if}
	
	<!-- Formulário de Adicionar -->
	{#if showAddForm}
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
			<h5 class="font-medium text-gray-900 mb-4">Novo Fornecedor</h5>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Nome do Fornecedor -->
				<div class="md:col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Nome do Fornecedor *
					</label>
					<input
						type="text"
						bind:value={newSupplier.supplier_name}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Ex: Fornecedor ABC Ltda"
						required
					/>
				</div>
				
				<!-- SKU do Fornecedor -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						SKU do Fornecedor
					</label>
					<input
						type="text"
						bind:value={newSupplier.supplier_sku}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="SKU-FORN-001"
					/>
				</div>
				
				<!-- Preço de Custo -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Preço de Custo
					</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
						<input
							type="number"
							bind:value={newSupplier.cost}
							step="0.01"
							min="0"
							class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="0,00"
						/>
					</div>
				</div>
				
				<!-- Prazo de Entrega -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Prazo de Entrega (dias)
					</label>
					<input
						type="number"
						bind:value={newSupplier.lead_time_days}
						min="1"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="7"
					/>
				</div>
				
				<!-- Quantidade Mínima -->
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Quantidade Mínima
					</label>
					<input
						type="number"
						bind:value={newSupplier.minimum_order_quantity}
						min="1"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="1"
					/>
				</div>
				
				<!-- Fornecedor Principal -->
				<div class="md:col-span-2">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={newSupplier.is_primary}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900">Fornecedor Principal</span>
							<p class="text-xs text-gray-500">Usado como padrão para compras</p>
						</div>
					</label>
				</div>
				
				<!-- Observações -->
				<div class="md:col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Observações
					</label>
					<textarea
						bind:value={newSupplier.notes}
						rows="3"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="Observações sobre o fornecedor..."
					></textarea>
				</div>
			</div>
			
			<!-- Botões -->
			<div class="flex gap-3 mt-6">
				<button
					type="button"
					onclick={addSupplier}
					disabled={saving || !newSupplier.supplier_name.trim()}
					class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
				>
					{#if saving}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					{:else}
						<ModernIcon name="save" size="sm" />
					{/if}
					Salvar
				</button>
				<button
					type="button"
					onclick={resetForm}
					class="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
				>
					Cancelar
				</button>
			</div>
		</div>
	{/if}
	
	<!-- Lista de Fornecedores -->
	{#if !loading && suppliers.length > 0}
		<div class="space-y-4">
			{#each suppliers as supplier}
				<div class="bg-white border border-gray-200 rounded-lg p-6 {supplier.is_primary ? 'ring-2 ring-[#00BFB3] ring-opacity-20' : ''}">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<h5 class="font-medium text-gray-900">{supplier.supplier_name}</h5>
								{#if supplier.is_primary}
									<span class="px-2 py-1 bg-[#00BFB3] text-white text-xs rounded-full">Principal</span>
								{/if}
							</div>
							
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
								<div>
									<p class="text-gray-500">SKU Fornecedor:</p>
									<p class="font-medium">{supplier.supplier_sku || 'N/A'}</p>
								</div>
								<div>
									<p class="text-gray-500">Custo:</p>
									<p class="font-medium text-green-600">R$ {supplier.cost?.toFixed(2) || '0,00'}</p>
								</div>
								<div>
									<p class="text-gray-500">Prazo:</p>
									<p class="font-medium">{supplier.lead_time_days || 0} dias</p>
								</div>
							</div>
							
							{#if supplier.notes}
								<p class="text-sm text-gray-600 mt-3">{supplier.notes}</p>
							{/if}
						</div>
						
						<div class="flex gap-2 ml-4">
							{#if !supplier.is_primary}
								<button
									type="button"
									onclick={() => setPrimary(supplier.id)}
									class="p-2 text-[#00BFB3] hover:bg-[#00BFB3] hover:text-white rounded-lg transition-colors"
									title="Definir como principal"
								>
									<ModernIcon name="star" size="sm" />
								</button>
							{/if}
							<button
								type="button"
								onclick={() => removeSupplier(supplier.id)}
								class="p-2 text-red-600 hover:text-red-800 transition-colors"
								title="Remover fornecedor"
							>
								<ModernIcon name="delete" size="sm" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if !loading && suppliers.length === 0}
		<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
			<div class="text-4xl text-gray-300 mb-4">
				<ModernIcon name="truck" size="2xl" color="muted" />
			</div>
			<p class="text-gray-500 mt-2">Nenhum fornecedor cadastrado</p>
			<p class="text-xs text-gray-500 mt-1">Adicione fornecedores para gerenciar custos e prazos</p>
		</div>
	{/if}
</div> 