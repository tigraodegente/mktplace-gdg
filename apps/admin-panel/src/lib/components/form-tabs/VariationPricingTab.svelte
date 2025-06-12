<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface Props {
		data?: any;
		errors?: Record<string, string>;
		disabled?: boolean;
	}
	
	const { data = {}, errors = {}, disabled = false }: Props = $props();
	
	const dispatch = createEventDispatcher();
	
	// Calcular margem de lucro
	const profit = $derived(data.price && data.cost ? data.price - data.cost : 0);
	const margin = $derived(data.price && data.cost && data.price > 0 ? ((profit / data.price) * 100).toFixed(2) : '0.00');
	
	function handleChange(field: string, value: any) {
		data[field] = value;
		dispatch('change', { field, value });
	}
</script>

<div class="space-y-6">
	<!-- Header da Seção -->
	<div class="bg-gradient-to-r from-[#00BFB3]/5 to-[#00A89D]/5 p-4 rounded-lg border border-[#00BFB3]/10">
		<h3 class="text-lg font-semibold text-gray-900 flex items-center">
			<span class="w-8 h-8 bg-[#00BFB3] text-white rounded-lg flex items-center justify-center mr-3 text-sm font-bold">
				💰
			</span>
			Preços da Variação
		</h3>
		<p class="text-sm text-gray-600 mt-1">Configure os valores de venda e custo desta variação</p>
	</div>

	<!-- Grid de Preços -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<!-- Preço de Venda -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700">
				Preço de Venda *
			</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
				<input
					type="number"
					step="0.01"
					min="0"
					value={data.price || ''}
					{disabled}
					class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] {errors.price ? 'border-red-500' : ''}"
					placeholder="0,00"
					on:input={(e) => handleChange('price', parseFloat(e.currentTarget.value) || 0)}
				/>
			</div>
			{#if errors.price}
				<p class="text-sm text-red-600">{errors.price}</p>
			{/if}
		</div>

		<!-- Preço Original (Desconto) -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700">
				Preço Original (Riscado)
			</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
				<input
					type="number"
					step="0.01"
					min="0"
					value={data.original_price || ''}
					{disabled}
					class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] {errors.original_price ? 'border-red-500' : ''}"
					placeholder="0,00"
					on:input={(e) => handleChange('original_price', parseFloat(e.currentTarget.value) || null)}
				/>
			</div>
			<p class="text-xs text-gray-500">
				Usado para mostrar desconto na loja
			</p>
		</div>

		<!-- Custo -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700">
				Custo da Variação
			</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
				<input
					type="number"
					step="0.01"
					min="0"
					value={data.cost || ''}
					{disabled}
					class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] {errors.cost ? 'border-red-500' : ''}"
					placeholder="0,00"
					on:input={(e) => handleChange('cost', parseFloat(e.currentTarget.value) || 0)}
				/>
			</div>
			<p class="text-xs text-gray-500">
				Para cálculo de margem de lucro
			</p>
		</div>
	</div>

	<!-- Cálculos de Margem -->
	{#if data.price > 0 || data.cost > 0}
		<div class="bg-gray-50 p-4 rounded-lg border">
			<h4 class="font-medium text-gray-900 mb-3">📊 Análise de Margem</h4>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-[#00BFB3]">
						R$ {profit.toFixed(2)}
					</div>
					<div class="text-sm text-gray-600">Lucro Bruto</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-[#00BFB3]">
						{margin}%
					</div>
					<div class="text-sm text-gray-600">Margem de Lucro</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold {data.original_price && data.original_price > data.price ? 'text-[#00BFB3]' : 'text-gray-400'}">
						{data.original_price && data.original_price > data.price 
							? Math.round(((data.original_price - data.price) / data.original_price) * 100) + '%'
							: 'Sem desconto'
						}
					</div>
					<div class="text-sm text-gray-600">Desconto</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Alertas de Preço -->
	{#if data.price && data.cost}
		{#if data.price < data.cost}
			<div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<span class="text-orange-400">⚠️</span>
					</div>
					<div class="ml-3">
						<h4 class="text-sm font-medium text-orange-800">Atenção: Preço abaixo do custo!</h4>
						<p class="text-sm text-orange-700">O preço de venda é menor que o custo. Você terá prejuízo.</p>
					</div>
				</div>
			</div>
		{:else if parseFloat(margin) < 20}
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<span class="text-yellow-400">⚠️</span>
					</div>
					<div class="ml-3">
						<h4 class="text-sm font-medium text-yellow-800">Margem baixa</h4>
						<p class="text-sm text-yellow-700">Margem de lucro abaixo de 20%. Considere ajustar o preço.</p>
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Informações de Ajuda -->
	<div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
		<h4 class="font-medium text-blue-900 mb-2">💡 Dicas de Precificação</h4>
		<ul class="text-sm text-blue-800 space-y-1">
			<li>• O preço de venda é obrigatório</li>
			<li>• Use o preço original para criar promoções</li>
			<li>• Mantenha uma margem de lucro saudável (20-50%)</li>
			<li>• O custo ajuda no controle financeiro</li>
		</ul>
	</div>
</div>

<style>
	/* Estilos para inputs numéricos */
	input[type="number"]::-webkit-outer-spin-button,
	input[type="number"]::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	input[type="number"] {
		-moz-appearance: textfield;
	}
</style> 