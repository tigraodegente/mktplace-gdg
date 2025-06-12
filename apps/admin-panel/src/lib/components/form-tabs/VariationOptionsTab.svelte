<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	
	interface Props {
		data?: any;
		errors?: Record<string, string>;
		disabled?: boolean;
	}
	
	const { data = {}, errors = {}, disabled = false }: Props = $props();
	
	const dispatch = createEventDispatcher();
	
	let options: any[] = [];
	let optionValues: any[] = [];
	let loading = false;
	
	// Buscar opções e valores disponíveis
	async function loadOptions() {
		loading = true;
		try {
			const response = await fetch('/api/product-options?include_values=true');
			const result = await response.json();
			if (result.success) {
				options = result.data || [];
				// Flatten all option values
				optionValues = options.flatMap(opt => 
					(opt.values || []).map((val: any) => ({
						...val,
						option_name: opt.name,
						option_id: opt.id
					}))
				);
			}
		} catch (error) {
			console.error('Erro ao carregar opções:', error);
		} finally {
			loading = false;
		}
	}
	
	function handleChange(field: string, value: any) {
		dispatch('change', { field, value });
	}
	
	// Toggle option value selection
	function toggleOptionValue(valueId: string) {
		const currentValues = data.option_value_ids || [];
		let newValues;
		
		if (currentValues.includes(valueId)) {
			newValues = currentValues.filter((id: string) => id !== valueId);
		} else {
			newValues = [...currentValues, valueId];
		}
		
		handleChange('option_value_ids', newValues);
	}
	
	onMount(() => {
		loadOptions();
	});
</script>

<div class="space-y-6">
	<!-- Header da Seção -->
	<div class="bg-gradient-to-r from-[#00BFB3]/5 to-[#00A89D]/5 p-4 rounded-lg border border-[#00BFB3]/10">
		<h3 class="text-lg font-semibold text-gray-900 flex items-center">
			<span class="w-8 h-8 bg-[#00BFB3] text-white rounded-lg flex items-center justify-center mr-3 text-sm font-bold">
				⚙️
			</span>
			Opções da Variação
		</h3>
		<p class="text-sm text-gray-600 mt-1">Selecione as características desta variação (cor, tamanho, etc.)</p>
	</div>

	{#if loading}
		<div class="text-center py-8">
			<div class="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#00BFB3] rounded-full animate-spin"></div>
			<p class="text-sm text-gray-600 mt-2">Carregando opções...</p>
		</div>
	{:else if options.length === 0}
		<div class="text-center py-8 bg-gray-50 rounded-lg border">
			<p class="text-gray-600">Nenhuma opção encontrada.</p>
			<p class="text-sm text-gray-500 mt-1">Configure opções de produto primeiro.</p>
		</div>
	{:else}
		<!-- Opções por Categoria -->
		{#each options as option}
			{#if option.values && option.values.length > 0}
				<div class="space-y-3">
					<h4 class="font-medium text-gray-900 flex items-center">
						<span class="mr-2">
							{#if option.name === 'Cor'}
								🎨
							{:else if option.name === 'Tamanho'}
								📏
							{:else if option.name === 'Material'}
								🧱
							{:else if option.name === 'Estilo'}
								✨
							{:else}
								🏷️
							{/if}
						</span>
						{option.name}
					</h4>
					
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
						{#each option.values as value}
							<button
								type="button"
								class="p-3 border rounded-lg text-left transition-all duration-200 {
									(data.option_value_ids || []).includes(value.id)
										? 'border-[#00BFB3] bg-[#00BFB3]/5 text-[#00BFB3]'
										: 'border-gray-300 hover:border-gray-400'
								}"
								{disabled}
								on:click={() => toggleOptionValue(value.id)}
							>
								<div class="font-medium text-sm">
									{value.display_value || value.value}
								</div>
								{#if value.hex_color}
									<div 
										class="w-4 h-4 rounded border border-gray-300 mt-1"
										style="background-color: {value.hex_color}"
									></div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/each}
		
		<!-- Valores Selecionados -->
		{#if data.option_value_ids && data.option_value_ids.length > 0}
			<div class="bg-gray-50 p-4 rounded-lg border">
				<h4 class="font-medium text-gray-900 mb-2">✅ Opções Selecionadas</h4>
				<div class="flex flex-wrap gap-2">
					{#each data.option_value_ids as valueId}
						{@const optionValue = optionValues.find(ov => ov.id === valueId)}
						{#if optionValue}
							<span class="inline-flex items-center px-3 py-1 bg-[#00BFB3] text-white text-sm rounded-full">
								{optionValue.option_name}: {optionValue.display_value || optionValue.value}
								<button
									type="button"
									class="ml-2 text-white hover:text-gray-200"
									on:click={() => toggleOptionValue(valueId)}
									{disabled}
								>
									×
								</button>
							</span>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Informações de Ajuda -->
	<div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
		<h4 class="font-medium text-blue-900 mb-2">💡 Dicas de Opções</h4>
		<ul class="text-sm text-blue-800 space-y-1">
			<li>• Selecione as características que definem esta variação</li>
			<li>• Combine múltiplas opções (ex: Cor + Tamanho)</li>
			<li>• Cada combinação deve ser única por produto</li>
		</ul>
	</div>
</div> 