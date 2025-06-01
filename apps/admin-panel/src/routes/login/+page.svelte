<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	// Estados do formulário
	let email = '';
	let password = '';
	let isLoading = false;
	let error = '';
	
	// Estados do sistema
	let userRoles: string[] = [];
	let showRoleSelector = false;
	let userName = '';
	
	onMount(() => {
		// Limpar qualquer estado anterior
		userRoles = [];
		showRoleSelector = false;
		error = '';
		
		// Em desenvolvimento, pré-preencher
		if (import.meta.env.DEV) {
			email = 'admin@dev.local';
			password = '123456';
		}
	});
	
	async function handleLogin() {
		if (!email || !password) {
			error = 'Por favor, preencha todos os campos';
			return;
		}
		
		isLoading = true;
		error = '';
		
		try {
			// Em desenvolvimento, simular login
			if (import.meta.env.DEV) {
				await simulateLogin();
				return;
			}
			
			// Em produção, fazer login real
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ email, password })
			});
			
			const result = await response.json();
			
			if (result.success && result.user) {
				await handleLoginSuccess(result.user);
			} else {
				error = result.error || 'Email ou senha incorretos';
			}
		} catch (err) {
			console.error('Erro no login:', err);
			error = 'Erro de conexão. Tente novamente.';
		} finally {
			isLoading = false;
		}
	}
	
	async function simulateLogin() {
		// Simular delay de rede
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		// Simular diferentes usuários baseado no email
		let mockUser;
		
		if (email.includes('multi')) {
			// Usuário com múltiplos roles
			mockUser = {
				id: 'user-multi',
				name: 'Carlos Multi',
				email: email,
				roles: ['admin', 'vendor', 'customer']
			};
		} else if (email.includes('vendor') || email.includes('joao')) {
			// Só vendedor
			mockUser = {
				id: 'vendor-dev',
				name: 'João Vendedor',
				email: email,
				roles: ['vendor']
			};
		} else {
			// Só admin (default)
			mockUser = {
				id: 'admin-dev',
				name: 'Maria Admin',
				email: email,
				roles: ['admin']
			};
		}
		
		await handleLoginSuccess(mockUser);
	}
	
	async function handleLoginSuccess(user: any) {
		userName = user.name;
		
		// Filtrar apenas roles que podem acessar os painéis
		const adminRoles = user.roles?.filter((role: string) => ['admin', 'vendor'].includes(role)) || [];
		
		if (adminRoles.length === 0) {
			error = 'Acesso negado. Você não tem permissão para acessar este painel.';
			return;
		}
		
		if (adminRoles.length === 1) {
			// Único role - ir direto para o painel
			const role = adminRoles[0];
			await redirectToPanel(role);
		} else {
			// Múltiplos roles - mostrar seletor
			userRoles = adminRoles;
			showRoleSelector = true;
		}
	}
	
	async function selectRole(selectedRole: string) {
		isLoading = true;
		await redirectToPanel(selectedRole);
	}
	
	async function redirectToPanel(role: string) {
		try {
			// Definir contexto do usuário na sessão
			await fetch('/api/auth/set-context', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ role })
			});
			
			// Redirecionar para o painel
			goto(`/?user=${role}`);
		} catch (err) {
			console.error('Erro ao definir contexto:', err);
			// Em desenvolvimento, ir direto mesmo com erro
			if (import.meta.env.DEV) {
				goto(`/?user=${role}`);
			} else {
				error = 'Erro ao acessar painel. Tente novamente.';
			}
		}
	}
	
	function backToLogin() {
		showRoleSelector = false;
		userRoles = [];
		userName = '';
		error = '';
	}
	
	// Atalhos para desenvolvimento
	function quickLogin(role: string) {
		if (role === 'admin') {
			email = 'admin@dev.local';
		} else if (role === 'vendor') {
			email = 'joao@vendor.local';
		} else if (role === 'multi') {
			email = 'carlos@multi.local';
		}
		password = '123456';
		handleLogin();
	}
