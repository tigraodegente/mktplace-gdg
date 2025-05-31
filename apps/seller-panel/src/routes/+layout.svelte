<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	
	// Simulação de usuário vendedor logado
	let user = {
		name: 'João da Silva',
		email: 'joao@techstore.com',
		role: 'seller',
		store: 'Tech Store'
	};
	
	let currentPath = '';
	
	onMount(() => {
		currentPath = window.location.pathname;
	});
	
	function isActiveRoute(path: string): boolean {
		return currentPath === path;
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-[1440px] mx-auto px-8">
			<div class="flex items-center justify-between h-16">
				<!-- Logo e Título -->
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<h1 class="text-xl font-bold text-gray-900">
							<span class="text-cyan-500">🏪 Seller Panel</span>
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
						<!-- Badge de notificação -->
						<span class="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
					</button>
					
					<!-- User Profile -->
					<div class="flex items-center space-x-3">
						<div class="text-right">
							<p class="text-sm font-medium text-gray-900">{user.name}</p>
							<p class="text-xs text-gray-500">{user.store}</p>
						</div>
						<div class="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
							<span class="text-white font-semibold text-sm">
								{user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>
	
	<div class="flex">
		<!-- Sidebar -->
		<aside class="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
			<nav class="p-4">
				<div class="space-y-1">
					<!-- Dashboard -->
					<a 
						href="/" 
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute('/') ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">📊</span>
						Dashboard
					</a>
					
					<!-- Produtos -->
					<a 
						href="/produtos" 
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute('/produtos') ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">📦</span>
						Meus Produtos
					</a>
					
					<!-- Pedidos -->
					<a 
						href="/pedidos" 
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute('/pedidos') ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">🛒</span>
						Pedidos
					</a>
					
					<!-- Financeiro -->
					<a 
						href="/financeiro" 
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute('/financeiro') ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">💰</span>
						Financeiro
					</a>
					
					<!-- Avaliações -->
					<a 
						href="/avaliacoes" 
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute('/avaliacoes') ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">⭐</span>
						Avaliações
					</a>
					
					<!-- Separador -->
					<div class="border-t border-gray-200 my-4"></div>
					
					<!-- Estoque -->
					<a 
						href="/estoque" 
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute('/estoque') ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">📈</span>
						Estoque
					</a>
					
					<!-- Configurações -->
					<a 
						href="/configuracoes" 
						class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
							{isActiveRoute('/configuracoes') ? 'bg-cyan-50 text-cyan-700 border-r-2 border-cyan-500' : 'text-gray-700 hover:bg-gray-50'}"
					>
						<span class="mr-3 text-lg">⚙️</span>
						Configurações
					</a>
				</div>
				
				<!-- Footer da Sidebar -->
				<div class="mt-8 pt-4 border-t border-gray-200">
					<button class="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
						<span class="mr-3 text-lg">🔄</span>
						Trocar Role
					</button>
					
					<button class="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1">
						<span class="mr-3 text-lg">🚪</span>
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
