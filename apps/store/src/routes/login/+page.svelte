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
  
  // Verificar mensagens de sucesso ou redirecionamento
  onMount(() => {
    const urlParams = $page.url.searchParams;
    const message = urlParams.get('message');
    const redirectTo = urlParams.get('redirect');
    
    if (message) {
      successMessage = message;
    }
    
    // Se já está logado, redirecionar
    auth.subscribe(($auth) => {
      if ($auth.user && !$auth.isLoading) {
        const target = redirectTo ? decodeURIComponent(redirectTo) : '/';
        goto(target);
      }
    });
  });
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!email || !password) {
      error = 'Email e senha são obrigatórios';
      return;
    }
    
    isLoading = true;
    error = '';
    successMessage = '';
    
    try {
      await auth.login(email, password);
      
      // Redirecionar após login bem-sucedido
      const redirectTo = $page.url.searchParams.get('redirect');
      const target = redirectTo ? decodeURIComponent(redirectTo) : '/';
      goto(target);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - Marketplace GDG</title>
  <meta name="description" content="Faça login em sua conta do Marketplace GDG" />
</svelte:head>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo e Título -->
    <div class="text-center">
      <img src="/logo.png" alt="Marketplace GDG" class="h-16 w-auto mx-auto mb-4" />
      <h1 class="text-4xl font-bold text-[#00BFB3] mb-2">Marketplace GDG</h1>
      <h2 class="text-2xl font-semibold text-gray-900">Entre em sua conta</h2>
      <p class="mt-2 text-gray-600">
        Ou <a href="/cadastro" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">crie uma nova conta</a>
      </p>
    </div>

    <!-- Formulário -->
    <div class="bg-white shadow-lg rounded-lg p-8">
      <!-- Mensagem de sucesso -->
      {#if successMessage}
        <div class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div class="flex">
            <svg class="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="ml-3">
              <p class="text-sm font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Mensagem de erro -->
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

      <form onsubmit={handleSubmit} class="space-y-6">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            disabled={isLoading}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50"
            placeholder="seu@email.com"
          />
        </div>

        <!-- Senha -->
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
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent disabled:bg-gray-50"
            placeholder="••••••••"
          />
        </div>

        <!-- Lembrar-me e Esqueci a senha -->
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              bind:checked={rememberMe}
              disabled={isLoading}
              class="w-4 h-4 text-[#00BFB3] focus:ring-[#00BFB3] border-gray-300 rounded disabled:opacity-50"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-700">
              Lembrar-me
            </label>
          </div>

          <div class="text-sm">
            <a href="/esqueci-senha" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">
              Esqueceu sua senha?
            </a>
          </div>
        </div>

        <!-- Botão de Login -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full bg-[#00BFB3] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Entrando...
          {:else}
            Entrar
          {/if}
        </button>
      </form>

      <!-- Links adicionais -->
      <div class="mt-6 text-center space-y-4">
        <div class="text-sm text-gray-600">
          Não tem uma conta?
          <a href="/cadastro" class="text-[#00BFB3] hover:text-[#00A89D] font-medium">
            Cadastre-se gratuitamente
          </a>
        </div>
      </div>
    </div>

    <!-- Informações de Segurança -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex">
        <svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-blue-800">Compre com segurança:</h3>
          <div class="mt-2 text-sm text-blue-700">
            <ul class="list-disc pl-5 space-y-1">
              <li>Dados protegidos com criptografia</li>
              <li>Compra 100% segura</li>
              <li>Suporte 24/7</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div> 