<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	
	// Interface para o usuário autenticado
	interface AuthUser {
		id: string;
		name: string;
		email: string;
		role: 'admin' | 'vendor' | 'customer';
		roles?: string[]; // Múltiplos roles se aplicável
	}
	
	// Estado da autenticação
	let user: AuthUser | null = null;
	let isLoading = true;
	let showUserMenu = false;
	let logoError = false;
	
	// Path atual para navegação
	let currentPath = '/';
	
	page.subscribe((p) => {
		if (p?.url?.pathname) {
			currentPath = p.url.pathname;
		}
	});
	
	// Verificar autenticação no carregamento
	onMount(async () => {
		console.log('🚀 Layout carregado, path:', currentPath);
		
		// Só verificar auth se não estiver na página de login
		if (currentPath !== '/login') {
			await checkAuth();
		} else {
			isLoading = false;
		}
	});
	
	async function checkAuth() {
		console.log('🔍 Verificando autenticação...');
		
		try {
			// Pegar parâmetro da URL para simular diferentes usuários
			const userParam = $page.url.searchParams.get('user');
			const apiUrl = userParam ? `/api/auth/me?user=${userParam}` : '/api/auth/me';
			
			console.log('📡 Fazendo requisição para:', apiUrl);
			
			const response = await fetch(apiUrl, {
				credentials: 'include'
			});
			
			console.log('📥 Resposta recebida:', response.status);
			
			if (response.ok) {
				const result = await response.json();
				console.log('✅ Dados do usuário:', result);
				
				if (result.success && result.user) {
					user = result.user;
					console.log('👤 Usuário autenticado:', result.user.name, result.user.role);
				} else {
					console.log('❌ Falha na autenticação:', result);
					goto('/login');
				}
			} else {
				console.log('🚫 Erro HTTP:', response.status);
				goto('/login');
			}
		} catch (error) {
			console.error('💥 Erro na verificação:', error);
			goto('/login');
		} finally {
			console.log('🏁 Finalizando carregamento...');
			isLoading = false;
		}
	}
	
	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include'
			});
		} catch (error) {
			console.error('Erro no logout:', error);
		}
		
		// Limpar estado e redirecionar
		user = null;
		goto('/login');
	}
	
	function handleLogoError() {
		logoError = true;
	}
	
	function toggleUserMenu() {
		showUserMenu = !showUserMenu;
	}
	
	function closeUserMenu() {
		showUserMenu = false;
	}
	
	// Verificar permissões
	function hasPermission(requiredRoles: string[]): boolean {
		return user ? requiredRoles.includes(user.role) : false;
	}
	
	// Navegar para loja
	function goToStore() {
		window.open('/', '_blank');
	}
	
	// Configurações por role
	$: roleConfig = user?.role === 'admin' ? {
		title: 'Admin Panel',
		subtitle: 'Painel Administrativo',
		roleLabel: 'Administrador',
		avatar: '👨‍💼'
	} : {
		title: 'Seller Panel', 
		subtitle: 'Painel do Vendedor',
		roleLabel: 'Vendedor',
		avatar: '🏪'
	};
	
	// Debug: reactive statement para acompanhar mudanças
	$: console.log('📊 Estado atual - Loading:', isLoading, 'User:', user?.name || 'Nenhum');
</script>

<svelte:head>
	<title>{roleConfig?.title || 'Admin Panel'} - Marketplace GDG</title>
	<meta name="description" content="Painel de Gerenciamento do Marketplace" />
</svelte:head>

