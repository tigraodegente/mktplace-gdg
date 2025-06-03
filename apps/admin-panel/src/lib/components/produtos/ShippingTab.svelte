<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	let { formData = $bindable() } = $props();
	
	// Estados brasileiros
	const estados = [
		{ sigla: 'AC', nome: 'Acre' },
		{ sigla: 'AL', nome: 'Alagoas' },
		{ sigla: 'AP', nome: 'Amapá' },
		{ sigla: 'AM', nome: 'Amazonas' },
		{ sigla: 'BA', nome: 'Bahia' },
		{ sigla: 'CE', nome: 'Ceará' },
		{ sigla: 'DF', nome: 'Distrito Federal' },
		{ sigla: 'ES', nome: 'Espírito Santo' },
		{ sigla: 'GO', nome: 'Goiás' },
		{ sigla: 'MA', nome: 'Maranhão' },
		{ sigla: 'MT', nome: 'Mato Grosso' },
		{ sigla: 'MS', nome: 'Mato Grosso do Sul' },
		{ sigla: 'MG', nome: 'Minas Gerais' },
		{ sigla: 'PA', nome: 'Pará' },
		{ sigla: 'PB', nome: 'Paraíba' },
		{ sigla: 'PR', nome: 'Paraná' },
		{ sigla: 'PE', nome: 'Pernambuco' },
		{ sigla: 'PI', nome: 'Piauí' },
		{ sigla: 'RJ', nome: 'Rio de Janeiro' },
		{ sigla: 'RN', nome: 'Rio Grande do Norte' },
		{ sigla: 'RS', nome: 'Rio Grande do Sul' },
		{ sigla: 'RO', nome: 'Rondônia' },
		{ sigla: 'RR', nome: 'Roraima' },
		{ sigla: 'SC', nome: 'Santa Catarina' },
		{ sigla: 'SP', nome: 'São Paulo' },
		{ sigla: 'SE', nome: 'Sergipe' },
		{ sigla: 'TO', nome: 'Tocantins' }
	];
	
	// Calcular volume
	let volume = $derived(
		formData.width && formData.height && formData.length 
			? (formData.width * formData.height * formData.length / 1000000).toFixed(3)
			: null
	);
</script>

