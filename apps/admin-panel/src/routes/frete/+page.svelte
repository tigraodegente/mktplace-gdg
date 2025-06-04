<script lang="ts">
	import { onMount } from 'svelte';
	import { shippingService, type ShippingCarrier, type ShippingZone, type ShippingRate, type SellerShippingConfig } from '$lib/services/shippingService';
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import PermissionGate from '$lib/components/PermissionGate.svelte';
	
	// Estados principais
	let loading = $state(true);
	let activeTab = $state<'carriers' | 'zones' | 'rates' | 'sellers'>('carriers');

	// Estatísticas
	let stats = $state({
		totalCarriers: 0,
		activeZones: 0,
		totalSellers: 0,
		avgShippingTime: 0
	});
	
	// Dados tipados
	let carriers = $state<ShippingCarrier[]>([]);
	let zones = $state<ShippingZone[]>([]);
	let sellerConfigs = $state<SellerShippingConfig[]>([]);
	let rates = $state<ShippingRate[]>([]);
	
	// Tabs do sistema
	const tabs = [
		{ id: 'carriers', label: 'Transportadoras', icon: 'truck' },
		{ id: 'zones', label: 'Zonas de Entrega', icon: 'MapPin' },
		{ id: 'rates', label: 'Tabela de Preços', icon: 'DollarSign' },
		{ id: 'sellers', label: 'Configurações Sellers', icon: 'Users' }
	];
	
	// Carregar dados das transportadoras
	async function loadCarriers() {
		try {
			const response = await shippingService.getCarriers();
			if (response.success) {
				carriers = response.data.items;
				return response.data.stats;
			}
		} catch (error) {
			console.error('Erro ao carregar transportadoras:', error);
		}
		return null;
	}
	
	// Carregar dados das zonas
	async function loadZones() {
		try {
			const response = await shippingService.getZones();
			if (response.success) {
				zones = response.data.items;
				return response.data.stats;
			}
		} catch (error) {
			console.error('Erro ao carregar zonas:', error);
		}
		return null;
	}
	
	// Carregar configurações dos sellers
	async function loadSellerConfigs() {
		try {
			const response = await shippingService.getSellerConfigs();
			if (response.success) {
				sellerConfigs = response.data.items;
				return response.data.stats;
			}
		} catch (error) {
			console.error('Erro ao carregar configurações de sellers:', error);
		}
		return null;
	}
	
	// Carregar tabela de preços
	async function loadRates() {
		try {
			const response = await shippingService.getRates();
			if (response.success) {
				rates = response.data.items;
				return response.data.stats;
			}
		} catch (error) {
			console.error('Erro ao carregar tabela de preços:', error);
		}
		return null;
	}
	
	// Carregar dados iniciais
	async function loadShippingData() {
		loading = true;
		try {
			const [carriersStats, zonesStats, sellersStats, ratesStats] = await Promise.all([
				loadCarriers(),
				loadZones(),
				loadSellerConfigs(),
				loadRates()
			]);
			
			// Consolidar estatísticas
			stats = {
				totalCarriers: carriersStats?.totalCarriers || 0,
				activeZones: zonesStats?.activeZones || 0,
				totalSellers: sellersStats?.uniqueSellers || 0,
				avgShippingTime: Math.round(ratesStats?.avgDeliveryTime || 0)
			};
		} catch (error) {
			console.error('Erro ao carregar dados de frete:', error);
			toast.error('Erro ao carregar dados de frete');
		} finally {
			loading = false;
		}
	}
	
	onMount(() => {
		loadShippingData();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-[calc(100vw-100px)] mx-auto px-4 py-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Gestão de Frete</h1>
					<p class="text-gray-600 mt-1">Configure transportadoras, zonas e preços de entrega</p>
				</div>
				<PermissionGate permission="shipping.manage">
					<button
						class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Nova Configuração
					</button>
				</PermissionGate>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="max-w-[calc(100vw-100px)] mx-auto p-6">
		<!-- Cards de Estatísticas -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
			<div class="bg-white rounded-lg p-6 border border-gray-200">
							<div class="flex items-center justify-between">
								<div>
						<p class="text-sm font-medium text-gray-600">Transportadoras</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.totalCarriers}</p>
								</div>
					<div class="p-3 bg-[#00BFB3]/10 rounded-lg">
						<ModernIcon name="truck" size={24} color="#00BFB3" />
								</div>
							</div>
				</div>

			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Zonas Ativas</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.activeZones}</p>
						</div>
					<div class="p-3 bg-blue-100 rounded-lg">
						<ModernIcon name="location" size={24} color="#2563EB" />
					</div>
						</div>
					</div>
			
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
										<div>
						<p class="text-sm font-medium text-gray-600">Sellers Configurados</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.totalSellers}</p>
										</div>
					<div class="p-3 bg-green-100 rounded-lg">
						<ModernIcon name="seller" size={24} color="#16A34A" />
									</div>
				</div>
								</div>

			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">Tempo Médio</p>
						<p class="text-2xl font-bold text-gray-900 mt-1">{stats.avgShippingTime} dias</p>
									</div>
					<div class="p-3 bg-yellow-100 rounded-lg">
						<ModernIcon name="Clock" size={24} color="#F59E0B" />
									</div>
										</div>
									</div>
								</div>

		<!-- Tabs -->
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
			<div class="border-b px-6">
				<div class="flex gap-4 overflow-x-auto">
					{#each tabs as tab}
									<button
							onclick={() => activeTab = tab.id}
							class="py-4 px-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap {
								activeTab === tab.id 
									? 'border-[#00BFB3] text-[#00BFB3]' 
									: 'border-transparent text-gray-600 hover:text-gray-900'
							}"
						>
							<ModernIcon name={tab.icon} size={16} />
							{tab.label}
									</button>
					{/each}
								</div>
							</div>
			
			<!-- Tab Content -->
			<div class="p-6">
				{#if loading}
					<div class="flex items-center justify-center py-12">
						<div class="text-center">
							<div class="w-12 h-12 border-4 border-gray-200 border-t-[#00BFB3] rounded-full animate-spin mx-auto mb-4"></div>
							<p class="text-gray-600">Carregando configurações...</p>
						</div>
				</div>
				{:else if activeTab === 'carriers'}
					<div class="space-y-6">
						{#if carriers.length === 0}
							<div class="text-center py-12">
								<ModernIcon name="truck" size={48} />
								<h3 class="text-lg font-medium text-gray-900 mt-4 mb-2">Nenhuma Transportadora</h3>
								<p class="text-gray-600 max-w-md mx-auto">
									Configure as transportadoras disponíveis (Correios, Frenet, etc.) para começar a calcular fretes.
								</p>
								<button class="mt-4 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
									Adicionar Primeira Transportadora
								</button>
								</div>
						{:else}
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<h3 class="text-lg font-medium text-gray-900">Transportadoras Cadastradas</h3>
									<button class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
										Nova Transportadora
									</button>
							</div>

								<div class="grid gap-4">
									{#each carriers as carrier}
										<div class="border border-gray-200 rounded-lg p-4">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-3">
													<div class="p-2 bg-gray-100 rounded-lg">
														<ModernIcon name="truck" size={20} />
								</div>
													<div>
														<h4 class="font-medium text-gray-900">{carrier.name}</h4>
														<p class="text-sm text-gray-600">{carrier.type}</p>
							</div>
											</div>
												<div class="flex items-center gap-2">
													<span class="px-2 py-1 text-xs rounded-full {carrier.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
														{carrier.is_active ? 'Ativo' : 'Inativo'}
													</span>
													<button class="p-2 text-gray-400 hover:text-gray-600">
														<ModernIcon name="MoreHorizontal" size={16} />
													</button>
								</div>
							</div>
											{#if carrier.description}
												<p class="text-sm text-gray-600 mt-2">{carrier.description}</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
						{/if}
							</div>
				{:else if activeTab === 'zones'}
					<div class="space-y-6">
						{#if zones.length === 0}
							<div class="text-center py-12">
								<ModernIcon name="location" size={48} />
								<h3 class="text-lg font-medium text-gray-900 mt-4 mb-2">Nenhuma Zona Configurada</h3>
								<p class="text-gray-600 max-w-md mx-auto">
									Configure zonas por CEP, estado ou região e defina preços específicos para cada área.
								</p>
								<button class="mt-4 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
									Criar Primeira Zona
								</button>
						</div>
								{:else}
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<h3 class="text-lg font-medium text-gray-900">Zonas de Entrega</h3>
									<button class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
										Nova Zona
								</button>
							</div>

								<div class="grid gap-4">
									{#each zones as zone}
										<div class="border border-gray-200 rounded-lg p-4">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-3">
													<div class="p-2 bg-blue-100 rounded-lg">
														<ModernIcon name="location" size={20} color="#2563EB" />
								</div>
													<div>
														<h4 class="font-medium text-gray-900">{zone.name}</h4>
														<p class="text-sm text-gray-600">
															{Array.isArray(zone.states) ? zone.states.join(', ') : zone.states}
														</p>
						</div>
					</div>
												<div class="flex items-center gap-2">
													<span class="px-2 py-1 text-xs rounded-full {zone.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
														{zone.is_active ? 'Ativo' : 'Inativo'}
													</span>
													<button class="p-2 text-gray-400 hover:text-gray-600">
														<ModernIcon name="MoreHorizontal" size={16} />
													</button>
								</div>
								</div>
										</div>
										{/each}
								</div>
								</div>
						{/if}
							</div>
				{:else if activeTab === 'rates'}
					<div class="space-y-6">
						{#if rates.length === 0}
							<div class="text-center py-12">
								<ModernIcon name="DollarSign" size={48} />
								<h3 class="text-lg font-medium text-gray-900 mt-4 mb-2">Nenhuma Tabela de Preços</h3>
								<p class="text-gray-600 max-w-md mx-auto">
									Configure os preços por faixa de peso para cada transportadora e zona de entrega.
								</p>
								<button class="mt-4 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
									Criar Primeira Tabela
								</button>
						</div>
						{:else}
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<h3 class="text-lg font-medium text-gray-900">Tabela de Preços</h3>
									<button class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
										Nova Faixa de Preço
									</button>
				</div>

						<div class="overflow-x-auto">
									<table class="w-full border border-gray-200 rounded-lg">
										<thead class="bg-gray-50">
											<tr>
												<th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Transportadora</th>
												<th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Zona</th>
												<th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Peso (kg)</th>
												<th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Preço</th>
												<th class="px-4 py-3 text-left text-sm font-medium text-gray-900">Prazo</th>
												<th class="px-4 py-3 text-center text-sm font-medium text-gray-900">Ações</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
											{#each rates as rate}
												<tr class="hover:bg-gray-50">
													<td class="px-4 py-3 text-sm text-gray-900">{rate.carrier_name}</td>
													<td class="px-4 py-3 text-sm text-gray-900">{rate.zone_name}</td>
													<td class="px-4 py-3 text-sm text-gray-600">{rate.weight_from} - {rate.weight_to} kg</td>
													<td class="px-4 py-3 text-sm font-medium text-gray-900">R$ {rate.price.toFixed(2)}</td>
													<td class="px-4 py-3 text-sm text-gray-600">{rate.delivery_time_min}-{rate.delivery_time_max} dias</td>
													<td class="px-4 py-3 text-center">
														<button class="p-1 text-gray-400 hover:text-gray-600">
															<ModernIcon name="MoreHorizontal" size={16} />
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
											{/if}
										</div>
				{:else if activeTab === 'sellers'}
					<div class="space-y-6">
						{#if sellerConfigs.length === 0}
							<div class="text-center py-12">
								<ModernIcon name="seller" size={48} />
								<h3 class="text-lg font-medium text-gray-900 mt-4 mb-2">Nenhuma Configuração de Seller</h3>
								<p class="text-gray-600 max-w-md mx-auto">
									Configure as regras de frete específicas para cada seller, incluindo markup e frete grátis.
								</p>
								<button class="mt-4 px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
									Configurar Primeiro Seller
								</button>
									</div>
										{:else}
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<h3 class="text-lg font-medium text-gray-900">Configurações por Seller</h3>
									<button class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors">
										Nova Configuração
										</button>
									</div>
								
								<div class="grid gap-4">
									{#each sellerConfigs as config}
										<div class="border border-gray-200 rounded-lg p-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
													<div class="p-2 bg-green-100 rounded-lg">
														<ModernIcon name="seller" size={20} color="#16A34A" />
													</div>
						<div>
														<h4 class="font-medium text-gray-900">{config.seller_name}</h4>
														<p class="text-sm text-gray-600">{config.carrier_name}</p>
						</div>
					</div>
												<div class="flex items-center gap-4">
													<div class="text-right">
														<p class="text-sm text-gray-600">Markup: {config.markup_percentage}%</p>
														{#if config.free_shipping_threshold}
															<p class="text-sm text-gray-600">Frete grátis: R$ {config.free_shipping_threshold}</p>
{/if}
					</div>
													<span class="px-2 py-1 text-xs rounded-full {config.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
														{config.is_active ? 'Ativo' : 'Inativo'}
													</span>
													<button class="p-2 text-gray-400 hover:text-gray-600">
														<ModernIcon name="MoreHorizontal" size={16} />
					</button>
				</div>
			</div>
			</div>
									{/each}
		</div>
	</div>
{/if}
							</div>
						{/if}
						</div>
					</div>

		<!-- Info Alert -->
		{#if carriers.length === 0 && zones.length === 0}
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div class="flex items-start gap-3">
					<ModernIcon name="info" size={20} color="#2563EB" />
					<div class="flex-1">
						<h4 class="font-medium text-blue-900 mb-1">Sistema de Frete Conectado</h4>
						<p class="text-blue-700 text-sm">
							O sistema está conectado ao banco de dados real. Comece cadastrando transportadoras e zonas de entrega para configurar o cálculo de frete.
							</p>
						</div>
								</div>
									</div>
								{/if}
								</div>
								</div>