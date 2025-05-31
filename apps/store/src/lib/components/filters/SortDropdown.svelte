<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface SortOption {
		value: string;
		label: string;
		icon?: string;
	}
	
	interface SortDropdownProps {
		options?: SortOption[];
		value?: string;
		class?: string;
	}
	
	let {
		options = [
			{ value: 'relevance', label: 'Mais relevantes', icon: 'star' },
			{ value: 'price-asc', label: 'Menor preço', icon: 'arrow-up' },
			{ value: 'price-desc', label: 'Maior preço', icon: 'arrow-down' },
			{ value: 'name-asc', label: 'Nome (A-Z)', icon: 'sort-alpha' },
			{ value: 'name-desc', label: 'Nome (Z-A)', icon: 'sort-alpha-desc' },
			{ value: 'newest', label: 'Mais recentes', icon: 'clock' },
			{ value: 'discount', label: 'Maior desconto', icon: 'percent' }
		],
		value = 'relevance',
		class: className = ''
	}: SortDropdownProps = $props();
	
	const dispatch = createEventDispatcher();
	
	let isOpen = $state(false);
	let selectedOption = $derived(options.find(opt => opt.value === value) || options[0]);
	
	// Fechar dropdown ao clicar fora
	$effect(() => {
		if (!isOpen) return;
		
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.sort-dropdown-container')) {
				isOpen = false;
			}
		};
		
		// Usar timeout para evitar loops
		const timeoutId = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
		}, 0);
		
		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('click', handleClickOutside);
		};
	});
	
	function handleSelect(option: SortOption) {
		dispatch('change', option.value);
		isOpen = false;
	}
	
	function getIcon(iconName?: string) {
		switch (iconName) {
			case 'star':
				return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';
			case 'arrow-up':
				return 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12';
			case 'arrow-down':
				return 'M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4';
			case 'sort-alpha':
				return 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12';
			case 'sort-alpha-desc':
				return 'M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4';
			case 'clock':
				return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'percent':
				return 'M9 14l6-6m0 0l.5.5M9.5 8.5l.5.5m-.5 5l.5.5m5-.5l.5.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			default:
				return 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12';
		}
	}
</script>

<div class="relative sort-dropdown-container {className}">
	<button
		onclick={() => isOpen = !isOpen}
		class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon(selectedOption.icon)} />
		</svg>
		
		<span class="text-sm text-gray-700">Ordenar: <span class="font-medium">{selectedOption.label}</span></span>
		
		<svg class="w-4 h-4 text-gray-400 transition-transform {isOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	
	{#if isOpen}
		<div class="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
			<div class="py-1 min-w-[200px]">
				{#each options as option}
					<button
						onclick={() => handleSelect(option)}
						class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors {option.value === value ? 'bg-gray-50 text-[#00BFB3]' : ''}"
						role="menuitem"
					>
						<svg class="w-4 h-4 {option.value === value ? 'text-[#00BFB3]' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon(option.icon)} />
						</svg>
						
						<span class="flex-1 text-left">{option.label}</span>
						
						{#if option.value === value}
							<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div> 