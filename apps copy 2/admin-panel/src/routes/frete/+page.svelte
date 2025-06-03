<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade, scale, slide, blur } from 'svelte/transition';
	import { quintOut, backOut, elasticOut } from 'svelte/easing';

	interface ShippingMethod {
		id: string;
		name: string;
		carrier: string;
		icon: string;
		description: string;
		estimatedDays: { min: number; max: number };
		isActive: boolean;
		priceCalculation: 'fixed' | 'weight' | 'dimensions' | 'custom';
		basePrice: number;
		pricePerKg?: number;
		maxWeight?: number;
		regions: string[];
		trackingAvailable: boolean;
		deliveries?: number;
		avgDeliveryTime?: number;
	}

	interface ShippingZone {
		id: string;
		name: string;
		states: string[];
		methods: string[];
		isActive: boolean;
		totalDeliveries?: number;
	}

	interface Shipment {
		id: string;
		orderId: string;
		orderNumber: string;
		trackingCode?: string;
		carrier: string;
		method: string;
		status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered' | 'returned';
		customer: {
			name: string;
			email: string;
			avatar?: string;
		};
		destination: {
			city: string;
			state: string;
			zipCode: string;
			address: string;
		};
		weight: number;
		dimensions?: {
			length: number;
			width: number;
			height: number;
		};
		price: number;
		createdAt: Date;
		shippedAt?: Date;
		deliveredAt?: Date;
		estimatedDelivery?: Date;
	}

	let methods = $state<ShippingMethod[]>([]);
	let zones = $state<ShippingZone[]>([]);
	let shipments = $state<Shipment[]>([]);
	let filteredShipments = $derived(applyFilters());
	let selectedShipments = $state<Set<string>>(new Set());
	let searchQuery = $state('');
	let viewMode = $state<'list' | 'grid'>('list');
	let showFilters = $state(false);
	let activeTab = $state<'overview' | 'methods' | 'zones' | 'shipments'>('overview');
	let showMethodModal = $state(false);
	let showZoneModal = $state(false);
	let showShipmentDetail = $state(false);
	let selectedMethod = $state<ShippingMethod | null>(null);
	let selectedZone = $state<ShippingZone | null>(null);
	let selectedShipment = $state<Shipment | null>(null);
	let currentPage = $state(1);
	let itemsPerPage = 10;

	// Filtros
	let filters = $state({
		status: 'all',
		carrier: 'all',
		dateRange: 'all',
		zone: 'all'
	});

	// Estatísticas
	let stats = $derived({
		totalShipments: shipments.length,
		pending: shipments.filter(s => s.status === 'pending').length,
		inTransit: shipments.filter(s => ['shipped', 'in_transit'].includes(s.status)).length,
		delivered: shipments.filter(s => s.status === 'delivered').length,
		avgDeliveryTime: calculateAvgDeliveryTime(),
		totalRevenue: shipments.reduce((sum, s) => sum + s.price, 0),
		activeCarriers: new Set(shipments.map(s => s.carrier)).size,
		onTimeDelivery: calculateOnTimeDeliveryRate()
	});

	// Estados brasileiros
	const brazilianStates = [
		{ code: 'AC', name: 'Acre' },
		{ code: 'AL', name: 'Alagoas' },
		{ code: 'AP', name: 'Amapá' },
		{ code: 'AM', name: 'Amazonas' },
		{ code: 'BA', name: 'Bahia' },
		{ code: 'CE', name: 'Ceará' },
		{ code: 'DF', name: 'Distrito Federal' },
		{ code: 'ES', name: 'Espírito Santo' },
		{ code: 'GO', name: 'Goiás' },
		{ code: 'MA', name: 'Maranhão' },
		{ code: 'MT', name: 'Mato Grosso' },
		{ code: 'MS', name: 'Mato Grosso do Sul' },
		{ code: 'MG', name: 'Minas Gerais' },
		{ code: 'PA', name: 'Pará' },
		{ code: 'PB', name: 'Paraíba' },
		{ code: 'PR', name: 'Paraná' },
		{ code: 'PE', name: 'Pernambuco' },
		{ code: 'PI', name: 'Piauí' },
		{ code: 'RJ', name: 'Rio de Janeiro' },
		{ code: 'RN', name: 'Rio Grande do Norte' },
		{ code: 'RS', name: 'Rio Grande do Sul' },
		{ code: 'RO', name: 'Rondônia' },
		{ code: 'RR', name: 'Roraima' },
		{ code: 'SC', name: 'Santa Catarina' },
		{ code: 'SP', name: 'São Paulo' },
		{ code: 'SE', name: 'Sergipe' },
		{ code: 'TO', name: 'Tocantins' }
	];

	onMount(() => {
		loadShippingData();
	});

	function loadShippingData() {
		// Mock data
		methods = [
			{
				id: '1',
				name: 'PAC - Encomenda Econômica',
				carrier: 'correios',
				icon: '📮',
				description: 'Entrega econômica pelos Correios',
				estimatedDays: { min: 5, max: 10 },
				isActive: true,
				priceCalculation: 'weight',
				basePrice: 15.00,
				pricePerKg: 5.00,
				maxWeight: 30,
				regions: ['all'],
				trackingAvailable: true,
				deliveries: 1523,
				avgDeliveryTime: 7.5
			},
			{
				id: '2',
				name: 'SEDEX - Entrega Expressa',
				carrier: 'correios',
				icon: '✈️',
				description: 'Entrega rápida pelos Correios',
				estimatedDays: { min: 1, max: 3 },
				isActive: true,
				priceCalculation: 'weight',
				basePrice: 25.00,
				pricePerKg: 8.00,
				maxWeight: 30,
				regions: ['all'],
				trackingAvailable: true,
				deliveries: 892,
				avgDeliveryTime: 2.1
			},
			{
				id: '3',
				name: 'Transportadora Premium',
				carrier: 'premium',
				icon: '🚚',
				description: 'Entrega especializada com seguro',
				estimatedDays: { min: 3, max: 7 },
				isActive: true,
				priceCalculation: 'custom',
				basePrice: 20.00,
				maxWeight: 50,
				regions: ['SP', 'RJ', 'MG', 'ES'],
				trackingAvailable: true,
				deliveries: 456,
				avgDeliveryTime: 4.8
			},
			{
				id: '4',
				name: 'Retirada na Loja',
				carrier: 'pickup',
				icon: '🏪',
				description: 'Cliente retira o pedido na loja',
				estimatedDays: { min: 0, max: 0 },
				isActive: true,
				priceCalculation: 'fixed',
				basePrice: 0,
				regions: ['SP'],
				trackingAvailable: false,
				deliveries: 234,
				avgDeliveryTime: 0
			},
			{
				id: '5',
				name: 'Motoboy Express',
				carrier: 'motoboy',
				icon: '🏍️',
				description: 'Entrega no mesmo dia na região metropolitana',
				estimatedDays: { min: 0, max: 1 },
				isActive: true,
				priceCalculation: 'fixed',
				basePrice: 12.00,
				regions: ['SP'],
				trackingAvailable: true,
				deliveries: 678,
				avgDeliveryTime: 0.3
			}
		];

		zones = [
			{
				id: '1',
				name: 'Região Sudeste',
				states: ['SP', 'RJ', 'MG', 'ES'],
				methods: ['1', '2', '3', '4', '5'],
				isActive: true,
				totalDeliveries: 2845
			},
			{
				id: '2',
				name: 'Região Sul',
				states: ['PR', 'SC', 'RS'],
				methods: ['1', '2'],
				isActive: true,
				totalDeliveries: 1234
			},
			{
				id: '3',
				name: 'Região Nordeste',
				states: ['BA', 'PE', 'CE', 'MA', 'RN', 'PB', 'SE', 'AL', 'PI'],
				methods: ['1', '2'],
				isActive: true,
				totalDeliveries: 876
			},
			{
				id: '4',
				name: 'Região Norte',
				states: ['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'],
				methods: ['1'],
				isActive: true,
				totalDeliveries: 432
			},
			{
				id: '5',
				name: 'Região Centro-Oeste',
				states: ['GO', 'MT', 'MS', 'DF'],
				methods: ['1', '2'],
				isActive: true,
				totalDeliveries: 567
			}
		];

		shipments = Array.from({ length: 50 }, (_, i) => {
			const carrier = ['correios', 'correios', 'premium', 'pickup', 'motoboy'][i % 5];
			const status = ['pending', 'processing', 'shipped', 'in_transit', 'delivered', 'delivered'][i % 6] as any;
			const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
			const shippedAt = ['shipped', 'in_transit', 'delivered'].includes(status) 
				? new Date(createdAt.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000)
				: undefined;
			const deliveredAt = status === 'delivered'
				? new Date((shippedAt || createdAt).getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
				: undefined;

			return {
				id: `ship-${i + 1}`,
				orderId: `order-${i + 1}`,
				orderNumber: `#2024${String(i + 1).padStart(3, '0')}`,
				trackingCode: ['shipped', 'in_transit', 'delivered'].includes(status) ? `BR${String(100000000 + i).padStart(11, '0')}BR` : undefined,
				carrier,
				method: ['PAC', 'SEDEX', 'Premium', 'Retirada', 'Express'][i % 5],
				status,
				customer: {
					name: ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Dias'][i % 5],
					email: ['joao@email.com', 'maria@email.com', 'pedro@email.com', 'ana@email.com', 'carlos@email.com'][i % 5],
					avatar: i % 3 === 0 ? `https://i.pravatar.cc/150?img=${i}` : undefined
				},
				destination: {
					city: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre'][i % 5],
					state: ['SP', 'RJ', 'MG', 'PR', 'RS'][i % 5],
					zipCode: `${Math.floor(10000 + Math.random() * 89999)}-000`,
					address: `Rua ${['das Flores', 'Principal', 'dos Pinheiros', 'Augusta', 'Paulista'][i % 5]}, ${Math.floor(Math.random() * 999) + 1}`
				},
				weight: Math.random() * 10 + 0.5,
				dimensions: i % 2 === 0 ? {
					length: Math.floor(Math.random() * 50) + 10,
					width: Math.floor(Math.random() * 40) + 10,
					height: Math.floor(Math.random() * 30) + 5
				} : undefined,
				price: Math.random() * 50 + 15,
				createdAt,
				shippedAt,
				deliveredAt,
				estimatedDelivery: shippedAt ? new Date(shippedAt.getTime() + (carrier === 'correios' ? 7 : 3) * 24 * 60 * 60 * 1000) : undefined
			};
		});
	}

	function applyFilters() {
		let result = [...shipments];

		// Busca
		if (searchQuery) {
			result = result.filter(s => 
				s.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.trackingCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.destination.city.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		// Status
		if (filters.status !== 'all') {
			result = result.filter(s => s.status === filters.status);
		}

		// Transportadora
		if (filters.carrier !== 'all') {
			result = result.filter(s => s.carrier === filters.carrier);
		}

		// Zona
		if (filters.zone !== 'all') {
			const zone = zones.find(z => z.id === filters.zone);
			if (zone) {
				result = result.filter(s => zone.states.includes(s.destination.state));
			}
		}

		// Data
		if (filters.dateRange !== 'all') {
			const now = new Date();
			const ranges: Record<string, number> = {
				today: 0,
				week: 7,
				month: 30,
				quarter: 90
			};
			const days = ranges[filters.dateRange];
			if (days !== undefined) {
				result = result.filter(s => {
					const diff = (now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24);
					return diff <= days;
				});
			}
		}

		return result;
	}

	function calculateAvgDeliveryTime() {
		const delivered = shipments.filter(s => s.deliveredAt && s.shippedAt);
		if (delivered.length === 0) return 0;

		const totalDays = delivered.reduce((sum, s) => {
			const days = (s.deliveredAt!.getTime() - s.shippedAt!.getTime()) / (1000 * 60 * 60 * 24);
			return sum + days;
		}, 0);

		return Math.round(totalDays / delivered.length * 10) / 10;
	}

	function calculateOnTimeDeliveryRate() {
		const deliveredWithEstimate = shipments.filter(s => s.deliveredAt && s.estimatedDelivery);
		if (deliveredWithEstimate.length === 0) return 100;

		const onTime = deliveredWithEstimate.filter(s => s.deliveredAt! <= s.estimatedDelivery!);
		return Math.round((onTime.length / deliveredWithEstimate.length) * 100);
	}

	function handleSelectAll() {
		if (selectedShipments.size === filteredShipments.length) {
			selectedShipments.clear();
		} else {
			selectedShipments = new Set(filteredShipments.map(s => s.id));
		}
		selectedShipments = selectedShipments;
	}

	function handleSelect(id: string) {
		if (selectedShipments.has(id)) {
			selectedShipments.delete(id);
		} else {
			selectedShipments.add(id);
		}
		selectedShipments = selectedShipments;
	}

	function handleBulkAction(action: string) {
		if (selectedShipments.size === 0) return;

		switch (action) {
			case 'print':
				alert(`Imprimindo ${selectedShipments.size} etiquetas`);
				break;
			case 'export':
				alert(`Exportando ${selectedShipments.size} envios`);
				break;
			case 'tracking':
				alert(`Enviando atualizações para ${selectedShipments.size} envios`);
				break;
		}
		selectedShipments.clear();
		selectedShipments = selectedShipments;
	}

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('pt-BR', {
			style: 'currency',
			currency: 'BRL'
		}).format(price);
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(date);
	}

	function formatDateTime(date: Date): string {
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	function formatWeight(weight: number): string {
		return `${weight.toFixed(1)} kg`;
	}

	function getStatusColor(status: Shipment['status']) {
		const colors = {
			pending: 'bg-gray-100 text-gray-800 border-gray-200',
			processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
			shipped: 'bg-blue-100 text-blue-800 border-blue-200',
			in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
			delivered: 'bg-green-100 text-green-800 border-green-200',
			returned: 'bg-red-100 text-red-800 border-red-200'
		};
		return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
	}

	function getStatusLabel(status: Shipment['status']) {
		const labels = {
			pending: 'Pendente',
			processing: 'Processando',
			shipped: 'Despachado',
			in_transit: 'Em Trânsito',
			delivered: 'Entregue',
			returned: 'Devolvido'
		};
		return labels[status] || status;
	}

	function getCarrierLabel(carrier: string) {
		const labels: Record<string, string> = {
			correios: 'Correios',
			premium: 'Premium',
			pickup: 'Retirada',
			motoboy: 'Motoboy'
		};
		return labels[carrier] || carrier;
	}

	function openMethodModal(method: ShippingMethod | null = null) {
		selectedMethod = method;
		showMethodModal = true;
	}

	function openZoneModal(zone: ShippingZone | null = null) {
		selectedZone = zone;
		showZoneModal = true;
	}

	function openShipmentDetail(shipment: Shipment) {
		selectedShipment = shipment;
		showShipmentDetail = true;
	}

	// Paginação
	let paginatedShipments = $derived(
		filteredShipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);
	let totalPages = $derived(Math.ceil(filteredShipments.length / itemsPerPage));
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
	<!-- Header -->
	<div class="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<div in:fly={{ x: -20, duration: 500, easing: quintOut }}>
					<h1 class="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
						Gestão de Frete
					</h1>
					<p class="text-gray-600 mt-1">Configure métodos de envio e acompanhe entregas</p>
				</div>
				
				<div class="flex items-center gap-3" in:fly={{ x: 20, duration: 500, delay: 100, easing: quintOut }}>
					<button
						onclick={() => openMethodModal()}
						class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Novo Método
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Tabs -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
		<div class="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
			{#each [
				{ id: 'overview', label: 'Visão Geral', icon: '📊' },
				{ id: 'methods', label: 'Métodos de Envio', icon: '🚚' },
				{ id: 'zones', label: 'Zonas de Entrega', icon: '🗺️' },
				{ id: 'shipments', label: 'Envios', icon: '📦' }
			] as tab}
				<button
					onclick={() => activeTab = tab.id as typeof activeTab}
					class="flex-1 px-4 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-2 {activeTab === tab.id ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}"
				>
					<span class="text-lg">{tab.icon}</span>
					<span class="font-medium">{tab.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Content -->
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
		{#if activeTab === 'overview'}
			<!-- Stats Cards -->
			<div in:fade={{ duration: 300 }}>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{#each [
						{ label: 'Total de Envios', value: stats.totalShipments, icon: '📦', color: 'from-blue-400 to-blue-600', delay: 0 },
						{ label: 'Pendentes', value: stats.pending, icon: '⏳', color: 'from-yellow-400 to-orange-500', delay: 50 },
						{ label: 'Em Trânsito', value: stats.inTransit, icon: '🚚', color: 'from-purple-400 to-pink-600', delay: 100 },
						{ label: 'Entregues', value: stats.delivered, icon: '✅', color: 'from-green-400 to-emerald-600', delay: 150 },
						{ label: 'Tempo Médio', value: `${stats.avgDeliveryTime} dias`, icon: '⏱️', color: 'from-cyan-400 to-blue-600', delay: 200 },
						{ label: 'Receita', value: formatPrice(stats.totalRevenue), icon: '💰', color: 'from-pink-400 to-rose-600', delay: 250 },
						{ label: 'Transportadoras', value: stats.activeCarriers, icon: '🏢', color: 'from-indigo-400 to-purple-600', delay: 300 },
						{ label: 'No Prazo', value: `${stats.onTimeDelivery}%`, icon: '📈', color: 'from-emerald-400 to-teal-600', delay: 350 }
					] as stat, i}
						<div
							in:fly={{ y: 20, duration: 500, delay: stat.delay, easing: quintOut }}
							class="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-100"
						>
							<div class="flex items-center justify-between">
								<div>
									<p class="text-gray-600 text-sm">{stat.label}</p>
									<p class="text-2xl font-bold mt-1 bg-gradient-to-r {stat.color} bg-clip-text text-transparent">
										{stat.value}
									</p>
								</div>
								<div class="text-3xl transform hover:scale-110 transition-transform duration-200">
									{stat.icon}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Charts placeholder -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Envios por Status</h3>
						<div class="h-64 flex items-center justify-center text-gray-400">
							<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
					</div>

					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Performance de Entrega</h3>
						<div class="h-64 flex items-center justify-center text-gray-400">
							<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
							</svg>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'methods'}
			<!-- Shipping Methods -->
			<div in:fade={{ duration: 300 }}>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each methods as method, i}
						<div
							in:scale={{ duration: 300, delay: i * 50, easing: backOut }}
							class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
						>
							<div class="p-6">
								<!-- Header -->
								<div class="flex items-start justify-between mb-4">
									<div class="flex items-center gap-3">
										<div class="text-4xl">{method.icon}</div>
										<div>
											<h3 class="text-lg font-semibold text-gray-900">{method.name}</h3>
											<p class="text-sm text-gray-500">{getCarrierLabel(method.carrier)}</p>
										</div>
									</div>
									<label class="relative inline-flex items-center cursor-pointer">
										<input type="checkbox" checked={method.isActive} class="sr-only peer">
										<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
									</label>
								</div>

								<!-- Description -->
								<p class="text-gray-600 text-sm mb-4">{method.description}</p>

								<!-- Details -->
								<div class="space-y-2 mb-4">
									<div class="flex items-center justify-between text-sm">
										<span class="text-gray-500">Prazo:</span>
										<span class="font-medium text-gray-900">
											{method.estimatedDays.min}-{method.estimatedDays.max} dias úteis
										</span>
									</div>
									<div class="flex items-center justify-between text-sm">
										<span class="text-gray-500">Preço base:</span>
										<span class="font-medium text-gray-900">{formatPrice(method.basePrice)}</span>
									</div>
									{#if method.pricePerKg}
										<div class="flex items-center justify-between text-sm">
											<span class="text-gray-500">Por kg:</span>
											<span class="font-medium text-gray-900">{formatPrice(method.pricePerKg)}</span>
										</div>
									{/if}
									<div class="flex items-center justify-between text-sm">
										<span class="text-gray-500">Rastreamento:</span>
										<span class="font-medium text-gray-900">
											{method.trackingAvailable ? '✅ Disponível' : '❌ Indisponível'}
										</span>
									</div>
								</div>

								<!-- Stats -->
								{#if method.deliveries}
									<div class="pt-4 border-t border-gray-100">
										<div class="flex items-center justify-between text-sm">
											<span class="text-gray-500">Entregas:</span>
											<span class="font-medium text-gray-900">{method.deliveries.toLocaleString('pt-BR')}</span>
										</div>
										<div class="flex items-center justify-between text-sm">
											<span class="text-gray-500">Tempo médio:</span>
											<span class="font-medium text-gray-900">{method.avgDeliveryTime} dias</span>
										</div>
									</div>
								{/if}

								<!-- Actions -->
								<div class="mt-4 pt-4 border-t border-gray-100">
									<button
										onclick={() => openMethodModal(method)}
										class="w-full px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all text-sm"
									>
										Configurar
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else if activeTab === 'zones'}
			<!-- Shipping Zones -->
			<div in:fade={{ duration: 300 }}>
				<div class="space-y-4">
					{#each zones as zone, i}
						<div
							in:fly={{ y: 20, duration: 400, delay: i * 50 }}
							class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-6"
						>
							<div class="flex items-start justify-between mb-4">
								<div>
									<h3 class="text-lg font-semibold text-gray-900">{zone.name}</h3>
									<p class="text-sm text-gray-500 mt-1">
										{zone.states.length} estados • {zone.methods.length} métodos de envio
									</p>
								</div>
								<div class="flex items-center gap-2">
									<label class="relative inline-flex items-center cursor-pointer">
										<input type="checkbox" checked={zone.isActive} class="sr-only peer">
										<div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
									</label>
									<button
										onclick={() => openZoneModal(zone)}
										class="p-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
								</div>
							</div>

							<!-- States -->
							<div class="mb-4">
								<h4 class="text-sm font-medium text-gray-700 mb-2">Estados incluídos:</h4>
								<div class="flex flex-wrap gap-2">
									{#each zone.states as stateCode}
										{@const state = brazilianStates.find(s => s.code === stateCode)}
										<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 border border-cyan-200">
											{state?.name || stateCode}
										</span>
									{/each}
								</div>
							</div>

							<!-- Methods -->
							<div class="mb-4">
								<h4 class="text-sm font-medium text-gray-700 mb-2">Métodos disponíveis:</h4>
								<div class="grid grid-cols-2 md:grid-cols-3 gap-2">
									{#each zone.methods as methodId}
										{@const method = methods.find(m => m.id === methodId)}
										{#if method}
											<div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
												<span class="text-lg">{method.icon}</span>
												<span class="text-sm text-gray-700">{method.name}</span>
											</div>
										{/if}
									{/each}
								</div>
							</div>

							<!-- Stats -->
							{#if zone.totalDeliveries}
								<div class="pt-4 border-t border-gray-100">
									<div class="flex items-center gap-4 text-sm">
										<span class="text-gray-500">Total de entregas:</span>
										<span class="font-medium text-gray-900">{zone.totalDeliveries.toLocaleString('pt-BR')}</span>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{:else if activeTab === 'shipments'}
			<!-- Shipments List -->
			<div in:fade={{ duration: 300 }}>
				<!-- Filters and Search -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
					<div class="flex flex-col lg:flex-row gap-4">
						<!-- Search -->
						<div class="flex-1" in:fly={{ x: -20, duration: 500, easing: quintOut }}>
							<div class="relative">
								<input
									type="text"
									bind:value={searchQuery}
									placeholder="Buscar por pedido, código ou cliente..."
									class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
								>
								<svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-3" in:fly={{ x: 20, duration: 500, delay: 100, easing: quintOut }}>
							<button
								onclick={() => showFilters = !showFilters}
								class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
								</svg>
								Filtros
								{#if showFilters}
									<svg class="w-4 h-4 transform rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								{:else}
									<svg class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								{/if}
							</button>

							<div class="flex items-center border border-gray-300 rounded-lg">
								<button
									onclick={() => viewMode = 'list'}
									class="p-2 {viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
									</svg>
								</button>
								<button
									onclick={() => viewMode = 'grid'}
									class="p-2 {viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors"
								>
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</button>
							</div>

							{#if selectedShipments.size > 0}
								<div class="flex items-center gap-2" in:scale={{ duration: 200 }}>
									<span class="text-sm text-gray-600">{selectedShipments.size} selecionado(s)</span>
									<button
										onclick={() => handleBulkAction('print')}
										class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
									>
										Imprimir
									</button>
									<button
										onclick={() => handleBulkAction('export')}
										class="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
									>
										Exportar
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Expandable Filters -->
					{#if showFilters}
						<div in:slide={{ duration: 300, easing: quintOut }} class="mt-4 pt-4 border-t border-gray-200">
							<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
									<select
										bind:value={filters.status}
										class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									>
										<option value="all">Todos</option>
										<option value="pending">Pendente</option>
										<option value="processing">Processando</option>
										<option value="shipped">Despachado</option>
										<option value="in_transit">Em Trânsito</option>
										<option value="delivered">Entregue</option>
										<option value="returned">Devolvido</option>
									</select>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Transportadora</label>
									<select
										bind:value={filters.carrier}
										class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									>
										<option value="all">Todas</option>
										<option value="correios">Correios</option>
										<option value="premium">Premium</option>
										<option value="pickup">Retirada</option>
										<option value="motoboy">Motoboy</option>
									</select>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Zona</label>
									<select
										bind:value={filters.zone}
										class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									>
										<option value="all">Todas</option>
										{#each zones as zone}
											<option value={zone.id}>{zone.name}</option>
										{/each}
									</select>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Período</label>
									<select
										bind:value={filters.dateRange}
										class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
									>
										<option value="all">Todo período</option>
										<option value="today">Hoje</option>
										<option value="week">Última semana</option>
										<option value="month">Último mês</option>
										<option value="quarter">Último trimestre</option>
									</select>
								</div>
							</div>
						</div>
					{/if}
				</div>

				{#if viewMode === 'list'}
					<!-- List View -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gray-50 border-b border-gray-200">
									<tr>
										<th class="px-6 py-3 text-left">
											<input
												type="checkbox"
												checked={selectedShipments.size === filteredShipments.length && filteredShipments.length > 0}
												onchange={handleSelectAll}
												class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
											>
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Pedido
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Cliente
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Destino
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Método
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Valor
										</th>
										<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											Ações
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200">
									{#each paginatedShipments as shipment, i}
										<tr
											in:fly={{ x: -20, duration: 300, delay: i * 50 }}
											class="hover:bg-gray-50 transition-colors"
										>
											<td class="px-6 py-4">
												<input
													type="checkbox"
													checked={selectedShipments.has(shipment.id)}
													onchange={() => handleSelect(shipment.id)}
													class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
												>
											</td>
											<td class="px-6 py-4">
												<div class="text-sm font-medium text-gray-900">{shipment.orderNumber}</div>
												{#if shipment.trackingCode}
													<div class="text-xs text-gray-500">{shipment.trackingCode}</div>
												{/if}
											</td>
											<td class="px-6 py-4">
												<div class="flex items-center">
													{#if shipment.customer.avatar}
														<img
															src={shipment.customer.avatar}
															alt={shipment.customer.name}
															class="w-8 h-8 rounded-full mr-3"
														>
													{:else}
														<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
															<span class="text-xs font-medium text-gray-600">
																{shipment.customer.name.charAt(0)}
															</span>
														</div>
													{/if}
													<div>
														<div class="text-sm font-medium text-gray-900">{shipment.customer.name}</div>
														<div class="text-xs text-gray-500">{shipment.customer.email}</div>
													</div>
												</div>
											</td>
											<td class="px-6 py-4">
												<div class="text-sm text-gray-900">{shipment.destination.city}, {shipment.destination.state}</div>
												<div class="text-xs text-gray-500">{shipment.destination.zipCode}</div>
											</td>
											<td class="px-6 py-4 text-sm text-gray-900">
												{shipment.method}
											</td>
											<td class="px-6 py-4">
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(shipment.status)}">
													{getStatusLabel(shipment.status)}
												</span>
											</td>
											<td class="px-6 py-4 text-sm text-gray-900">
												{formatPrice(shipment.price)}
											</td>
											<td class="px-6 py-4 text-right">
												<button
													onclick={() => openShipmentDetail(shipment)}
													class="text-cyan-600 hover:text-cyan-900 transition-colors"
												>
													<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{:else}
					<!-- Grid View -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each paginatedShipments as shipment, i}
							<div
								in:scale={{ duration: 300, delay: i * 50, easing: backOut }}
								class="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
							>
								<div class="p-4">
									<!-- Header -->
									<div class="flex items-start justify-between mb-3">
										<div>
											<div class="font-semibold text-gray-900">{shipment.orderNumber}</div>
											{#if shipment.trackingCode}
												<div class="text-xs text-gray-500">{shipment.trackingCode}</div>
											{/if}
										</div>
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(shipment.status)}">
											{getStatusLabel(shipment.status)}
										</span>
									</div>

									<!-- Customer -->
									<div class="flex items-center mb-3">
										{#if shipment.customer.avatar}
											<img
												src={shipment.customer.avatar}
												alt={shipment.customer.name}
												class="w-10 h-10 rounded-full mr-3"
											>
										{:else}
											<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
												<span class="text-sm font-medium text-gray-600">
													{shipment.customer.name.charAt(0)}
												</span>
											</div>
										{/if}
										<div>
											<div class="font-medium text-gray-900">{shipment.customer.name}</div>
											<div class="text-sm text-gray-500">{shipment.customer.email}</div>
										</div>
									</div>

									<!-- Destination -->
									<div class="mb-3">
										<div class="text-sm font-medium text-gray-700 mb-1">Destino:</div>
										<div class="text-sm text-gray-600">
											{shipment.destination.address}<br>
											{shipment.destination.city}, {shipment.destination.state} - {shipment.destination.zipCode}
										</div>
									</div>

									<!-- Info -->
									<div class="grid grid-cols-2 gap-2 mb-3 text-sm">
										<div>
											<span class="text-gray-500">Método:</span>
											<span class="ml-1 font-medium">{shipment.method}</span>
										</div>
										<div>
											<span class="text-gray-500">Peso:</span>
											<span class="ml-1 font-medium">{formatWeight(shipment.weight)}</span>
										</div>
									</div>

									<!-- Dates -->
									{#if shipment.shippedAt || shipment.deliveredAt}
										<div class="text-xs text-gray-500 mb-3">
											{#if shipment.shippedAt}
												<div>Despachado: {formatDate(shipment.shippedAt)}</div>
											{/if}
											{#if shipment.deliveredAt}
												<div>Entregue: {formatDate(shipment.deliveredAt)}</div>
											{:else if shipment.estimatedDelivery}
												<div>Previsão: {formatDate(shipment.estimatedDelivery)}</div>
											{/if}
										</div>
									{/if}

									<!-- Footer -->
									<div class="flex items-center justify-between pt-3 border-t border-gray-100">
										<div class="text-lg font-semibold text-gray-900">
											{formatPrice(shipment.price)}
										</div>
										<button
											onclick={() => openShipmentDetail(shipment)}
											class="px-3 py-1 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors text-sm"
										>
											Ver detalhes
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="mt-6 flex items-center justify-center gap-2">
						<button
							onclick={() => currentPage = Math.max(1, currentPage - 1)}
							disabled={currentPage === 1}
							class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						
						{#each Array(totalPages) as _, page}
							{#if page === 0 || page === totalPages - 1 || (page >= currentPage - 2 && page <= currentPage + 2)}
								<button
									onclick={() => currentPage = page + 1}
									class="px-3 py-1 rounded-lg {currentPage === page + 1 ? 'bg-cyan-500 text-white' : 'border border-gray-300 hover:bg-gray-50'} transition-colors"
								>
									{page + 1}
								</button>
							{:else if page === currentPage - 3 || page === currentPage + 3}
								<span class="px-2 text-gray-400">...</span>
							{/if}
						{/each}
						
						<button
							onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
							disabled={currentPage === totalPages}
							class="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Method Modal -->
{#if showMethodModal && selectedMethod}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		in:fade={{ duration: 200 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) showMethodModal = false;
		}}
	>
		<div
			class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
			in:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="text-4xl">{selectedMethod.icon}</div>
						<div>
							<h2 class="text-2xl font-bold">{selectedMethod.name}</h2>
							<p class="text-cyan-100 mt-1">{selectedMethod.description}</p>
						</div>
					</div>
					<button
						onclick={() => showMethodModal = false}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Modal Content -->
			<div class="p-6">
				<p class="text-gray-500 text-center py-8">Configurações do método de envio...</p>
			</div>

			<!-- Modal Footer -->
			<div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
				<button
					onclick={() => showMethodModal = false}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancelar
				</button>
				<button
					class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
				>
					Salvar Alterações
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Zone Modal -->
{#if showZoneModal && selectedZone}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		in:fade={{ duration: 200 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) showZoneModal = false;
		}}
	>
		<div
			class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
			in:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">{selectedZone.name}</h2>
						<p class="text-cyan-100 mt-1">Configure os estados e métodos de envio</p>
					</div>
					<button
						onclick={() => showZoneModal = false}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Modal Content -->
			<div class="p-6">
				<p class="text-gray-500 text-center py-8">Configurações da zona de entrega...</p>
			</div>

			<!-- Modal Footer -->
			<div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
				<button
					onclick={() => showZoneModal = false}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancelar
				</button>
				<button
					class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
				>
					Salvar Alterações
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Shipment Detail Modal -->
{#if showShipmentDetail && selectedShipment}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		in:fade={{ duration: 200 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) showShipmentDetail = false;
		}}
	>
		<div
			class="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
			in:scale={{ duration: 300, easing: backOut }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div class="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-2xl font-bold">Detalhes do Envio</h2>
						<p class="text-cyan-100 mt-1">Pedido {selectedShipment.orderNumber}</p>
					</div>
					<button
						onclick={() => showShipmentDetail = false}
						class="p-2 hover:bg-white/20 rounded-lg transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Modal Content -->
			<div class="overflow-y-auto max-h-[calc(90vh-200px)]">
				<div class="p-6 space-y-6">
					<!-- Status -->
					<div class="flex items-center justify-between">
						<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getStatusColor(selectedShipment.status)}">
							{getStatusLabel(selectedShipment.status)}
						</span>
						{#if selectedShipment.trackingCode}
							<div class="text-sm">
								<span class="text-gray-500">Código de rastreamento:</span>
								<span class="ml-2 font-medium text-gray-900">{selectedShipment.trackingCode}</span>
							</div>
						{/if}
					</div>

					<!-- Customer Info -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="font-semibold text-gray-900 mb-3">Informações do Cliente</h3>
						<div class="flex items-center gap-4">
							{#if selectedShipment.customer.avatar}
								<img
									src={selectedShipment.customer.avatar}
									alt={selectedShipment.customer.name}
									class="w-16 h-16 rounded-full"
								>
							{:else}
								<div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
									<span class="text-xl font-medium text-gray-600">
										{selectedShipment.customer.name.charAt(0)}
									</span>
								</div>
							{/if}
							<div>
								<div class="font-medium text-gray-900">{selectedShipment.customer.name}</div>
								<div class="text-sm text-gray-500">{selectedShipment.customer.email}</div>
							</div>
						</div>
					</div>

					<!-- Shipping Info -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="bg-gray-50 rounded-lg p-4">
							<h3 class="font-semibold text-gray-900 mb-3">Endereço de Entrega</h3>
							<p class="text-sm text-gray-600">
								{selectedShipment.destination.address}<br>
								{selectedShipment.destination.city}, {selectedShipment.destination.state}<br>
								CEP: {selectedShipment.destination.zipCode}
							</p>
						</div>

						<div class="bg-gray-50 rounded-lg p-4">
							<h3 class="font-semibold text-gray-900 mb-3">Informações do Pacote</h3>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-500">Peso:</span>
									<span class="font-medium text-gray-900">{formatWeight(selectedShipment.weight)}</span>
								</div>
								{#if selectedShipment.dimensions}
									<div class="flex justify-between">
										<span class="text-gray-500">Dimensões:</span>
										<span class="font-medium text-gray-900">
											{selectedShipment.dimensions.length} x {selectedShipment.dimensions.width} x {selectedShipment.dimensions.height} cm
										</span>
									</div>
								{/if}
								<div class="flex justify-between">
									<span class="text-gray-500">Método:</span>
									<span class="font-medium text-gray-900">{selectedShipment.method}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-500">Valor do frete:</span>
									<span class="font-medium text-gray-900">{formatPrice(selectedShipment.price)}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Timeline -->
					<div>
						<h3 class="font-semibold text-gray-900 mb-3">Histórico do Envio</h3>
						<div class="relative">
							<div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
							<div class="space-y-4">
								<div class="relative flex items-start">
									<div class="absolute left-4 w-2 h-2 bg-cyan-500 rounded-full -translate-x-1/2"></div>
									<div class="ml-10">
										<div class="font-medium text-gray-900">Pedido criado</div>
										<div class="text-sm text-gray-500">{formatDateTime(selectedShipment.createdAt)}</div>
									</div>
								</div>
								{#if selectedShipment.shippedAt}
									<div class="relative flex items-start">
										<div class="absolute left-4 w-2 h-2 bg-cyan-500 rounded-full -translate-x-1/2"></div>
										<div class="ml-10">
											<div class="font-medium text-gray-900">Despachado</div>
											<div class="text-sm text-gray-500">{formatDateTime(selectedShipment.shippedAt)}</div>
										</div>
									</div>
								{/if}
								{#if selectedShipment.deliveredAt}
									<div class="relative flex items-start">
										<div class="absolute left-4 w-2 h-2 bg-green-500 rounded-full -translate-x-1/2 ring-4 ring-green-100"></div>
										<div class="ml-10">
											<div class="font-medium text-gray-900">Entregue</div>
											<div class="text-sm text-gray-500">{formatDateTime(selectedShipment.deliveredAt)}</div>
										</div>
									</div>
								{:else if selectedShipment.estimatedDelivery}
									<div class="relative flex items-start">
										<div class="absolute left-4 w-2 h-2 bg-gray-300 rounded-full -translate-x-1/2"></div>
										<div class="ml-10">
											<div class="font-medium text-gray-400">Previsão de entrega</div>
											<div class="text-sm text-gray-400">{formatDate(selectedShipment.estimatedDelivery)}</div>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
				<div class="flex items-center gap-2">
					{#if selectedShipment.trackingCode}
						<button
							class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
						>
							Rastrear Envio
						</button>
					{/if}
					<button
						class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Imprimir Etiqueta
					</button>
				</div>
				<button
					onclick={() => showShipmentDetail = false}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Fechar
				</button>
			</div>
		</div>
	</div>
{/if} 