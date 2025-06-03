<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import Toast from '$lib/components/ui/Toast.svelte';
	
	// Novo sistema de menu
	import FloatingMenu from '$lib/components/shared/FloatingMenu.svelte';
	import { menuStats } from '$lib/stores/menuStore';
	import SideMenu from '$lib/components/shared/SideMenu.svelte';
	
	// Interface
	interface User {
		id: string;
		name: string;
		email: string;
		role: 'admin' | 'vendor';
		avatarUrl?: string;
	}
	
	// Props & Estado
	let { children } = $props();
	
	let user = $state<User | null>(null);
	let isLoading = $state(true);
	let isUserMenuOpen = $state(false);
	let currentPath = $state('');
	let showSideMenu = $state(false);
	let isMobile = $state(false);
	
	// Detectar dispositivo móvel
	$effect(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});
	
	// Atualizar path atual
	$effect(() => {
		currentPath = $page.url.pathname;
	});
	
	// Verificar se está na página de login
	const isLoginPage = $derived(currentPath === '/login');
	
	// Função para carregar estatísticas do menu
	async function loadMenuStats() {
		try {
			const response = await fetch('/api/menu-stats');
			const result = await response.json();
			
			if (result.success) {
				menuStats.set(result.data);
				console.log('📊 Estatísticas do menu carregadas:', result.data);
			} else {
				console.error('❌ Erro ao carregar estatísticas:', result.error);
			}
		} catch (error) {
			console.error('❌ Erro na requisição de estatísticas:', error);
		}
	}
	
	// Lifecycle
	onMount(() => {
		// Simular carregamento do usuário
		setTimeout(() => {
			const userParam = $page.url.searchParams.get('user');
			
			if (userParam === 'vendor') {
				user = {
					id: 'vendor-1',
					name: 'João Vendedor',
					email: 'joao@vendor.com',
					role: 'vendor',
					avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=João'
				};
			} else {
				user = {
					id: 'admin-1',
					name: 'Maria Admin',
					email: 'maria@admin.com',
					role: 'admin',
					avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria'
				};
			}
			
			isLoading = false;
			
			// Carregar estatísticas do menu após carregar usuário
			loadMenuStats();
		}, 500);
		
		// Fechar menus ao clicar fora
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest('.user-menu-container')) {
				isUserMenuOpen = false;
			}
		};
		
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
	
	// Handlers
	function toggleUserMenu() {
		isUserMenuOpen = !isUserMenuOpen;
	}
	
	async function handleLogout() {
		user = null;
		await goto('/login');
	}
	
	function goToStore() {
		window.open('/', '_blank');
	}
</script>

<Toast />

