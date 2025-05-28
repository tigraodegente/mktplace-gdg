<script lang="ts">
	// Imports externos
	import { goto } from '$app/navigation';
	import { fade, slide, scale, fly } from 'svelte/transition';
	import { cubicOut, elasticOut } from 'svelte/easing';
	
	// Imports internos - stores
	import { advancedCartStore } from '$lib/stores/advancedCartStore';
	import { authStore, isAuthenticated } from '$lib/stores/authStore';
	
	// Imports internos - utils
	import { staggerDelay, springConfig, smoothSpring } from '$lib/utils/animations';
	
	// Imports internos - componentes
	import CartHeader from './cart/CartHeader.svelte';
	import EmptyCart from './cart/EmptyCart.svelte';
	import ShippingCalculator from './cart/ShippingCalculator.svelte';
	import ShippingModeSelector from './cart/ShippingModeSelector.svelte';
	import SellerGroup from './cart/SellerGroup.svelte';
	import CouponSection from './cart/CouponSection.svelte';
	import CartFooter from './cart/CartFooter.svelte';
	import ShareCart from './cart/ShareCart.svelte';
	
	// Types
	interface CartPreviewProps {
		isOpen: boolean;
		class?: string;
	}
	
	interface SavedAddress {
		id: string;
		zipCode: string;
		street: string;
		number: string;
		neighborhood: string;
		city: string;
		state: string;
		isDefault: boolean;
	}
	
	// Constants
	const ANIMATION_DELAYS = {
		CONTENT_READY: 50,
		CLICK_OUTSIDE: 100,
		HEADER: 100,
		EMPTY_CART: 200,
		SHIPPING_CALCULATOR: 150,
		SELLER_GROUP_BASE: 200,
		SELLER_GROUP_STAGGER: 100,
		COUPON_SECTION_BASE: 300,
		FOOTER: 100
	} as const;
	
	const ANIMATION_DURATIONS = {
		OVERLAY_FADE: 300,
		CONTAINER_SLIDE: 500,
		FLY_ANIMATION: 400,
		SLIDE_ANIMATION: 400,
		SCALE_ANIMATION: 400
	} as const;
	
	const ANIMATION_DISTANCES = {
		HEADER_Y: -20,
		CONTENT_X: 50,
		FOOTER_Y: 50
	} as const;
	
	const AVAILABLE_COUPONS = [
		{ 
			code: 'BEMVINDO10', 
			description: '10% OFF - Boas vindas', 
			value: 10, 
			type: 'percentage' as const, 
			scope: 'cart' as const
		},
		{ 
			code: 'FRETE20', 
			description: 'R$ 20 OFF no frete', 
			value: 20, 
			type: 'fixed' as const, 
			scope: 'shipping' as const
		},
		{ 
			code: 'NATAL15', 
			description: '15% OFF - Promoção de Natal', 
			value: 15, 
			type: 'percentage' as const, 
			scope: 'cart' as const
		}
	];
	
	// Props
	let { isOpen = $bindable(false), class: className = '' }: CartPreviewProps = $props();
	
	// Store destructuring
	const { 
		sellerGroups, 
		cartTotals, 
		zipCode, 
		shippingMode, 
		loadingShipping, 
		appliedCoupon 
	} = advancedCartStore;
	
	// Local state
	let showShippingOptions = $state(false);
	let contentReady = $state(false);
	let shareModalOpen = $state(false);
	let previousFocusElement: HTMLElement | null = $state(null);
	let hasSetInitialMode = $state(false);
	
	// Mock data - TODO: Mover para serviço quando implementar API
	let mockSavedAddresses = $state<SavedAddress[]>([
		{
			id: '1',
			zipCode: '01310100',
			street: 'Avenida Paulista',
			number: '1578',
			neighborhood: 'Bela Vista',
			city: 'São Paulo',
			state: 'SP',
			isDefault: true
		},
		{
			id: '2',
			zipCode: '22290140',
			street: 'Avenida Lúcio Costa',
			number: '3150',
			neighborhood: 'Barra da Tijuca',
			city: 'Rio de Janeiro',
			state: 'RJ',
			isDefault: false
		},
		{
			id: '3',
			zipCode: '30140071',
			street: 'Rua da Bahia',
			number: '1148',
			neighborhood: 'Centro',
			city: 'Belo Horizonte',
			state: 'MG',
			isDefault: false
		}
	]);
	
	// Computed values
	const itemCount = $derived($sellerGroups.reduce((sum, g) => sum + g.items.length, 0));
	const sellerCount = $derived($sellerGroups.length);
	const allItems = $derived($sellerGroups.flatMap(g => g.items));
	const hasItems = $derived($sellerGroups.length > 0);
	const canCheckout = $derived(!!($zipCode && showShippingOptions));
	const checkoutDisabledReason = $derived(!$zipCode ? 'Informe o CEP para continuar' : '');
	
	// Valores estáticos para evitar animação
	let staticSubtotal = $state(0);
	let staticShipping = $state(0);
	let staticDiscount = $state(0);
	let staticTotal = $state(0);
	let staticInstallment = $state(0);
	
	// Atualizar valores estáticos quando os totais mudarem
	$effect(() => {
		// Usar setTimeout para garantir que a atualização aconteça após o render
		setTimeout(() => {
			staticSubtotal = $cartTotals.cartSubtotal;
			staticShipping = $cartTotals.totalShipping;
			staticDiscount = $cartTotals.couponDiscount;
			staticTotal = $cartTotals.cartTotal;
			staticInstallment = $cartTotals.installmentValue || 0;
		}, 0);
	});
	
	// Refs
	let cartContainerRef = $state<HTMLDivElement>();
	let closeButtonRef = $state<HTMLButtonElement>();
	
	// Effects
	// Definir modo expresso como padrão ao montar o componente
	$effect(() => {
		// Executar apenas uma vez quando o componente montar
		if (!hasSetInitialMode) {
			advancedCartStore.setShippingMode('express');
			hasSetInitialMode = true;
		}
	});
	
	// Controlar animação de conteúdo
	$effect(() => {
		if (isOpen) {
			// Salvar elemento focado anteriormente
			previousFocusElement = document.activeElement as HTMLElement;
			
			setTimeout(() => {
				contentReady = true;
				// Focar no primeiro elemento focável do carrinho
				if (cartContainerRef) {
					const firstFocusable = cartContainerRef.querySelector(
						'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
					) as HTMLElement;
					firstFocusable?.focus();
				}
			}, ANIMATION_DELAYS.CONTENT_READY);
		} else {
			contentReady = false;
			// Restaurar foco ao elemento anterior
			if (previousFocusElement) {
				previousFocusElement.focus();
				previousFocusElement = null;
			}
		}
	});
	
	// Inicializar showShippingOptions
	$effect(() => {
		showShippingOptions = !!$zipCode;
	});
	
	// Gerenciar eventos e overflow
	$effect(() => {
		if (!isOpen) return;
		
		const timeoutId = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeyDown);
		}, ANIMATION_DELAYS.CLICK_OUTSIDE);
		
		// Prevenir scroll do body
		const scrollY = window.scrollY;
		document.body.style.position = 'fixed';
		document.body.style.top = `-${scrollY}px`;
		document.body.style.width = '100%';
		
		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
			
			// Restaurar scroll
			document.body.style.position = '';
			document.body.style.top = '';
			document.body.style.width = '';
			window.scrollTo(0, scrollY);
		};
	});
	
	// Event handlers
	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		
		// Não fechar se modal de compartilhamento estiver aberto
		if (shareModalOpen) return;
		
		const isOutsideCart = !target.closest('.cart-preview-container') && 
		                     !target.closest('[aria-label="Carrinho de compras"]');
		
		if (isOutsideCart) {
			closeCart();
		}
	}
	
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeCart();
		}
		
		// Trap focus dentro do carrinho
		if (e.key === 'Tab' && cartContainerRef) {
			const focusableElements = cartContainerRef.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const firstElement = focusableElements[0] as HTMLElement;
			const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
			
			if (e.shiftKey && document.activeElement === firstElement) {
				e.preventDefault();
				lastElement?.focus();
			} else if (!e.shiftKey && document.activeElement === lastElement) {
				e.preventDefault();
				firstElement?.focus();
			}
		}
	}
	
	async function handleCalculateShipping(cleanZip: string) {
		advancedCartStore.zipCode.set(cleanZip);
		showShippingOptions = true;
		await advancedCartStore.calculateAllShipping(cleanZip);
	}
	
	function handleRemoveAddress(id: string) {
		mockSavedAddresses = mockSavedAddresses.filter(addr => addr.id !== id);
		// TODO: Implementar chamada à API para remover endereço
	}
	
	async function handleApplyCoupon(code: string) {
		try {
			await advancedCartStore.applyCoupon(code);
		} catch (error) {
			console.error('Erro ao aplicar cupom:', error);
			// TODO: Mostrar notificação de erro
		}
	}
	
	// Navigation handlers
	function closeCart() {
		isOpen = false;
	}
	
	function goToCheckout() {
		closeCart();
		goto('/checkout');
	}
	
	function continueShopping() {
		closeCart();
	}
	
	function openShareModal() {
		shareModalOpen = true;
	}
	
	// Helper functions
	function getStaggerDelay(index: number): number {
		return ANIMATION_DELAYS.SELLER_GROUP_BASE + 
		       staggerDelay(index, ANIMATION_DELAYS.SELLER_GROUP_STAGGER);
	}
	
	function getCouponDelay(): number {
		return ANIMATION_DELAYS.COUPON_SECTION_BASE + 
		       staggerDelay($sellerGroups.length, ANIMATION_DELAYS.SELLER_GROUP_STAGGER);
	}
	
	// Accessibility helpers
	function getCartAriaLabel(): string {
		if (!hasItems) return 'Carrinho vazio';
		
		const itemText = itemCount === 1 ? '1 item' : `${itemCount} itens`;
		const sellerText = sellerCount === 1 ? '1 vendedor' : `${sellerCount} vendedores`;
		
		return `Carrinho com ${itemText} de ${sellerText}`;
	}
