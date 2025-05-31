<script lang="ts">
	// Teste visual dos estilos unificados
</script>

<svelte:head>
	<title>Teste Visual - Seller Panel</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-[1440px] mx-auto px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center">
					<h1 class="text-xl font-bold text-gray-900">
						<span class="text-cyan-500">🏪 Teste Visual Seller</span>
						<span class="text-gray-400 text-sm ml-2">| Marketplace GDG</span>
					</h1>
				</div>
			</div>
		</div>
	</header>
	
	<div class="flex">
		<!-- Sidebar -->
		<aside class="w-64 bg-white shadow-sm min-h-screen border-r border-gray-200">
			<nav class="p-4">
				<div class="space-y-1">
					<a href="/teste-visual" class="nav-link active">
						<span class="menu-icon">🎨</span>
						Teste Visual
					</a>
				</div>
			</nav>
		</aside>
		
		<!-- Main Content -->
		<main class="flex-1 p-8 bg-gray-50">
			<div class="max-w-[1440px] mx-auto space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900 mb-8">
							<span class="menu-icon">��</span>
							Teste Visual - Seller Panel
						</h1>
						<p class="text-gray-600">Verificando se os estilos estão unificados e idênticos ao Admin Panel</p>
					</div>
					<div class="flex space-x-3">
						<button class="btn btn-secondary">Secundário</button>
						<button class="btn btn-primary">Primário</button>
					</div>
				</div>

				<!-- Cards de Teste -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="card">
						<div class="card-header">
							<h3 class="text-lg font-medium text-gray-900">Card de Teste 1</h3>
						</div>
						<div class="card-body">
							<p class="text-gray-600">Este card usa os estilos centralizados do package UI.</p>
							<div class="mt-4 flex space-x-2">
								<span class="badge badge-success">Sucesso</span>
								<span class="badge badge-warning">Aviso</span>
								<span class="badge badge-info">Info</span>
							</div>
						</div>
					</div>

					<div class="card">
						<div class="card-header">
							<h3 class="text-lg font-medium text-gray-900">Cores de Teste</h3>
						</div>
						<div class="card-body">
							<div class="space-y-2">
								<div class="w-full h-8 bg-cyan-500 rounded flex items-center justify-center text-white text-sm">
									Cyan 500 (#00BFB3)
								</div>
								<div class="w-full h-8 bg-cyan-600 rounded flex items-center justify-center text-white text-sm">
									Cyan 600 (Hover)
								</div>
								<div class="w-full h-8 bg-gray-100 rounded flex items-center justify-center text-gray-700 text-sm">
									Gray 100
								</div>
							</div>
						</div>
					</div>

					<div class="card">
						<div class="card-header">
							<h3 class="text-lg font-medium text-gray-900">Ícones de Teste</h3>
						</div>
						<div class="card-body">
							<div class="grid grid-cols-4 gap-2 text-center">
								<div class="p-2">
									<span class="text-2xl">📊</span>
									<p class="text-xs mt-1">Dashboard</p>
								</div>
								<div class="p-2">
									<span class="text-2xl">📦</span>
									<p class="text-xs mt-1">Produtos</p>
								</div>
								<div class="p-2">
									<span class="text-2xl">👥</span>
									<p class="text-xs mt-1">Usuários</p>
								</div>
								<div class="p-2">
									<span class="text-2xl">⚙️</span>
									<p class="text-xs mt-1">Config</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Tabela de Teste -->
				<div class="card">
					<div class="card-header">
						<h3 class="text-lg font-medium text-gray-900">Tabela de Teste</h3>
					</div>
					<div class="card-body p-0">
						<div class="overflow-x-auto">
							<table class="table">
								<thead>
									<tr>
										<th>ID</th>
										<th>Nome</th>
										<th>Status</th>
										<th>Ações</th>
									</tr>
								</thead>
								<tbody>
									<tr class="hover:bg-gray-50 transition-colors">
										<td class="font-medium">#001</td>
										<td>Teste de Item</td>
										<td><span class="badge badge-success">Ativo</span></td>
										<td>
											<div class="flex space-x-2">
												<button class="btn btn-secondary btn-sm">Editar</button>
												<button class="btn btn-danger btn-sm">Excluir</button>
											</div>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>

				<!-- Formulário de Teste -->
				<div class="card">
					<div class="card-header">
						<h3 class="text-lg font-medium text-gray-900">Formulário de Teste</h3>
					</div>
					<div class="card-body">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="label" for="teste-input">Campo de Teste</label>
								<input id="teste-input" type="text" class="input" placeholder="Digite algo aqui">
								<p class="help-text">Este é um texto de ajuda</p>
							</div>
							<div>
								<label class="label" for="teste-select">Select de Teste</label>
								<select id="teste-select">
									<option value="">Escolha uma opção</option>
									<option value="1">Opção 1</option>
									<option value="2">Opção 2</option>
								</select>
							</div>
						</div>
					</div>
					<div class="card-footer">
						<div class="flex justify-end space-x-3">
							<button class="btn btn-outline">Cancelar</button>
							<button class="btn btn-primary">Salvar</button>
						</div>
					</div>
				</div>

				<!-- Confirmação -->
				<div class="card">
					<div class="card-body">
						<div class="flex items-center justify-between">
							<div>
								<h3 class="text-lg font-medium text-gray-900">✅ Estilos Unificados Funcionando!</h3>
								<p class="text-gray-600">Este Seller Panel usa EXATAMENTE os mesmos estilos do Admin Panel:</p>
								<ul class="list-disc list-inside text-sm text-gray-600 mt-2">
									<li>Cores cyan (#00BFB3) consistentes</li>
									<li>Botões, cards, tabelas padronizados</li>
									<li>Ícones emoji unificados</li>
									<li>Formulários com estilos iguais</li>
									<li><strong>UM arquivo CSS = DOIS painéis iguais!</strong></li>
								</ul>
							</div>
							<div class="text-6xl">🏪</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	</div>
</div> 