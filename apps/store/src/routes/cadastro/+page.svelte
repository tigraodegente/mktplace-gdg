<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);
  let error = $state('');
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    
    // Validações
    if (!name || !email || !password) {
      error = 'Todos os campos são obrigatórios';
      return;
    }
    
    if (password !== confirmPassword) {
      error = 'As senhas não coincidem';
      return;
    }
    
    if (password.length < 6) {
      error = 'A senha deve ter pelo menos 6 caracteres';
      return;
    }
    
    isLoading = true;
    
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
  <title>Criar Conta - Marketplace GDG</title>
  <meta name="description" content="Crie sua conta no Marketplace GDG" />
</svelte:head>

<div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Logo e Título -->
    <div class="text-center">
      <img src="/logo.png" alt="Marketplace GDG" class="h-16 w-auto mx-auto mb-4" />
      <h1 class="text-4xl font-bold text-[var(--cyan500)] mb-2">Marketplace GDG</h1>
      <h2 class="text-2xl font-semibold text-[var(--text-color)]">Crie sua conta</h2>
      <p class="mt-2 text-[var(--gray300)]">
        Já tem uma conta? <a href="/login" class="text-[var(--cyan500)] hover:text-[var(--cyan600)] font-medium">Faça login</a>
      </p>
    </div>

    <!-- Formulário -->
    <form class="card mt-8" onsubmit={handleSubmit}>
      <div class="card-body space-y-6">
        {#if error}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        {/if}
        
        <!-- Nome -->
        <div>
          <label for="name" class="label">Nome completo</label>
          <input
            id="name"
            name="name"
            type="text"
            autocomplete="name"
            required
            bind:value={name}
            class="input"
            placeholder="João Silva"
          />
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="label">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            bind:value={email}
            class="input"
            placeholder="seu@email.com"
          />
        </div>

        <!-- Senha -->
        <div>
          <label for="password" class="label">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            required
            bind:value={password}
            class="input"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <!-- Confirmar Senha -->
        <div>
          <label for="confirmPassword" class="label">Confirmar senha</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            bind:value={confirmPassword}
            class="input"
            placeholder="Digite a senha novamente"
          />
        </div>

        <!-- Botão de Cadastro -->
        <button
          type="submit"
          disabled={isLoading}
          class="btn btn-primary w-full btn-lg"
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Criando conta...
          {:else}
            Criar conta
          {/if}
        </button>
      </div>
    </form>

    <!-- Termos -->
    <div class="text-center text-sm text-[var(--gray300)]">
      <p>
        Ao criar uma conta, você concorda com nossos
        <a href="/termos" class="text-[var(--cyan500)] hover:text-[var(--cyan600)]"> Termos de Uso</a> e
        <a href="/privacidade" class="text-[var(--cyan500)] hover:text-[var(--cyan600)]"> Política de Privacidade</a>
      </p>
    </div>
  </div>
</div> 