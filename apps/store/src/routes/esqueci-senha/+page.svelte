<script lang="ts">
	import { goto } from '$app/navigation';
	
	let email = $state('');
	let isLoading = $state(false);
	let message = $state('');
	let error = $state('');
	
	// Estado para erro específico do campo
	let emailError = $state('');
	
	// Validação do email
	function validateEmail() {
		emailError = '';
		
		if (!email.trim()) {
			emailError = 'E-mail é obrigatório';
			return false;
		}
		
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			emailError = 'Digite um e-mail válido';
			return false;
		}
		
		return true;
	}
	
	async function handleSubmit() {
		// Validar campo
		const isEmailValid = validateEmail();
		
		if (!isEmailValid) {
			return;
		}
		
		isLoading = true;
		error = '';
		message = '';
		emailError = '';
		
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
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erro desconhecido';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Esqueci minha senha - grão de gente</title>
	<meta name="description" content="Recupere sua senha do grão de gente" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#E0F7F6] via-white to-[#F0FDFC] flex items-center justify-center p-6">
	<div class="w-full max-w-md space-y-8">
		<!-- Título do Formulário -->
		<div class="text-center">
			<h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
				Esqueci minha <span class="text-[#00BFB3]">senha</span>
			</h2>
			<p class="text-gray-600 text-lg">
				Digite seu e-mail para receber as instruções de recuperação
			</p>
		</div>

		<!-- Formulário Principal -->
		<div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
			<!-- Mensagem de sucesso -->
			{#if message}
				<div class="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
					<div class="flex items-start">
						<svg class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="ml-3">
							<p class="text-emerald-700 font-medium">{message}</p>
						</div>
					</div>
				</div>
			{/if}
			
			<!-- Mensagem de erro -->
			{#if error}
				<div class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
					<div class="flex items-start">
						<svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="ml-3">
							<p class="text-red-700 font-medium">Ops! Erro ao processar solicitação.</p>
							<p class="text-red-600 text-sm mt-1">{error}</p>
						</div>
					</div>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
				<!-- Campo E-mail -->
				<div class="space-y-2">
					<label for="email" class="block text-sm font-semibold text-gray-700">
						E-mail
					</label>
					<div class="relative">
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							bind:value={email}
							onblur={validateEmail}
							disabled={isLoading || !!message}
							class="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-lg placeholder-gray-400 transition-all duration-200 {emailError ? 'border-red-300' : 'border-gray-200'}"
							placeholder="seu@email.com"
						/>
						<div class="absolute right-3 top-1/2 -translate-y-1/2">
							<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
							</svg>
						</div>
					</div>
					{#if emailError}
						<p class="text-red-600 text-sm font-medium flex items-center gap-1">
							<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							{emailError}
						</p>
					{/if}
				</div>

				<!-- Botão de Envio -->
				<button
					type="submit"
					disabled={isLoading || !!message}
					class="w-full bg-[#00BFB3] text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-[#00A89D] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:transform-none"
				>
					{#if isLoading}
						<div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Enviando...
					{:else if message}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Enviado
					{:else}
						Enviar instruções
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
					{/if}
				</button>
			</form>

			<!-- Navegação -->
			<div class="mt-8 text-center space-y-4">
				<a 
					href="/login" 
					class="inline-flex items-center justify-center w-full py-3 px-6 border-2 border-[#00BFB3] text-[#00BFB3] rounded-xl font-semibold hover:bg-[#00BFB3] hover:text-white transition-all duration-200 gap-2"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Voltar para o login
				</a>
				
				<p class="text-gray-600 text-sm">
					Não tem uma conta?
					<a href="/cadastro" class="text-[#00BFB3] hover:text-[#00A89D] font-semibold underline">
						Cadastre-se
					</a>
				</p>
			</div>
		</div>

		<!-- Informações importantes -->
		<div class="text-center text-sm text-gray-500 bg-white/50 rounded-xl p-4">
			<div class="flex items-start justify-center gap-2">
				<svg class="w-4 h-4 text-[#00BFB3] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div class="text-left">
					<p class="font-semibold text-gray-700 mb-1">Informações importantes:</p>
					<ul class="text-xs space-y-1">
						<li>• O link de recuperação expira em 1 hora</li>
						<li>• Você pode solicitar um novo link a qualquer momento</li>
						<li>• Verifique também sua pasta de spam</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div> 