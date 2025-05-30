<script lang="ts">
	import { onMount } from 'svelte';
	
	interface BannerSlide {
		id: string;
		image: string;
		imageAlt: string;
		title?: string;
		subtitle?: string;
		ctaText?: string;
		ctaLink?: string;
		mobileImage?: string; // Imagem específica para mobile se necessário
	}
	
	interface HomeBannerProps {
		slides?: BannerSlide[];
		autoPlayInterval?: number;
		autoPlay?: boolean;
		showIndicators?: boolean;
		showArrows?: boolean;
		fullWidth?: boolean; // Nova prop para controlar fullwidth
		class?: string;
	}
	
	let { 
		slides = [
			{
				id: '1',
				image: '/placeholder.jpg',
				imageAlt: 'Banner promocional 1',
				title: 'Ofertas Especiais',
				subtitle: 'Até 50% OFF em produtos selecionados',
				ctaText: 'COMPRAR AGORA',
				ctaLink: '/promocoes'
			},
			{
				id: '2',
				image: '/placeholder.jpg',
				imageAlt: 'Banner promocional 2',
				title: 'Novidades',
				subtitle: 'Confira os últimos lançamentos',
				ctaText: 'VER MAIS',
				ctaLink: '/novidades'
			},
			{
				id: '3',
				image: '/placeholder.jpg',
				imageAlt: 'Banner promocional 3',
				title: 'Frete Grátis',
				subtitle: 'Em compras acima de R$ 199',
				ctaText: 'APROVEITAR',
				ctaLink: '/frete-gratis'
			}
		],
		autoPlayInterval = 5000,
		autoPlay = true,
		showIndicators = true,
		showArrows = true,
		fullWidth = false,
		class: className = ''
	}: HomeBannerProps = $props();
	
	// State
	let currentSlide = $state(0);
	let isPaused = $state(false);
	let touchStartX = 0;
	let touchEndX = 0;
	let carouselInterval: ReturnType<typeof setInterval>;
	let isLoaded = $state(false);
	let isMobile = $state(false); // Adicionar estado para detectar mobile
	
	// Derived
	let totalSlides = $derived(slides.length);
	let hasMultipleSlides = $derived(totalSlides > 1);
	
	onMount(() => {
		isLoaded = true;
		
		// Detectar se é mobile após o mount
		const checkIsMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		
		checkIsMobile();
		
		// Adicionar listener para mudança de tamanho
		const handleResize = () => checkIsMobile();
		window.addEventListener('resize', handleResize);
		
		if (autoPlay && hasMultipleSlides) {
			startCarousel();
		}
		
		return () => {
			clearInterval(carouselInterval);
			window.removeEventListener('resize', handleResize);
		};
	});
	
	function startCarousel() {
		if (!isPaused && hasMultipleSlides && autoPlay) {
			carouselInterval = setInterval(() => {
				currentSlide = (currentSlide + 1) % totalSlides;
			}, autoPlayInterval);
		}
	}
	
	function pauseCarousel() {
		isPaused = true;
		clearInterval(carouselInterval);
	}
	
	function resumeCarousel() {
		isPaused = false;
		clearInterval(carouselInterval);
		if (autoPlay) {
			startCarousel();
		}
	}
	
	function goToSlide(index: number) {
		if (index >= 0 && index < totalSlides) {
			currentSlide = index;
			clearInterval(carouselInterval);
			if (autoPlay && hasMultipleSlides) {
				startCarousel();
			}
		}
	}
	
	function nextSlide() {
		goToSlide((currentSlide + 1) % totalSlides);
	}
	
	function prevSlide() {
		goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
	}
	
	function handleKeyDown(event: KeyboardEvent) {
		if (!hasMultipleSlides) return;
		
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
	
	// Touch handlers para swipe no mobile
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
		
		// Reset values
		touchStartX = 0;
		touchEndX = 0;
		resumeCarousel();
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<section 
	class="relative w-full overflow-hidden {className}"
	role="region"
	aria-label="Banners promocionais"
	aria-live="polite"
	onmouseenter={pauseCarousel}
	onmouseleave={resumeCarousel}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<!-- Container responsivo com dimensões específicas -->
	<!-- Mobile: proporção quadrada (1:1) com largura responsiva -->
	<!-- Desktop: 1115x560px (retangular) ou fullwidth -->
	<div class="banner-wrapper {fullWidth ? 'banner-wrapper--fullwidth' : ''}">
		<div class="banner-container {fullWidth ? 'banner-container--fullwidth' : ''}">
			
			<!-- Slides Container -->
			<div class="relative w-full h-full overflow-hidden">
				{#each slides as slide, index}
					<div 
						class="absolute inset-0 transition-transform duration-700 ease-in-out"
						style="transform: translateX({(index - currentSlide) * 100}%)"
						aria-hidden={index !== currentSlide}
					>
						<!-- Imagem responsiva -->
						<div class="relative w-full h-full">
							<img
								src={slide.mobileImage && isMobile ? slide.mobileImage : slide.image}
								alt={slide.imageAlt}
								class="w-full h-full object-cover"
								loading={index === 0 ? 'eager' : 'lazy'}
								draggable="false"
							/>
							
							<!-- Overlay com gradiente para melhor legibilidade do texto -->
							{#if slide.title || slide.subtitle || slide.ctaText}
								<div class="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent"></div>
							{/if}
						</div>
						
						<!-- Conteúdo do slide -->
						{#if slide.title || slide.subtitle || slide.ctaText}
							<div class="absolute inset-0 flex items-center">
								<!-- Container do conteúdo - sempre limitado mesmo em fullwidth -->
								<div class="{fullWidth ? 'w-full max-w-7xl mx-auto px-4 lg:px-8' : 'w-full px-4 lg:px-8'}">
									<div class="max-w-lg lg:max-w-xl text-white">
										{#if slide.title}
											<h2 class="text-xl lg:text-4xl xl:text-5xl font-bold mb-2 lg:mb-4 leading-tight">
												{slide.title}
											</h2>
										{/if}
										
										{#if slide.subtitle}
											<p class="text-sm lg:text-xl mb-4 lg:mb-6 opacity-90 leading-relaxed">
												{slide.subtitle}
											</p>
										{/if}
										
										{#if slide.ctaText && slide.ctaLink}
											<a
												href={slide.ctaLink}
												class="inline-block bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 lg:py-4 lg:px-8 rounded-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-xs lg:text-base"
												aria-label="{slide.ctaText} - {slide.title}"
											>
												{slide.ctaText}
											</a>
										{/if}
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
			
			{#if hasMultipleSlides && showArrows}
				<!-- Setas de navegação - apenas desktop -->
				<button 
					onclick={prevSlide}
					class="banner-arrow banner-arrow--left"
					aria-label="Slide anterior"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
						<circle cx="24" cy="24" r="24" fill="#00BFB3"/>
						<path d="M26.9494 30.3164L21.0547 24.0006L26.9494 17.6848" stroke="white" stroke-width="1.44457"/>
					</svg>
				</button>
				
				<button 
					onclick={nextSlide}
					class="banner-arrow banner-arrow--right"
					aria-label="Próximo slide"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
						<circle cx="24" cy="24" r="24" fill="#00BFB3"/>
						<path d="M21.0506 17.6836L26.9453 23.9994L21.0506 30.3152" stroke="white" stroke-width="1.44457"/>
					</svg>
				</button>
			{/if}
			
			<!-- Loading spinner -->
			{#if !isLoaded}
				<div class="absolute inset-0 flex items-center justify-center bg-white">
					<div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
				</div>
			{/if}
		</div>
		
		{#if hasMultipleSlides && showIndicators}
			<!-- Indicadores de slide abaixo do banner -->
			<div class="banner-indicators">
				{#each slides as _, index}
					<button
						onclick={() => goToSlide(index)}
						class="banner-indicator {index === currentSlide ? 'banner-indicator--active' : ''}"
						aria-label="Ir para slide {index + 1}"
					></button>
				{/each}
			</div>
		{/if}
	</div>
</section>

<style>
	/* Wrapper geral do banner */
	.banner-wrapper {
		position: relative;
		margin: 0 auto;
		width: 100%;
	}
	
	/* Versão fullwidth */
	.banner-wrapper--fullwidth {
		margin: 0;
		max-width: none;
	}
	
	/* Container principal do banner */
	.banner-container {
		position: relative;
		overflow: hidden;
		
		/* Mobile: proporção quadrada (1:1) com largura responsiva */
		width: 100%;
		max-width: 767px;
		margin: 0 auto;
		aspect-ratio: 1 / 1;
		flex-shrink: 0;
	}
	
	/* Desktop: proporção 1115:560 (aproximadamente 2:1) */
	@media (min-width: 1024px) {
		.banner-container {
			max-width: 1115px;
			aspect-ratio: 1115 / 560;
		}
		
		/* Versão fullwidth desktop */
		.banner-container--fullwidth {
			max-width: 100vw;
			height: 60vh; /* Altura relativa à viewport */
			aspect-ratio: unset;
		}
	}
	
	/* Para telas muito grandes, limitar altura máxima */
	@media (min-width: 1920px) {
		.banner-container--fullwidth {
			height: 70vh;
			max-height: 800px;
		}
	}
	
	/* Indicadores de slide posicionados abaixo do banner */
	.banner-indicators {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		margin-top: 24px;
		margin-bottom: 20px;
		padding: 0 16px;
	}
	
	@media (min-width: 1024px) {
		.banner-indicators {
			gap: 12px;
			margin-top: 32px;
			margin-bottom: 28px;
		}
	}
	
	/* Indicador individual */
	.banner-indicator {
		/* Dimensões exatas da referência */
		width: 66.502px;
		height: 3.011px;
		flex-shrink: 0;
		
		/* Estilo da referência */
		border-radius: 48.949px;
		background: #000;
		opacity: 0.2;
		
		/* Interação */
		border: none;
		cursor: pointer;
		transition: all 0.3s ease;
		
		/* Acessibilidade */
		outline: none;
		position: relative;
	}
	
	/* Indicador ativo */
	.banner-indicator--active {
		background: var(--general-brand100, #00BFB3);
		opacity: 1;
	}
	
	/* Estados de foco para acessibilidade */
	.banner-indicator:focus {
		outline: 2px solid #00BFB3;
		outline-offset: 2px;
	}
	
	/* Hover apenas para desktop */
	@media (min-width: 1024px) {
		.banner-indicator:hover:not(.banner-indicator--active) {
			opacity: 0.4;
		}
	}
	
	/* Responsividade dos indicadores para telas muito pequenas */
	@media (max-width: 480px) {
		.banner-indicator {
			width: 50px;
			height: 2.5px;
		}
		
		.banner-indicators {
			gap: 6px;
			margin-top: 12px;
		}
	}
	
	/* Setas de navegação - apenas desktop */
	.banner-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.3s ease;
		
		/* Dimensões exatas conforme especificação */
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		
		/* Escondido no mobile */
		display: none;
		
		/* Acessibilidade */
		outline: none;
		padding: 0;
	}
	
	/* Mostrar apenas no desktop */
	@media (min-width: 1024px) {
		.banner-arrow {
			display: flex;
			align-items: center;
			justify-content: center;
		}
		
		.banner-arrow:hover {
			transform: translateY(-50%) scale(1.05);
		}
		
		.banner-arrow:focus {
			outline: 2px solid #00BFB3;
			outline-offset: 2px;
		}
	}
	
	/* Posicionamento das setas */
	.banner-arrow--left {
		left: 16px;
	}
	
	.banner-arrow--right {
		right: 16px;
	}
</style> 