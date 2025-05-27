<script lang="ts">
	import { formatCurrency } from '@mktplace/utils';
	import type { Product } from '@mktplace/shared-types';
	
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
		return product.image || (product.images && product.images[0]) || '/placeholder.jpg';
	});
	
	// Handlers
	function handleToggleFavorite(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		isFavorite = !isFavorite;
		// TODO: Implementar lógica de favoritos com store/API
	}
</script>

<article class="product-card">
	<!-- Discount Badge -->
	{#if discount() > 0}
		<div class="discount-badge">
			{discount()}% <span class="discount-badge__off">OFF</span>
		</div>
	{/if}
	
	<!-- Product Image Section -->
	<div class="product-card__image-container">
		<!-- Material Badge -->
		{#if materialTag()}
			<div class="material-badge">
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
			<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
				<circle 
					cx="12.6337" 
					cy="12.6337" 
					r="12.1337" 
					transform="matrix(-1 0 0 1 25.4556 0.351807)" 
					fill={isFavorite ? '#F17179' : 'white'} 
					stroke={isFavorite ? '#F17179' : '#E0E0E0'} 
					stroke-width="1"
				/>
				<path 
					d="M10.9746 9.09961C11.5927 9.09961 12.2477 9.38842 12.93 9.95641C14.2945 8.92632 16.1176 8.95383 17.227 10.0733C17.846 10.7003 18.1934 11.5488 18.1934 12.4333C18.1934 13.3178 17.846 14.1663 17.227 14.7933L17.2161 14.8043L14.053 17.8052C13.7492 18.0938 13.3475 18.2545 12.93 18.2545C12.5125 18.2545 12.1108 18.0938 11.8069 17.8052L8.64387 14.8043L8.63296 14.7933C8.17061 14.3265 7.8559 13.7321 7.72858 13.0852C7.60125 12.4383 7.66704 11.7678 7.91761 11.1585C8.16818 10.5492 8.59231 10.0285 9.1364 9.66202C9.68049 9.29556 10.3201 9.09985 10.9746 9.09961Z" 
					fill={isFavorite ? 'white' : '#E0E0E0'}
				/>
			</svg>
		</button>
		
		<!-- Product Image -->
		<a href="/produto/{product.slug}" class="product-card__image-link">
			<img 
				src={mainImage()} 
				alt={product.name}
				loading="lazy"
				class="product-card__image"
			/>
		</a>
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
				<span class="product-card__price-value">{installmentPrice()}</span>
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
	
	/* ===== Discount Badge ===== */
	.discount-badge {
		font-family: 'Lato', sans-serif;
		font-size: 13.531px;
		font-weight: 600;
		color: #2C1D1D;
		margin-bottom: 4px;
		text-align: left;
		line-height: 100%;
		font-feature-settings: 'swsh' on;
		width: 60.889px;
		height: 13.531px;
		flex-shrink: 0;
	}
	
	.discount-badge__off {
		color: #00BFB3;
		font-weight: 600;
		font-feature-settings: 'swsh' on;
	}
	
	/* ===== Image Container ===== */
	.product-card__image-container {
		position: relative;
		width: 262.65px;
		height: 350.2px;
		overflow: hidden;
		border-radius: 12px;
		background: #F5F5F5;
	}
	
	.product-card__image-link {
		display: block;
		width: 100%;
		height: 100%;
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
		width: 84.737px;
		height: 23.438px;
		flex-shrink: 0;
		background: #00BFB3;
		border-radius: 12.273px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2;
		padding: 0;
		color: #FFF;
		font-family: 'Lato', sans-serif;
		font-size: 10.738px;
		font-style: normal;
		font-weight: 500;
		line-height: 100%;
		font-feature-settings: 'swsh' on;
		text-transform: uppercase;
	}
	
	/* ===== Favorite Button ===== */
	.favorite-button {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 25.267px;
		height: 25.267px;
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
		width: 26px;
		height: 26px;
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
		padding: 12px 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: transparent;
	}
	
	.product-card__pieces {
		width: 187.178px;
		height: 20.296px;
		flex-shrink: 0;
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-style: normal;
		font-weight: 500;
		line-height: normal;
		margin: 0 0 2px 0;
	}
	
	.product-card__title {
		width: 217.623px;
		min-height: 20.296px;
		height: auto;
		flex-shrink: 0;
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: normal;
		margin: 0 0 2px 0;
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
		color: var(--cyan600);
	}
	
	.product-card__sku {
		width: 84.737px;
		height: 19.832px;
		flex-shrink: 0;
		color: #818181;
		font-family: 'Lato', sans-serif;
		font-size: 12px;
		font-style: normal;
		font-weight: 500;
		line-height: normal;
		letter-spacing: 0.24px;
		margin: 0 0 6px 0;
	}
	
	/* ===== Pricing Section ===== */
	.product-card__pricing {
		margin: 6px 0;
	}
	
	.product-card__price-original {
		width: 107.274px;
		height: 22.537px;
		flex-shrink: 0;
		color: #818181;
		font-family: 'Lato', sans-serif;
		font-size: 11px;
		font-style: normal;
		font-weight: 700;
		line-height: 21.635px;
		letter-spacing: 0.22px;
		text-decoration-line: line-through;
		margin: 0 0 2px 0;
	}
	
	.product-card__price-installment {
		width: 168.009px;
		height: 22.552px;
		flex-shrink: 0;
		display: flex;
		align-items: baseline;
		gap: 4px;
		margin-bottom: 2px;
	}
	
	.product-card__price-label {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: 21.635px;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-count {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-style: normal;
		font-weight: 900;
		line-height: 21.635px;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-value {
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-style: normal;
		font-weight: 900;
		line-height: 21.635px;
		letter-spacing: 0.28px;
	}
	
	.product-card__price-pix {
		width: 200.709px;
		height: 22.552px;
		flex-shrink: 0;
		color: #000;
		font-family: 'Lato', sans-serif;
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: 21.635px;
		letter-spacing: 0.28px;
		margin: 0;
	}
	
	.product-card__price-pix strong {
		font-weight: 900;
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
		gap: 4px;
		padding: 4px 8px;
		border-radius: 4px;
		font-family: 'Lato', sans-serif;
		font-size: 11px;
		font-weight: 600;
		height: 20px;
	}
	
	.badge svg {
		width: 12px;
		height: 12px;
		flex-shrink: 0;
	}
	
	.badge--black-friday {
		background: #5A5A5A;
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
	}
</style> 