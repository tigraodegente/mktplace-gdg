<script lang="ts">
	let { formData = $bindable() } = $props();

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
			default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

	let volumetricWeight = $derived(calculateVolumetricWeight());
	let stockStatus = $derived(getStockStatus(formData.quantity || 0, formData.minimum_stock || 5));
</script>

<div class="space-y-8">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Gestão de Estoque</h3>
		<p class="text-slate-600">Controle de inventário, dimensões e logística</p>
	</div>

	<!-- STATUS DO ESTOQUE -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			📦 Status e Quantidade
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Quantidade em Estoque -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Quantidade em Estoque *
				</label>
				<input
					type="number"
					min="0"
					step="1"
					bind:value={formData.quantity}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors text-lg font-semibold"
					placeholder="0"
					required
				/>
				<p class="text-xs text-gray-500 mt-1">Unidades disponíveis</p>
			</div>

			<!-- Estoque de Segurança -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Estoque Mínimo
				</label>
				<input
					type="number"
					min="0"
					step="1"
					bind:value={formData.minimum_stock}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="5"
				/>
				<p class="text-xs text-gray-500 mt-1">Alerta de estoque baixo</p>
			</div>

			<!-- Status Visual -->
			<div class="md:col-span-2">
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Status Atual
				</label>
				<div class="p-4 rounded-lg border-2 {getStockStatusColor(stockStatus)}">
					<div class="text-center">
						<div class="text-2xl font-bold mb-1">{formData.quantity || 0}</div>
						<div class="text-sm font-medium">{getStockStatusText(stockStatus)}</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- CONFIGURAÇÕES DE ESTOQUE -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			⚙️ Controles de Estoque
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Controlar Estoque -->
			<div class="flex items-center">
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.track_stock}
						class="w-6 h-6 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">📊 Controlar Estoque</span>
						<p class="text-xs text-gray-600">Monitorar quantidade automaticamente</p>
					</div>
				</label>
			</div>

			<!-- Aceitar Backorders -->
			<div class="flex items-center">
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.allow_backorders}
						class="w-6 h-6 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">📅 Permitir Pré-venda</span>
						<p class="text-xs text-gray-600">Vender mesmo sem estoque</p>
					</div>
				</label>
			</div>
		</div>
	</div>

	<!-- DIMENSÕES E PESO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			📐 Dimensões e Peso para Frete
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Peso -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Peso (kg)
				</label>
				<input
					type="number"
					step="0.001"
					min="0"
					bind:value={formData.weight}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.000"
				/>
				<p class="text-xs text-gray-500 mt-1">Peso físico do produto</p>
			</div>

			<!-- Comprimento -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Comprimento (cm)
				</label>
				<input
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.length}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.0"
				/>
				<p class="text-xs text-gray-500 mt-1">Maior dimensão</p>
			</div>

			<!-- Largura -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Largura (cm)
				</label>
				<input
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.width}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.0"
				/>
				<p class="text-xs text-gray-500 mt-1">Dimensão intermediária</p>
			</div>

			<!-- Altura -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Altura (cm)
				</label>
				<input
					type="number"
					step="0.1"
					min="0"
					bind:value={formData.height}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0.0"
				/>
				<p class="text-xs text-gray-500 mt-1">Menor dimensão</p>
			</div>
		</div>

		<!-- Peso Volumétrico -->
		{#if volumetricWeight > 0}
			<div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<h5 class="font-medium text-gray-900">📊 Peso Volumétrico</h5>
						<p class="text-sm text-gray-600">Calculado automaticamente para frete</p>
					</div>
					<div class="text-right">
						<p class="text-2xl font-bold text-[#00BFB3]">{volumetricWeight.toFixed(3)} kg</p>
						<p class="text-xs text-gray-500">Fórmula: (C×L×A)/6000</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- HISTÓRICO E MOVIMENTAÇÕES -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			📈 Movimentações de Estoque
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Estoque Reservado -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Estoque Reservado</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{formData.reserved_quantity || 0}
					</p>
					<p class="text-xs text-gray-500">Em pedidos pendentes</p>
				</div>
			</div>

			<!-- Disponível para Venda -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Disponível</p>
					<p class="text-2xl font-bold text-[#00BFB3]">
						{(formData.quantity || 0) - (formData.reserved_quantity || 0)}
					</p>
					<p class="text-xs text-gray-500">Para novos pedidos</p>
				</div>
			</div>

			<!-- Próxima Reposição -->
			<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
				<div class="text-center">
					<p class="text-sm text-gray-600 mb-1">Próxima Reposição</p>
					<input
						type="date"
						bind:value={formData.next_restock_date}
						class="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center"
					/>
					<p class="text-xs text-gray-500 mt-1">Data estimada</p>
				</div>
			</div>
		</div>
	</div>

	<!-- ALERTAS E NOTIFICAÇÕES -->
	<div class="space-y-4">
		{#if formData.quantity <= 0}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="flex items-center gap-2 text-red-800">
					⚠️
					<div>
						<p class="font-medium">🔴 Produto sem estoque!</p>
						<p class="text-sm">O produto não está disponível para venda.</p>
					</div>
				</div>
			</div>
		{:else if formData.quantity <= (formData.minimum_stock || 5)}
			<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
				<div class="flex items-center gap-2 text-amber-800">
					⚠️
					<div>
						<p class="font-medium">🟡 Estoque baixo!</p>
						<p class="text-sm">Considere fazer uma reposição em breve.</p>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div> 