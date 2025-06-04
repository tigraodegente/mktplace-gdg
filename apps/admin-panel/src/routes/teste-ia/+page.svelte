<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	let testing = $state(false);
	let testResult = $state<any>(null);
	let testData = $state({
		name: 'Cesto Organizador de Brinquedos',
		price: 45.90,
		description: 'Um cesto para organizar brinquedos',
		category: 'Organização Infantil'
	});

	async function testConnection() {
		testing = true;
		testResult = null;
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field: 'name',
					currentData: testData,
					category: testData.category
				})
			});
			
			const result = await response.json();
			testResult = result;
			
			if (result.success) {
				toast.success('✅ Sistema de IA funcionando perfeitamente!');
			} else {
				toast.error('❌ Erro no sistema de IA: ' + result.error);
			}
		} catch (error) {
			console.error('Erro:', error);
			testResult = { success: false, error: 'Erro de conexão' };
			toast.error('❌ Erro de conexão');
		} finally {
			testing = false;
		}
	}

	async function testFullEnrichment() {
		testing = true;
		testResult = null;
		
		try {
			const response = await fetch('/api/ai/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'enrich_all',
					...testData
				})
			});
			
			const result = await response.json();
			testResult = result;
			
			if (result.success) {
				toast.success('✅ Enriquecimento completo funcionando!');
			} else {
				toast.error('❌ Erro no enriquecimento: ' + result.error);
			}
		} catch (error) {
			console.error('Erro:', error);
			testResult = { success: false, error: 'Erro de conexão' };
			toast.error('❌ Erro de conexão');
		} finally {
			testing = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<div class="bg-white border-b">
		<div class="max-w-4xl mx-auto px-4 py-6">
			<div class="flex items-center gap-3">
				<ModernIcon name="robot" size="lg" />
				<h1 class="text-2xl font-bold text-gray-900">Teste do Sistema de IA</h1>
			</div>
		</div>
	</div>
	
	<!-- Content -->
	<div class="max-w-4xl mx-auto p-6">
		<!-- Status Card -->
		<div class="bg-white rounded-lg p-6 border border-gray-200 mb-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Status da Configuração</h2>
			
			<div class="space-y-3">
				<div class="flex items-center gap-3">
					<div class="w-2 h-2 bg-green-500 rounded-full"></div>
					<span class="text-sm text-gray-600">Endpoint de IA configurado</span>
				</div>
				<div class="flex items-center gap-3">
					<div class="w-2 h-2 bg-green-500 rounded-full"></div>
					<span class="text-sm text-gray-600">Componentes de enriquecimento instalados</span>
				</div>
				<div class="flex items-center gap-3">
					<div class="w-2 h-2 bg-amber-500 rounded-full"></div>
					<span class="text-sm text-gray-600">OpenAI API Key - aguardando teste</span>
				</div>
			</div>
		</div>

		<!-- Test Data -->
		<div class="bg-white rounded-lg p-6 border border-gray-200 mb-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Dados de Teste</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Nome do Produto</label>
					<input
						type="text"
						bind:value={testData.name}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					/>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Preço</label>
					<input
						type="number"
						bind:value={testData.price}
						step="0.01"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					/>
				</div>
				
				<div class="md:col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
					<textarea
						bind:value={testData.description}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					></textarea>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
					<input
						type="text"
						bind:value={testData.category}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3]"
					/>
				</div>
			</div>
		</div>

		<!-- Test Buttons -->
		<div class="bg-white rounded-lg p-6 border border-gray-200 mb-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Testes Disponíveis</h2>
			
			<div class="flex flex-col sm:flex-row gap-4">
				<button
					onclick={testConnection}
					disabled={testing}
					class="flex-1 px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
				>
					{#if testing}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Testando...
					{:else}
						<ModernIcon name="zap" size="sm" />
						Teste Rápido (Campo Individual)
					{/if}
				</button>
				
				<button
					onclick={testFullEnrichment}
					disabled={testing}
					class="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
				>
					{#if testing}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Testando...
					{:else}
						<ModernIcon name="robot" size="xs" />
						Teste Completo (Produto Inteiro)
					{/if}
				</button>
			</div>
		</div>

		<!-- Test Results -->
		{#if testResult}
			<div class="bg-white rounded-lg p-6 border border-gray-200">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Resultado do Teste</h2>
				
				{#if testResult.success}
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<div class="flex items-center gap-2 mb-3">
							<ModernIcon name="check" size="sm" color="#16A34A" />
							<span class="font-medium text-green-800">Teste realizado com sucesso!</span>
						</div>
						
						<div class="bg-white rounded p-3 mt-3">
							<h4 class="font-medium text-gray-900 mb-2">Dados retornados pela IA:</h4>
							<pre class="text-sm text-gray-600 overflow-x-auto">{JSON.stringify(testResult.data, null, 2)}</pre>
						</div>
					</div>
				{:else}
					<div class="bg-red-50 border border-red-200 rounded-lg p-4">
						<div class="flex items-center gap-2 mb-3">
							<ModernIcon name="alert-triangle" size="sm" color="#DC2626" />
							<span class="font-medium text-red-800">Erro no teste</span>
						</div>
						
						<div class="text-red-700">
							<strong>Erro:</strong> {testResult.error}
						</div>
						
						{#if testResult.error.includes('API key')}
							<div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
								<strong>Como resolver:</strong>
								<ol class="list-decimal list-inside mt-2 space-y-1 text-sm">
									<li>Obtenha uma API key da OpenAI em: <a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-600 underline">platform.openai.com/api-keys</a></li>
									<li>Adicione no arquivo <code>.env</code>: <code>OPENAI_API_KEY="sk-..."</code></li>
									<li>Reinicie o servidor de desenvolvimento</li>
									<li>Teste novamente aqui</li>
								</ol>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div> 