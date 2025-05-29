<!-- Deploy seletivo funcionando! -->
<script lang="ts">
	import '../app.css';
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, user, isAuthenticated } from '$lib/stores/auth';
	import Footer from '$lib/components/layout/Footer.svelte';
	import SearchBox from '$lib/components/search/SearchBox.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { advancedCartStore } from '$lib/stores/advancedCartStore';
	import { wishlistCount } from '$lib/stores/wishlistStore';
	import { unreadCount } from '$lib/stores/notificationStore';
	import Header from '$lib/components/layout/Header.svelte';
	import MobileHeader from '$lib/components/layout/MobileHeader.svelte';
	import DesktopCategoryMenu from '$lib/components/navigation/DesktopCategoryMenu.svelte';
	import MobileCategoryMenu from '$lib/components/navigation/MobileCategoryMenu.svelte';
	import BannerCarousel from '$lib/components/layout/BannerCarousel.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { frontendCache } from '$lib/cache/frontend-cache';

	// Constants
	const CAROUSEL_INTERVAL_MS = 4000;
	const MIN_SWIPE_DISTANCE = 50;
	const BANNER_MESSAGES = [
		{
			icon: 'payment',
			text: 'Tudo em até 12X',
			link: '/promocoes',
			linkText: 'COMPRAR'
		},
		{
			icon: 'shipping',
			text: 'Frete Grátis acima de R$ 199',
			link: '/frete-gratis',
			linkText: 'APROVEITAR'
		},
		{
			icon: 'discount',
			text: '10% OFF na primeira compra',
			link: '/primeira-compra',
			linkText: 'USAR CUPOM'
		}
	] as const;

	// Types
	interface Product {
		readonly id: string;
		readonly name: string;
		readonly slug: string;
		readonly price: number;
		[key: string]: any;
	}

	// Props
	let { children } = $props();

	// State
	let mobileMenuOpen = $state(false);
	let currentSlide = $state(0);
	let carouselPaused = $state(false);
	let carouselInterval: NodeJS.Timeout | null = null;
	
	// Touch state
	let touchStartX = 0;
	let touchEndX = 0;
	
	// Stores
	const { sellerGroups } = advancedCartStore;
	
	// Computed
	let totalItems = $derived(
		$sellerGroups.reduce((sum, group) => 
			sum + group.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
		)
	);

	// Lifecycle
	onMount(() => {
		// Inicializar cache do frontend
		frontendCache.init().then(() => {
			frontendCache.preload();
		});
		
		// Check auth
		auth.checkAuth();
	});
	
	// CARROSSEL DESABILITADO TEMPORARIAMENTE PARA EVITAR LOOPS
	// Funções do carrossel
	function startCarousel() {
		// DESABILITADO
		/*
		if (carouselInterval) return; // Evitar múltiplos intervalos
		
		carouselInterval = setInterval(() => {
			if (!carouselPaused) {
				currentSlide = (currentSlide + 1) % BANNER_MESSAGES.length;
			}
		}, CAROUSEL_INTERVAL_MS);
		*/
	}
	
	function stopCarousel() {
		if (carouselInterval) {
			clearInterval(carouselInterval);
			carouselInterval = null;
		}
	}
	
	function restartCarousel() {
		stopCarousel();
		startCarousel();
	}
	
	// Carousel hover handlers
	function pauseCarousel() {
		carouselPaused = true;
	}
	
	function resumeCarousel() {
		carouselPaused = false;
	}

	// Carousel functions
	function goToSlide(index: number): void {
		currentSlide = index;
		// Reiniciar carrossel após navegação manual
		restartCarousel();
	}
	
	// Touch handlers
	function handleTouchStart(e: TouchEvent): void {
		touchStartX = e.touches[0].clientX;
	}
	
	function handleTouchMove(e: TouchEvent): void {
		touchEndX = e.touches[0].clientX;
	}
	
	function handleTouchEnd(): void {
		if (!touchStartX || !touchEndX) return;
		
		const swipeDistance = touchStartX - touchEndX;
		
		if (Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE) {
			if (swipeDistance > 0) {
				// Swipe left - next slide
				goToSlide((currentSlide + 1) % BANNER_MESSAGES.length);
			} else {
				// Swipe right - previous slide
				goToSlide((currentSlide - 1 + BANNER_MESSAGES.length) % BANNER_MESSAGES.length);
			}
		}
		
		// Reset values
		touchStartX = 0;
		touchEndX = 0;
	}

	// Keyboard navigation
	function handleKeyDown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'ArrowLeft':
				goToSlide((currentSlide - 1 + BANNER_MESSAGES.length) % BANNER_MESSAGES.length);
				break;
			case 'ArrowRight':
				goToSlide((currentSlide + 1) % BANNER_MESSAGES.length);
				break;
		}
	}

	// UI actions
	async function handleLogout(): Promise<void> {
		await auth.logout();
	}
	
	function openCart(): void {
		// Ir direto para a página do carrinho em vez de abrir preview
		goto('/cart');
	}

	// Helper function for banner icons
	function getBannerIcon(type: string): string {
		const icons: Record<string, string> = {
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
		return icons[type] || icons.discount;
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- Banner Promocional Desktop com Carrossel -->
<div 
	class="hidden lg:block bg-[#F4F4F4] h-[48px] relative overflow-hidden"
	role="region"
	aria-label="Promoções"
	aria-live="polite"
	onmouseenter={pauseCarousel}
	onmouseleave={resumeCarousel}
>
	<div class="w-full max-w-[1440px] mx-auto h-full relative">
		<!-- Slides Container -->
		<div class="relative h-full">
			{#each BANNER_MESSAGES as message, index}
				<div 
					class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="flex items-center gap-2 hover:opacity-90 transition-opacity">
						{@html getBannerIcon(message.icon)}
						<span class="text-black font-medium text-xs" style="font-family: 'Lato', sans-serif; font-weight: 500;">{message.text}</span>
						<span class="text-[#00BFB3] font-black text-[11px] uppercase underline hover:no-underline" style="font-family: 'Lato', sans-serif; font-weight: 900;">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		<!-- Navigation Arrows -->
		<button 
			onclick={() => goToSlide((currentSlide - 1 + BANNER_MESSAGES.length) % BANNER_MESSAGES.length)}
			class="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-all"
			aria-label="Slide anterior"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		
		<button 
			onclick={() => goToSlide((currentSlide + 1) % BANNER_MESSAGES.length)}
			class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-all"
			aria-label="Próximo slide"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
		
		<!-- Dots Indicator -->
		<div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
			{#each BANNER_MESSAGES as _, index}
				<button
					onclick={() => goToSlide(index)}
					class="w-1 h-1 rounded-full transition-all duration-300 hover:bg-gray-600 {index === currentSlide ? 'bg-gray-700 w-3' : 'bg-gray-400'}"
					aria-label="Ir para slide {index + 1}"
				></button>
			{/each}
		</div>
	</div>
</div>

<!-- Header Desktop -->
<Header 
	totalItems={totalItems} 
	onOpenCart={openCart}
	onLogout={handleLogout}
	class="hidden lg:block"
/>

<!-- Banner Promocional Mobile com Carrossel -->
<div 
	class="lg:hidden bg-[#F4F4F4] h-[44px] relative overflow-hidden"
	role="region"
	aria-label="Promoções"
	aria-live="polite"
	onmouseenter={pauseCarousel}
	onmouseleave={resumeCarousel}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<div class="w-full h-full relative">
		<!-- Slides Container -->
		<div class="relative h-full">
			{#each BANNER_MESSAGES as message, index}
				<div 
					class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out px-4"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="flex items-center gap-2">
						{@html getBannerIcon(message.icon)}
						<span class="text-black font-medium text-[11px]" style="font-family: 'Lato', sans-serif; font-weight: 500;">{message.text}</span>
						<span class="text-[#00BFB3] font-black text-[10px] uppercase underline" style="font-family: 'Lato', sans-serif; font-weight: 900;">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		<!-- Dots Indicator Mobile -->
		<div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
			{#each BANNER_MESSAGES as _, index}
				<button
					onclick={() => goToSlide(index)}
					class="w-1 h-1 rounded-full transition-all duration-300 {index === currentSlide ? 'bg-gray-700 w-3' : 'bg-gray-400'}"
					aria-label="Ir para slide {index + 1}"
				></button>
			{/each}
		</div>
	</div>
</div>

<!-- Header Mobile -->
<MobileHeader 
	totalItems={totalItems} 
	onOpenCart={openCart}
	onOpenMenu={() => mobileMenuOpen = true}
	class="lg:hidden"
/>

<!-- Mobile Menu -->
<MobileCategoryMenu bind:isOpen={mobileMenuOpen} onClose={() => mobileMenuOpen = false} />

<!-- Main Content -->
<main class="min-h-screen bg-gray-50">
	{@render children()}
</main>

<!-- Footer -->
<Footer />

<!-- Toast Container -->
<ToastContainer />