{#if currentPath === '/login'}
	<!-- Página de login - renderizar sem layout -->
	<slot />
{:else if isLoading}
	<!-- Loading Screen com informações de debug -->
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600 text-lg">Carregando painel...</p>
			<p class="text-gray-500 text-sm mt-2">Verificando autenticação...</p>
			{#if import.meta.env.DEV}
				<div class="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
					<p>🛠️ Modo desenvolvimento</p>
					<p>Path: {currentPath}</p>
					<p>Loading: {isLoading}</p>
				</div>
			{/if}
		</div>
	</div>
{:else if !user}
	<!-- Não autenticado -->
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center">
			<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
				</svg>
			</div>
			<p class="text-gray-600">Usuário não encontrado</p>
			<p class="text-gray-500 text-sm">Redirecionando para login...</p>
			<button 
				on:click={() => goto('/login')}
				class="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
			>
				Ir para Login
			</button>
		</div>
	</div>
{:else}
	<!-- Layout Principal Unificado -->
	<div class="min-h-screen bg-gray-50">
		<!-- Header Unificado -->
		<header class="bg-white border-b border-gray-200 shadow-sm">
			<div class="px-6 py-4">
				<div class="flex items-center justify-between">
					<!-- Logo e Título -->
					<div class="flex items-center space-x-4">
						<div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
							{#if !logoError}
								<img 
									src="/logo.png" 
									alt="Marketplace GDG" 
									class="w-8 h-8 object-contain"
									on:error={handleLogoError}
								/>
							{:else}
								<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
								</svg>
							{/if}
						</div>
						<div>
							<h1 class="text-xl font-bold text-gray-900">{roleConfig?.title || 'Painel'}</h1>
							<p class="text-sm text-gray-500">{roleConfig?.subtitle || 'Sistema de Gerenciamento'}</p>
						</div>
						{#if import.meta.env.DEV}
							<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
								✅ {user?.role?.toUpperCase() || 'UNKNOWN'}
							</span>
						{/if}
					</div>
					
					<!-- Navegação Rápida -->
					<div class="hidden md:flex items-center space-x-4">
						<button 
							on:click={goToStore}
							class="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
						>
							<span>🛒</span>
							<span>Ver Loja</span>
						</button>
					</div>
					
					<!-- Menu do Usuário -->
					<div class="relative">
						<button 
							on:click={toggleUserMenu}
							class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<div class="text-right">
								<div class="text-sm font-medium text-gray-900">{user?.name || 'Usuário'}</div>
								<div class="text-xs text-gray-500">{roleConfig?.roleLabel || 'Role'}</div>
							</div>
							<div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-lg">
								{roleConfig?.avatar || '👤'}
							</div>
							<svg class="w-4 h-4 text-gray-400 transition-transform {showUserMenu ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
							</svg>
						</button>
						
						<!-- Dropdown Menu -->
						{#if showUserMenu}
							<div class="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
								<div class="px-4 py-3 border-b border-gray-100">
									<div class="text-sm font-medium text-gray-900">{user?.name || 'Usuário'}</div>
									<div class="text-sm text-gray-500">{user?.email || 'email@exemplo.com'}</div>
									<div class="text-xs text-primary-600 mt-1">{roleConfig?.avatar || '👤'} {roleConfig?.roleLabel || 'Role'}</div>
								</div>
								
								{#if import.meta.env.DEV}
									<div class="py-2 border-b border-gray-100">
										<a href="/?user=admin" class="flex items-center px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 transition-colors">
											<span class="mr-3">👨‍💼</span>
											Testar como Admin
										</a>
										<a href="/?user=vendor" class="flex items-center px-4 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors">
											<span class="mr-3">🏪</span>
											Testar como Vendor
										</a>
									</div>
								{/if}
								
								<div class="py-2">
									<a href="/configuracoes" class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
										<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
										</svg>
										Configurações
									</a>
								</div>
								
								<div class="border-t border-gray-100 pt-2">
									<button 
										on:click={handleLogout}
										class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
									>
										<svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
										</svg>
										Sair
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</header>
		
		<div class="flex">
			<!-- Sidebar Unificada com Permissões -->
			<aside class="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-80px)] overflow-y-auto">
				<nav class="p-4 space-y-2">
					<!-- Dashboard - Todos -->
					<a href="/" class="nav-link {currentPath === '/' ? 'active' : ''}">
						<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2"/>
						</svg>
						Dashboard
					</a>
					
					<!-- Produtos - Admin e Vendor -->
					{#if hasPermission(['admin', 'vendor'])}
						<a href="/produtos" class="nav-link {currentPath === '/produtos' ? 'active' : ''}">
							<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
							</svg>
							{user?.role === 'admin' ? 'Todos os Produtos' : 'Meus Produtos'}
						</a>
					{/if}
					
					<!-- Pedidos - Admin e Vendor -->
					{#if hasPermission(['admin', 'vendor'])}
						<a href="/pedidos" class="nav-link {currentPath === '/pedidos' ? 'active' : ''}">
							<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
							</svg>
							{user?.role === 'admin' ? 'Todos os Pedidos' : 'Meus Pedidos'}
						</a>
					{/if}
					
					<!-- Usuários - Só Admin -->
					{#if hasPermission(['admin'])}
						<a href="/usuarios" class="nav-link {currentPath === '/usuarios' ? 'active' : ''}">
							<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
							</svg>
							Usuários
						</a>
					{/if}
					
					<!-- Relatórios - Todos -->
					{#if hasPermission(['admin', 'vendor'])}
						<a href="/relatorios" class="nav-link {currentPath === '/relatorios' ? 'active' : ''}">
							<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
							</svg>
							{user?.role === 'admin' ? 'Relatórios Gerais' : 'Meus Relatórios'}
						</a>
					{/if}
					
					<div class="pt-4 border-t border-gray-200">
						<!-- Configurações - Todos -->
						<a href="/configuracoes" class="nav-link {currentPath === '/configuracoes' ? 'active' : ''}">
							<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
							</svg>
							Configurações
						</a>
					</div>
				</nav>
			</aside>
			
			<!-- Main Content -->
			<main class="flex-1 overflow-auto">
				<div class="max-w-7xl mx-auto p-6">
					<slot />
				</div>
			</main>
		</div>
	</div>
	
	<!-- Overlay para fechar dropdown -->
	{#if showUserMenu}
		<div 
			class="fixed inset-0 z-40"
			on:click={closeUserMenu}
			on:keydown={closeUserMenu}
			role="button"
			tabindex="0"
		></div>
	{/if}
{/if}

<style>
	.nav-link {
		@apply flex items-center px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:text-gray-900;
	}
	
	.nav-link.active {
		@apply bg-primary-50 text-primary-700 border-r-2 border-primary-500;
	}
	
	.nav-link:hover {
		@apply bg-gray-50 text-gray-900;
	}
	
	.nav-link.active:hover {
		@apply bg-primary-100;
	}
</style>
