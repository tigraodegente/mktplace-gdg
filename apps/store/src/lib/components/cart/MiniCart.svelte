<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '$lib/utils';
	import { cartStore } from '$lib/features/cart';
	import { fade, scale, fly, slide } from 'svelte/transition';
	import { cubicOut, elasticOut, backOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { usePricing } from '$lib/stores/pricingStore';
	
	const dispatch = createEventDispatcher<{
		close: void;
		itemAdded: { productId: string };
		itemRemoved: { productId: string };
	}>();
	
	interface MiniCartProps {
		isVisible: boolean;
		onClose: () => void;
		onViewCart?: () => void;
		onCheckout?: () => void;
		showQuickActions?: boolean;
		maxItems?: number;
		autoHideDelay?: number;
	}
	
	let { 
		isVisible = false,
		onClose,
		onViewCart,
		onCheckout,
		showQuickActions = true,
		maxItems = 4,
		autoHideDelay = 0
	}: MiniCartProps = $props();
	
	const { sellerGroups, cartTotals } = cartStore;
	
	// Sistema de pricing dinâmico
	const pricing = usePricing();
	let pricingConfig = $state<any>(null);
	
	// Carregar configurações de pricing
	$effect(() => {
		pricing.getConfig().then(config => {
			if (config) {
				pricingConfig = config;
			}
		}).catch(() => {
			// Usar valores padrão em caso de erro
		});
	});
	
	// Estados locais
	let isHovered = false;
	let removingItemId = $state<string | null>(null);
	let showSuccessAnimation = false;
	let autoHideTimeout: NodeJS.Timeout | null = null;
	
	// Computed
	const itemCount = $derived($sellerGroups.reduce((sum, g) => sum + g.items.length, 0));
	const allItems = $derived($sellerGroups.flatMap(g => g.items));
	const displayItems = $derived(allItems.slice(0, maxItems));
	const remainingCount = $derived(Math.max(0, itemCount - maxItems));
	const hasShipping = $derived($cartTotals.totalShipping > 0);
	const totalSavings = $derived($cartTotals.totalDiscount);
	
	// Auto-hide functionality
	$effect(() => {
		if (isVisible && autoHideDelay > 0 && !isHovered) {
			autoHideTimeout = setTimeout(() => {
				if (!isHovered) {
					onClose();
				}
			}, autoHideDelay);
		}
		
		return () => {
			if (autoHideTimeout) {
				clearTimeout(autoHideTimeout);
			}
		};
	});
	
	function handleMouseEnter() {
		isHovered = true;
		if (autoHideTimeout) {
			clearTimeout(autoHideTimeout);
		}
	}
	
	function handleMouseLeave() {
		isHovered = false;
	}
	
	function handleItemClick(productSlug: string) {
		onClose();
		goto(`/produto/${productSlug}`);
	}
	
	async function handleRemoveItem(productId: string, sellerId: string, variant?: { color?: string; size?: string }) {
		removingItemId = `${productId}-${sellerId}`;
		
		// Animação visual
		await new Promise(resolve => setTimeout(resolve, 200));
		
		// Remover item do carrinho
		cartStore.removeItem(productId, sellerId, variant);
		
		removingItemId = null;
		dispatch('itemRemoved', { productId });
		
		// Fechar se carrinho ficar vazio
		if (itemCount <= 1) {
			setTimeout(onClose, 300);
		}
	}
	
	async function handleQuantityChange(productId: string, sellerId: string, newQuantity: number, variant?: { color?: string; size?: string }) {
		if (newQuantity <= 0) {
			await handleRemoveItem(productId, sellerId, variant);
		} else {
			cartStore.updateQuantity(productId, sellerId, newQuantity, variant);
		}
	}
	
	function handleCheckout() {
		onClose();
		if (onCheckout) {
			onCheckout();
		} else {
			goto('/checkout');
		}
	}
	
	function handleViewCart() {
		onClose();
		if (onViewCart) {
			onViewCart();
		} else {
			goto('/cart');
		}
	}
	
	function getItemKey(item: any): string {
		return `${item.product.id}-${item.sellerId}-${item.selectedColor || ''}-${item.selectedSize || ''}`;
	}
	
	function getFreeShippingProgress(): { current: number; target: number; percentage: number; remaining: number; hasFreeship: boolean } {
		const freeShippingThreshold = 150; // R$ 150 para frete grátis
		const current = $cartTotals.cartSubtotal;
		const hasFreeship = current >= freeShippingThreshold;
		const remaining = Math.max(0, freeShippingThreshold - current);
		const percentage = Math.min(100, (current / freeShippingThreshold) * 100);
		
		return {
			current,
			target: freeShippingThreshold,
			percentage,
			remaining,
			hasFreeship
		};
	}
</script>

{#if isVisible}
	<div 
		class="absolute top-full right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
		transition:fly={{ y: -20, duration: 400, easing: backOut }}
		role="dialog"
		tabindex="-1"
		aria-label="Prévia do carrinho"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		{#if itemCount === 0}
			<!-- Estado vazio seguindo padrão das outras páginas -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
				<svg class="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
				</svg>
				<h2 class="text-xl font-medium text-gray-900 mb-2" style="font-family: 'Lato', sans-serif;">
					Carrinho vazio
				</h2>
				<p class="text-gray-600 mb-8 max-w-md mx-auto" style="font-family: 'Lato', sans-serif;">
					Que tal adicionar alguns produtos incríveis ao seu carrinho?
				</p>
				
				<button 
					onclick={onClose}
					class="inline-flex items-center px-6 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					Continuar Comprando
				</button>
			</div>
		{:else}		
			<!-- Header igual ao Chat -->
			<div class="bg-[#00BFB3] p-4 text-white relative">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
							</svg>
						</div>
						<div>
							<h3 class="font-medium text-sm" style="font-family: 'Lato', sans-serif;">Meu Carrinho</h3>
							<div class="flex items-center gap-1 text-xs">
								<div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
								<span class="opacity-90">
									{itemCount} {itemCount === 1 ? 'item' : 'itens'}
									{#if $sellerGroups.length > 1}
										• {$sellerGroups.length} vendedores
									{/if}
								</span>
							</div>
						</div>
					</div>
					<div class="flex items-center gap-1">
						<button 
							onclick={onClose}
							class="p-1 hover:bg-white/20 rounded-lg transition-colors"
							aria-label="Fechar carrinho"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
			</div>

			<!-- Barra de Progresso Frete Grátis -->
			{@const freeShippingProgress = getFreeShippingProgress()}
			{#if !freeShippingProgress.hasFreeship}
				<div class="bg-blue-50 border-b border-gray-200 p-4">
					<div class="flex items-center gap-2 mb-2">
						<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
						</svg>
						<span class="text-sm font-medium text-gray-700" style="font-family: 'Lato', sans-serif;">
							Faltam apenas <span class="text-[#00BFB3] font-bold">{formatCurrency(freeShippingProgress.remaining)}</span> para frete grátis!
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div 
							class="bg-[#00BFB3] h-2 rounded-full transition-all duration-500 ease-out"
							style="width: {freeShippingProgress.percentage}%"
						></div>
					</div>
				</div>
			{:else}
				<div class="bg-green-50 border-b border-green-200 p-4">
					<div class="flex items-center gap-3">
						<div class="flex items-center gap-2">
							<div class="w-8 h-8 bg-[#00BFB3] rounded-full flex items-center justify-center">
								<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
							</svg>
						</div>
						<div class="flex-1">
							<p class="text-sm font-semibold text-[#00BFB3]" style="font-family: 'Lato', sans-serif;">
								Parabéns! Você ganhou frete grátis
							</p>
							<p class="text-xs text-[#00BFB3]" style="font-family: 'Lato', sans-serif;">
								Economia garantida na sua compra
							</p>
						</div>
					</div>
				</div>
			{/if}
			
			<!-- Lista de Produtos seguindo padrão das outras páginas -->
			<div class="bg-white">
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center gap-3">
						<svg class="h-5 w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						<h3 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
							Produtos no Carrinho
						</h3>
					</div>
				</div>
				
				<div class="max-h-80 overflow-y-auto">
					{#each displayItems as item (getItemKey(item))}
						{@const itemKey = getItemKey(item)}
						<div 
							class="flex items-center gap-4 p-4 hover:bg-gray-50 transition-all duration-200 border-b border-gray-100 last:border-b-0 relative group"
							class:opacity-50={removingItemId === itemKey}
							transition:slide={{ duration: 300 }}
						>
							<!-- Product Image -->
							<button 
								class="w-16 h-16 bg-gray-50 rounded-md overflow-hidden flex-shrink-0 cursor-pointer relative group block"
								onclick={() => handleItemClick((item.product as any).slug || item.product.id)}
							>
								<img 
									src={(item.product.images && item.product.images[0]) || '/api/placeholder/64/64'} 
									alt={item.product.name}
									class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
									loading="lazy"
								/>
							</button>
							
							<!-- Product Info -->
							<div class="flex-1 min-w-0">
								<button 
									class="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-[#00BFB3] transition-colors w-full text-left"
									onclick={() => handleItemClick((item.product as any).slug || item.product.id)}
									style="font-family: 'Lato', sans-serif;"
								>
									{item.product.name}
								</button>
								<div class="flex items-center gap-2 mt-1 text-xs text-gray-500" style="font-family: 'Lato', sans-serif;">
									{#if item.selectedColor}
										<span class="px-2 py-0.5 bg-gray-50 rounded-full">
											{item.selectedColor}
										</span>
									{/if}
									{#if item.selectedSize}
										<span class="px-2 py-0.5 bg-gray-50 rounded-full">
											{item.selectedSize}
										</span>
									{/if}
								</div>
								
								<!-- Quantidade com controles -->
								{#if showQuickActions}
									<div class="flex items-center gap-2 mt-2">
										<div class="flex items-center border border-gray-200 rounded-md overflow-hidden">
											<button
												onclick={() => handleQuantityChange(item.product.id, item.sellerId, item.quantity - 1, { color: item.selectedColor, size: item.selectedSize })}
												class="p-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
												disabled={item.quantity <= 1}
												aria-label="Diminuir quantidade"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
												</svg>
											</button>
											<span class="px-3 py-1 text-sm font-medium min-w-[2rem] text-center" style="font-family: 'Lato', sans-serif;">
												{item.quantity}
											</span>
											<button
												onclick={() => handleQuantityChange(item.product.id, item.sellerId, item.quantity + 1, { color: item.selectedColor, size: item.selectedSize })}
												class="p-1 hover:bg-gray-50 transition-colors"
												aria-label="Aumentar quantidade"
											>
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
												</svg>
											</button>
										</div>
									</div>
								{:else}
									<p class="text-xs text-gray-500 mt-1" style="font-family: 'Lato', sans-serif;">Qtd: {item.quantity}</p>
								{/if}
							</div>
							
							<!-- Price e Remove -->
							<div class="text-right">
								<p class="text-sm font-bold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">
									{formatCurrency(item.product.price * item.quantity)}
								</p>
								
								{#if showQuickActions}
									<button
										onclick={() => handleRemoveItem(item.product.id, item.sellerId, { color: item.selectedColor, size: item.selectedSize })}
										class="mt-1 p-1 text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
										title="Remover item"
										aria-label="Remover item do carrinho"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								{/if}
							</div>
						</div>
					{/each}
					
					{#if remainingCount > 0}
						<div class="px-4 py-3 bg-gray-50 border-t border-gray-100">
							<button 
								onclick={handleViewCart}
								class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium flex items-center gap-2 transition-colors"
								style="font-family: 'Lato', sans-serif;"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
								Ver mais {remainingCount} {remainingCount === 1 ? 'item' : 'itens'}
							</button>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Footer com totais seguindo padrão das outras páginas -->
			<div class="bg-white p-6">
				<div class="flex items-center gap-3 mb-4">
					<svg class="h-5 w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
					<h3 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
						Resumo do Pedido
					</h3>
				</div>
				
				<!-- Resumo de totais -->
				<div class="space-y-2 mb-6">
					<div class="flex justify-between text-sm" style="font-family: 'Lato', sans-serif;">
						<span class="text-gray-600">Subtotal:</span>
						<span class="font-medium">{formatCurrency($cartTotals.cartSubtotal)}</span>
					</div>
					
					{#if totalSavings > 0}
						<div class="flex justify-between text-sm text-[#00BFB3]" style="font-family: 'Lato', sans-serif;">
							<span>Economia:</span>
							<span class="font-semibold">-{formatCurrency(totalSavings)}</span>
						</div>
					{/if}
					
					{#if hasShipping}
						<div class="flex justify-between text-sm" style="font-family: 'Lato', sans-serif;">
							<span class="text-gray-600">Frete:</span>
							<span class="font-medium">{formatCurrency($cartTotals.totalShipping)}</span>
						</div>
					{/if}
					
					<div class="flex justify-between text-lg font-bold border-t pt-2" style="font-family: 'Lato', sans-serif;">
						<span>Total:</span>
						<span class="text-[#00BFB3]">{formatCurrency($cartTotals.cartTotal)}</span>
					</div>
					
					<p class="text-xs text-gray-500 text-center" style="font-family: 'Lato', sans-serif;">
						ou até {pricingConfig?.installments_default || 12}x de {formatCurrency(
							$cartTotals.cartTotal > 0 && (pricingConfig?.installments_default || 12) > 0
								? $cartTotals.cartTotal / (pricingConfig?.installments_default || 12)
								: 0
						)}
					</p>
				</div>
				
				<!-- Actions seguindo padrão das outras páginas -->
				<div class="flex flex-col gap-3">
					<button 
						onclick={handleCheckout}
						class="inline-flex items-center justify-center px-6 py-3 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						Finalizar Compra
					</button>
					<button 
						onclick={handleViewCart}
						class="inline-flex items-center justify-center px-6 py-2 bg-white text-[#00BFB3] text-sm font-medium rounded-md border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
						Ver Carrinho Completo
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Scrollbar customizada seguindo padrão das outras páginas */
	:global(.max-h-80::-webkit-scrollbar) {
		width: 6px;
	}
	
	:global(.max-h-80::-webkit-scrollbar-track) {
		background: transparent;
	}
	
	:global(.max-h-80::-webkit-scrollbar-thumb) {
		background: #D1D5DB;
		border-radius: 3px;
	}
	
	:global(.max-h-80::-webkit-scrollbar-thumb:hover) {
		background: #9CA3AF;
	}
	
	/* Animação suave para os items */
	.group {
		animation: fadeIn 0.3s ease-in-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	/* Motion preferences */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style> 