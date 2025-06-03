<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	interface PaginationProps {
		currentPage?: number;
		totalPages?: number;
		totalItems?: number;
		itemsPerPage?: number;
		maxVisiblePages?: number;
		showInfo?: boolean;
		class?: string;
	}
	
	let {
		currentPage = 1,
		totalPages = 1,
		totalItems = 0,
		itemsPerPage = 20,
		maxVisiblePages = 5,
		showInfo = true,
		class: className = ''
	}: PaginationProps = $props();
	
	const dispatch = createEventDispatcher();
	
	// Calcular páginas visíveis
	let visiblePages = $derived(() => {
		const pages: (number | string)[] = [];
		
		if (totalPages <= maxVisiblePages) {
			// Mostrar todas as páginas
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Lógica para páginas com ellipsis
			const halfVisible = Math.floor(maxVisiblePages / 2);
			
			if (currentPage <= halfVisible + 1) {
				// Início
				for (let i = 1; i <= maxVisiblePages - 1; i++) {
					pages.push(i);
				}
				pages.push('...');
				pages.push(totalPages);
			} else if (currentPage >= totalPages - halfVisible) {
				// Final
				pages.push(1);
				pages.push('...');
				for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
					pages.push(i);
				}
			} else {
				// Meio
				pages.push(1);
				pages.push('...');
				for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
					pages.push(i);
				}
				pages.push('...');
				pages.push(totalPages);
			}
		}
		
		return pages;
	});
	
	// Calcular range de items
	let itemRange = $derived(() => {
		const start = (currentPage - 1) * itemsPerPage + 1;
		const end = Math.min(currentPage * itemsPerPage, totalItems);
		return { start, end };
	});
	
	function goToPage(page: number) {
		if (page < 1 || page > totalPages || page === currentPage) return;
		dispatch('pageChange', page);
	}
	
	function goToPrevious() {
		if (currentPage > 1) {
			goToPage(currentPage - 1);
		}
	}
	
	function goToNext() {
		if (currentPage < totalPages) {
			goToPage(currentPage + 1);
		}
	}
	
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			goToPrevious();
		} else if (event.key === 'ArrowRight') {
			goToNext();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flex flex-col sm:flex-row items-center justify-between gap-4 {className}">
	{#if showInfo && totalItems > 0}
		<div class="text-sm text-gray-600">
			Mostrando <span class="font-medium">{itemRange().start}</span> - 
			<span class="font-medium">{itemRange().end}</span> de 
			<span class="font-medium">{totalItems}</span> resultados
		</div>
	{/if}
	
	{#if totalPages > 1}
		<nav class="flex items-center gap-1" aria-label="Paginação">
			<!-- Botão Anterior -->
			<button
				onclick={goToPrevious}
				disabled={currentPage === 1}
				class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
				aria-label="Página anterior"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			
			<!-- Páginas -->
			<div class="flex items-center gap-1">
				{#each visiblePages() as page}
					{#if page === '...'}
						<span class="px-3 py-2 text-sm text-gray-500">...</span>
					{:else if typeof page === 'number'}
						<button
							onclick={() => goToPage(page)}
							class="px-3 py-2 text-sm font-medium rounded-lg transition-colors {
								page === currentPage 
									? 'bg-[#00BFB3] text-white' 
									: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
							}"
							aria-label="Página {page}"
							aria-current={page === currentPage ? 'page' : undefined}
						>
							{page}
						</button>
					{/if}
				{/each}
			</div>
			
			<!-- Botão Próximo -->
			<button
				onclick={goToNext}
				disabled={currentPage === totalPages}
				class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
				aria-label="Próxima página"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</nav>
	{/if}
</div> 