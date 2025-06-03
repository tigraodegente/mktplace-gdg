<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  let settings = {
    siteName: 'Marketplace GDG',
    siteDescription: 'O melhor marketplace do Brasil',
    emailNotifications: true,
    smsNotifications: false,
    maintenanceMode: false,
    autoApprove: true,
    currency: 'BRL',
    timezone: 'America/Sao_Paulo',
    commissionRate: 5.5,
    cancellationRate: 2.0
  };

  let activeSection = 'geral';
  
  const sections = [
    { id: 'geral', label: 'Geral', icon: 'settings' },
    { id: 'notificacoes', label: 'Notificações', icon: 'notifications' },
    { id: 'pagamentos', label: 'Pagamentos', icon: 'payments' },
    { id: 'seguranca', label: 'Segurança', icon: 'security' },
    { id: 'sistema', label: 'Sistema', icon: 'system' }
  ];

  function setActiveSection(sectionId: string): void {
    activeSection = sectionId;
  }

  function handleSaveSettings(): void {
    console.log('Salvando configurações...', settings);
    // Aqui seria feita a chamada para a API
  }

  function handleCreateBackup(): void {
    console.log('Criando backup...');
  }

  function handleViewLogs(): void {
    console.log('Visualizando logs...');
  }
</script>

<svelte:head>
  <title>Configurações - Admin Panel</title>
</svelte:head>

