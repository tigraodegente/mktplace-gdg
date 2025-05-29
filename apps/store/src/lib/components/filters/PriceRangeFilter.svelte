<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '@mktplace/utils';
	
	interface PriceRangeFilterProps {
		min?: number;
		max?: number;
		currentMin?: number;
		currentMax?: number;
		step?: number;
		class?: string;
	}
	
	let {
		min = 0,
		max = 1000,
		currentMin = min,
		currentMax = max,
		step = 10,
		class: className = ''
	}: PriceRangeFilterProps = $props();
	
	const dispatch = createEventDispatcher();
	
	// Estados internos
	let minValue = $state(currentMin);
	let maxValue = $state(currentMax);
	let isDragging = $state(false);
	
	// Atualizar valores quando props mudam
	$effect(() => {
		minValue = currentMin;
		maxValue = currentMax;
	});
	
	// Calcular porcentagens para posicionamento
	let minPercent = $derived(((minValue - min) / (max - min)) * 100);
	let maxPercent = $derived(((maxValue - min) / (max - min)) * 100);
	
	function handleMinChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = Number(target.value);
		
		// Garantir que min não ultrapasse max
		minValue = Math.min(value, maxValue - step);
		emitChange();
	}
	
	function handleMaxChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = Number(target.value);
		
		// Garantir que max não seja menor que min
		maxValue = Math.max(value, minValue + step);
		emitChange();
	}
	
	function handleMinInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = Number(target.value);
		
		if (value >= min && value <= maxValue - step) {
			minValue = value;
		} else if (value < min) {
			minValue = min;
		} else {
			minValue = maxValue - step;
		}
		
		emitChange();
	}
	
	function handleMaxInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = Number(target.value);
		
		if (value <= max && value >= minValue + step) {
			maxValue = value;
		} else if (value > max) {
			maxValue = max;
		} else {
			maxValue = minValue + step;
		}
		
		emitChange();
	}
	
	function emitChange() {
		dispatch('change', {
			min: minValue,
			max: maxValue
		});
	}
	
	function handleMouseDown() {
		isDragging = true;
	}
	
	function handleMouseUp() {
		isDragging = false;
	}
</script>

<svelte:window on:mouseup={handleMouseUp} />

<div class="price-range-filter {className}">
	<!-- Inputs de texto -->
	<div class="flex items-center gap-3 mb-6">
		<div class="flex-1">
			<label for="price-min" class="text-xs font-medium text-gray-600 block mb-1.5">Mínimo</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
				<input
					id="price-min"
					type="number"
					value={minValue}
					min={min}
					max={maxValue - step}
					step={step}
					oninput={handleMinInput}
					class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
					placeholder={min.toString()}
				/>
			</div>
		</div>
		
		<span class="text-gray-400 mt-8">—</span>
		
		<div class="flex-1">
			<label for="price-max" class="text-xs font-medium text-gray-600 block mb-1.5">Máximo</label>
			<div class="relative">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
				<input
					id="price-max"
					type="number"
					value={maxValue}
					min={minValue + step}
					max={max}
					step={step}
					oninput={handleMaxInput}
					class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all"
					placeholder={max.toString()}
				/>
			</div>
		</div>
	</div>
	
	<!-- Slider duplo -->
	<div class="relative h-2 mb-6">
		<!-- Track background -->
		<div class="absolute w-full h-2 bg-gray-200 rounded-full"></div>
		
		<!-- Track ativo -->
		<div 
			class="absolute h-2 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] rounded-full transition-all duration-150"
			style="left: {minPercent}%; right: {100 - maxPercent}%"
		></div>
		
		<!-- Slider Min -->
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={minValue}
			onchange={handleMinChange}
			onmousedown={handleMouseDown}
			aria-label="Preço mínimo"
			class="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#00BFB3] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:shadow-xl [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#00BFB3] [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:hover:shadow-xl"
			style="z-index: {minValue > max - 100 ? 5 : 3}"
		/>
		
		<!-- Slider Max -->
		<input
			type="range"
			min={min}
			max={max}
			step={step}
			value={maxValue}
			onchange={handleMaxChange}
			onmousedown={handleMouseDown}
			aria-label="Preço máximo"
			class="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#00BFB3] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:shadow-xl [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#00BFB3] [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:hover:shadow-xl"
			style="z-index: 4"
		/>
	</div>
	
	<!-- Valores formatados -->
	<div class="flex justify-between text-sm font-medium">
		<span class="text-gray-600">{formatCurrency(minValue)}</span>
		<span class="text-[#00BFB3] font-semibold">até</span>
		<span class="text-gray-600">{formatCurrency(maxValue)}</span>
	</div>
</div>

<style>
	/* Reset dos sliders para funcionar corretamente */
	input[type="range"] {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		outline: none;
		position: absolute;
		width: 100%;
		height: 8px;
		background: transparent;
		pointer-events: none;
	}
	
	input[type="range"]::-webkit-slider-thumb {
		pointer-events: all;
		position: relative;
	}
	
	input[type="range"]::-moz-range-thumb {
		pointer-events: all;
		position: relative;
		border: none;
	}
</style> 