<div class="space-y-8">
	<!-- DIMENSÕES E PESO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Package" size={20} color="#00BFB3" />
			Dimensões e Peso
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<!-- Peso -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Peso (kg)
				</label>
				<input
					type="number"
					bind:value={formData.weight}
					step="0.001"
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0,000"
				/>
			</div>
			
			<!-- Comprimento -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Comprimento (cm)
				</label>
				<input
					type="number"
					bind:value={formData.length}
					step="0.01"
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0,00"
				/>
			</div>
			
			<!-- Largura -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Largura (cm)
				</label>
				<input
					type="number"
					bind:value={formData.width}
					step="0.01"
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0,00"
				/>
			</div>
			
			<!-- Altura -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Altura (cm)
				</label>
				<input
					type="number"
					bind:value={formData.height}
					step="0.01"
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="0,00"
				/>
			</div>
		</div>
		
		<!-- Cálculo de Volume -->
		{#if volume}
			<div class="mt-4 p-4 bg-gray-50 rounded-lg">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Volume Calculado:</span>
					<span class="font-semibold text-gray-900">{volume} m³</span>
				</div>
			</div>
		{/if}
		
		<!-- Avisos -->
		<div class="mt-4 p-4 bg-amber-50 rounded-lg">
			<h5 class="font-medium text-amber-900 mb-2 flex items-center gap-2">
				<ModernIcon name="warning" size={16} color="#78350F" />
				Importante para cálculo de frete
			</h5>
			<ul class="text-sm text-amber-700 space-y-1">
				<li>• Medidas devem incluir a embalagem</li>
				<li>• Peso deve ser o peso total com embalagem</li>
				<li>• Correios: máximo 105cm de comprimento</li>
				<li>• Soma das dimensões não pode exceder 200cm</li>
			</ul>
		</div>
	</div>
	
	<!-- LOCALIZAÇÃO DO VENDEDOR -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="location" size={20} color="#00BFB3" />
			Localização do Produto
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Estado -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Estado de Origem
				</label>
				<select
					bind:value={formData.seller_state}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				>
					<option value="">Selecione o estado</option>
					{#each estados as estado}
						<option value={estado.sigla}>{estado.nome}</option>
					{/each}
				</select>
			</div>
			
			<!-- Cidade -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Cidade de Origem
				</label>
				<input
					type="text"
					bind:value={formData.seller_city}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Nome da cidade"
				/>
			</div>
		</div>
		
		<p class="text-xs text-gray-500 mt-2">
			Usado para calcular prazo e valor do frete
		</p>
	</div>
	
	<!-- CONFIGURAÇÕES DE ENTREGA -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="truck" size={20} color="#00BFB3" />
			Configurações de Entrega
		</h4>
		
		<div class="space-y-6">
			<!-- Frete Grátis -->
			<div>
				<label class="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={formData.has_free_shipping}
						class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
					/>
					<div>
						<span class="text-sm font-medium text-gray-900">Frete Grátis</span>
						<p class="text-xs text-gray-500">Oferecer entrega gratuita para este produto</p>
					</div>
				</label>
			</div>
			
			<!-- Prazo de Entrega -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Prazo de Entrega
				</label>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-xs text-gray-600 mb-1">Mínimo (dias)</label>
						<input
							type="number"
							bind:value={formData.delivery_days_min}
							min="1"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="3"
						/>
					</div>
					<div>
						<label class="block text-xs text-gray-600 mb-1">Máximo (dias)</label>
						<input
							type="number"
							bind:value={formData.delivery_days_max}
							min="1"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="7"
						/>
					</div>
				</div>
				<p class="text-xs text-gray-500 mt-2">
					Prazo adicional ao prazo dos Correios/Transportadora
				</p>
			</div>
			
			<!-- Restrições de Entrega -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Restrições de Entrega
				</label>
				<textarea
					bind:value={formData.shipping_restrictions}
					rows="3"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="Ex: Não entregamos em áreas rurais, apenas capitais, etc."
				></textarea>
			</div>
		</div>
	</div>
	
	<!-- MÉTODOS DE ENVIO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="shipping" size={20} color="#00BFB3" />
			Métodos de Envio Disponíveis
		</h4>
		
		<div class="space-y-3">
			<!-- PAC -->
			<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
				<input
					type="checkbox"
					bind:checked={formData.shipping_pac}
					class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
				/>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="font-medium text-gray-900">PAC - Correios</span>
						<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Econômico</span>
					</div>
					<p class="text-sm text-gray-500">Entrega econômica em todo Brasil</p>
				</div>
			</label>
			
			<!-- SEDEX -->
			<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
				<input
					type="checkbox"
					bind:checked={formData.shipping_sedex}
					class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
				/>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="font-medium text-gray-900">SEDEX - Correios</span>
						<span class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">Rápido</span>
					</div>
					<p class="text-sm text-gray-500">Entrega expressa com rastreamento</p>
				</div>
			</label>
			
			<!-- Transportadora -->
			<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
				<input
					type="checkbox"
					bind:checked={formData.shipping_carrier}
					class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
				/>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="font-medium text-gray-900">Transportadora</span>
						<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Personalizado</span>
					</div>
					<p class="text-sm text-gray-500">Entrega via transportadora parceira</p>
				</div>
			</label>
			
			<!-- Retirada -->
			<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
				<input
					type="checkbox"
					bind:checked={formData.shipping_pickup}
					class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
				/>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<span class="font-medium text-gray-900">Retirar no Local</span>
						<span class="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">Sem Frete</span>
					</div>
					<p class="text-sm text-gray-500">Cliente retira o produto pessoalmente</p>
				</div>
			</label>
		</div>
	</div>
</div> 