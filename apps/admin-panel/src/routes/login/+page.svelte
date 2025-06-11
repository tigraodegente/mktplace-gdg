<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';
	import { authStore } from '$lib/stores/auth';
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	// Estado
	let email = $state('admin@mktplace.com');
	let password = $state('admin123456');
	let role = $state<'admin' | 'vendor'>('admin');
	let isLoading = $state(false);
	let error = $state('');
	let showPassword = $state(false);
	let rememberMe = $state(false);
	let isAnimating = $state(true);
	
	// Features do sistema
	const features = [
		{ icon: 'Analytics', title: 'Dashboard Intuitivo', desc: 'Visualize todas as métricas importantes' },
		{ icon: 'Package', title: 'Gestão de Produtos', desc: 'Gerencie seu catálogo facilmente' },
		{ icon: 'TrendingUp', title: 'Relatórios Detalhados', desc: 'Análises completas do seu negócio' },
		{ icon: 'Lock', title: '100% Seguro', desc: 'Seus dados protegidos sempre' }
	];
	
	onMount(async () => {
		// Verificar se usuário já está logado
		const isAuthenticated = await authStore.checkAuth();
		if (isAuthenticated) {
			goto('/');
			return;
		}
		
		// Animação inicial
		setTimeout(() => {
			isAnimating = false;
		}, 300);
		
		// Pré-preencher se lembrar
		const savedEmail = localStorage.getItem('rememberedEmail');
		if (savedEmail) {
			email = savedEmail;
			rememberMe = true;
		}
	});
	
	async function handleLogin() {
		// Reset error
		error = '';
		
		// Validações
		if (!email || !password) {
			error = 'Por favor, preencha todos os campos';
			return;
		}
		
		if (!email.includes('@')) {
			error = 'Email inválido';
			return;
		}
		
		isLoading = true;
		
		try {
			// Chamar API real de login
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					email: email.toLowerCase(),
					password: password,
					remember_me: rememberMe
				})
			});
			
			const result = await response.json();
			
			if (result.success && result.data) {
				// Usar authStore para fazer login
				authStore.login(
					result.data.user,
					result.data.access_token,
					result.data.refresh_token
				);
				
				// Salvar email se marcado
				if (rememberMe) {
					localStorage.setItem('rememberedEmail', email);
				} else {
					localStorage.removeItem('rememberedEmail');
				}
				
				console.log('Login realizado com sucesso!', result.data.user);
				
				// Redirecionar para dashboard
				await goto('/');
			} else {
				// Tratar erro da API
				if (result.error) {
					switch (result.error.code) {
						case 'INVALID_CREDENTIALS':
							error = 'Email ou senha incorretos';
							break;
						case 'ACCESS_DENIED':
							error = 'Acesso negado ao painel administrativo';
							break;
						case 'VALIDATION_ERROR':
							error = result.error.message || 'Dados inválidos';
							break;
						default:
							error = result.error.message || 'Erro ao fazer login';
					}
				} else {
					error = 'Erro inesperado ao fazer login';
				}
			}
		} catch (err) {
			console.error('Erro na requisição de login:', err);
			error = 'Erro de conexão. Tente novamente.';
		} finally {
			isLoading = false;
		}
	}
	
	function fillDemoCredentials() {
		// Usar credenciais reais do sistema
		email = 'admin@mktplace.com';
		password = 'admin123456';
	}
	
	function switchRole(newRole: 'admin' | 'vendor') {
		role = newRole;
		error = '';
		// Limpar campos ao trocar
		email = '';
		password = '';
	}
	
	// Detectar Enter
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !isLoading) {
			handleLogin();
		}
	}
</script>

