<!-- Deploy seletivo funcionando! -->
<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { auth, user, isAuthenticated } from '$lib/stores/auth';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();

	let mobileMenuOpen = $state(false);
	let searchQuery = $state('');
	let userMenuOpen = $state(false);
	
	// Carrossel do banner
	let currentSlide = $state(0);
	let isPaused = $state(false);
	let touchStartX = 0;
	let touchEndX = 0;
	
	const bannerMessages = [
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
	];
	
	// Auto-rotate carousel
	let carouselInterval: ReturnType<typeof setInterval>;

	// Verificar autenticação ao carregar
	onMount(() => {
		auth.checkAuth();
		
		// Iniciar rotação do carrossel
		startCarousel();
		
		// Fechar menu ao clicar fora
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (userMenuOpen && !target.closest('.user-menu-container')) {
				userMenuOpen = false;
			}
		};
		
		document.addEventListener('click', handleClickOutside);
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
			clearInterval(carouselInterval);
		};
	});

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (mobileMenuOpen) mobileMenuOpen = false;
			if (userMenuOpen) userMenuOpen = false;
		}
		// Navegação por teclado no carrossel
		if (event.key === 'ArrowLeft') {
			goToSlide((currentSlide - 1 + bannerMessages.length) % bannerMessages.length);
		} else if (event.key === 'ArrowRight') {
			goToSlide((currentSlide + 1) % bannerMessages.length);
		}
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}

	async function handleLogout() {
		await auth.logout();
	}
	
	function startCarousel() {
		if (!isPaused) {
			carouselInterval = setInterval(() => {
				currentSlide = (currentSlide + 1) % bannerMessages.length;
			}, 4000);
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
		// Resetar o intervalo quando o usuário interagir
		clearInterval(carouselInterval);
		startCarousel();
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
				// Swipe left - próximo slide
				goToSlide((currentSlide + 1) % bannerMessages.length);
			} else {
				// Swipe right - slide anterior
				goToSlide((currentSlide - 1 + bannerMessages.length) % bannerMessages.length);
			}
		}
		
		// Reset valores
		touchStartX = 0;
		touchEndX = 0;
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
			{#each bannerMessages as message, index}
				<div 
					class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="flex items-center gap-2 hover:opacity-90 transition-opacity">
						{#if message.icon === 'payment'}
							<svg class="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
								<rect x="2" y="5" width="20" height="14" rx="2" stroke="#333" stroke-width="2"/>
								<path d="M2 9H22" stroke="#333" stroke-width="2"/>
								<path d="M6 13H10" stroke="#333" stroke-width="2" stroke-linecap="round"/>
							</svg>
						{:else if message.icon === 'shipping'}
							<svg class="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
								<path d="M1 12H16V18.5C16 19.3284 15.3284 20 14.5 20H12.5" stroke="#333" stroke-width="2" stroke-linecap="round"/>
								<path d="M16 12H20.5C21.3284 12 22 12.6716 22 13.5V17.5C22 18.3284 21.3284 19 20.5 19H19" stroke="#333" stroke-width="2" stroke-linecap="round"/>
								<circle cx="8" cy="20" r="2" stroke="#333" stroke-width="2"/>
								<circle cx="18" cy="20" r="2" stroke="#333" stroke-width="2"/>
								<path d="M16 12V6C16 5.17157 15.3284 4.5 14.5 4.5H1" stroke="#333" stroke-width="2" stroke-linecap="round"/>
							</svg>
						{:else}
							<svg class="w-[20px] h-[20px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
								<circle cx="12" cy="12" r="10" stroke="#333" stroke-width="2"/>
								<path d="M8 12L11 15L16 10" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M12 6V8" stroke="#333" stroke-width="2" stroke-linecap="round"/>
								<path d="M12 16V18" stroke="#333" stroke-width="2" stroke-linecap="round"/>
							</svg>
						{/if}
						<span class="text-black font-medium text-xs" style="font-family: 'Lato', sans-serif; font-weight: 500;">{message.text}</span>
						<span class="text-[#00BFB3] font-black text-[11px] uppercase underline hover:no-underline" style="font-family: 'Lato', sans-serif; font-weight: 900;">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		<!-- Navigation Arrows -->
		<button 
			onclick={() => goToSlide((currentSlide - 1 + bannerMessages.length) % bannerMessages.length)}
			class="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-all"
			aria-label="Slide anterior"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		
		<button 
			onclick={() => goToSlide((currentSlide + 1) % bannerMessages.length)}
			class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-all"
			aria-label="Próximo slide"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
		
		<!-- Dots Indicator -->
		<div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
			{#each bannerMessages as _, index}
				<button
					onclick={() => goToSlide(index)}
					class="w-1 h-1 rounded-full transition-all duration-300 hover:bg-gray-600 {index === currentSlide ? 'bg-gray-700 w-3' : 'bg-gray-400'}"
					aria-label="Ir para slide {index + 1}"
				/>
			{/each}
		</div>
	</div>
</div>

<!-- Header Desktop -->
<header class="hidden lg:block bg-[#00BFB3] sticky top-0 z-50">
	<!-- Container principal com altura total de 150px (190px - 40px do banner) -->
	<div class="w-full max-w-[1440px] mx-auto h-[150px] flex flex-col">
		<!-- Top Header com busca e ações -->
		<div class="flex-1 px-8 flex items-center">
			<div class="w-full flex items-center justify-between gap-8">
				<!-- Logo -->
				<a href="/" class="flex items-center flex-shrink-0">
					<img src="/logo.png" alt="Grão de Gente" class="h-10 w-auto filter brightness-0 invert" />
				</a>
				
				<!-- Search Bar -->
				<div class="flex-1 max-w-[745px]">
					<form class="relative">
						<input
							type="search"
							placeholder="O que você está procurando?"
							bind:value={searchQuery}
							class="w-full h-[42px] pl-6 pr-12 bg-white border border-gray-300 rounded-[8.42px] text-gray-600 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white transition-all"
						/>
						<button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#00BFB3] hover:text-[#00A89D] transition-colors" aria-label="Buscar">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</button>
					</form>
				</div>
				
				<!-- User Actions -->
				<div class="flex items-center gap-6 flex-shrink-0">
					{#if $isAuthenticated}
						<div class="relative user-menu-container">
							<button 
								onclick={toggleUserMenu}
								class="flex items-center gap-2 text-white hover:text-white/80 transition"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M6.82023 6.89176C6.82023 4.32197 8.87064 2.26566 11.3671 2.26566C13.8635 2.26566 15.914 4.32197 15.914 6.89176C15.914 9.46154 13.8635 11.5179 11.3671 11.5179C8.87064 11.5179 6.82023 9.46154 6.82023 6.89176ZM11.3671 0C7.58987 0 4.55457 3.1004 4.55457 6.89176C4.55457 10.6832 7.58987 13.7835 11.3671 13.7835C15.1443 13.7835 18.1796 10.6832 18.1796 6.89176C18.1796 3.1004 15.1443 0 11.3671 0Z" fill="white"/>
									<path d="M2 21.0845C3.69198 17.7603 7.3223 15.462 11.5278 15.462C15.7332 15.462 19.3635 17.7603 21.0555 21.0845" stroke="white" stroke-width="2.38958" stroke-linecap="round"/>
								</svg>
								<div class="flex flex-col items-start">
									<span class="text-white" style="font-family: 'Lato', sans-serif; font-size: 14px; font-weight: 400; line-height: normal; font-feature-settings: 'liga' off, 'clig' off;">
										Olá, {#if $user && $user.name}{$user.name.split(' ')[0]}{:else}faça login{/if}
									</span>
								</div>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="9" viewBox="0 0 16 9" fill="none" class="transition-transform" class:rotate-180={userMenuOpen}>
									<path d="M15.0078 1.00013L8.00391 7.53711L1 1.00013" stroke="white" stroke-width="1.75098"/>
								</svg>
							</button>
							
							{#if userMenuOpen}
								<div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden z-50">
									<a href="/minha-conta" class="block px-4 py-3 text-sm text-[var(--text-color)] hover:bg-[var(--gray50)] transition-colors">
										Minha Conta
									</a>
									<a href="/meus-pedidos" class="block px-4 py-3 text-sm text-[var(--text-color)] hover:bg-[var(--gray50)] transition-colors">
										Meus Pedidos
									</a>
									<div class="border-t border-[var(--gray100)]"></div>
									<button 
										onclick={handleLogout}
										class="block w-full text-left px-4 py-3 text-sm text-[var(--text-color)] hover:bg-[var(--gray50)] transition-colors"
									>
										Sair
									</button>
								</div>
							{/if}
						</div>
					{:else}
						<a href="/login" class="flex items-center gap-2 text-white hover:text-white/80 transition">
							<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 23 23" fill="none">
								<path fill-rule="evenodd" clip-rule="evenodd" d="M6.82023 6.89176C6.82023 4.32197 8.87064 2.26566 11.3671 2.26566C13.8635 2.26566 15.914 4.32197 15.914 6.89176C15.914 9.46154 13.8635 11.5179 11.3671 11.5179C8.87064 11.5179 6.82023 9.46154 6.82023 6.89176ZM11.3671 0C7.58987 0 4.55457 3.1004 4.55457 6.89176C4.55457 10.6832 7.58987 13.7835 11.3671 13.7835C15.1443 13.7835 18.1796 10.6832 18.1796 6.89176C18.1796 3.1004 15.1443 0 11.3671 0Z" fill="white"/>
								<path d="M2 21.0845C3.69198 17.7603 7.3223 15.462 11.5278 15.462C15.7332 15.462 19.3635 17.7603 21.0555 21.0845" stroke="white" stroke-width="2.38958" stroke-linecap="round"/>
							</svg>
							<div class="flex flex-col items-start">
								<span class="text-white" style="font-family: 'Lato', sans-serif; font-size: 14px; font-weight: 400; line-height: normal; font-feature-settings: 'liga' off, 'clig' off;">Olá, faça</span>
								<span class="text-white" style="font-family: 'Lato', sans-serif; font-size: 14px; font-weight: 600; line-height: normal; font-feature-settings: 'liga' off, 'clig' off;">login</span>
							</div>
						</a>
					{/if}
					
					<a href="/favoritos" class="relative text-white hover:text-white/80 transition" aria-label="Favoritos">
						<svg xmlns="http://www.w3.org/2000/svg" width="28" height="26" viewBox="0 0 28 26" fill="none">
							<path d="M9.6417 2C11.0691 2 12.5816 2.69442 14.1572 4.0601C17.3082 1.58335 21.518 1.64949 24.0799 4.34117C25.5092 5.84876 26.3115 7.8889 26.3115 10.0155C26.3115 12.1422 25.5092 14.1823 24.0799 15.6899L24.0547 15.7164L16.7505 22.9317C16.0489 23.6255 15.1212 24.012 14.1572 24.012C13.1931 24.012 12.2655 23.6255 11.5638 22.9317L4.25969 15.7164L4.23448 15.6899C3.16683 14.5676 2.4401 13.1385 2.14609 11.583C1.85208 10.0275 2.00398 8.4154 2.5826 6.95044C3.16123 5.48549 4.14061 4.23337 5.39704 3.35225C6.65346 2.47114 8.13055 2.00058 9.6417 2Z" fill="#F17179" stroke="white" stroke-width="2.24368"/>
						</svg>
					</a>
					
					<a href="/carrinho" class="relative text-white hover:text-white/80 transition" aria-label="Carrinho de compras">
						<svg xmlns="http://www.w3.org/2000/svg" width="21" height="27" viewBox="0 0 21 27" fill="none">
							<path d="M20.6673 21.6562L19.1315 8.58457C19.0395 7.94666 18.7153 7.36517 18.2209 6.95159C17.7266 6.53801 17.097 6.32146 16.4529 6.34346H15.2475C15.2475 6.17381 15.2475 6.00417 15.1939 5.83452C14.9975 4.4595 14.8279 3.27198 13.7743 2.26303C13.3979 1.86417 12.9439 1.5464 12.4403 1.32921C11.9367 1.11203 11.3941 1 10.8457 1C10.2972 1 9.75457 1.11203 9.25097 1.32921C8.74737 1.5464 8.29345 1.86417 7.91703 2.26303C6.86344 3.27198 6.6938 4.4595 6.49736 5.83452C6.49736 6.00417 6.49736 6.17381 6.44379 6.34346H5.21163C4.56749 6.32146 3.9379 6.53801 3.44359 6.95159C2.94927 7.36517 2.62502 7.94666 2.53301 8.58457L1.02405 21.6562C0.964049 22.1816 1.01662 22.7136 1.17827 23.2171C1.33992 23.7205 1.60695 24.1837 1.96157 24.5759C2.37578 25.0315 2.8822 25.3937 3.44718 25.6385C4.01216 25.8832 4.62276 26.005 5.23841 25.9956H16.4529C17.0634 26.0023 17.6684 25.8801 18.2285 25.637C18.7885 25.3939 19.291 25.0354 19.703 24.5849C20.0635 24.1939 20.3362 23.7302 20.5025 23.225C20.6688 22.7199 20.725 22.1849 20.6673 21.6562ZM8.26525 6.09345C8.46169 4.73629 8.56883 4.11128 9.15813 3.54877C9.59811 3.08132 10.2042 2.80554 10.8457 2.7809C11.4884 2.80788 12.0947 3.08695 12.5332 3.55769C13.1225 4.1202 13.2296 4.74522 13.4261 6.10238C13.4261 6.18274 13.4261 6.27203 13.4261 6.35239H8.2474C8.25632 6.2631 8.25632 6.17381 8.26525 6.09345ZM18.3636 23.3884C18.1198 23.6501 17.8237 23.8577 17.4946 23.9976C17.1654 24.1376 16.8105 24.2069 16.4529 24.2009H5.23841C4.88078 24.2069 4.52589 24.1376 4.19673 23.9976C3.86757 23.8577 3.57149 23.6501 3.32767 23.3884C3.1363 23.1863 2.99093 22.9453 2.90153 22.6817C2.81214 22.4182 2.78085 22.1384 2.8098 21.8616L4.33661 8.78993C4.38894 8.59514 4.50567 8.4238 4.6678 8.30382C4.82993 8.18385 5.02791 8.1223 5.22949 8.1292H6.38129C6.38129 8.4685 6.38129 8.80779 6.47058 9.14708C6.50255 9.38388 6.62728 9.59829 6.81733 9.74313C7.00738 9.88797 7.24719 9.95138 7.48399 9.91941C7.72079 9.88745 7.9352 9.76272 8.08004 9.57266C8.22488 9.38261 8.28829 9.14281 8.25632 8.906C8.25632 8.64707 8.25632 8.38814 8.20275 8.1292H13.5243C13.5243 8.38814 13.5243 8.64707 13.4707 8.906C13.4341 9.13523 13.4882 9.36971 13.6215 9.55973C13.7549 9.74974 13.957 9.88036 14.185 9.92388H14.31C14.5267 9.92601 14.7367 9.84929 14.901 9.70801C15.0653 9.56674 15.1726 9.37054 15.2029 9.15601C15.2475 8.81672 15.2743 8.47742 15.2922 8.13813H16.4886C16.6902 8.13123 16.8882 8.19278 17.0503 8.31275C17.2124 8.43273 17.3292 8.60407 17.3815 8.79886L18.8815 21.8616C18.9105 22.1384 18.8792 22.4182 18.7898 22.6817C18.7004 22.9453 18.555 23.1863 18.3636 23.3884Z" fill="white" stroke="white" stroke-width="0.178575"/>
						</svg>
						<span class="absolute -top-2 -right-2 bg-white text-[#00BFB3] text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
							3
						</span>
					</a>
				</div>
			</div>
		</div>
		
		<!-- Navigation Menu -->
		<nav class="h-[48px] px-8">
			<div class="w-full h-full">
				<ul class="flex items-center gap-6 h-full text-sm font-medium">
					<li><a href="/categorias" class="text-white hover:text-white/80 transition">Todas as categorias</a></li>
					<li><a href="/minhas" class="text-white hover:text-white/80 transition">Minhas</a></li>
					<li><a href="/marcas" class="text-white hover:text-white/80 transition">Marcas</a></li>
					<li><a href="/kit-ritual" class="text-white hover:text-white/80 transition">Kit Ritual</a></li>
					<li><a href="/quem-somos" class="text-white hover:text-white/80 transition">Quem Somos</a></li>
					<li><a href="/receitas" class="text-white hover:text-white/80 transition">Receitas</a></li>
					<li><a href="/sobre-maternidade" class="text-white hover:text-white/80 transition">Sobre Maternidade</a></li>
					<li><a href="/midia" class="text-white hover:text-white/80 transition">Mídia</a></li>
					<li><a href="/mindfulness" class="text-white hover:text-white/80 transition">Mindfulness</a></li>
					<li><a href="/brinfa" class="text-white hover:text-white/80 transition">Brinfa</a></li>
					<li><a href="/parceria" class="text-white hover:text-white/80 transition">Parceria</a></li>
					<li><a href="/escola" class="text-white hover:text-white/80 transition">Escola</a></li>
					<li><a href="/lancamentos" class="text-white hover:text-white/80 transition">Lançamentos</a></li>
					<li><a href="/quero-ser-parceiro" class="text-white hover:text-white/80 transition">Quero Ser Parceiro</a></li>
				</ul>
			</div>
		</nav>
	</div>
</header>

<!-- Banner Promocional Mobile com Carrossel -->
<div 
	class="lg:hidden bg-[#F4F4F4] h-[44px] relative overflow-hidden"
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
			{#each bannerMessages as message, index}
				<div 
					class="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out px-4"
					style="transform: translateX({(index - currentSlide) * 100}%); opacity: {index === currentSlide ? 1 : 0}"
					aria-hidden={index !== currentSlide}
				>
					<a href={message.link} class="flex items-center gap-2">
						{#if message.icon === 'payment'}
							<svg class="w-[20px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<rect x="2" y="5" width="20" height="14" rx="2" stroke="#333" stroke-width="2"/>
								<path d="M2 9H22" stroke="#333" stroke-width="2"/>
								<path d="M6 13H10" stroke="#333" stroke-width="2" stroke-linecap="round"/>
							</svg>
						{:else if message.icon === 'shipping'}
							<svg class="w-[20px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M1 12H16V18.5C16 19.3284 15.3284 20 14.5 20H12.5" stroke="#333" stroke-width="2" stroke-linecap="round"/>
								<path d="M16 12H20.5C21.3284 12 22 12.6716 22 13.5V17.5C22 18.3284 21.3284 19 20.5 19H19" stroke="#333" stroke-width="2" stroke-linecap="round"/>
								<circle cx="8" cy="20" r="2" stroke="#333" stroke-width="2"/>
								<circle cx="18" cy="20" r="2" stroke="#333" stroke-width="2"/>
								<path d="M16 12V6C16 5.17157 15.3284 4.5 14.5 4.5H1" stroke="#333" stroke-width="2" stroke-linecap="round"/>
							</svg>
						{:else}
							<svg class="w-[20px] h-[22px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<circle cx="12" cy="12" r="10" stroke="#333" stroke-width="2"/>
								<path d="M8 12L11 15L16 10" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M12 6V8" stroke="#333" stroke-width="2" stroke-linecap="round"/>
								<path d="M12 16V18" stroke="#333" stroke-width="2" stroke-linecap="round"/>
							</svg>
						{/if}
						<span class="text-black font-medium text-[11px]" style="font-family: 'Lato', sans-serif; font-weight: 500;">{message.text}</span>
						<span class="text-[#00BFB3] font-black text-[10px] uppercase underline" style="font-family: 'Lato', sans-serif; font-weight: 900;">{message.linkText}</span>
					</a>
				</div>
			{/each}
		</div>
		
		<!-- Dots Indicator Mobile -->
		<div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
			{#each bannerMessages as _, index}
				<button
					onclick={() => goToSlide(index)}
					class="w-1 h-1 rounded-full transition-all duration-300 {index === currentSlide ? 'bg-gray-700 w-3' : 'bg-gray-400'}"
					aria-label="Ir para slide {index + 1}"
				/>
			{/each}
		</div>
	</div>
</div>

<!-- Header Mobile -->
<header class="lg:hidden bg-[#00BBB4] sticky top-0 z-50">
	<div class="flex items-center justify-between p-4">
		<!-- Menu Button -->
		<button
			onclick={() => mobileMenuOpen = !mobileMenuOpen}
			class="text-white"
			aria-label="Menu"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
		
		<!-- Logo -->
		<a href="/" class="flex-1 flex justify-center">
			<img src="/logo.png" alt="Grão de Gente" class="h-8 w-auto filter brightness-0 invert" />
		</a>
		
		<!-- Actions -->
		<div class="flex items-center gap-4">
			<a href="/favoritos" class="text-white" aria-label="Favoritos">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
				</svg>
			</a>
			
			<a href="/carrinho" class="relative text-white" aria-label="Carrinho de compras">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<span class="absolute -top-2 -right-2 bg-white text-[#00BBB4] text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
					3
				</span>
			</a>
		</div>
	</div>
	
	<!-- Search Bar Mobile -->
	<div class="px-4 pb-4">
		<form class="relative">
			<input
				type="search"
				placeholder="O que você está procurando?"
				bind:value={searchQuery}
				class="w-full h-[42px] px-5 pr-12 bg-white border border-gray-300 rounded-[8.42px] text-gray-600 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-[#00BBB4]/30 focus:border-[#00BBB4] transition-all"
			/>
			<button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#00BBB4] hover:text-[#00A89D] transition-colors" aria-label="Buscar">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</button>
		</form>
	</div>
</header>

<!-- Mobile Menu Overlay -->
{#if mobileMenuOpen}
	<!-- Backdrop -->
	<div class="lg:hidden fixed inset-0 z-50">
		<!-- Backdrop button -->
		<button 
			class="absolute inset-0 bg-black bg-opacity-50 w-full h-full cursor-default" 
			onclick={() => mobileMenuOpen = false}
			aria-label="Fechar menu"
			type="button"
		></button>
		
		<!-- Menu Panel -->
		<div 
			class="relative bg-white w-80 h-full overflow-y-auto" 
			role="navigation"
			aria-label="Menu principal"
		>
			<div class="p-4 border-b">
				<button onclick={() => mobileMenuOpen = false} class="text-gray-600" aria-label="Fechar menu" type="button">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<nav class="p-4">
				<ul class="space-y-4">
					<li><a href="/categorias" class="block text-gray-700 hover:text-[#00BFB3]">Todas as categorias</a></li>
					<li><a href="/minhas" class="block text-gray-700 hover:text-[#00BFB3]">Minhas</a></li>
					<li><a href="/marcas" class="block text-gray-700 hover:text-[#00BFB3]">Marcas</a></li>
					<li><a href="/kit-ritual" class="block text-gray-700 hover:text-[#00BFB3]">Kit Ritual</a></li>
					<li><a href="/quem-somos" class="block text-gray-700 hover:text-[#00BFB3]">Quem Somos</a></li>
					<li><a href="/receitas" class="block text-gray-700 hover:text-[#00BFB3]">Receitas</a></li>
					<li><a href="/sobre-maternidade" class="block text-gray-700 hover:text-[#00BFB3]">Sobre Maternidade</a></li>
					<li><a href="/midia" class="block text-gray-700 hover:text-[#00BFB3]">Mídia</a></li>
					<li><a href="/mindfulness" class="block text-gray-700 hover:text-[#00BFB3]">Mindfulness</a></li>
					<li><a href="/brinfa" class="block text-gray-700 hover:text-[#00BFB3]">Brinfa</a></li>
					<li><a href="/parceria" class="block text-gray-700 hover:text-[#00BFB3]">Parceria</a></li>
					<li><a href="/escola" class="block text-gray-700 hover:text-[#00BFB3]">Escola</a></li>
					<li><a href="/lancamentos" class="block text-gray-700 hover:text-[#00BFB3]">Lançamentos</a></li>
					<li><a href="/quero-ser-parceiro" class="block text-gray-700 hover:text-[#00BFB3]">Quero Ser Parceiro</a></li>
				</ul>
			</nav>
		</div>
	</div>
{/if}

<!-- Conteúdo Principal -->
<main class="min-h-screen bg-[var(--background-color)]">
	{@render children()}
</main>

<Footer />
