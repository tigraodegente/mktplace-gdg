<script lang="ts">
	export let formData: any;

	// Função para calcular porcentagem de desconto
	function calculateDiscountPercentage(): number {
		if (formData.regular_price && formData.sale_price) {
			const regular = parseFloat(formData.regular_price) || 0;
			const sale = parseFloat(formData.sale_price) || 0;
			if (regular > 0 && sale > 0 && sale < regular) {
				return Math.round(((regular - sale) / regular) * 100);
			}
		}
		return 0;
	}

	// Função para calcular margem de lucro
	function calculateProfitMargin(): number {
		if (formData.sale_price && formData.cost_price) {
			const sale = parseFloat(formData.sale_price) || 0;
			const cost = parseFloat(formData.cost_price) || 0;
			if (sale > 0 && cost > 0) {
				return Math.round(((sale - cost) / sale) * 100);
			}
		}
		return 0;
	}

	// Calculadora automática de preços
	function calculateSalePrice() {
		if (formData.cost_price && formData.markup_percentage) {
			const cost = parseFloat(formData.cost_price) || 0;
			const markup = parseFloat(formData.markup_percentage) || 0;
			if (cost > 0 && markup > 0) {
				const salePrice = cost * (1 + markup / 100);
				formData.sale_price = salePrice.toFixed(2);
			}
		}
	}

	$: discountPercentage = calculateDiscountPercentage();
	$: profitMargin = calculateProfitMargin();
</script>

<div class="space-y-8">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Configuração de Preços</h3>
		<p class="text-slate-600">Gestão completa de preços, margens e rentabilidade</p>
	</div>

	<!-- PREÇOS PRINCIPAIS -->
	<div class="bg-gradient-to-r from-[#00BFB3]/10 to-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
			</svg>
			Preços de Venda
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Preço de Custo -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					💰 Preço de Custo *
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.cost_price}
						on:input={calculateSalePrice}
						class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
						required
					/>
				</div>
				<p class="text-xs text-slate-500 mt-1">Custo unitário do produto</p>
			</div>

			<!-- Preço de Venda -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🏷️ Preço de Venda *
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.sale_price}
						class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
						required
					/>
				</div>
				<p class="text-xs text-slate-500 mt-1">Preço principal de venda</p>
			</div>

			<!-- Preço Regular (Comparação) -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📊 Preço Regular
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.regular_price}
						class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
				<p class="text-xs text-slate-500 mt-1">Para mostrar desconto (opcional)</p>
			</div>
		</div>

		<!-- Informações de Desconto -->
		{#if discountPercentage > 0}
			<div class="mt-4 p-4 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg">
				<div class="flex items-center gap-2 text-[#00BFB3]">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span class="font-medium">Desconto de {discountPercentage}% será exibido</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- CALCULADORA DE MARKUP -->
	<div class="bg-gradient-to-r from-[#00BFB3]/8 to-[#00BFB3]/12 border border-[#00BFB3]/25 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			Calculadora de Markup
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Markup Percentage -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📈 Markup Desejado
				</label>
				<div class="relative">
					<input
						type="number"
						step="0.1"
						min="0"
						max="1000"
						bind:value={formData.markup_percentage}
						on:input={calculateSalePrice}
						class="w-full pr-12 pl-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="50"
					/>
					<span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">%</span>
				</div>
				<p class="text-xs text-slate-500 mt-1">Markup sobre o custo</p>
			</div>

			<!-- Calcular Preço -->
			<div class="flex items-end">
				<button
					type="button"
					on:click={calculateSalePrice}
					class="w-full px-6 py-3 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] hover:from-[#00A89D] hover:to-[#009688] text-white rounded-xl transition-all flex items-center justify-center gap-2"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
					Calcular Preço de Venda
				</button>
			</div>
		</div>

		<!-- Margem de Lucro -->
		{#if profitMargin > 0}
			<div class="mt-4 p-4 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg">
				<div class="flex items-center gap-2 text-[#00BFB3]">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
					<span class="font-medium">Margem de lucro: {profitMargin}%</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- ANÁLISE FINANCEIRA -->
	<div class="bg-gradient-to-r from-[#00BFB3]/6 to-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			Análise de Rentabilidade
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Lucro por Unidade -->
			<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Lucro por Unidade</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						R$ {formData.sale_price && formData.cost_price 
							? (parseFloat(formData.sale_price) - parseFloat(formData.cost_price)).toFixed(2)
							: '0,00'}
					</p>
				</div>
			</div>

			<!-- ROI -->
			<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">ROI (%)</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{formData.sale_price && formData.cost_price 
							? (((parseFloat(formData.sale_price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price)) * 100).toFixed(1)
							: '0,0'}%
					</p>
				</div>
			</div>

			<!-- Break Even -->
			<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Break Even</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{formData.cost_price && formData.sale_price && parseFloat(formData.sale_price) > parseFloat(formData.cost_price)
							? Math.ceil(parseFloat(formData.cost_price) / (parseFloat(formData.sale_price) - parseFloat(formData.cost_price)))
							: '∞'} unid.
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- CONFIGURAÇÕES AVANÇADAS -->
	<div class="space-y-6">
		<h4 class="font-semibold text-slate-900 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			Configurações Avançadas de Preço
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Preço Mínimo -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🔻 Preço Mínimo Permitido
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.min_price}
						class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
				<p class="text-xs text-slate-500 mt-1">Valor mínimo para promoções</p>
			</div>

			<!-- Preço Máximo -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					🔺 Preço Máximo Sugerido
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.max_price}
						class="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
				<p class="text-xs text-slate-500 mt-1">Teto para precificação</p>
			</div>
		</div>
	</div>

	<!-- ALERTAS E VALIDAÇÕES -->
	{#if formData.sale_price && formData.cost_price && parseFloat(formData.sale_price) <= parseFloat(formData.cost_price)}
		<div class="bg-red-50 border border-red-200 rounded-xl p-4">
			<div class="flex items-center gap-2 text-red-800">
				<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
				</svg>
				<div>
					<p class="font-medium">⚠️ Atenção: Preço de venda igual ou menor que o custo!</p>
					<p class="text-sm">O produto será vendido com prejuízo ou sem lucro.</p>
				</div>
			</div>
		</div>
	{/if}
</div> 