<script lang="ts">
	import { formatCurrency } from '$lib/utils';
	import { cartStore } from '$lib/stores/cartStore';
	import { wishlistStore } from '$lib/stores/wishlistStore';
	import { toastStore } from '$lib/stores/toastStore';
	import Rating from '$lib/components/ui/Rating.svelte';
	
	// Props tipadas adequadamente
	interface Props {
		product: {
			id: string;
			name: string;
			slug: string;
			price: number;
			original_price?: number;
			discount?: number;
			image?: string;
			images?: string[];
			stock?: number;
			sku?: string;
			pieces?: number;
			rating?: number;
			reviews_count?: number;
			sold_count?: number;
			tags?: string[];
			seller_id?: string;
			seller_name?: string;
			is_black_friday?: boolean;
			has_fast_delivery?: boolean;
		};
		showQuickAdd?: boolean;
		compact?: boolean;
		lazy?: boolean;
	}
	
	let { 
		product,
		showQuickAdd = true,
		compact = false,
		lazy = true
	}: Props = $props();
	
	// Configuração
	const INSTALLMENTS = 5;
	const PIX_DISCOUNT = 0.95; // 5% desconto PIX
	
	// Estados reativos otimizados
	let isFavorite = $state(false);
	let isAddingToCart = $state(false);
	let currentImageIndex = $state(0);
	let isHovering = $state(false);
	let imageLoadError = $state(false);
	
	// Computeds otimizados
	const isOutOfStock = $derived(() => product.stock === 0);
	
	const discount = $derived(() => {
		if (product.discount) return product.discount;
		if (product.original_price && product.original_price > product.price) {
			return Math.round(((product.original_price - product.price) / product.original_price) * 100);
		}
		return 0;
	});
	
	const finalPrice = $derived(() => {
		const basePrice = product.price;
		return product.discount ? basePrice * (1 - product.discount / 100) : basePrice;
	});
	
	const installmentPrice = $derived(() => finalPrice() / INSTALLMENTS);
	const pixPrice = $derived(() => finalPrice() * PIX_DISCOUNT);
	
	const productImages = $derived(() => {
		if (product.images?.length) return product.images;
		return [product.image || '/api/placeholder/300/400?text=Produto'];
	});
	
	const mainImage = $derived(() => productImages()[currentImageIndex] || productImages()[0]);
	
	const materialTag = $derived(() => {
		const materialTags = ['100% ALGODÃO', 'MICROFIBRA', 'MDF'];
		return product.tags?.find(tag => materialTags.includes(tag));
	});
	
	// Handlers otimizados
	async function handleToggleFavorite() {
		try {
			wishlistStore.toggleItem(product);
			isFavorite = !isFavorite;
			
			const message = isFavorite 
				? 'Produto adicionado aos favoritos!' 
				: 'Produto removido dos favoritos';
			toastStore.success(message);
		} catch (error) {
			toastStore.error('Erro ao atualizar favoritos');
		}
	}
	
	async function handleAddToCart() {
		if (isAddingToCart || isOutOfStock()) return;
		
		isAddingToCart = true;
		
		try {
			cartStore.addItem(
				product,
				product.seller_id || 'default-seller',
				product.seller_name || 'Loja',
				1
			);
			
			toastStore.success('Produto adicionado ao carrinho!');
		} catch (error) {
			console.error('Erro ao adicionar ao carrinho:', error);
			toastStore.error('Erro ao adicionar produto');
		} finally {
			setTimeout(() => { isAddingToCart = false; }, 800);
		}
	}
	
	function handleImageChange(index: number) {
		if (index >= 0 && index < productImages().length) {
			currentImageIndex = index;
		}
	}
	
	function handleImageError() {
		imageLoadError = true;
	}
	
	// Auto-carousel no hover (apenas desktop)
	let hoverInterval: ReturnType<typeof setInterval> | undefined;
	
	function startAutoPlay() {
		if (productImages().length <= 1 || window.innerWidth < 768) return;
		
		isHovering = true;
		hoverInterval = setInterval(() => {
			currentImageIndex = (currentImageIndex + 1) % productImages().length;
		}, 1500);
	}
	
	function stopAutoPlay() {
		isHovering = false;
		if (hoverInterval) {
			clearInterval(hoverInterval);
			hoverInterval = undefined;
		}
		currentImageIndex = 0;
	}
	
	// Inicializar estado do wishlist
	$effect(() => {
		isFavorite = wishlistStore.hasItem(product.id);
	});
	
	// Cleanup
	$effect(() => {
		return () => {
			if (hoverInterval) clearInterval(hoverInterval);
		};
	});
</script>

