<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/authStore';
  
  let email = $state('');
  let password = $state('');
  let rememberMe = $state(false);
  let isLoading = $state(false);
  let error = $state('');
  let successMessage = $state('');
  let showPassword = $state(false);
  
  // Estados para erros específicos dos campos
  let emailError = $state('');
  let passwordError = $state('');
  
  // Verificar mensagens de sucesso ou redirecionamento
  onMount(() => {
    const urlParams = $page.url.searchParams;
    const message = urlParams.get('message');
    const redirectTo = urlParams.get('redirect');
    const isRecovery = urlParams.get('recovery') === 'true';
    
    if (message) {
      successMessage = message;
    }
    
    // Mostrar mensagem especial para recuperação de checkout
    if (isRecovery) {
      successMessage = 'Sua sessão expirou durante o checkout. Faça login para continuar.';
    }
    
    // ✅ Só redirecionar se já está logado E não veio do checkout/recuperação
    auth.subscribe(($auth) => {
      if ($auth.user && !$auth.loading) {
        // Se não tem redirect ou o redirect não é do checkout/carrinho, redirecionar
        if (!redirectTo || (!redirectTo.includes('/cart') && !redirectTo.includes('/checkout'))) {
          const target = redirectTo ? decodeURIComponent(redirectTo) : '/';
          goto(target);
        }
        // Se veio do checkout, deixar o CheckoutAuth.svelte lidar com o redirecionamento
      }
    });
  });
  
  // Validação do email
  function validateEmail() {
    emailError = '';
    
    if (!email.trim()) {
      emailError = 'E-mail é obrigatório';
      return false;
    }
    
    // Verificar se é um email válido ou CPF (apenas números)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cpfRegex = /^\d{11}$/;
    
    if (!emailRegex.test(email) && !cpfRegex.test(email)) {
      emailError = 'Digite um e-mail válido ou CPF com 11 dígitos';
      return false;
    }
    
    return true;
  }
  
  // Validação da senha
  function validatePassword() {
    passwordError = '';
    
    if (!password.trim()) {
      passwordError = 'Senha é obrigatória';
      return false;
    }
    
    if (password.length < 6) {
      passwordError = 'Senha deve ter pelo menos 6 caracteres';
      return false;
    }
    
    return true;
  }
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Validar campos individualmente
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    isLoading = true;
    error = '';
    successMessage = '';
    emailError = '';
    passwordError = '';
    
    try {
      await auth.login(email, password);
      
      // ✅ Só redirecionar se não veio do checkout ou carrinho
      const redirectTo = $page.url.searchParams.get('redirect');
      if (!redirectTo || (!redirectTo.includes('/cart') && !redirectTo.includes('/checkout'))) {
        const target = redirectTo ? decodeURIComponent(redirectTo) : '/';
        goto(target);
      }
      // Se veio do checkout/carrinho, o CheckoutAuth.svelte já vai lidar com o próximo passo
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Olá, digite seu e-mail - grão de gente</title>
  <meta name="description" content="Faça login em sua conta do grão de gente" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#E0F7F6] via-white to-[#F0FDFC] flex items-center justify-center p-6">
  <div class="w-full max-w-md space-y-8">
    <!-- Título do Formulário -->
    <div class="text-center">
      <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
        Olá, digite seu <span class="text-[#00BFB3]">e-mail</span>
      </h2>
      <p class="text-gray-600 text-lg">
        Entre na sua conta ou <a href="/cadastro" class="text-[#00BFB3] hover:text-[#00A89D] font-semibold underline">cadastre-se!</a>
      </p>
    </div>

    <!-- Formulário Principal -->
    <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <!-- Mensagens -->
      {#if successMessage}
        <div class="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="ml-3 text-emerald-700 font-medium">{successMessage}</p>
          </div>
        </div>
      {/if}
      
      {#if error}
        <div class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="ml-3">
              <p class="text-red-700 font-medium">Ops! Dados inválidos.</p>
              <p class="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-6">
        <!-- Campo E-mail -->
        <div class="space-y-2">
          <label for="email" class="block text-sm font-semibold text-gray-700">
            E-mail ou CPF (apenas número)
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
              disabled={isLoading}
              class="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-lg placeholder-gray-400 transition-all duration-200 {emailError ? 'border-red-300' : 'border-gray-200'}"
              placeholder="maria@gmail.com"
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

        <!-- Campo Senha -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="password" class="block text-sm font-semibold text-gray-700">
              Senha
            </label>
            <button 
              type="button" 
              onclick={() => showPassword = !showPassword}
              class="text-[#00BFB3] hover:text-[#00A89D] font-medium text-sm transition-colors"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <div class="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autocomplete="current-password"
              required
              bind:value={password}
              onblur={validatePassword}
              disabled={isLoading}
              class="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-lg placeholder-gray-400 transition-all duration-200 {passwordError ? 'border-red-300' : 'border-gray-200'}"
              placeholder="••••••••"
            />
            <div class="absolute right-3 top-1/2 -translate-y-1/2">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          {#if passwordError}
            <p class="text-red-600 text-sm font-medium flex items-center gap-1">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {passwordError}
            </p>
          {/if}
        </div>

        <!-- Esqueceu sua senha? -->
        <div class="text-center">
          <p class="text-gray-600 text-sm">Esqueceu sua senha?</p>
          <a href="/esqueci-senha" class="text-[#00BFB3] hover:text-[#00A89D] font-semibold text-sm underline">
            Recuperar senha
          </a>
        </div>

        <!-- Botão de Login -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-[#00BFB3] text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-[#00A89D] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:transform-none"
        >
          {#if isLoading}
            <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Entrando...
          {:else}
            Continuar
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          {/if}
        </button>
      </form>

      <!-- Cadastro -->
      <div class="mt-8 text-center">
        <p class="text-gray-600 text-sm mb-4">Não tem conta?</p>
        <a 
          href="/cadastro" 
          class="inline-flex items-center justify-center w-full py-3 px-6 border-2 border-[#00BFB3] text-[#00BFB3] rounded-xl font-semibold hover:bg-[#00BFB3] hover:text-white transition-all duration-200 gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Cadastre-se!
        </a>
      </div>
    </div>
  </div>
</div> 