<script lang="ts">
	import { onMount } from 'svelte';
	
	let productId = '00056193-38eb-4c48-9883-162e7f453a12'; // ID com histórico variado
	let loading = false;
	let result = '';
	let token = '';
	
	onMount(() => {
		token = localStorage.getItem('access_token') || 'No token';
	});
	
	async function testHistory() {
		loading = true;
		result = '';
		
		try {
			console.log('🧪 Testando histórico para produto:', productId);
			
			const token = localStorage.getItem('access_token');
			console.log('🔐 Token exists:', !!token);
			
			const response = await fetch(`/api/products/${productId}/history`, {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});
			
			console.log('📡 Response status:', response.status);
			console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
			
			const data = await response.json();
			console.log('📋 Response data:', data);
			
			result = JSON.stringify({
				status: response.status,
				ok: response.ok,
				headers: Object.fromEntries(response.headers.entries()),
				data: data
			}, null, 2);
			
		} catch (error) {
			console.error('❌ Erro completo:', error);
			result = `Erro: ${error.message}`;
		} finally {
			loading = false;
		}
	}
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-6">Debug - Histórico de Produtos</h1>
	
	<div class="space-y-4">
		<!-- Product ID -->
		<div>
			<label class="block text-sm font-medium mb-2">Product ID:</label>
			<input
				type="text"
				bind:value={productId}
				class="w-full p-3 border rounded-lg"
				placeholder="ID do produto"
			/>
			<p class="text-xs text-gray-600 mt-1">
				Produto com histórico variado: <strong>Adesivo de Porta Anjo 85cm</strong><br/>
				Tem 6 registros: created, updated (3x), unpublished, published
			</p>
		</div>
		
		<!-- Token Info -->
		<div>
			<label class="block text-sm font-medium mb-2">Token Info:</label>
			<div class="p-3 bg-gray-100 rounded-lg text-sm">
				{token ? `${token.substring(0, 50)}...` : 'Sem token'}
			</div>
		</div>
		
		<!-- Test Button -->
		<button
			onclick={testHistory}
			disabled={loading}
			class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
		>
			{loading ? 'Testando...' : 'Testar API'}
		</button>
		
		<!-- Result -->
		{#if result}
			<div>
				<label class="block text-sm font-medium mb-2">Resultado:</label>
				<pre class="p-4 bg-gray-900 text-green-400 rounded-lg text-sm overflow-auto max-h-96">{result}</pre>
			</div>
		{/if}
	</div>
</div> 