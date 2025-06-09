<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import { api } from '$lib/services/api';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	// Estado do formulário
	let formData = $state({
		seller_id: '',
		carrier_id: '',
		markup_percentage: 15,
		free_shipping_threshold: 199,
		handling_time_days: 2,
		is_active: true
	});
	
	let loading = $state(false);
	let saving = $state(false);
	
	// Opções para selects
	let sellers = $state<Array<{ id: string; name: string; email: string }>>([]);
	let carriers = $state<Array<{ id: string; name: string; coverage_type: string }>>([]);
	
	// Verificar autenticação
	function checkAuth() {
		if (typeof window === 'undefined') return;
		
		const token = localStorage.getItem('access_token');
		const userStr = localStorage.getItem('user');
		
		if (!token || !userStr) {
			goto('/login');
		}
	}
	
	// Carregar dados
	onMount(async () => {
		checkAuth();
		loading = true;
		await Promise.all([
			loadSellers(),
			loadCarriers()
		]);
		loading = false;
	});
	
	// Carregar sellers
	async function loadSellers() {
		try {
			const response = await api.get('/sellers');
			if (response.success && response.data?.items) {
				sellers = response.data.items.map((seller: any) => ({
					id: seller.id,
					name: seller.name,
					email: seller.email
				}));
				console.log('✅ Sellers carregados:', sellers.length);
			}
		} catch (error) {
			console.error('Erro ao carregar sellers:', error);
			toast.error('Erro ao carregar sellers');
		}
	}
	
	// Carregar transportadoras
	async function loadCarriers() {
		try {
			const response = await api.get('/shipping-carriers');
			if (response.success && response.data?.items) {
				carriers = response.data.items.map((carrier: any) => ({
					id: carrier.id,
					name: carrier.name,
					coverage_type: carrier.coverage_type || 'nacional'
				}));
				console.log('✅ Transportadoras carregadas:', carriers.length);
			}
		} catch (error) {
			console.error('Erro ao carregar transportadoras:', error);
			toast.error('Erro ao carregar transportadoras');
		}
	}
	
	// Validação do formulário
	function isFormValid() {
		return formData.seller_id && 
		       formData.carrier_id && 
		       formData.markup_percentage >= 0 &&
		       formData.handling_time_days > 0;
	}
	
	// Criar configuração
	async function createConfig() {
		if (!isFormValid()) {
			toast.error('Preencha todos os campos obrigatórios');
			return;
		}
		
		saving = true;
		
		try {
			const response = await api.post('/shipping/seller-configs', formData);
			
			if (response.success) {
				toast.success('Configuração criada com sucesso!');
				goto('/configuracoes-frete');
			} else {
				toast.error('Erro ao criar configuração');
			}
		} catch (error) {
			console.error('Erro ao salvar:', error);
			toast.error('Erro interno do servidor');
		} finally {
			saving = false;
		}
	}
	
	// Handler para o submit do form
	function handleSubmit(event: Event) {
		event.preventDefault();
		createConfig();
	}
	
	// Cancelar e voltar
	function cancel() {
		goto('/configuracoes-frete');
	}
	
	// Limpar formulário
	function resetForm() {
		formData = {
			seller_id: '',
			carrier_id: '',
			markup_percentage: 15,
			free_shipping_threshold: 199,
			handling_time_days: 2,
			is_active: true
		};
	}
	
	// Opções do select de sellers
	const sellerOptions = $derived([
		{ value: '', label: 'Selecione um seller (deixe vazio para configuração global)' },
		...sellers.map(seller => ({
			value: seller.id,
			label: `${seller.name} (${seller.email})`
		}))
	]);
	
	// Opções do select de transportadoras
	const carrierOptions = $derived([
		{ value: '', label: 'Selecione uma transportadora' },
		...carriers.map(carrier => ({
			value: carrier.id,
			label: `${carrier.name} (${carrier.coverage_type})`
		}))
	]);
	
	// Preview do seller selecionado
	const selectedSeller = $derived(sellers.find(s => s.id === formData.seller_id));
	const selectedCarrier = $derived(carriers.find(c => c.id === formData.carrier_id));
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button
						type="button"
						onclick={() => goto('/configuracoes-frete')}
						class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<ModernIcon name="ChevronLeft" size={20} />
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">
							Nova Configuração de Frete
						</h1>
						<p class="text-sm text-gray-600">
							Configure as opções de frete para um seller específico ou globalmente
						</p>
					</div>
				</div>
				
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={resetForm}
						disabled={saving}
						class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
					>
						Limpar
					</button>
					
					<button
						type="button"
						onclick={cancel}
						disabled={saving}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
					>
						Cancelar
					</button>
					
					<button
						type="button"
						onclick={createConfig}
						disabled={!isFormValid() || saving}
						class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<ModernIcon name="Plus" size={16} />
						{/if}
						{saving ? 'Criando...' : 'Criar Configuração'}
					</button>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Content -->
	<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
		{#if loading}
			<div class="flex items-center justify-center min-h-96">
				<div class="flex items-center gap-3">
					<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
					<span class="text-gray-600">Carregando dados...</span>
				</div>
			</div>
		{:else}
			<form onsubmit={handleSubmit} class="space-y-6">
				<!-- Informações Básicas -->
				<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div class="p-6 border-b border-gray-200">
						<div class="flex items-center gap-3">
							<div class="p-2 bg-[#00BFB3]/10 rounded-lg">
								<ModernIcon name="Truck" size="md" color="#00BFB3" />
							</div>
							<div>
								<h3 class="text-lg font-semibold text-gray-900">Informações Básicas</h3>
								<p class="text-sm text-gray-600">Selecione o seller e a transportadora</p>
							</div>
						</div>
					</div>
					
					<div class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Seller</label>
								<select
									bind:value={formData.seller_id}
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] bg-white"
								>
									{#each sellerOptions as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
								<p class="text-xs text-gray-500 mt-1">Seller que terá esta configuração de frete. Deixe vazio para configuração global.</p>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Transportadora *</label>
								<select
									bind:value={formData.carrier_id}
									required
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] bg-white"
								>
									{#each carrierOptions as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
								<p class="text-xs text-gray-500 mt-1">Transportadora que será usada para este seller</p>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Configurações de Preço -->
				<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div class="p-6 border-b border-gray-200">
						<div class="flex items-center gap-3">
							<div class="p-2 bg-green-100 rounded-lg">
								<ModernIcon name="DollarSign" size="md" color="#16A34A" />
							</div>
							<div>
								<h3 class="text-lg font-semibold text-gray-900">Configurações de Preço</h3>
								<p class="text-sm text-gray-600">Markup e frete grátis</p>
							</div>
						</div>
					</div>
					
					<div class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Markup (%)</label>
								<input
									type="number"
									bind:value={formData.markup_percentage}
									min="0"
									max="100"
									step="0.1"
									placeholder="15.0"
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] bg-white"
								/>
								<p class="text-xs text-gray-500 mt-1">Porcentagem adicional sobre o preço base (padrão: 15%)</p>
							</div>
							
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Frete Grátis a partir de (R$)</label>
								<input
									type="number"
									bind:value={formData.free_shipping_threshold}
									min="0"
									step="0.01"
									placeholder="199.00"
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] bg-white"
								/>
								<p class="text-xs text-gray-500 mt-1">Valor mínimo para frete grátis (deixe 0 para desabilitar)</p>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Configurações de Prazo -->
				<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div class="p-6 border-b border-gray-200">
						<div class="flex items-center gap-3">
							<div class="p-2 bg-blue-100 rounded-lg">
								<ModernIcon name="Clock" size="md" color="#3B82F6" />
							</div>
							<div>
								<h3 class="text-lg font-semibold text-gray-900">Configurações de Prazo</h3>
								<p class="text-sm text-gray-600">Tempo de preparação e status</p>
							</div>
						</div>
					</div>
					
					<div class="p-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">Tempo de Preparação (dias) *</label>
								<input
									type="number"
									bind:value={formData.handling_time_days}
									min="1"
									max="30"
									placeholder="2"
									required
									class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3] bg-white"
								/>
								<p class="text-xs text-gray-500 mt-1">Dias para preparar o produto antes do envio</p>
							</div>
							
							<div class="flex items-center h-full pt-6">
								<label class="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={formData.is_active}
										class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-2 focus:ring-[#00BFB3]/20 focus:border-[#00BFB3]"
									/>
									<span class="text-sm font-medium text-gray-700">Configuração Ativa</span>
								</label>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Preview da Configuração -->
				<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
					<div class="p-6 border-b border-gray-200">
						<div class="flex items-center gap-3">
							<div class="p-2 bg-purple-100 rounded-lg">
								<ModernIcon name="Eye" size="md" color="#7C3AED" />
							</div>
							<div>
								<h3 class="text-lg font-semibold text-gray-900">Preview da Configuração</h3>
								<p class="text-sm text-gray-600">Resumo das configurações que serão aplicadas</p>
							</div>
						</div>
					</div>
					
					<div class="p-6">
						<div class="bg-gray-50 rounded-lg p-4 space-y-3">
							{#if formData.carrier_id}
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
									<div>
										<span class="text-gray-600">Seller:</span>
										<span class="font-medium ml-2">
											{selectedSeller ? selectedSeller.name : 'Configuração Global (Todos os sellers)'}
										</span>
									</div>
									
									<div>
										<span class="text-gray-600">Transportadora:</span>
										<span class="font-medium ml-2">
											{selectedCarrier ? selectedCarrier.name : 'Selecionada'}
										</span>
									</div>
									
									<div>
										<span class="text-gray-600">Markup:</span>
										<span class="font-medium ml-2">
											{formData.markup_percentage > 0 ? `+${formData.markup_percentage}%` : 'Sem markup'}
										</span>
									</div>
									
									<div>
										<span class="text-gray-600">Frete Grátis:</span>
										<span class="font-medium ml-2">
											{formData.free_shipping_threshold && formData.free_shipping_threshold > 0 
												? `Acima de R$ ${formData.free_shipping_threshold.toFixed(2)}` 
												: 'Desabilitado'}
										</span>
									</div>
									
									<div>
										<span class="text-gray-600">Preparação:</span>
										<span class="font-medium ml-2">
											{formData.handling_time_days} dia{formData.handling_time_days !== 1 ? 's' : ''}
										</span>
									</div>
									
									<div>
										<span class="text-gray-600">Status:</span>
										<span class={`font-medium ml-2 ${formData.is_active ? 'text-green-600' : 'text-red-600'}`}>
											{formData.is_active ? 'Ativo' : 'Inativo'}
										</span>
									</div>
								</div>
								
								<!-- Exemplo de cálculo -->
								<div class="mt-4 pt-4 border-t border-gray-200">
									<h4 class="text-sm font-medium text-gray-900 mb-2">Exemplo de Cálculo:</h4>
									<div class="text-sm text-gray-600 space-y-1">
										<div>Frete base: R$ 15,90</div>
										<div>Com markup de {formData.markup_percentage}%: R$ {(15.90 * (1 + formData.markup_percentage / 100)).toFixed(2)}</div>
										{#if formData.free_shipping_threshold && formData.free_shipping_threshold > 0}
											<div class="text-green-600 font-medium">
												Grátis para pedidos acima de R$ {formData.free_shipping_threshold.toFixed(2)}
											</div>
										{/if}
									</div>
								</div>
							{:else}
															<div class="text-center text-gray-500 py-8">
								<ModernIcon name="Settings" size="lg" class="mx-auto mb-2 opacity-50" />
								<p>Selecione uma transportadora para ver o preview</p>
							</div>
							{/if}
							
							<!-- Avisos -->
							{#if formData.markup_percentage > 20}
								<div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
									<div class="flex items-center gap-2 text-yellow-800">
										<ModernIcon name="AlertTriangle" size={16} />
										<span class="text-sm font-medium">Markup alto detectado</span>
									</div>
									<p class="text-xs text-yellow-700 mt-1">
										Markup acima de 20% pode tornar os preços menos competitivos
									</p>
								</div>
							{/if}
							
							{#if formData.free_shipping_threshold && formData.free_shipping_threshold > 500}
								<div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
									<div class="flex items-center gap-2 text-blue-800">
										<ModernIcon name="Info" size={16} />
										<span class="text-sm font-medium">Threshold alto para frete grátis</span>
									</div>
									<p class="text-xs text-blue-700 mt-1">
										Valores altos podem reduzir a conversão de vendas
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</form>
		{/if}
	</div>
</div> 