<script lang="ts">
  import IconSystem from '../../../../../packages/ui/src/lib/components/icons/IconSystem.svelte';
  
  let logoError = $state(false);
  
  function handleLogoError() {
    logoError = true;
  }
</script>

<svelte:head>
  <title>Teste de Ícones - Admin Panel</title>
</svelte:head>

<div class="space-y-8">
  <div class="text-center">
    <h1 class="text-3xl font-bold text-gray-900">Teste de Ícones e Cores</h1>
    <p class="text-gray-600 mt-2">Verificando se todos os ícones estão na cor correta (#00BFB3)</p>
  </div>

  <!-- Ícones do Header -->
  <div class="card">
    <div class="card-header">
      <h2 class="text-xl font-semibold text-gray-900">Ícones do Header</h2>
    </div>
    <div class="card-body">
      <div class="grid grid-cols-3 gap-8">
        <!-- Busca -->
        <div class="text-center">
          <div class="p-4 rounded-lg bg-gray-50">
            <button class="p-2 text-[#00BFB3] hover:text-[#00A89D] hover:bg-[#00BFB3]/5 rounded-lg transition-all">
              <IconSystem name="search" size="lg" />
            </button>
          </div>
          <p class="text-sm text-gray-600 mt-2">Busca</p>
        </div>

        <!-- Notificação -->
        <div class="text-center">
          <div class="p-4 rounded-lg bg-gray-50">
            <button class="p-2 text-[#00BFB3] hover:text-[#00A89D] hover:bg-[#00BFB3]/5 rounded-lg transition-all relative">
              <IconSystem name="notifications" size="lg" />
              <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">5</span>
            </button>
          </div>
          <p class="text-sm text-gray-600 mt-2">Notificações</p>
        </div>

        <!-- Usuário -->
        <div class="text-center">
          <div class="p-4 rounded-lg bg-gray-50">
            <div class="flex items-center justify-center space-x-2">
              <div class="w-8 h-8 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center">
                <IconSystem name="user" size="sm" color="text-white" />
              </div>
              <IconSystem name="arrow_down" size="sm" color="text-[#00BFB3]" />
            </div>
          </div>
          <p class="text-sm text-gray-600 mt-2">Menu Usuário</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Logo Teste -->
  <div class="card">
    <div class="card-header">
      <h2 class="text-xl font-semibold text-gray-900">Logo</h2>
    </div>
    <div class="card-body">
      <div class="flex justify-center">
        <div class="w-16 h-16 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
          {#if !logoError}
            <img 
              src="/logo.png" 
              alt="Marketplace GDG" 
              class="w-12 h-12 object-contain"
              onerror={handleLogoError}
            />
          {:else}
            <IconSystem name="admin" size="xl" color="text-white" />
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Cores de Teste -->
  <div class="card">
    <div class="card-header">
      <h2 class="text-xl font-semibold text-gray-900">Paleta de Cores</h2>
    </div>
    <div class="card-body">
      <div class="grid grid-cols-4 gap-4">
        <div class="text-center">
          <div class="w-20 h-20 bg-[#00BFB3] rounded-lg mx-auto"></div>
          <p class="text-sm text-gray-600 mt-2">#00BFB3<br>(Principal)</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-[#00A89D] rounded-lg mx-auto"></div>
          <p class="text-sm text-gray-600 mt-2">#00A89D<br>(Hover)</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-[#00BFB3]/10 rounded-lg mx-auto border border-gray-200"></div>
          <p class="text-sm text-gray-600 mt-2">10% Opacity<br>(Background)</p>
        </div>
        <div class="text-center">
          <div class="w-20 h-20 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-lg mx-auto"></div>
          <p class="text-sm text-gray-600 mt-2">Gradiente<br>(Logo)</p>
        </div>
      </div>
    </div>
  </div>
</div> 