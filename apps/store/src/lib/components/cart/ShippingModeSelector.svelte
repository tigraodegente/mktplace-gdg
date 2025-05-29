<script lang="ts">
	import type { ShippingMode, SellerGroup } from '$lib/types/cart';
	
	interface ShippingModeSelectorProps {
		shippingMode: ShippingMode;
		onModeChange: (mode: ShippingMode) => void;
		sellerGroups?: SellerGroup[];
	}
	
	let { shippingMode, onModeChange, sellerGroups = [] }: ShippingModeSelectorProps = $props();
	
	// Calcular prazos para cada modalidade
	const groupedDeliveryDays = $derived(() => {
		if (!sellerGroups.length) return null;
		
		// Para entrega agrupada, pegar o maior prazo entre todos os sellers
		const groupedDays = sellerGroups
			.map(group => group.groupedShipping?.estimatedDays)
			.filter(days => days !== undefined);
		
		return groupedDays.length > 0 ? Math.max(...groupedDays) : null;
	});
	
	const expressDeliveryDays = $derived(() => {
		if (!sellerGroups.length) return null;
		
		// Para entrega expressa, pegar o menor prazo entre todos os sellers
		const expressDays = sellerGroups
			.map(group => group.expressShipping?.estimatedDays)
			.filter(days => days !== undefined);
		
		return expressDays.length > 0 ? Math.min(...expressDays) : null;
	});
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-5">
	<div class="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
		<div class="bg-[#00BFB3]/10 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
			<svg class="w-4 h-4 sm:w-5 sm:h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
			</svg>
		</div>
		<div class="min-w-0">
			<h3 class="font-semibold text-gray-900 text-xs sm:text-base">Modalidade de entrega</h3>
			<p class="text-[10px] sm:text-sm text-gray-600 hidden sm:block">Selecione como prefere receber seus produtos</p>
		</div>
	</div>
	
	<div class="grid gap-2 sm:gap-3">
		<label class="relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 {shippingMode === 'grouped' ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}">
			<input 
				type="radio"
				name="shipping-mode"
				value="grouped"
				checked={shippingMode === 'grouped'}
				onchange={() => onModeChange('grouped')}
				class="sr-only"
			/>
			<div class="flex-shrink-0 mt-0.5">
				<div class="{shippingMode === 'grouped' ? 'bg-[#00BFB3]' : 'bg-gray-200'} w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-colors">
					{#if shippingMode === 'grouped'}
						<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</div>
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex flex-wrap items-start gap-1.5 sm:gap-2 mb-1">
					<div class="flex items-center gap-1.5">
						<svg class="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
						</svg>
						<p class="font-semibold text-gray-900 text-xs sm:text-base">Entrega Agrupada</p>
					</div>
					<span class="bg-green-100 text-green-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
						Mais barato
					</span>
				</div>
				<p class="text-[11px] sm:text-sm text-gray-600 leading-relaxed">
					Receba todos os produtos do mesmo vendedor juntos em uma única entrega
				</p>
				{#if groupedDeliveryDays()}
					<div class="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-2">
						<svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-[10px] sm:text-sm font-medium text-gray-700">
							Prazo estimado: até {groupedDeliveryDays()} dias úteis
						</span>
					</div>
				{/if}
			</div>
		</label>
		
		<label class="relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 {shippingMode === 'express' ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}">
			<input 
				type="radio"
				name="shipping-mode"
				value="express"
				checked={shippingMode === 'express'}
				onchange={() => onModeChange('express')}
				class="sr-only"
			/>
			<div class="flex-shrink-0 mt-0.5">
				<div class="{shippingMode === 'express' ? 'bg-[#00BFB3]' : 'bg-gray-200'} w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-colors">
					{#if shippingMode === 'express'}
						<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</div>
			</div>
			<div class="flex-1 min-w-0">
				<div class="flex flex-wrap items-start gap-1.5 sm:gap-2 mb-1">
					<div class="flex items-center gap-1.5">
						<svg class="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						<p class="font-semibold text-gray-900 text-xs sm:text-base">Entrega Expressa</p>
					</div>
					<span class="bg-orange-100 text-orange-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
						Mais rápido
					</span>
				</div>
				<p class="text-[11px] sm:text-sm text-gray-600 leading-relaxed">
					Cada produto é enviado separadamente assim que disponível
				</p>
				{#if expressDeliveryDays()}
					<div class="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-2">
						<svg class="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-[10px] sm:text-sm font-medium text-gray-700">
							Prazo: a partir de {expressDeliveryDays()} dias úteis
						</span>
					</div>
				{/if}
			</div>
		</label>
	</div>
</div>

<style>
	/* Ajustes específicos para mobile */
	@media (max-width: 640px) {
		/* Garantir que badges não quebrem linha em mobile */
		.flex-wrap {
			flex-wrap: wrap;
		}
		
		/* Melhor espaçamento vertical em mobile */
		label {
			position: relative;
		}
		
		/* Garantir que texto não fique muito apertado */
		p {
			line-height: 1.4;
		}
	}
	
	/* Animação suave para seleção */
	label {
		transition: all 0.2s ease-out;
	}
	
	label:active {
		transform: scale(0.98);
	}
</style> 