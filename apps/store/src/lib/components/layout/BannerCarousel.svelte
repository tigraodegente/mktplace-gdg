<script lang="ts">
	import { onMount } from 'svelte';
	
	interface BannerMessage {
		icon: 'payment' | 'shipping' | 'discount';
		text: string;
		link: string;
		linkText: string;
	}
	
	interface BannerCarouselProps {
		messages?: BannerMessage[];
		autoPlayInterval?: number;
		class?: string;
	}
	
	let { 
		messages = [
			{
				icon: 'payment' as const,
				text: 'Tudo em até 12X',
				link: '/promocoes',
				linkText: 'COMPRAR'
			},
			{
				icon: 'shipping' as const,
				text: 'Frete Grátis acima de R$ 199',
				link: '/frete-gratis',
				linkText: 'APROVEITAR'
			},
			{
				icon: 'discount' as const,
				text: '10% OFF na primeira compra',
				link: '/primeira-compra',
				linkText: 'USAR CUPOM'
			}
		],
		autoPlayInterval = 4000,
		class: className = ''
	}: BannerCarouselProps = $props();
	
	let currentSlide = $state(0);
	let isPaused = $state(false);
	let touchStartX = 0;
	let touchEndX = 0;
	let carouselInterval: ReturnType<typeof setInterval>;
	
	onMount(() => {
		startCarousel();
		
		return () => {
			clearInterval(carouselInterval);
		};
	});
	
	function startCarousel() {
		if (!isPaused && messages.length > 1) {
			carouselInterval = setInterval(() => {
				currentSlide = (currentSlide + 1) % messages.length;
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
		startCarousel();
	}
	
	function goToSlide(index: number) {
		currentSlide = index;
		clearInterval(carouselInterval);
		startCarousel();
	}
	
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') {
			goToSlide((currentSlide - 1 + messages.length) % messages.length);
		} else if (event.key === 'ArrowRight') {
			goToSlide((currentSlide + 1) % messages.length);
		}
	}
	
	// Touch handlers para swipe no mobile
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}
	
	function handleTouchMove(e: TouchEvent) {
		touchEndX = e.touches[0].clientX;
	}
	
	function handleTouchEnd() {
		if (!touchStartX || !touchEndX) return;
		
		const swipeDistance = touchStartX - touchEndX;
		const minSwipeDistance = 50;
		
		if (Math.abs(swipeDistance) > minSwipeDistance) {
			if (swipeDistance > 0) {
				goToSlide((currentSlide + 1) % messages.length);
			} else {
				goToSlide((currentSlide - 1 + messages.length) % messages.length);
			}
		}
		
		touchStartX = 0;
		touchEndX = 0;
	}
	
	const iconPaths: Record<string, {
		viewBox: string;
		paths: Array<{
			d: string;
			fill?: string;
			stroke?: string;
			strokeWidth?: number;
			strokeLinecap?: string;
			strokeLinejoin?: string;
		}>;
		circles?: Array<{
			cx: number;
			cy: number;
			r: number;
			fill?: string;
			stroke?: string;
			strokeWidth?: number;
		}>;
	}> = {
		payment: {
			viewBox: "0 0 24 24",
			paths: [
				{ d: "M2 5h20v14a2 2 0 01-2 2H4a2 2 0 01-2-2V5z", fill: "none", stroke: "#333", strokeWidth: 2 },
				{ d: "M2 9H22", stroke: "#333", strokeWidth: 2 },
				{ d: "M6 13H10", stroke: "#333", strokeWidth: 2, strokeLinecap: "round" }
			]
		},
		shipping: {
			viewBox: "0 0 24 24",
			paths: [
				{ d: "M1 12H16V18.5C16 19.3284 15.3284 20 14.5 20H12.5", stroke: "#333", strokeWidth: 2, strokeLinecap: "round" },
				{ d: "M16 12H20.5C21.3284 12 22 12.6716 22 13.5V17.5C22 18.3284 21.3284 19 20.5 19H19", stroke: "#333", strokeWidth: 2, strokeLinecap: "round" },
				{ d: "M16 12V6C16 5.17157 15.3284 4.5 14.5 4.5H1", stroke: "#333", strokeWidth: 2, strokeLinecap: "round" }
			],
			circles: [
				{ cx: 8, cy: 20, r: 2 },
				{ cx: 18, cy: 20, r: 2 }
			]
		},
		discount: {
			viewBox: "0 0 24 24",
			paths: [
				{ d: "M8 12L11 15L16 10", stroke: "#333", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
				{ d: "M12 6V8", stroke: "#333", strokeWidth: 2, strokeLinecap: "round" },
				{ d: "M12 16V18", stroke: "#333", strokeWidth: 2, strokeLinecap: "round" }
			],
			circles: [
				{ cx: 12, cy: 12, r: 10, fill: "none", stroke: "#333", strokeWidth: 2 }
			]
		}
	};
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- Desktop Banner -->
<div 
	class="hidden lg:block bg-[#F4F4F4] h-[48px] relative overflow-hidden {className}"
	role="region"
	aria-label="Promoções"
	aria-live="polite"
	onmouseenter={pauseCarousel}
	onmouseleave={resumeCarousel}
>
	<div class="w-full max-w-[1440px] mx-auto h-full relative">
		<!-- Slides Container -->
		<div class="relative h-full">
			{#each messages as message, index}
				<div 
					class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="flex items-center gap-2 hover:opacity-90 transition-opacity">
						<svg class="w-[20px] h-[20px]" viewBox={iconPaths[message.icon].viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
							{#each iconPaths[message.icon].paths || [] as path}
								<path {...path} />
							{/each}
							{#each iconPaths[message.icon].circles || [] as circle}
								<circle {...circle} stroke="#333" stroke-width="2" />
							{/each}
						</svg>
						<span class="text-black font-medium text-xs">{message.text}</span>
						<span class="text-[#00BFB3] font-black text-[11px] uppercase underline hover:no-underline">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		{#if messages.length > 1}
			<!-- Navigation Arrows -->
			<button 
				onclick={() => goToSlide((currentSlide - 1 + messages.length) % messages.length)}
				class="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-all"
				aria-label="Slide anterior"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			
			<button 
				onclick={() => goToSlide((currentSlide + 1) % messages.length)}
				class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-all"
				aria-label="Próximo slide"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
			
			<!-- Dots Indicator -->
			<div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
				{#each messages as _, index}
					<button
						onclick={() => goToSlide(index)}
						class="w-1 h-1 rounded-full transition-all duration-300 hover:bg-gray-600 {index === currentSlide ? 'bg-gray-700 w-3' : 'bg-gray-400'}"
						aria-label="Ir para slide {index + 1}"
					></button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Mobile Banner -->
<div 
	class="lg:hidden bg-[#F4F4F4] h-[44px] relative overflow-hidden {className}"
	role="region"
	aria-label="Promoções"
	aria-live="polite"
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<div class="w-full h-full relative">
		<!-- Slides Container -->
		<div class="relative h-full">
			{#each messages as message, index}
				<div 
					class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out px-4"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="flex items-center gap-2">
						<svg class="w-[20px] h-[22px]" viewBox={iconPaths[message.icon].viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
							{#each iconPaths[message.icon].paths || [] as path}
								<path {...path} />
							{/each}
							{#each iconPaths[message.icon].circles || [] as circle}
								<circle {...circle} stroke="#333" stroke-width="2" />
							{/each}
						</svg>
						<span class="text-black font-medium text-[11px]">{message.text}</span>
						<span class="text-[#00BFB3] font-black text-[10px] uppercase underline">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		{#if messages.length > 1}
			<!-- Dots Indicator Mobile -->
			<div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
				{#each messages as _, index}
					<button
						onclick={() => goToSlide(index)}
						class="w-1 h-1 rounded-full transition-all duration-300 {index === currentSlide ? 'bg-gray-700 w-3' : 'bg-gray-400'}"
						aria-label="Ir para slide {index + 1}"
					></button>
				{/each}
			</div>
		{/if}
	</div>
</div> 