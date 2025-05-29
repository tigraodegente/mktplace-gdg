<script lang="ts">
	import { fade, scale, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Coupon } from '$lib/types/cart';
	import { CART_CONSTANTS } from './constants';
	
	interface CouponSectionProps {
		appliedCoupon?: Coupon | null;
		availableCoupons?: Array<{
			code: string;
			description: string;
			value: number;
			type: 'percentage' | 'fixed';
			scope?: string;
		}>;
		onApplyCoupon: (code: string) => void | Promise<void>;
		onRemoveCoupon: () => void;
	}
	
	let { 
		appliedCoupon = null,
		availableCoupons = [],
		onApplyCoupon,
		onRemoveCoupon
	}: CouponSectionProps = $props();
	
	let couponCode = $state('');
	let isApplying = $state(false);
	let error = $state('');
	let showAvailable = $state(false);
	
	async function handleApplyCoupon() {
		if (!couponCode.trim()) {
			error = 'Digite um código de cupom';
			return;
		}
		
		isApplying = true;
		error = '';
		
		try {
			await onApplyCoupon(couponCode.toUpperCase());
			couponCode = '';
			showAvailable = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Cupom inválido';
		} finally {
			isApplying = false;
		}
	}
	
	function selectCoupon(code: string) {
		couponCode = code;
		showAvailable = false;
		handleApplyCoupon();
	}
	
	function handleRemoveCoupon() {
		onRemoveCoupon();
		error = '';
	}
	
	// Limpar erro após 3 segundos
	$effect(() => {
		if (error && error.trim() !== '') {
			const timer = setTimeout(() => {
				// Só limpar se ainda tiver o mesmo erro
				if (error) {
					error = '';
				}
			}, 3000);
			return () => clearTimeout(timer);
		}
	});
</script>

<div class="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
	<h4 class="font-semibold text-gray-900 text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
		<svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
		</svg>
		Cupom de Desconto
	</h4>
	
	{#if appliedCoupon}
		<!-- Cupom Aplicado -->
		<div 
			class="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-3"
			transition:scale={{ duration: 300, easing: cubicOut }}
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2 sm:gap-3">
					<div class="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
						<svg class="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<div class="min-w-0">
						<p class="font-semibold text-green-900 text-xs sm:text-sm">{appliedCoupon.code}</p>
						<p class="text-[10px] sm:text-xs text-green-700 truncate">{appliedCoupon.description}</p>
					</div>
				</div>
				<button 
					onclick={handleRemoveCoupon}
					class="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
					aria-label="Remover cupom"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{:else}
		<!-- Input de Cupom -->
		<div class="space-y-2 sm:space-y-3">
			<!-- Layout sempre em coluna para mobile, linha para desktop -->
			<div class="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:gap-3">
				<div class="flex-1 min-w-0">
					<input 
						type="text"
						bind:value={couponCode}
						placeholder="Código do cupom"
						class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] uppercase placeholder:normal-case transition-all duration-200"
						onkeydown={(e) => e.key === 'Enter' && handleApplyCoupon()}
						disabled={isApplying}
					/>
				</div>
				<div class="flex-shrink-0">
					<button 
						onclick={handleApplyCoupon}
						disabled={isApplying || !couponCode.trim()}
						class="w-full min-[400px]:w-auto px-4 py-2.5 bg-[#00BFB3] text-white rounded-lg font-medium text-sm hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap min-w-[90px]"
					>
						{#if isApplying}
							<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						{/if}
						<span>Aplicar</span>
					</button>
				</div>
			</div>
			
			{#if error}
				<p 
					class="text-xs text-red-600 flex items-center gap-1"
					transition:slide={{ duration: 200, easing: cubicOut }}
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</p>
			{/if}
			
			<!-- Botão para mostrar cupons disponíveis -->
			{#if availableCoupons.length > 0}
				<button 
					onclick={() => showAvailable = !showAvailable}
					class="text-[10px] sm:text-xs text-[#00BFB3] hover:text-[#00A89D] font-medium flex items-center gap-0.5 sm:gap-1 transition-colors"
				>
					<svg 
						class="w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform {showAvailable ? 'rotate-180' : ''}" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
					{showAvailable ? 'Ocultar' : 'Ver'} cupons
				</button>
			{/if}
		</div>
		
		<!-- Lista de cupons disponíveis -->
		{#if showAvailable && availableCoupons.length > 0}
			<div 
				class="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 border-t pt-2 sm:pt-3"
				transition:slide={{ duration: 200, easing: cubicOut }}
			>
				<p class="text-[10px] sm:text-xs text-gray-600 font-medium">Cupons disponíveis:</p>
				{#each availableCoupons as coupon}
					<button 
						onclick={() => selectCoupon(coupon.code)}
						class="w-full text-left p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all group"
					>
						<div class="flex items-center justify-between gap-2">
							<div class="min-w-0">
								<p class="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-[#00BFB3]">
									{coupon.code}
								</p>
								<p class="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate">
									{coupon.description}
								</p>
							</div>
							<span class="text-[10px] sm:text-xs font-bold text-[#00BFB3] bg-[#00BFB3]/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex-shrink-0">
								{coupon.type === 'percentage' ? `${coupon.value}%` : `R$${coupon.value}`}
							</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	{/if}
</div> 