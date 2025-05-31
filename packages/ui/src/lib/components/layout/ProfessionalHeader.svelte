<script lang="ts">
  import IconSystem from '../icons/IconSystem.svelte';
  
  interface Props {
    appType: 'admin' | 'seller';
    currentPage: string;
    userName?: string;
    userRole?: string;
    breadcrumbs?: Array<{label: string, href?: string}>;
    notifications?: number;
  }
  
  let { 
    appType, 
    currentPage, 
    userName = 'Usuário', 
    userRole = 'Admin',
    breadcrumbs = [],
    notifications = 0 
  }: Props = $props();
  
  // Configurações por tipo de app
  const appConfig = {
    admin: {
      title: 'Admin Panel',
      logoIcon: 'admin',
      primaryColor: '#00BFB3'
    },
    seller: {
      title: 'Seller Panel', 
      logoIcon: 'store',
      primaryColor: '#00BFB3'
    }
  };
  
  const config = appConfig[appType];
  
  let showUserMenu = $state(false);
  let showNotifications = $state(false);
  let logoLoadError = $state(false);
  
  function handleRoleSwitch() {
    // Implementar troca de role
    console.log('Switching role...');
  }
  
  function handleLogout() {
    window.location.href = '/logout';
  }
  
  function handleLogoError() {
    logoLoadError = true;
  }
</script>

<!-- Header Principal -->
<header class="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
  <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      
      <!-- Logo e Breadcrumbs -->
      <div class="flex items-center space-x-4">
        <!-- Logo -->
        <div class="flex items-center space-x-3">
          <div class="logo-container">
            {#if !logoLoadError}
              <img 
                src="/logo.png" 
                alt="Marketplace GDG" 
                class="w-8 h-8 object-contain"
                onerror={handleLogoError}
              />
            {:else}
              <IconSystem name={config.logoIcon} size="md" color="text-white" />
            {/if}
          </div>
          <div class="hidden sm:block">
            <h1 class="text-xl font-bold text-gray-900">{config.title}</h1>
            <p class="text-xs text-gray-500 uppercase tracking-wide">Marketplace GDG</p>
          </div>
        </div>
        
        <!-- Breadcrumbs -->
        {#if breadcrumbs.length > 0}
          <nav class="hidden lg:flex items-center space-x-2 text-sm">
            <IconSystem name="arrow_right" size="sm" color="text-gray-400" />
            {#each breadcrumbs as breadcrumb, index}
              {#if breadcrumb.href}
                <a 
                  href={breadcrumb.href}
                  class="text-gray-500 hover:text-cyan-500 transition-colors"
                >
                  {breadcrumb.label}
                </a>
              {:else}
                <span class="text-cyan-500 font-medium">{breadcrumb.label}</span>
              {/if}
              
              {#if index < breadcrumbs.length - 1}
                <IconSystem name="arrow_right" size="sm" color="text-gray-300" />
              {/if}
            {/each}
          </nav>
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex items-center space-x-4">
        
        <!-- Search Button -->
        <button class="header-icon-btn" aria-label="Buscar">
          <IconSystem name="search" size="md" />
        </button>
        
        <!-- Notifications -->
        <div class="relative">
          <button 
            onclick={() => showNotifications = !showNotifications}
            class="header-icon-btn relative"
            aria-label="Notificações"
          >
            <IconSystem name="notifications" size="md" />
            {#if notifications > 0}
              <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {notifications > 99 ? '99+' : notifications}
              </span>
            {/if}
          </button>
          
          <!-- Dropdown Notificações -->
          {#if showNotifications}
            <div class="dropdown w-80">
              <div class="px-4 py-3 border-b border-gray-100">
                <h3 class="text-sm font-semibold text-gray-900">Notificações</h3>
              </div>
              
              {#if notifications === 0}
                <div class="px-4 py-8 text-center">
                  <IconSystem name="notifications" size="xl" color="text-gray-300" />
                  <p class="text-gray-500 text-sm mt-2">Nenhuma notificação</p>
                </div>
              {:else}
                <!-- Lista de notificações seria aqui -->
                <div class="px-4 py-3 text-sm text-gray-600">
                  <p>Você tem {notifications} notificações pendentes</p>
                </div>
              {/if}
              
              <div class="border-t border-gray-100 px-4 py-3">
                <button class="text-cyan-500 text-sm font-medium hover:text-cyan-600 transition-colors">
                  Ver todas as notificações
                </button>
              </div>
            </div>
          {/if}
        </div>
        
        <!-- User Menu -->
        <div class="relative">
          <button 
            onclick={() => showUserMenu = !showUserMenu}
            class="flex items-center space-x-3 p-2 rounded-lg hover:bg-cyan-50 transition-all duration-200"
          >
            <!-- Avatar -->
            <div class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
              <IconSystem name="user" size="sm" color="text-white" />
            </div>
            
            <!-- User Info -->
            <div class="hidden sm:block text-left">
              <p class="text-sm font-medium text-gray-900">{userName}</p>
              <p class="text-xs text-gray-500">{userRole}</p>
            </div>
            
            <IconSystem name="arrow_down" size="sm" color="text-cyan-500" />
          </button>
          
          <!-- Dropdown Menu -->
          {#if showUserMenu}
            <div class="dropdown">
              <!-- User Info -->
              <div class="px-4 py-3 border-b border-gray-100">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
                    <IconSystem name="user" size="md" color="text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{userName}</p>
                    <p class="text-xs text-gray-500">{userRole} • Marketplace GDG</p>
                  </div>
                </div>
              </div>
              
              <!-- Menu Items -->
              <div class="py-1">
                <button 
                  onclick={handleRoleSwitch}
                  class="dropdown-item"
                >
                  <IconSystem name="switch" size="sm" color="text-cyan-500" />
                  <span>Trocar Role</span>
                </button>
                
                <a 
                  href="/perfil"
                  class="dropdown-item"
                >
                  <IconSystem name="user" size="sm" color="text-gray-400" />
                  <span>Meu Perfil</span>
                </a>
                
                <a 
                  href="/configuracoes"
                  class="dropdown-item"
                >
                  <IconSystem name="settings" size="sm" color="text-gray-400" />
                  <span>Configurações</span>
                </a>
                
                <div class="border-t border-gray-100 my-1"></div>
                
                <button 
                  onclick={handleLogout}
                  class="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <IconSystem name="logout" size="sm" color="text-red-500" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</header>

<!-- Click outside to close dropdowns -->
<svelte:window onclick={(e) => {
  const target = e.target as Element;
  if (target && !target.closest('[data-dropdown]')) {
    showUserMenu = false;
    showNotifications = false;
  }
}} /> 