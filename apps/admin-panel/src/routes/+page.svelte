<!-- Deploy seletivo do admin funcionando! -->
<script lang="ts">
	// Página inicial do Admin Panel
	import { onMount } from 'svelte';
	
	let currentTime = new Date().toLocaleString('pt-BR');
	let emojiSupport = false;
	let systemInfo = '';
	
	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date().toLocaleString('pt-BR');
		}, 1000);
		
		// Detectar suporte a emoji
		detectEmojiSupport();
		getSystemInfo();
		
		return () => clearInterval(interval);
	});
	
	function detectEmojiSupport() {
		// Criar canvas para testar renderização de emoji
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = 10;
		canvas.height = 10;
		
		if (context) {
			context.textBaseline = 'top';
			context.font = '16px Arial';
			
			// Testar emoji simples
			context.fillText('😀', 0, 0);
			const emojiData = context.getImageData(0, 0, 10, 10).data;
			
			// Se renderizou algo (não apenas pixels vazios)
			emojiSupport = emojiData.some(pixel => pixel !== 0);
		}
	}
	
	function getSystemInfo() {
		systemInfo = `
			OS: ${navigator.platform}
			Browser: ${navigator.userAgent.split(' ')[0]}
			Emoji Support: ${emojiSupport ? 'SIM' : 'NÃO'}
		`;
	}
</script>

<svelte:head>
	<title>Dashboard - Admin Panel</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header do Dashboard -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				<span class="menu-icon">📊</span>
				Dashboard Admin
			</h1>
			<p class="text-gray-600 mt-1">Painel administrativo do Marketplace GDG</p>
			<p class="text-sm text-gray-500">{currentTime}</p>
		</div>
		<div class="flex space-x-3">
			<button class="btn btn-secondary">
				<span class="menu-icon">📋</span>
				Relatórios
			</button>
			<button class="btn btn-primary">
				<span class="menu-icon">➕</span>
				Novo Item
			</button>
		</div>
	</div>

	<!-- Teste de Emojis -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-lg font-medium text-gray-900">
				<span class="menu-icon">🧪</span>
				Diagnóstico do Sistema
			</h2>
		</div>
		<div class="card-body">
			<!-- Info do Sistema -->
			<div class="mb-6 p-4 bg-gray-50 rounded-lg">
				<h3 class="font-medium text-gray-900 mb-2">Informações do Sistema:</h3>
				<pre class="text-sm text-gray-600 whitespace-pre-wrap">{systemInfo}</pre>
			</div>
			
			<!-- Teste Visual de Emojis -->
			<div class="grid grid-cols-4 gap-4 text-center mb-6">
				<div class="p-4 bg-gray-50 rounded-lg">
					<span class="menu-icon text-3xl">📊</span>
					<p class="text-sm mt-2">Dashboard</p>
					<p class="text-xs text-gray-500">Emoji Original</p>
				</div>
				<div class="p-4 bg-gray-50 rounded-lg">
					<span class="menu-icon text-3xl">📦</span>
					<p class="text-sm mt-2">Produtos</p>
					<p class="text-xs text-gray-500">Emoji Original</p>
				</div>
				<div class="p-4 bg-gray-50 rounded-lg">
					<span class="menu-icon text-3xl">🛒</span>
					<p class="text-sm mt-2">Pedidos</p>
					<p class="text-xs text-gray-500">Emoji Original</p>
				</div>
				<div class="p-4 bg-gray-50 rounded-lg">
					<span class="menu-icon text-3xl">👥</span>
					<p class="text-sm mt-2">Usuários</p>
					<p class="text-xs text-gray-500">Emoji Original</p>
				</div>
			</div>
			
			<!-- Ícones SVG Alternativos -->
			<div class="grid grid-cols-4 gap-4 text-center mb-6">
				<div class="p-4 bg-blue-50 rounded-lg">
					<svg class="w-8 h-8 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
					<p class="text-sm mt-2">Dashboard</p>
					<p class="text-xs text-gray-500">Ícone SVG</p>
				</div>
				<div class="p-4 bg-green-50 rounded-lg">
					<svg class="w-8 h-8 mx-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
					</svg>
					<p class="text-sm mt-2">Produtos</p>
					<p class="text-xs text-gray-500">Ícone SVG</p>
				</div>
				<div class="p-4 bg-purple-50 rounded-lg">
					<svg class="w-8 h-8 mx-auto text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
					</svg>
					<p class="text-sm mt-2">Pedidos</p>
					<p class="text-xs text-gray-500">Ícone SVG</p>
				</div>
				<div class="p-4 bg-cyan-50 rounded-lg">
					<svg class="w-8 h-8 mx-auto text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
					</svg>
					<p class="text-sm mt-2">Usuários</p>
					<p class="text-xs text-gray-500">Ícone SVG</p>
				</div>
			</div>
			
			<!-- Status do Diagnóstico -->
			<div class="p-4 rounded-lg {emojiSupport ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
				{#if emojiSupport}
					<p class="text-sm text-green-700">
						<span class="menu-icon">✅</span>
						<strong>Emojis funcionando!</strong> Seu sistema suporta renderização de emojis coloridos.
					</p>
				{:else}
					<p class="text-sm text-red-700">
						<span>❌</span>
						<strong>Emojis não suportados.</strong> Vamos usar ícones SVG como alternativa.
					</p>
					<p class="text-xs text-red-600 mt-2">
						Possíveis soluções: Atualize seu navegador, ative fontes de emoji no sistema ou use outro browser.
					</p>
				{/if}
			</div>
		</div>
	</div>

	<!-- Cards de Status -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<span class="text-cyan-600 text-3xl menu-icon">👤</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Total Usuários</p>
						<p class="text-2xl font-bold text-gray-900">1,234</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<span class="text-green-600 text-3xl menu-icon">💰</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Receita Total</p>
						<p class="text-2xl font-bold text-gray-900">R$ 45.678</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<span class="text-blue-600 text-3xl menu-icon">🛒</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Pedidos Hoje</p>
						<p class="text-2xl font-bold text-gray-900">89</p>
					</div>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-body">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<span class="text-yellow-600 text-3xl menu-icon">📦</span>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-600">Produtos</p>
						<p class="text-2xl font-bold text-gray-900">567</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Ações Rápidas -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-lg font-medium text-gray-900">
				<span class="menu-icon">⚡</span>
				Ações Rápidas
			</h2>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<button class="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
					<span class="menu-icon text-lg">➕</span>
					<span class="font-medium">Criar Produto</span>
				</button>
				<button class="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
					<span class="menu-icon text-lg">👤</span>
					<span class="font-medium">Adicionar Usuário</span>
				</button>
				<button class="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
					<span class="menu-icon text-lg">📊</span>
					<span class="font-medium">Ver Relatórios</span>
				</button>
				<button class="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
					<span class="menu-icon text-lg">🛒</span>
					<span class="font-medium">Gerenciar Pedidos</span>
				</button>
				<button class="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
					<span class="menu-icon text-lg">⚙️</span>
					<span class="font-medium">Configurações</span>
				</button>
				<button class="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
					<span class="menu-icon text-lg">📈</span>
					<span class="font-medium">Analytics</span>
				</button>
			</div>
		</div>
	</div>
</div>
