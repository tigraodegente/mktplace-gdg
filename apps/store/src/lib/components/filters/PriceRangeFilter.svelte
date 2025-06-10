<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface PriceRangeFilterProps {
		selectedRanges?: string[];
		priceRanges?: Array<{
			label: string;
			value: string;
			min: number;
			max: number | null;
			products: number;
		}>;
		class?: string;
	}
	
	let {
		selectedRanges = [],
		priceRanges = [],
		class: className = ''
	}: PriceRangeFilterProps = $props();
	
	const dispatch = createEventDispatcher();
	
	// ✅ FAIXAS DINÂMICAS BASEADAS EM PRODUTOS FILTRADOS
	// Agora as faixas são calculadas dinamicamente pelo backend baseado nos produtos que passam pelos outros filtros
	
	// Estado interno para múltipla seleção
	let localSelectedRanges = $state<Set<string>>(new Set(selectedRanges));
	
	// Sincronizar com props
	$effect(() => {
		const newSet = new Set(selectedRanges);
		if (newSet.size !== localSelectedRanges.size || 
			[...newSet].some(range => !localSelectedRanges.has(range))) {
			localSelectedRanges = newSet;
		}
	});
	
	function toggleRange(rangeValue: string) {
		if (localSelectedRanges.has(rangeValue)) {
			localSelectedRanges.delete(rangeValue);
		} else {
			localSelectedRanges.add(rangeValue);
		}
		
		// Forçar reatividade
		localSelectedRanges = new Set(localSelectedRanges);
		
		// Emitir mudança
		dispatch('change', {
			ranges: Array.from(localSelectedRanges)
		});
	}
	
	function clearAll() {
		localSelectedRanges = new Set();
		dispatch('change', {
			ranges: []
		});
	}
</script>

<div class="price-range-filter {className}">
	<!-- ✅ HEADER COM CONTADOR E BOTÃO LIMPAR -->
	<div class="flex items-center justify-between mb-4">
		<h4 class="text-sm font-medium text-gray-700">Faixa de preço</h4>
		{#if localSelectedRanges.size > 0}
			<button
				type="button"
				onclick={clearAll}
				class="text-xs text-gray-500 hover:text-red-600 transition-colors"
			>
				Limpar ({localSelectedRanges.size})
			</button>
		{/if}
	</div>
	
	<!-- ✅ FAIXAS COM SELEÇÃO MÚLTIPLA -->
	<div class="space-y-2">
		{#each priceRanges as range}
			{@const isSelected = localSelectedRanges.has(range.value)}
			<label class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 {
				isSelected 
					? 'border-[#00BFB3] bg-[#00BFB3]/10' 
					: 'border-gray-300'
			}">
				<input
					type="checkbox"
					checked={isSelected}
					onchange={() => toggleRange(range.value)}
					class="w-4 h-4 text-[#00BFB3] border-gray-300 rounded focus:ring-[#00BFB3] focus:ring-2"
				/>
				<div class="flex-1">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium {isSelected ? 'text-[#00BFB3]' : 'text-gray-900'}">
							{range.label}
						</span>
						<span class="text-xs text-gray-500">
							{range.products} produtos
						</span>
					</div>
				</div>
			</label>
		{/each}
	</div>
	
	<!-- ✅ PREVIEW DAS FAIXAS SELECIONADAS -->
	{#if localSelectedRanges.size > 0}
		<div class="mt-4 p-3 bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg">
			<div class="text-sm">
				<span class="text-gray-600">Filtros ativos:</span>
				<div class="mt-1 flex flex-wrap gap-1">
					{#each Array.from(localSelectedRanges) as selectedRange}
						{@const range = priceRanges.find(r => r.value === selectedRange)}
						{#if range}
							<span class="inline-block bg-white px-2 py-1 rounded text-xs font-medium text-[#00BFB3] border border-[#00BFB3]/30">
								{range.label}
							</span>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ✅ ESTILOS LIMPOS PARA CHECKBOXES */
	.price-range-filter {
		position: relative;
		max-width: 100%;
	}
	
	/* ✅ MELHORAR FOCO DOS CHECKBOXES */
	input[type="checkbox"]:focus {
		box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.1);
	}
</style> 