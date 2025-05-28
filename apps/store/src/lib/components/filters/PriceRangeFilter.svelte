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
	<div class="flex items-center gap-2 mb-4">
		<div class="flex-1">
			<label class="text-xs text-gray-600 block mb-1">Mín</label>
			<input
				type="number"
				value={minValue}
				min={min}
				max={maxValue - step}
				step={step}
				oninput={handleMinInput}
				class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
			/>
		</div>
		
		<span class="text-gray-400 mt-6">-</span>
		
		<div class="flex-1">
			<label class="text-xs text-gray-600 block mb-1">Máx</label>
			<input
				type="number"
				value={maxValue}
				min={minValue + step}
				max={max}
				step={step}
				oninput={handleMaxInput}
				class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
			/>
		</div>
	</div>
	
	<!-- Slider duplo -->
	<div class="relative h-2 mb-4">
		<!-- Track background -->
		<div class="absolute w-full h-2 bg-gray-200 rounded-full"></div>
		
		<!-- Track ativo -->
		<div 
			class="absolute h-2 bg-[#00BFB3] rounded-full"
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
			class="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00BFB3] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#00BFB3] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110"
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
			class="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00BFB3] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#00BFB3] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-110"
			style="z-index: 4"
		/>
	</div>
	
	<!-- Valores formatados -->
	<div class="flex justify-between text-sm text-gray-600">
		<span>{formatCurrency(minValue)}</span>
		<span>{formatCurrency(maxValue)}</span>
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