<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import { toast } from '$lib/stores/toast';
	import { shippingService, type ShippingCarrier } from '$lib/services/shippingService';
	import { onMount } from 'svelte';
	
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
	
	// Estados de loading para IA
	let aiLoading = $state<Record<string, boolean>>({
		weight: false,
		dimensions: false
	});
	
	// Dados reais das transportadoras
	let carriers = $state<ShippingCarrier[]>([]);
	let carriersLoading = $state(true);
	
	// Carregar transportadoras reais do banco
	async function loadCarriers() {
		carriersLoading = true;
		try {
			const response = await shippingService.getCarriers({ limit: 100, status: 'active' });
			if (response.success) {
				carriers = response.data.items;
			}
		} catch (error) {
			console.error('Erro ao carregar transportadoras:', error);
			toast.error('Erro ao carregar métodos de envio');
		} finally {
			carriersLoading = false;
		}
	}
	
	// Função de enriquecimento com IA
	async function enrichField(field: string) {
		if (!(field in aiLoading)) return;
		aiLoading[field] = true;
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field,
					currentData: formData,
					category: formData.category_name
				})
			});
			
			if (!response.ok) throw new Error('Erro na resposta da API');
			
			const result = await response.json();
			
			if (result.success) {
				switch (field) {
					case 'weight':
						formData.weight = parseFloat(result.data) || 0;
						toast.success(`Peso estimado: ${result.data}kg`);
						break;
					case 'dimensions':
						if (result.data) {
							formData.height = parseFloat(result.data.height) || 0;
							formData.width = parseFloat(result.data.width) || 0;
							formData.length = parseFloat(result.data.length) || 0;
							toast.success('Dimensões estimadas com base no produto!');
						}
						break;
				}
			} else {
				toast.error('Erro ao enriquecer com IA');
			}
		} catch (error) {
			console.error('Erro:', error);
			toast.error('Erro ao conectar com o serviço de IA');
		} finally {
			aiLoading[field] = false;
		}
	}
	
	// Inicializar form data de shipping se não existir
	if (!formData.shipping_methods) {
		formData.shipping_methods = [];
	}
	
	// Função para alternar método de envio
	function toggleShippingMethod(carrierId: string) {
		if (!formData.shipping_methods) {
			formData.shipping_methods = [];
		}
		
		const index = formData.shipping_methods.indexOf(carrierId);
		if (index === -1) {
			formData.shipping_methods.push(carrierId);
		} else {
			formData.shipping_methods.splice(index, 1);
		}
	}
	
	// Verificar se método está selecionado
	function isMethodSelected(carrierId: string) {
		return formData.shipping_methods?.includes(carrierId) || false;
	}
	
	// Calcular volume
	let volume = $derived(
		formData.width && formData.height && formData.length 
			? (formData.width * formData.height * formData.length / 1000000).toFixed(3)
			: null
	);
	
	onMount(() => {
		loadCarriers();
	});
</script>

