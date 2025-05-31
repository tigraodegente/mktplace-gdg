<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Header Simples -->
	<header class="bg-white border-b border-gray-200 h-16 flex items-center px-6">
		<h1 class="text-xl font-bold text-cyan-500">Admin Panel</h1>
	</header>
	
	<div class="flex flex-1">
		<!-- Sidebar -->
		<aside class="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
			<nav class="flex-1 px-4 py-6 space-y-2">
				<a href="/" class="nav-link {$page.url.pathname === '/' ? 'active' : ''}">
					Dashboard
				</a>
				<a href="/usuarios" class="nav-link {$page.url.pathname === '/usuarios' ? 'active' : ''}">
					Usuários
				</a>
				<a href="/produtos" class="nav-link {$page.url.pathname === '/produtos' ? 'active' : ''}">
					Produtos
				</a>
				<a href="/pedidos" class="nav-link {$page.url.pathname === '/pedidos' ? 'active' : ''}">
					Pedidos
				</a>
				<a href="/relatorios" class="nav-link {$page.url.pathname === '/relatorios' ? 'active' : ''}">
					Relatórios
				</a>
				<a href="/configuracoes" class="nav-link {$page.url.pathname === '/configuracoes' ? 'active' : ''}">
					Configurações
				</a>
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main class="flex-1 overflow-auto">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<slot />
			</div>
		</main>
	</div>
</div>
