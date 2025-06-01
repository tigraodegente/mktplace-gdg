<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	// =============================================================================
	// TYPES
	// =============================================================================
	
	interface FastDeliverySlide {
		id: string;
		image: string;
		alt?: string;
	}
	
	interface FastDeliveryBannerProps {
		slides?: FastDeliverySlide[];
		autoPlay?: boolean;
		autoPlayInterval?: number;
		title?: string;
		class?: string;
	}
	
	// =============================================================================
	// PROPS
	// =============================================================================
	
	let {
		slides = [
			{
				id: '1',
				image: 'https://picsum.photos/1440/266?random=1',
				alt: 'Produto com entrega rápida'
			},
			{
				id: '2', 
				image: 'https://picsum.photos/1440/266?random=2',
				alt: 'Produto com entrega rápida'
			},
			{
				id: '3',
				image: 'https://picsum.photos/1440/266?random=3',
				alt: 'Produto com entrega rápida'
			}
		],
		autoPlay = true,
		autoPlayInterval = 5000,
		title = 'Produtos que chegam <strong>rapidinho</strong>',
		class: className = ''
	}: FastDeliveryBannerProps = $props();
	
	// =============================================================================
	// STATE
	// =============================================================================
	
	let currentSlide = $state(0);
	let isDragging = $state(false);
	let isLoaded = $state(false);
	let isTransitioning = $state(false);
	
	// =============================================================================
	// VARIABLES
	// =============================================================================
	
	let autoPlayTimer: NodeJS.Timeout | null = null;
	let bannerContainer: HTMLElement;
	let touchStartX = 0;
	let touchEndX = 0;
	let touchStartY = 0;
	let touchEndY = 0;
	
	// =============================================================================
	// DERIVED
	// =============================================================================
	
	let hasMultipleSlides = $derived(slides.length > 1);
	let currentSlideData = $derived(slides[currentSlide] || slides[0]);
	
	// =============================================================================
	// FUNCTIONS
	// =============================================================================
	
	function nextSlide() {
		if (isTransitioning || !hasMultipleSlides) return;
		goToSlide((currentSlide + 1) % slides.length);
	}
	
	function prevSlide() {
		if (isTransitioning || !hasMultipleSlides) return;
		goToSlide((currentSlide - 1 + slides.length) % slides.length);
	}
	
	function goToSlide(index: number) {
		if (index === currentSlide || isTransitioning) return;
		
		isTransitioning = true;
		currentSlide = index;
		stopAutoPlay();
		
		setTimeout(() => {
			isTransitioning = false;
			if (autoPlay && hasMultipleSlides) {
				startAutoPlay();
			}
		}, 500);
	}
	
	function startAutoPlay() {
		if (autoPlay && hasMultipleSlides && !isDragging) {
			autoPlayTimer = setInterval(nextSlide, autoPlayInterval);
		}
	}
	
	function stopAutoPlay() {
		if (autoPlayTimer) {
			clearInterval(autoPlayTimer);
			autoPlayTimer = null;
		}
	}
	
	function handleMouseEnter() {
		stopAutoPlay();
	}
	
	function handleMouseLeave() {
		if (!isDragging) {
			startAutoPlay();
		}
	}

	function handleTouchStart(e: TouchEvent) {
		if (!hasMultipleSlides) return;
		
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
		touchEndX = 0;
		touchEndY = 0;
		isDragging = false;
		stopAutoPlay();
	}

	function handleTouchMove(e: TouchEvent) {
		if (!hasMultipleSlides || !touchStartX) return;
		
		touchEndX = e.touches[0].clientX;
		touchEndY = e.touches[0].clientY;
		
		const deltaX = Math.abs(touchEndX - touchStartX);
		const deltaY = Math.abs(touchEndY - touchStartY);
		
		if (deltaX > deltaY && deltaX > 10) {
			isDragging = true;
			e.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (!hasMultipleSlides || !touchStartX || !touchEndX || !isDragging) {
			resetTouchState();
			return;
		}
		
		const swipeDistance = touchStartX - touchEndX;
		const minSwipeDistance = 30;
		
		if (Math.abs(swipeDistance) > minSwipeDistance) {
			if (swipeDistance > 0) {
				nextSlide();
			} else {
				prevSlide();
			}
		}
		
		resetTouchState();
	}
	
	function resetTouchState() {
		touchStartX = 0;
		touchEndX = 0;
		touchStartY = 0;
		touchEndY = 0;
		isDragging = false;
		startAutoPlay();
	}
	
	function handleKeyDown(event: KeyboardEvent) {
		if (!hasMultipleSlides || isTransitioning) return;
		
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				prevSlide();
				break;
			case 'ArrowRight':
				event.preventDefault();
				nextSlide();
				break;
		}
	}
	
	// =============================================================================
	// LIFECYCLE
	// =============================================================================
	
	onMount(() => {
		isLoaded = true;
		
		if (autoPlay && hasMultipleSlides) {
			startAutoPlay();
		}
		
		return () => {
			stopAutoPlay();
		};
	});
	
	onDestroy(() => {
		stopAutoPlay();
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

<section 
	class="delivery {className}"
	aria-label="Banner de produtos com entrega rápida"
>
	<!-- Título da seção -->
	<header class="delivery__header">
		<div class="delivery__title">
			<svg 
				xmlns="http://www.w3.org/2000/svg" 
				width="32" 
				height="47" 
				viewBox="0 0 32 47" 
				fill="none"
				aria-hidden="true"
			>
				<path d="M31.5079 17.0785C31.2886 16.6793 30.8771 16.4263 30.4245 16.4125L19.3776 16.0772L24.359 2.40077C24.5005 2.0107 24.4473 1.5753 24.2164 1.23112C23.9856 0.886519 23.6047 0.674742 23.1924 0.661796L10.3679 0.272506C9.80149 0.255746 9.29175 0.615129 9.11267 1.15703L0.645292 26.7858L0.645279 26.7862C0.516803 27.1736 0.577563 27.6002 0.809528 27.9356C1.04193 28.2707 1.41791 28.4759 1.82329 28.4877L13.366 28.8381L12.8641 45.6481C12.846 46.2395 13.2278 46.7677 13.7916 46.9309C14.3553 47.0941 14.957 46.851 15.2529 46.3404L31.4927 18.3582C31.7228 17.9648 31.7287 17.4774 31.5081 17.0781L31.5079 17.0785Z" fill="#FF8403"/>
			</svg>
			<h2>{@html title}</h2>
		</div>
	</header>

	<!-- Banner Container -->
	<div 
		class="delivery__container"
		class:delivery__container--dragging={isDragging}
		class:delivery__container--transitioning={isTransitioning}
		bind:this={bannerContainer}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		role="region"
		aria-label="Banner de entrega rápida"
	>
		<div class="delivery__slides" class:delivery__slides--dragging={isDragging}>
			{#each slides as slide, index}
				<div 
					class="delivery__slide"
					class:delivery__slide--active={index === currentSlide}
					class:delivery__slide--dragging={isDragging}
					style="transform: translateX({(index - currentSlide) * 100}%)"
					aria-hidden={index !== currentSlide}
				>
					<div class="delivery__content">
						<img 
							src={slide.image} 
							alt={slide.alt || `Slide ${index + 1} - Produtos com entrega rápida`}
							loading={index === 0 ? 'eager' : 'lazy'}
							class="delivery__image"
							draggable="false"
						/>
					</div>
				</div>
			{/each}
		</div>
		
		{#if !isLoaded}
			<div class="delivery__loading">
				<div class="delivery__spinner"></div>
			</div>
		{/if}
	</div>

	<!-- Navegação -->
	{#if hasMultipleSlides}
		<!-- Setas de navegação - Desktop apenas -->
		<button 
			class="delivery__arrow delivery__arrow--prev"
			onclick={prevSlide}
			aria-label="Slide anterior"
			disabled={isTransitioning}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
				<circle cx="24" cy="24" r="24" fill="var(--color-primary)"/>
				<path d="M26.9494 30.3164L21.0547 24.0006L26.9494 17.6848" stroke="white" stroke-width="1.44457"/>
			</svg>
		</button>
		<button 
			class="delivery__arrow delivery__arrow--next"
			onclick={nextSlide}
			aria-label="Próximo slide"
			disabled={isTransitioning}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
				<circle cx="24" cy="24" r="24" fill="var(--color-primary)"/>
				<path d="M21.0506 17.6836L26.9453 23.9994L21.0506 30.3152" stroke="white" stroke-width="1.44457"/>
			</svg>
		</button>
		
		<!-- Indicadores -->
		<div class="delivery__indicators">
			{#each slides as _, index}
				<button
					class="delivery__indicator"
					class:delivery__indicator--active={index === currentSlide}
					onclick={() => goToSlide(index)}
					aria-label="Ir para slide {index + 1}"
					disabled={isTransitioning}
				></button>
			{/each}
		</div>
	{/if}
</section>

<style>
	/* =============================================================================
	   CSS CUSTOM PROPERTIES
	   ============================================================================= */
	
	.delivery {
		/* Colors */
		--color-primary: #00BFB3;
		--color-accent: #FF8403;
		--color-text: #000000;
		--color-background: #FFFFFF;
		--color-indicator: #000000;
		--color-loading-bg: white;
		--color-loading-border: #f3f3f3;
		
		/* Spacing */
		--spacing-xs: 8px;
		--spacing-sm: 16px;
		--spacing-md: 20px;
		--spacing-lg: 24px;
		--spacing-xl: 32px;
		--spacing-2xl: 36px;
		--spacing-3xl: 42px;
		--spacing-4xl: 48px;
		
		/* Dimensions */
		--container-max-width: 1440px;
		--banner-max-width: 1200px;
		--banner-height-desktop: 266px;
		--arrow-size: 48px;
		--spinner-size: 32px;
		--border-width: 3px;
		
		/* Border radius */
		--border-radius-sm: 20px;
		--border-radius-md: 24px;
		--border-radius-lg: 28px;
		--border-radius-xl: 32px;
		--border-radius-full: 48px;
		
		/* Typography */
		--font-family: 'Lato', sans-serif;
		--font-size-title-mobile: 20px;
		--font-size-title-tablet-sm: 22px;
		--font-size-title-tablet-md: 26px;
		--font-size-title-desktop: 28px;
		--font-weight-normal: 300;
		--font-weight-bold: 700;
		--letter-spacing-title: 0.4px;
		--line-height-normal: normal;
		
		/* Transitions */
		--transition-fast: 200ms ease-out;
		--transition-base: 300ms ease;
		--transition-slide: 500ms ease-in-out;
		
		/* Shadows */
		--box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	/* =============================================================================
	   BASE STYLES
	   ============================================================================= */
	
	.delivery {
		width: 100%;
		margin: var(--spacing-xl) 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 0 var(--spacing-sm);
		position: relative;
		background: var(--color-background);
	}
	
	/* =============================================================================
	   HEADER STYLES
	   ============================================================================= */
	
	.delivery__header {
		width: 100%;
		max-width: 674px;
		margin: 0 auto var(--spacing-lg) auto;
		display: flex;
		justify-content: center;
		padding: 0 var(--spacing-sm);
	}
	
	.delivery__title {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-xs);
		width: 100%;
		height: auto;
	}
	
	.delivery__title svg {
		width: 24px;
		height: auto;
		flex-shrink: 0;
	}
	
	.delivery__title h2 {
		font-family: var(--font-family);
		font-size: var(--font-size-title-mobile);
		font-weight: var(--font-weight-normal);
		color: var(--color-text);
		margin: 0;
		text-align: center;
		letter-spacing: var(--letter-spacing-title);
		line-height: var(--line-height-normal);
		white-space: normal;
	}
	
	.delivery__title h2 :global(strong) {
		font-weight: var(--font-weight-bold);
		letter-spacing: 0.56px;
	}
	
	/* =============================================================================
	   BANNER CONTAINER
	   ============================================================================= */
	
	.delivery__container {
		position: relative;
		width: 100%;
		max-width: 674px;
		aspect-ratio: 674 / 600;
		flex-shrink: 0;
		overflow: hidden;
		border-radius: var(--border-radius-sm);
		margin: 0 auto;
		touch-action: pan-y pinch-zoom;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		transition: transform var(--transition-fast);
		background: var(--color-background);
	}
	
	.delivery__container--dragging {
		cursor: grabbing;
		transform: scale(0.99);
	}
	
	.delivery__container--transitioning {
		pointer-events: none;
	}
	
	/* =============================================================================
	   SLIDES
	   ============================================================================= */
	
	.delivery__slides {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		cursor: default;
	}
	
	.delivery__slide {
		position: absolute;
		inset: 0;
		transition: transform var(--transition-slide);
		will-change: transform;
		overflow: hidden;
		border-radius: var(--border-radius-sm);
	}
	
	.delivery__slide--dragging {
		transition: none;
	}
	
	.delivery__content {
		position: relative;
		width: 100%;
		height: 100%;
		padding: 0;
		pointer-events: none;
	}
	
	.delivery__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		display: block;
		user-select: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
		-webkit-touch-callout: none;
		pointer-events: none;
		background-color: var(--color-loading-bg);
	}
	
	/* =============================================================================
	   NAVIGATION ARROWS
	   ============================================================================= */
	
	.delivery__arrow {
		position: absolute;
		background: transparent;
		border: none;
		cursor: pointer;
		width: var(--arrow-size);
		height: var(--arrow-size);
		display: none;
		align-items: center;
		justify-content: center;
		outline: none;
		padding: 0;
		z-index: 50;
		top: 50%;
		transform: translateY(-50%);
		transition: opacity var(--transition-base);
	}
	
	.delivery__arrow:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	.delivery__arrow:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.delivery__arrow--prev {
		left: max(var(--spacing-md), calc(50vw - 50% - 60px));
	}
	
	.delivery__arrow--next {
		right: max(var(--spacing-md), calc(50vw - 50% - 60px));
	}
	
	/* =============================================================================
	   INDICATORS
	   ============================================================================= */
	
	.delivery__indicators {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
		padding: 0 var(--spacing-sm);
	}
	
	.delivery__indicator {
		width: 50px;
		height: 3px;
		flex-shrink: 0;
		border-radius: var(--border-radius-full);
		background: var(--color-indicator);
		opacity: 0.2;
		border: none;
		cursor: pointer;
		transition: all var(--transition-base);
		outline: none;
		position: relative;
		padding: 0;
	}
	
	.delivery__indicator--active {
		background: var(--color-primary);
		opacity: 1;
	}
	
	.delivery__indicator:hover:not(.delivery__indicator--active) {
		opacity: 0.4;
	}
	
	.delivery__indicator:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	.delivery__indicator:disabled {
		cursor: not-allowed;
	}
	
	/* =============================================================================
	   LOADING
	   ============================================================================= */
	
	.delivery__loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-loading-bg);
		border-radius: var(--border-radius-sm);
	}
	
	.delivery__spinner {
		width: var(--spinner-size);
		height: var(--spinner-size);
		border: var(--border-width) solid var(--color-loading-border);
		border-top: var(--border-width) solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	/* =============================================================================
	   RESPONSIVE BREAKPOINTS
	   ============================================================================= */
	
	/* Tablet pequeno: 768px - 899px */
	@media (min-width: 768px) and (max-width: 899px) {
		.delivery {
			margin: var(--spacing-2xl) 0;
			padding: 0 2vw;
		}
		
		.delivery__header {
			max-width: 90vw;
			padding: 0 2vw;
		}
		
		.delivery__title {
			gap: 10px;
		}
		
		.delivery__title svg {
			width: 28px;
		}
		
		.delivery__title h2 {
			font-size: var(--font-size-title-tablet-sm);
			letter-spacing: 0.44px;
		}
		
		.delivery__container {
			max-width: 85vw;
			aspect-ratio: 3 / 2;
			border-radius: var(--border-radius-md);
		}
		
		.delivery__slide {
			border-radius: var(--border-radius-md);
		}
		
		.delivery__loading {
			border-radius: var(--border-radius-md);
		}
		
		.delivery__indicators {
			gap: 9px;
			margin-top: 18px;
		}
		
		.delivery__indicator {
			width: 55px;
		}
	}
	
	/* Tablet médio: 900px - 1023px */
	@media (min-width: 900px) and (max-width: 1023px) {
		.delivery {
			margin: var(--spacing-3xl) 0;
			padding: 0 2.5vw;
		}
		
		.delivery__title {
			gap: var(--spacing-sm);
		}
		
		.delivery__title svg {
			width: 30px;
		}
		
		.delivery__title h2 {
			font-size: var(--font-size-title-tablet-md);
			letter-spacing: 0.52px;
		}
		
		.delivery__container {
			max-width: 80vw;
			aspect-ratio: 5 / 3;
			border-radius: var(--border-radius-lg);
		}
		
		.delivery__slide {
			border-radius: var(--border-radius-lg);
		}
		
		.delivery__loading {
			border-radius: var(--border-radius-lg);
		}
		
		.delivery__indicators {
			gap: 11px;
			margin-top: 22px;
		}
		
		.delivery__indicator {
			width: 62px;
		}
	}
	
	/* Desktop: 1024px+ */
	@media (min-width: 1024px) {
		.delivery {
			margin: var(--spacing-4xl) 0;
			padding: 0 var(--spacing-md);
		}
		
		.delivery__header {
			max-width: var(--container-max-width);
			margin-bottom: var(--spacing-lg);
			padding: 0;
		}
		
		.delivery__title {
			width: 442px;
			height: 38px;
			gap: var(--spacing-sm);
		}
		
		.delivery__title svg {
			width: 32px;
		}
		
		.delivery__title h2 {
			font-size: var(--font-size-title-desktop);
			letter-spacing: 0.56px;
			white-space: nowrap;
		}
		
		.delivery__container {
			width: 100%;
			max-width: var(--banner-max-width);
			height: var(--banner-height-desktop);
			aspect-ratio: unset;
			border-radius: var(--border-radius-xl);
			touch-action: auto;
		}
		
		.delivery__container--dragging {
			transform: none;
		}
		
		.delivery__slides {
			cursor: grab;
		}
		
		.delivery__slides--dragging {
			cursor: grabbing;
		}
		
		.delivery__slide {
			border-radius: var(--border-radius-xl);
		}
		
		.delivery__loading {
			border-radius: var(--border-radius-xl);
		}
		
		.delivery__arrow {
			display: flex;
		}
		
		.delivery__arrow--prev {
			left: max(40px, calc(50% - 600px - 80px));
		}
		
		.delivery__arrow--next {
			right: max(40px, calc(50% - 600px - 80px));
		}
		
		.delivery__indicators {
			gap: var(--spacing-sm);
			margin-top: var(--spacing-lg);
		}
		
		.delivery__indicator {
			width: 66.502px;
			height: 3.011px;
		}
	}
	
	/* Desktop grande: 1440px+ */
	@media (min-width: 1440px) {
		.delivery__arrow--prev {
			left: calc(50% - 700px);
		}
		
		.delivery__arrow--next {
			right: calc(50% - 700px);
		}
	}
	
	/* Mobile pequeno: até 767px */
	@media (max-width: 767px) {
		.delivery__header {
			max-width: calc(100vw - 32px);
		}
		
		.delivery__container {
			max-width: calc(100vw - 32px);
			aspect-ratio: 16 / 9;
		}
		
		.delivery__container--dragging {
			transform: scale(0.99);
		}
	}
</style> 