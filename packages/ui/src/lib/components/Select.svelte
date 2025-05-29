<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface SelectOption {
		value: string | number;
		label: string;
		disabled?: boolean;
	}
	
	interface Props {
		value: string | number;
		options: SelectOption[];
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		name?: string;
		id?: string;
		required?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}
	
	let {
		value = $bindable(),
		options,
		placeholder = 'Selecione uma opção',
		disabled = false,
		class: className = '',
		name,
		id,
		required = false,
		size = 'md'
	}: Props = $props();
	
	const dispatch = createEventDispatcher();
	
	function handleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		value = target.value;
		dispatch('change', { value: target.value });
	}
	
	// Classes baseadas no tamanho
	const sizeClasses = {
		sm: 'pl-3 pr-10 py-1.5 text-sm',
		md: 'pl-4 pr-12 py-2 text-sm',
		lg: 'pl-4 pr-12 py-3 text-base'
	};
	
	const iconSizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-6 h-6'
	};
</script>

<div class="relative {className}">
	<select
		{value}
		onchange={handleChange}
		{disabled}
		{name}
		{id}
		{required}
		class="
			w-full
			{sizeClasses[size]}
			bg-white
			border border-gray-300
			rounded-lg
			appearance-none
			cursor-pointer
			transition-all
			duration-200
			focus:outline-none
			focus:ring-2
			focus:ring-[#00BFB3]
			focus:border-transparent
			hover:border-gray-400
			disabled:bg-gray-50
			disabled:text-gray-500
			disabled:cursor-not-allowed
			disabled:hover:border-gray-300
			font-medium
			text-gray-700
		"
		aria-label={placeholder}
	>
		{#if placeholder}
			<option value="" disabled selected hidden>{placeholder}</option>
		{/if}
		{#each options as option}
			<option 
				value={option.value} 
				disabled={option.disabled}
			>
				{option.label}
			</option>
		{/each}
	</select>
	
	<!-- Ícone de seta customizado -->
	<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
		<svg 
			class="{iconSizeClasses[size]} text-gray-500 transition-transform duration-200"
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
		>
			<path 
				stroke-linecap="round" 
				stroke-linejoin="round" 
				stroke-width="2" 
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	</div>
</div>

<style>
	/* Remover estilos padrão do browser para o select */
	select {
		background-image: none;
	}
	
	/* Estilo para o hover no select */
	select:hover ~ div svg {
		color: #374151;
	}
	
	/* Estilo para o focus no select */
	select:focus ~ div svg {
		color: #00BFB3;
	}
	
	/* Animação suave para o ícone */
	select:focus ~ div svg {
		transform: rotate(180deg);
	}
</style> 