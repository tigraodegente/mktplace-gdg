<script lang="ts">
  import type { UserRole } from '@mktplace/shared-types';
  
  interface Props {
    appType: 'admin' | 'vendor';
    auth: {
      user: { name: string } | null;
      currentRole: UserRole | null;
      availableRoles: UserRole[];
      hasRole: (role: UserRole) => boolean;
      switchRole: (role: UserRole) => Promise<boolean>;
      logout: () => Promise<void>;
    };
  }
  
  let { appType, auth }: Props = $props();
  
  const appConfig = {
    admin: {
      logo: '/admin-logo.svg',
      title: 'Painel Administrativo',
      color: 'cyan-600'
    },
    vendor: {
      logo: '/vendor-logo.svg', 
      title: 'Painel do Vendedor',
      color: 'cyan-700'
    }
  };
  
  const config = appConfig[appType];
  
  const roleOptions: Record<UserRole, { label: string; url: string }> = {
    customer: { label: '🛒 Loja (Cliente)', url: '/' },
    vendor: { label: '🏪 Painel Vendedor', url: '/vendor/dashboard' },
    admin: { label: '👨‍💼 Painel Admin', url: '/admin/dashboard' }
  };
  
  let showRoleSwitcher = $state(false);
  
  async function switchToRole(newRole: UserRole) {
    if (auth.user && auth.hasRole(newRole)) {
      await auth.switchRole(newRole);
    }
  }
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="container">
    <div class="flex items-center justify-between h-16">
      <!-- Logo e Título -->
      <div class="flex items-center space-x-4">
        <img src={config.logo} alt={config.title} class="h-8 w-8" />
        <h1 class="text-xl font-semibold text-gray-900">
          {config.title}
        </h1>
      </div>
      
      <!-- Centro: Navegação rápida -->
      <nav class="flex items-center space-x-6">
        <a href="/dashboard" class="nav-link">
          Dashboard
        </a>
        <a href="/produtos" class="nav-link">
          Produtos
        </a>
        <a href="/pedidos" class="nav-link">
          Pedidos
        </a>
      </nav>
      
      <!-- Direita: User Menu -->
      <div class="flex items-center space-x-4">
        <!-- Seletor de Contexto -->
        {#if auth.user && auth.availableRoles.length > 1}
          <div class="relative">
            <button
              class="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              onclick={() => showRoleSwitcher = !showRoleSwitcher}
            >
              <span>
                {#if auth.currentRole === 'customer'}🛒
                {:else if auth.currentRole === 'vendor'}🏪  
                {:else}👨‍💼
                {/if}
              </span>
              <span>Alternar contexto</span>
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
            
            {#if showRoleSwitcher}
              <div class="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div class="py-1">
                  {#each auth.availableRoles as role}
                    <button
                      class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      class:bg-cyan-50={auth.currentRole === role}
                      class:text-cyan-700={auth.currentRole === role}
                      onclick={() => {
                        showRoleSwitcher = false;
                        switchToRole(role);
                      }}
                    >
                      <span class="mr-3">
                        {#if role === 'customer'}🛒
                        {:else if role === 'vendor'}🏪
                        {:else}👨‍💼
                        {/if}
                      </span>
                      <div class="flex-1 text-left">
                        <div class="font-medium">
                          {roleOptions[role].label}
                        </div>
                        {#if auth.currentRole === role}
                          <div class="text-xs text-cyan-600">Ativo agora</div>
                        {/if}
                      </div>
                      {#if auth.currentRole === role}
                        <svg class="w-4 h-4 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- User Info -->
        <div class="flex items-center space-x-2">
          <div class="text-right">
            <div class="text-sm font-medium text-gray-900">
              {auth.user?.name || 'Usuário'}
            </div>
            <div class="text-xs text-gray-500">
              {#if auth.currentRole === 'admin'}
                Administrador
              {:else if auth.currentRole === 'vendor'}
                Vendedor
              {:else}
                Cliente
              {/if}
            </div>
          </div>
          
          <button
            class="btn btn-primary btn-sm"
            onclick={() => auth.logout()}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  </div>
</header>

<!-- Overlay para fechar dropdown -->
{#if showRoleSwitcher}
  <div 
    class="fixed inset-0 z-40"
    onclick={() => showRoleSwitcher = false}
  ></div>
{/if}

<style>
  .nav-link {
    @apply text-gray-600 hover:text-gray-900 transition-colors;
  }
  
  .btn-sm {
    @apply px-3 py-1.5 text-sm;
  }
</style> 