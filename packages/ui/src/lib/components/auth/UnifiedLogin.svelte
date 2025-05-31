<script lang="ts">
  import { createAuthStore } from '$lib/services/auth';
  import type { AuthLoginRequest, UserRole } from '@mktplace/shared-types';
  
  interface Props {
    appType?: 'store' | 'admin' | 'vendor';
    title?: string;
  }
  
  let { appType = 'store', title = 'Login' }: Props = $props();
  
  const auth = createAuthStore();
  
  let email = $state('');
  let password = $state('');
  let selectedRole = $state<UserRole | undefined>();
  let errorMessage = $state('');
  let showRoleSelector = $state(false);
  let availableRoles = $state<UserRole[]>([]);
  
  const roleLabels = {
    customer: 'Cliente (Comprar)',
    vendor: 'Vendedor (Minha Loja)', 
    admin: 'Administrador'
  };
  
  async function handleLogin() {
    errorMessage = '';
    
    const credentials: AuthLoginRequest = {
      email,
      password,
      requestedRole: selectedRole
    };
    
    const result = await auth.login(credentials);
    
    if (result.success) {
      // Login bem-sucedido
      if (result.redirectTo) {
        window.location.href = result.redirectTo;
      }
    } else if (result.availableRoles && result.availableRoles.length > 1) {
      // Usuário tem múltiplos roles - mostrar seletor
      availableRoles = result.availableRoles;
      showRoleSelector = true;
    } else {
      errorMessage = result.error || 'Erro no login';
    }
  }
  
  async function loginWithRole(role: UserRole) {
    selectedRole = role;
    await handleLogin();
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">
        {title}
      </h2>
      <p class="mt-2 text-sm text-gray-600">
        {#if appType === 'admin'}
          Acesso ao painel administrativo
        {:else if appType === 'vendor'}
          Acesso ao painel do vendedor
        {:else}
          Entre na sua conta
        {/if}
      </p>
    </div>
    
    {#if !showRoleSelector}
      <!-- Formulário de Login -->
      <form class="mt-8 space-y-6" onsubmit={e => { e.preventDefault(); handleLogin(); }}>
        <div class="space-y-4">
          <div>
            <label for="email" class="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              class="input"
              placeholder="seu@email.com"
              bind:value={email}
            />
          </div>
          
          <div>
            <label for="password" class="label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              class="input"
              placeholder="Sua senha"
              bind:value={password}
            />
          </div>
        </div>
        
        {#if errorMessage}
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        {/if}
        
        <button
          type="submit"
          class="btn btn-primary w-full"
          disabled={auth.isLoading}
        >
          {#if auth.isLoading}
            Entrando...
          {:else}
            Entrar
          {/if}
        </button>
      </form>
    {:else}
      <!-- Seletor de Role -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900 text-center">
          Como deseja acessar?
        </h3>
        <p class="text-sm text-gray-600 text-center">
          Sua conta tem múltiplos perfis. Escolha como deseja entrar:
        </p>
        
        <div class="space-y-3">
          {#each availableRoles as role}
            <button
              class="btn btn-outline w-full text-left justify-start"
              onclick={() => loginWithRole(role)}
            >
              <span class="text-lg mr-3">
                {#if role === 'customer'}🛒
                {:else if role === 'vendor'}🏪
                {:else}👨‍💼
                {/if}
              </span>
              {roleLabels[role]}
            </button>
          {/each}
        </div>
        
        <button
          class="text-sm text-gray-500 underline w-full"
          onclick={() => showRoleSelector = false}
        >
          ← Voltar ao login
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .btn-outline {
    @apply bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400;
  }
</style> 