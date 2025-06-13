<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { advancedCartStore } from '$lib/features/cart';
	
	interface CartHeaderProps {
		itemCount: number;
		sellerCount: number;
		onClose: () => void;
		onShare?: () => void;
	}
	
	let { itemCount, sellerCount, onClose, onShare }: CartHeaderProps = $props();
	
	function handleClearCart() {
		if (confirm('Tem certeza que deseja remover todos os produtos do carrinho?')) {
			advancedCartStore.clearCart();
		}
	}
</script>

<div class="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
	<div class="flex items-center gap-2 sm:gap-4">
		<h2 class="text-lg sm:text-xl font-bold text-gray-900">Meu Carrinho</h2>
		<div class="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
			<span class="flex items-center gap-1 sm:gap-1.5 bg-gray-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
				<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
				</svg>
				<span class="font-medium">{itemCount}</span>
			</span>
			{#if sellerCount > 0}
				<span class="hidden sm:flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full">
					<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
					</svg>
					<span class="font-medium">{sellerCount} {sellerCount === 1 ? 'vendedor' : 'vendedores'}</span>
				</span>
			{/if}
		</div>
	</div>
	
	<div class="flex items-center gap-1 sm:gap-2">
		{#if itemCount > 0}
			<button 
				onclick={handleClearCart}
				class="p-2 hover:bg-red-50 rounded-lg transition-colors group"
				aria-label="Limpar carrinho"
				title="Limpar carrinho"
			>
				<svg class="w-4 h-4 sm:w-5 sm:h-5 text-red-500 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		{/if}
		
		{#if onShare && itemCount > 0}
			<button 
				onclick={onShare}
				class="p-2 hover:bg-gray-50 rounded-lg transition-colors group"
				aria-label="Compartilhar carrinho"
			>
				<svg class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-2.684-4.026m-9.032 0a3 3 0 002.684 4.026m9.032 0l-2.684-4.026M12 9a3 3 0 100-6 3 3 0 000 6z" />
				</svg>
			</button>
		{/if}
		
		<button 
			onclick={onClose}
			class="p-2 hover:bg-gray-50 rounded-lg transition-colors group"
			aria-label="Fechar carrinho"
		>
			<svg class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
</div>

<style>
	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
</style> 