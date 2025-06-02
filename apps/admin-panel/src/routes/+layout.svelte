<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade, fly, slide, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	
	// Interface
	interface User {
		id: string;
		name: string;
		email: string;
		role: 'admin' | 'vendor';
		avatarUrl?: string;
	}
	
	interface MenuItem {
		label: string;
		href: string;
		icon: string;
		roles: ('admin' | 'vendor')[];
		badge?: number;
	}
	
	// Props & Estado
	let { children } = $props();
	
	let user = $state<User | null>(null);
	let isLoading = $state(true);
	let isSidebarOpen = $state(true);
	let isUserMenuOpen = $state(false);
	let isMobileMenuOpen = $state(false);
	let currentPath = $state('');
	
	// Menu items com roles
	const menuItems: MenuItem[] = [
		{ label: 'Dashboard', href: '/', icon: '🏠', roles: ['admin', 'vendor'] },
		{ label: 'Produtos', href: '/produtos', icon: '📦', roles: ['admin', 'vendor'], badge: 3 },
		{ label: 'Pedidos', href: '/pedidos', icon: '📋', roles: ['admin', 'vendor'], badge: 7 },
		{ label: 'Usuários', href: '/usuarios', icon: '👥', roles: ['admin'] },
		{ label: 'Relatórios', href: '/relatorios', icon: '📊', roles: ['admin', 'vendor'] },
		{ label: 'Páginas', href: '/paginas', icon: '📄', roles: ['admin'] },
		{ label: 'Listas de Presentes', href: '/listas-presentes', icon: '🎁', roles: ['admin'] },
		{ label: 'Configurações', href: '/configuracoes', icon: '⚙️', roles: ['admin', 'vendor'] }
	];
	
	// Filtrar menu items baseado no role
	const filteredMenuItems = $derived(user ? menuItems.filter(item => item.roles.includes(user.role)) : []);
	
	// Atualizar path atual
	$effect(() => {
		currentPath = $page.url.pathname;
	});
	
	// Verificar se está na página de login
	const isLoginPage = $derived(currentPath === '/login');
	
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
	function toggleSidebar() {
		isSidebarOpen = !isSidebarOpen;
	}
	
	function toggleUserMenu() {
		isUserMenuOpen = !isUserMenuOpen;
	}
	
	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}
	
	async function handleLogout() {
		user = null;
		await goto('/login');
	}
	
	function goToStore() {
		window.open('/', '_blank');
	}
	
	// Helpers
	function isActiveRoute(href: string): boolean {
		if (href === '/') return currentPath === href;
		return currentPath.startsWith(href);
	}
</script>

{#if isLoginPage}
	<!-- Layout simples para login -->
	<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
		{@render children()}
	</div>
{:else}
	<!-- Layout completo do admin -->
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
			<div class="flex items-center justify-between h-16 px-4 lg:px-6">
				<!-- Logo & Toggle -->
				<div class="flex items-center gap-4">
					<!-- Mobile Menu Toggle -->
					<button
						onclick={toggleMobileMenu}
						class="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					
					<!-- Desktop Sidebar Toggle -->
					<button
						onclick={toggleSidebar}
						class="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					
					<!-- Logo -->
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
							<span class="text-white font-bold text-xl">G</span>
						</div>
						<div>
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
							<div 
								class="dropdown-menu animate-scale-in"
								transition:fly={{ y: -10, duration: 200 }}
							>
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
		
		<!-- Sidebar Desktop -->
		<aside 
			class="fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 hidden lg:block"
			class:w-64={isSidebarOpen}
			class:w-20={!isSidebarOpen}
		>
			<nav class="p-4 space-y-1 h-full overflow-y-auto">
				{#each filteredMenuItems as item}
					<a
						href={item.href}
						class="sidebar-link group"
						class:sidebar-link-active={isActiveRoute(item.href)}
						title={!isSidebarOpen ? item.label : ''}
					>
						<span class="text-xl flex-shrink-0">{item.icon}</span>
						{#if isSidebarOpen}
							<span class="font-medium" transition:fade={{ duration: 200 }}>{item.label}</span>
							{#if item.badge}
								<span class="ml-auto badge badge-primary" transition:scale={{ duration: 200 }}>
									{item.badge}
								</span>
							{/if}
						{/if}
					</a>
				{/each}
			</nav>
		</aside>
		
		<!-- Mobile Menu -->
		{#if isMobileMenuOpen}
			<div 
				class="fixed inset-0 z-50 lg:hidden"
				transition:fade={{ duration: 200 }}
			>
				<!-- Backdrop -->
				<div 
					class="absolute inset-0 bg-black/50"
					onclick={toggleMobileMenu}
				></div>
				
				<!-- Menu -->
				<aside 
					class="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl"
					transition:fly={{ x: -320, duration: 300, easing: cubicOut }}
				>
					<!-- Header -->
					<div class="flex items-center justify-between p-4 border-b border-gray-200">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
								<span class="text-white font-bold text-xl">G</span>
							</div>
							<span class="font-bold text-gray-900">Menu</span>
						</div>
						<button
							onclick={toggleMobileMenu}
							class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					
					<!-- Navigation -->
					<nav class="p-4 space-y-1">
						{#each filteredMenuItems as item}
							<a
								href={item.href}
								onclick={toggleMobileMenu}
								class="sidebar-link group"
								class:sidebar-link-active={isActiveRoute(item.href)}
							>
								<span class="text-xl">{item.icon}</span>
								<span class="font-medium">{item.label}</span>
								{#if item.badge}
									<span class="ml-auto badge badge-primary">
										{item.badge}
									</span>
								{/if}
							</a>
						{/each}
					</nav>
				</aside>
			</div>
		{/if}
		
		<!-- Main Content -->
		<main 
			class="transition-all duration-300 pt-16"
			class:lg:pl-64={isSidebarOpen}
			class:lg:pl-20={!isSidebarOpen}
		>
			<div class="p-4 lg:p-8 animate-fade-in">
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
		
		<!-- Footer -->
		<footer 
			class="transition-all duration-300 border-t border-gray-200 bg-white mt-auto"
			class:lg:pl-64={isSidebarOpen}
			class:lg:pl-20={!isSidebarOpen}
		>
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
	
	/* Melhorar transições do sidebar */
	aside {
		will-change: width;
	}
	
	/* Sombra mais suave no header fixo */
	header {
		backdrop-filter: blur(8px);
		background-color: rgba(255, 255, 255, 0.95);
	}
</style>
