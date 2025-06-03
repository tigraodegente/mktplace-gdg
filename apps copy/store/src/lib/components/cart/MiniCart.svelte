<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { formatCurrency } from '$lib/utils';
	import { cartStore } from '$lib/stores/cartStore';
	import { fade, scale, fly, slide } from 'svelte/transition';
	import { cubicOut, elasticOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	
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
		class="absolute top-full right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
		transition:scale={{ duration: 300, start: 0.92, easing: elasticOut }}
		role="dialog"
		tabindex="-1"
		aria-label="Prévia do carrinho"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		<!-- Header sem gradiente -->
		<div class="bg-[#00BFB3] p-4 text-white relative overflow-hidden">
			<!-- Padrão de fundo sutil -->
			<div class="absolute inset-0 opacity-10">
				<svg class="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
							<path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.5"/>
						</pattern>
					</defs>
					<rect width="100" height="100" fill="url(#grid)" />
				</svg>
			</div>
			
			<div class="flex items-center justify-between relative">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
						</svg>
					</div>
					<div>
						<h3 class="text-lg font-bold">Meu Carrinho</h3>
						<p class="text-white/80 text-sm">
							{itemCount} {itemCount === 1 ? 'item' : 'itens'}
							{#if $sellerGroups.length > 1}
								• {$sellerGroups.length} vendedores
							{/if}
						</p>
					</div>
				</div>
				
				<button 
					onclick={onClose}
					class="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
					aria-label="Fechar prévia"
				>
					<svg class="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
		
		{#if itemCount === 0}
			<!-- Empty State sem degradês -->
			<div class="p-8 text-center">
				<div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center relative">
					<svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
					</svg>
					<div class="absolute -top-1 -right-1 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
						<span class="text-orange-500 text-xs">✨</span>
					</div>
				</div>
				<h4 class="text-lg font-semibold text-gray-900 mb-2">Carrinho vazio</h4>
				<p class="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
					Que tal adicionar alguns produtos incríveis ao seu carrinho?
				</p>
				<button 
					onclick={onClose}
					class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transform hover:scale-105 transition-all duration-200 font-medium"
				>
					Continuar comprando
				</button>
			</div>
		{:else}
			<!-- Barra de Progresso Frete Grátis -->
			{@const freeShippingProgress = getFreeShippingProgress()}
			{#if !freeShippingProgress.hasFreeship}
				<div class="p-4 bg-blue-50 border-b border-gray-100">
					<div class="flex items-center gap-2 mb-2">
						<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
						</svg>
						<span class="text-sm font-medium text-gray-700">
							Faltam apenas <span class="text-green-600 font-bold">{formatCurrency(freeShippingProgress.remaining)}</span> para frete grátis!
						</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div 
							class="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out"
							style="width: {freeShippingProgress.percentage}%"
						></div>
					</div>
				</div>
			{:else}
				<div class="p-3 bg-green-50 border-b border-green-100">
					<div class="flex items-center gap-2">
						<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<span class="text-sm font-medium text-green-700">
							🎉 Você ganhou frete grátis!
						</span>
					</div>
				</div>
			{/if}
			
			<!-- Items List Aprimorado -->
			<div class="max-h-80 overflow-y-auto">
				{#each displayItems as item (getItemKey(item))}
					{@const itemKey = getItemKey(item)}
					<div 
						class="flex items-center gap-3 p-4 hover:bg-gray-50 transition-all duration-200 border-b border-gray-50 last:border-b-0 relative group"
						class:opacity-50={removingItemId === itemKey}
						transition:slide={{ duration: 300 }}
					>
						<!-- Product Image com hover effect -->
						<button 
							class="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer relative group block"
							onclick={() => handleItemClick((item.product as any).slug || item.product.id)}
						>
							<img 
								src={(item.product.images && item.product.images[0]) || '/api/placeholder/64/64'} 
								alt={item.product.name}
								class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
								loading="lazy"
							/>
							<div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-xl"></div>
						</button>
						
						<!-- Product Info -->
						<div class="flex-1 min-w-0">
							<button 
								class="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-[#00BFB3] transition-colors w-full text-left"
								onclick={() => handleItemClick((item.product as any).slug || item.product.id)}
							>
								{item.product.name}
							</button>
							<div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
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
									<div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
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
										<span class="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
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
								<p class="text-xs text-gray-500 mt-1">Qtd: {item.quantity}</p>
							{/if}
						</div>
						
						<!-- Price e Remove -->
						<div class="text-right">
							<p class="text-sm font-bold text-gray-900 mb-1">
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
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
							Ver mais {remainingCount} {remainingCount === 1 ? 'item' : 'itens'}
						</button>
					</div>
				{/if}
			</div>
			
			<!-- Footer com totais aprimorados -->
			<div class="p-4 bg-gray-50 border-t border-gray-200">
				<!-- Resumo de totais -->
				<div class="space-y-2 mb-4">
					<div class="flex justify-between text-sm">
						<span class="text-gray-600">Subtotal:</span>
						<span class="font-medium">{formatCurrency($cartTotals.cartSubtotal)}</span>
					</div>
					
					{#if totalSavings > 0}
						<div class="flex justify-between text-sm text-green-600">
							<span>Economia:</span>
							<span class="font-semibold">-{formatCurrency(totalSavings)}</span>
						</div>
					{/if}
					
					{#if hasShipping}
						<div class="flex justify-between text-sm">
							<span class="text-gray-600">Frete:</span>
							<span class="font-medium">{formatCurrency($cartTotals.totalShipping)}</span>
						</div>
					{/if}
					
					<div class="flex justify-between text-lg font-bold border-t pt-2">
						<span>Total:</span>
						<span class="text-[#00BFB3]">{formatCurrency($cartTotals.cartTotal)}</span>
					</div>
					
					<p class="text-xs text-gray-500 text-center">
						ou até 12x de {formatCurrency($cartTotals.cartTotal / 12)}
					</p>
				</div>
				
				<!-- Actions aprimoradas -->
				<div class="space-y-3">
					<button 
						onclick={handleCheckout}
						class="w-full bg-[#00BFB3] text-white py-3 px-4 rounded-xl text-sm font-bold hover:bg-[#00A89D] transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
						Finalizar Compra
					</button>
					<button 
						onclick={handleViewCart}
						class="w-full border-2 border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
					>
						Ver Carrinho Completo
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Scrollbar customizada mais elegante */
	:global(.max-h-80::-webkit-scrollbar) {
		width: 6px;
	}
	
	:global(.max-h-80::-webkit-scrollbar-track) {
		background: transparent;
	}
	
	:global(.max-h-80::-webkit-scrollbar-thumb) {
		background: linear-gradient(to bottom, #d1d5db, #9ca3af);
		border-radius: 3px;
	}
	
	:global(.max-h-80::-webkit-scrollbar-thumb:hover) {
		background: linear-gradient(to bottom, #9ca3af, #6b7280);
	}
	
	/* Animação para success state - removido seletor não usado */
	@keyframes bounce-in {
		0% {
			transform: scale(0.3);
			opacity: 0;
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style> 