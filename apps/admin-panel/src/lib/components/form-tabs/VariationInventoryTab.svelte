<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface Props {
		data?: any;
		errors?: Record<string, string>;
		disabled?: boolean;
	}
	
	const { data = {}, errors = {}, disabled = false }: Props = $props();
	
	const dispatch = createEventDispatcher();
	
	function handleChange(field: string, value: any) {
		dispatch('change', { field, value });
	}
</script>

<div class="space-y-6">
	<!-- Header da Seção -->
	<div class="bg-gradient-to-r from-[#00BFB3]/5 to-[#00A89D]/5 p-4 rounded-lg border border-[#00BFB3]/10">
		<h3 class="text-lg font-semibold text-gray-900 flex items-center">
			<span class="w-8 h-8 bg-[#00BFB3] text-white rounded-lg flex items-center justify-center mr-3 text-sm font-bold">
				📦
			</span>
			Estoque da Variação
		</h3>
		<p class="text-sm text-gray-600 mt-1">Configure quantidade e dimensões desta variação</p>
	</div>

	<!-- Grid de Estoque -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Quantidade -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700">
				Quantidade em Estoque *
			</label>
			<input
				type="number"
				min="0"
				step="1"
				value={data.quantity || 0}
				{disabled}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
				placeholder="0"
				on:input={(e) => handleChange('quantity', parseInt(e.currentTarget.value) || 0)}
			/>
		</div>

		<!-- Peso -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-gray-700">
				Peso (kg)
			</label>
			<input
				type="number"
				min="0"
				step="0.001"
				value={data.weight || ''}
				{disabled}
				class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3]"
				placeholder="0.000"
				on:input={(e) => handleChange('weight', parseFloat(e.currentTarget.value) || null)}
			/>
		</div>
	</div>

	<!-- Status do Estoque -->
	{#if data.quantity !== undefined}
		<div class="bg-gray-50 p-4 rounded-lg border">
			<h4 class="font-medium text-gray-900 mb-2">📊 Status do Estoque</h4>
			<div class="flex items-center space-x-4">
				<div class="text-center">
					<div class="text-2xl font-bold {data.quantity > 10 ? 'text-green-600' : data.quantity > 0 ? 'text-yellow-600' : 'text-red-600'}">
						{data.quantity || 0}
					</div>
					<div class="text-sm text-gray-600">Unidades</div>
				</div>
				<div class="flex-1">
					<div class="text-sm font-medium {data.quantity > 10 ? 'text-green-800' : data.quantity > 0 ? 'text-yellow-800' : 'text-red-800'}">
						{#if data.quantity > 10}
							✅ Estoque adequado
						{:else if data.quantity > 0}
							⚠️ Estoque baixo
						{:else}
							❌ Sem estoque
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Informações de Ajuda -->
	<div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
		<h4 class="font-medium text-blue-900 mb-2">💡 Dicas de Estoque</h4>
		<ul class="text-sm text-blue-800 space-y-1">
			<li>• A quantidade é obrigatória para controle de estoque</li>
			<li>• O peso é usado para cálculo de frete</li>
			<li>• Mantenha o estoque atualizado para evitar vendas sem produto</li>
		</ul>
	</div>
</div> 