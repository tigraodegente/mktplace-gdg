<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import ProductCard from '$lib/components/product/ProductCard.svelte';
	
	const dispatch = createEventDispatcher<{
		loadMore: void;
		itemClick: { product: any; index: number };
	}>();
	
	interface Props {
		products?: any[];
		columns?: number;
		itemHeight?: number;
		gap?: number;
		overscan?: number;
		loading?: boolean;
		hasMore?: boolean;
		loadMoreThreshold?: number;
		viewMode?: 'grid' | 'list';
	}
	
	let {
		products = [],
		columns = 3,
		itemHeight = 420,
		gap = 16,
		overscan = 5,
		loading = false,
		hasMore = false,
		loadMoreThreshold = 5,
		viewMode = 'grid'
	}: Props = $props();
	
	// Elementos DOM
	let viewport: HTMLElement;
	let contentContainer: HTMLElement;
	
	// Estado do scroll virtual
	let viewportHeight = $state(0);
	let scrollTop = $state(0);
	let itemsPerRow = $state(columns);
	let visibleStart = $state(0);
	let visibleEnd = $state(0);
	let totalRows = $state(0);
	let rowHeight = $state(itemHeight + gap);
	
	// Cache de renderização
	let visibleItems = $state<Array<{ product: any; index: number; row: number; col: number }>>([]);
	
	// Observer para redimensionamento
	let resizeObserver: ResizeObserver;
	
	$effect(() => {
		if (products.length > 0) {
			calculateLayout();
		}
	});
	
	$effect(() => {
		if (scrollTop !== undefined && viewportHeight > 0) {
			updateVisibleItems();
		}
	});
	
	function calculateLayout() {
		if (!viewport) return;
		
		const viewportWidth = viewport.clientWidth;
		
		if (viewMode === 'grid') {
			// Calcular colunas responsivas
			if (viewportWidth < 768) {
				itemsPerRow = 2;
			} else if (viewportWidth < 1024) {
				itemsPerRow = 3;
			} else {
				itemsPerRow = columns;
			}
			
			totalRows = Math.ceil(products.length / itemsPerRow);
			rowHeight = itemHeight + gap;
		} else {
			// Lista: uma coluna
			itemsPerRow = 1;
			totalRows = products.length;
			rowHeight = 140; // Altura para item de lista
		}
	}
	
	function updateVisibleItems() {
		if (!viewport || products.length === 0) {
			visibleItems = [];
			return;
		}
		
		// Calcular range visível
		const startRow = Math.floor(scrollTop / rowHeight);
		const endRow = Math.min(
			Math.ceil((scrollTop + viewportHeight) / rowHeight) + 1,
			totalRows
		);
		
		// Adicionar overscan
		visibleStart = Math.max(0, startRow - overscan);
		visibleEnd = Math.min(totalRows, endRow + overscan);
		
		// Gerar items visíveis
		visibleItems = [];
		
		for (let row = visibleStart; row < visibleEnd; row++) {
			for (let col = 0; col < itemsPerRow; col++) {
				const index = row * itemsPerRow + col;
				if (index < products.length) {
					visibleItems.push({
						product: products[index],
						index,
						row,
						col
					});
				}
			}
		}
		
		// Trigger load more se necessário
		const remainingItems = products.length - (visibleEnd * itemsPerRow);
		if (remainingItems <= loadMoreThreshold && hasMore && !loading) {
			dispatch('loadMore');
		}
	}
	
	function handleScroll() {
		scrollTop = viewport.scrollTop;
	}
	
	function getItemStyle(item: { row: number; col: number }) {
		const top = item.row * rowHeight;
		
		if (viewMode === 'grid') {
			const itemWidth = `calc((100% - ${(itemsPerRow - 1) * gap}px) / ${itemsPerRow})`;
			const left = `calc(${item.col} * (${itemWidth} + ${gap}px))`;
			
			return `
				position: absolute;
				top: ${top}px;
				left: ${left};
				width: ${itemWidth};
				height: ${itemHeight}px;
			`;
		} else {
			return `
				position: absolute;
				top: ${top}px;
				left: 0;
				width: 100%;
				height: ${rowHeight - gap}px;
			`;
		}
	}
	
	onMount(() => {
		if (!viewport) return;
		
		// Observer para mudanças de tamanho
		resizeObserver = new ResizeObserver(() => {
			viewportHeight = viewport.clientHeight;
			calculateLayout();
		});
		
		resizeObserver.observe(viewport);
		
		// Scroll listener
		viewport.addEventListener('scroll', handleScroll, { passive: true });
		
		// Initial calculation
		viewportHeight = viewport.clientHeight;
		calculateLayout();
	});
	
	onDestroy(() => {
		resizeObserver?.disconnect();
		viewport?.removeEventListener('scroll', handleScroll);
	});
