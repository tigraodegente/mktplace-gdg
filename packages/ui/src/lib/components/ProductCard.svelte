<script lang="ts">
	import type { Product } from '@mktplace/shared-types';
	import { formatCurrency } from '@mktplace/utils';
	
	// Props
	interface Props {
		product: Product;
		variant?: 'store' | 'admin' | 'seller';
		showFavorite?: boolean;
		showRating?: boolean;
		showSoldCount?: boolean;
		showBadges?: boolean;
		showInstallments?: boolean;
		showPixPrice?: boolean;
		showSku?: boolean;
		onFavoriteToggle?: (product: Product, isFavorite: boolean) => void;
		onProductClick?: (product: Product) => void;
		class?: string;
	}
	
	let { 
		product,
		variant = 'store',
		showFavorite = true,
		showRating = true,
		showSoldCount = true,
		showBadges = true,
		showInstallments = true,
		showPixPrice = true,
		showSku = true,
		onFavoriteToggle,
		onProductClick,
		class: className = ''
	}: Props = $props();
	
	// Constants
	const INSTALLMENTS = 12;
	const PIX_DISCOUNT = 0.95; // 5% de desconto
	
	// State
	let isFavorite = $state(false);
	
	// Computed values
	const discount = $derived(() => {
		if (product.discount) return product.discount;
		if (product.original_price && product.original_price > product.price) {
			return Math.round(((product.original_price - product.price) / product.original_price) * 100);
		}
		return 0;
	});
	
	const installmentPrice = $derived(() => {
		return formatCurrency(product.price / INSTALLMENTS);
	});
	
	const pixPrice = $derived(() => {
		return formatCurrency(product.price * PIX_DISCOUNT);
	});
	
	const mainImage = $derived(() => {
		return product.image || (product.images && product.images[0]) || '/placeholder.jpg';
	});
	
	// Handlers
	function handleToggleFavorite(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		isFavorite = !isFavorite;
		onFavoriteToggle?.(product, isFavorite);
	}
	
	function handleProductClick(e: Event) {
		if (onProductClick) {
			e.preventDefault();
			onProductClick(product);
		}
	}
</script>

