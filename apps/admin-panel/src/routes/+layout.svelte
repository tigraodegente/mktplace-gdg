<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	
	// Garantir que page está carregado
	let currentPath = '/';
	
	page.subscribe((p) => {
		if (p?.url?.pathname) {
			currentPath = p.url.pathname;
		}
	});
</script>

<svelte:head>
	<title>Admin Panel - Marketplace GDG</title>
	<meta name="description" content="Painel Administrativo do Marketplace" />
</svelte:head>

<div style="min-height: 100vh; background-color: #f9fafb; display: flex; flex-direction: column;">
	<!-- Header Simples -->
	<header style="background-color: white; border-bottom: 1px solid #e5e7eb; height: 64px; display: flex; align-items: center; padding: 0 24px;">
		<h1 style="font-size: 20px; font-weight: bold; color: #00BFB3;">Admin Panel</h1>
	</header>
	
	<div style="display: flex; flex: 1;">
		<!-- Sidebar -->
		<aside style="width: 256px; background-color: white; border-right: 1px solid #e5e7eb; height: 100%; overflow-y: auto;">
			<nav style="flex: 1; padding: 24px 16px; display: flex; flex-direction: column; gap: 8px;">
				<a href="/" class="nav-link {currentPath === '/' ? 'active' : ''}">
					Dashboard
				</a>
				<a href="/usuarios" class="nav-link {currentPath === '/usuarios' ? 'active' : ''}">
					Usuários
				</a>
				<a href="/produtos" class="nav-link {currentPath === '/produtos' ? 'active' : ''}">
					Produtos
				</a>
				<a href="/pedidos" class="nav-link {currentPath === '/pedidos' ? 'active' : ''}">
					Pedidos
				</a>
				<a href="/relatorios" class="nav-link {currentPath === '/relatorios' ? 'active' : ''}">
					Relatórios
				</a>
				<a href="/configuracoes" class="nav-link {currentPath === '/configuracoes' ? 'active' : ''}">
					Configurações
				</a>
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main style="flex: 1; overflow: auto;">
			<div style="max-width: 1280px; margin: 0 auto; padding: 32px 16px;">
				<slot />
			</div>
		</main>
	</div>
</div>

<style>
	.nav-link {
		display: flex;
		align-items: center;
		padding: 8px 16px;
		color: #374151;
		text-decoration: none;
		border-radius: 4px;
		transition: all 0.2s;
	}
	
	.nav-link:hover {
		background-color: #f3f4f6;
		color: #00BFB3;
	}
	
	.nav-link.active {
		background-color: #00BFB3;
		color: white;
	}
</style>
