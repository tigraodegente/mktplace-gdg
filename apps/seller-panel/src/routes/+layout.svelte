<script lang="ts">
	import '../app.css';

	let { children } = $props();

	let sidebarOpen = $state(false);
	
	const menuItems = [
		{ href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ href: '/produtos', label: 'Produtos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
		{ href: '/pedidos', label: 'Pedidos', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
		{ href: '/financeiro', label: 'Financeiro', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
		{ href: '/avaliacoes', label: 'Avaliações', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
		{ href: '/configuracoes', label: 'Configurações', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
	];
</script>

<div class="min-h-screen bg-gray-100">
	<!-- Sidebar Mobile Overlay -->
	{#if sidebarOpen}
		<button 
			class="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
			onclick={() => sidebarOpen = false}
			aria-label="Fechar menu"
		></button>
	{/if}
	
	<!-- Sidebar -->
	<div class="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out">
		<div class="flex items-center justify-between h-16 px-4 bg-gray-800">
			<h2 class="text-xl font-semibold text-white">Painel do Vendedor</h2>
			<button 
				class="lg:hidden text-gray-400 hover:text-white"
				onclick={() => sidebarOpen = false}
				aria-label="Fechar menu lateral"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
			</button>
		</div>
		
		<nav class="mt-8 px-4">
			{#each menuItems as item}
				<a 
					href={item.href} 
					class="flex items-center px-4 py-3 mt-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
				>
					<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
					</svg>
					{item.label}
				</a>
			{/each}
		</nav>
		
		<!-- User Info -->
		<div class="absolute bottom-0 w-full p-4 border-t border-gray-800">
			<div class="flex items-center">
				<div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
					<span class="text-white font-medium">JD</span>
				</div>
				<div class="ml-3">
					<p class="text-sm font-medium text-white">João da Silva</p>
					<p class="text-xs text-gray-400">Loja Tech Store</p>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Main Content -->
	<div class="lg:ml-64">
		<!-- Top Header -->
		<header class="bg-white shadow-sm">
			<div class="flex items-center justify-between px-4 py-4">
				<button 
					class="lg:hidden text-gray-600 hover:text-gray-900"
					onclick={() => sidebarOpen = true}
					aria-label="Abrir menu lateral"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
					</svg>
				</button>
				
				<div class="flex items-center space-x-4 ml-auto">
					<!-- Notifications -->
					<button class="relative text-gray-600 hover:text-gray-900" aria-label="Notificações">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
						</svg>
						<span class="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
					</button>
					
					<!-- Profile -->
					<button class="flex items-center text-gray-600 hover:text-gray-900" aria-label="Menu do perfil">
						<div class="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</button>
				</div>
			</div>
		</header>
		
		<!-- Page Content -->
		<main>
			{@render children()}
		</main>
	</div>
</div>
