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
			type: 'percentage' | 'fixed' | 'free_shipping';
			scope?: string;
		}>;
		onApplyCoupon: (code: string) => void | Promise<void>;
		onRemoveCoupon: () => void;
		hasShippingCalculated?: boolean;
		shippingCost?: number;
	}
	
	let { 
		appliedCoupon = null,
		availableCoupons = [],
		onApplyCoupon,
		onRemoveCoupon,
		hasShippingCalculated = false,
		shippingCost = 0
	}: CouponSectionProps = $props();
	
	let couponCode = $state('');
	let isApplying = $state(false);
	let error = $state('');
	let warning = $state('');
	let showAvailable = $state(false);
	
	async function handleApplyCoupon() {
		if (!couponCode.trim()) {
			error = 'Digite um código de cupom';
			return;
		}
		
		isApplying = true;
		error = '';
		warning = '';
		
		try {
			await onApplyCoupon(couponCode.toUpperCase());
			couponCode = '';
			showAvailable = false;
			
			// Mostrar aviso se for cupom de frete grátis sem frete calculado
			if (!hasShippingCalculated && couponCode.toUpperCase().includes('FRETE')) {
				warning = 'Calcule o frete para ver a economia exata do cupom';
			}
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
		warning = '';
	}
	
	// Limpar mensagens após alguns segundos
	$effect(() => {
		if (error && error.trim() !== '') {
			const timer = setTimeout(() => {
				if (error) error = '';
			}, 3000);
			return () => clearTimeout(timer);
		}
	});
	
	$effect(() => {
		if (warning && warning.trim() !== '') {
			const timer = setTimeout(() => {
				if (warning) warning = '';
			}, 5000);
			return () => clearTimeout(timer);
		}
	});
</script>

<!-- COMPONENTE SIMPLIFICADO -->
<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
	<div class="flex items-center gap-2 mb-4">
		<svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
		</svg>
		<h4 class="font-medium text-gray-900 text-sm">Cupom de Desconto</h4>
	</div>
	
	{#if appliedCoupon}
		<!-- CUPOM APLICADO - SIMPLES E LIMPO -->
		<div class="bg-green-50 border border-green-200 rounded-lg p-3" transition:scale={{ duration: 200 }}>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
						<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<div>
						<p class="font-semibold text-green-900 text-sm">{appliedCoupon.code}</p>
						<p class="text-xs text-green-700">{appliedCoupon.description}</p>
					</div>
				</div>
				
				<!-- BOTÃO REMOVER CUPOM - VISÍVEL E CLARO -->
				<button 
					onclick={handleRemoveCoupon}
					class="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
					title="Remover cupom"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{:else}
		<!-- INPUT DE CUPOM - RESPONSIVO -->
		<div class="space-y-3">
			<div class="flex flex-col sm:flex-row gap-2">
				<input 
					type="text"
					bind:value={couponCode}
					placeholder="Digite o código"
					class="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent uppercase placeholder:normal-case"
					onkeydown={(e) => e.key === 'Enter' && !isApplying && handleApplyCoupon()}
					disabled={isApplying}
				/>
				<button 
					onclick={handleApplyCoupon}
					disabled={isApplying || !couponCode.trim()}
					class="w-full sm:w-20 px-3 py-2.5 bg-[#00BFB3] text-white rounded-lg font-medium text-sm hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
				>
					{#if isApplying}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					{:else}
						Aplicar
					{/if}
				</button>
			</div>
			
			<!-- MENSAGENS -->
			{#if error}
				<p class="text-xs text-red-600 flex items-center gap-1" transition:slide={{ duration: 200 }}>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</p>
			{/if}
			
			{#if warning}
				<p class="text-xs text-yellow-600 flex items-center gap-1" transition:slide={{ duration: 200 }}>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					{warning}
				</p>
			{/if}
		</div>
	{/if}
</div> 