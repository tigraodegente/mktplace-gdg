<!-- Deploy seletivo do admin funcionando! -->
<script lang="ts">
	// Página inicial do Admin Panel
	import { onMount } from 'svelte';
	import Icon from '../lib/Icon.svelte';
	
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
				Debug CSS e Ícones
			</h2>
		</div>
		<div class="card-body">
			<!-- Info do Sistema -->
			<div class="mb-6 p-4 bg-gray-50 rounded-lg">
				<h3 class="font-medium text-gray-900 mb-2">Informações do Sistema:</h3>
				<pre class="text-sm text-gray-600 whitespace-pre-wrap">{systemInfo}</pre>
			</div>
			
			<!-- Debug CSS -->
			<div class="mb-6 p-4 bg-blue-50 rounded-lg">
				<h3 class="font-medium text-gray-900 mb-3">🔍 Debug CSS - O que está sendo aplicado:</h3>
				
				<!-- Teste direto de emoji -->
				<div class="mb-4">
					<h4 class="text-sm font-medium text-gray-700 mb-2">1. Emoji direto (sem classes):</h4>
					<span style="font-size: 1.125rem; margin-right: 0.75rem;">📊</span>
					<span>← Isso deveria ser um gráfico emoji</span>
				</div>
				
				<!-- Teste com classe menu-icon -->
				<div class="mb-4">
					<h4 class="text-sm font-medium text-gray-700 mb-2">2. Emoji com classe .menu-icon:</h4>
					<span class="menu-icon">📊</span>
					<span>← Com classe CSS aplicada</span>
				</div>
				
				<!-- Teste do componente Icon -->
				<div class="mb-4">
					<h4 class="text-sm font-medium text-gray-700 mb-2">3. Componente Icon (dashboard):</h4>
					<Icon name="dashboard" size="md" />
					<span>← Componente inteligente</span>
				</div>
				
				<!-- CSS aplicado -->
				<div class="mb-4">
					<h4 class="text-sm font-medium text-gray-700 mb-2">4. CSS computado da classe .menu-icon:</h4>
					<div class="text-xs bg-white p-2 rounded border">
						<code>
							margin-right: 0.75rem !important;<br>
							font-size: 1.125rem !important;<br>
							font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"...
						</code>
					</div>
				</div>
				
				<!-- Debug: CSS carregado? -->
				<div class="mb-4">
					<h4 class="text-sm font-medium text-gray-700 mb-2">5. CSS Global está carregando?</h4>
					<div class="css-debug-marker text-xs bg-white p-2 rounded border">
						<span class="text-green-600">✅ Se você vê esta caixa, o CSS global foi carregado</span>
					</div>
				</div>
				
				<!-- Debug: Classes específicas -->
				<div class="mb-4">
					<h4 class="text-sm font-medium text-gray-700 mb-2">6. Teste das classes específicas:</h4>
					<div class="text-xs bg-white p-2 rounded border space-y-1">
						<div class="flex items-center">
							<span class="w-4 h-4 bg-cyan-500 rounded mr-2"></span>
							<span>.bg-cyan-500 funcionando</span>
						</div>
						<div class="flex items-center">
							<span class="w-4 h-4 bg-gray-100 rounded mr-2"></span>
							<span>.bg-gray-100 funcionando</span>
						</div>
						<div>
							<span class="text-cyan-600">.text-cyan-600 funcionando</span>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Teste Visual de Emojis vs SVGs -->
			<div class="grid grid-cols-2 gap-6 mb-6">
				<!-- Coluna Emojis -->
				<div>
					<h3 class="font-medium text-gray-900 mb-3">🎭 Emojis Originais</h3>
					<div class="space-y-2">
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<span class="menu-icon">📊</span>
							<span class="text-sm">Dashboard</span>
						</div>
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<span class="menu-icon">📦</span>
							<span class="text-sm">Produtos</span>
						</div>
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<span class="menu-icon">🛒</span>
							<span class="text-sm">Pedidos</span>
						</div>
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<span class="menu-icon">👥</span>
							<span class="text-sm">Usuários</span>
						</div>
					</div>
				</div>
				
				<!-- Coluna SVGs -->
				<div>
					<h3 class="font-medium text-gray-900 mb-3">🖼️ Ícones SVG</h3>
					<div class="space-y-2">
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<Icon name="dashboard" size="md" />
							<span class="text-sm ml-3">Dashboard</span>
						</div>
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<Icon name="products" size="md" />
							<span class="text-sm ml-3">Produtos</span>
						</div>
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<Icon name="orders" size="md" />
							<span class="text-sm ml-3">Pedidos</span>
						</div>
						<div class="flex items-center p-2 bg-gray-50 rounded">
							<Icon name="users" size="md" />
							<span class="text-sm ml-3">Usuários</span>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Status do Diagnóstico -->
			<div class="p-4 rounded-lg {emojiSupport ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
				{#if emojiSupport}
					<p class="text-sm text-green-700">
						<span class="menu-icon">✅</span>
						<strong>Emojis detectados!</strong> Mas podem não estar renderizando corretamente por problemas de CSS.
					</p>
				{:else}
					<p class="text-sm text-red-700">
						<span>❌</span>
						<strong>Emojis não detectados.</strong> Usando ícones SVG como fallback.
					</p>
				{/if}
				
				<div class="mt-3 text-xs text-gray-600">
					<strong>Para debugar:</strong><br>
					1. Clique com botão direito em qualquer ícone acima<br>
					2. Selecione "Inspecionar elemento"<br>
					3. Veja que classes CSS estão sendo aplicadas<br>
					4. Mande screenshot da aba "Styles" no DevTools
				</div>
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
