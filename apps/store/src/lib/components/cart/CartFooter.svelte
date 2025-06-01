<script lang="ts">
	import { formatCurrency } from '$lib/utils';
	import { onMount } from 'svelte';
	import StaticMoney from './StaticMoney.svelte';
	
	interface CartFooterProps {
		subtotal: number;
		shipping: number;
		discount: number;
		total: number;
		installmentValue?: number;
		onCheckout: () => void;
		isCheckoutDisabled?: boolean;
		checkoutDisabledReason?: string;
	}
	
	let { 
		subtotal, 
		shipping, 
		discount, 
		total,
		installmentValue,
		onCheckout,
		isCheckoutDisabled = false,
		checkoutDisabledReason = ''
	}: CartFooterProps = $props();
	
	const hasDiscount = $derived(discount > 0);
	const hasShipping = $derived(shipping > 0);
	const freeShippingThreshold = 199;
	const remainingForFreeShipping = $derived(Math.max(0, freeShippingThreshold - subtotal));
	const hasFreeShipping = $derived(subtotal >= freeShippingThreshold);
	const showInstallment = $derived(installmentValue && installmentValue > 0);
</script>

<div class="bg-white border-t border-gray-200 p-4 sm:p-6 space-y-3 sm:space-y-4 no-animations">
	<!-- Resumo -->
	<div class="space-y-1.5 sm:space-y-2">
		<div class="flex justify-between text-xs sm:text-sm">
			<span class="text-gray-600">Subtotal</span>
			<span class="font-medium no-animations"><StaticMoney value={subtotal} /></span>
		</div>
		
		{#if hasShipping}
			<div class="flex justify-between text-xs sm:text-sm">
				<span class="text-gray-600">Frete</span>
				<span class="font-medium no-animations"><StaticMoney value={shipping} /></span>
			</div>
		{/if}
		
		{#if hasDiscount}
			<div class="flex justify-between text-xs sm:text-sm text-green-600">
				<span class="flex items-center gap-1">
					<svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					<span class="hidden sm:inline">Desconto do cupom</span>
					<span class="sm:hidden">Cupom</span>
				</span>
				<span class="font-medium no-animations"><StaticMoney value={discount} prefix="-" /></span>
			</div>
		{/if}
		
		<div class="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
			<div class="flex justify-between items-start">
				<span class="text-sm sm:text-base font-semibold text-gray-900">Total</span>
				<div class="text-right no-animations">
					<p class="text-xl sm:text-2xl font-bold text-[#00BFB3] no-animations"><StaticMoney value={total} /></p>
					{#if showInstallment}
						<p class="text-xs sm:text-sm text-gray-700 mt-0.5 sm:mt-1 font-medium no-animations">
							ou <span class="text-[#00BFB3]">12x</span> de <span class="text-[#00BFB3] font-bold no-animations"><StaticMoney value={installmentValue || 0} /></span>
						</p>
						<p class="text-[10px] sm:text-xs text-gray-500">sem juros</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
	
	<!-- Botão de Checkout -->
	<button 
		onclick={onCheckout}
		disabled={isCheckoutDisabled}
		class="w-full bg-[#00BFB3] text-white py-3 sm:py-3.5 px-4 rounded-lg text-sm sm:text-base font-semibold hover:bg-[#00A89D] hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
		title={checkoutDisabledReason}
	>
		<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
		</svg>
		Finalizar Compra
	</button>
	
	{#if checkoutDisabledReason}
		<p class="text-xs text-center text-red-600">
			{checkoutDisabledReason}
		</p>
	{/if}
	
	<!-- Segurança -->
	<div class="flex items-center justify-center gap-3 sm:gap-4 pt-1 sm:pt-2">
		<div class="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
			<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
			</svg>
			<span>Compra segura</span>
		</div>
		<div class="flex items-center gap-1 text-[10px] sm:text-xs text-gray-500">
			<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
			</svg>
			<span>Dados protegidos</span>
		</div>
	</div>
</div>

<style>
	/* Desabilitar todas as animações e transições */
	:global(.no-animations),
	:global(.no-animations *) {
		animation: none !important;
		transition: none !important;
		animation-duration: 0s !important;
		transition-duration: 0s !important;
		animation-delay: 0s !important;
		transition-delay: 0s !important;
	}
</style> 