<article class="product-card {variant} {className}">
	<!-- Discount Badge -->
	{#if discount() > 0}
		<div class="discount-badge">
			{discount()}% <span class="discount-badge__off">OFF</span>
		</div>
	{/if}
	
	<!-- Product Image Section -->
	<div class="product-card__image-container">
		<!-- Slot for custom badges -->
		<slot name="badges">
			{#if product.tags && product.tags.length > 0}
				<div class="material-badge">
					{product.tags[0]}
				</div>
			{/if}
		</slot>
		
		<!-- Favorite Button -->
		{#if showFavorite && variant === 'store'}
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
						fill={isFavorite ? '#F17179' : 'white'} 
						stroke={isFavorite ? '#F17179' : '#E0E0E0'} 
						stroke-width="1"
					/>
					<path 
						d="M13.5 11C14.2 11 14.95 11.35 15.75 12C17.35 10.75 19.5 10.8 20.8 12.1C21.5 12.8 21.9 13.75 21.9 14.75C21.9 15.75 21.5 16.7 20.8 17.4L20.8 17.4L17 21C16.65 21.3 16.2 21.5 15.75 21.5C15.3 21.5 14.85 21.3 14.5 21L10.7 17.4L10.7 17.4C10.15 16.85 9.8 16.15 9.65 15.35C9.5 14.55 9.6 13.7 9.9 13C10.2 12.3 10.7 11.7 11.35 11.3C12 10.9 12.75 10.7 13.5 11Z" 
						fill={isFavorite ? 'white' : '#E0E0E0'}
					/>
				</svg>
			</button>
		{/if}
		
		<!-- Product Image -->
		<a 
			href={onProductClick ? '#' : `/produto/${product.slug}`} 
			class="product-card__image-link"
			onclick={handleProductClick}
		>
			<img 
				src={mainImage()} 
				alt={product.name}
				loading="lazy"
				class="product-card__image"
			/>
		</a>
		
		<!-- Slot for admin/seller actions -->
		{#if variant !== 'store'}
			<div class="product-card__actions">
				<slot name="actions" {product} />
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
			<a 
				href={onProductClick ? '#' : `/produto/${product.slug}`}
				onclick={handleProductClick}
			>
				{product.name}
			</a>
		</h3>
		
		<!-- SKU Reference -->
		{#if showSku && product.sku}
			<p class="product-card__sku">Ref: {product.sku}</p>
		{/if}
		
		<!-- Rating and Sales -->
		{#if (showRating && product.rating) || (showSoldCount && product.sold_count)}
			<div class="product-card__stats">
				{#if showRating && product.rating}
					<div class="product-card__rating">
						<div class="stars">
							{#each Array(5) as _, i}
								<svg class="star {i < Math.floor(product.rating) ? 'star--filled' : ''}" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
									<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
								</svg>
							{/each}
						</div>
						<span class="rating-value">{product.rating}</span>
						{#if product.reviews_count}
							<span class="reviews-count">({product.reviews_count})</span>
						{/if}
					</div>
				{/if}
				
				{#if showSoldCount && product.sold_count && product.sold_count > 50}
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
			
			{#if showInstallments}
				<div class="product-card__price-installment">
					<span class="product-card__price-label">por</span>
					<span class="product-card__price-count">{INSTALLMENTS}x</span>
					<span class="product-card__price-label">de</span>
					<span class="product-card__price-value">{installmentPrice()}</span>
				</div>
			{:else}
				<div class="product-card__price-cash">
					<span class="product-card__price-value">{formatCurrency(product.price)}</span>
				</div>
			{/if}
			
			{#if showPixPrice}
				<p class="product-card__price-pix">
					<strong>{pixPrice()}</strong> no pix ou boleto
				</p>
			{/if}
		</div>
		
		<!-- Bottom Badges -->
		{#if showBadges}
			<div class="product-card__badges">
				<slot name="bottom-badges">
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
				</slot>
			</div>
		{/if}
		
		<!-- Slot for additional info -->
		<slot name="extra-info" {product} />
	</div>
</article>

<style>
	/* ===== Base Card Styles ===== */
	.product-card {
		width: 262.65px;
		display: flex;
		flex-direction: column;
		background: transparent;
		position: relative;
	}
	
	/* Variant adjustments */
	.product-card.admin,
	.product-card.seller {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}
	
	/* ===== Discount Badge ===== */
	.discount-badge {
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 15px;
		font-weight: 700;
		color: #2C1D1D;
		margin-bottom: 8px;
		text-align: left;
		line-height: 100%;
		width: auto;
		height: auto;
		flex-shrink: 0;
	}
	
	.discount-badge__off {
		color: var(--primary-color, #00BFB3);
		font-weight: 700;
	}
	
	/* ===== Image Container ===== */
	.product-card__image-container {
		position: relative;
		width: 262.65px;
		height: 350.2px;
		overflow: hidden;
		border-radius: 12px;
		background: #F5F5F5;
		margin-bottom: 12px;
	}
	
	.admin .product-card__image-container,
	.seller .product-card__image-container {
		border-radius: 0;
		margin-bottom: 0;
	}
	
	.product-card__image-link {
		display: block;
		width: 100%;
		height: 100%;
		text-decoration: none;
	}
	
	.product-card__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.3s ease;
	}
	
	.product-card:hover .product-card__image {
		transform: scale(1.05);
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
		background: var(--primary-color, #00BFB3);
		border-radius: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
		color: #FFF;
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 11px;
		font-style: normal;
		font-weight: 600;
		line-height: 100%;
		text-transform: uppercase;
		letter-spacing: 0.5px;
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
		transition: all 0.2s ease;
		z-index: 3;
	}
	
	.favorite-button:hover {
		transform: scale(1.1);
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
	
	/* ===== Admin/Seller Actions ===== */
	.product-card__actions {
		position: absolute;
		top: 12px;
		right: 12px;
		display: flex;
		gap: 8px;
		z-index: 3;
	}
	
	/* ===== Product Information ===== */
	.product-card__info {
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: transparent;
	}
	
	.admin .product-card__info,
	.seller .product-card__info {
		padding: 16px;
	}
	
	.product-card__pieces {
		width: auto;
		height: auto;
		flex-shrink: 0;
		color: #000;
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 15px;
		font-style: normal;
		font-weight: 600;
		line-height: 1.4;
		margin: 0 0 4px 0;
	}
	
	.product-card__title {
		width: 100%;
		min-height: 40px;
		height: auto;
		flex-shrink: 0;
		color: #000;
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 15px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.4;
		margin: 0 0 6px 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.product-card__title a {
		color: inherit;
		text-decoration: none;
		transition: color 0.2s ease;
	}
	
	.product-card__title a:hover {
		color: var(--primary-color, #00BFB3);
	}
	
	.product-card__sku {
		width: auto;
		height: auto;
		flex-shrink: 0;
		color: #818181;
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 13px;
		font-style: normal;
		font-weight: 500;
		line-height: 1.4;
		letter-spacing: 0.24px;
		margin: 0 0 8px 0;
	}
	
	/* ===== Stats Section ===== */
	.product-card__stats {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 4px 0;
		flex-wrap: wrap;
	}
	
	.product-card__rating {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	
	.stars {
		display: flex;
		gap: 1px;
	}
	
	.star {
		color: #E0E0E0;
		transition: color 0.2s ease;
	}
	
	.star--filled {
		color: #FFC107;
	}
	
	.rating-value {
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 13px;
		font-weight: 600;
		color: #333;
		margin-left: 2px;
	}
	
	.reviews-count {
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 12px;
		color: #666;
	}
	
	.sold-count {
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 12px;
		color: #666;
		background: #F5F5F5;
		padding: 2px 8px;
		border-radius: 12px;
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
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 13px;
		font-style: normal;
		font-weight: 700;
		line-height: 1.4;
		letter-spacing: 0.22px;
		text-decoration-line: line-through;
		margin: 0;
	}
	
	.product-card__price-installment,
	.product-card__price-cash {
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
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 16px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.4;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-count {
		color: #000;
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 16px;
		font-style: normal;
		font-weight: 900;
		line-height: 1.4;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-value {
		color: #000;
		font-family: var(--font-sans, 'Lato', sans-serif);
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
		font-family: var(--font-sans, 'Lato', sans-serif);
		font-size: 16px;
		font-style: normal;
		font-weight: 400;
		line-height: 1.4;
		letter-spacing: 0.28px;
		margin: 0;
	}
	
	.product-card__price-pix strong {
		font-weight: 900;
		color: var(--primary-color, #00BFB3);
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
		font-family: var(--font-sans, 'Lato', sans-serif);
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
	
	/* ===== Responsive Design ===== */
	@media (max-width: 768px) {
		.product-card {
			width: 100%;
			max-width: 262.65px;
		}
		
		.product-card__image-container {
			width: 100%;
			height: auto;
			aspect-ratio: 262.65 / 350.2;
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
</style> 