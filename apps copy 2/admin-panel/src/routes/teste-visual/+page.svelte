<script lang="ts">
	// Teste visual dos estilos unificados
	import Icon from '../../lib/Icon.svelte';
</script>

<svelte:head>
	<title>Teste Visual - Admin Panel</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">
				<Icon name="dashboard" size="lg" />
				Teste Visual de Estilos
			</h1>
			<p class="text-gray-600">Verificando se os estilos estão unificados e idênticos</p>
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
				<h3 class="text-lg font-medium text-gray-900">Ícones Profissionais</h3>
			</div>
			<div class="card-body">
				<div class="grid grid-cols-4 gap-2 text-center">
					<div class="p-2">
						<Icon name="dashboard" size="lg" fallbackColor="text-cyan-600" />
						<p class="text-xs mt-1">Dashboard</p>
					</div>
					<div class="p-2">
						<Icon name="products" size="lg" fallbackColor="text-cyan-600" />
						<p class="text-xs mt-1">Produtos</p>
					</div>
					<div class="p-2">
						<Icon name="users" size="lg" fallbackColor="text-cyan-600" />
						<p class="text-xs mt-1">Usuários</p>
					</div>
					<div class="p-2">
						<Icon name="settings" size="lg" fallbackColor="text-cyan-600" />
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
					<p class="text-gray-600">Todos os componentes agora usam o mesmo CSS centralizado:</p>
					<ul class="list-disc list-inside text-sm text-gray-600 mt-2">
						<li>Cores cyan (#00BFB3) consistentes</li>
						<li>Botões, cards, tabelas padronizados</li>
						<li>Ícones SVG profissionais (não emojis)</li>
						<li>Formulários com estilos iguais</li>
						<li><strong>Sistema totalmente unificado!</strong></li>
					</ul>
				</div>
				<div class="text-6xl">
					<Icon name="check" size="xl" fallbackColor="text-green-600" />
				</div>
			</div>
		</div>
	</div>
</div> 