</script>

<div 
	bind:this={viewport}
	class="virtual-scroll-viewport"
	style="height: 100%; overflow-y: auto; position: relative;"
>
	<div 
		bind:this={contentContainer}
		class="virtual-scroll-content"
		style="height: {totalRows * rowHeight}px; position: relative;"
	>
		{#each visibleItems as item (item.index)}
			<div 
				class="virtual-item"
				style={getItemStyle(item)}
			>
				{#if viewMode === 'grid'}
					<ProductCard 
						product={item.product}
					/>
				{:else}
					<!-- Lista view customizada -->
					<div class="bg-white rounded-lg shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow h-full">
						<img 
							src={item.product.images?.[0] || '/api/placeholder/120/120'} 
							alt={item.product.name}
							class="w-24 h-24 object-cover rounded flex-shrink-0"
							loading="lazy"
						/>
						<div class="flex-1 min-w-0">
							<h3 class="font-medium text-gray-900 mb-1 line-clamp-2">
								<a 
									href="/produto/{item.product.slug}" 
									class="hover:text-[#00BFB3] transition-colors"
									onclick={() => dispatch('itemClick', { product: item.product, index: item.index })}
								>
									{item.product.name}
								</a>
							</h3>
							<p class="text-sm text-gray-600 mb-2 line-clamp-2">{item.product.description}</p>
							<div class="flex items-center gap-4">
								{#if item.product.original_price}
									<span class="text-sm text-gray-500 line-through">
										R$ {item.product.original_price.toFixed(2)}
									</span>
								{/if}
								<span class="text-lg font-bold text-[#00BFB3]">
									R$ {item.product.price.toFixed(2)}
								</span>
								{#if item.product.discount}
									<span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
										-{item.product.discount}%
									</span>
								{/if}
							</div>
						</div>
						<div class="flex flex-col gap-2 flex-shrink-0">
							<a 
								href="/produto/{item.product.slug}" 
								class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors text-center text-sm"
								onclick={() => dispatch('itemClick', { product: item.product, index: item.index })}
							>
								Ver produto
							</a>
							<button 
								class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" 
								aria-label="Adicionar aos favoritos"
							>
								<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
								</svg>
							</button>
						</div>
					</div>
				{/if}
			</div>
		{/each}
		
		<!-- Loading indicator -->
		{#if loading}
			<div 
				class="absolute inset-x-0 flex justify-center py-8"
				style="top: {totalRows * rowHeight}px;"
			>
				<div class="flex items-center gap-2 text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm">
					<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					<span>Carregando mais produtos...</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.virtual-scroll-viewport {
		/* Otimizações de performance */
		will-change: scroll-position;
		-webkit-overflow-scrolling: touch;
	}
	
	.virtual-item {
		/* Otimizações de rendering */
		will-change: transform;
		contain: layout style paint;
	}
	
	/* Line clamp utility */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	/* Smooth scrolling para Safari */
	@supports (-webkit-overflow-scrolling: touch) {
		.virtual-scroll-viewport {
			scroll-behavior: smooth;
		}
	}
</style> 