<div class="min-h-screen flex">
	<!-- Left Side - Login Form -->
	<div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
		<div class="w-full max-w-md" in:fly={{ x: -50, duration: 800, delay: 200 }}>
			<!-- Logo -->
			<div class="text-center mb-8">
				<div 
					class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl mb-4 transform hover:scale-110 transition-transform hover:rotate-3"
					in:scale={{ duration: 600, delay: 200, easing: backOut, start: 0.5 }}
				>
					<span class="text-3xl text-white font-bold">G</span>
				</div>
				<h1 class="text-3xl font-bold text-gray-900" in:fly={{ y: 20, duration: 600, delay: 300 }}>Bem-vindo de volta!</h1>
				<p class="text-gray-600 mt-2" in:fly={{ y: 20, duration: 600, delay: 400 }}>Faça login para acessar o painel</p>
			</div>
			
			<!-- Role Selector -->
			<div class="flex bg-gray-100 rounded-lg p-1 mb-6" in:fly={{ y: 20, duration: 600, delay: 500 }}>
				<button
					onclick={() => switchRole('admin')}
					class="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 {role === 'admin' ? 'bg-white text-gray-900 shadow-sm scale-105' : 'text-gray-600 hover:text-gray-900 hover:scale-[1.02]'}"
				>
					<span class="mr-2 inline-block transition-transform duration-300 {role === 'admin' ? 'scale-125' : ''}">👨‍💼</span>
					Administrador
				</button>
				<button
					onclick={() => switchRole('vendor')}
					class="flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-300 {role === 'vendor' ? 'bg-white text-gray-900 shadow-sm scale-105' : 'text-gray-600 hover:text-gray-900 hover:scale-[1.02]'}"
				>
					<span class="mr-2 inline-block transition-transform duration-300 {role === 'vendor' ? 'scale-125' : ''}">🏪</span>
					Vendedor
				</button>
			</div>
			
			<!-- Login Form -->
			<form onsubmit={e => { e.preventDefault(); handleLogin(); }} class="space-y-5">
				<!-- Email -->
				<div in:fly={{ y: 20, duration: 600, delay: 600 }}>
					<label for="email" class="label">
						Email
					</label>
					<div class="relative">
						<input
							id="email"
							type="email"
							bind:value={email}
							onkeydown={handleKeydown}
							placeholder={role === 'admin' ? 'admin@marketplace.com' : 'vendor@marketplace.com'}
							class="input pl-10 {error ? 'input-error' : ''} transition-all duration-300 focus:scale-[1.02]"
							disabled={isLoading}
						/>
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</div>
				</div>
				
				<!-- Password -->
				<div in:fly={{ y: 20, duration: 600, delay: 700 }}>
					<label for="password" class="label">
						Senha
					</label>
					<div class="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							onkeydown={handleKeydown}
							placeholder="••••••••"
							class="input pl-10 pr-10 {error ? 'input-error' : ''} transition-all duration-300 focus:scale-[1.02]"
							disabled={isLoading}
						/>
						<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
						<button
							type="button"
							onclick={() => showPassword = !showPassword}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110"
						>
							{#if showPassword}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
								</svg>
							{:else}
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							{/if}
						</button>
					</div>
				</div>
				
				<!-- Remember & Forgot -->
				<div class="flex items-center justify-between">
					<label class="flex items-center">
						<input
							type="checkbox"
							bind:checked={rememberMe}
							class="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
						/>
						<span class="ml-2 text-sm text-gray-600">Lembrar-me</span>
					</label>
					<a href="/esqueci-senha" class="text-sm text-cyan-600 hover:text-cyan-700">
						Esqueceu a senha?
					</a>
				</div>
				
				<!-- Error Message -->
				{#if error}
					<div 
						class="bg-red-50 text-red-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
						in:scale={{ duration: 200 }}
					>
						<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				{/if}
				
				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isLoading}
					class="w-full btn btn-primary btn-lg {isLoading ? 'opacity-75' : ''}"
				>
					{#if isLoading}
						<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Entrando...
					{:else}
						Entrar
					{/if}
				</button>
				
				<!-- Demo Credentials -->
				<div class="text-center">
					<button
						type="button"
						onclick={fillDemoCredentials}
						class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
					>
						Usar credenciais de demonstração
					</button>
				</div>
			</form>
			
			<!-- Footer -->
			<div class="mt-8 text-center text-sm text-gray-600">
				<p>
					Não tem uma conta? 
					<a href="/cadastro" class="text-cyan-600 hover:text-cyan-700 font-medium">
						Cadastre-se
					</a>
				</p>
			</div>
		</div>
	</div>
	
	<!-- Right Side - Info -->
	<div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 p-12 items-center justify-center relative overflow-hidden">
		<!-- Background Pattern -->
		<div class="absolute inset-0 opacity-10">
			<div class="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full"></div>
			<div class="absolute -bottom-32 -left-32 w-80 h-80 bg-white rounded-full"></div>
		</div>
		
		<!-- Content -->
		<div class="relative z-10 text-white max-w-lg" in:fly={{ x: 50, duration: 800, delay: 400 }}>
			<h2 class="text-4xl font-bold mb-6">
				{role === 'admin' ? 'Painel Administrativo' : 'Painel do Vendedor'}
			</h2>
			<p class="text-xl mb-8 text-cyan-100">
				{role === 'admin' 
					? 'Gerencie todo o marketplace com ferramentas poderosas e intuitivas.' 
					: 'Acompanhe suas vendas e gerencie seus produtos com facilidade.'}
			</p>
			
			<!-- Features Grid -->
			<div class="grid grid-cols-2 gap-6">
				{#each features as feature, i}
					<div 
						class="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 transform hover:scale-105 transition-all"
						in:scale={{ duration: 400, delay: 600 + i * 100, easing: cubicOut }}
					>
						<div class="mb-3">
							<ModernIcon name={feature.icon} size="xl" class="text-white" />
						</div>
						<h3 class="font-semibold mb-1">{feature.title}</h3>
						<p class="text-sm text-cyan-100">{feature.desc}</p>
					</div>
				{/each}
			</div>
			
			<!-- Stats -->
			<div class="mt-12 flex items-center gap-8" in:fade={{ duration: 600, delay: 1000 }}>
				<div>
					<p class="text-4xl font-bold">2.5k+</p>
					<p class="text-cyan-100">Vendedores Ativos</p>
				</div>
				<div>
					<p class="text-4xl font-bold">150k+</p>
					<p class="text-cyan-100">Produtos Cadastrados</p>
				</div>
				<div>
					<p class="text-4xl font-bold">98%</p>
					<p class="text-cyan-100">Satisfação</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Animação suave no switch de role */
	button {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Efeito de focus customizado */
	:global(input:focus) {
		box-shadow: 0 0 0 3px rgba(0, 191, 179, 0.1);
	}
	
	/* Animação do gradiente de fundo */
	@keyframes gradient {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}
	
	:global(.bg-gradient-to-br) {
		background-size: 200% 200%;
		animation: gradient 15s ease infinite;
	}
</style> 