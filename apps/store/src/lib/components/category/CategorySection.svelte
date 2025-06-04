<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { 
		CATEGORY_GROUPS, 
		DEFAULT_ACTIVE_TAB, 
		LOADING_DELAY,
		type CategoryItem,
		type CategoryGroup 
	} from './categoryData';
	
	// =============================================================================
	// TYPES
	// =============================================================================
	
	interface CategorySectionProps {
		title?: string;
		class?: string;
	}
	
	interface CarouselConfig {
		cardWidth: number;
		gap: number;
		visibleCards: number;
	}
	
	interface SliderConfig {
		thumbPercentage: number;
		transitionDuration: string;
	}
	
	// =============================================================================
	// PROPS
	// =============================================================================
	
	let {
		title = 'Compre por categoria',
		class: className = ''
	}: CategorySectionProps = $props();
	
	// =============================================================================
	// CONSTANTS
	// =============================================================================
	
	const INTERSECTION_THRESHOLD = 0.6;
	const SETUP_DELAY = 100;
	const TRANSITION_DELAY = 300;
	const RESIZE_DEBOUNCE = 100;
	
	const SLIDER_CONFIG: SliderConfig = {
		thumbPercentage: 12.5,
		transitionDuration: '0.3s'
	} as const;
	
	const BREAKPOINTS = {
		mobile: 768,
		tablet: 1024,
		desktop: 1440
	} as const;
	
	// =============================================================================
	// STATE
	// =============================================================================
	
	let activeTab = $state(DEFAULT_ACTIVE_TAB);
	let isLoading = $state(true);
	let isMobile = $state(false);
	let isTablet = $state(false);
	let sliderPosition = $state(0);
	let currentItemIndex = $state(0);
	let carouselOffset = $state(0);
	
	// =============================================================================
	// VARIABLES
	// =============================================================================
	
	let tabsContainer = $state<HTMLElement>();
	let gridContainer = $state<HTMLElement>();
	let resizeTimer: NodeJS.Timeout;
	let intersectionObserver: IntersectionObserver;
	
	// =============================================================================
	// DERIVED
	// =============================================================================
	
	let currentItems = $derived(
		CATEGORY_GROUPS.find(group => group.id === activeTab)?.items || []
	);
	
	let currentItem = $derived(
		currentItems[currentItemIndex] || currentItems[0]
	);
	
	let carouselConfig = $derived(() => {
		if (typeof window === 'undefined') {
			return { cardWidth: 350, gap: 24, visibleCards: 4 };
		}
		
		const width = window.innerWidth;
		
		if (width < BREAKPOINTS.mobile) {
			return { cardWidth: 280, gap: 16, visibleCards: 1.2 };
		} else if (width < BREAKPOINTS.tablet) {
			return { 
				cardWidth: Math.min(Math.max(width * 0.35, 250), 320), 
				gap: Math.max(width * 0.02, 16),
				visibleCards: 2.2
			};
		} else if (width < BREAKPOINTS.desktop) {
			return { 
				cardWidth: Math.min(Math.max(width * 0.28, 280), 350), 
				gap: Math.max(width * 0.02, 20),
				visibleCards: 3.2
			};
		} else {
			return { cardWidth: 350, gap: 24, visibleCards: 4 };
		}
	});
	
	let maxCarouselIndex = $derived(
		Math.max(0, currentItems.length - carouselConfig().visibleCards)
	);
	
	let cardStepWidth = $derived(
		carouselConfig().cardWidth + carouselConfig().gap
	);
	
	let hasMultipleItems = $derived(currentItems.length > 1);
	
	// =============================================================================
	// FUNCTIONS
	// =============================================================================
	
	function formatPrice(price: string): string {
		return price.replace('.', ',');
	}
	
	function handleTabChange(tabId: string): void {
		if (tabId === activeTab) return;
		
		activeTab = tabId;
		currentItemIndex = 0;
		
		// Reset scroll position no mobile/tablet
		resetGridScroll();
		
		updateSliderPosition();
		
		// Reconfigurar intersection observer após mudança de categoria
		setTimeout(() => {
			setupIntersectionObserver();
		}, SETUP_DELAY);
	}
	
	function updateSliderPosition(): void {
		if (!isMobile && !isTablet && hasMultipleItems) {
			const totalItems = currentItems.length;
			const availablePercentage = 100 - SLIDER_CONFIG.thumbPercentage;
			sliderPosition = (currentItemIndex / Math.max(1, totalItems - 1)) * availablePercentage;
			updateCarouselOffset();
		}
	}
	
	function updateCarouselOffset(): void {
		if (isMobile || isTablet) return;
		
		const totalItems = currentItems.length;
		const visibleCards = Math.floor(carouselConfig().visibleCards);
		const maxPosition = Math.max(0, totalItems - visibleCards);
		
		let carouselPosition;
		
		if (currentItemIndex <= 0) {
			carouselPosition = 0;
		} else if (currentItemIndex >= totalItems - 1) {
			carouselPosition = maxPosition;
		} else if (currentItemIndex >= totalItems - 2) {
			carouselPosition = maxPosition;
		} else {
			carouselPosition = Math.min(currentItemIndex, maxPosition);
		}
		
		carouselOffset = -carouselPosition * cardStepWidth;
	}
	
	function checkViewport(): void {
		if (typeof window === 'undefined') return;
		
		const width = window.innerWidth;
		const newIsMobile = width < BREAKPOINTS.tablet; // Inclui tablets como mobile para navegação
		const newIsTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
		
		if (newIsMobile !== isMobile || newIsTablet !== isTablet) {
			isMobile = newIsMobile;
			isTablet = newIsTablet;
			updateSliderPosition();
			updateCSSVariables();
			
			// Reconfigurar intersection observer após mudança de viewport
			setTimeout(() => {
				setupIntersectionObserver();
			}, SETUP_DELAY);
		}
	}
	
	function handleResize(): void {
		if (resizeTimer) {
			clearTimeout(resizeTimer);
		}
		
		resizeTimer = setTimeout(() => {
			checkViewport();
			updateCSSVariables();
		}, RESIZE_DEBOUNCE);
	}
	
	function navigateItem(direction: number): void {
		if (!hasMultipleItems) return;
		
		const totalItems = currentItems.length;
		let newIndex = currentItemIndex + direction;
		
		if (newIndex < 0) {
			newIndex = totalItems - 1;
		} else if (newIndex >= totalItems) {
			newIndex = 0;
		}
		
		currentItemIndex = newIndex;
		updateSliderPosition();
	}
	
	function handleKeyDown(event: KeyboardEvent): void {
		if (!hasMultipleItems) return;
		
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				navigateItem(-1);
				break;
			case 'ArrowRight':
				event.preventDefault();
				navigateItem(1);
				break;
		}
	}
	
	function setupIntersectionObserver(): void {
		if (typeof window === 'undefined') return;
		
		try {
			// Limpar observer existente
			if (intersectionObserver) {
				intersectionObserver.disconnect();
			}
			
			// Apenas ativar no mobile e tablet
			if (!isMobile && !isTablet) return;
			
			// Verificar se gridContainer existe
			if (!gridContainer) return;
			
			intersectionObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting && entry.intersectionRatio > INTERSECTION_THRESHOLD) {
							const cardElement = entry.target as HTMLElement;
							const cardIndex = parseInt(cardElement.dataset.index || '0');
							currentItemIndex = cardIndex;
						}
					});
				},
				{
					root: gridContainer,
					rootMargin: '0px',
					threshold: [INTERSECTION_THRESHOLD]
				}
			);
			
			// Observar todos os cards
			const cards = gridContainer.querySelectorAll('.category__card');
			cards.forEach((card) => {
				intersectionObserver.observe(card);
			});
		} catch (error) {
			console.warn('Failed to setup intersection observer:', error);
		}
	}
	
	function cleanupIntersectionObserver(): void {
		if (intersectionObserver) {
			intersectionObserver.disconnect();
		}
	}
	
	function resetGridScroll(): void {
		if (gridContainer && (isMobile || isTablet)) {
			gridContainer.scrollTo({
				left: 0,
				behavior: 'smooth'
			});
		}
	}
	
	function updateCSSVariables(): void {
		if (typeof document === 'undefined') return;
		
		const config = carouselConfig();
		const root = document.documentElement;
		
		root.style.setProperty('--dynamic-card-width', `${config.cardWidth}px`);
		root.style.setProperty('--dynamic-gap', `${config.gap}px`);
		root.style.setProperty('--dynamic-visible-cards', config.visibleCards.toString());
	}
	
	// =============================================================================
	// LIFECYCLE
	// =============================================================================
	
	onMount(() => {
		checkViewport();
		updateCSSVariables();
		
		window.addEventListener('resize', handleResize);
		window.addEventListener('keydown', handleKeyDown);
		
		const loadingTimer = setTimeout(() => {
			isLoading = false;
			updateCSSVariables();
			// Setup intersection observer após loading
			setTimeout(() => {
				setupIntersectionObserver();
			}, SETUP_DELAY);
		}, LOADING_DELAY);
		
		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('keydown', handleKeyDown);
			
			if (resizeTimer) {
				clearTimeout(resizeTimer);
			}
			
			clearTimeout(loadingTimer);
			cleanupIntersectionObserver();
		};
	});
	
	onDestroy(() => {
		if (resizeTimer) {
			clearTimeout(resizeTimer);
		}
		cleanupIntersectionObserver();
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

<section 
	class="category {className}"
	aria-label="Seção de categorias de produtos"
>
	<div class="category__container">
		<!-- Header -->
		<header class="category__header">
			<h2 class="category__title">{title}</h2>
		</header>
		
		<!-- Tabs Navigation -->
		<div 
			class="category__tabs"
			aria-label="Navegação de categorias"
			bind:this={tabsContainer}
		>
			{#each CATEGORY_GROUPS as group (group.id)}
				<button
					class="category__tab"
					class:category__tab--active={activeTab === group.id}
					onclick={() => handleTabChange(group.id)}
					role="tab"
					aria-selected={activeTab === group.id}
					aria-controls="category-content-{group.id}"
				>
					{group.name}
				</button>
			{/each}
		</div>
		
		<!-- Content -->
		<div 
			class="category__content"
			id="category-content-{activeTab}"
			role="tabpanel"
			aria-labelledby="tab-{activeTab}"
		>
			{#if isLoading}
				<!-- Loading State -->
				<div class="category__grid" aria-label="Carregando produtos">
					{#each Array(4) as _, index}
						<div class="category__card category__card--loading" aria-hidden="true">
							<div class="category__card-image category__card-image--skeleton"></div>
							<div class="category__card-body">
								<div class="category__card-title category__card-title--skeleton"></div>
								<div class="category__card-description category__card-description--skeleton"></div>
								<div class="category__card-price category__card-price--skeleton"></div>
								<div class="category__card-button category__card-button--skeleton"></div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<!-- Products Grid -->
				<div class="category__carousel-container">
					<div 
						class="category__grid"
						style="transform: translateX({(isMobile || isTablet) ? 0 : carouselOffset}px); transition: transform {SLIDER_CONFIG.transitionDuration} ease;"
						bind:this={gridContainer}
					>
						{#each currentItems as item, index (item.id)}
							<article 
								class="category__card"
								class:category__card--active={index === currentItemIndex}
								aria-labelledby="card-title-{item.id}"
								data-index={index}
							>
								<!-- Image -->
								<div class="category__card-image">
									<img 
										src={item.image} 
										alt="{item.name} - {item.description}"
										loading={index < 4 ? 'eager' : 'lazy'}
										draggable="false"
									/>
								</div>
								
								<!-- Content -->
								<div class="category__card-body">
									<h3 
										class="category__card-title"
										id="card-title-{item.id}"
									>
										{item.name}
									</h3>
									<p class="category__card-description">
										{item.description}
									</p>
									<div class="category__card-bottom">
										<div class="category__card-price">
											A partir de <strong>R$ {formatPrice(item.price)}</strong>
										</div>
										<a 
											href="/busca?categoria={item.slug}" 
											class="category__card-button"
											aria-label="Comprar {item.name}"
										>
											<span>comprar</span>
											<svg xmlns="http://www.w3.org/2000/svg" width="5" height="8" viewBox="0 0 5 8" fill="none" aria-hidden="true">
												<path d="M1.16138 0.878662L3.78637 4.02865L1.16138 7.17864" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/>
											</svg>
										</a>
									</div>
								</div>
							</article>
						{/each}
					</div>
				</div>
			{/if}
		</div>
		
		<!-- Progress Slider -->
		{#if !isMobile && !isTablet && hasMultipleItems && !isLoading}
			<div class="category__slider" aria-hidden="true">
				<div class="category__slider-track"></div>
				<div 
					class="category__slider-thumb" 
					style="left: {sliderPosition}%; transition: left {SLIDER_CONFIG.transitionDuration} ease;"
				></div>
			</div>
		{/if}
		
		<!-- Navigation -->
		{#if !isMobile && !isTablet && hasMultipleItems && !isLoading}
			<div class="category__navigation" role="group" aria-label="Navegação entre produtos">
				<button 
					class="category__nav-button category__nav-button--prev"
					onclick={() => navigateItem(-1)}
					aria-label="Produto anterior"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35" fill="none" aria-hidden="true">
						<circle cx="17.5" cy="17.5" r="16.333" stroke="currentColor" stroke-width="1.7864"/>
						<path d="M19.5 12.5L14.5 17.5L19.5 22.5" stroke="currentColor" stroke-width="1.7864" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				
				<button 
					class="category__nav-button category__nav-button--next"
					onclick={() => navigateItem(1)}
					aria-label="Próximo produto"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35" fill="none" aria-hidden="true">
						<circle cx="17.5" cy="17.5" r="16.333" stroke="currentColor" stroke-width="1.7864"/>
						<path d="M15.5 12.5L20.5 17.5L15.5 22.5" stroke="currentColor" stroke-width="1.7864" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			</div>
		{/if}
	</div>
</section>

<style>
	/* =============================================================================
	   CSS CUSTOM PROPERTIES
	   ============================================================================= */
	
	.category {
		/* Colors */
		--color-primary: #00BFB3;
		--color-primary-light: #E0F7F6;
		--color-primary-dark: #00A89D;
		--color-secondary: #B3F0ED;
		--color-accent: #FF8403;
		--color-text: #000000;
		--color-text-light: #333333;
		--color-text-muted: #666666;
		--color-border: #D6D5D5;
		--color-border-hover: #B0B0B0;
		--color-background: #FFFFFF;
		--color-background-light: #F8F9FA;
		--color-background-card: #E0F7F6;
		--color-shadow: rgba(0, 0, 0, 0.08);
		--color-shadow-hover: rgba(0, 0, 0, 0.12);
		--color-loading-bg: #F0F0F0;
		--color-loading-shimmer: rgba(255, 255, 255, 0.8);
		
		/* Spacing */
		--spacing-xs: 8px;
		--spacing-sm: 12px;
		--spacing-md: 16px;
		--spacing-lg: 20px;
		--spacing-xl: 24px;
		--spacing-2xl: 32px;
		--spacing-3xl: 40px;
		--spacing-4xl: 48px;
		
		/* Typography */
		--font-family: 'Lato', sans-serif;
		--font-size-title-mobile: 28px;
		--font-size-title-tablet: 32px;
		--font-size-title-desktop: 36px;
		--font-size-tab: 12px;
		--font-size-card-title: 17px;
		--font-size-card-description: 12px;
		--font-size-card-price: 13px;
		--font-size-button: 11px;
		--font-weight-normal: 300;
		--font-weight-medium: 600;
		--font-weight-bold: 700;
		--font-weight-extra-bold: 800;
		--line-height-normal: normal;
		--line-height-card-title: 1.2;
		--line-height-card-description: 1.1;
		--line-height-tab: 1.4;
		--letter-spacing-title: 0.5px;
		--letter-spacing-tab: 0.24px;
		--letter-spacing-card-title: 0.34px;
		--letter-spacing-card-description: 0.24px;
		--letter-spacing-card-price: 0.26px;
		
		/* Dimensions */
		--container-max-width: 1440px; /* Alinhado com header */
		--tab-width: 182px;
		--tab-height: 50px;
		--card-width-mobile: 280px;
		--card-width-desktop: 350px;
		--card-body-min-height: 140px;
		--button-width: 110px;
		--button-height: 36px;
		--nav-button-size: 35px;
		--slider-height: 2px;
		--slider-thumb-height: 2px;
		
		/* Border radius */
		--border-radius-sm: 6px;
		--border-radius-md: 12px;
		--border-radius-lg: 28px;
		--border-radius-xl: 28px;
		--border-radius-button: 8px;
		
		/* Transitions */
		--transition-fast: 200ms ease-out;
		--transition-base: 300ms ease;
		--transition-slow: 500ms ease-in-out;
		
		/* Animations */
		--animation-shimmer-duration: 1.5s;
		--animation-bounce-duration: 0.6s;
		
		/* Z-index */
		--z-index-navigation: 10;
		--z-index-loading: 20;
	}
	
	/* =============================================================================
	   BASE STYLES
	   ============================================================================= */
	
	.category {
		width: 100%;
		padding: var(--spacing-4xl) 0;
		background: var(--color-background);
		font-family: var(--font-family);
		overflow-x: hidden;
		box-sizing: border-box;
	}
	
	.category__container {
		width: 100%;
		max-width: var(--container-max-width);
		margin: 0 auto;
		padding: 0 var(--spacing-xl); /* 32px - igual ao header px-8 */
		overflow: visible;
		box-sizing: border-box;
	}
	
	/* =============================================================================
	   HEADER
	   ============================================================================= */
	
	.category__header {
		text-align: center;
		margin-bottom: var(--spacing-2xl);
	}
	
	.category__title {
		font-family: var(--font-family);
		font-size: var(--font-size-title-mobile);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		margin: 0;
		letter-spacing: var(--letter-spacing-title);
		line-height: var(--line-height-normal);
	}
	
	/* =============================================================================
	   TABS NAVIGATION
	   ============================================================================= */
	
	.category__tabs {
		display: flex;
		justify-content: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-3xl);
		overflow-x: auto;
		padding: var(--spacing-md) var(--spacing-xl);
		scrollbar-width: none;
		-ms-overflow-style: none;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		max-width: 100%;
		box-sizing: border-box;
	}
	
	.category__tabs::-webkit-scrollbar {
		display: none;
	}
	
	.category__tab {
		display: flex;
		width: var(--tab-width);
		height: var(--tab-height);
		flex-direction: column;
		justify-content: center;
		flex-shrink: 0;
		padding: var(--spacing-sm) var(--spacing-md);
		
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--color-border);
		background: var(--color-background);
		
		font-family: var(--font-family);
		font-size: var(--font-size-tab);
		font-weight: var(--font-weight-bold);
		line-height: var(--line-height-tab);
		letter-spacing: var(--letter-spacing-tab);
		color: var(--color-text);
		text-align: center;
		
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
		white-space: nowrap;
		outline: none;
		user-select: none;
		box-sizing: border-box;
	}
	
	.category__tab:hover:not(.category__tab--active):not(:disabled) {
		background: var(--color-background-light);
		color: var(--color-text-light);
		border-color: var(--color-border-hover);
	}
	
	.category__tab:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	.category__tab--active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	
	.category__tab:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.category__tab:last-child {
		margin-right: 0;
	}
	
	/* =============================================================================
	   CONTENT
	   ============================================================================= */
	
	.category__content {
		width: 100%;
		position: relative;
	}
	
	/* =============================================================================
	   CAROUSEL CONTAINER
	   ============================================================================= */
	
	.category__carousel-container {
		width: 100%;
		overflow: hidden;
		position: relative;
	}
	
	/* =============================================================================
	   GRID
	   ============================================================================= */
	
	.category__grid {
		display: flex;
		gap: var(--dynamic-gap, var(--spacing-md));
		overflow-x: auto;
		padding: 0 var(--spacing-md) 0 var(--spacing-md);
		scrollbar-width: none;
		-ms-overflow-style: none;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		transition: transform var(--transition-base);
	}
	
	.category__grid::-webkit-scrollbar {
		display: none;
	}
	
	/* =============================================================================
	   CARDS
	   ============================================================================= */
	
	.category__card {
		background: var(--color-background);
		border-radius: var(--border-radius-md);
		box-shadow: 0 2px 8px var(--color-shadow);
		overflow: hidden;
		transition: box-shadow 0.2s ease, border-color 0.2s ease;
		border: 1px solid var(--color-loading-bg);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		width: var(--dynamic-card-width, var(--card-width-mobile));
	}
	
	.category__card:hover {
		box-shadow: 0 4px 12px var(--color-shadow-hover);
	}
	
	.category__card--active {
		box-shadow: 0 4px 12px var(--color-shadow-hover);
		border-color: var(--color-primary);
	}
	
	.category__card--loading {
		pointer-events: none;
		opacity: 0.8;
	}
	
	/* =============================================================================
	   CARD IMAGE
	   ============================================================================= */
	
	.category__card-image {
		position: relative;
		width: 100%;
		aspect-ratio: 1 / 1;
		overflow: hidden;
		background: var(--color-background-light);
	}
	
	.category__card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		transition: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-user-drag: none;
	}
	
	.category__card:hover .category__card-image img {
		transform: none;
	}
	
	/* =============================================================================
	   CARD CONTENT
	   ============================================================================= */
	
	.category__card-body {
		padding: var(--spacing-lg);
		background: var(--color-background-card);
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: var(--card-body-min-height);
	}
	
	.category__card-title {
		font-family: var(--font-family);
		font-size: var(--font-size-card-title);
		font-weight: var(--font-weight-bold);
		line-height: var(--line-height-card-title);
		letter-spacing: var(--letter-spacing-card-title);
		color: var(--color-primary);
		margin: 0 0 var(--spacing-xs) 0;
	}
	
	.category__card-description {
		display: -webkit-box;
		width: 100%;
		min-height: 26px;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		flex-shrink: 0;
		
		font-family: var(--font-family);
		font-size: var(--font-size-card-description);
		font-weight: var(--font-weight-normal);
		line-height: var(--line-height-card-description);
		letter-spacing: var(--letter-spacing-card-description);
		color: var(--color-text);
		margin: 0 0 var(--spacing-md) 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.category__card-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		gap: var(--spacing-sm);
	}
	
	.category__card-price {
		font-family: var(--font-family);
		font-size: var(--font-size-card-price);
		font-weight: var(--font-weight-medium);
		line-height: var(--line-height-normal);
		letter-spacing: var(--letter-spacing-card-price);
		color: var(--color-primary);
		margin: 0;
	}
	
	.category__card-price strong {
		font-weight: var(--font-weight-extra-bold);
	}
	
	.category__card-button {
		display: flex;
		width: var(--button-width);
		height: var(--button-height);
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-xs);
		
		border-radius: var(--border-radius-button);
		background: var(--color-primary);
		border: none;
		
		text-decoration: none;
		transition: background-color 0.2s ease;
		outline: none;
	}
	
	.category__card-button span {
		display: flex;
		width: 65px;
		height: auto;
		flex-direction: column;
		justify-content: center;
		flex-shrink: 0;
		
		color: var(--color-background);
		font-family: var(--font-family);
		font-size: var(--font-size-button);
		font-weight: var(--font-weight-bold);
		line-height: 1;
		text-align: center;
	}
	
	.category__card-button svg {
		width: 3px;
		height: 6px;
		flex-shrink: 0;
		color: var(--color-background);
	}
	
	.category__card-button:hover {
		background: var(--color-primary-dark);
	}
	
	.category__card-button:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	/* =============================================================================
	   LOADING STATES
	   ============================================================================= */
	
	.category__card-image--skeleton,
	.category__card-title--skeleton,
	.category__card-description--skeleton,
	.category__card-price--skeleton,
	.category__card-button--skeleton {
		background: linear-gradient(
			90deg, 
			var(--color-loading-bg) 25%, 
			var(--color-loading-shimmer) 37%, 
			var(--color-loading-bg) 63%
		);
		background-size: 400% 100%;
		animation: skeleton-loading var(--animation-shimmer-duration) ease-in-out infinite;
		border-radius: 4px;
	}
	
	.category__card-title--skeleton {
		height: 20px;
		margin-bottom: var(--spacing-xs);
	}
	
	.category__card-description--skeleton {
		height: 14px;
		margin-bottom: var(--spacing-md);
		width: 80%;
	}
	
	.category__card-price--skeleton {
		height: 16px;
		margin-bottom: var(--spacing-md);
		width: 60%;
	}
	
	.category__card-button--skeleton {
		height: var(--button-height);
		border-radius: var(--border-radius-button);
	}
	
	@keyframes skeleton-loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
	
	/* =============================================================================
	   PROGRESS SLIDER
	   ============================================================================= */
	
	.category__slider {
		position: relative;
		width: 100%;
		max-width: 1072px;
		height: var(--slider-height);
		margin: var(--spacing-2xl) auto 0;
		display: block;
	}
	
	.category__slider-track {
		width: 100%;
		height: var(--slider-height);
		border-radius: var(--border-radius-xl);
		background: var(--color-secondary);
		opacity: 0.18;
	}
	
	.category__slider-thumb {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 12.5%;
		height: var(--slider-thumb-height);
		border-radius: var(--border-radius-xl);
		background: var(--color-secondary);
		transition: left var(--transition-base);
	}
	
	/* =============================================================================
	   NAVIGATION
	   ============================================================================= */
	
	.category__navigation {
		display: flex;
		justify-content: center;
		gap: var(--spacing-md);
		margin-top: var(--spacing-md);
		z-index: var(--z-index-navigation);
	}
	
	.category__nav-button {
		width: var(--nav-button-size);
		height: var(--nav-button-size);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: opacity 0.2s ease;
		color: var(--color-secondary);
		outline: none;
		border-radius: 50%;
	}
	
	.category__nav-button:hover:not(:disabled) {
		opacity: 0.7;
	}
	
	.category__nav-button:focus {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	
	.category__nav-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	
	/* =============================================================================
	   RESPONSIVE BREAKPOINTS
	   ============================================================================= */
	
	/* Mobile: até 767px */
	@media (max-width: 767px) {
		.category__tabs {
			justify-content: flex-start;
			padding: var(--spacing-md) var(--spacing-xl);
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		.category__tab {
			width: var(--tab-width);
			flex-shrink: 0;
		}
		
		.category__tab:last-child {
			margin-right: var(--spacing-xl);
		}
		
		.category__content {
			padding: var(--spacing-xs) 0;
		}
		
		.category__carousel-container {
			padding: 0 var(--spacing-md);
		}
		
		.category__grid {
			padding: 0 var(--spacing-xl) 0 var(--spacing-xl);
			scroll-snap-type: x mandatory;
			-webkit-overflow-scrolling: touch;
			scroll-behavior: smooth;
		}
		
		.category__card {
			scroll-snap-align: start;
			scroll-snap-stop: always;
		}
		
		.category__card:hover {
			box-shadow: 0 4px 12px var(--color-shadow-hover);
		}
		
		.category__card--active {
			box-shadow: 0 4px 12px var(--color-shadow-hover);
			border-color: var(--color-primary);
		}
		
		.category__card:last-child {
			margin-right: var(--spacing-3xl);
		}
	}
	
	/* Tablet: 768px - 1023px */
	@media (min-width: 768px) and (max-width: 1023px) {
		.category {
			padding: var(--spacing-2xl) 0;
		}
		
		.category__container {
			padding: 0 var(--spacing-xl);
		}
		
		.category__title {
			font-size: var(--font-size-title-tablet);
		}
		
		.category__tabs {
			max-width: 100%;
			box-sizing: border-box;
			gap: var(--spacing-sm);
			padding: var(--spacing-md) var(--spacing-xl);
			justify-content: flex-start;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}
		
		.category__tab {
			width: var(--tab-width);
			flex-shrink: 0;
			box-sizing: border-box;
		}
		
		.category__tab:last-child {
			margin-right: var(--spacing-xl);
		}
		
		.category__content {
			padding: 0;
			margin: 0 auto;
			width: 100%;
			overflow: visible;
		}
		
		.category__carousel-container {
			width: 100%;
			overflow: visible;
		}
		
		.category__grid {
			padding: 0 var(--spacing-md);
			overflow-x: auto;
			transform: none !important;
			transition: none !important;
		}
		
		.category__card:hover {
			transform: none;
			box-shadow: 0 2px 8px var(--color-shadow);
		}
		
		.category__card--active {
			transform: none;
			box-shadow: 0 2px 8px var(--color-shadow);
			border-color: var(--color-loading-bg);
		}
	}
	
	/* Desktop: 1024px+ */
	@media (min-width: 1024px) {
		.category {
			padding: var(--spacing-3xl) 0;
		}
		
		.category__container {
			padding: 0 var(--spacing-2xl);
		}
		
		.category__title {
			font-size: var(--font-size-title-desktop);
		}
		
		.category__tabs {
			padding: var(--spacing-md) var(--spacing-2xl);
			justify-content: center;
		}
		
		.category__tab:last-child {
			margin-right: 0;
		}
		
		.category__content {
			padding: 0;
			margin: 0 auto;
			width: 100%;
			overflow: visible;
		}
		
		.category__carousel-container {
			width: 100%;
			margin: 0 auto;
			overflow: visible;
		}
		
		.category__grid {
			padding: 0 var(--spacing-md);
			overflow-x: visible;
		}
	}
	
	/* Desktop grande: 1440px+ */
	@media (min-width: 1440px) {
		.category {
			padding: var(--spacing-4xl) 0;
		}
		
		.category__container {
			padding: 0 var(--spacing-3xl);
		}
		
		.category__tabs {
			padding: var(--spacing-md) var(--spacing-3xl);
		}
		
		.category__carousel-container {
			max-width: calc(4 * 350px + 3 * 24px + var(--spacing-3xl));
		}
		
		.category__grid {
			padding: 0 var(--spacing-lg);
		}
	}
	
	/* Padding extra para evitar corte do hover */
	@media (max-width: 1023px) {
		.category__grid {
			padding-top: var(--spacing-xs);
			padding-bottom: var(--spacing-xs);
		}
		
		.category__card {
			margin: var(--spacing-xs) 0;
		}
	}
	
	@media (min-width: 1024px) {
		.category__content {
			padding: var(--spacing-sm) 0;
		}
		
		.category__carousel-container {
			padding: var(--spacing-xs) 0;
		}
		
		.category__grid {
			padding-top: var(--spacing-sm);
			padding-bottom: var(--spacing-sm);
		}
		
		.category__card {
			margin: var(--spacing-xs) 0;
		}
	}
</style> 