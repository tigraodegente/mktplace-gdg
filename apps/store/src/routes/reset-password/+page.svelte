<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let token = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let isValidating = $state(true);
	let error = $state('');
	let success = $state(false);
	let userInfo = $state<{ email: string; name: string } | null>(null);
	
	// Validar token ao carregar a página
	onMount(async () => {
		token = $page.url.searchParams.get('token') || '';
		
		if (!token) {
			error = 'Token não fornecido. Solicite um novo link de recuperação.';
			isValidating = false;
			return;
		}
		
		try {
			const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
			const data = await response.json();
			
			if (!response.ok || !data.success) {
				throw new Error(data.error?.message || 'Token inválido');
			}
			
			userInfo = data.data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erro ao validar token';
		} finally {
			isValidating = false;
		}
	});
	
	async function handleSubmit() {
		// Validações
		if (!newPassword || !confirmPassword) {
			error = 'Todos os campos são obrigatórios';
			return;
		}
		
		if (newPassword.length < 6) {
			error = 'A senha deve ter pelo menos 6 caracteres';
			return;
		}
		
		if (newPassword !== confirmPassword) {
			error = 'As senhas não coincidem';
			return;
		}
		
		isLoading = true;
		error = '';
		
		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ token, newPassword })
			});
			
			const data = await response.json();
			
			if (!response.ok || !data.success) {
				throw new Error(data.error?.message || 'Erro ao redefinir senha');
			}
			
			success = true;
			
			// Redirecionar para login após 3 segundos
			setTimeout(() => {
				goto('/login?message=' + encodeURIComponent('Senha alterada com sucesso. Faça login com a nova senha.'));
			}, 3000);
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erro desconhecido';
		} finally {
			isLoading = false;
		}
	}
	
	// Verificar força da senha
	function getPasswordStrength(password: string) {
		if (!password) return { score: 0, text: '', color: '' };
		
		let score = 0;
		let feedback = [];
		
		if (password.length >= 8) score++;
		else feedback.push('pelo menos 8 caracteres');
		
		if (/[a-z]/.test(password)) score++;
		else feedback.push('letras minúsculas');
		
		if (/[A-Z]/.test(password)) score++;
		else feedback.push('letras maiúsculas');
		
		if (/\d/.test(password)) score++;
		else feedback.push('números');
		
		if (/[^a-zA-Z\d]/.test(password)) score++;
		else feedback.push('símbolos');
		
		if (score < 2) return { score, text: 'Fraca', color: 'text-red-600' };
		if (score < 4) return { score, text: 'Média', color: 'text-yellow-600' };
		return { score, text: 'Forte', color: 'text-green-600' };
	}
	
	const passwordStrength = $derived(getPasswordStrength(newPassword));
</script>

<svelte:head>
	<title>Redefinir Senha - Marketplace GDG</title>
	<meta name="description" content="Redefina sua senha do Marketplace GDG" />
</svelte:head>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<!-- Logo e Título -->
		<div class="text-center">
			<img src="/logo.png" alt="Marketplace GDG" class="h-16 w-auto mx-auto mb-4" />
			<h1 class="text-4xl font-bold text-[#00BFB3] mb-2">Marketplace GDG</h1>
			<h2 class="text-2xl font-semibold text-gray-900">Redefinir Senha</h2>
			{#if userInfo}
				<p class="mt-2 text-gray-600">
					Criando nova senha para <strong>{userInfo.email}</strong>
				</p>
			{/if}
		</div>

		<div class="bg-white shadow-lg rounded-lg p-8">
			{#if isValidating}
				<!-- Loading -->
				<div class="text-center py-8">
					<div class="w-8 h-8 border-2 border-[#00BFB3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p class="text-gray-600">Validando token...</p>
				</div>
			{:else if success}
				<!-- Sucesso -->
				<div class="text-center py-8">
					<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-900 mb-2">Senha alterada com sucesso!</h3>
					<p class="text-gray-600 mb-4">Você será redirecionado para a página de login em alguns segundos.</p>
					<a href="/login" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">
						Ir para login →
					</a>
				</div>
			{:else if error && !userInfo}
				<!-- Erro de token -->
				<div class="text-center py-8">
					<div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-900 mb-2">Token inválido</h3>
					<p class="text-gray-600 mb-4">{error}</p>
					<a href="/esqueci-senha" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">
						Solicitar novo link →
					</a>
				</div>
			{:else}
				<!-- Formulário -->
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
					<!-- Nova Senha -->
					<div>
						<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
							Nova senha
						</label>
						<input
							id="newPassword"
							name="newPassword"
							type="password"
							autocomplete="new-password"
							required
							bind:value={newPassword}
							disabled={isLoading}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-100"
							placeholder="Mínimo 6 caracteres"
						/>
						
						{#if newPassword}
							<div class="mt-2">
								<div class="flex justify-between text-xs mb-1">
									<span class="text-gray-600">Força da senha:</span>
									<span class={passwordStrength.color}>{passwordStrength.text}</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-1.5">
									<div 
										class="h-1.5 rounded-full transition-all duration-300 {
											passwordStrength.score < 2 ? 'bg-red-500' :
											passwordStrength.score < 4 ? 'bg-yellow-500' : 'bg-green-500'
										}"
										style="width: {(passwordStrength.score / 5) * 100}%"
									></div>
								</div>
							</div>
						{/if}
					</div>

					<!-- Confirmar Senha -->
					<div>
						<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
							Confirmar nova senha
						</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							autocomplete="new-password"
							required
							bind:value={confirmPassword}
							disabled={isLoading}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-100"
							placeholder="Digite a senha novamente"
						/>
						
						{#if confirmPassword && newPassword !== confirmPassword}
							<p class="mt-1 text-sm text-red-600">As senhas não coincidem</p>
						{:else if confirmPassword && newPassword === confirmPassword}
							<p class="mt-1 text-sm text-green-600">✓ Senhas coincidem</p>
						{/if}
					</div>

					<!-- Botão de Submit -->
					<button
						type="submit"
						disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
						class="w-full bg-[#00BFB3] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{#if isLoading}
							<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							Redefinindo...
						{:else}
							Redefinir Senha
						{/if}
					</button>
				</form>

				<!-- Links -->
				<div class="mt-6 text-center">
					<div class="text-sm">
						<a href="/login" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">
							← Voltar para o login
						</a>
					</div>
				</div>
			{/if}
		</div>

		{#if !isValidating && !success && userInfo}
			<!-- Dicas de Segurança -->
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<div class="flex">
					<svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-blue-800">Dicas para uma senha segura:</h3>
						<div class="mt-2 text-sm text-blue-700">
							<ul class="list-disc pl-5 space-y-1">
								<li>Use pelo menos 8 caracteres</li>
								<li>Combine letras maiúsculas e minúsculas</li>
								<li>Inclua números e símbolos</li>
								<li>Evite informações pessoais</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>