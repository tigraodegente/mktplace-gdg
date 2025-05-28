<script lang="ts">
	import CartItem from './CartItem.svelte';
	import type { SellerGroup } from '$lib/types/cart';
	import { formatCurrency } from '@mktplace/utils';
	import { fade } from 'svelte/transition';
	import { advancedCartStore } from '$lib/stores/advancedCartStore';
	
	interface SellerGroupProps {
		group: SellerGroup;
		onUpdateQuantity: (productId: string, quantity: number) => void;
		onRemoveItem: (productId: string) => void;
		onSelectShipping?: (sellerId: string, optionId: string) => void;
	}
	
	let { group, onUpdateQuantity, onRemoveItem, onSelectShipping }: SellerGroupProps = $props();
	
	// Pegar o modo de entrega do store
	const { shippingMode } = advancedCartStore;
	
	const subtotal = $derived(
		group.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
	);
</script>

{#if group.items.length > 0}
<div class="bg-white rounded-lg shadow-sm border border-gray-100 mb-4" transition:fade={{ duration: 200 }}>
	<!-- Seller Header -->
	<div class="bg-gray-50 px-4 py-3 border-b border-gray-100">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
				</svg>
				<h4 class="font-semibold text-gray-900 text-sm">{group.sellerName}</h4>
			</div>
			<span class="text-xs text-gray-500">
				{group.items.length} {group.items.length === 1 ? 'produto' : 'produtos'}
			</span>
		</div>
	</div>
	
	<!-- Items -->
	<div class="p-4 space-y-4 overflow-visible">
		{#each group.items as item (`${item.product.id}-${item.quantity}`)}
			<CartItem 
				{item}
				estimatedDays={$shippingMode === 'express' ? group.expressShipping?.estimatedDays : group.groupedShipping?.estimatedDays}
				shippingMode={$shippingMode}
				onUpdateQuantity={(quantity) => onUpdateQuantity(item.product.id, quantity)}
				onRemove={() => onRemoveItem(item.product.id)}
			/>
		{/each}
	</div>
	

	
	<!-- Subtotal -->
	<div class="bg-gray-50 px-4 py-3 border-t border-gray-100">
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600">Subtotal do vendedor:</span>
			<div class="text-right">
				<p class="text-base font-bold text-gray-900">{formatCurrency(subtotal)}</p>
			</div>
		</div>
	</div>
</div>
{/if} 