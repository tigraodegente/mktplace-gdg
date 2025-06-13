<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import Button from './Button.svelte';

	// Props
	interface Props {
		data: any[];
		loading?: boolean;
		hasMore?: boolean;
		threshold?: number;
		onLoadMore?: () => void;
		onRetry?: () => void;
		error?: string | null;
		className?: string;
		loadingText?: string;
		endText?: string;
		errorText?: string;
		itemHeight?: number;
		containerClass?: string;
		itemClass?: string;
		emptyMessage?: string;
	}

	let {
		data = [],
		loading = false,
		hasMore = true,
		threshold = 200,
		onLoadMore,
		onRetry,
		error = null,
		className,
		loadingText = 'Carregando mais itens...',
		endText = 'Não há mais itens para carregar',
		errorText = 'Erro ao carregar mais itens',
		itemHeight = 100,
		containerClass = '',
		itemClass = '',
		emptyMessage = 'Nenhum item encontrado'
	}: Props = $props();

	let containerElement: HTMLDivElement;
	let scrollElement: HTMLDivElement;
	let isIntersecting = $state(false);
	let observer: IntersectionObserver;
	let sentinelElement: HTMLDivElement;

	// Estado para controlar carregamento
	let isLoadingMore = $state(false);
	let canLoadMore = $derived(hasMore && !loading && !error && !isLoadingMore);

	// Função para carregar mais dados
	async function loadMore() {
		if (!canLoadMore || isLoadingMore) return;
		
		isLoadingMore = true;
		try {
			await onLoadMore?.();
		} finally {
			isLoadingMore = false;
		}
	}

	// Configurar intersection observer
	onMount(() => {
		if (!sentinelElement) return;

		observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				isIntersecting = entry.isIntersecting;
				
				if (entry.isIntersecting && canLoadMore) {
					loadMore();
				}
			},
			{
				root: null,
				rootMargin: `${threshold}px`,
				threshold: 0.1
			}
		);

		observer.observe(sentinelElement);

		return () => {
			observer?.disconnect();
		};
	});

	// Função para retry em caso de erro
	function handleRetry() {
		onRetry?.();
	}

	// Função para scroll para o topo
	function scrollToTop() {
		scrollElement?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// Virtual scrolling para performance (opcional)
	let visibleStart = $state(0);
	let visibleEnd = $state(50); // Mostrar 50 itens por vez
	const BUFFER_SIZE = 10;

	function updateVisibleRange(scrollTop: number, containerHeight: number) {
		if (!itemHeight) return;

		const start = Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER_SIZE);
		const end = Math.min(data.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + BUFFER_SIZE);
		
		visibleStart = start;
		visibleEnd = end;
	}

	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		updateVisibleRange(target.scrollTop, target.clientHeight);
	}
</script>

<div 
	bind:this={containerElement}
	class={cn("relative", containerClass)}
>
	<!-- Scroll Container -->
	<div 
		bind:this={scrollElement}
		onscroll={handleScroll}
		class={cn(
			"overflow-y-auto max-h-screen",
			className
		)}
	>
		<!-- Empty State -->
		{#if data.length === 0 && !loading}
			<div class="text-center py-12">
				<div class="w-24 h-24 mx-auto mb-4 text-gray-300 flex items-center justify-center">
					<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
					</svg>
				</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">
					{emptyMessage}
				</h3>
				<p class="text-gray-500">
					Não há dados para exibir no momento.
				</p>
			</div>
		{/if}

		<!-- Data Items -->
		{#if data.length > 0}
			<div class="space-y-0">
				{#each data.slice(visibleStart, visibleEnd) as item, index (item.id || index)}
					<div 
						class={cn(
							"border-b border-gray-100 last:border-b-0",
							itemClass
						)}
						style:min-height="{itemHeight}px"
					>
						<slot {item} index={visibleStart + index} />
					</div>
				{/each}
			</div>
		{/if}

		<!-- Loading State -->
		{#if loading || isLoadingMore}
			<div class="flex items-center justify-center py-8">
				<div class="flex items-center gap-3">
					<div class="w-5 h-5 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin"></div>
					<span class="text-sm text-gray-600">
						{loadingText}
					</span>
				</div>
			</div>
		{/if}

		<!-- Error State -->
		{#if error && !loading}
			<div class="flex flex-col items-center justify-center py-8">
				<div class="w-12 h-12 text-red-400 mb-3 flex items-center justify-center">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
					</svg>
				</div>
				<p class="text-sm text-gray-600 mb-4">
					{errorText}
				</p>
				<Button
					size="sm"
					variant="outline"
					onclick={handleRetry}
				>
					<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
					</svg>
					Tentar Novamente
				</Button>
			</div>
		{/if}

		<!-- End State -->
		{#if !hasMore && !loading && !error && data.length > 0}
			<div class="text-center py-8">
				<div class="w-8 h-8 text-gray-300 mx-auto mb-2 flex items-center justify-center">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
					</svg>
				</div>
				<p class="text-sm text-gray-500">
					{endText}
				</p>
			</div>
		{/if}

		<!-- Intersection Observer Sentinel -->
		{#if canLoadMore}
			<div 
				bind:this={sentinelElement}
				class="h-4 opacity-0 pointer-events-none"
				aria-hidden="true"
			></div>
		{/if}
	</div>

	<!-- Scroll to Top Button -->
	{#if data.length > 20}
		<button
			onclick={scrollToTop}
			class="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#00BFB3] text-white rounded-full shadow-lg hover:bg-[#00A89D] transition-all duration-200 hover:scale-105 flex items-center justify-center"
			title="Voltar ao topo"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
			</svg>
		</button>
	{/if}
</div> 