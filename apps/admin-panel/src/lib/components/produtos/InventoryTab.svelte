<script lang="ts">
	export let formData: any;

	// Função para calcular peso volumétrico
	function calculateVolumetricWeight(): number {
		if (formData.length && formData.width && formData.height) {
			const length = parseFloat(formData.length) || 0;
			const width = parseFloat(formData.width) || 0;
			const height = parseFloat(formData.height) || 0;
			// Fórmula: (C x L x A) / 6000 para Correios
			return (length * width * height) / 6000;
		}
		return 0;
	}

	// Status do estoque baseado na quantidade
	function getStockStatus(quantity: number, threshold: number): string {
		if (quantity <= 0) return 'out-of-stock';
		if (quantity <= threshold) return 'low-stock';
		return 'in-stock';
	}

	function getStockStatusColor(status: string): string {
		switch (status) {
			case 'out-of-stock': return 'text-red-600 bg-red-50 border-red-200';
			case 'low-stock': return 'text-amber-600 bg-amber-50 border-amber-200';
			case 'in-stock': return 'text-green-600 bg-green-50 border-green-200';
			default: return 'text-slate-600 bg-slate-50 border-slate-200';
		}
	}

	function getStockStatusText(status: string): string {
		switch (status) {
			case 'out-of-stock': return '🔴 Sem Estoque';
			case 'low-stock': return '🟡 Estoque Baixo';
			case 'in-stock': return '🟢 Em Estoque';
			default: return '⚪ Indefinido';
		}
	}

	$: volumetricWeight = calculateVolumetricWeight();
	$: stockStatus = getStockStatus(formData.stock_quantity || 0, formData.low_stock_threshold || 5);
</script>

