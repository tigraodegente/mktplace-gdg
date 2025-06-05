<script lang="ts">
	import { slide } from 'svelte/transition';
	import ModernIcon from '../shared/ModernIcon.svelte';
	
	interface StatsData {
		total: number;
		active: number;
		pending: number;
		lowStock: number;
	}
	
	interface Props {
		stats: StatsData;
		defaultOpen?: boolean;
		labels?: {
			title?: string;
			total?: string;
			active?: string;
			pending?: string;
			lowStock?: string;
		};
	}
	
	let { 
		stats, 
		defaultOpen = true,
		labels = {
			title: 'Estatísticas',
			total: 'Total',
			active: 'Ativos', 
			pending: 'Pendentes',
			lowStock: 'Outros'
		}
	}: Props = $props();
	
	let isOpen = $state(defaultOpen);
	
	// Persistir estado no localStorage
	$effect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('admin-stats-accordion');
			if (saved !== null) {
				isOpen = JSON.parse(saved);
			}
		}
	});
	
	function toggleAccordion() {
		isOpen = !isOpen;
		if (typeof window !== 'undefined') {
			localStorage.setItem('admin-stats-accordion', JSON.stringify(isOpen));
		}
	}
</script>

<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
	<!-- Header do Acordeão -->
	<button
		type="button"
		onclick={toggleAccordion}
		class="w-full flex items-center justify-between text-left py-4 px-6 hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-inset"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-3">
			<div class="p-2 bg-[#00BFB3]/10 rounded-lg">
				<ModernIcon name="analytics" size="md" color="#00BFB3" />
			</div>
			<h3 class="text-lg font-semibold text-gray-900">{labels.title}</h3>
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
			class="border-t border-gray-200"
			transition:slide={{ duration: 300 }}
		>
			<div class="p-6">
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<!-- Total de Produtos -->
					<div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600">{labels.total}</p>
								<p class="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
							</div>
							<div class="p-3 bg-[#00BFB3]/10 rounded-lg">
								<ModernIcon name="Package" size={24} color="#00BFB3" />
							</div>
						</div>
					</div>
					
					<!-- Produtos Ativos -->
					<div class="bg-green-50 rounded-lg p-4 border border-green-100">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600">{labels.active}</p>
								<p class="text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
							</div>
							<div class="p-3 bg-green-100 rounded-lg">
								<ModernIcon name="Check" size={24} color="#16A34A" />
							</div>
						</div>
					</div>
					
					<!-- Pendentes -->
					<div class="bg-amber-50 rounded-lg p-4 border border-amber-100">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600">{labels.pending}</p>
								<p class="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
							</div>
							<div class="p-3 bg-amber-100 rounded-lg">
								<ModernIcon name="Clock" size={24} color="#D97706" />
							</div>
						</div>
					</div>
					
					<!-- Estoque Baixo -->
					<div class="bg-red-50 rounded-lg p-4 border border-red-100">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600">{labels.lowStock}</p>
								<p class="text-2xl font-bold text-gray-900 mt-1">{stats.lowStock}</p>
							</div>
							<div class="p-3 bg-red-100 rounded-lg">
								<ModernIcon name="AlertTriangle" size={24} color="#DC2626" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div> 