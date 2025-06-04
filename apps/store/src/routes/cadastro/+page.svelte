<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/authStore';
  
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);
  let error = $state('');
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  
  // Estados para erros específicos dos campos
  let nameError = $state('');
  let emailError = $state('');
  let passwordError = $state('');
  let confirmPasswordError = $state('');
  
  // Validação do nome
  function validateName() {
    nameError = '';
    
    if (!name.trim()) {
      nameError = 'Nome é obrigatório';
      return false;
    }
    
    if (name.trim().length < 2) {
      nameError = 'Nome deve ter pelo menos 2 caracteres';
      return false;
    }
    
    return true;
  }
  
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
  
  // Validação da confirmação de senha
  function validateConfirmPassword() {
    confirmPasswordError = '';
    
    if (!confirmPassword.trim()) {
      confirmPasswordError = 'Confirmação de senha é obrigatória';
      return false;
    }
    
    if (password !== confirmPassword) {
      confirmPasswordError = 'As senhas não coincidem';
      return false;
    }
    
    return true;
  }
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Validar campos individualmente
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }
    
    isLoading = true;
    error = '';
    nameError = '';
    emailError = '';
    passwordError = '';
    confirmPasswordError = '';
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro ao criar conta');
      }
      
      // Salvar usuário no store
      auth.setUser(data.data.user);
      
      // Redirecionar para home
      goto('/');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Crie sua conta - grão de gente</title>
  <meta name="description" content="Crie sua conta no grão de gente" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#E0F7F6] via-white to-[#F0FDFC] flex items-center justify-center p-6">
  <div class="w-full max-w-md space-y-8">
    <!-- Título do Formulário -->
    <div class="text-center">
      <h2 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
        Crie sua <span class="text-[#00BFB3]">conta</span>
      </h2>
      <p class="text-gray-600 text-lg">
        Já tem uma conta? <a href="/login" class="text-[#00BFB3] hover:text-[#00A89D] font-semibold underline">Faça login!</a>
      </p>
    </div>

    <!-- Formulário Principal -->
    <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <!-- Mensagem de erro -->
      {#if error}
        <div class="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="ml-3">
              <p class="text-red-700 font-medium">Ops! Erro ao criar conta.</p>
              <p class="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="space-y-6">
        <!-- Campo Nome -->
        <div class="space-y-2">
          <label for="name" class="block text-sm font-semibold text-gray-700">
            Nome completo
          </label>
          <div class="relative">
            <input
              id="name"
              name="name"
              type="text"
              autocomplete="name"
              required
              bind:value={name}
              onblur={validateName}
              disabled={isLoading}
              class="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-lg placeholder-gray-400 transition-all duration-200 {nameError ? 'border-red-300' : 'border-gray-200'}"
              placeholder="João Silva"
            />
            <div class="absolute right-3 top-1/2 -translate-y-1/2">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          {#if nameError}
            <p class="text-red-600 text-sm font-medium flex items-center gap-1">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {nameError}
            </p>
          {/if}
        </div>

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
              disabled={isLoading}
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
              autocomplete="new-password"
              required
              bind:value={password}
              onblur={validatePassword}
              disabled={isLoading}
              class="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-lg placeholder-gray-400 transition-all duration-200 {passwordError ? 'border-red-300' : 'border-gray-200'}"
              placeholder="Mínimo 6 caracteres"
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

        <!-- Campo Confirmar Senha -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label for="confirmPassword" class="block text-sm font-semibold text-gray-700">
              Confirmar senha
            </label>
            <button 
              type="button" 
              onclick={() => showConfirmPassword = !showConfirmPassword}
              class="text-[#00BFB3] hover:text-[#00A89D] font-medium text-sm transition-colors"
            >
              {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <div class="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autocomplete="new-password"
              required
              bind:value={confirmPassword}
              onblur={validateConfirmPassword}
              disabled={isLoading}
              class="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed text-lg placeholder-gray-400 transition-all duration-200 {confirmPasswordError ? 'border-red-300' : 'border-gray-200'}"
              placeholder="Digite a senha novamente"
            />
            <div class="absolute right-3 top-1/2 -translate-y-1/2">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          {#if confirmPasswordError}
            <p class="text-red-600 text-sm font-medium flex items-center gap-1">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {confirmPasswordError}
            </p>
          {/if}
        </div>

        <!-- Botão de Cadastro -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-[#00BFB3] text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-[#00A89D] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:transform-none"
        >
          {#if isLoading}
            <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Criando conta...
          {:else}
            Criar conta
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          {/if}
        </button>
      </form>

      <!-- Login -->
      <div class="mt-8 text-center">
        <p class="text-gray-600 text-sm mb-4">Já tem uma conta?</p>
        <a 
          href="/login" 
          class="inline-flex items-center justify-center w-full py-3 px-6 border-2 border-[#00BFB3] text-[#00BFB3] rounded-xl font-semibold hover:bg-[#00BFB3] hover:text-white transition-all duration-200 gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Fazer login
        </a>
      </div>
    </div>

    <!-- Termos -->
    <div class="text-center text-sm text-gray-500 bg-white/50 rounded-xl p-4">
      <p>
        Ao criar uma conta, você concorda com nossos
        <a href="/termos" class="text-[#00BFB3] hover:text-[#00A89D] font-semibold underline">Termos de Uso</a> e
        <a href="/privacidade" class="text-[#00BFB3] hover:text-[#00A89D] font-semibold underline">Política de Privacidade</a>
      </p>
    </div>
  </div>
</div> 