<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	interface Props {
		formData: any;
	}
	
	let { formData = $bindable() }: Props = $props();
	
	// Inicializar campos de analytics se não existirem
	if (typeof formData.view_count === 'undefined') formData.view_count = 0;
	if (typeof formData.sales_count === 'undefined') formData.sales_count = 0;
	if (typeof formData.rating_average === 'undefined') formData.rating_average = 0;
	if (typeof formData.rating_count === 'undefined') formData.rating_count = 0;
	
	// Funções auxiliares
	function getPopularityLevel(views: number): string {
		if (views === 0) return 'Novo produto';
		if (views < 100) return 'Baixa';
		if (views < 500) return 'Média';
		if (views < 1000) return 'Alta';
		return 'Muito alta';
	}
	
	function getPerformanceLevel(sales: number): string {
		if (sales === 0) return 'Sem vendas';
		if (sales < 10) return 'Baixa';
		if (sales < 50) return 'Média';
		if (sales < 100) return 'Alta';
		return 'Muito alta';
	}
	
	function getRatingLevel(rating: number): string {
		if (rating === 0) return 'Sem avaliações';
		if (rating < 2) return 'Muito baixa';
		if (rating < 3) return 'Baixa';
		if (rating < 4) return 'Boa';
		if (rating < 4.5) return 'Muito boa';
		return 'Excelente';
	}
	
	function getRatingColor(rating: number): string {
		if (rating === 0) return 'text-gray-500';
		if (rating < 2) return 'text-red-600';
		if (rating < 3) return 'text-orange-600';
		if (rating < 4) return 'text-yellow-600';
		if (rating < 4.5) return 'text-green-600';
		return 'text-emerald-600';
	}
	
	// Calcular taxa de conversão
	function getConversionRate(): number {
		if (formData.view_count === 0) return 0;
		return (formData.sales_count / formData.view_count) * 100;
	}
	
	// Estados derivados
	let conversionRate = $derived(getConversionRate());
	let popularityLevel = $derived(getPopularityLevel(formData.view_count));
	let performanceLevel = $derived(getPerformanceLevel(formData.sales_count));
	let ratingLevel = $derived(getRatingLevel(formData.rating_average));
	let ratingColor = $derived(getRatingColor(formData.rating_average));
</script>

