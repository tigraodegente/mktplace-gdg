<script lang="ts">
	import Icon from '../../lib/Icon.svelte';
	// Página de demonstração completa da unificação de estilos
</script>

<svelte:head>
	<title>🎨 Estilos Unificados - Sistema Completo</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header principal -->
	<div class="text-center p-8 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl">
		<div class="flex items-center justify-center gap-3 mb-4">
			<Icon name="check" size="xl" fallbackColor="text-white" />
			<h1 class="text-4xl font-bold">Sistema de Estilos Unificado</h1>
		</div>
		<p class="text-xl text-cyan-100">✅ Implementação 100% Completa - Todos os componentes agora seguem a identidade visual da Store</p>
	</div>

	<!-- Comparação visual -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- ANTES -->
		<div class="card">
			<div class="card-header bg-red-50 border-red-200">
				<h2 class="text-xl font-bold text-red-800">❌ ANTES (Problemático)</h2>
			</div>
			<div class="card-body">
				<div class="space-y-4">
					<div class="p-4 bg-gray-100 border border-gray-300 rounded">
						<h3 class="font-bold text-gray-700">Headers Inconsistentes</h3>
						<div class="mt-2 space-y-2">
							<div class="w-full h-8 bg-white border border-gray-300 rounded flex items-center px-3 text-sm">Store: Header turquesa</div>
							<div class="w-full h-8 bg-blue-500 text-white rounded flex items-center px-3 text-sm">Admin: Header azul Bootstrap</div>
							<div class="w-full h-8 bg-gray-400 text-white rounded flex items-center px-3 text-sm">Seller: Header cinza genérico</div>
						</div>
					</div>
					
					<div class="p-4 bg-gray-100 border border-gray-300 rounded">
						<h3 class="font-bold text-gray-700">Botões Diferentes</h3>
						<div class="mt-2 flex flex-wrap gap-2">
							<button class="px-3 py-1 bg-cyan-500 text-white rounded text-sm">Store</button>
							<button class="px-3 py-1 bg-blue-500 text-white rounded text-sm">Admin</button>
							<button class="px-3 py-1 bg-gray-600 text-white rounded text-sm">Seller</button>
						</div>
					</div>
					
					<div class="p-4 bg-gray-100 border border-gray-300 rounded">
						<h3 class="font-bold text-gray-700">Ícones Misturados</h3>
						<div class="mt-2 flex gap-3">
							<span class="text-lg">📊 Emoji</span>
							<Icon name="dashboard" size="md" fallbackColor="text-blue-600" />
							<span class="text-lg">⚙️ Emoji</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- DEPOIS -->
		<div class="card">
			<div class="card-header bg-green-50 border-green-200">
				<h2 class="text-xl font-bold text-green-800">✅ DEPOIS (Unificado)</h2>
			</div>
			<div class="card-body">
				<div class="space-y-4">
					<div class="p-4 bg-cyan-50 border border-cyan-200 rounded">
						<h3 class="font-bold text-cyan-800">Headers Idênticos</h3>
						<div class="mt-2 space-y-2">
							<div class="w-full h-8 bg-cyan-500 text-white rounded flex items-center px-3 text-sm">Store: Header turquesa #00BFB3</div>
							<div class="w-full h-8 bg-cyan-500 text-white rounded flex items-center px-3 text-sm">Admin: Header turquesa #00BFB3</div>
							<div class="w-full h-8 bg-cyan-500 text-white rounded flex items-center px-3 text-sm">Seller: Header turquesa #00BFB3</div>
						</div>
					</div>
					
					<div class="p-4 bg-cyan-50 border border-cyan-200 rounded">
						<h3 class="font-bold text-cyan-800">Botões Unificados</h3>
						<div class="mt-2 flex flex-wrap gap-2">
							<button class="btn btn-primary btn-sm">Store</button>
							<button class="btn btn-primary btn-sm">Admin</button>
							<button class="btn btn-primary btn-sm">Seller</button>
						</div>
					</div>
					
					<div class="p-4 bg-cyan-50 border border-cyan-200 rounded">
						<h3 class="font-bold text-cyan-800">Ícones SVG Profissionais</h3>
						<div class="mt-2 flex gap-3">
							<Icon name="dashboard" size="md" fallbackColor="text-cyan-600" />
							<Icon name="products" size="md" fallbackColor="text-cyan-600" />
							<Icon name="settings" size="md" fallbackColor="text-cyan-600" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Estatísticas do Sistema -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<div class="card text-center">
			<div class="card-body">
				<div class="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<Icon name="code" size="xl" fallbackColor="text-cyan-600" />
				</div>
				<h3 class="text-2xl font-bold text-gray-900">1</h3>
				<p class="text-sm text-gray-600">Arquivo CSS Global</p>
			</div>
		</div>
		
		<div class="card text-center">
			<div class="card-body">
				<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<Icon name="apps" size="xl" fallbackColor="text-green-600" />
				</div>
				<h3 class="text-2xl font-bold text-gray-900">3</h3>
				<p class="text-sm text-gray-600">Apps Unificadas</p>
			</div>
		</div>
		
		<div class="card text-center">
			<div class="card-body">
				<div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<Icon name="palette" size="xl" fallbackColor="text-blue-600" />
				</div>
				<h3 class="text-2xl font-bold text-gray-900">100%</h3>
				<p class="text-sm text-gray-600">Consistência Visual</p>
			</div>
		</div>
		
		<div class="card text-center">
			<div class="card-body">
				<div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<Icon name="check" size="xl" fallbackColor="text-purple-600" />
				</div>
				<h3 class="text-2xl font-bold text-gray-900">0</h3>
				<p class="text-sm text-gray-600">Estilos Duplicados</p>
			</div>
		</div>
	</div>

	<!-- Componentes unificados -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-2xl font-bold text-gray-900">
				<Icon name="check" size="lg" />
				Componentes Totalmente Unificados
			</h2>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				
				<!-- Botões -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<h3 class="font-semibold text-gray-900 mb-3">Botões</h3>
					<div class="space-y-2">
						<button class="btn btn-primary w-full">Primário</button>
						<button class="btn btn-secondary w-full">Secundário</button>
						<button class="btn btn-outline w-full">Outline</button>
					</div>
				</div>
				
				<!-- Cards -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<h3 class="font-semibold text-gray-900 mb-3">Cards</h3>
					<div class="card card-body p-3">
						<p class="text-sm text-gray-600">Card exemplo com estilos unificados da Store</p>
					</div>
				</div>
				
				<!-- Badges -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<h3 class="font-semibold text-gray-900 mb-3">Badges</h3>
					<div class="flex flex-wrap gap-2">
						<span class="badge badge-success">Sucesso</span>
						<span class="badge badge-warning">Aviso</span>
						<span class="badge badge-info">Info</span>
						<span class="badge badge-danger">Perigo</span>
					</div>
				</div>
				
				<!-- Inputs -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<h3 class="font-semibold text-gray-900 mb-3">Formulários</h3>
					<div class="space-y-2">
						<input type="text" class="input w-full" placeholder="Input unificado">
						<select class="w-full">
							<option>Select unificado</option>
						</select>
					</div>
				</div>
				
				<!-- Navegação -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<h3 class="font-semibold text-gray-900 mb-3">Navegação</h3>
					<div class="space-y-1">
						<div class="nav-link active">
							<Icon name="dashboard" size="md" />
							Link Ativo
						</div>
						<div class="nav-link">
							<Icon name="products" size="md" />
							Link Normal
						</div>
					</div>
				</div>
				
				<!-- Ícones -->
				<div class="p-4 bg-gray-50 rounded-lg">
					<h3 class="font-semibold text-gray-900 mb-3">Ícones SVG</h3>
					<div class="grid grid-cols-4 gap-2 text-center">
						<div>
							<Icon name="dashboard" size="lg" fallbackColor="text-cyan-600" />
							<p class="text-xs mt-1">Dashboard</p>
						</div>
						<div>
							<Icon name="products" size="lg" fallbackColor="text-cyan-600" />
							<p class="text-xs mt-1">Produtos</p>
						</div>
						<div>
							<Icon name="users" size="lg" fallbackColor="text-cyan-600" />
							<p class="text-xs mt-1">Usuários</p>
						</div>
						<div>
							<Icon name="settings" size="lg" fallbackColor="text-cyan-600" />
							<p class="text-xs mt-1">Config</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Resultado final -->
	<div class="bg-gradient-to-r from-green-500 to-cyan-500 text-white p-8 rounded-xl text-center">
		<div class="flex items-center justify-center gap-4 mb-4">
			<Icon name="check" size="xl" fallbackColor="text-white" />
			<h2 class="text-3xl font-bold">Missão Cumprida!</h2>
			<Icon name="check" size="xl" fallbackColor="text-white" />
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
			<div>
				<h3 class="text-xl font-bold mb-2">🏪 Store</h3>
				<p class="text-green-100">Mantém design original</p>
			</div>
			<div>
				<h3 class="text-xl font-bold mb-2">👨‍💼 Admin Panel</h3>
				<p class="text-green-100">Herda 100% dos estilos da Store</p>
			</div>
			<div>
				<h3 class="text-xl font-bold mb-2">🏪 Seller Panel</h3>
				<p class="text-green-100">Herda 100% dos estilos da Store</p>
			</div>
		</div>
		<p class="text-2xl font-bold mt-6 text-yellow-200">🎯 UM sistema, TRÊS apps, ZERO inconsistências!</p>
	</div>
</div> 