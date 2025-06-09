<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import { shippingService } from '$lib/services/shippingService';
	
	// ID da configuração
	const configId = $derived($page.params.id);
	
	// Estado do formulário
	let formData = $state({
		id: '',
		seller_id: '',
		carrier_id: '',
		markup_percentage: 0,
		free_shipping_threshold: null as number | null,
		handling_time_days: 1,
		is_active: true
	});
	
	let loading = $state(true);
	let saving = $state(false);
	
	// Opções para selects
	let sellers = $state<Array<{ id: string; name: string; email: string }>>([]);
	let carriers = $state<Array<{ id: string; name: string; type: string }>>([]);
	
	// Carregar dados
	onMount(async () => {
		await Promise.all([
			loadConfig(),
			loadSellers(),
			loadCarriers()
		]);
		loading = false;
	});
	
	// Carregar configuração existente
	async function loadConfig() {
		try {
			const response = await shippingService.getSellerConfigs();
			
			if (response.success) {
				// Buscar configuração específica pelo ID
				const config = response.data.configs.find((c: any) => c.id === configId);
				
				if (config) {
					formData = {
						id: config.id,
						seller_id: config.seller_id,
						carrier_id: config.carrier_id,
						markup_percentage: config.markup_percentage || 0,
						free_shipping_threshold: config.free_shipping_threshold || null,
						handling_time_days: config.handling_time_days || 1,
						is_active: config.is_active
					};
				} else {
					toast.error('Configuração não encontrada');
					goto('/configuracoes-frete');
				}
			}
		} catch (error) {
			console.error('Erro ao carregar configuração:', error);
			toast.error('Erro ao carregar configuração');
		}
	}
	
	// Carregar sellers
	async function loadSellers() {
		try {
			const sellersData = await shippingService.getAllSellersForSelect();
			if (sellersData) {
				sellers = sellersData;
			}
		} catch (error) {
			console.error('Erro ao carregar sellers:', error);
		}
	}
	
	// Carregar transportadoras
	async function loadCarriers() {
		try {
			const response = await shippingService.getCarriers({ limit: 100 });
			if (response.success && response.data.items) {
				carriers = response.data.items.map((carrier: any) => ({
					id: carrier.id,
					name: carrier.name,
					type: carrier.type
				}));
			}
		} catch (error) {
			console.error('Erro ao carregar transportadoras:', error);
		}
	}
	
	// Validação do formulário
	function isFormValid() {
		return formData.seller_id && 
		       formData.carrier_id && 
		       formData.markup_percentage >= 0 &&
		       formData.handling_time_days > 0;
	}
	
	// Salvar configuração
	async function saveConfig() {
		if (!isFormValid()) {
			toast.error('Preencha todos os campos obrigatórios');
			return;
		}
		
		saving = true;
		
		try {
			const response = await shippingService.updateSellerConfig(formData);
			
			if (response.success) {
				toast.success('Configuração atualizada com sucesso!');
				goto('/configuracoes-frete');
			} else {
				toast.error('Erro ao atualizar configuração');
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
		saveConfig();
	}
	
	// Cancelar e voltar
	function cancel() {
		goto('/configuracoes-frete');
	}
</script>

{#if loading}
	<div class="flex items-center justify-center min-h-96">
		<div class="flex items-center gap-3">
			<div class="w-6 h-6 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
			<span class="text-gray-600">Carregando configuração...</span>
		</div>
	</div>
{:else}
	<div class="max-w-4xl mx-auto p-6 space-y-6">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">
					⚙️ Editar Configuração de Frete
				</h1>
				<p class="text-gray-600 mt-2">
					Configure as opções de frete para o seller selecionado
				</p>
			</div>
			
			<button
				type="button"
				onclick={cancel}
				class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
			>
				✕
			</button>
		</div>
		
		<!-- Formulário -->
		<div class="bg-white rounded-lg border border-gray-200 p-6">
			<form onsubmit={handleSubmit} class="space-y-6">
				
				<!-- Informações Básicas -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Seller
						</label>
						<select
							bind:value={formData.seller_id}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							disabled
						>
							<option value="">Selecione um seller</option>
							{#each sellers as seller}
								<option value={seller.id}>{seller.name} ({seller.email})</option>
							{/each}
						</select>
						<p class="text-xs text-gray-500 mt-1">Seller não pode ser alterado após criação</p>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Transportadora
						</label>
						<select
							bind:value={formData.carrier_id}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							disabled
						>
							<option value="">Selecione uma transportadora</option>
							{#each carriers as carrier}
								<option value={carrier.id}>{carrier.name} ({carrier.type})</option>
							{/each}
						</select>
						<p class="text-xs text-gray-500 mt-1">Transportadora não pode ser alterada após criação</p>
					</div>
				</div>
				
				<!-- Configurações de Preço -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Markup (%)
						</label>
						<input
							type="number"
							bind:value={formData.markup_percentage}
							min="0"
							max="100"
							step="0.1"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="15.0"
						/>
						<p class="text-xs text-gray-500 mt-1">Porcentagem adicional sobre o preço base</p>
					</div>
					
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Frete Grátis a partir de (R$)
						</label>
						<input
							type="number"
							bind:value={formData.free_shipping_threshold}
							min="0"
							step="0.01"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="199.00"
						/>
						<p class="text-xs text-gray-500 mt-1">Valor mínimo para frete grátis (deixe vazio para desabilitar)</p>
					</div>
				</div>
				
				<!-- Configurações de Prazo e Status -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Tempo de Preparação (dias)
						</label>
						<input
							type="number"
							bind:value={formData.handling_time_days}
							min="1"
							max="30"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
							placeholder="2"
							required
						/>
						<p class="text-xs text-gray-500 mt-1">Dias para preparar o produto antes do envio</p>
					</div>
					
					<div class="flex items-center">
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={formData.is_active}
								class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
							/>
							<div>
								<span class="text-sm font-medium text-gray-900">Configuração Ativa</span>
								<p class="text-xs text-gray-500">Habilitar esta configuração no sistema</p>
							</div>
						</label>
					</div>
				</div>
				
				<!-- Preview -->
				<div class="bg-gray-50 rounded-lg p-4 mt-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">👁️ Preview da Configuração</h3>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-gray-600">Markup:</span>
							<span class="font-medium ml-2">
								{formData.markup_percentage > 0 ? `+${formData.markup_percentage}%` : 'Sem markup'}
							</span>
						</div>
						
						<div>
							<span class="text-gray-600">Frete Grátis:</span>
							<span class="font-medium ml-2">
								{formData.free_shipping_threshold 
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
					
					{#if formData.markup_percentage > 20}
						<div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
							<div class="flex items-center gap-2 text-yellow-800">
								<span class="text-sm font-medium">⚠️ Markup alto detectado</span>
							</div>
							<p class="text-xs text-yellow-700 mt-1">
								Markup acima de 20% pode tornar os preços menos competitivos
							</p>
						</div>
					{/if}
				</div>
				
				<!-- Botões de Ação -->
				<div class="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
					<button
						type="button"
						onclick={cancel}
						class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Cancelar
					</button>
					
					<button
						type="submit"
						disabled={!isFormValid() || saving}
						class="px-6 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
					>
						{#if saving}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{:else}
							💾
						{/if}
						{saving ? 'Salvando...' : 'Salvar Alterações'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if} 