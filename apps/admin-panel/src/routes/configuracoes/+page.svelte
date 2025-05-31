<script lang="ts">
  // Mock data - seria substituído por dados reais da API
  let settings = {
    siteName: 'Marketplace GDG',
    siteDescription: 'O melhor marketplace do Brasil',
    emailNotifications: true,
    smsNotifications: false,
    maintenanceMode: false,
    autoApprove: true,
  };
</script>

<div class="page-header">
  <div>
    <h1 class="page-title">Configurações</h1>
    <p class="page-subtitle">Gerencie as configurações da plataforma</p>
  </div>
  <button class="btn btn-primary">
    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>
    Salvar Alterações
  </button>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <!-- Navigation -->
  <div class="lg:col-span-1">
    <div class="card">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">Seções</h3>
      </div>
      <div class="card-body p-0">
        <nav class="space-y-1">
          <a href="#geral" class="nav-link active">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Geral
          </a>
          <a href="#notificacoes" class="nav-link">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11 19H6a2 2 0 01-2-2V7a2 2 0 012-2h6l4 4v5"/>
            </svg>
            Notificações
          </a>
          <a href="#pagamentos" class="nav-link">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            </svg>
            Pagamentos
          </a>
          <a href="#seguranca" class="nav-link">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            Segurança
          </a>
          <a href="#sistema" class="nav-link">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
            </svg>
            Sistema
          </a>
        </nav>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="lg:col-span-2 space-y-6">
    
    <!-- Configurações Gerais -->
    <div class="card" id="geral">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">Configurações Gerais</h3>
      </div>
      <div class="card-body space-y-6">
        <div>
          <label class="label">Nome do Site</label>
          <input type="text" bind:value={settings.siteName} class="input">
        </div>
        
        <div>
          <label class="label">Descrição</label>
          <textarea bind:value={settings.siteDescription} rows="3" class="input resize-none"></textarea>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Moeda Padrão</label>
            <select class="input">
              <option>Real (BRL)</option>
              <option>Dólar (USD)</option>
              <option>Euro (EUR)</option>
            </select>
          </div>
          <div>
            <label class="label">Fuso Horário</label>
            <select class="input">
              <option>America/Sao_Paulo</option>
              <option>UTC</option>
              <option>America/New_York</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Notificações -->
    <div class="card" id="notificacoes">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">Notificações</h3>
      </div>
      <div class="card-body space-y-4">
        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">Notificações por Email</h4>
            <p class="text-sm text-gray-500">Receber notificações importantes por email</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" bind:checked={settings.emailNotifications} class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">Notificações por SMS</h4>
            <p class="text-sm text-gray-500">Receber alertas críticos por SMS</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" bind:checked={settings.smsNotifications} class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- Pagamentos -->
    <div class="card" id="pagamentos">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">Configurações de Pagamento</h3>
      </div>
      <div class="card-body space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Taxa de Comissão (%)</label>
            <input type="number" value="5.5" class="input">
          </div>
          <div>
            <label class="label">Taxa de Cancelamento (%)</label>
            <input type="number" value="2.0" class="input">
          </div>
        </div>
        
        <div>
          <h4 class="font-medium text-gray-900 mb-3">Métodos de Pagamento Ativos</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked class="text-cyan-600 focus:ring-cyan-500">
              <span class="font-medium">PIX</span>
            </label>
            <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked class="text-cyan-600 focus:ring-cyan-500">
              <span class="font-medium">Cartão de Crédito</span>
            </label>
            <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked class="text-cyan-600 focus:ring-cyan-500">
              <span class="font-medium">Boleto Bancário</span>
            </label>
            <label class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" class="text-cyan-600 focus:ring-cyan-500">
              <span class="font-medium">Cartão de Débito</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Sistema -->
    <div class="card" id="sistema">
      <div class="card-header">
        <h3 class="text-lg font-semibold text-gray-900">Sistema</h3>
      </div>
      <div class="card-body space-y-4">
        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">Modo Manutenção</h4>
            <p class="text-sm text-gray-500">Desabilitar o site para manutenção</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" bind:checked={settings.maintenanceMode} class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
        
        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 class="font-medium text-gray-900">Auto-aprovação de Produtos</h4>
            <p class="text-sm text-gray-500">Aprovar automaticamente novos produtos</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" bind:checked={settings.autoApprove} class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="action-card">
        <div class="action-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
        </div>
        <div class="mt-4">
          <h4 class="text-lg font-semibold text-gray-900">Backup do Sistema</h4>
          <p class="text-gray-600 mt-1">Fazer backup completo dos dados</p>
          <button class="btn btn-sm btn-primary mt-3">Criar Backup</button>
        </div>
      </div>
      
      <div class="action-card">
        <div class="action-icon">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div class="mt-4">
          <h4 class="text-lg font-semibold text-gray-900">Logs do Sistema</h4>
          <p class="text-gray-600 mt-1">Visualizar e baixar logs de atividade</p>
          <button class="btn btn-sm btn-secondary mt-3">Ver Logs</button>
        </div>
      </div>
    </div>
  </div>
</div> 