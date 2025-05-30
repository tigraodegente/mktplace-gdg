<script lang="ts">
	import { goto } from '$app/navigation';
	
	let email = $state('');
	let isLoading = $state(false);
	let message = $state('');
	let error = $state('');
	let resetToken = $state(''); // Para desenvolvimento
	
	async function handleSubmit() {
		if (!email.trim()) {
			error = 'Email é obrigatório';
			return;
		}
		
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			error = 'Email inválido';
			return;
		}
		
		isLoading = true;
		error = '';
		message = '';
		
		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});
			
			const data = await response.json();
			
			if (!response.ok || !data.success) {
				throw new Error(data.error?.message || 'Erro ao processar solicitação');
			}
			
			message = data.message;
			
			// Em desenvolvimento, mostrar o token para facilitar testes
			if (data.resetToken) {
				resetToken = data.resetToken;
			}
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erro desconhecido';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Esqueci minha senha - Marketplace GDG</title>
	<meta name="description" content="Recupere sua senha do Marketplace GDG" />
</svelte:head>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<!-- Logo e Título -->
		<div class="text-center">
			<img src="/logo.png" alt="Marketplace GDG" class="h-16 w-auto mx-auto mb-4" />
			<h1 class="text-4xl font-bold text-[#00BFB3] mb-2">Marketplace GDG</h1>
			<h2 class="text-2xl font-semibold text-gray-900">Esqueci minha senha</h2>
			<p class="mt-2 text-gray-600">
				Digite seu email para receber as instruções de recuperação
			</p>
		</div>

		<!-- Formulário -->
		<div class="bg-white shadow-lg rounded-lg p-8">
			{#if message}
				<div class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
					<div class="flex">
						<svg class="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="ml-3">
							<p class="text-sm font-medium">{message}</p>
							
							{#if resetToken}
								<div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
									<p class="text-xs text-yellow-800 font-medium">🔧 Modo Desenvolvimento:</p>
									<a 
										href="/reset-password?token={resetToken}"
										class="text-xs text-blue-600 hover:text-blue-800 underline break-all"
									>
										Clique aqui para testar o reset de senha
									</a>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
			
			{#if error}
				<div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					<div class="flex">
						<svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="ml-3">
							<p class="text-sm">{error}</p>
						</div>
					</div>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
				<!-- Email -->
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						disabled={isLoading || !!message}
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
						placeholder="seu@email.com"
					/>
				</div>

				<!-- Botão de Envio -->
				<button
					type="submit"
					disabled={isLoading || !!message}
					class="w-full bg-[#00BFB3] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if isLoading}
						<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Enviando...
					{:else if message}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Enviado
					{:else}
						Enviar instruções
					{/if}
				</button>
			</form>

			<!-- Links -->
			<div class="mt-6 text-center space-y-4">
				<div class="text-sm">
					<a href="/login" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">
						← Voltar para o login
					</a>
				</div>
				
				<div class="text-sm text-gray-600">
					Não tem uma conta?
					<a href="/cadastro" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">
						Cadastre-se
					</a>
				</div>
			</div>
		</div>

		<!-- Informações de Segurança -->
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
			<div class="flex">
				<svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-blue-800">Informações importantes:</h3>
					<div class="mt-2 text-sm text-blue-700">
						<ul class="list-disc pl-5 space-y-1">
							<li>O link de recuperação expira em 1 hora</li>
							<li>Você pode solicitar um novo link a qualquer momento</li>
							<li>Verifique também sua pasta de spam</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</div> 