<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	// =============================================================================
	// TYPES
	// =============================================================================
	
	interface BannerSlide {
		id: string;
		image: string;
		imageAlt: string;
		mobileImage?: string;
		link?: string;
	}
	
	interface HomeBannerProps {
		slides?: BannerSlide[];
		autoPlayInterval?: number;
		autoPlay?: boolean;
		showIndicators?: boolean;
		showArrows?: boolean;
		hasCountdown?: boolean;
		class?: string;
	}
	
	// =============================================================================
	// PROPS
	// =============================================================================
	
	let { 
		slides = [
			{
				id: '1',
				image: '/placeholder.jpg',
				imageAlt: 'Banner promocional 1',
				link: '/promocoes'
			}
		],
		autoPlayInterval = 5000,
		autoPlay = true,
		showIndicators = true,
		showArrows = true,
		hasCountdown = false,
		class: className = '',
	}: HomeBannerProps = $props();
	
	// =============================================================================
	// STATE
	// =============================================================================
	
	let currentSlide = $state(0);
	let isPaused = $state(false);
	let isLoaded = $state(false);
	let isTransitioning = $state(false);
	let imageLoadedStates = $state<boolean[]>(new Array(slides.length).fill(false));
	
	// =============================================================================
	// VARIABLES
	// =============================================================================
	
	let touchStartX = 0;
	let touchEndX = 0;
	let carouselInterval: ReturnType<typeof setInterval> | null = null;
	
	// =============================================================================
	// DERIVED
	// =============================================================================
	
	let totalSlides = $derived(slides.length);
	let hasMultipleSlides = $derived(totalSlides > 1);
	let currentSlideData = $derived(slides[currentSlide] || slides[0]);
	
	// =============================================================================
	// FUNCTIONS
	// =============================================================================
	
	function handleImageLoad(index: number) {
		imageLoadedStates[index] = true;
	}
	
	function handleImageError(index: number) {
		console.warn(`Falha ao carregar imagem do slide ${index + 1}`);
		imageLoadedStates[index] = false;
	}
	
	function preloadImages() {
		slides.forEach((slide, index) => {
			if (index !== 0) {
				const img = new Image();
				img.src = slide.image;
			}
		});
	}
	
	function startCarousel() {
		if (!isPaused && hasMultipleSlides && autoPlay) {
			carouselInterval = setInterval(() => {
				if (!isTransitioning) {
					nextSlide();
				}
			}, autoPlayInterval);
		}
	}
	
	function pauseCarousel() {
		isPaused = true;
		if (carouselInterval) {
			clearInterval(carouselInterval);
			carouselInterval = null;
		}
	}
	
	function resumeCarousel() {
		isPaused = false;
		if (carouselInterval) {
			clearInterval(carouselInterval);
			carouselInterval = null;
		}
		if (autoPlay && hasMultipleSlides) {
			startCarousel();
		}
	}
	
	function goToSlide(index: number) {
		if (index >= 0 && index < totalSlides && index !== currentSlide && !isTransitioning) {
			isTransitioning = true;
			currentSlide = index;
			
			if (carouselInterval) {
				clearInterval(carouselInterval);
				carouselInterval = null;
			}
			
			setTimeout(() => {
				isTransitioning = false;
				if (autoPlay && hasMultipleSlides && !isPaused) {
					startCarousel();
				}
			}, 700);
		}
	}
	
	function nextSlide() {
		goToSlide((currentSlide + 1) % totalSlides);
	}
	
	function prevSlide() {
		goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
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
	
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		pauseCarousel();
	}
	
	function handleTouchMove(e: TouchEvent) {
		touchEndX = e.touches[0].clientX;
	}
	
	function handleTouchEnd() {
		if (!touchStartX || !touchEndX || !hasMultipleSlides) {
			resumeCarousel();
			return;
		}
		
		const swipeDistance = touchStartX - touchEndX;
		const minSwipeDistance = 50;
		
		if (Math.abs(swipeDistance) > minSwipeDistance) {
			if (swipeDistance > 0) {
				nextSlide();
			} else {
				prevSlide();
			}
		}
		
		touchStartX = 0;
		touchEndX = 0;
		resumeCarousel();
	}
	
	// =============================================================================
	// LIFECYCLE
	// =============================================================================
	
	onMount(() => {
		isLoaded = true;
		
		if (autoPlay && hasMultipleSlides) {
			startCarousel();
		}
		
		preloadImages();
		
		return () => {
			if (carouselInterval) {
				clearInterval(carouselInterval);
			}
		};
	});
	
	onDestroy(() => {
		if (carouselInterval) {
			clearInterval(carouselInterval);
		}
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

<section 
	class="banner-section {className}"
	aria-label="Banners promocionais"
	aria-live="polite"
	onmouseenter={pauseCarousel}
	onmouseleave={resumeCarousel}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<div class="banner-wrapper">
		<div class="banner-container" class:banner-container--with-countdown={hasCountdown}>
			<div class="banner-slides">
				{#each slides as slide, index}
					<div 
						class="banner-slide"
						class:banner-slide--active={index === currentSlide}
						style="transform: translateX({(index - currentSlide) * 100}%)" 
						aria-hidden={index !== currentSlide}
					>
						{#if slide.link}
							<a href={slide.link} class="banner-image-link">
								<img
									src={slide.image}
									alt={slide.imageAlt}
									class="banner-image"
									class:image-loading={!imageLoadedStates[index]}
									loading={index === 0 ? 'eager' : 'lazy'}
									draggable="false"
									onload={() => handleImageLoad(index)}
									onerror={() => handleImageError(index)}
								/>
								{#if !imageLoadedStates[index]}
									<div class="image-placeholder">
										<div class="placeholder-content">
											<svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
												<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
												<circle cx="8.5" cy="8.5" r="1.5"/>
												<polyline points="21,15 16,10 5,21"/>
											</svg>
											<p>Carregando imagem...</p>
										</div>
									</div>
								{/if}
							</a>
						{:else}
							<img
								src={slide.image}
								alt={slide.imageAlt}
								class="banner-image"
								class:image-loading={!imageLoadedStates[index]}
								loading={index === 0 ? 'eager' : 'lazy'}
								draggable="false"
								onload={() => handleImageLoad(index)}
								onerror={() => handleImageError(index)}
							/>
							{#if !imageLoadedStates[index]}
								<div class="image-placeholder">
									<div class="placeholder-content">
										<svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
											<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
											<circle cx="8.5" cy="8.5" r="1.5"/>
											<polyline points="21,15 16,10 5,21"/>
										</svg>
										<p>Carregando imagem...</p>
									</div>
								</div>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
			
			{#if !isLoaded}
				<div class="banner-loading">
					<div class="banner-spinner"></div>
				</div>
			{/if}
		</div>
		
		{#if hasMultipleSlides && showArrows}
			<button 
				onclick={prevSlide}
				class="banner-arrow banner-arrow--left"
				aria-label="Slide anterior"
				disabled={isTransitioning}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="24" fill="var(--color-primary)"/>
					<path d="M26.9494 30.3164L21.0547 24.0006L26.9494 17.6848" stroke="white" stroke-width="1.44457"/>
				</svg>
			</button>
			
			<button 
				onclick={nextSlide}
				class="banner-arrow banner-arrow--right"
				aria-label="Próximo slide"
				disabled={isTransitioning}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="24" fill="var(--color-primary)"/>
					<path d="M21.0506 17.6836L26.9453 23.9994L21.0506 30.3152" stroke="white" stroke-width="1.44457"/>
				</svg>
			</button>
		{/if}
		
		{#if hasMultipleSlides && showIndicators}
			<div class="banner-indicators">
				{#each slides as _, index}
					<button
						onclick={() => goToSlide(index)}
						class="banner-indicator"
						class:banner-indicator--active={index === currentSlide}
						aria-label="Ir para slide {index + 1}"
						disabled={isTransitioning}
					></button>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	/* =============================================================================
	   CSS CUSTOM PROPERTIES
	   ============================================================================= */
	
	.banner-section {
		/* Colors */
		--color-primary: #00BFB3;
		--color-background: #f0f0f0;
		--color-placeholder: #666;
		--color-indicator: #000;
		--color-loading-bg: white;
		--color-loading-border: #f3f3f3;
		
		/* Spacing */
		--spacing-xs: 8px;
		--spacing-sm: 16px;
		--spacing-md: 20px;
		--spacing-lg: 24px;
		--spacing-xl: 32px;
		--spacing-2xl: 48px;
		
		/* Sizes */
		--arrow-size: 48px;
		--spinner-size: 32px;
		--border-width: 3px;
		
		/* Borders */
		--border-radius-sm: 16px;
		--border-radius-md: 24px;
		--border-radius-lg: 32px;
		--border-radius-full: 48px;
		
		/* Transitions */
		--transition-fast: 300ms ease;
		--transition-slide: 700ms cubic-bezier(0.4, 0, 0.2, 1);
		
		/* Container dimensions - ALINHADO COM HEADER */
		--container-max-width: 1440px;
		--banner-max-width: calc(1440px - 64px); /* 1440px - 64px (32px padding cada lado) */
		--banner-height-desktop: 640px;
		--banner-padding-top: 48px;
	}
	
	/* =============================================================================
	   BASE STYLES
	   ============================================================================= */
	
	.banner-section {
		position: relative;
		width: 100%;
		overflow: hidden;
	}
	
	.banner-wrapper {
		position: relative;
		margin: 0 auto;
		width: 100%;
		max-width: var(--container-max-width);
		padding: 0;
	}
	
	.banner-container {
		position: relative;
		width: 100%;
		margin: 0 auto;
		aspect-ratio: 1 / 1;
		border-radius: 0;
		min-height: 300px;
		overflow: hidden;
	}
	
	.banner-container--with-countdown {
		/* Mobile e iPad Mini: conecta diretamente com o countdown full width */
	}
	
	/* =============================================================================
	   RESPONSIVE BREAKPOINTS
	   ============================================================================= */
	
	/* iPad Mini e tablets pequenos: até 899px - FULL WIDTH como mobile */
	@media (max-width: 899px) {
		.banner-wrapper {
			padding: 0;
		}
		
		.banner-container {
			border-radius: 0;
		}
	}
	
	/* Tablet médio: 900px - 1023px */
	@media (min-width: 900px) and (max-width: 1023px) {
		.banner-wrapper {
			padding: 0 2.5vw;
		}
		
		.banner-container {
			aspect-ratio: 3 / 2;
			border-radius: var(--border-radius-md);
			min-height: 450px;
		}
		
		.banner-container--with-countdown {
			border-radius: 0 0 var(--border-radius-md) var(--border-radius-md);
			margin-top: 0; /* Conecta diretamente com o countdown - sem espaço */
		}
	}
	
	/* Desktop: 1024px+ - ALINHADO COM HEADER */
	@media (min-width: 1024px) {
		.banner-wrapper {
			padding: 0 var(--spacing-xl); /* 32px - igual ao header px-8 */
		}
		
		.banner-container {
			max-width: var(--banner-max-width);
			height: var(--banner-height-desktop);
			aspect-ratio: unset;
			border-radius: var(--border-radius-lg);
			margin-top: 0;
			padding-top: var(--banner-padding-top);
			min-height: var(--banner-height-desktop);
		}
		
		.banner-container--with-countdown {
			border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
			margin-top: 0; /* Sem margin para conectar com countdown */
			padding-top: 0; /* Sem padding top quando tem countdown */
			height: calc(var(--banner-height-desktop) - var(--banner-padding-top)); /* Altura ajustada */
		}
	}
	
	/* Ajustes específicos para diferentes tamanhos de tela */
	/* Tablet pequeno: 768px - 899px - mantém aspect ratio 4:3 mas full width */
	@media (min-width: 768px) and (max-width: 899px) {
		.banner-container {
			aspect-ratio: 4 / 3;
			min-height: 400px;
		}
	}
	
	/* =============================================================================
	   SLIDES
	   ============================================================================= */
	
	.banner-slides {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
	
	.banner-slide {
		position: absolute;
		inset: 0;
		transition: transform var(--transition-slide);
		will-change: transform;
		overflow: hidden;
	}
	
	.banner-image-link {
		display: block;
		width: 100%;
		height: 100%;
		position: relative;
	}
	
	.banner-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		background-color: var(--color-background);
		display: block;
		min-height: 300px;
	}
	
	/* Responsive image heights */
	@media (min-width: 768px) and (max-width: 899px) {
		.banner-image {
			min-height: 400px;
		}
	}
	
	@media (min-width: 900px) and (max-width: 1023px) {
		.banner-image {
			min-height: 450px;
		}
	}
	
	@media (min-width: 1024px) {
		.banner-image {
			min-height: calc(var(--banner-height-desktop) - var(--banner-padding-top));
		}
		
		/* Quando tem countdown, a imagem ocupa toda a altura disponível */
		.banner-container--with-countdown .banner-image {
			min-height: calc(var(--banner-height-desktop) - var(--banner-padding-top));
			height: 100%;
		}
	}
	
	/* =============================================================================
	   NAVIGATION ARROWS
	   ============================================================================= */
	
	.banner-arrow {
		position: absolute;
		background: transparent;
		border: none;
		cursor: pointer;
		width: var(--arrow-size);
		height: var(--arrow-size);
		display: none; /* Hidden on mobile by default for full width */
		align-items: center;
		justify-content: center;
		outline: none;
		padding: 0;
		z-index: 50;
		top: 50%;
		transform: translateY(-50%);
		transition: opacity var(--transition-fast);
	}
	
	.banner-arrow:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	.banner-arrow:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.banner-arrow--left {
		left: var(--spacing-sm);
	}
	
	.banner-arrow--right {
		right: var(--spacing-sm);
	}
	
	/* Responsive arrow positioning */
	/* Mobile e iPad Mini até 899px: setas escondidas para layout full width limpo */
	@media (max-width: 899px) {
		.banner-arrow {
			display: none;
		}
	}
	
	/* Tablet médio: 900px - 1023px */
	@media (min-width: 900px) and (max-width: 1023px) {
		.banner-arrow {
			display: flex;
		}
		
		.banner-arrow--left {
			left: max(var(--spacing-lg), calc(50vw - 45vw));
		}
		
		.banner-arrow--right {
			right: max(var(--spacing-lg), calc(50vw - 45vw));
		}
	}
	
	@media (min-width: 1024px) {
		.banner-arrow {
			display: flex;
			top: 50%; /* Centraliza na altura total do banner */
			transform: translateY(-50%);
		}
		
		.banner-arrow--left {
			left: max(40px, calc(50% - 600px - 80px));
		}
		
		.banner-arrow--right {
			right: max(40px, calc(50% - 600px - 80px));
		}
	}
	
	@media (min-width: 1440px) {
		.banner-arrow--left {
			left: calc(50% - 700px);
		}
		
		.banner-arrow--right {
			right: calc(50% - 700px);
		}
	}
	
	/* =============================================================================
	   INDICATORS
	   ============================================================================= */
	
	.banner-indicators {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
		padding: 0; /* Remove padding para layout full width */
	}
	
	/* Mobile até 767px: padding 0 para full width */
	@media (max-width: 767px) {
		.banner-indicators {
			padding: 0;
			margin-top: var(--spacing-sm);
		}
	}
	
	/* iPad Mini e tablets pequenos: 768px - 899px */
	@media (min-width: 768px) and (max-width: 899px) {
		.banner-indicators {
			gap: 9px;
			margin-top: 18px;
			padding: 0; /* Full width também */
		}
	}
	
	@media (min-width: 900px) and (max-width: 1023px) {
		.banner-indicators {
			gap: 11px;
			margin-top: 22px;
			padding: 0 2.5vw;
		}
	}
	
	@media (min-width: 1024px) {
		.banner-indicators {
			gap: 12px;
			margin-top: var(--spacing-lg);
			padding: 0;
		}
	}
	
	.banner-indicator {
		width: 50px;
		height: 3px;
		flex-shrink: 0;
		border-radius: var(--border-radius-full);
		background: var(--color-indicator);
		opacity: 0.2;
		border: none;
		cursor: pointer;
		transition: all var(--transition-fast);
		outline: none;
		position: relative;
		padding: 0;
	}
	
	@media (min-width: 768px) and (max-width: 899px) {
		.banner-indicator {
			width: 55px;
		}
	}
	
	@media (min-width: 900px) and (max-width: 1023px) {
		.banner-indicator {
			width: 62px;
		}
	}
	
	@media (min-width: 1024px) {
		.banner-indicator {
			width: 66.502px;
			height: 3.011px;
		}
	}
	
	.banner-indicator--active {
		background: var(--color-primary);
		opacity: 1;
	}
	
	.banner-indicator:hover:not(.banner-indicator--active) {
		opacity: 0.4;
	}
	
	.banner-indicator:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	.banner-indicator:disabled {
		cursor: not-allowed;
	}
	
	/* =============================================================================
	   LOADING & PLACEHOLDERS
	   ============================================================================= */
	
	.banner-loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-loading-bg);
	}
	
	.banner-spinner {
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
	
	.image-placeholder {
		position: absolute;
		inset: 0;
		background-color: var(--color-background);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}
	
	.placeholder-content {
		text-align: center;
		color: var(--color-placeholder);
		padding: var(--spacing-sm);
	}
	
	.placeholder-icon {
		width: var(--spacing-xl);
		height: var(--spacing-xl);
		margin: 0 auto var(--spacing-xs);
		opacity: 0.5;
	}
	
	@media (min-width: 768px) and (max-width: 1023px) {
		.placeholder-icon {
			width: 40px;
			height: 40px;
			margin: 0 auto 12px;
		}
	}
	
	@media (min-width: 1024px) {
		.placeholder-icon {
			width: var(--arrow-size);
			height: var(--arrow-size);
			margin: 0 auto 12px;
		}
	}
	
	.placeholder-content p {
		margin: 0;
		font-size: 12px;
		font-weight: 500;
		font-family: 'Lato', sans-serif;
	}
	
	@media (min-width: 768px) and (max-width: 1023px) {
		.placeholder-content p {
			font-size: 13px;
		}
	}
	
	@media (min-width: 1024px) {
		.placeholder-content p {
			font-size: 14px;
		}
	}
	
	.image-loading {
		opacity: 0;
	}
</style> 