<div class="space-y-6">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Analytics e Performance</h3>
		<p class="text-slate-600">Métricas de visualizações, vendas e avaliações do produto</p>
	</div>

	<!-- MÉTRICAS PRINCIPAIS -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<!-- Visualizações -->
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Visualizações</p>
					<p class="text-3xl font-bold text-[#00BFB3] mt-2">{formData.view_count.toLocaleString()}</p>
					<p class="text-xs text-gray-500 mt-1">Popularidade: {popularityLevel}</p>
				</div>
				<div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
					<ModernIcon name="Eye" size="lg" class="text-[#00BFB3]" />
				</div>
			</div>
		</div>

		<!-- Vendas -->
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total de Vendas</p>
					<p class="text-3xl font-bold text-green-600 mt-2">{formData.sales_count.toLocaleString()}</p>
					<p class="text-xs text-gray-500 mt-1">Performance: {performanceLevel}</p>
				</div>
				<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="ShoppingCart" size="lg" class="text-green-600" />
				</div>
			</div>
		</div>

		<!-- Avaliação Média -->
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Nota Média</p>
					<div class="flex items-center gap-2 mt-2">
						<p class="text-3xl font-bold {ratingColor}">{formData.rating_average.toFixed(1)}</p>
						<div class="flex">
							{#each Array(5) as _, i}
								<ModernIcon 
									name="Star" 
									size="sm" 
									class={formData.rating_average > i ? 'text-yellow-400' : 'text-gray-300'} 
								/>
							{/each}
						</div>
					</div>
					<p class="text-xs text-gray-500 mt-1">Qualidade: {ratingLevel}</p>
				</div>
				<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="Star" size="lg" class="text-yellow-600" />
				</div>
			</div>
		</div>

		<!-- Total de Avaliações -->
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total de Avaliações</p>
					<p class="text-3xl font-bold text-purple-600 mt-2">{formData.rating_count.toLocaleString()}</p>
					<p class="text-xs text-gray-500 mt-1">
						{formData.rating_count === 0 ? 'Sem avaliações' : 
						 formData.rating_count < 10 ? 'Poucas avaliações' :
						 formData.rating_count < 50 ? 'Avaliações moderadas' : 'Bem avaliado'}
					</p>
				</div>
				<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
					<ModernIcon name="MessageSquare" size="lg" class="text-purple-600" />
				</div>
			</div>
		</div>
	</div>

	<!-- ANÁLISE DE PERFORMANCE -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="TrendingUp" size="md" />
			Análise de Performance
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Taxa de Conversão -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Taxa de Conversão</p>
					<p class="text-2xl font-bold text-[#00BFB3]">{conversionRate.toFixed(2)}%</p>
					<p class="text-xs text-gray-500 mt-1">
						{conversionRate === 0 ? 'Sem dados' :
						 conversionRate < 1 ? 'Baixa conversão' :
						 conversionRate < 3 ? 'Conversão média' :
						 conversionRate < 5 ? 'Boa conversão' : 'Excelente conversão'}
					</p>
				</div>
			</div>

			<!-- Interesse vs Vendas -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Interesse vs Vendas</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{formData.view_count > 0 ? Math.round(formData.view_count / Math.max(formData.sales_count, 1)) : 0}:1
					</p>
					<p class="text-xs text-gray-500 mt-1">Visualizações por venda</p>
				</div>
			</div>

			<!-- Satisfação do Cliente -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Satisfação</p>
					<p class="text-2xl font-bold {ratingColor}">
						{formData.rating_average > 0 ? Math.round((formData.rating_average / 5) * 100) : 0}%
					</p>
					<p class="text-xs text-gray-500 mt-1">Baseado nas avaliações</p>
				</div>
			</div>
		</div>
	</div>

	<!-- CAMPOS EDITÁVEIS PARA ADMIN -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Settings" size="md" />
			Configurações de Analytics
		</h4>

		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
			<div class="flex items-start gap-2">
				<ModernIcon name="AlertTriangle" size="sm" class="text-yellow-600 mt-0.5" />
				<div>
					<p class="text-sm font-medium text-yellow-800">⚠️ Área Administrativa</p>
					<p class="text-xs text-yellow-700 mt-1">
						Estes campos são normalmente atualizados automaticamente pelo sistema. Edite apenas se necessário para correções.
					</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Visualizações -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<ModernIcon name="Eye" size="sm" class="inline mr-1" />
					Total de Visualizações
				</label>
				<input
					type="number"
					bind:value={formData.view_count}
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0"
				/>
				<p class="text-xs text-gray-500 mt-1">Quantas vezes o produto foi visualizado</p>
			</div>

			<!-- Vendas -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<ModernIcon name="ShoppingCart" size="sm" class="inline mr-1" />
					Total de Vendas
				</label>
				<input
					type="number"
					bind:value={formData.sales_count}
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0"
				/>
				<p class="text-xs text-gray-500 mt-1">Quantidade total de vendas do produto</p>
			</div>

			<!-- Nota Média -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<ModernIcon name="Star" size="sm" class="inline mr-1" />
					Nota Média
				</label>
				<input
					type="number"
					bind:value={formData.rating_average}
					min="0"
					max="5"
					step="0.1"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.0"
				/>
				<p class="text-xs text-gray-500 mt-1">Média das avaliações (0 a 5 estrelas)</p>
			</div>

			<!-- Total de Avaliações -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<ModernIcon name="MessageSquare" size="sm" class="inline mr-1" />
					Total de Avaliações
				</label>
				<input
					type="number"
					bind:value={formData.rating_count}
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0"
				/>
				<p class="text-xs text-gray-500 mt-1">Quantidade total de avaliações recebidas</p>
			</div>
		</div>
	</div>

	<!-- INSIGHTS E RECOMENDAÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Lightbulb" size="md" />
			Insights e Recomendações
		</h4>

		<div class="space-y-4">
			<!-- Recomendações baseadas nas métricas -->
			{#if formData.view_count > 100 && formData.sales_count === 0}
				<div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
					<div class="flex items-start gap-2">
						<ModernIcon name="AlertTriangle" size="sm" class="text-orange-600 mt-0.5" />
						<div>
							<p class="text-sm font-medium text-orange-800">🔍 Alto interesse, mas sem vendas</p>
							<p class="text-xs text-orange-700 mt-1">
								O produto tem muitas visualizações mas nenhuma venda. Considere revisar o preço, descrição ou imagens.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if conversionRate > 0 && conversionRate < 1}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4">
					<div class="flex items-start gap-2">
						<ModernIcon name="TrendingDown" size="sm" class="text-red-600 mt-0.5" />
						<div>
							<p class="text-sm font-medium text-red-800">📉 Taxa de conversão baixa ({conversionRate.toFixed(2)}%)</p>
							<p class="text-xs text-red-700 mt-1">
								A taxa de conversão está abaixo de 1%. Otimize as imagens, descrição e preço para melhorar as vendas.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if formData.rating_count > 0 && formData.rating_average < 3}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4">
					<div class="flex items-start gap-2">
						<ModernIcon name="ThumbsDown" size="sm" class="text-red-600 mt-0.5" />
						<div>
							<p class="text-sm font-medium text-red-800">⭐ Avaliações baixas ({formData.rating_average.toFixed(1)}/5)</p>
							<p class="text-xs text-red-700 mt-1">
								O produto tem avaliações baixas. Analise os comentários e considere melhorias na qualidade ou descrição.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if conversionRate > 5}
				<div class="bg-green-50 border border-green-200 rounded-lg p-4">
					<div class="flex items-start gap-2">
						<ModernIcon name="TrendingUp" size="sm" class="text-green-600 mt-0.5" />
						<div>
							<p class="text-sm font-medium text-green-800">🚀 Excelente performance!</p>
							<p class="text-xs text-green-700 mt-1">
								Taxa de conversão alta ({conversionRate.toFixed(2)}%). Considere aumentar o investimento em marketing para este produto.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if formData.rating_average >= 4.5 && formData.rating_count >= 10}
				<div class="bg-green-50 border border-green-200 rounded-lg p-4">
					<div class="flex items-start gap-2">
						<ModernIcon name="Award" size="sm" class="text-green-600 mt-0.5" />
						<div>
							<p class="text-sm font-medium text-green-800">🏆 Produto bem avaliado!</p>
							<p class="text-xs text-green-700 mt-1">
								Excelentes avaliações ({formData.rating_average.toFixed(1)}/5). Use este produto como destaque na loja.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if formData.view_count === 0 && formData.sales_count === 0}
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div class="flex items-start gap-2">
						<ModernIcon name="Info" size="sm" class="text-blue-600 mt-0.5" />
						<div>
							<p class="text-sm font-medium text-blue-800">🆕 Produto novo</p>
							<p class="text-xs text-blue-700 mt-1">
								Este produto ainda não teve visualizações. Certifique-se de que está publicado e promova-o nas redes sociais.
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div> 