</script>

<!-- Overlay com blur -->
{#if isOpen}
	<button 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 cursor-default"
		transition:fade={{ duration: ANIMATION_DURATIONS.OVERLAY_FADE, easing: cubicOut }}
		onclick={closeCart}
		aria-label="Fechar carrinho"
	></button>
{/if}

<!-- Cart Preview Container -->
<div 
	bind:this={cartContainerRef}
	class="cart-preview-container fixed right-0 top-0 h-full bg-white shadow-2xl z-50 w-full max-w-2xl transform transition-all duration-500 ease-out {isOpen ? 'translate-x-0' : 'translate-x-full'} {className} flex flex-col"
	style="transition-timing-function: {isOpen ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.4, 0, 1, 1)'}"
	role="dialog"
	aria-modal="true"
	aria-label={getCartAriaLabel()}
	aria-hidden={!isOpen}
>
	<!-- Header -->
	{#if contentReady}
		<div transition:fly={{ 
			y: ANIMATION_DISTANCES.HEADER_Y, 
			duration: ANIMATION_DURATIONS.FLY_ANIMATION, 
			delay: ANIMATION_DELAYS.HEADER, 
			easing: cubicOut 
		}}>
			<CartHeader 
				{itemCount}
				{sellerCount}
				onClose={closeCart}
				onShare={hasItems ? openShareModal : undefined}
			/>
		</div>
	{/if}
	
	<!-- Cart Content -->
	<div 
		class="flex-1 overflow-y-auto overflow-x-visible bg-gray-50 scroll-smooth"
		role="region"
		aria-label="Conteúdo do carrinho"
	>
		{#if !hasItems}
			<!-- Empty Cart -->
			{#if contentReady}
				<div transition:scale={{ 
					duration: ANIMATION_DURATIONS.SCALE_ANIMATION, 
					delay: ANIMATION_DELAYS.EMPTY_CART, 
					easing: elasticOut, 
					start: 0.8 
				}}>
					<EmptyCart onContinueShopping={continueShopping} />
				</div>
			{/if}
		{:else}
			<!-- Cart Items -->
			<div class="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-32">
				<!-- Shipping Calculator -->
				{#if contentReady}
					<section
						transition:fly={{ 
							x: ANIMATION_DISTANCES.CONTENT_X, 
							duration: ANIMATION_DURATIONS.FLY_ANIMATION, 
							delay: ANIMATION_DELAYS.SHIPPING_CALCULATOR, 
							easing: cubicOut 
						}}
						aria-label="Cálculo de frete"
					>
						<ShippingCalculator 
							zipCode={$zipCode}
							onCalculate={handleCalculateShipping}
							savedAddresses={$isAuthenticated ? mockSavedAddresses : []}
							onAddressSelect={(address) => {
								// TODO: Implementar seleção de endereço
								handleCalculateShipping(address.zipCode);
							}}
							onRemoveAddress={handleRemoveAddress}
						/>
					</section>
				{/if}
				
				<!-- Shipping Mode Selector -->
				{#if showShippingOptions && $zipCode && contentReady}
					<section
						transition:slide={{ 
							duration: ANIMATION_DURATIONS.SLIDE_ANIMATION, 
							easing: cubicOut 
						}}
						aria-label="Modalidade de entrega"
					>
						<ShippingModeSelector 
							shippingMode={$shippingMode}
							onModeChange={(mode) => {
								advancedCartStore.setShippingMode(mode);
							}}
							sellerGroups={$sellerGroups}
						/>
					</section>
				{/if}
				
				<!-- Seller Groups -->
				<div role="list" aria-label="Produtos por vendedor">
					{#each $sellerGroups as group, index (`${group.sellerId}-${$shippingMode}`)}
						{#if contentReady}
							<article
								transition:fly={{ 
									x: ANIMATION_DISTANCES.CONTENT_X, 
									duration: ANIMATION_DURATIONS.FLY_ANIMATION, 
									delay: getStaggerDelay(index), 
									easing: cubicOut 
								}}
								role="listitem"
								aria-label={`Produtos do vendedor ${group.sellerName}`}
							>
								<SellerGroup 
									{group}
									onUpdateQuantity={(productId, quantity) => {
										advancedCartStore.updateQuantity(
											productId,
											group.sellerId,
											quantity
										);
									}}
									onRemoveItem={(productId) => {
										advancedCartStore.removeItem(
											productId,
											group.sellerId
										);
									}}
									onSelectShipping={(sellerId, optionId) => {
										// TODO: Implementar seleção de frete
									}}
								/>
							</article>
						{/if}
					{/each}
				</div>
				
				<!-- Coupon Section -->
				{#if contentReady}
					<section
						transition:fly={{ 
							x: ANIMATION_DISTANCES.CONTENT_X, 
							duration: ANIMATION_DURATIONS.FLY_ANIMATION, 
							delay: getCouponDelay(), 
							easing: cubicOut 
						}}
						aria-label="Cupons de desconto"
					>
						<CouponSection 
							appliedCoupon={$appliedCoupon}
							availableCoupons={AVAILABLE_COUPONS}
							onApplyCoupon={handleApplyCoupon}
							onRemoveCoupon={() => advancedCartStore.removeCoupon()}
						/>
					</section>
				{/if}
			</div>
		{/if}
	</div>
	
	<!-- Footer -->
	{#if hasItems && contentReady}
		<footer aria-label="Resumo do pedido">
			<CartFooter 
				subtotal={staticSubtotal}
				shipping={staticShipping}
				discount={staticDiscount}
				total={staticTotal}
				installmentValue={staticInstallment}
				onCheckout={goToCheckout}
				isCheckoutDisabled={!canCheckout}
				checkoutDisabledReason={checkoutDisabledReason}
			/>
		</footer>
	{/if}
</div>

<!-- Share Cart Modal -->
{#if shareModalOpen}
	<ShareCart 
		items={allItems}
		bind:isOpen={shareModalOpen}
		onClose={() => shareModalOpen = false}
	/>
{/if}

<style>
	/* Animações suaves e sombras melhoradas */
	.cart-preview-container {
		box-shadow: 
			-10px 0 40px rgba(0, 0, 0, 0.1),
			-5px 0 20px rgba(0, 0, 0, 0.05);
		will-change: transform;
	}
	
	/* Scrollbar customizada com animação */
	.cart-preview-container :global(::-webkit-scrollbar) {
		width: 6px;
	}
	
	.cart-preview-container :global(::-webkit-scrollbar-track) {
		background: #f3f4f6;
		border-radius: 3px;
	}
	
	.cart-preview-container :global(::-webkit-scrollbar-thumb) {
		background: #d1d5db;
		border-radius: 3px;
		transition: background 0.2s ease;
	}
	
	.cart-preview-container :global(::-webkit-scrollbar-thumb:hover) {
		background: #9ca3af;
	}
	
	/* Animação de pulse para elementos interativos */
	:global(.pulse-on-hover) {
		transition: all 0.3s ease;
	}
	
	:global(.pulse-on-hover:hover) {
		animation: pulse 1s infinite;
	}
	
	@keyframes pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1);
		}
	}
	
	/* Garantir transições suaves em mobile */
	@media (max-width: 640px) {
		.cart-preview-container {
			max-width: 100%;
		}
	}
	
	/* Animação de shimmer para loading */
	:global(.shimmer) {
		background: linear-gradient(
			90deg,
			#f0f0f0 25%,
			#e0e0e0 50%,
			#f0f0f0 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}
	
	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style> 