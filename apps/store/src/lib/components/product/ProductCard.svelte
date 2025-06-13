<script lang="ts">
	import { formatCurrency } from '$lib/utils';
	import { cartStore } from '$lib/stores/cartStore';
	import { wishlistStore } from '$lib/stores/wishlistStore';
	import { toastStore } from '$lib/stores/toastStore';
	import { usePricing } from '$lib/stores/pricingStore';
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
	
	// Sistema de pricing dinâmico
	const pricing = usePricing();
	
	// Estados reativos para pricing
	let pixPrice = $state(0);
	let installmentInfo = $state({ number: 5, value: 0, hasInterest: false });
	
	// Estados reativos otimizados
	let isFavorite = $state(false);
	let isAddingToCart = $state(false);
	let currentImageIndex = $state(0);
	let isHovering = $state(false);
	let imageLoadError = $state(false);
	
	// Computeds otimizados
	const isOutOfStock = $derived(() => product.stock === 0);
	
	const discount = $derived(() => {
		// Lógica correta: original_price deve ser maior que price
		if (product.original_price && product.price && product.original_price > product.price) {
			return Math.round(((product.original_price - product.price) / product.original_price) * 100);
		}
		
		// Fallback para discount direto
		if (product.discount) return product.discount;
		
		return 0;
	});
	
	const finalPrice = $derived(() => {
		// Preço final é sempre o campo 'price'
		const basePrice = product.price;
		return product.discount ? basePrice * (1 - product.discount / 100) : basePrice;
	});
	
	const originalPrice = $derived(() => {
		// Só mostrar original_price se for maior que price
		if (product.original_price && product.price && product.original_price > product.price) {
			return product.original_price;
		}
		
		return null;
	});
	
	// Pricing dinâmico será calculado no effect abaixo
	
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
	
	// Função para calcular preços dinamicamente
	async function updatePricing() {
		try {
			const price = finalPrice();
			
			// Calcular PIX
			const calculatedPixPrice = await pricing.calculatePixPrice(price);
			pixPrice = calculatedPixPrice;
			
			// Calcular parcelamento padrão
			const calculatedInstallment = await pricing.calculateDefaultInstallment(price);
			installmentInfo = calculatedInstallment;
			
		} catch (error) {
			console.warn('Erro ao calcular preços dinâmicos, usando fallback:', error);
			// Fallback para valores originais
			pixPrice = finalPrice() * 0.95; // 5% desconto PIX
			installmentInfo = { 
				number: 5, 
				value: finalPrice() / 5, 
				hasInterest: false 
			};
		}
	}
	
	// Recalcular preços quando finalPrice mudar
	$effect(() => {
		updatePricing();
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
			<!-- Primeiro: Preço original riscado - "de R$ 68,83" -->
			{#if originalPrice()}
				<p class="original-price">
					de {formatCurrency(originalPrice() || 0)}
				</p>
			{/if}
			
			<!-- Segundo: Parcelamento - "por 5x de R$ XX,XX" -->
			<div class="installment-price">
				<span class="label">por</span>
				<span class="count">{installmentInfo.number}x</span>
				<span class="label">de</span>
				<span class="value">{formatCurrency(installmentInfo.value)}</span>
			</div>
			
			<!-- Terceiro: Preço PIX - "R$ 48,24 no pix ou boleto" -->
			<p class="pix-price">
				<strong>{formatCurrency(pixPrice)}</strong> 
				<span class="pix-label">no pix ou boleto</span>
			</p>
		</div>
		
		<!-- Badges inferiores -->
		{#if !compact && (product.is_black_friday || product.has_fast_delivery)}
			<div class="bottom-badges">
				{#if product.is_black_friday}
					<div class="badge badge--black-friday">Black Friday</div>
				{/if}
				
				{#if product.has_fast_delivery}
					<div class="badge badge--delivery">
						<svg xmlns="http://www.w3.org/2000/svg" width="9" height="14" viewBox="0 0 9 14" fill="none">
							<path d="M8.50446 5.40097C8.44526 5.29319 8.33418 5.2249 8.21202 5.22119L5.23016 5.13067L6.57478 1.43905C6.61296 1.33376 6.5986 1.21623 6.53629 1.12333C6.47399 1.03031 6.37116 0.973146 6.25989 0.969652L2.79821 0.864572C2.64532 0.860048 2.50773 0.957055 2.45939 1.10333L0.173823 8.0212L0.173819 8.02132C0.139141 8.1259 0.155541 8.24103 0.218155 8.33159C0.280886 8.42204 0.382373 8.47741 0.491797 8.48062L3.60749 8.57519L3.472 13.1127C3.46712 13.2723 3.57018 13.4149 3.72235 13.4589C3.87453 13.503 4.03693 13.4373 4.11681 13.2995L8.50035 5.74639C8.56246 5.64019 8.56407 5.50864 8.50452 5.40085L8.50446 5.40097Z" fill="#FF8403"/>
						</svg>
						Chega rapidinho
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
		background: #FBE7D1;
		border-radius: 4.49px;
		display: flex;
		align-items: center;
		gap: 4px;
		color: #E07709;
		font-family: Lato;
		font-size: 9.879px;
		font-style: normal;
		font-weight: 600;
		line-height: normal;
		letter-spacing: 0.198px;
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
		gap: 1px;
	}
	
	/* Preço original riscado - "de R$ 68,83" */
	.original-price {
		color: #818181;
		font-family: Lato;
		font-size: 11px;
		font-style: normal;
		font-weight: 700;
		line-height: 21.635px; /* 196.682% */
		letter-spacing: 0.22px;
		text-decoration-line: line-through;
		margin: 0;
		flex-shrink: 0;
	}
	
	/* Parcelamento - "por 5x de R$ XX,XX" */
	.installment-price {
		color: #000;
		font-family: Lato;
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: 21.635px; /* 154.536% */
		letter-spacing: 0.28px;
		margin: 0;
		flex-shrink: 0;
		display: flex;
		gap: 4px;
		white-space: nowrap;
	}
	
	.installment-price .label {
		color: #000;
		font-weight: 400;
	}
	
	.installment-price .count,
	.installment-price .value {
		color: #000;
		font-family: Lato;
		font-size: 14px;
		font-style: normal;
		font-weight: 900;
		line-height: 21.635px;
		letter-spacing: 0.28px;
	}
	
	/* Preço PIX - "R$ 48,24 no pix ou boleto" */
	.pix-price {
		color: #000;
		font-family: Lato;
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: 21.635px; /* 154.536% */
		letter-spacing: 0.28px;
		margin: 0;
		flex-shrink: 0;
	}
	
	.pix-price strong {
		color: #000;
		font-family: Lato;
		font-size: 14px;
		font-style: normal;
		font-weight: 900;
		line-height: 21.635px;
		letter-spacing: 0.28px;
	}
	
	.pix-label {
		color: #000;
		font-family: Lato;
		font-size: 14px;
		font-style: normal;
		font-weight: 400;
		line-height: 21.635px;
		letter-spacing: 0.28px;
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