<div class="space-y-8">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Gestão de Estoque</h3>
		<p class="text-slate-600">Controle de inventário, dimensões e logística</p>
	</div>

	<!-- STATUS DO ESTOQUE -->
	<div class="bg-gradient-to-r from-[#00BFB3]/10 to-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
			</svg>
			Status e Quantidade
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Quantidade em Estoque -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📦 Quantidade em Estoque *
				</label>
				<input
					type="number"
					min="0"
					step="1"
					bind:value={formData.stock_quantity}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors text-lg font-semibold"
					placeholder="0"
					required
				/>
				<p class="text-xs text-slate-500 mt-1">Unidades disponíveis</p>
			</div>

			<!-- Estoque de Segurança -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					⚠️ Estoque Mínimo
				</label>
				<input
					type="number"
					min="0"
					step="1"
					bind:value={formData.low_stock_threshold}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="5"
				/>
				<p class="text-xs text-slate-500 mt-1">Alerta de estoque baixo</p>
			</div>

			<!-- Status Visual -->
			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📊 Status Atual
				</label>
				<div class="p-4 rounded-xl border-2 {getStockStatusColor(stockStatus)}">
					<div class="text-center">
						<div class="text-2xl font-bold mb-1">{formData.stock_quantity || 0}</div>
						<div class="text-sm font-medium">{getStockStatusText(stockStatus)}</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- CONFIGURAÇÕES DE ESTOQUE -->
	<div class="bg-gradient-to-r from-[#00BFB3]/5 to-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			Controles de Estoque
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Controlar Estoque -->
			<div class="flex items-center">
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.track_stock}
						class="w-6 h-6 rounded border-slate-300 text-[#00BFB3] shadow-sm focus:border-[#00BFB3] focus:ring focus:ring-[#00BFB3]/20 focus:ring-opacity-50"
					/>
					<div>
						<span class="text-sm font-medium text-slate-900">📊 Controlar Estoque</span>
						<p class="text-xs text-slate-600">Monitorar quantidade automaticamente</p>
					</div>
				</label>
			</div>

			<!-- Aceitar Backorders -->
			<div class="flex items-center">
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.allow_backorders}
						class="w-6 h-6 rounded border-slate-300 text-[#00BFB3] shadow-sm focus:border-[#00BFB3] focus:ring focus:ring-[#00BFB3]/20 focus:ring-opacity-50"
					/>
					<div>
						<span class="text-sm font-medium text-slate-900">📅 Permitir Pré-venda</span>
						<p class="text-xs text-slate-600">Vender mesmo sem estoque</p>
					</div>
				</label>
			</div>
		</div>
	</div>

	<!-- DIMENSÕES E PESO -->
	<div class="bg-gradient-to-r from-[#00BFB3]/8 to-[#00BFB3]/12 border border-[#00BFB3]/25 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
			</svg>
			Dimensões e Peso para Frete
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Peso -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					⚖️ Peso (kg)
				</label>
				<input
					type="number"
					step="0.001"
					min="0"
					bind:value={formData.weight}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.000"
				/>
				<p class="text-xs text-slate-500 mt-1">Peso físico do produto</p>
			</div>

			<!-- Comprimento -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📏 Comprimento (cm)
				</label>
				<input
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.length}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.0"
				/>
				<p class="text-xs text-slate-500 mt-1">Maior dimensão</p>
			</div>

			<!-- Largura -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📐 Largura (cm)
				</label>
				<input
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.width}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.0"
				/>
				<p class="text-xs text-slate-500 mt-1">Dimensão intermediária</p>
			</div>

			<!-- Altura -->
			<div>
				<label class="block text-sm font-medium text-slate-700 mb-2">
					📦 Altura (cm)
				</label>
				<input
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.height}
					class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.0"
				/>
				<p class="text-xs text-slate-500 mt-1">Menor dimensão</p>
			</div>
		</div>

		<!-- Peso Volumétrico -->
		{#if volumetricWeight > 0}
			<div class="mt-6 p-4 bg-white rounded-lg border border-orange-200">
				<div class="flex items-center justify-between">
					<div>
						<h5 class="font-medium text-slate-900">📊 Peso Volumétrico</h5>
						<p class="text-sm text-slate-600">Calculado automaticamente para frete</p>
					</div>
					<div class="text-right">
						<p class="text-2xl font-bold text-orange-600">{volumetricWeight.toFixed(3)} kg</p>
						<p class="text-xs text-slate-500">Fórmula: (C×L×A)/6000</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- HISTÓRICO E MOVIMENTAÇÕES -->
	<div class="bg-gradient-to-r from-[#00BFB3]/6 to-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			Movimentações de Estoque
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Estoque Reservado -->
			<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Estoque Reservado</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{formData.reserved_quantity || 0}
					</p>
					<p class="text-xs text-slate-500">Em pedidos pendentes</p>
				</div>
			</div>

			<!-- Disponível para Venda -->
			<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Disponível</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{(formData.stock_quantity || 0) - (formData.reserved_quantity || 0)}
					</p>
					<p class="text-xs text-slate-500">Para novos pedidos</p>
				</div>
			</div>

			<!-- Próxima Reposição -->
			<div class="bg-white rounded-lg p-4 border border-[#00BFB3]/30">
				<div class="text-center">
					<p class="text-sm text-slate-600 mb-1">Próxima Reposição</p>
					<input
						type="date"
						bind:value={formData.next_restock_date}
						class="w-full px-2 py-1 text-sm border border-slate-300 rounded text-center"
					/>
					<p class="text-xs text-slate-500 mt-1">Data estimada</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ALERTAS E NOTIFICAÇÕES -->
	<div class="space-y-4">
		{#if formData.stock_quantity <= 0}
			<div class="bg-red-50 border border-red-200 rounded-xl p-4">
				<div class="flex items-center gap-2 text-red-800">
					<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					<div>
						<p class="font-medium">🔴 Produto sem estoque!</p>
						<p class="text-sm">O produto não está disponível para venda.</p>
					</div>
				</div>
			</div>
		{:else if formData.stock_quantity <= (formData.low_stock_threshold || 5)}
			<div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
				<div class="flex items-center gap-2 text-amber-800">
					<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					<div>
						<p class="font-medium">🟡 Estoque baixo!</p>
						<p class="text-sm">Considere fazer uma reposição em breve.</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div> 