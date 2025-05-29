<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	import type { Product } from '@mktplace/shared-types';
	import { advancedCartStore } from '$lib/stores/advancedCartStore';
	import { wishlistStore } from '$lib/stores/wishlistStore';
	import { toastStore } from '$lib/stores/toastStore';
	import Rating from '$lib/components/ui/Rating.svelte';
	import { onMount } from 'svelte';
	
	// Props
	let { product }: { product: Product } = $props();
	
	// Constants
	const INSTALLMENTS = 12;
	const PIX_DISCOUNT = 0.95; // 5% de desconto
	const MATERIAL_TAGS = {
		COTTON: '100% ALGODÃO',
		MICROFIBER: 'MICROFIBRA',
		MDF: 'MDF'
	} as const;
	
	// Mock seller info (em produção viria do produto)
	const SELLER_INFO = {
		id: product.seller_id || 'seller-1',
		name: product.seller_name || 'Loja Principal'
	};
	
	// State
	let isFavorite = $state(wishlistStore.hasItem(product.id));
	let isAddingToCart = $state(false);
	let isOutOfStock = $state(product.stock === 0);
	
	// Carousel state
	let currentImageIndex = $state(0);
	let isHovering = $state(false);
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	let imagesLoaded = $state<boolean[]>([]);
	let carouselContainer: HTMLDivElement;
	
	// Get all product images
	const productImages = $derived(() => {
		if (product.images && product.images.length > 0) {
			return product.images;
		}
		return [product.image || '/api/placeholder/262/350'];
	});
	
	// Initialize images loaded state
	$effect(() => {
		const newLength = productImages().length;
		
		// Só atualizar se o tamanho mudou realmente
		if (!imagesLoaded || imagesLoaded.length !== newLength) {
			imagesLoaded = new Array(newLength).fill(false);
			if (newLength > 0) {
				imagesLoaded[0] = true; // First image is always loaded
			}
		}
	});
	
	// Computed values
	const discount = $derived(() => {
		if (product.discount) return product.discount;
		if (product.original_price && product.original_price > product.price) {
			return Math.round(((product.original_price - product.price) / product.original_price) * 100);
		}
		return 0;
	});
	
	const discountedPrice = $derived(() => {
		if (product.discount) {
			return product.price * (1 - product.discount / 100);
		}
		return product.price;
	});
	
	const installmentPrice = $derived(() => {
		return discountedPrice() / INSTALLMENTS;
	});
	
	const pixPrice = $derived(() => {
		return formatCurrency(product.price * PIX_DISCOUNT);
	});
	
	const materialTag = $derived(() => {
		if (!product.tags) return null;
		
		for (const [key, value] of Object.entries(MATERIAL_TAGS)) {
			if (product.tags.includes(value)) {
				return value;
			}
		}
		return null;
	});
	
	// Get main image
	const mainImage = $derived(() => {
		return product.image || (product.images && product.images[0]) || '/api/placeholder/262/350';
	});
	
	// Handler para erro de imagem
	let imageError = $state(false);
	
	function handleImageError() {
		imageError = true;
	}
	
	// Carousel handlers
	function goToImage(index: number) {
		if (index >= 0 && index < productImages().length) {
			currentImageIndex = index;
			// Preload next image
			if (index < productImages().length - 1 && !imagesLoaded[index + 1]) {
				preloadImage(index + 1);
			}
		}
	}
	
	function nextImage(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		goToImage((currentImageIndex + 1) % productImages().length);
	}
	
	function prevImage(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		goToImage((currentImageIndex - 1 + productImages().length) % productImages().length);
	}
	
	function preloadImage(index: number) {
		if (imagesLoaded[index]) return;
		
		const img = new Image();
		img.onload = () => {
			imagesLoaded[index] = true;
		};
		img.src = productImages()[index];
	}
	
	// Desktop hover auto-play
	let hoverInterval: ReturnType<typeof setInterval> | undefined;
	
	function startHoverAutoPlay() {
		if (productImages().length <= 1) return;
		
		isHovering = true;
		// Preload all images when hovering
		productImages().forEach((_, index) => {
			if (!imagesLoaded[index]) {
				preloadImage(index);
			}
		});
		
		hoverInterval = setInterval(() => {
			nextImage();
		}, 1500); // Change image every 1.5 seconds
	}
	
	function stopHoverAutoPlay() {
		isHovering = false;
		if (hoverInterval) {
			clearInterval(hoverInterval);
			hoverInterval = undefined;
		}
		// Reset to first image when hover ends
		currentImageIndex = 0;
	}
	
	// Touch handlers for mobile
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}
	
	function handleTouchMove(e: TouchEvent) {
		touchEndX = e.touches[0].clientX;
	}
	
	function handleTouchEnd() {
		if (!touchStartX || !touchEndX) return;
		
		const diff = touchStartX - touchEndX;
		const threshold = 50; // Minimum swipe distance
		
		if (Math.abs(diff) > threshold) {
			if (diff > 0) {
				// Swipe left - next image
				nextImage();
			} else {
				// Swipe right - previous image
				prevImage();
			}
		}
		
		// Reset values
		touchStartX = 0;
		touchEndX = 0;
	}
	
	// Handlers
	function handleToggleFavorite(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		
		const wasInWishlist = isFavorite;
		wishlistStore.toggleItem(product);
		isFavorite = !isFavorite;
		
		// Mostrar notificação
		if (wasInWishlist) {
			toastStore.info('Produto removido dos favoritos');
		} else {
			toastStore.success('Produto adicionado aos favoritos!');
		}
	}
	
	async function handleAddToCart(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		
		isAddingToCart = true;
		
		try {
			// Adicionar ao carrinho
			advancedCartStore.addItem(
				product,
				product.seller_id || 'seller-1',
				product.seller_name || 'Loja Exemplo',
				1
			);
			
			// Mostrar notificação simples
			toastStore.success('Produto adicionado ao carrinho!');
			
		} catch (error) {
			console.error('Erro ao adicionar produto:', error);
			toastStore.error('Erro ao adicionar produto ao carrinho');
		} finally {
			// Feedback visual
			setTimeout(() => {
				isAddingToCart = false;
			}, 1000);
		}
	}
	
	// Cleanup on unmount
	onMount(() => {
		return () => {
			if (hoverInterval) {
				clearInterval(hoverInterval);
			}
		};
	});
