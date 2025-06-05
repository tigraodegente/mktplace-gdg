<script lang="ts">
	import { user, isAuthenticated } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import SearchBox from '../search/SearchBox.svelte';
	import DesktopCategoryMenu from '../navigation/DesktopCategoryMenu.svelte';
	import MiniCart from '../cart/MiniCart.svelte';
	
	interface HeaderProps {
		totalItems: number;
		onOpenCart: () => void;
		onLogout: () => void;
		class?: string;
	}
	
	let { 
		totalItems = 0,
		onOpenCart,
		onLogout,
		class: className = ''
	}: HeaderProps = $props();
	
	let userMenuOpen = $state(false);
	let miniCartVisible = $state(false);
	let showDropdown = $state(false);
	let showSubcategories = $state<string | null>(null);
	
	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
	}
	
	function closeUserMenu() {
		userMenuOpen = false;
	}
	
	// Controlar mini carrinho apenas com clique
	function toggleMiniCart() {
		miniCartVisible = !miniCartVisible;
	}
	
	function closeMiniCart() {
		miniCartVisible = false;
	}
	
	function handleViewCart() {
		miniCartVisible = false;
		goto('/cart');
	}
	
	function handleCheckout() {
		miniCartVisible = false;
		goto('/cart');
	}
	
	// Fechar menu ao clicar fora
	$effect(() => {
		if (!userMenuOpen && !miniCartVisible) return;
		
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest('.user-menu-container') && userMenuOpen) {
				userMenuOpen = false;
			}
			if (!target.closest('.mini-cart-container') && miniCartVisible) {
				miniCartVisible = false;
			}
		};
		
		// Usar timeout para evitar loops
		const timeoutId = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
		}, 0);
		
		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<header class="hidden md:block bg-[#00BFB3] sticky top-0 z-[100] {className}">
	<!-- Container principal com altura responsiva -->
	<div class="w-full max-w-[1440px] mx-auto h-[110px] md:h-[125px] lg:h-[140px] xl:h-[150px] flex flex-col">
		<!-- Top Header com busca e ações -->
		<div class="flex-1 px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 flex items-center">
			<div class="w-full flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-4">
				<!-- Logo -->
				<a href="/" class="flex items-center flex-shrink-0">
					<img 
						src="/logo.png" 
						alt="Grão de Gente" 
						class="w-auto filter brightness-0 invert" 
						style="height: clamp(32px, 4vw, 52px);" 
					/>
				</a>
				
				<!-- Search Bar -->
				<SearchBox class="flex-1 min-w-0 max-w-[300px] sm:max-w-[350px] md:max-w-[450px] lg:max-w-[600px] xl:max-w-[800px] 2xl:max-w-[900px]" />
				
				<!-- User Actions -->
				<div class="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 xl:gap-4 flex-shrink-0">
					{#if $isAuthenticated}
						<div class="relative user-menu-container">
							<button 
								onclick={toggleUserMenu}
								class="flex items-center gap-1 md:gap-1.5 lg:gap-2 text-white hover:text-white/90 transition-all duration-200 ease-out p-1.5 md:p-2 text-xs md:text-sm lg:text-base rounded-lg hover:bg-white/10"
								aria-expanded={userMenuOpen}
								aria-haspopup="true"
								aria-label="Menu do usuário"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="lg:w-5 lg:h-5" viewBox="0 0 23 23" fill="none" aria-hidden="true">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M6.82023 6.89176C6.82023 4.32197 8.87064 2.26566 11.3671 2.26566C13.8635 2.26566 15.914 4.32197 15.914 6.89176C15.914 9.46154 13.8635 11.5179 11.3671 11.5179C8.87064 11.5179 6.82023 9.46154 6.82023 6.89176ZM11.3671 0C7.58987 0 4.55457 3.1004 4.55457 6.89176C4.55457 10.6832 7.58987 13.7835 11.3671 13.7835C15.1443 13.7835 18.1796 10.6832 18.1796 6.89176C18.1796 3.1004 15.1443 0 11.3671 0Z" fill="white"/>
									<path d="M2 21.0845C3.69198 17.7603 7.3223 15.462 11.5278 15.462C15.7332 15.462 19.3635 17.7603 21.0555 21.0845" stroke="white" stroke-width="2.38958" stroke-linecap="round"/>
								</svg>
								<div class="flex flex-col items-start">
									<span class="text-white text-xs lg:text-sm font-normal leading-tight">
										Olá, {#if $user?.name}{$user.name.split(' ')[0]}{:else}faça login{/if}
									</span>
								</div>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" class="lg:w-3 lg:h-3 transition-transform duration-300 ease-out" class:rotate-180={userMenuOpen} viewBox="0 0 16 9" fill="none" aria-hidden="true">
									<path d="M15.0078 1.00013L8.00391 7.53711L1 1.00013" stroke="white" stroke-width="1.75098"/>
								</svg>
							</button>
							
							{#if userMenuOpen}
								<div 
									class="absolute top-full left-0 w-44 md:w-48 lg:w-52 xl:w-56 bg-white shadow-xl rounded-xl border border-gray-100 py-3 transition-all duration-300 ease-out z-50 backdrop-blur-sm"
									style="box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);"
									role="menu"
								>
									<!-- Seção Principal da Conta -->
									<div class="px-1">
									<a 
										href="/minha-conta"
											onclick={closeUserMenu}
											class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 hover:text-[#00BFB3] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 group mx-2"
										role="menuitem"
									>
											<svg class="w-5 h-5 text-gray-500 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
											</svg>
											<span>Minha Conta</span>
									</a>
										
									<a
										href="/meus-pedidos"
											onclick={closeUserMenu}
											class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 hover:text-[#00BFB3] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 group mx-2"
											role="menuitem"
									>
											<svg class="w-5 h-5 text-gray-500 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
										</svg>
											<span>Meus Pedidos</span>
									</a>
									</div>
									
									<!-- Divisor -->
									<div class="my-2 mx-4 border-t border-gray-100"></div>
									
									<!-- Seção de Recursos -->
									<div class="px-1">
									<a
										href="/listas-presentes?user_id={$user?.id}"
											onclick={closeUserMenu}
											class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 hover:text-[#00BFB3] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 group mx-2"
											role="menuitem"
									>
											<svg class="w-5 h-5 text-gray-500 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
										</svg>
											<span>Minhas Listas</span>
									</a>
										
									<a
										href="/notificacoes"
											onclick={closeUserMenu}
											class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 hover:text-[#00BFB3] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 group mx-2"
											role="menuitem"
									>
											<svg class="w-5 h-5 text-gray-500 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 2a7 7 0 00-7 7v4.586l-.293.293A1 1 0 003 15h14a1 1 0 00.293-1.121L17 13.586V9a7 7 0 00-7-7zM8 20a2 2 0 104 0" />
											</svg>
											<span>Notificações</span>
										</a>
									</div>
									
									<!-- Divisor -->
									<div class="my-2 mx-4 border-t border-gray-100"></div>
									
									<!-- Seção de Suporte -->
									<div class="px-1">
										<a
											href="/chat"
											onclick={closeUserMenu}
											class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 hover:text-[#00BFB3] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 group mx-2"
											role="menuitem"
										>
											<svg class="w-5 h-5 text-gray-500 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
										</svg>
											<span>Chat & Suporte</span>
									</a>
										
									<a
										href="/suporte"
											onclick={closeUserMenu}
											class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 hover:text-[#00BFB3] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 group mx-2"
											role="menuitem"
									>
											<svg class="w-5 h-5 text-gray-500 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
											<span>FAQ & Base de Conhecimento</span>
									</a>
										
									<a
										href="/devolucoes"
											onclick={closeUserMenu}
											class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 hover:text-[#00BFB3] hover:bg-[#00BFB3]/5 rounded-lg transition-all duration-200 group mx-2"
											role="menuitem"
									>
											<svg class="w-5 h-5 text-gray-500 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
										</svg>
											<span>Devoluções & Trocas</span>
									</a>
									</div>
									
									<!-- Divisor para Sair -->
									<div class="my-2 mx-4 border-t border-gray-200"></div>
									
									<!-- Botão Sair -->
									<div class="px-1">
									<button 
											onclick={() => { closeUserMenu(); onLogout(); }}
											class="flex items-center gap-3 w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group mx-2"
										role="menuitem"
									>
											<svg class="w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
											</svg>
											<span>Sair</span>
									</button>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<a href="/login" class="flex items-center gap-1 md:gap-1.5 lg:gap-2 text-white hover:text-white/80 transition text-xs md:text-sm lg:text-base" aria-label="Fazer login">
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="lg:w-5 lg:h-5" viewBox="0 0 23 23" fill="none" aria-hidden="true">
								<path fill-rule="evenodd" clip-rule="evenodd" d="M6.82023 6.89176C6.82023 4.32197 8.87064 2.26566 11.3671 2.26566C13.8635 2.26566 15.914 4.32197 15.914 6.89176C15.914 9.46154 13.8635 11.5179 11.3671 11.5179C8.87064 11.5179 6.82023 9.46154 6.82023 6.89176ZM11.3671 0C7.58987 0 4.55457 3.1004 4.55457 6.89176C4.55457 10.6832 7.58987 13.7835 11.3671 13.7835C15.1443 13.7835 18.1796 10.6832 18.1796 6.89176C18.1796 3.1004 15.1443 0 11.3671 0Z" fill="white"/>
								<path d="M2 21.0845C3.69198 17.7603 7.3223 15.462 11.5278 15.462C15.7332 15.462 19.3635 17.7603 21.0555 21.0845" stroke="white" stroke-width="2.38958" stroke-linecap="round"/>
							</svg>
							<div class="flex flex-col items-start">
								<span class="text-white text-xs lg:text-sm font-normal leading-tight">Olá, faça</span>
								<span class="text-white text-xs lg:text-sm font-semibold leading-tight">login</span>
							</div>
						</a>
					{/if}
					
					<div class="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3">
						<a href="/favoritos" class="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white hover:text-white/80 transition" aria-label="Favoritos">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="lg:w-6 lg:h-6" viewBox="0 0 28 26" fill="none" aria-hidden="true">
								<path d="M9.6417 2C11.0691 2 12.5816 2.69442 14.1572 4.0601C17.3082 1.58335 21.518 1.64949 24.0799 4.34117C25.5092 5.84876 26.3115 7.8889 26.3115 10.0155C26.3115 12.1422 25.5092 14.1823 24.0799 15.6899L24.0547 15.7164L16.7505 22.9317C16.0489 23.6255 15.1212 24.012 14.1572 24.012C13.1931 24.012 12.2655 23.6255 11.5638 22.9317L4.25969 15.7164L4.23448 15.6899C3.16683 14.5676 2.4401 13.1385 2.14609 11.583C1.85208 10.0275 2.00398 8.4154 2.5826 6.95044C3.16123 5.48549 4.14061 4.23337 5.39704 3.35225C6.65346 2.47114 8.13055 2.00058 9.6417 2Z" fill="#F17179" stroke="white" stroke-width="2.24368"/>
							</svg>
						</a>
						
						<div 
							class="relative mini-cart-container"
							role="region"
							aria-label="Carrinho de compras"
						>
							<button 
								onclick={toggleMiniCart}
								class="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-white hover:text-white/80 transition" 
								aria-label="Carrinho de compras"
								aria-expanded={miniCartVisible}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="lg:w-6 lg:h-6" viewBox="0 0 21 27" fill="none" aria-hidden="true">
									<path d="M20.6673 21.6562L19.1315 8.58457C19.0395 7.94666 18.7153 7.36517 18.2209 6.95159C17.7266 6.53801 17.097 6.32146 16.4529 6.34346H15.2475C15.2475 6.17381 15.2475 6.00417 15.1939 5.83452C14.9975 4.4595 14.8279 3.27198 13.7743 2.26303C13.3979 1.86417 12.9439 1.5464 12.4403 1.32921C11.9367 1.11203 11.3941 1 10.8457 1C10.2972 1 9.75457 1.11203 9.25097 1.32921C8.74737 1.5464 8.29345 1.86417 7.91703 2.26303C6.86344 3.27198 6.6938 4.4595 6.49736 5.83452C6.49736 6.00417 6.49736 6.17381 6.44379 6.34346H5.21163C4.56749 6.32146 3.9379 6.53801 3.44359 6.95159C2.94927 7.36517 2.62502 7.94666 2.53301 8.58457L1.02405 21.6562C0.964049 22.1816 1.01662 22.7136 1.17827 23.2171C1.33992 23.7205 1.60695 24.1837 1.96157 24.5759C2.37578 25.0315 2.8822 25.3937 3.44718 25.6385C4.01216 25.8832 4.62276 26.005 5.23841 25.9956H16.4529C17.0634 26.0023 17.6684 25.8801 18.2285 25.637C18.7885 25.3939 19.291 25.0354 19.703 24.5849C20.0635 24.1939 20.3362 23.7302 20.5025 23.225C20.6688 22.7199 20.725 22.1849 20.6673 21.6562ZM8.26525 6.09345C8.46169 4.73629 8.56883 4.11128 9.15813 3.54877C9.59811 3.08132 10.2042 2.80554 10.8457 2.7809C11.4884 2.80788 12.0947 3.08695 12.5332 3.55769C13.1225 4.1202 13.2296 4.74522 13.4261 6.10238C13.4261 6.18274 13.4261 6.27203 13.4261 6.35239H8.2474C8.25632 6.2631 8.25632 6.17381 8.26525 6.09345ZM18.3636 23.3884C18.1198 23.6501 17.8237 23.8577 17.4946 23.9976C17.1654 24.1376 16.8105 24.2069 16.4529 24.2009H5.23841C4.88078 24.2069 4.52589 24.1376 4.19673 23.9976C3.86757 23.8577 3.57149 23.6501 3.32767 23.3884C3.1363 23.1863 2.99093 22.9453 2.90153 22.6817C2.81214 22.4182 2.78085 22.1384 2.8098 21.8616L4.33661 8.78993C4.38894 8.59514 4.50567 8.4238 4.6678 8.30382C4.82993 8.18385 5.02791 8.1223 5.22949 8.1292H6.38129C6.38129 8.4685 6.38129 8.80779 6.47058 9.14708C6.50255 9.38388 6.62728 9.59829 6.81733 9.74313C7.00738 9.88797 7.24719 9.95138 7.48399 9.91941C7.72079 9.88745 7.9352 9.76272 8.08004 9.57266C8.22488 9.38261 8.28829 9.14281 8.25632 8.906C8.25632 8.64707 8.25632 8.38814 8.20275 8.1292H13.5243C13.5243 8.38814 13.5243 8.64707 13.4707 8.906C13.4341 9.13523 13.4882 9.36971 13.6215 9.55973C13.7549 9.74974 13.957 9.88036 14.185 9.92388H14.31C14.5267 9.92601 14.7367 9.84929 14.901 9.70801C15.0653 9.56674 15.1726 9.37054 15.2029 9.15601C15.2475 8.81672 15.2743 8.47742 15.2922 8.13813H16.4886C16.6902 8.13123 16.8882 8.19278 17.0503 8.31275C17.2124 8.43273 17.3292 8.60407 17.3815 8.79886L18.8815 21.8616C18.9105 22.1384 18.8792 22.4182 18.7898 22.6817C18.7004 22.9453 18.555 23.1863 18.3636 23.3884Z" fill="white" stroke="white" stroke-width="0.178575"/>
								</svg>
								{#if totalItems > 0}
									<span class="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-white text-[#00BFB3] rounded-full h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center font-medium text-xs">
										{totalItems}
									</span>
								{/if}
							</button>
							
							<!-- Mini Cart -->
							<div 
								role="region"
								aria-label="Mini carrinho"
							>
								<MiniCart 
									isVisible={miniCartVisible}
									onClose={closeMiniCart}
									onViewCart={handleViewCart}
									onCheckout={handleCheckout}
									showQuickActions={true}
									maxItems={4}
									autoHideDelay={3000}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Navigation Menu -->
		<nav class="h-[40px] md:h-[42px] lg:h-[44px] xl:h-[48px]">
			<DesktopCategoryMenu />
		</nav>
	</div>
</header> 