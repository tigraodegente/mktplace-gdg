<script lang="ts">
  import { onMount } from 'svelte';
  
  let email = '';
  let password = '';
  let selectedRole = '';
  let isLoading = false;
  let errorMessage = '';
  let loginResponse: any = null;
  let sessionInfo: any = null;
  let availableRoles: string[] = [];
  
  // Funções de teste
  async function testLogin() {
    if (!email || !password) {
      errorMessage = 'Email e senha são obrigatórios';
      return;
    }
    
    isLoading = true;
    errorMessage = '';
    
    try {
      const response = await fetch('/api/auth/login-multi-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          requestedRole: selectedRole || undefined
        })
      });
      
      const result = await response.json();
      loginResponse = result;
      
      if (result.availableRoles && result.availableRoles.length > 1) {
        availableRoles = result.availableRoles;
      }
      
      if (result.success) {
        await checkSession();
      } else {
        errorMessage = result.error;
      }
    } catch (error: any) {
      errorMessage = 'Erro de conexão: ' + error.message;
    } finally {
      isLoading = false;
    }
  }
  
  async function checkSession() {
    try {
      const response = await fetch('/api/auth/me-multi-role');
      const result = await response.json();
      sessionInfo = result;
    } catch (error: any) {
      console.error('Erro ao verificar sessão:', error);
    }
  }
  
  async function switchRole(newRole: string) {
    isLoading = true;
    
    try {
      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newRole })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await checkSession();
        console.log('Role alterado para:', newRole);
      } else {
        errorMessage = result.error;
      }
    } catch (error: any) {
      errorMessage = 'Erro ao trocar role: ' + error.message;
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    checkSession();
  });
  
  // Usuários pré-definidos para teste
  const testUsers = [
    { email: 'super@marketplace.com', label: 'Super User (Admin + Vendor + Customer)' },
    { email: 'admin-cliente@marketplace.com', label: 'Admin + Cliente' },
    { email: 'vendedor-cliente@marketplace.com', label: 'Vendedor + Cliente' },
    { email: 'admin@marketplace.com', label: 'Admin Simples' },
    { email: 'cliente@marketplace.com', label: 'Cliente Simples' }
  ];
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-8">🧪 Teste - Sistema de Múltiplos Roles</h1>
  
  <!-- Área de Login -->
  <div class="bg-white rounded-lg shadow-md p-6 mb-8">
    <h2 class="text-xl font-semibold mb-4">Login</h2>
    
    <!-- Usuários pré-definidos -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Usuários de Teste:
      </label>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        {#each testUsers as user}
          <button
            class="text-left p-2 border rounded hover:bg-gray-50 text-sm"
            onclick={() => { email = user.email; password = 'password'; }}
          >
            <div class="font-medium">{user.email}</div>
            <div class="text-gray-500 text-xs">{user.label}</div>
          </button>
        {/each}
      </div>
      <p class="text-xs text-gray-500 mt-2">Senha para todos: <code>password</code></p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
          bind:value={email}
          placeholder="Email do usuário"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Senha</label>
        <input
          type="password"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
          bind:value={password}
          placeholder="Senha"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Role Específico (opcional)</label>
        <select
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
          bind:value={selectedRole}
        >
          <option value="">Automático</option>
          <option value="admin">Admin</option>
          <option value="vendor">Vendedor</option>
          <option value="customer">Cliente</option>
        </select>
      </div>
    </div>
    
    <button
      class="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 disabled:opacity-50"
      disabled={isLoading}
      onclick={testLogin}
    >
      {isLoading ? 'Fazendo login...' : 'Login'}
    </button>
    
    {#if errorMessage}
      <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
        {errorMessage}
      </div>
    {/if}
  </div>
  
  <!-- Seletor de Role (quando usuário tem múltiplos) -->
  {#if availableRoles.length > 1}
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
      <h3 class="text-lg font-medium text-yellow-800 mb-3">
        👤 Usuário tem múltiplos perfis - Escolha como acessar:
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        {#each availableRoles as role}
          <button
            class="p-3 border-2 border-yellow-300 rounded-lg hover:bg-yellow-100 text-left"
            onclick={() => { selectedRole = role; testLogin(); }}
          >
            <div class="text-lg">
              {#if role === 'admin'}👨‍💼 Administrador
              {:else if role === 'vendor'}🏪 Vendedor
              {:else}🛒 Cliente
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Informações da Sessão -->
  {#if sessionInfo?.success}
    <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
      <h3 class="text-lg font-semibold text-green-800 mb-4">✅ Usuário Logado</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-medium text-gray-700 mb-2">Informações do Usuário:</h4>
          <ul class="text-sm space-y-1">
            <li><strong>Nome:</strong> {sessionInfo.user.name}</li>
            <li><strong>Email:</strong> {sessionInfo.user.email}</li>
            <li><strong>Roles:</strong> {sessionInfo.user.roles.join(', ')}</li>
            <li><strong>Role Ativo:</strong> 
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                {sessionInfo.currentRole}
              </span>
            </li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-medium text-gray-700 mb-2">Apps Disponíveis:</h4>
          <div class="space-y-2">
            {#each sessionInfo.availableApps as app}
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                <span class="text-sm">
                  {#if app === 'store'}🛒 Loja
                  {:else if app === 'vendor'}🏪 Painel Vendedor
                  {:else if app === 'admin'}👨‍💼 Painel Admin
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </div>
      </div>
      
      <!-- Trocar Role -->
      {#if sessionInfo.user.roles.length > 1}
        <div class="mt-6 pt-4 border-t border-green-200">
          <h4 class="font-medium text-gray-700 mb-3">🔄 Trocar Contexto:</h4>
          <div class="flex flex-wrap gap-2">
            {#each sessionInfo.user.roles as role}
              <button
                class="px-3 py-2 rounded-md text-sm font-medium transition-colors
                  {sessionInfo.currentRole === role 
                    ? 'bg-cyan-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}"
                disabled={sessionInfo.currentRole === role || isLoading}
                onclick={() => switchRole(role)}
              >
                {#if role === 'admin'}👨‍💼 Admin
                {:else if role === 'vendor'}🏪 Vendedor  
                {:else}🛒 Cliente
                {/if}
                {#if sessionInfo.currentRole === role}(Ativo){/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Resposta do Login (Debug) -->
  {#if loginResponse}
    <div class="bg-gray-50 rounded-lg p-4">
      <h3 class="text-lg font-medium mb-2">🔍 Debug - Resposta da API:</h3>
      <pre class="text-xs overflow-auto bg-white p-3 rounded border">{JSON.stringify(loginResponse, null, 2)}</pre>
    </div>
  {/if}
</div>

<style>
  code {
    @apply bg-gray-100 px-1 py-0.5 rounded text-sm;
  }
</style> 