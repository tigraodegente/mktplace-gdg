<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { slide } from 'svelte/transition';
	
	interface LocationFilterProps {
		selectedState?: string;
		selectedCity?: string;
		states?: Array<{ code: string; name: string; count?: number }>;
		cities?: Array<{ name: string; state: string; count?: number }>;
		loading?: boolean;
		userLocation?: { state?: string; city?: string };
	}
	
	let {
		selectedState = '',
		selectedCity = '',
		states = [],
		cities = [],
		loading = false,
		userLocation
	}: LocationFilterProps = $props();
	
	const dispatch = createEventDispatcher<{
		change: { state?: string; city?: string };
	}>();
	
	// Filtrar cidades pelo estado selecionado
	let filteredCities = $derived(
		selectedState 
			? cities.filter(city => city.state === selectedState)
			: []
	);
	
	function handleStateChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedState = target.value;
		selectedCity = ''; // Limpar cidade ao mudar estado
		dispatch('change', { state: selectedState || undefined, city: undefined });
	}
	
	function handleCityChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedCity = target.value;
		dispatch('change', { state: selectedState, city: selectedCity || undefined });
	}
	
	function useMyLocation() {
		if (userLocation) {
			selectedState = userLocation.state || '';
			selectedCity = userLocation.city || '';
			dispatch('change', { 
				state: userLocation.state, 
				city: userLocation.city 
			});
		}
	}
	
	function clearLocation() {
		selectedState = '';
		selectedCity = '';
		dispatch('change', { state: undefined, city: undefined });
	}
</script>

<div class="space-y-3">
	{#if userLocation && (userLocation.state || userLocation.city)}
		<button
			onclick={useMyLocation}
			class="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium
				bg-gradient-to-r from-[#00BFB3]/10 to-[#00A89D]/10 text-[#00BFB3] 
				rounded-lg hover:from-[#00BFB3]/20 hover:to-[#00A89D]/20 
				transition-all duration-200 border border-[#00BFB3]/20"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			Usar minha localização
		</button>
	{/if}
	
	{#if loading}
		<div class="space-y-3">
			<div class="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
			<div class="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
		</div>
	{:else}
		<!-- Estado -->
		<div>
			<label for="state-select" class="block text-sm font-medium text-gray-700 mb-1.5">
				Estado
			</label>
			<select
				id="state-select"
				value={selectedState || ''}
				onchange={handleStateChange}
				class="select-sm w-full"
			>
				<option value="">Todos os estados</option>
				{#each states as state}
					<option value={state.code} disabled={state.count === 0}>
						{state.name} {state.count !== undefined && state.count > 0 ? `(${state.count})` : ''}
					</option>
				{/each}
			</select>
		</div>
		
		<!-- Cidade -->
		{#if selectedState && cities.length > 0}
			<div>
				<label for="city-select" class="block text-sm font-medium text-gray-700 mb-2">
					Cidade
				</label>
				<select
					id="city-select"
					value={selectedCity || ''}
					onchange={handleCityChange}
					class="select-sm w-full"
				>
					<option value="">Todas as cidades</option>
					{#each filteredCities as city}
						<option value={city.name} disabled={city.count === 0}>
							{city.name} {city.count !== undefined && city.count > 0 ? `(${city.count})` : ''}
						</option>
					{/each}
				</select>
			</div>
		{/if}
		
		{#if selectedState || selectedCity}
			<button
				onclick={clearLocation}
				class="text-sm font-medium text-[#00BFB3] hover:text-[#00A89D] transition-colors flex items-center gap-1"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
				Limpar localização
			</button>
		{/if}
	{/if}
	
	<!-- Distância (se tiver localização) -->
	{#if (selectedState || userLocation) && !loading}
		<div class="pt-3 mt-3 border-t border-gray-200">
			<div class="block text-sm font-medium text-gray-700 mb-3">
				Distância máxima
			</div>
			<div class="space-y-2">
				{#each [
					{ value: 10, label: 'Até 10 km' },
					{ value: 25, label: 'Até 25 km' },
					{ value: 50, label: 'Até 50 km' },
					{ value: 100, label: 'Até 100 km' }
				] as distance}
					<label class="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
						<input
							type="radio"
							name="distance"
							value={distance.value}
							class="w-4 h-4 text-[#00BFB3] border-gray-300 focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-0"
						/>
						<span class="ml-3 text-sm font-medium text-gray-700">{distance.label}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
</div> 