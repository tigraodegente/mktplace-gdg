<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let email = '';
	let password = '';
	let isLoading = false;
	let errorMessage = '';
	let logoError = false;
	
	// Verificar se há mensagem de erro nos parâmetros
	$: {
		const urlError = $page.url.searchParams.get('error');
		if (urlError === 'access_denied') {
			errorMessage = 'Acesso negado. Você precisa ter permissões de administrador.';
		}
	}
	
	async function handleLogin() {
		if (!email || !password) {
			errorMessage = 'Por favor, preencha todos os campos.';
			return;
		}
		
		isLoading = true;
		errorMessage = '';
		
		try {
			// Em desenvolvimento, simular login bem-sucedido
			if (import.meta.env.DEV) {
				// Simular delay de rede
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Criar cookie de sessão mock
				document.cookie = 'auth_session=mock-admin-session; path=/; max-age=604800';
				
				goto('/');
				return;
			}
			
			// Em produção, fazer requisição real
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email, password, role: 'admin' })
			});
			
			const result = await response.json();
			
			if (result.success) {
				goto('/');
			} else {
				errorMessage = result.error || 'Erro no login. Verifique suas credenciais.';
			}
			
		} catch (error) {
			errorMessage = 'Erro de conexão. Tente novamente.';
			console.error('Erro no login:', error);
		} finally {
			isLoading = false;
		}
	}
	
	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleLogin();
		}
	}
	
	function handleLogoError() {
		logoError = true;
	}
</script>

<svelte:head>
	<title>Login - Admin Panel</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
	<div class="max-w-md w-full space-y-8 p-8">
		<!-- Logo e Header -->
		<div class="text-center">
			<div class="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-6 overflow-hidden">
				{#if !logoError}
					<img 
						src="/logo.png" 
						alt="Marketplace GDG" 
						class="w-12 h-12 object-contain"
						on:error={handleLogoError}
					/>
				{:else}
					<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
					</svg>
				{/if}
			</div>
			<h2 class="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h2>
			<p class="text-gray-600">Acesso ao painel administrativo</p>
			<p class="text-sm text-gray-500 mt-2">Marketplace GDG</p>
		</div>

		<!-- Formulário de Login -->
		<div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
			<form class="space-y-6" on:submit|preventDefault={handleLogin}>
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
						Email do Administrador
					</label>
					<input
						id="email"
						type="email"
						required
						bind:value={email}
						on:keypress={handleKeyPress}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
						placeholder="admin@marketplace.com"
						disabled={isLoading}
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
						Senha
					</label>
					<input
						id="password"
						type="password"
						required
						bind:value={password}
						on:keypress={handleKeyPress}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
						placeholder="Sua senha de administrador"
						disabled={isLoading}
					/>
				</div>

				{#if errorMessage}
					<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{errorMessage}
					</div>
				{/if}

				<button
					type="submit"
					disabled={isLoading}
					class="w-full flex items-center justify-center px-4 py-3 bg-primary-500 border border-transparent rounded-lg font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isLoading}
						<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
						Verificando credenciais...
					{:else}
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						Acessar Admin Panel
					{/if}
				</button>
			</form>

			<!-- Info de Desenvolvimento -->
			{#if import.meta.env.DEV}
				<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<div class="text-sm text-blue-800">
						<strong>🔧 Modo Desenvolvimento:</strong>
						<p class="mt-1">Qualquer email/senha funcionará para acessar o admin panel.</p>
						<p class="text-xs text-blue-600 mt-2">
							Ex: admin@test.com / 123456
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Links úteis -->
		<div class="text-center space-y-2">
			<a href="/" class="text-sm text-primary-600 hover:text-primary-700 transition-colors">
				← Voltar para a loja
			</a>
			<br>
			<a href="/seller/login" class="text-sm text-gray-500 hover:text-gray-700 transition-colors">
				Acessar como vendedor
			</a>
		</div>
	</div>
</div> 