<!-- Page Header Melhorado -->
<div class="bg-white border-b border-gray-200 px-8 py-6 mb-8">
  <div class="max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <nav class="flex mb-4" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2 text-sm">
        <li>
          <a href="/" class="text-gray-500 hover:text-primary-600 transition-colors">Dashboard</a>
        </li>
        <li class="flex items-center">
          <svg class="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
          <span class="text-gray-900 font-medium">Configurações</span>
        </li>
      </ol>
    </nav>

    <!-- Title & Actions -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Configurações do Sistema</h1>
        <p class="text-lg text-gray-600">Gerencie as configurações da plataforma</p>
      </div>
      <button 
        on:click={handleSaveSettings}
        class="inline-flex items-center px-4 py-2 bg-primary-500 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-sm"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        Salvar Alterações
      </button>
    </div>
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <!-- Navigation Sidebar -->
  <div class="lg:col-span-1">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
      <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
        <h3 class="text-lg font-semibold text-gray-900">Seções</h3>
      </div>
      <nav class="p-2">
        {#each sections as section}
          <button
            on:click={() => setActiveSection(section.id)}
            class="w-full text-left flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors {activeSection === section.id ? 'bg-primary-50 text-primary-600 border-primary-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
          >
            {#if section.icon === 'settings'}
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            {:else if section.icon === 'notifications'}
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h6l4 4v5"/>
              </svg>
            {:else if section.icon === 'payments'}
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
            {:else if section.icon === 'security'}
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            {:else if section.icon === 'system'}
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
              </svg>
            {/if}
            {section.label}
          </button>
        {/each}
      </nav>
    </div>
  </div>

  <!-- Content Area -->
  <div class="lg:col-span-3 space-y-6">
    
    <!-- Configurações Gerais -->
    {#if activeSection === 'geral'}
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
          <h3 class="text-xl font-semibold text-gray-900">Configurações Gerais</h3>
          <p class="text-sm text-gray-600 mt-1">Informações básicas da plataforma</p>
        </div>
        <div class="p-6 space-y-6">
          <div>
            <label for="siteName" class="block text-sm font-medium text-gray-700 mb-2">Nome do Site</label>
            <input 
              id="siteName"
              type="text" 
              bind:value={settings.siteName} 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200"
            />
          </div>
          
          <div>
            <label for="siteDescription" class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
            <textarea 
              id="siteDescription"
              bind:value={settings.siteDescription} 
              rows="3" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200 resize-none"
            ></textarea>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="currency" class="block text-sm font-medium text-gray-700 mb-2">Moeda Padrão</label>
              <select 
                id="currency"
                bind:value={settings.currency}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200"
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div>
              <label for="timezone" class="block text-sm font-medium text-gray-700 mb-2">Fuso Horário</label>
              <select 
                id="timezone"
                bind:value={settings.timezone}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200"
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Notificações -->
    {#if activeSection === 'notificacoes'}
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
          <h3 class="text-xl font-semibold text-gray-900">Notificações</h3>
          <p class="text-sm text-gray-600 mt-1">Configure como receber notificações</p>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h4 class="font-medium text-gray-900">Notificações por Email</h4>
              <p class="text-sm text-gray-500">Receber notificações importantes por email</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={settings.emailNotifications} class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h4 class="font-medium text-gray-900">Notificações por SMS</h4>
              <p class="text-sm text-gray-500">Receber alertas críticos por SMS</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={settings.smsNotifications} class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    {/if}

    <!-- Pagamentos -->
    {#if activeSection === 'pagamentos'}
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
          <h3 class="text-xl font-semibold text-gray-900">Configurações de Pagamento</h3>
          <p class="text-sm text-gray-600 mt-1">Taxas e métodos de pagamento</p>
        </div>
        <div class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="commissionRate" class="block text-sm font-medium text-gray-700 mb-2">Taxa de Comissão (%)</label>
              <input 
                id="commissionRate"
                type="number" 
                bind:value={settings.commissionRate} 
                step="0.1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200"
              />
            </div>
            <div>
              <label for="cancellationRate" class="block text-sm font-medium text-gray-700 mb-2">Taxa de Cancelamento (%)</label>
              <input 
                id="cancellationRate"
                type="number" 
                bind:value={settings.cancellationRate} 
                step="0.1"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all duration-200"
              />
            </div>
          </div>
          
          <div>
            <h4 class="font-medium text-gray-900 mb-4">Métodos de Pagamento Ativos</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked class="text-primary-600 focus:ring-primary-500 rounded">
                <span class="font-medium">PIX</span>
              </label>
              <label class="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked class="text-primary-600 focus:ring-primary-500 rounded">
                <span class="font-medium">Cartão de Crédito</span>
              </label>
              <label class="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked class="text-primary-600 focus:ring-primary-500 rounded">
                <span class="font-medium">Boleto Bancário</span>
              </label>
              <label class="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="checkbox" class="text-primary-600 focus:ring-primary-500 rounded">
                <span class="font-medium">Cartão de Débito</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Sistema -->
    {#if activeSection === 'sistema'}
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
          <h3 class="text-xl font-semibold text-gray-900">Sistema</h3>
          <p class="text-sm text-gray-600 mt-1">Configurações avançadas do sistema</p>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h4 class="font-medium text-gray-900">Modo Manutenção</h4>
              <p class="text-sm text-gray-500">Desabilitar o site para manutenção</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={settings.maintenanceMode} class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
          
          <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h4 class="font-medium text-gray-900">Auto-aprovação de Produtos</h4>
              <p class="text-sm text-gray-500">Aprovar automaticamente novos produtos</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={settings.autoApprove} class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    {/if}

    <!-- Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
          <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
        </div>
        <h4 class="text-lg font-semibold text-gray-900 mb-2">Backup do Sistema</h4>
        <p class="text-gray-600 text-sm mb-4">Fazer backup completo dos dados</p>
        <button 
          on:click={handleCreateBackup}
          class="btn btn-primary btn-sm"
        >
          Criar Backup
        </button>
      </div>
      
      <div class="group block p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1">
        <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
          <svg class="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h4 class="text-lg font-semibold text-gray-900 mb-2">Logs do Sistema</h4>
        <p class="text-gray-600 text-sm mb-4">Visualizar e baixar logs de atividade</p>
        <button 
          on:click={handleViewLogs}
          class="btn btn-secondary btn-sm"
        >
          Ver Logs
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .btn {
    @apply inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm;
  }
  
  .btn-primary {
    @apply bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm;
  }
  
  .btn-secondary {
    @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 border-gray-200;
  }
  
  .btn-sm {
    @apply text-xs px-3 py-1.5;
  }
</style> 