</script>

<article class="product-card {isOutOfStock ? 'product-card--out-of-stock' : ''}">
	<!-- Product Image Section -->
	<div 
		class="product-card__image-container"
		bind:this={carouselContainer}
		onmouseenter={startHoverAutoPlay}
		onmouseleave={stopHoverAutoPlay}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		role="img"
		aria-label="Galeria de imagens do produto {product.name}"
	>
		<!-- Discount Badge - No canto superior esquerdo -->
		{#if discount() > 0 && !isOutOfStock}
			<div class="discount-badge">
				<span class="discount-badge__value">{discount()}%</span>
				<span class="discount-badge__off">OFF</span>
			</div>
		{/if}
		
		<!-- Out of Stock Overlay -->
		{#if isOutOfStock}
			<div class="out-of-stock-overlay">
				<div class="out-of-stock-badge">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
					<span>Produto Indisponível</span>
				</div>
			</div>
		{/if}
		
		<!-- Material Badge -->
		{#if materialTag() && !isOutOfStock}
			<div class="material-badge" class:material-badge--with-discount={discount() > 0}>
				{materialTag()}
			</div>
		{/if}
		
		<!-- Favorite Button -->
		<button 
			class="favorite-button" 
			class:favorite-button--active={isFavorite}
			onclick={handleToggleFavorite}
			aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
			type="button"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
				<circle 
					cx="16" 
					cy="16" 
					r="15" 
					fill={isFavorite ? '#00BFB3' : 'white'} 
					stroke={isFavorite ? '#00BFB3' : '#E0E0E0'} 
					stroke-width="1"
				/>
				<path 
					d="M13.5 11C14.2 11 14.95 11.35 15.75 12C17.35 10.75 19.5 10.8 20.8 12.1C21.5 12.8 21.9 13.75 21.9 14.75C21.9 15.75 21.5 16.7 20.8 17.4L20.8 17.4L17 21C16.65 21.3 16.2 21.5 15.75 21.5C15.3 21.5 14.85 21.3 14.5 21L10.7 17.4L10.7 17.4C10.15 16.85 9.8 16.15 9.65 15.35C9.5 14.55 9.6 13.7 9.9 13C10.2 12.3 10.7 11.7 11.35 11.3C12 10.9 12.75 10.7 13.5 11Z" 
					fill={isFavorite ? 'white' : '#E0E0E0'}
				/>
			</svg>
		</button>
		
		<!-- Product Images Carousel -->
		<a href="/produto/{product.slug}" class="product-card__image-link">
			<div class="carousel-container">
				{#each productImages() as image, index}
					<img 
						src={index === 0 || imagesLoaded[index] ? image : '/api/placeholder/262/350'} 
						alt="{product.name} - Imagem {index + 1}"
						loading={index === 0 ? 'eager' : 'lazy'}
						class="product-card__image {currentImageIndex === index ? 'product-card__image--active' : ''}"
						onerror={handleImageError}
					/>
				{/each}
			</div>
		</a>
		
		<!-- Carousel Indicators -->
		{#if productImages().length > 1}
			<!-- Progress Bar for Mobile -->
			<div class="carousel-progress">
				{#each productImages() as _, index}
					<div 
						class="progress-segment {currentImageIndex === index ? 'progress-segment--active' : ''}"
						onclick={(e) => { e.preventDefault(); e.stopPropagation(); goToImage(index); }}
						role="button"
						tabindex="0"
						aria-label="Ir para imagem {index + 1}"
					></div>
				{/each}
			</div>
			
			<!-- Dots for Desktop -->
			<div class="carousel-dots">
				{#each productImages() as _, index}
					<button 
						class="carousel-dot {currentImageIndex === index ? 'carousel-dot--active' : ''}"
						onclick={(e) => { e.preventDefault(); e.stopPropagation(); goToImage(index); }}
						aria-label="Ir para imagem {index + 1}"
						type="button"
					></button>
				{/each}
			</div>
		{/if}
	</div>
	
	<!-- Product Information -->
	<div class="product-card__info">
		<!-- Pieces Count -->
		{#if product.pieces}
			<p class="product-card__pieces">{product.pieces} peças</p>
		{/if}
		
		<!-- Product Name -->
		<h3 class="product-card__title">
			<a href="/produto/{product.slug}">
				{product.name}
			</a>
		</h3>
		
		<!-- SKU Reference -->
		{#if product.sku}
			<p class="product-card__sku">Ref: {product.sku}</p>
		{/if}
		
		<!-- Rating and Sales -->
		{#if product.rating || product.sold_count}
			<div class="product-card__stats">
				{#if product.rating}
					<Rating 
						rating={product.rating} 
						size="sm" 
						reviewsCount={product.reviews_count}
					/>
				{/if}
				
				{#if product.sold_count && product.sold_count > 50}
					<span class="sold-count">{product.sold_count}+ vendidos</span>
				{/if}
			</div>
		{/if}
		
		<!-- Pricing Section -->
		<div class="product-card__pricing">
			{#if product.original_price && product.original_price > product.price}
				<p class="product-card__price-original">
					de {formatCurrency(product.original_price)}
				</p>
			{/if}
			
			<div class="product-card__price-installment">
				<span class="product-card__price-label">por</span>
				<span class="product-card__price-count">{INSTALLMENTS}x</span>
				<span class="product-card__price-label">de</span>
				<span class="product-card__price-value">{formatCurrency(installmentPrice())}</span>
			</div>
			
			<p class="product-card__price-pix">
				<strong>{pixPrice()}</strong> no pix ou boleto
			</p>
		</div>
		
		<!-- Bottom Badges -->
		<div class="product-card__badges">
			{#if product.is_black_friday}
				<div class="badge badge--black-friday">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
						<circle cx="8" cy="8" r="8" fill="#5A5A5A"/>
						<circle cx="8" cy="8" r="6" fill="white"/>
						<circle cx="8" cy="8" r="4" fill="#5A5A5A"/>
					</svg>
					<span>Black Friday</span>
				</div>
			{/if}
			
			{#if product.has_fast_delivery !== false}
			<div class="badge badge--delivery">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M8.50446 6.40097C8.44526 6.29319 8.33418 6.2249 8.21202 6.22119L5.23016 6.13067L6.57478 2.43905C6.61296 2.33376 6.5986 2.21623 6.53629 2.12333C6.47399 2.03031 6.37116 1.97315 6.25989 1.96965L2.79821 1.86457C2.64532 1.86005 2.50773 1.95706 2.45939 2.10333L0.173823 9.0212L0.173819 9.02132C0.139141 9.1259 0.155541 9.24103 0.218155 9.33159C0.280886 9.42204 0.382373 9.47741 0.491797 9.48062L3.60749 9.57519L3.472 14.1127C3.46712 14.2723 3.57018 14.4149 3.72235 14.4589C3.87453 14.503 4.03693 14.4373 4.11681 14.2995L8.50035 6.74639C8.56246 6.64019 8.56407 6.50864 8.50452 6.40085L8.50446 6.40097Z" fill="#FF8403"/>
				</svg>
				<span>Chega rapidinho</span>
			</div>
			{/if}
		</div>
		
		<!-- Add to Cart Button -->
		<button 
			class="add-to-cart-button {isAddingToCart ? 'add-to-cart-button--loading' : ''} {isOutOfStock ? 'add-to-cart-button--disabled' : ''}"
			onclick={handleAddToCart}
			disabled={isAddingToCart || isOutOfStock}
			type="button"
			aria-label={isOutOfStock ? 'Produto indisponível' : 'Adicionar ao carrinho'}
		>
			{#if isOutOfStock}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="15" y1="9" x2="9" y2="15"></line>
					<line x1="9" y1="9" x2="15" y2="15"></line>
				</svg>
				<span>Indisponível</span>
			{:else if isAddingToCart}
				<svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
					<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
					<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
				</svg>
				<span>Adicionando...</span>
			{:else}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
				</svg>
				<span>Adicionar ao Carrinho</span>
			{/if}
		</button>
	</div>
</article>

<style>
	/* ===== Base Card Styles ===== */
	.product-card {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: transparent;
		position: relative;
	}
	
	.product-card--out-of-stock {
		opacity: 0.8;
	}
	
	/* ===== Discount Badge ===== */
	.discount-badge {
		position: absolute;
		top: 12px;
		left: 12px;
		background: #00BFB3;
		color: white;
		padding: 6px 10px;
		border-radius: 6px;
		font-family: 'Lato', sans-serif;
		font-weight: 700;
		line-height: 1;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 4px;
		box-shadow: 0 2px 8px rgba(0, 191, 179, 0.15);
	}
	
	.discount-badge__value {
		font-size: 18px;
		font-weight: 900;
	}
	
	.discount-badge__off {
		font-size: 12px;
		font-weight: 700;
		opacity: 0.9;
	}
	
	/* ===== Image Container ===== */
	.product-card__image-container {
		position: relative;
		width: 100%;
		aspect-ratio: 1 / 1;
		overflow: hidden;
		border-radius: 12px;
		background: #F5F5F5;
		margin-bottom: 12px;
	}
	
	.product-card__image-link {
		display: block;
		width: 100%;
		height: 100%;
	}
	
	/* ===== Carousel Styles ===== */
	.carousel-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	
	.product-card__image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition: opacity 0.3s ease;
	}
	
	.product-card__image--active {
		opacity: 1;
	}
	
	/* Progress Bar Indicator */
	.carousel-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(0, 0, 0, 0.1);
		display: flex;
		z-index: 2;
	}
	
	.progress-segment {
		flex: 1;
		height: 100%;
		background: transparent;
		cursor: pointer;
		position: relative;
		transition: background 0.3s ease;
	}
	
	.progress-segment::after {
		content: '';
		position: absolute;
		top: -10px;
		bottom: -10px;
		left: 0;
		right: 0;
	}
	
	.progress-segment--active {
		background: #00BFB3;
	}
	
	.progress-segment:hover:not(.progress-segment--active) {
		background: rgba(0, 191, 179, 0.3);
	}
	
	/* Alternative: Dots for Desktop */
	@media (min-width: 768px) {
		.carousel-progress {
			display: none;
		}
		
		.carousel-dots {
			position: absolute;
			bottom: 8px;
			left: 50%;
			transform: translateX(-50%);
			display: flex;
			gap: 4px;
			z-index: 2;
			padding: 4px 8px;
			background: rgba(255, 255, 255, 0.9);
			border-radius: 12px;
			backdrop-filter: blur(8px);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		}
		
		.carousel-dot {
			width: 6px;
			height: 6px;
			border-radius: 50%;
			background: #E0E0E0;
			border: none;
			cursor: pointer;
			transition: all 0.2s ease;
			padding: 0;
		}
		
		.carousel-dot--active {
			background: #00BFB3;
			width: 16px;
			border-radius: 3px;
		}
		
		.carousel-dot:hover:not(.carousel-dot--active) {
			background: #00BFB3;
			opacity: 0.5;
		}
	}
	
	/* Mobile optimizations */
	@media (max-width: 767px) {
		.carousel-progress {
			height: 4px;
		}
		
		.carousel-dots {
			display: none;
		}
	}
	
	/* Touch feedback */
	@media (hover: none) {
		.product-card__image-container {
			touch-action: pan-y pinch-zoom;
		}
	}
	
	/* Hover effects on desktop */
	@media (hover: hover) {
		.product-card:hover .product-card__image--active {
			transform: scale(1.05);
			transition: transform 0.3s ease;
		}
	}
	
	/* ===== Material Badge ===== */
	.material-badge {
		position: absolute;
		top: 12px;
		left: 12px;
		width: auto;
		min-width: 84.737px;
		height: 26px;
		padding: 0 12px;
		flex-shrink: 0;
		background: #00BFB3;
		border-radius: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
		color: #FFF;
		font-family: 'Lato', sans-serif;
		font-size: 11px;
		font-style: normal;
		font-weight: 600;
		line-height: 100%;
		font-feature-settings: 'swsh' on;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.material-badge--with-discount {
		top: 50px; /* Abaixo do badge de desconto */
	}
	
	/* ===== Favorite Button ===== */
	.favorite-button {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		background: transparent;
		border: none;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 3;
	}
	
	.favorite-button:hover {
		transform: scale(1.1);
		transition: transform 0.2s ease;
	}
	
	.favorite-button svg {
		width: 32px;
		height: 32px;
	}
	
	.favorite-button--active {
		animation: heartBeat 0.3s ease;
	}
	
	@keyframes heartBeat {
		0% { transform: scale(1); }
		50% { transform: scale(1.2); }
		100% { transform: scale(1); }
	}
	
	/* ===== Product Information ===== */
	.product-card__info {
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: transparent;
		flex: 1; /* Faz a seção crescer para ocupar o espaço disponível */
	}
	
	.product-card__pieces {
		width: auto;
		height: auto;
		flex-shrink: 0;
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 15px;
		font-style: normal;
		font-weight: 600;
		line-height: 1.4;
		margin: 0 0 4px 0;
	}
	
	.product-card__title {
		width: 100%;
		height: 44px; /* Altura fixa para 2 linhas */
		flex-shrink: 0;
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 15px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.4;
		margin: 0 0 6px 0;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.product-card__title a {
		color: inherit;
		text-decoration: none;
	}
	
	.product-card__title a:hover {
		color: var(--cyan600);
		transition: color 0.2s ease;
	}
	
	.product-card__sku {
		width: auto;
		height: auto;
		flex-shrink: 0;
		color: #818181;
		font-family: 'Lato', sans-serif;
		font-size: 13px;
		font-style: normal;
		font-weight: 500;
		line-height: 1.4;
		letter-spacing: 0.24px;
		margin: 0 0 8px 0;
	}
	
	/* ===== Pricing Section ===== */
	.product-card__pricing {
		margin: 8px 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	
	.product-card__price-original {
		width: auto;
		height: auto;
		flex-shrink: 0;
		color: #818181;
		font-family: 'Lato', sans-serif;
		font-size: 13px;
		font-style: normal;
		font-weight: 700;
		line-height: 1.4;
		letter-spacing: 0.22px;
		text-decoration-line: line-through;
		margin: 0;
	}
	
	.product-card__price-installment {
		width: auto;
		height: auto;
		flex-shrink: 0;
		display: flex;
		align-items: baseline;
		gap: 5px;
		margin: 0;
	}
	
	.product-card__price-label {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 16px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.4;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-count {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 16px;
		font-style: normal;
		font-weight: 900;
		line-height: 1.4;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-value {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 16px;
		font-style: normal;
		font-weight: 900;
		line-height: 1.4;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-pix {
		width: auto;
		height: auto;
		flex-shrink: 0;
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 16px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.4;
		letter-spacing: 0.28px;
		margin: 0;
	}
	
	.product-card__price-pix strong {
		font-weight: 900;
		color: #00BFB3;
	}
	
	/* ===== Bottom Badges ===== */
	.product-card__badges {
		display: flex;
		gap: 8px;
		margin-top: 12px;
		flex-wrap: wrap;
	}
	
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px;
		border-radius: 5px;
		font-family: 'Lato', sans-serif;
		font-size: 12px;
		font-weight: 600;
		height: 24px;
		transition: all 0.2s ease;
	}
	
	.badge:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}
	
	.badge svg {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}
	
	.badge--black-friday {
		background: #2C1D1D;
		color: white;
	}
	
	.badge--delivery {
		background: #FBE7D1;
		color: #E07709;
	}
	
	.badge--delivery span {
		color: #E07709;
	}
	
	/* ===== Stats Section ===== */
	.product-card__stats {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 4px 0;
		flex-wrap: wrap;
	}
	
	.sold-count {
		font-family: 'Lato', sans-serif;
		font-size: 12px;
		color: #666;
		background: #F5F5F5;
		padding: 2px 8px;
		border-radius: 12px;
	}
	
	/* ===== Responsive Design ===== */
	@media (max-width: 768px) {
		.product-card {
			width: 100%;
		}
		
		.product-card__image-container {
			width: 100%;
			height: auto;
			aspect-ratio: 1 / 1;
		}
		
		.product-card__title {
			font-size: 14px;
		}
		
		.product-card__price-label,
		.product-card__price-count,
		.product-card__price-value,
		.product-card__price-pix {
			font-size: 15px;
		}
	}
	
	/* ===== Add to Cart Button ===== */
	.add-to-cart-button {
		width: 100%;
		height: 48px;
		padding: 0 16px;
		background: #00BFB3;
		border: none;
		border-radius: 8px;
		color: white;
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: auto;
	}
	
	.add-to-cart-button:hover:not(:disabled) {
		background: #00A89D;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 191, 179, 0.3);
		transition: all 0.2s ease;
	}
	
	.add-to-cart-button:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 2px 4px rgba(0, 191, 179, 0.3);
	}
	
	.add-to-cart-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
	
	.add-to-cart-button--disabled {
		background: #E0E0E0;
		color: #666;
		cursor: not-allowed;
	}
	
	.add-to-cart-button--disabled:hover {
		background: #E0E0E0;
		transform: none;
		box-shadow: none;
	}
	
	.add-to-cart-button svg {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}
	
	.add-to-cart-button--loading .spinner {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	/* ===== Out of Stock Overlay ===== */
	.out-of-stock-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		border-radius: 12px;
	}
	
	.out-of-stock-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 20px;
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.out-of-stock-badge svg {
		color: #666;
	}
	
	.out-of-stock-badge span {
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: #666;
		text-align: center;
	}
</style> 