{#if isLoginPage}
	<!-- Layout simples para login -->
	<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
		{@render children()}
	</div>
{:else}
	<!-- Layout completo do admin com novo menu -->
	<div class="min-h-screen bg-gray-50">
		<!-- Header Simplificado -->
		<header class="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
			<div class="flex items-center justify-between h-16 px-4 lg:px-6">
				<!-- Left Side: Menu + Logo -->
				<div class="flex items-center gap-4">
					<!-- Menu Hambúrguer -->
					<button
						onclick={() => showSideMenu = !showSideMenu}
						class="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
						title="Menu"
					>
						<div class="flex flex-col gap-1">
							<div class="w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-300"></div>
							<div class="w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-300"></div>
							<div class="w-5 h-0.5 bg-gray-600 rounded-full transition-all duration-300"></div>
						</div>
					</button>
					
					<!-- Logo -->
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-[#00BFB3] rounded-xl flex items-center justify-center">
							<span class="text-white font-bold text-xl">G</span>
						</div>
						<div class="hidden sm:block">
							<h1 class="text-lg font-bold text-gray-900">
								{user?.role === 'admin' ? 'Admin Panel' : 'Seller Panel'}
							</h1>
							<p class="text-xs text-gray-500">Marketplace GDG</p>
						</div>
					</div>
				</div>
				
				<!-- Right Side -->
				<div class="flex items-center gap-2 lg:gap-4">
					<!-- Notifications -->
					<button class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
						<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
						</svg>
						<span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
					</button>
					
					<!-- View Store -->
					<button
						onclick={goToStore}
						class="hidden lg:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						Ver Loja
					</button>
					
					<!-- User Menu -->
					<div class="relative user-menu-container">
						<button
							onclick={toggleUserMenu}
							class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
						>
							{#if user}
								<img
									src={user.avatarUrl}
									alt={user.name}
									class="w-8 h-8 rounded-full ring-2 ring-gray-200"
								/>
								<div class="hidden lg:block text-left">
									<p class="text-sm font-semibold text-gray-900">{user.name}</p>
									<p class="text-xs text-gray-500">{user.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
								</div>
							{/if}
							<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						
						<!-- Dropdown Menu -->
						{#if isUserMenuOpen}
							<div class="dropdown-menu animate-scale-in">
								<div class="px-4 py-3 border-b border-gray-100">
									<p class="text-sm font-medium text-gray-900">{user?.name}</p>
									<p class="text-xs text-gray-500">{user?.email}</p>
								</div>
								
								<a href="/configuracoes" class="dropdown-item">
									<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									Configurações
								</a>
								
								<button onclick={handleLogout} class="dropdown-item w-full text-left text-red-600 hover:bg-red-50">
									<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
									</svg>
									Sair
								</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</header>
		
		<!-- Main Content (Tela Expandida) -->
		<main class="pt-16 transition-all duration-300" style="margin-left: {showSideMenu && !isMobile ? '288px' : '0'}; max-width: {showSideMenu && !isMobile ? 'calc(100% - 288px)' : '100%'};">
			<div class="p-2 lg:p-4 animate-fade-in">
				{#if isLoading}
					<div class="flex items-center justify-center min-h-[60vh]">
						<div class="text-center">
							<div class="spinner w-12 h-12 mx-auto mb-4"></div>
							<p class="text-gray-600">Carregando...</p>
						</div>
					</div>
				{:else}
					<div in:fade={{ duration: 300, delay: 100 }} out:fade={{ duration: 200 }}>
						{@render children()}
					</div>
				{/if}
			</div>
		</main>
		
		<!-- Novo Menu Flutuante -->
		{#if !isLoading && user}
			<SideMenu {user} bind:isOpen={showSideMenu} />
		{/if}
		
		<!-- Footer -->
		<footer class="border-t border-gray-200 bg-white mt-auto">
			<div class="px-4 lg:px-8 py-4">
				<p class="text-center text-sm text-gray-500">
					© 2024 Marketplace GDG. Todos os direitos reservados.
				</p>
			</div>
		</footer>
	</div>
{/if}

<style>
	/* Animações suaves ao mudar de rota */
	:global(html) {
		scroll-behavior: smooth;
	}
	
	/* Header com glassmorphism */
	header {
		backdrop-filter: blur(12px);
		background-color: rgba(255, 255, 255, 0.8);
	}
	
	/* Dropdown melhorado */
	.dropdown-menu {
		@apply absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-white/95;
		@apply backdrop-blur-xl ring-1 ring-black/5;
		@apply divide-y divide-gray-100 focus:outline-none z-50;
		@apply border border-white/20;
	}
	
	.dropdown-item {
		@apply flex items-center px-4 py-3 text-sm text-gray-700;
		@apply hover:bg-gray-50 hover:text-gray-900;
		@apply transition-all cursor-pointer;
	}
	
	/* Spinner melhorado */
	.spinner {
		@apply animate-spin rounded-full border-4 border-gray-200;
		border-top-color: #00BFB3;
	}
	
	/* Animação fade-in melhorada */
	.animate-fade-in {
		animation: fadeIn 0.4s ease-out;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-scale-in {
		animation: scaleIn 0.2s ease-out;
	}
	
	@keyframes scaleIn {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
