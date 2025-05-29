<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	import type { CartItem } from '$lib/types/cart';
	import { scale, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import BenefitBadge from './BenefitBadge.svelte';
	
	interface CartItemProps {
		item: CartItem;
		estimatedDays?: number;
		shippingMode?: 'express' | 'grouped';
		onUpdateQuantity: (quantity: number) => void;
		onRemove: () => void;
	}
	
	let { item, estimatedDays, shippingMode, onUpdateQuantity, onRemove }: CartItemProps = $props();
	
	// Validações
	if (!item || !item.product) {
		throw new Error('CartItem: item e item.product são obrigatórios');
	}
	
	// Usar $derived para garantir reatividade
	const currentQuantity = $derived(item.quantity);
	
	const hasLowStock = $derived(
		item.product.stock !== undefined && 
		item.product.stock > 0 && 
		item.product.stock <= 5
	);
	
	// Verificar se pode aumentar quantidade
	const canIncreaseQuantity = $derived(
		!item.product.stock || currentQuantity < item.product.stock
	);
	
	// Verificar se pode diminuir quantidade
	const canDecreaseQuantity = $derived(currentQuantity > 1);
	
	// Verificar se tem frete grátis no produto
	const hasFreeShipping = $derived(
		item.individualShipping?.price === 0
	);
	
	// Calcular desconto do produto se houver cupom aplicado
	const productDiscount = $derived(() => {
		if (!item.appliedCoupon) return 0;
		
		const itemTotal = item.product.price * currentQuantity;
		if (item.appliedCoupon.type === 'percentage') {
			return itemTotal * (item.appliedCoupon.value / 100);
		} else {
			return Math.min(item.appliedCoupon.value, itemTotal);
		}
	});
	
	// Propriedades extras do produto (simuladas por enquanto)
	const productCashback = $derived(0); // Por enquanto sem cashback
	const productPoints = $derived(Math.floor(item.product.price * 0.1)); // 10% do valor em pontos
	
	// Calcular desconto percentual se houver diferença de preço
	const discountPercentage = $derived(() => {
		const original = (item.product as any).original_price;
		if (original && original > item.product.price) {
			return Math.round(((original - item.product.price) / original) * 100);
		}
		return 0;
	});
	
	let imageLoaded = $state(false);
	let removing = $state(false);
	let shouldRender = $state(true);
	let imageError = $state(false);
	let showConfirmModal = $state(false);
	
	function handleRemoveClick(e: MouseEvent) {
		e.stopPropagation();
		showConfirmModal = true;
	}
	
	async function confirmRemove() {
		removing = true;
		showConfirmModal = false;
		// Pequeno delay para a animação
		setTimeout(() => {
			shouldRender = false;
			onRemove();
		}, 200);
	}
	
	function cancelRemove() {
		showConfirmModal = false;
	}
	
	function handleImageError() {
		imageError = true;
		imageLoaded = true;
	}
	
	function handleQuantityChange(newQuantity: number) {
		// Validar quantidade mínima
		if (newQuantity < 1) {
			// Se for 0, mostrar modal de confirmação
			if (newQuantity === 0) {
				showConfirmModal = true;
			}
			return;
		}
		
		// Validar estoque máximo se disponível
		if (item.product.stock !== undefined && item.product.stock !== null && newQuantity > item.product.stock) {
			// Limitar ao estoque disponível
			onUpdateQuantity(item.product.stock);
			// TODO: Mostrar notificação de estoque limitado
			return;
		}
		
		// Atualizar quantidade
		onUpdateQuantity(newQuantity);
	}
</script>

{#if shouldRender}
<div 
	class="flex gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-gray-100 last:border-0 last:pb-0 transition-all duration-300 hover:bg-gray-50/50 p-2 sm:p-3 -m-2 sm:-m-3 rounded-lg relative isolate {removing ? 'opacity-0 scale-95' : ''}"
>
	<!-- Product Image com loading state -->
	<div class="relative flex-shrink-0 group z-0 overflow-visible">
		{#if !imageLoaded}
			<div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg animate-pulse"></div>
		{/if}
		<img 
			src={imageError ? '/api/placeholder/80/80' : (item.product.images?.[0] || '/api/placeholder/80/80')} 
			alt={item.product.name}
			class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg transition-all duration-300 group-hover:scale-105 {imageLoaded ? '' : 'opacity-0 absolute'}"
			onload={() => imageLoaded = true}
			onerror={handleImageError}
		/>
		{#if discountPercentage() > 0}
			<span 
				class="absolute -top-1 -left-1 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm"
				transition:scale={{ duration: 300, delay: 100, easing: cubicOut }}
			>
				-{discountPercentage()}%
			</span>
		{/if}
	</div>
	
	<!-- Product Info -->
	<div class="flex-1 min-w-0 relative z-10">
		<h5 class="font-medium text-gray-900 text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-1.5 hover:text-[#00BFB3] transition-colors cursor-pointer">
			{item.product.name}
		</h5>
		
		<!-- Badges de benefícios do produto -->
		<div class="flex flex-wrap gap-1.5 mb-2">
			{#if hasFreeShipping}
				<BenefitBadge 
					type="free-shipping" 
					level="product"
					description="Este produto tem frete grátis"
				/>
			{/if}
			
			{#if item.appliedCoupon}
				<BenefitBadge 
					type="coupon" 
					level="product"
					value={item.appliedCoupon.value}
					description={item.appliedCoupon.description}
				/>
			{/if}
			
			{#if productCashback > 0}
				<BenefitBadge 
					type="cashback" 
					level="product"
					value={productCashback}
					description={`Ganhe ${productCashback}% de volta`}
				/>
			{/if}
			
			{#if productPoints > 0}
				<BenefitBadge 
					type="points" 
					level="product"
					value={productPoints}
					description={`Ganhe ${productPoints} pontos neste produto`}
				/>
			{/if}
		</div>
		
		<!-- Informações de entrega -->
		{#if estimatedDays}
			<div class="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-600 mb-1 sm:mb-1.5">
				<svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span class="truncate">
					{estimatedDays}d úteis
					{#if shippingMode === 'express'}
						<span class="text-[#00A89D] font-medium">(Entrega Expressa)</span>
					{:else}
						<span class="text-[#00A89D] font-medium">(Entrega Agrupada)</span>
					{/if}
				</span>
			</div>
		{/if}
		
		{#if item.selectedColor || item.selectedSize}
			<div class="flex items-center gap-2 text-xs text-gray-600 mb-2" transition:fade={{ duration: 200 }}>
				{#if item.selectedColor}
					<span class="flex items-center gap-1">
						<span 
							class="w-3 h-3 rounded-full border border-gray-300 transition-transform hover:scale-110" 
							style="background-color: {item.selectedColor}"
						></span>
						<span class="text-gray-500">{item.selectedColor}</span>
					</span>
				{/if}
				{#if item.selectedSize}
					<span class="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
						Tam: {item.selectedSize}
					</span>
				{/if}
			</div>
		{/if}
		
		<!-- Stock Alert com animação -->
		{#if hasLowStock}
			{#if item.product.stock === 1}
				<!-- Alerta especial para último item -->
				<div 
					class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] p-2 sm:p-3 rounded-lg text-white mb-1.5 sm:mb-2 relative overflow-hidden last-unit-alert shadow-lg z-50"
					transition:scale={{ duration: 300, easing: cubicOut }}
				>
					<!-- Efeito de brilho sutil -->
					<div class="absolute inset-0 shimmer-effect rounded-lg pointer-events-none"></div>
					
					<!-- Conteúdo -->
					<div class="relative z-10 flex items-center gap-1.5 sm:gap-3">
						<div class="flex-shrink-0 bg-white/20 p-1 sm:p-1.5 rounded-full">
							<svg class="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
							</svg>
						</div>
						<div class="flex-1 min-w-0 flex items-center gap-1.5 sm:block">
							<p class="font-bold text-[10px] sm:text-xs uppercase tracking-normal leading-relaxed">
								Última unidade!
							</p>
							<span class="bg-white/20 backdrop-blur-sm text-white px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border border-white/30 whitespace-nowrap sm:hidden">
								ÚNICA
							</span>
							<p class="text-[9px] sm:text-[10px] opacity-90 mt-0.5 leading-normal hidden sm:block">Garanta agora antes que acabe</p>
						</div>
						<div class="flex-shrink-0 hidden sm:block">
							<span class="bg-white/20 backdrop-blur-sm text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border border-white/30 whitespace-nowrap">
								ÚNICA
							</span>
						</div>
					</div>
				</div>
			{:else}
				<!-- Alerta padrão para estoque baixo -->
				<div 
					class="bg-[#00BFB3]/10 border border-[#00BFB3]/30 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2"
					transition:scale={{ duration: 300, easing: cubicOut }}
				>
					<svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00BFB3] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span class="text-[#00A89D] font-medium">
						{#if item.product.stock! <= 3}
							Últimas {item.product.stock} unidades
						{:else}
							Restam {item.product.stock} unidades
						{/if}
					</span>
				</div>
			{/if}
		{/if}
		
		<div class="flex items-center justify-between mt-auto">
			<!-- Quantity Controls -->
			<button
				class="quantity-control quantity-control--decrease"
				onclick={() => handleQuantityChange(Math.max(1, currentQuantity - 1))}
				aria-label="Diminuir quantidade"
				disabled={!canDecreaseQuantity}
				type="button"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
				</svg>
			</button>
			<span class="w-6 sm:w-8 text-center text-xs sm:text-sm font-semibold text-gray-900">
				{currentQuantity}
			</span>
			<button 
				onclick={(e) => {
					e.stopPropagation();
					handleQuantityChange(currentQuantity + 1);
				}}
				disabled={!canIncreaseQuantity}
				class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center bg-white rounded hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
				aria-label="Aumentar quantidade"
				title={!canIncreaseQuantity ? 'Estoque insuficiente' : ''}
			>
				<svg class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
			</button>
			
			<!-- Price com animação e descontos -->
			<div class="text-right">
				{#if (item.product as any).original_price && (item.product as any).original_price > item.product.price}
					<p class="text-[10px] sm:text-xs text-gray-500 line-through" transition:fade={{ duration: 200 }}>
						{formatCurrency((item.product as any).original_price * currentQuantity)}
					</p>
				{/if}
				<p class="text-sm sm:text-base font-bold text-[#00BFB3]">
					{formatCurrency((item.product.price * currentQuantity) - productDiscount())}
				</p>
				{#if productDiscount() > 0}
					<p class="text-[9px] sm:text-[10px] text-[#00BFB3] font-medium">
						-{formatCurrency(productDiscount())} desconto
					</p>
				{:else}
					<p class="text-[9px] sm:text-[10px] text-gray-600">
						{formatCurrency(item.product.price)}/un
					</p>
				{/if}
			</div>
		</div>
	</div>
	
	<!-- Remove Button com hover effect -->
	<button 
		onclick={handleRemoveClick}
		class="p-1.5 hover:bg-red-50 rounded-lg transition-all duration-200 group self-start hover:scale-110 active:scale-95"
		aria-label="Remover item"
	>
		<svg class="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
		</svg>
	</button>
</div>
{/if}

<!-- Modal de Confirmação -->
{#if showConfirmModal}
	<div 
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		onclick={cancelRemove}
		onkeydown={(e) => e.key === 'Escape' && cancelRemove()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="remove-modal-title"
		tabindex="-1"
	>
		<div 
			class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-4 sm:p-6 mx-4"
			transition:scale={{ duration: 300, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Ícone -->
			<div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
				<svg class="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</div>
			
			<!-- Conteúdo -->
			<h3 id="remove-modal-title" class="text-base sm:text-lg font-semibold text-gray-900 text-center mb-2">
				Remover produto?
			</h3>
			<p class="text-xs sm:text-sm text-gray-600 text-center mb-4 sm:mb-6 px-2">
				Tem certeza que deseja remover <strong class="text-gray-900 break-words">{item.product.name}</strong> do seu carrinho?
			</p>
			
			<!-- Ações -->
			<div class="flex gap-2 sm:gap-3">
				<button 
					onclick={cancelRemove}
					class="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
				>
					Cancelar
				</button>
				<button 
					onclick={confirmRemove}
					class="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
				>
					Remover
				</button>
			</div>
		</div>
	</div>
{/if}

<style>

	
	/* Animação especial para última unidade */
	@keyframes gentle-pulse {
		0% {
			transform: scale(1);
			box-shadow: 0 4px 6px -1px rgba(0, 191, 179, 0.1), 0 2px 4px -1px rgba(0, 191, 179, 0.06);
		}
		50% {
			transform: scale(1.01);
			box-shadow: 0 10px 15px -3px rgba(0, 191, 179, 0.2), 0 4px 6px -2px rgba(0, 191, 179, 0.1);
		}
		100% {
			transform: scale(1);
			box-shadow: 0 4px 6px -1px rgba(0, 191, 179, 0.1), 0 2px 4px -1px rgba(0, 191, 179, 0.06);
		}
	}
	
	/* Aplicar animação ao container de última unidade */
	:global(.last-unit-alert) {
		animation: gentle-pulse 3s ease-in-out infinite;
		position: relative !important;
		z-index: 50 !important;
	}
	
	/* Animação de brilho */
	@keyframes shimmer {
		0% {
			background-position: -200% center;
		}
		100% {
			background-position: 200% center;
		}
	}
	
	:global(.shimmer-effect) {
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgba(255, 255, 255, 0.4) 50%,
			transparent 100%
		);
		background-size: 200% 100%;
		animation: shimmer 3s linear infinite;
	}
</style> 