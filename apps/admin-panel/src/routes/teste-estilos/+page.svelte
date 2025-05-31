<script lang="ts">
	// Página de teste para demonstrar estilos unificados
	let exemploForm = {
		nome: '',
		email: '',
		categoria: '',
		status: 'ativo'
	};
</script>

<svelte:head>
	<title>Teste de Estilos Unificados - Admin Panel</title>
</svelte:head>

<div class="space-y-8">
	<!-- Header da Página -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Teste de Estilos Unificados</h1>
			<p class="text-gray-600">Demonstração de que o Admin Panel usa os mesmos estilos da Store</p>
		</div>
		<div class="flex space-x-3">
			<button class="btn btn-secondary">Voltar</button>
			<button class="btn btn-primary">Salvar Tudo</button>
		</div>
	</div>

	<!-- Paleta de Cores -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-semibold text-gray-900">Paleta de Cores Unificada</h2>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
				<!-- Tons de Cyan -->
				<div class="space-y-2">
					<h3 class="text-sm font-medium text-gray-700">Cyan (Primária)</h3>
					<div class="w-full h-12 bg-cyan-50 rounded border flex items-center justify-center text-xs">50</div>
					<div class="w-full h-12 bg-cyan-100 rounded border flex items-center justify-center text-xs">100</div>
					<div class="w-full h-12 bg-cyan-200 rounded border flex items-center justify-center text-xs">200</div>
					<div class="w-full h-12 bg-cyan-300 rounded border flex items-center justify-center text-xs">300</div>
					<div class="w-full h-12 bg-cyan-400 rounded border flex items-center justify-center text-xs text-white">400</div>
					<div class="w-full h-12 bg-cyan-500 rounded border flex items-center justify-center text-xs text-white">500</div>
					<div class="w-full h-12 bg-cyan-600 rounded border flex items-center justify-center text-xs text-white">600</div>
					<div class="w-full h-12 bg-cyan-700 rounded border flex items-center justify-center text-xs text-white">700</div>
				</div>
				
				<!-- Tons de Cinza -->
				<div class="space-y-2">
					<h3 class="text-sm font-medium text-gray-700">Gray</h3>
					<div class="w-full h-12 bg-gray-50 rounded border flex items-center justify-center text-xs">50</div>
					<div class="w-full h-12 bg-gray-100 rounded border flex items-center justify-center text-xs">100</div>
					<div class="w-full h-12 bg-gray-200 rounded border flex items-center justify-center text-xs">200</div>
					<div class="w-full h-12 bg-gray-300 rounded border flex items-center justify-center text-xs text-white">300</div>
					<div class="w-full h-12 bg-gray-400 rounded border flex items-center justify-center text-xs text-white">400</div>
					<div class="w-full h-12 bg-gray-500 rounded border flex items-center justify-center text-xs text-white">500</div>
					<div class="w-full h-12 bg-gray-600 rounded border flex items-center justify-center text-xs text-white">600</div>
				</div>
				
				<!-- Status Colors -->
				<div class="space-y-2">
					<h3 class="text-sm font-medium text-gray-700">Status</h3>
					<div class="w-full h-12 bg-green-100 rounded border flex items-center justify-center text-xs">Success</div>
					<div class="w-full h-12 bg-yellow-100 rounded border flex items-center justify-center text-xs">Warning</div>
					<div class="w-full h-12 bg-red-100 rounded border flex items-center justify-center text-xs">Danger</div>
					<div class="w-full h-12 bg-blue-100 rounded border flex items-center justify-center text-xs">Info</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Botões -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-semibold text-gray-900">Componentes de Botão</h2>
		</div>
		<div class="card-body">
			<div class="space-y-4">
				<div>
					<h3 class="text-sm font-medium text-gray-700 mb-3">Variantes</h3>
					<div class="flex flex-wrap gap-3">
						<button class="btn btn-primary">Primário</button>
						<button class="btn btn-secondary">Secundário</button>
						<button class="btn btn-outline">Outline</button>
						<button class="btn btn-danger">Perigo</button>
					</div>
				</div>
				
				<div>
					<h3 class="text-sm font-medium text-gray-700 mb-3">Tamanhos</h3>
					<div class="flex flex-wrap gap-3 items-center">
						<button class="btn btn-primary btn-sm">Pequeno</button>
						<button class="btn btn-primary">Normal</button>
						<button class="btn btn-primary btn-lg">Grande</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Formulários -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-semibold text-gray-900">Componentes de Formulário</h2>
		</div>
		<div class="card-body">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="space-y-4">
					<div>
						<label class="label" for="nome">Nome Completo</label>
						<input 
							id="nome"
							type="text" 
							class="input" 
							placeholder="Digite seu nome"
							bind:value={exemploForm.nome}
						>
						<p class="help-text">Este campo é obrigatório</p>
					</div>
					
					<div>
						<label class="label" for="email">E-mail</label>
						<input 
							id="email"
							type="email" 
							class="input" 
							placeholder="seu@email.com"
							bind:value={exemploForm.email}
						>
					</div>
				</div>
				
				<div class="space-y-4">
					<div>
						<label class="label" for="categoria">Categoria</label>
						<select id="categoria" bind:value={exemploForm.categoria}>
							<option value="">Selecione uma categoria</option>
							<option value="admin">Administrador</option>
							<option value="vendedor">Vendedor</option>
							<option value="cliente">Cliente</option>
						</select>
					</div>
					
					<div>
						<label class="label" for="status">Status</label>
						<select id="status" bind:value={exemploForm.status}>
							<option value="ativo">Ativo</option>
							<option value="inativo">Inativo</option>
							<option value="pendente">Pendente</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Badges e Status -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-semibold text-gray-900">Badges e Status</h2>
		</div>
		<div class="card-body">
			<div class="flex flex-wrap gap-3">
				<span class="badge badge-success">Ativo</span>
				<span class="badge badge-warning">Pendente</span>
				<span class="badge badge-danger">Inativo</span>
				<span class="badge badge-info">Em Processamento</span>
			</div>
		</div>
	</div>

	<!-- Tabelas -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-semibold text-gray-900">Componente de Tabela</h2>
		</div>
		<div class="card-body p-0">
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Nome</th>
							<th>E-mail</th>
							<th>Status</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="font-medium">#001</td>
							<td>João Silva</td>
							<td class="text-gray-600">joao@exemplo.com</td>
							<td><span class="badge badge-success">Ativo</span></td>
							<td>
								<div class="flex space-x-2">
									<button class="btn btn-secondary btn-sm">Editar</button>
									<button class="btn btn-danger btn-sm">Excluir</button>
								</div>
							</td>
						</tr>
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="font-medium">#002</td>
							<td>Maria Santos</td>
							<td class="text-gray-600">maria@exemplo.com</td>
							<td><span class="badge badge-warning">Pendente</span></td>
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

	<!-- Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-medium text-gray-900">Card Exemplo 1</h3>
			</div>
			<div class="card-body">
				<p class="text-gray-600">Este é um exemplo de card usando os estilos unificados do marketplace.</p>
			</div>
			<div class="card-footer">
				<button class="btn btn-primary btn-sm">Ação</button>
			</div>
		</div>
		
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-medium text-gray-900">Card Exemplo 2</h3>
			</div>
			<div class="card-body">
				<p class="text-gray-600">Todos os componentes seguem o mesmo padrão visual da store.</p>
			</div>
			<div class="card-footer">
				<button class="btn btn-outline btn-sm">Ver Mais</button>
			</div>
		</div>
		
		<div class="card">
			<div class="card-header">
				<h3 class="text-lg font-medium text-gray-900">Card Exemplo 3</h3>
			</div>
			<div class="card-body">
				<p class="text-gray-600">Garantindo consistência visual em todo o marketplace.</p>
			</div>
			<div class="card-footer">
				<button class="btn btn-secondary btn-sm">Configurar</button>
			</div>
		</div>
	</div>

	<!-- Confirmação -->
	<div class="card">
		<div class="card-body">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-lg font-medium text-gray-900">✅ Estilos Unificados Confirmados!</h3>
					<p class="text-gray-600">O Admin Panel agora usa exatamente os mesmos estilos da Store com:</p>
					<ul class="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
						<li>Cores cyan (#00BFB3) e tons de cinza idênticos</li>
						<li>Tipografia Lato como fonte principal</li>
						<li>Componentes (.btn, .card, .table, .badge) unificados</li>
						<li>Container max-width de 1440px</li>
						<li>Sistema de transições consistente</li>
					</ul>
				</div>
				<div class="text-6xl">🎨</div>
			</div>
		</div>
	</div>
</div> 