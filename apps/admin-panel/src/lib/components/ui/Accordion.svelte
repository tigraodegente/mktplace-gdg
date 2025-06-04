<script lang="ts">
	import { slide } from 'svelte/transition';
	import ModernIcon from '../shared/ModernIcon.svelte';
	import type { Snippet } from 'svelte';
	
	let {
		title,
		icon,
		defaultOpen = false,
		class: className = '',
		contentClass = '',
		persistent = false,
		storageKey = '',
		children
	}: {
		title: string;
		icon?: string;
		defaultOpen?: boolean;
		class?: string;
		contentClass?: string;
		persistent?: boolean;
		storageKey?: string;
		children: Snippet;
	} = $props();
	
	// Estado do acordeão
	let isOpen = $state(defaultOpen);
	
	// Carregar estado do localStorage se persistente
	$effect(() => {
		if (persistent && storageKey && typeof window !== 'undefined') {
			const saved = localStorage.getItem(`accordion-${storageKey}`);
			if (saved !== null) {
				isOpen = JSON.parse(saved);
			}
		}
	});
	
	// Salvar estado no localStorage
	function toggleAccordion() {
		isOpen = !isOpen;
		
		if (persistent && storageKey && typeof window !== 'undefined') {
			localStorage.setItem(`accordion-${storageKey}`, JSON.stringify(isOpen));
		}
	}
</script>

<div class="bg-white rounded-lg border border-gray-200 overflow-hidden {className}">
	<!-- Header do Acordeão -->
	<button
		type="button"
		onclick={toggleAccordion}
		class="w-full flex items-center justify-between text-left py-4 px-6 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-inset"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-3">
			{#if icon}
				<div class="p-2 bg-[#00BFB3]/10 rounded-lg">
					<ModernIcon name={icon} size="md" color="#00BFB3" />
				</div>
			{/if}
			<h3 class="text-lg font-semibold text-gray-900">{title}</h3>
		</div>
		
		<svg 
			class="w-5 h-5 text-gray-400 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	
	<!-- Conteúdo do Acordeão -->
	{#if isOpen}
		<div 
			class="border-t border-gray-200 overflow-visible {contentClass}"
			transition:slide={{ duration: 300 }}
		>
			<div class="p-6">
				{@render children()}
			</div>
		</div>
	{/if}
</div> 