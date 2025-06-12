<script lang="ts">
	import { onMount } from 'svelte';
	import { topbarService, type TopBarMessage } from '$lib/services/topbarService';
	
	interface Props {
		messages?: TopBarMessage[];
		intervalMs?: number;
		minSwipeDistance?: number;
		autoPlay?: boolean;
		pauseOnHover?: boolean;
		class?: string;
	}
	
	let { 
		messages,
		intervalMs = 4000,
		minSwipeDistance = 50,
		autoPlay = true,
		pauseOnHover = true,
		class: className = ''
	}: Props = $props();
	
	// Dynamic messages state
	let dynamicMessages = $state<TopBarMessage[]>([]);
	let isLoading = $state(true);
	let loadError = $state<string | null>(null);
	
	// Use provided messages or dynamic ones
	let activeMessages = $derived(messages || dynamicMessages);
	
	let currentSlide = $state(0);
	let carouselPaused = $state(false);
	let carouselInterval: ReturnType<typeof setInterval> | null = null;
	
	// Animation state - Protege contra cliques múltiplos durante transição
	// Previne comportamento inconsistente quando usuário clica rapidamente nas setas
	let isTransitioning = $state(false);
	const TRANSITION_DURATION = 500; // ms - deve coincidir com CSS transition
	
	// Touch state
	let touchStartX = 0;
	let touchEndX = 0;
	
	onMount(() => {
		// Load dynamic messages if not provided via props
		if (!messages) {
			loadDynamicMessages();
		} else {
			isLoading = false;
		}
		
		// Cleanup ao desmontar componente
		return () => {
			if (carouselInterval) {
				clearInterval(carouselInterval);
				carouselInterval = null;
			}
		};
	});
	
	async function loadDynamicMessages() {
		try {
			isLoading = true;
			loadError = null;
			dynamicMessages = await topbarService.getMessages();
			console.log('✅ TopBar: Mensagens carregadas do banco:', dynamicMessages.length);
		} catch (error) {
			console.error('❌ TopBar: Erro ao carregar mensagens:', error);
			loadError = 'Erro ao carregar mensagens';
			// Fallback will be used automatically via topbarService
			dynamicMessages = await topbarService.getMessages();
		} finally {
			isLoading = false;
			// Start carousel after messages are loaded
			if (autoPlay && activeMessages.length > 0) {
				setTimeout(() => {
					startCarousel();
				}, 1000);
			}
		}
	}
	
	function startCarousel() {
		if (carouselInterval || !autoPlay) return;
		
		carouselInterval = setInterval(() => {
			if (!carouselPaused) {
				currentSlide = (currentSlide + 1) % activeMessages.length;
			}
		}, intervalMs);
	}
	
	function stopCarousel() {
		if (carouselInterval) {
			clearInterval(carouselInterval);
			carouselInterval = null;
		}
	}
	
	function restartCarousel() {
		stopCarousel();
		if (autoPlay) {
			startCarousel();
		}
	}
	
	function pauseCarousel() {
		if (pauseOnHover) {
			carouselPaused = true;
		}
	}
	
	function resumeCarousel() {
		if (pauseOnHover) {
			carouselPaused = false;
		}
	}
	
	function goToSlide(index: number): void {
		// Bloqueia cliques múltiplos durante animação
		if (isTransitioning || index === currentSlide) return;
		
		isTransitioning = true;
		currentSlide = index;
		restartCarousel();
		
		// Libera cliques após animação terminar
		setTimeout(() => {
			isTransitioning = false;
		}, TRANSITION_DURATION);
	}
	
	// Funções de navegação com proteção
	function goToPrevious(): void {
		if (isTransitioning) return;
		goToSlide((currentSlide - 1 + activeMessages.length) % activeMessages.length);
	}
	
	function goToNext(): void {
		if (isTransitioning) return;
		goToSlide((currentSlide + 1) % activeMessages.length);
	}
	
	// Touch handlers para mobile
	function handleTouchStart(e: TouchEvent): void {
		touchStartX = e.touches[0].clientX;
	}
	
	function handleTouchMove(e: TouchEvent): void {
		touchEndX = e.touches[0].clientX;
	}
	
	function handleTouchEnd(): void {
		if (!touchStartX || !touchEndX || isTransitioning) return;
		
		const swipeDistance = touchStartX - touchEndX;
		
		if (Math.abs(swipeDistance) > minSwipeDistance) {
			if (swipeDistance > 0) {
				// Swipe left - next slide
				goToNext();
			} else {
				// Swipe right - previous slide
				goToPrevious();
			}
		}
		
		// Reset values
		touchStartX = 0;
		touchEndX = 0;
	}
	
	// Keyboard navigation
	function handleKeyDown(event: KeyboardEvent): void {
		if (isTransitioning) return;
		
		switch (event.key) {
			case 'ArrowLeft':
				goToPrevious();
				break;
			case 'ArrowRight':
				goToNext();
				break;
		}
	}
	
	// Helper function for banner icons
	function getBannerIcon(type: TopBarMessage['icon']): string {
		const icons: Record<TopBarMessage['icon'], string> = {
			payment: `<svg class="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<rect x="2" y="5" width="20" height="14" rx="2" stroke="#333" stroke-width="2"/>
				<path d="M2 9H22" stroke="#333" stroke-width="2"/>
				<path d="M6 13H10" stroke="#333" stroke-width="2" stroke-linecap="round"/>
			</svg>`,
			shipping: `<svg class="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path d="M1 12H16V18.5C16 19.3284 15.3284 20 14.5 20H12.5" stroke="#333" stroke-width="2" stroke-linecap="round"/>
				<path d="M16 12H20.5C21.3284 12 22 12.6716 22 13.5V17.5C22 18.3284 21.3284 19 20.5 19H19" stroke="#333" stroke-width="2" stroke-linecap="round"/>
				<circle cx="8" cy="20" r="2" stroke="#333" stroke-width="2"/>
				<circle cx="18" cy="20" r="2" stroke="#333" stroke-width="2"/>
				<path d="M16 12V6C16 5.17157 15.3284 4.5 14.5 4.5H1" stroke="#333" stroke-width="2" stroke-linecap="round"/>
			</svg>`,
			discount: `<svg class="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<circle cx="12" cy="12" r="10" stroke="#333" stroke-width="2"/>
				<path d="M8 12L11 15L16 10" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M12 6V8" stroke="#333" stroke-width="2" stroke-linecap="round"/>
				<path d="M12 16V18" stroke="#333" stroke-width="2" stroke-linecap="round"/>
			</svg>`
		};
		return icons[type];
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<!-- TopBar Desktop -->
<div 
	class="topbar-desktop {className}"
	role="region"
	aria-label="Promoções"
	aria-live="polite"
	onmouseenter={pauseCarousel}
	onmouseleave={resumeCarousel}
>
	<div class="topbar-container {isTransitioning ? 'transitioning' : ''}">
		<!-- Slides Container -->
		<div class="slides-container">
			{#each activeMessages as message, index}
				<div 
					class="slide"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="slide-link">
						{@html getBannerIcon(message.icon)}
						<span class="slide-text">{message.text}</span>
						<span class="slide-cta">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		<!-- Navigation Arrows -->
		<button 
			onclick={goToPrevious}
			class="nav-arrow nav-arrow-left {isTransitioning ? 'nav-arrow-disabled' : ''}"
			aria-label="Slide anterior"
			disabled={isTransitioning}
		>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		
		<button 
			onclick={goToNext}
			class="nav-arrow nav-arrow-right {isTransitioning ? 'nav-arrow-disabled' : ''}"
			aria-label="Próximo slide"
			disabled={isTransitioning}
		>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
		
		<!-- Dots Indicator -->
		<div class="dots-container">
			{#each activeMessages as _, index}
				<button
					onclick={() => goToSlide(index)}
					class="dot {index === currentSlide ? 'dot-active' : 'dot-inactive'} {isTransitioning ? 'dot-disabled' : ''}"
					aria-label="Ir para slide {index + 1}"
					disabled={isTransitioning}
				></button>
			{/each}
		</div>
	</div>
</div>

<!-- TopBar Mobile -->
<div 
	class="topbar-mobile {className}"
	role="region"
	aria-label="Promoções"
	aria-live="polite"
	onmouseenter={pauseCarousel}
	onmouseleave={resumeCarousel}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<div class="topbar-container {isTransitioning ? 'transitioning' : ''}">
		<!-- Slides Container -->
		<div class="slides-container">
			{#each activeMessages as message, index}
				<div 
					class="slide mobile-slide"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="slide-link mobile-slide-link">
						{@html getBannerIcon(message.icon)}
						<span class="slide-text mobile-slide-text">{message.text}</span>
						<span class="slide-cta mobile-slide-cta">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		<!-- Dots Indicator Mobile -->
		<div class="dots-container mobile-dots">
			{#each activeMessages as _, index}
				<button
					onclick={() => goToSlide(index)}
					class="dot {index === currentSlide ? 'dot-active' : 'dot-inactive'} {isTransitioning ? 'dot-disabled' : ''}"
					aria-label="Ir para slide {index + 1}"
					disabled={isTransitioning}
				></button>
			{/each}
		</div>
	</div>
</div>

<style>
	/* Base Styles */
	.topbar-desktop {
		display: none;
		background: white;
		height: 32px;
		margin-bottom: 8px;
		position: relative;
		overflow: hidden;
	}
	
	.topbar-mobile {
		display: block;
		background: white;
		height: 32px;
		margin-bottom: 8px;
		position: relative;
		overflow: hidden;
	}
	
	.topbar-container {
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		height: 100%;
		position: relative;
	}
	
	.slides-container {
		position: relative;
		height: 100%;
	}
	
	.slide {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 500ms ease-in-out;
	}
	
	/* Feedback visual durante animação */
	.topbar-container {
		position: relative;
	}
	
	.topbar-container::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 191, 179, 0.05);
		opacity: 0;
		transition: opacity 200ms ease-out;
		pointer-events: none;
	}
	
	.topbar-container.transitioning::after {
		opacity: 1;
	}
	
	.slide-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		transition: opacity 200ms ease-out;
	}
	
	.slide-link:hover {
		opacity: 0.9;
	}
	
	.slide-text {
		color: black;
		font-family: 'Lato', sans-serif;
		font-weight: 500;
		font-size: 12px;
	}
	
	.slide-cta {
		color: #00BFB3;
		font-family: 'Lato', sans-serif;
		font-weight: 900;
		font-size: 10px;
		text-transform: uppercase;
		text-decoration: underline;
	}
	
	.slide-cta:hover {
		text-decoration: none;
	}
	
	/* Navigation Arrows */
	.nav-arrow {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: #6b7280;
		cursor: pointer;
		border-radius: 50%;
		transition: all 200ms ease-out;
	}
	
	.nav-arrow:hover:not(:disabled) {
		color: #374151;
		background: #f3f4f6;
	}
	
	.nav-arrow:disabled,
	.nav-arrow-disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}
	
	.nav-arrow-left {
		left: 50%;
		transform: translateY(-50%) translateX(-200px);
	}
	
	.nav-arrow-right {
		left: 50%;
		transform: translateY(-50%) translateX(180px);
	}
	
	/* Dots Indicator */
	.dots-container {
		position: absolute;
		bottom: 2px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 4px;
	}
	
	.dot {
		width: 2px;
		height: 2px;
		border-radius: 50%;
		border: none;
		background: #9ca3af;
		cursor: pointer;
		transition: all 300ms ease-out;
	}
	
	.dot:hover:not(:disabled) {
		background: #6b7280;
	}
	
	.dot:disabled,
	.dot-disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}
	
	.dot-active {
		background: #374151;
		width: 8px;
	}
	
	.dot-inactive {
		background: #9ca3af;
	}
	
	/* Mobile Styles */
	.mobile-slide-link {
		padding: 0 16px;
	}
	
	.mobile-slide-text {
		font-size: 10px;
	}
	
	.mobile-slide-cta {
		font-size: 9px;
	}
	
	/* Desktop Media Query */
	@media (min-width: 768px) {
		.topbar-desktop {
			display: block;
			height: 36px;
		}
		
		.topbar-mobile {
			display: none;
		}
	}
	
	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.slide {
			transition: none;
		}
		
		.nav-arrow,
		.dot {
			transition: none;
		}
	}
	
	/* Focus styles for accessibility */
	.nav-arrow:focus,
	.dot:focus {
		outline: 2px solid #00BFB3;
		outline-offset: 2px;
	}
	
	.slide-link:focus {
		outline: 2px solid #00BFB3;
		outline-offset: 2px;
		border-radius: 4px;
	}
</style> 