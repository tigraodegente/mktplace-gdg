<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	
	// Dados específicos do Seller Panel
	const title = 'Seller Panel';
	const titleIcon = '🏪';
	const userInfo = {
		name: 'João da Silva',
		subtitle: 'Tech Store',
		initials: 'JS',
		role: 'seller'
	};
	
	// Menu específico do Seller - CENTRALIZADO
	const menuItems = [
		{ path: '/', icon: '📊', label: 'Dashboard' },
		{ path: '/produtos', icon: '📦', label: 'Meus Produtos' },
		{ path: '/pedidos', icon: '🛒', label: 'Pedidos' },
		{ path: '/financeiro', icon: '💰', label: 'Financeiro' },
		{ path: '/avaliacoes', icon: '⭐', label: 'Avaliações' },
		{ separator: true },
		{ path: '/estoque', icon: '📈', label: 'Estoque' },
		{ path: '/configuracoes', icon: '⚙️', label: 'Configurações' }
	];
	
	let currentPath = '';
	
	onMount(() => {
		currentPath = window.location.pathname;
	});
	
	function isActiveRoute(path: string): boolean {
		return currentPath === path;
	}
</script>

<!-- Layout usando CSS Global Centralizado -->
<div class="min-h-screen bg-gray-50">
	<!-- Header usando estilos globais -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-[1440px] mx-auto px-8">
			<div class="flex items-center justify-between h-16">
				<!-- Logo e Título -->
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<h1 class="text-xl font-bold text-gray-900">
							<span class="text-cyan-500">{titleIcon} {title}</span>
							<span class="text-gray-400 text-sm ml-2">| Marketplace GDG</span>
						</h1>
					</div>
				</div>
				
				<!-- User Menu -->
				<div class="flex items-center space-x-4">
					<!-- Notificações -->
					<button class="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-lg transition-colors">
						<span class="sr-only">Ver notificações</span>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
						</svg>
						<span class="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
					</button>
					
					<!-- User Profile -->
					<div class="flex items-center space-x-3">
						<div class="text-right">
							<p class="text-sm font-medium text-gray-900">{userInfo.name}</p>
							<p class="text-xs text-gray-500">{userInfo.subtitle}</p>
						</div>
						<div class="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
							<span class="text-white font-semibold text-sm">
								{userInfo.initials}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>
	
	<div class="flex">
		<!-- Sidebar usando navegação centralizada -->
		<aside class="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
			<nav class="p-4">
				<div class="space-y-1">
					{#each menuItems as item}
						{#if item.separator}
							<div class="border-t border-gray-200 my-4"></div>
						{:else}
							<a 
								href={item.path}
								class="nav-link {isActiveRoute(item.path || '') ? 'active' : ''}"
							>
								<span class="menu-icon">{item.icon}</span>
								{item.label}
							</a>
						{/if}
					{/each}
				</div>
				
				<!-- Footer da Sidebar -->
				<div class="mt-8 pt-4 border-t border-gray-200">
					<button class="nav-link w-full">
						<span class="menu-icon">🔄</span>
						Trocar Role
					</button>
					
					<button class="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1">
						<span class="menu-icon">🚪</span>
						Sair
					</button>
				</div>
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main class="flex-1 p-8 bg-gray-50">
			<div class="max-w-[1440px] mx-auto">
				<slot />
			</div>
		</main>
	</div>
</div>
