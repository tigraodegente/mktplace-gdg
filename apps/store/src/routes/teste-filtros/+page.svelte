<script lang="ts">
	import FilterSidebar from '$lib/components/filters/FilterSidebar.svelte';
	
	// Dados mockados para testar todos os filtros
	const mockData = {
		categories: [
			{ id: '1', name: 'Eletrônicos', count: 150 },
			{ id: '2', name: 'Smartphones', count: 89 },
			{ id: '3', name: 'Notebooks', count: 45 },
			{ id: '4', name: 'Acessórios', count: 234 }
		],
		brands: [
			{ id: '1', name: 'Samsung', count: 78 },
			{ id: '2', name: 'Apple', count: 65 },
			{ id: '3', name: 'Xiaomi', count: 43 },
			{ id: '4', name: 'LG', count: 32 },
			{ id: '5', name: 'Sony', count: 28 }
		],
		priceRange: {
			min: 0,
			max: 10000,
			current: { min: 100, max: 5000 }
		},
		ratingCounts: {
			5: 120,
			4: 89,
			3: 45,
			2: 12,
			1: 5
		},
		conditions: [
			{ value: 'new' as const, label: 'Novo', count: 234 },
			{ value: 'used' as const, label: 'Usado', count: 89 },
			{ value: 'refurbished' as const, label: 'Recondicionado', count: 34 }
		],
		deliveryOptions: [
			{ value: '24h', label: 'Entrega em 24h', count: 45 },
			{ value: '48h', label: 'Até 2 dias', count: 123 },
			{ value: '3days', label: 'Até 3 dias úteis', count: 234 },
			{ value: '7days', label: 'Até 7 dias úteis', count: 456 },
			{ value: '15days', label: 'Até 15 dias', count: 567 }
		],
		sellers: [
			{ id: '1', name: 'TechStore Brasil', rating: 4.8, count: 234, verified: true, totalSales: 5420 },
			{ id: '2', name: 'Eletrônicos Prime', rating: 4.5, count: 189, totalSales: 3200 },
			{ id: '3', name: 'Gadgets & Cia', rating: 4.2, count: 156, totalSales: 1890 },
			{ id: '4', name: 'Mobile Express', rating: 4.9, count: 98, verified: true, totalSales: 8900 },
			{ id: '5', name: 'Info Total', rating: 4.0, count: 67, totalSales: 890 },
			{ id: '6', name: 'Super Tech', rating: 4.7, count: 45, totalSales: 2340 }
		],
		states: [
			{ code: 'SP', name: 'São Paulo', count: 456 },
			{ code: 'RJ', name: 'Rio de Janeiro', count: 234 },
			{ code: 'MG', name: 'Minas Gerais', count: 189 },
			{ code: 'RS', name: 'Rio Grande do Sul', count: 123 },
			{ code: 'PR', name: 'Paraná', count: 98 }
		],
		cities: [
			{ name: 'São Paulo', state: 'SP', count: 234 },
			{ name: 'Campinas', state: 'SP', count: 89 },
			{ name: 'Santos', state: 'SP', count: 45 },
			{ name: 'Rio de Janeiro', state: 'RJ', count: 189 },
			{ name: 'Niterói', state: 'RJ', count: 34 },
			{ name: 'Belo Horizonte', state: 'MG', count: 156 },
			{ name: 'Porto Alegre', state: 'RS', count: 98 },
			{ name: 'Curitiba', state: 'PR', count: 87 }
		]
	};
	
	// Estados dos filtros
	let selectedConditions = $state<string[]>(['new']);
	let selectedDeliveryTime = $state('24h');
	let selectedSellers = $state<string[]>(['1', '4']);
	let selectedLocation = $state({ state: 'SP', city: 'São Paulo' });
	let currentRating = $state(4);
	
	// User location mockado
	const userLocation = { state: 'SP', city: 'São Paulo' };
	
	// Handlers para eventos
	function handleFilterChange(event: CustomEvent) {
		console.log('Filter Change:', event.detail);
	}
	
	function handleRatingChange(event: CustomEvent) {
		console.log('Rating Change:', event.detail);
		currentRating = event.detail.rating || 0;
	}
	
	function handleConditionChange(event: CustomEvent) {
		console.log('Condition Change:', event.detail);
		selectedConditions = event.detail.conditions;
	}
	
	function handleDeliveryChange(event: CustomEvent) {
		console.log('Delivery Change:', event.detail);
		selectedDeliveryTime = event.detail.deliveryTime || '';
	}
	
	function handleSellerChange(event: CustomEvent) {
		console.log('Seller Change:', event.detail);
		selectedSellers = event.detail.sellers;
	}
	
	function handleLocationChange(event: CustomEvent) {
		console.log('Location Change:', event.detail);
		selectedLocation = event.detail;
	}
	
	function handleClearAll() {
		console.log('Clear All Filters');
		selectedConditions = [];
		selectedDeliveryTime = '';
		selectedSellers = [];
		selectedLocation = { state: '', city: '' };
		currentRating = 0;
	}
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="max-w-7xl mx-auto">
		<h1 class="text-3xl font-bold text-gray-900 mb-8">Teste de Filtros Completos</h1>
		
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Coluna 1: FilterSidebar Desktop -->
			<div>
				<h2 class="text-xl font-semibold mb-4">Desktop View</h2>
				<FilterSidebar
					categories={mockData.categories}
					brands={mockData.brands}
					priceRange={mockData.priceRange}
					ratingCounts={mockData.ratingCounts}
					{currentRating}
					conditions={mockData.conditions}
					{selectedConditions}
					deliveryOptions={mockData.deliveryOptions}
					{selectedDeliveryTime}
					sellers={mockData.sellers}
					{selectedSellers}
					states={mockData.states}
					cities={mockData.cities}
					{selectedLocation}
					{userLocation}
					on:filterChange={handleFilterChange}
					on:ratingChange={handleRatingChange}
					on:conditionChange={handleConditionChange}
					on:deliveryChange={handleDeliveryChange}
					on:sellerChange={handleSellerChange}
					on:locationChange={handleLocationChange}
					on:clearAll={handleClearAll}
				/>
				
				<!-- Instruções -->
				<div class="mt-4 p-4 bg-blue-50 rounded-lg">
					<h3 class="font-medium text-blue-900 mb-2">📌 Instruções:</h3>
					<ul class="text-sm text-blue-800 space-y-1">
						<li>• Clique nos títulos dos filtros para expandir/colapsar</li>
						<li>• Os filtros de Condição, Tempo de Entrega, Vendedores e Localização estão colapsados</li>
						<li>• Abra o console (F12) para ver os eventos sendo disparados</li>
						<li>• O contador no header mostra quantos filtros estão ativos</li>
					</ul>
				</div>
			</div>
			
			<!-- Coluna 2: Estado dos Filtros -->
			<div>
				<h2 class="text-xl font-semibold mb-4">Estado Atual dos Filtros</h2>
				<div class="bg-white rounded-lg shadow-sm p-6 space-y-4">
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Avaliação Mínima:</h3>
						<p class="text-gray-600">{currentRating > 0 ? `${currentRating} estrelas ou mais` : 'Todas'}</p>
					</div>
					
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Condições Selecionadas:</h3>
						<p class="text-gray-600">
							{selectedConditions.length > 0 ? selectedConditions.join(', ') : 'Nenhuma'}
						</p>
					</div>
					
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Tempo de Entrega:</h3>
						<p class="text-gray-600">{selectedDeliveryTime || 'Qualquer'}</p>
					</div>
					
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Vendedores Selecionados:</h3>
						<p class="text-gray-600">
							{#if selectedSellers.length > 0}
								{selectedSellers.map(id => 
									mockData.sellers.find(s => s.id === id)?.name
								).filter(Boolean).join(', ')}
							{:else}
								Todos
							{/if}
						</p>
					</div>
					
					<div>
						<h3 class="font-medium text-gray-900 mb-2">Localização:</h3>
						<p class="text-gray-600">
							{selectedLocation.city || selectedLocation.state || 'Qualquer'}
							{#if selectedLocation.city && selectedLocation.state}
								- {selectedLocation.state}
							{/if}
						</p>
					</div>
				</div>
			</div>
			
			<!-- Coluna 3: Componentes Individuais -->
			<div>
				<h2 class="text-xl font-semibold mb-4">Componentes Individuais</h2>
				<div class="space-y-6">
					<!-- Rating Filter -->
					<div class="bg-white rounded-lg shadow-sm p-4">
						<h3 class="font-medium text-gray-900 mb-3">RatingFilter</h3>
						<div class="border border-gray-200 rounded p-3">
							{#await import('$lib/components/filters/RatingFilter.svelte') then { default: RatingFilter }}
								<RatingFilter
									currentRating={currentRating}
									counts={mockData.ratingCounts}
									on:change={handleRatingChange}
								/>
							{/await}
						</div>
					</div>
					
					<!-- Condition Filter -->
					<div class="bg-white rounded-lg shadow-sm p-4">
						<h3 class="font-medium text-gray-900 mb-3">ConditionFilter</h3>
						<div class="border border-gray-200 rounded p-3">
							{#await import('$lib/components/filters/ConditionFilter.svelte') then { default: ConditionFilter }}
								<ConditionFilter
									selected={selectedConditions}
									options={mockData.conditions}
									on:change={handleConditionChange}
								/>
							{/await}
						</div>
					</div>
					
					<!-- Delivery Time Filter -->
					<div class="bg-white rounded-lg shadow-sm p-4">
						<h3 class="font-medium text-gray-900 mb-3">DeliveryTimeFilter</h3>
						<div class="border border-gray-200 rounded p-3">
							{#await import('$lib/components/filters/DeliveryTimeFilter.svelte') then { default: DeliveryTimeFilter }}
								<DeliveryTimeFilter
									selected={selectedDeliveryTime}
									options={mockData.deliveryOptions}
									on:change={handleDeliveryChange}
								/>
							{/await}
						</div>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Console de Eventos -->
		<div class="mt-8">
			<h2 class="text-xl font-semibold mb-4">Console de Eventos</h2>
			<div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
				<p>Abra o console do navegador para ver os eventos dos filtros</p>
			</div>
		</div>
	</div>
</div> 