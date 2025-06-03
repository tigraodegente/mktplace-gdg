<script lang="ts">
	import { Button } from '$lib/components/ui';
	import { toast } from '$lib/stores/toast';
	
	let loading = $state(false);
	let response = $state('');
	let productId = $state('');
	
	async function testarCadastro() {
		loading = true;
		response = '';
		
		try {
			// Dados mínimos para teste
			const produtoTeste = {
				name: 'Produto Teste ' + Date.now(),
				sku: 'SKU-' + Date.now(),
				price: 99.90,
				description: 'Descrição do produto teste',
				quantity: 10,
				status: 'active',
				is_active: true
			};
			
			console.log('Enviando:', produtoTeste);
			
			const res = await fetch('/api/products', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(produtoTeste)
			});
			
			const data = await res.json();
			response = JSON.stringify(data, null, 2);
			
			if (res.ok) {
				productId = data.data.id;
				toast.success('Produto criado com sucesso!');
			} else {
				toast.error('Erro ao criar produto', data.error || data.message);
			}
			
		} catch (error) {
			console.error('Erro:', error);
			response = 'Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido');
			toast.error('Erro ao criar produto');
		} finally {
			loading = false;
		}
	}
	
	async function testarEdicao() {
		if (!productId) {
			toast.error('Primeiro crie um produto para testar a edição');
			return;
		}
		
		loading = true;
		response = '';
		
		try {
			// Buscar produto atual
			const getRes = await fetch(`/api/products/${productId}`);
			const getResult = await getRes.json();
			
			if (!getRes.ok) {
				response = 'Erro ao buscar produto: ' + JSON.stringify(getResult, null, 2);
				toast.error('Erro ao buscar produto');
				return;
			}
			
			// Modificar alguns campos
			const produtoEditado = {
				...getResult.data,
				name: getResult.data.name + ' (Editado)',
				price: 149.90,
				quantity: 20,
				description: 'Descrição editada do produto teste'
			};
			
			console.log('Enviando edição:', produtoEditado);
			
			const res = await fetch(`/api/products/${productId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(produtoEditado)
			});
			
			const data = await res.json();
			response = JSON.stringify(data, null, 2);
			
			if (res.ok) {
				toast.success('Produto editado com sucesso!');
			} else {
				toast.error('Erro ao editar produto', data.error || data.message);
			}
			
		} catch (error) {
			console.error('Erro:', error);
			response = 'Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido');
			toast.error('Erro ao editar produto');
		} finally {
			loading = false;
		}
	}
</script>

<div class="p-8 max-w-4xl mx-auto">
	<h1 class="text-2xl font-bold mb-6">Teste de Cadastro de Produto</h1>
	
	<div class="bg-white rounded-lg p-6 shadow-lg">
		<p class="text-gray-600 mb-4">
			Clique no botão abaixo para testar o cadastro de um produto com dados mínimos.
		</p>
		
		<Button onclick={testarCadastro} {loading}>
			{loading ? 'Testando...' : 'Testar Cadastro'}
		</Button>
		
		{#if productId}
			<Button onclick={testarEdicao} {loading} variant="secondary" class="ml-2">
				{loading ? 'Testando...' : 'Testar Edição'}
			</Button>
			
			<p class="text-sm text-gray-600 mt-2">
				ID do produto: <code class="bg-gray-100 px-1 rounded">{productId}</code>
			</p>
		{/if}
		
		{#if response}
			<div class="mt-6">
				<h3 class="font-semibold mb-2">Resposta:</h3>
				<pre class="bg-gray-100 p-4 rounded overflow-auto text-sm">{response}</pre>
			</div>
		{/if}
	</div>
</div> 