<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	import { advancedCartStore } from '$lib/stores/advancedCartStore';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	
	interface MiniCartProps {
		isVisible: boolean;
		onClose: () => void;
		onViewCart: () => void;
		onCheckout: () => void;
	}
	
	let { 
		isVisible = false,
		onClose,
		onViewCart,
		onCheckout
	}: MiniCartProps = $props();
	
	const { sellerGroups, cartTotals } = advancedCartStore;
	
	// Computed
	const itemCount = $derived($sellerGroups.reduce((sum, g) => sum + g.items.length, 0));
	const firstItems = $derived($sellerGroups.flatMap(g => g.items).slice(0, 3));
	const remainingCount = $derived(Math.max(0, itemCount - 3));
	
	function handleItemClick(productSlug: string) {
		onClose();
		// Navegar para produto (será implementado)
		// window.location.href = `/produto/${productSlug}`;
	}
</script>

{#if isVisible}
	<div 
		class="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
		transition:scale={{ duration: 200, start: 0.95, easing: cubicOut }}
		role="menu"
		aria-label="Prévia do carrinho"
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-gray-200">
			<h3 class="text-sm font-semibold text-gray-900">Meu Carrinho</h3>
			<button 
				onclick={onClose}
				class="text-gray-400 hover:text-gray-600 transition-colors"
				aria-label="Fechar prévia"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
		
		{#if itemCount === 0}
			<!-- Empty State -->
			<div class="p-6 text-center">
				<div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
					<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
					</svg>
				</div>
				<h4 class="text-sm font-medium text-gray-900 mb-1">Carrinho vazio</h4>
				<p class="text-xs text-gray-500 mb-4">Adicione produtos para começar suas compras</p>
				<button 
					onclick={onClose}
					class="text-xs text-[#00BFB3] hover:text-[#00A89D] font-medium"
				>
					Continuar comprando
				</button>
			</div>
		{:else}
			<!-- Items Preview -->
			<div class="max-h-64 overflow-y-auto">
				{#each firstItems as item (item.product.id + '-' + item.selectedColor + '-' + item.selectedSize)}
					<div 
						class="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
						onclick={() => handleItemClick((item.product as any).slug || item.product.id)}
					>
						<!-- Product Image -->
						<div class="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
							<img 
								src={(item.product.images && item.product.images[0]) || '/api/placeholder/48/48'} 
								alt={item.product.name}
								class="w-full h-full object-cover"
								loading="lazy"
							/>
						</div>
						
						<!-- Product Info -->
						<div class="flex-1 min-w-0">
							<h4 class="text-sm font-medium text-gray-900 truncate">
								{item.product.name}
							</h4>
							<div class="flex items-center gap-2 mt-1">
								<span class="text-xs text-gray-500">Qtd: {item.quantity}</span>
								{#if item.selectedColor}
									<span class="text-xs text-gray-500">• {item.selectedColor}</span>
								{/if}
								{#if item.selectedSize}
									<span class="text-xs text-gray-500">• {item.selectedSize}</span>
								{/if}
							</div>
						</div>
						
						<!-- Price -->
						<div class="text-right">
							<p class="text-sm font-semibold text-gray-900">
								{formatCurrency(item.product.price * item.quantity)}
							</p>
						</div>
					</div>
				{/each}
				
				{#if remainingCount > 0}
					<div class="px-3 py-2 bg-gray-50 border-t border-gray-200">
						<button 
							onclick={onViewCart}
							class="text-xs text-[#00BFB3] hover:text-[#00A89D] font-medium"
						>
							Ver mais {remainingCount} {remainingCount === 1 ? 'item' : 'itens'}
						</button>
					</div>
				{/if}
			</div>
			
			<!-- Footer -->
			<div class="p-4 border-t border-gray-200 bg-gray-50">
				<!-- Total -->
				<div class="flex justify-between items-center mb-3">
					<span class="text-sm font-medium text-gray-900">Total:</span>
					<span class="text-lg font-bold text-[#00BFB3]">
						{formatCurrency($cartTotals.cartTotal)}
					</span>
				</div>
				
				<!-- Actions -->
				<div class="space-y-2">
					<button 
						onclick={onCheckout}
						class="w-full bg-[#00BFB3] text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#00A89D] transition-colors"
					>
						Finalizar compra
					</button>
					<button 
						onclick={onViewCart}
						class="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
					>
						Ver carrinho completo
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Scrollbar customizada para o mini carrinho */
	:global(.max-h-64::-webkit-scrollbar) {
		width: 4px;
	}
	
	:global(.max-h-64::-webkit-scrollbar-track) {
		background: transparent;
	}
	
	:global(.max-h-64::-webkit-scrollbar-thumb) {
		background: #d1d5db;
		border-radius: 2px;
	}
	
	:global(.max-h-64::-webkit-scrollbar-thumb:hover) {
		background: #9ca3af;
	}
</style> 