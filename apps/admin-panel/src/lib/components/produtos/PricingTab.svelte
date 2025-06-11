<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import AISuggestionCard from '$lib/components/shared/AISuggestionCard.svelte';
	import { aiReviewMode, aiSuggestionsByCategory } from '$lib/stores/aiReview';
	import { toast } from '$lib/stores/toast';
	
	interface Props {
		formData: any;
	}
	
	let { formData = $bindable() }: Props = $props();
	
	// Estados para revisão IA em lote
	let isAIReviewMode = $state(false);
	let aiSuggestions = $state<any[]>([]);

	// Subscrever ao modo IA
	aiReviewMode.subscribe(mode => {
		isAIReviewMode = mode;
	});

	// Subscrever às sugestões da categoria 'pricing'
	aiSuggestionsByCategory.subscribe(suggestions => {
		aiSuggestions = suggestions.pricing || [];
		console.log('💰 PricingTab: Sugestões recebidas:', aiSuggestions);
	});

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

	let discountPercentage = $derived(calculateDiscountPercentage());
	let profitMargin = $derived(calculateProfitMargin());
</script>

<div class="space-y-8">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Configuração de Preços</h3>
		<p class="text-slate-600">Gestão completa de preços, margens e rentabilidade</p>
	</div>

	<!-- SUGESTÕES IA EM LOTE (quando modo revisão ativado) -->
	{#if isAIReviewMode && aiSuggestions.length > 0}
		<div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-6">
			<h3 class="text-lg font-semibold text-[#00BFB3] mb-4 flex items-center gap-2">
				<ModernIcon name="DollarSign" size="md" />
				Sugestões IA para Preços e Margens
				<span class="px-2 py-1 bg-[#00BFB3] text-white rounded-full text-sm">
					{aiSuggestions.length}
				</span>
			</h3>
			
			<div class="space-y-4">
				{#each aiSuggestions as suggestion}
					<AISuggestionCard {suggestion} {formData} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- PREÇOS PRINCIPAIS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="DollarSign" size="md" />
			Preços de Venda
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Preço de Custo -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<span class="flex items-center gap-1">
						<ModernIcon name="DollarSign" size="sm" />
						Preço de Custo *
					</span>
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.cost_price}
						oninput={calculateSalePrice}
						class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
						required
					/>
				</div>
				<p class="text-xs text-gray-500 mt-1">Custo unitário do produto</p>
			</div>

			<!-- Preço de Venda -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<span class="flex items-center gap-1">
						<ModernIcon name="Tag" size="sm" />
						Preço de Venda *
					</span>
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.sale_price}
						class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
						required
					/>
				</div>
				<p class="text-xs text-gray-500 mt-1">Preço principal de venda</p>
			</div>

			<!-- Preço Regular (Comparação) -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<span class="flex items-center gap-1">
						<ModernIcon name="BarChart3" size="sm" />
						Preço Regular
					</span>
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.regular_price}
						class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
				<p class="text-xs text-gray-500 mt-1">Para mostrar desconto (opcional)</p>
			</div>
		</div>

		<!-- Informações de Desconto -->
		{#if discountPercentage > 0}
			<div class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
				<div class="flex items-center gap-2 text-[#00BFB3]">
					<ModernIcon name="CheckCircle" size="sm" />
					<span class="font-medium">Desconto de {discountPercentage}% será exibido</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- CALCULADORA DE MARKUP -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Calculator" size="md" />
			Calculadora de Markup
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Markup Percentage -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<span class="flex items-center gap-1">
						<ModernIcon name="TrendingUp" size="sm" />
						Markup Desejado
					</span>
				</label>
				<div class="relative">
					<input
						type="number"
						step="0.1"
						min="0"
						max="1000"
						bind:value={formData.markup_percentage}
						oninput={calculateSalePrice}
						class="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="50"
					/>
					<span class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">%</span>
				</div>
				<p class="text-xs text-gray-500 mt-1">Markup sobre o custo</p>
			</div>

			<!-- Calcular Preço -->
			<div class="flex items-end">
				<button
					type="button"
					onclick={calculateSalePrice}
					class="w-full px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-all flex items-center justify-center gap-2"
				>
					<ModernIcon name="Calculator" size="sm" />
					Calcular Preço de Venda
				</button>
			</div>
		</div>

		<!-- Margem de Lucro -->
		{#if profitMargin > 0}
			<div class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
				<div class="flex items-center gap-2 text-[#00BFB3]">
					<ModernIcon name="TrendingUp" size="sm" />
					<span class="font-medium">Margem de lucro: {profitMargin}%</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- ANÁLISE FINANCEIRA -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="BarChart3" size="md" />
			Análise de Rentabilidade
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Lucro por Unidade -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Lucro por Unidade</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						R$ {formData.sale_price && formData.cost_price 
							? (parseFloat(formData.sale_price) - parseFloat(formData.cost_price)).toFixed(2)
							: '0,00'}
					</p>
				</div>
			</div>

			<!-- ROI -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">ROI (%)</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{formData.sale_price && formData.cost_price 
							? (((parseFloat(formData.sale_price) - parseFloat(formData.cost_price)) / parseFloat(formData.cost_price)) * 100).toFixed(1)
							: '0,0'}%
					</p>
				</div>
			</div>

			<!-- Break Even -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Break Even</p>
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
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Settings" size="md" />
			Configurações Avançadas de Preço
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Preço Mínimo -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<span class="flex items-center gap-1">
						<ModernIcon name="TrendingDown" size="sm" />
						Preço Mínimo Permitido
					</span>
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.min_price}
						class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
				<p class="text-xs text-gray-500 mt-1">Valor mínimo para promoções</p>
			</div>

			<!-- Preço Máximo -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<span class="flex items-center gap-1">
						<ModernIcon name="TrendingUp" size="sm" />
						Preço Máximo Sugerido
					</span>
				</label>
				<div class="relative">
					<span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">R$</span>
					<input
						type="number"
						step="0.01"
						min="0"
						bind:value={formData.max_price}
						class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0,00"
					/>
				</div>
				<p class="text-xs text-gray-500 mt-1">Teto para precificação</p>
			</div>
		</div>
	</div>

	<!-- ALERTAS E VALIDAÇÕES -->
	<div class="space-y-4">
		<!-- Alerta: Prejuízo -->
		{#if formData.sale_price && formData.cost_price && parseFloat(formData.sale_price) <= parseFloat(formData.cost_price)}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="flex items-center gap-2 text-red-800">
					<ModernIcon name="AlertTriangle" size="sm" />
					<div>
						<p class="font-medium">❌ Atenção: Preço de venda igual ou menor que o custo!</p>
						<p class="text-sm">O produto será vendido com prejuízo ou sem lucro.</p>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Alerta: Campos obrigatórios -->
		{#if !formData.sale_price || parseFloat(formData.sale_price) <= 0}
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<div class="flex items-center gap-2 text-yellow-800">
					<ModernIcon name="AlertCircle" size="sm" />
					<div>
						<p class="font-medium">⚠️ Preço de venda é obrigatório</p>
						<p class="text-sm">Informe um preço de venda válido maior que zero.</p>
					</div>
				</div>
			</div>
		{/if}
		
		{#if !formData.cost_price || parseFloat(formData.cost_price) < 0}
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<div class="flex items-center gap-2 text-yellow-800">
					<ModernIcon name="AlertCircle" size="sm" />
					<div>
						<p class="font-medium">⚠️ Preço de custo inválido</p>
						<p class="text-sm">O custo deve ser maior ou igual a zero.</p>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Alerta: Margem baixa -->
		{#if profitMargin > 0 && profitMargin < 20}
			<div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
				<div class="flex items-center gap-2 text-orange-800">
					<ModernIcon name="TrendingDown" size="sm" />
					<div>
						<p class="font-medium">📉 Margem de lucro baixa ({profitMargin}%)</p>
						<p class="text-sm">Considere aumentar o preço de venda para melhorar a rentabilidade.</p>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Sucesso: Tudo OK -->
		{#if formData.sale_price && formData.cost_price && parseFloat(formData.sale_price) > parseFloat(formData.cost_price) && profitMargin >= 20}
			<div class="bg-green-50 border border-green-200 rounded-lg p-4">
				<div class="flex items-center gap-2 text-green-800">
					<ModernIcon name="CheckCircle" size="sm" />
					<div>
						<p class="font-medium">✅ Configuração de preços está ótima!</p>
						<p class="text-sm">Margem de lucro de {profitMargin}% e rentabilidade adequada.</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div> 