<div class="space-y-8">
	<!-- DIMENSÕES E PESO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="Package" size="md" /> Dimensões e Peso
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Peso -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<ModernIcon name="sales" size="sm" class="inline mr-1" /> Peso (kg) *
				</label>
				<div class="flex gap-2">
					<input
						type="number"
						bind:value={formData.weight}
						step="0.1"
						min="0"
						required
						class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
						placeholder="0.5"
					/>
					<button
						type="button"
						onclick={() => enrichField('weight')}
						disabled={aiLoading.weight || !formData.name}
						class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
						title="Estimar peso com IA"
					>
						{#if aiLoading.weight}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
						IA
					</button>
				</div>
			</div>
			
			<!-- Dimensões -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					<ModernIcon name="Settings" size="sm" class="inline mr-1" /> Dimensões (cm)
				</label>
				<div class="space-y-2">
					<div class="grid grid-cols-3 gap-2">
						<input
							type="number"
							bind:value={formData.height}
							step="1"
							min="0"
							class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors text-sm"
							placeholder="Altura"
						/>
						<input
							type="number"
							bind:value={formData.width}
							step="1"
							min="0"
							class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors text-sm"
							placeholder="Largura"
						/>
						<input
							type="number"
							bind:value={formData.length}
							step="1"
							min="0"
							class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors text-sm"
							placeholder="Compr."
						/>
					</div>
					<button
						type="button"
						onclick={() => enrichField('dimensions')}
						disabled={aiLoading.dimensions || !formData.name}
						class="w-full px-3 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
						title="Estimar dimensões com IA"
					>
						{#if aiLoading.dimensions}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="robot" size="xs" />
						{/if}
						Estimar com IA
					</button>
				</div>
			</div>
		</div>
		
		<!-- Cálculo de volume -->
		{#if formData.height && formData.width && formData.length}
			<div class="mt-4 p-4 bg-gray-50 rounded-lg">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Volume:</span>
					<span class="font-semibold text-gray-900">
						{((formData.height * formData.width * formData.length) / 1000000).toFixed(3)} m³
					</span>
				</div>
			</div>
		{/if}
		
		<!-- Avisos -->
		<div class="mt-4 p-4 bg-gray-50 rounded-lg">
			<h5 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
				<ModernIcon name="warning" size="md" /> Importante para cálculo de frete
			</h5>
			<ul class="text-sm text-gray-600 space-y-1">
				<li class="flex items-start gap-2">
					<ModernIcon name="info" size="sm" class="mt-0.5 text-[#00BFB3]" />
					Medidas devem incluir a embalagem
				</li>
				<li class="flex items-start gap-2">
					<ModernIcon name="info" size="sm" class="mt-0.5 text-[#00BFB3]" />
					Peso deve ser o peso total com embalagem
				</li>
				<li class="flex items-start gap-2">
					<ModernIcon name="info" size="sm" class="mt-0.5 text-[#00BFB3]" />
					Correios: máximo 105cm de comprimento
				</li>
				<li class="flex items-start gap-2">
					<ModernIcon name="info" size="sm" class="mt-0.5 text-[#00BFB3]" />
					Soma das dimensões não pode exceder 200cm
				</li>
			</ul>
		</div>
	</div>
	
	<!-- LOCALIZAÇÃO DO VENDEDOR -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="location" size="md" /> Localização do Produto
		</h4>
		
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
			<ModernIcon name="truck" size="md" /> Configurações de Entrega
		</h4>
		
		<div class="space-y-6">
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
			
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					Prazo de Entrega Adicional (dias)
				</label>
				<input
					type="number"
					bind:value={formData.delivery_days}
					min="0"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					placeholder="3"
				/>
				<p class="text-xs text-gray-500 mt-2">
					Dias adicionais ao prazo dos Correios/Transportadora
				</p>
			</div>
			
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
			<ModernIcon name="Package" size="md" /> Métodos de Envio Disponíveis
		</h4>
		
		{#if carriersLoading}
			<div class="flex items-center justify-center py-8">
				<div class="text-center">
					<div class="w-8 h-8 border-4 border-gray-200 border-t-[#00BFB3] rounded-full animate-spin mx-auto mb-2"></div>
					<p class="text-sm text-gray-600">Carregando métodos de envio...</p>
				</div>
			</div>
		{:else if carriers.length === 0}
			<div class="text-center py-8">
				<ModernIcon name="Package" size={48} />
				<h5 class="text-lg font-medium text-gray-900 mt-4 mb-2">Nenhuma Transportadora Disponível</h5>
				<p class="text-gray-600 max-w-md mx-auto">
					Nenhuma transportadora está configurada no sistema. Entre em contato com o administrador.
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each carriers as carrier}
					<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
						<input
							type="checkbox"
							checked={isMethodSelected(carrier.id)}
							onchange={() => toggleShippingMethod(carrier.id)}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium text-gray-900">{carrier.name}</span>
								<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded capitalize">
									{carrier.type === 'correios' ? 'Correios' : 
									 carrier.type === 'frenet' ? 'Frenet' : 'Personalizado'}
								</span>
								{#if carrier.is_active}
									<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Ativo</span>
								{:else}
									<span class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Inativo</span>
								{/if}
							</div>
							{#if carrier.description}
								<p class="text-sm text-gray-500">{carrier.description}</p>
							{:else}
								<p class="text-sm text-gray-500">
									Entrega via {carrier.type === 'correios' ? 'Correios' : 
									            carrier.type === 'frenet' ? 'Frenet' : 'transportadora'}
								</p>
							{/if}
						</div>
					</label>
				{/each}
				
				<!-- Opção de retirada local (sempre disponível) -->
				<label class="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
					<input
						type="checkbox"
						bind:checked={formData.pickup_available}
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
		{/if}
	</div>
</div> 