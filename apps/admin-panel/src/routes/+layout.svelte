<script lang="ts">
	import '../app.css';
	// Temporariamente comentado para teste:
	// import ProfessionalHeader from '../../../../packages/ui/src/lib/components/layout/ProfessionalHeader.svelte';
	import { page } from '$app/stores';
	
	// Mock data - seria substituído por dados reais da sessão
	const breadcrumbs = [
		{ label: 'Dashboard', href: '/' },
		{ label: 'Produtos' } // sem href = página atual
	];
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Header Temporário Simples -->
	<header class="bg-white border-b border-gray-200 h-16 flex items-center px-6">
		<h1 class="text-xl font-bold text-cyan-500">Admin Panel - Teste</h1>
	</header>
	
	<div class="flex flex-1">
		<!-- Sidebar Simples -->
		<aside class="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
			<nav class="flex-1 px-4 py-6 space-y-2">
				<a href="/" class="nav-link">Dashboard</a>
				<a href="/usuarios" class="nav-link">Usuários</a>
				<a href="/produtos" class="nav-link">Produtos</a>
				<a href="/pedidos" class="nav-link">Pedidos</a>
				<a href="/relatorios" class="nav-link">Relatórios</a>
				<a href="/configuracoes" class="nav-link">Configurações</a>
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
