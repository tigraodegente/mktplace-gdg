<script>
	import Icon from '../../lib/Icon.svelte';
</script>

<svelte:head>
	<title>🔧 Teste de Botões - Debug CSS</title>
</svelte:head>

<div class="p-8 space-y-6">
	<h1 class="text-3xl font-bold text-gray-900">🔧 Teste de Botões CSS</h1>
	
	<!-- Teste com classes CSS -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-bold">Botões usando classes CSS</h2>
		</div>
		<div class="card-body space-y-4">
			<button class="btn btn-primary">
				<Icon name="check" size="md" />
				Botão Primário (deveria ser turquesa #00BFB3)
			</button>
			
			<button class="btn btn-secondary">
				<Icon name="settings" size="md" />
				Botão Secundário
			</button>
			
			<button class="btn btn-danger">
				<Icon name="logout" size="md" fallbackColor="text-white" />
				Botão Perigo (vermelho)
			</button>
		</div>
	</div>
	
	<!-- Teste com estilos inline -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-bold">Botões com estilos inline (teste de fallback)</h2>
		</div>
		<div class="card-body space-y-4">
			<button style="background-color: #00BFB3; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: 500;">
				<Icon name="check" size="md" />
				Botão Inline Turquesa
			</button>
			
			<button style="background-color: #f3f4f6; color: #374151; padding: 12px 24px; border: 1px solid #d1d5db; border-radius: 6px; font-weight: 500;">
				<Icon name="settings" size="md" />
				Botão Inline Cinza
			</button>
		</div>
	</div>
	
	<!-- Debug Info -->
	<div class="card">
		<div class="card-header">
			<h2 class="text-xl font-bold">🐛 Debug Info</h2>
		</div>
		<div class="card-body">
			<div class="space-y-2 text-sm">
				<p><strong>CSS importado:</strong> ../../../packages/ui/src/lib/styles/global.css</p>
				<p><strong>Cor esperada:</strong> #00BFB3 (turquesa)</p>
				<p><strong>Classes aplicadas:</strong> .btn .btn-primary</p>
				<p><strong>Se os botões estão cinza:</strong> problema de build ou cache</p>
			</div>
			
			<div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
				<h3 class="font-bold text-yellow-800">🔍 Instruções de Debug:</h3>
				<ol class="list-decimal list-inside text-yellow-700 text-sm mt-2 space-y-1">
					<li>Se botão CSS estiver cinza: problema no CSS global</li>
					<li>Se botão inline estiver turquesa: CSS não carregou</li>
					<li>Force refresh: Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)</li>
					<li>Verifique Developer Tools → Network → app.css</li>
				</ol>
			</div>
		</div>
	</div>
</div> 