<article class="product-card" class:compact class:out-of-stock={isOutOfStock()}>
	<!-- Imagem do produto -->
	<div 
		class="image-container"
		role="img"
		aria-label="Imagens do produto {product.name}"
		onmouseenter={startAutoPlay}
		onmouseleave={stopAutoPlay}
	>
		<!-- Badges superiores -->
		{#if discount() > 0 && !isOutOfStock()}
			<div class="badge badge--discount">
				{discount()}% OFF
			</div>
		{/if}
		
		{#if materialTag()}
			<div class="badge badge--material" class:with-discount={discount() > 0}>
				{materialTag()}
			</div>
		{/if}
		
		{#if isOutOfStock()}
			<div class="overlay overlay--out-of-stock">
				<span>Indisponível</span>
			</div>
		{/if}
		
		<!-- Botão de favorito -->
		<button 
			class="favorite-btn"
			class:active={isFavorite}
			onclick={handleToggleFavorite}
			aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
		>
			{#if isFavorite}
				<!-- Coração preenchido quando favoritado -->
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
					<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
				</svg>
			{:else}
				<!-- Coração outline quando não favoritado -->
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
				</svg>
			{/if}
		</button>
		
		<!-- Imagem principal -->
		<a href="/produto/{product.slug}" class="image-link">
			{#if lazy}
				<img 
					src={product.images?.[0] || '/placeholder.jpg'}
					alt={product.name}
					class="w-full h-full object-cover"
					loading="lazy"
					onerror={handleImageError}
				/>
			{:else}
				<img 
					src={mainImage()}
					alt={product.name}
					class="product-image"
					loading="lazy"
					onerror={handleImageError}
				/>
			{/if}
		</a>
		
		<!-- Indicadores de carrossel -->
		{#if productImages().length > 1}
			<div class="carousel-indicators">
				{#each productImages() as _, index}
					<button 
						class="indicator"
						class:active={currentImageIndex === index}
						onclick={() => handleImageChange(index)}
						aria-label="Ver imagem {index + 1}"
					></button>
				{/each}
			</div>
		{/if}
	</div>
	
	<!-- Informações do produto -->
	<div class="product-info">
		{#if product.pieces}
			<p class="pieces">{product.pieces} peças</p>
		{/if}
		
		<h3 class="title">
			<a href="/produto/{product.slug}">{product.name}</a>
		</h3>
		
		{#if product.sku && !compact}
			<p class="sku">Ref: {product.sku}</p>
		{/if}
		
		<!-- Avaliação e vendas -->
		{#if (product.rating || product.sold_count) && !compact}
			<div class="stats">
				{#if product.rating}
					<Rating rating={product.rating} size="sm" reviewsCount={product.reviews_count} />
				{/if}
				
				{#if product.sold_count && product.sold_count > 50}
					<span class="sold-count">{product.sold_count}+ vendidos</span>
				{/if}
			</div>
		{/if}
		
		<!-- Preços -->
		<div class="pricing">
			<!-- Preço PIX (principal e destacado) -->
			<p class="pix-price">
				<strong>{formatCurrency(pixPrice())}</strong> 
				<span class="pix-label">no pix ou boleto</span>
			</p>
			
			<!-- Preço original riscado -->
			{#if product.original_price && product.original_price > product.price}
				<p class="original-price">de {formatCurrency(product.original_price)}</p>
			{/if}
			
			<!-- Parcelamento -->
			<div class="installment-price">
				<span class="label">ou</span>
				<span class="count">{INSTALLMENTS}x</span>
				<span class="label">de</span>
				<span class="value">{formatCurrency(installmentPrice())}</span>
			</div>
		</div>
		
		<!-- Badges inferiores -->
		{#if !compact && (product.is_black_friday || product.has_fast_delivery)}
			<div class="bottom-badges">
				{#if product.is_black_friday}
					<div class="badge badge--black-friday">Black Friday</div>
				{/if}
				
				{#if product.has_fast_delivery}
					<div class="badge badge--delivery">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
						</svg>
						Entrega rápida
					</div>
				{/if}
			</div>
		{/if}
		
		<!-- Botão de adicionar ao carrinho -->
		{#if showQuickAdd}
			<button 
				class="add-to-cart-btn"
				class:loading={isAddingToCart}
				class:disabled={isOutOfStock()}
				onclick={handleAddToCart}
				disabled={isAddingToCart || isOutOfStock()}
			>
				{#if isOutOfStock()}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<line x1="15" y1="9" x2="9" y2="15"/>
						<line x1="9" y1="9" x2="15" y2="15"/>
					</svg>
					Indisponível
				{:else if isAddingToCart}
					<svg class="spinner" width="16" height="16" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25"/>
						<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
					</svg>
					Adicionando...
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
					</svg>
					Adicionar
				{/if}
			</button>
		{/if}
	</div>
</article>

<style>
	.product-card {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: white;
		border-radius: 8px;
		transition: all 0.2s ease;
		position: relative;
	}
	
	.product-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	}
	
	.product-card.compact {
		border-radius: 6px;
	}
	
	.product-card.out-of-stock {
		opacity: 0.7;
	}
	
	/* Container da imagem */
	.image-container {
		position: relative;
		aspect-ratio: 3/4;
		border-radius: 8px 8px 0 0;
		overflow: hidden;
		background: #f8f9fa;
	}
	
	.compact .image-container {
		border-radius: 6px 6px 0 0;
	}
	
	.image-link {
		display: block;
		width: 100%;
		height: 100%;
	}
	
	.product-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}
	
	.image-container:hover .product-image {
		transform: scale(1.05);
	}
	
	/* Badges */
	.badge {
		position: absolute;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 5px 10px;
		border-radius: 12px;
		z-index: 2;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	
	.badge--discount {
		top: 8px;
		left: 8px;
		background: #ff4444;
		font-weight: 800;
	}
	
	.badge--material {
		top: 8px;
		right: 8px;
		background: #00bfb3;
		font-size: 0.65rem;
	}
	
	.badge--material.with-discount {
		top: 40px;
	}
	
	.badge--black-friday {
		background: #1a1a1a;
	}
	
	.badge--delivery {
		background: #ff8403;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	
	/* Overlay */
	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 3;
		border-radius: 8px 8px 0 0;
	}
	
	.overlay--out-of-stock {
		background: rgba(0, 0, 0, 0.7);
		color: white;
		font-weight: 600;
	}
	
	/* Botão favorito */
	.favorite-btn {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		z-index: 4;
		color: #666;
	}
	
	.favorite-btn:hover {
		background: white;
		transform: scale(1.1);
	}
	
	.favorite-btn.active {
		background: #ff4444;
		color: white;
	}
	
	/* Indicadores do carrossel */
	.carousel-indicators {
		position: absolute;
		bottom: 8px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 4px;
		z-index: 2;
	}
	
	.indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.indicator.active {
		background: white;
		transform: scale(1.2);
	}
	
	/* Informações do produto */
	.product-info {
		padding: 12px;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	
	.compact .product-info {
		padding: 10px;
		gap: 4px;
	}
	
	.pieces {
		color: #666;
		font-size: 0.75rem;
		margin: 0;
	}
	
	.title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.3;
	}
	
	.title a {
		color: #333;
		text-decoration: none;
	}
	
	.title a:hover {
		color: #00bfb3;
	}
	
	.sku {
		color: #666;
		font-size: 0.75rem;
		margin: 0;
	}
	
	.stats {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.75rem;
	}
	
	.sold-count {
		color: #666;
	}
	
	/* Preços */
	.pricing {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	
	/* Preço PIX (principal e destacado) */
	.pix-price {
		font-size: 1.1rem;
		color: #00bfb3;
		margin: 0;
		font-weight: 400;
		line-height: 1.2;
	}
	
	.pix-price strong {
		font-weight: 800;
		font-size: 1.15rem;
	}
	
	.pix-label {
		font-size: 0.8rem;
		font-weight: 400;
		color: #00a89d;
	}
	
	/* Preço original riscado */
	.original-price {
		color: #999;
		font-size: 0.8rem;
		text-decoration: line-through;
		margin: 0;
		font-weight: 400;
	}
	
	/* Parcelamento (menor hierarquia) */
	.installment-price {
		font-size: 0.8rem;
		color: #666;
		margin: 0;
		font-weight: 400;
	}
	
	.installment-price .label {
		color: #999;
	}
	
	.installment-price .count,
	.installment-price .value {
		font-weight: 600;
		color: #333;
	}
	
	/* Badges inferiores */
	.bottom-badges {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: 8px;
	}
	
	.bottom-badges .badge {
		position: static;
		font-size: 0.65rem;
		padding: 2px 6px;
	}
	
	/* Botão adicionar ao carrinho */
	.add-to-cart-btn {
		width: 100%;
		padding: 10px;
		border: none;
		border-radius: 6px;
		background: #00bfb3;
		color: white;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin-top: 12px;
	}
	
	.compact .add-to-cart-btn {
		padding: 8px;
		font-size: 0.8rem;
		margin-top: 8px;
	}
	
	.add-to-cart-btn:hover:not(.disabled) {
		background: #00a89d;
		transform: translateY(-1px);
	}
	
	.add-to-cart-btn.loading {
		background: #666;
		cursor: not-allowed;
	}
	
	.add-to-cart-btn.disabled {
		background: #ccc;
		cursor: not-allowed;
	}
	
	.spinner {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	/* Responsivo */
	@media (max-width: 768px) {
		.product-card {
			border-radius: 6px;
		}
		
		.image-container {
			border-radius: 6px 6px 0 0;
		}
		
		.product-info {
			padding: 12px;
		}
		
		.title {
			font-size: 0.85rem;
		}
		
		.carousel-indicators {
			display: none;
		}
	}
</style> 