</script>

<svelte:head>
	<title>Login - Marketplace GDG</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		{#if !showRoleSelector}
			<!-- Formulário de Login -->
			<div>
				<div class="text-center">
					<div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
						<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
						</svg>
					</div>
					<h2 class="mt-6 text-3xl font-bold text-gray-900">
						Acesse sua conta
					</h2>
					<p class="mt-2 text-sm text-gray-600">
						Painel Administrativo do Marketplace
					</p>
				</div>
				
				<form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
					<div class="space-y-4">
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
								disabled={isLoading}
								class="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="seu@email.com"
							/>
						</div>
						
						<div>
							<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
								Senha
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autocomplete="current-password"
								required
								bind:value={password}
								disabled={isLoading}
								class="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="Sua senha"
							/>
						</div>
					</div>
					
					{#if error}
						<div class="bg-red-50 border border-red-200 rounded-lg p-4">
							<div class="flex">
								<svg class="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								<p class="text-sm text-red-700">{error}</p>
							</div>
						</div>
					{/if}
					
					<div>
						<button
							type="submit"
							disabled={isLoading}
							class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							{#if isLoading}
								<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
								Entrando...
							{:else}
								Entrar
							{/if}
						</button>
					</div>
				</form>
				
				{#if import.meta.env.DEV}
					<div class="mt-8 pt-6 border-t border-gray-200">
						<p class="text-xs text-gray-500 text-center mb-4">🛠️ Atalhos para Desenvolvimento:</p>
						<div class="space-y-2">
							<button
								on:click={() => quickLogin('admin')}
								disabled={isLoading}
								class="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
							>
								👨‍💼 Entrar como Admin
							</button>
							<button
								on:click={() => quickLogin('vendor')}
								disabled={isLoading}
								class="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
							>
								🏪 Entrar como Vendedor
							</button>
							<button
								on:click={() => quickLogin('multi')}
								disabled={isLoading}
								class="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
							>
								👑 Entrar como Multi-Role (Admin + Vendedor)
							</button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Seletor de Role -->
			<div>
				<div class="text-center">
					<div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
						<span class="text-2xl">👑</span>
					</div>
					<h2 class="mt-6 text-3xl font-bold text-gray-900">
						Olá, {userName}!
					</h2>
					<p class="mt-2 text-sm text-gray-600">
						Como você gostaria de acessar o sistema hoje?
					</p>
				</div>
				
				<div class="mt-8 space-y-4">
					{#each userRoles as role}
						<button
							on:click={() => selectRole(role)}
							disabled={isLoading}
							class="group w-full flex items-center justify-between p-6 bg-white border border-gray-200 rounded-xl hover:border-primary-200 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<div class="flex items-center space-x-4">
								<div class="w-12 h-12 bg-gradient-to-br {role === 'admin' ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600'} rounded-xl flex items-center justify-center text-white text-xl">
									{role === 'admin' ? '👨‍💼' : '🏪'}
								</div>
								<div class="text-left">
									<h3 class="text-lg font-semibold text-gray-900 group-hover:text-primary-700">
										{role === 'admin' ? 'Administrador' : 'Vendedor'}
									</h3>
									<p class="text-sm text-gray-500">
										{role === 'admin' 
											? 'Gerencie todo o marketplace, usuários e configurações' 
											: 'Gerencie seus produtos, vendas e relatórios'
										}
									</p>
								</div>
							</div>
							<svg class="w-6 h-6 text-gray-400 group-hover:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
							</svg>
						</button>
					{/each}
				</div>
				
				<div class="mt-6">
					<button
						on:click={backToLogin}
						disabled={isLoading}
						class="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
					>
						← Voltar ao login
					</button>
				</div>
				
				{#if isLoading}
					<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div class="bg-white rounded-lg p-6 text-center">
							<div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
							<p class="text-gray-600">Acessando painel...</p>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div> 