<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	
	interface Props {
		data?: any;
		errors?: Record<string, string>;
		disabled?: boolean;
	}
	
	const { data = {}, errors = {}, disabled = false }: Props = $props();
	
	const dispatch = createEventDispatcher();
	
	let products = $state<any[]>([]);
	let loadingProducts = $state(false);
	
	// Buscar produtos disponíveis
	async function loadProducts() {
		loadingProducts = true;
		console.log('🔍 Carregando produtos...');
		try {
			const response = await fetch('/api/products?limit=100&status=active');
			const result = await response.json();
			console.log('📦 Resposta da API:', { success: result.success, count: result.data?.length });
			if (result.success) {
				products = result.data || [];
				console.log('✅ Produtos carregados:', products.length);
			} else {
				console.error('❌ Erro na resposta da API:', result.error);
			}
		} catch (error) {
			console.error('❌ Erro ao carregar produtos:', error);
		} finally {
			loadingProducts = false;
		}
	}
	
	// Gerar SKU automático baseado no produto selecionado
	function generateSku() {
		if (data.product_id && products.length > 0) {
			const product = products.find(p => p.id === data.product_id);
			if (product) {
				const baseSku = product.sku || product.name.substring(0, 8).toUpperCase().replace(/\s/g, '');
				const timestamp = Date.now().toString().slice(-4);
				data.sku = `${baseSku}-VAR-${timestamp}`;
				dispatch('change', { field: 'sku', value: data.sku });
			}
		}
	}
	
	// Carregar nome do produto quando selecionado
	function updateProductName() {
		if (data.product_id && products.length > 0) {
			const product = products.find(p => p.id === data.product_id);
			if (product) {
				data.name = `${product.name} - ${data.sku || 'Variação'}`;
				data.product = product;
			}
		}
	}
	
	function handleChange(field: string, value: any) {
		data[field] = value;
		dispatch('change', { field, value });
		
		// Triggers especiais
		if (field === 'product_id') {
			updateProductName();
			if (!data.sku) {
				generateSku();
			}
		}
		if (field === 'sku') {
			updateProductName();
		}
	}
	
	onMount(() => {
		loadProducts();
	});
</script>

<div class="space-y-6">
	<!-- Header da Seção -->
	<div class="bg-gradient-to-r from-[#00BFB3]/5 to-[#00A89D]/5 p-4 rounded-lg border border-[#00BFB3]/10">
		<h3 class="text-lg font-semibold text-gray-900 flex items-center">
			<span class="w-8 h-8 bg-[#00BFB3] text-white rounded-lg flex items-center justify-center mr-3 text-sm font-bold">
				📦
			</span>
			Informações Básicas da Variação
		</h3>
		<p class="text-sm text-gray-600 mt-1">Configure as informações principais desta variação</p>
	</div>

	<!-- Seleção de Produto -->
	{#if loadingProducts}
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700">Produto Base *</label>
			<div class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
				<span class="text-gray-500">Carregando produtos...</span>
			</div>
		</div>
	{:else}
		<div class="space-y-2">
			<label for="product_id" class="block text-sm font-medium text-gray-700">Produto Base *</label>
			<select
				id="product_id"
				bind:value={data.product_id}
				{disabled}
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] {errors.product_id ? 'border-red-500' : ''}"
				onchange={(e) => handleChange('product_id', e.currentTarget.value)}
			>
				<option value="" disabled>Selecione o produto</option>
				{#each products as product}
					<option value={product.id}>{product.name} ({product.sku})</option>
				{/each}
			</select>
			{#if errors.product_id}
				<p class="text-sm text-red-600">{errors.product_id}</p>
			{/if}
			<p class="text-xs text-gray-500">
				{products.length} produtos disponíveis
			</p>
		</div>
	{/if}

	<!-- Grid de Informações Principais -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- SKU -->
		<div class="space-y-2">
			<label for="sku" class="block text-sm font-medium text-gray-700">SKU da Variação *</label>
			<input
				id="sku"
				type="text"
				bind:value={data.sku}
				{disabled}
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] {errors.sku ? 'border-red-500' : ''}"
				placeholder="Ex: PROD-VAR-001"
				oninput={(e) => handleChange('sku', e.currentTarget.value)}
			/>
			{#if errors.sku}
				<p class="text-sm text-red-600">{errors.sku}</p>
			{/if}
			<button
				type="button"
				class="text-[#00BFB3] hover:text-[#00A89D] text-sm font-medium"
				onclick={generateSku}
				disabled={disabled || !data.product_id}
			>
				🎲 Gerar SKU Automático
			</button>
		</div>
		
		<!-- Código de Barras -->
		<div class="space-y-2">
			<label for="barcode" class="block text-sm font-medium text-gray-700">Código de Barras</label>
			<input
				id="barcode"
				type="text"
				bind:value={data.barcode}
				{disabled}
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] {errors.barcode ? 'border-red-500' : ''}"
				placeholder="Ex: 7891234567890"
				oninput={(e) => handleChange('barcode', e.currentTarget.value)}
			/>
			{#if errors.barcode}
				<p class="text-sm text-red-600">{errors.barcode}</p>
			{/if}
		</div>
	</div>

	<!-- Produto Selecionado (Visualização) -->
	{#if data.product_id && data.product}
		<div class="bg-gray-50 p-4 rounded-lg border">
			<h4 class="font-medium text-gray-900 mb-2">Produto Selecionado:</h4>
			<div class="flex items-center space-x-3">
				<div class="w-12 h-12 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] rounded-lg flex items-center justify-center text-white font-bold">
					{data.product.name.charAt(0)}
				</div>
				<div>
					<div class="font-medium text-gray-900">{data.product.name}</div>
					<div class="text-sm text-gray-500">SKU: {data.product.sku}</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Status da Variação -->
	<div class="space-y-4">
		<h4 class="font-medium text-gray-900">Status</h4>
		
		<div class="space-y-2">
			<label class="flex items-center gap-3 cursor-pointer">
				<input
					id="is_active"
					type="checkbox"
					bind:checked={data.is_active}
					{disabled}
					class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					onchange={(e) => handleChange('is_active', e.currentTarget.checked)}
				/>
				<span class="text-sm font-medium text-gray-700">Variação Ativa</span>
			</label>
			{#if errors.is_active}
				<p class="text-sm text-red-600">{errors.is_active}</p>
			{/if}
			<div class="text-sm text-gray-600">
				{#if data.is_active}
					✅ Esta variação está ativa e disponível para venda
				{:else}
					❌ Esta variação está inativa e não aparecerá na loja
				{/if}
			</div>
		</div>
	</div>

	<!-- Informações de Ajuda -->
	<div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
		<h4 class="font-medium text-blue-900 mb-2">💡 Dicas</h4>
		<ul class="text-sm text-blue-800 space-y-1">
			<li>• O SKU deve ser único para cada variação</li>
			<li>• Use códigos que identifiquem facilmente a variação (cor, tamanho, etc.)</li>
			<li>• O código de barras é opcional mas recomendado para controle de estoque</li>
		</ul>
	</div>
</div>

<style>
	/* Estilos personalizados para consistência visual */
	:global(.form-field select:focus) {
		@apply border-[#00BFB3] ring-[#00BFB3];
	}
	
	:global(.form-field input:focus) {
		@apply border-[#00BFB3] ring-[#00BFB3];
	}
	
	:global(.checkbox:checked) {
		@apply bg-[#00BFB3] border-[#00BFB3];
	}
</style> 