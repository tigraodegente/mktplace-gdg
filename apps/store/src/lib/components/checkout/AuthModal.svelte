<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { isAuthenticated, user } from '$lib/stores/auth';
  import { AuthService, type LoginCredentials, type RegisterData } from '$lib/services/auth.service';
  
  interface Props {
    isOpen?: boolean;
  }
  
  let { isOpen = false }: Props = $props();
  
  const dispatch = createEventDispatcher();
  
  let mode: 'choice' | 'login' | 'register' = 'choice';
  let loading = false;
  let error = '';
  
  // Dados do formulário
  let loginData: LoginCredentials = {
    email: '',
    password: ''
  };
  
  let registerData: RegisterData & { confirmPassword: string } = {
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  
  function closeModal() {
    mode = 'choice';
    error = '';
    dispatch('close');
  }
  
  function continueAsGuest() {
    dispatch('guest');
    closeModal();
  }
  
  async function handleLogin() {
    if (!loginData.email || !loginData.password) {
      error = 'Preencha todos os campos';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      console.log('🔐 AuthModal: Usando AuthService para login...');
      const result = await AuthService.login(loginData);
      
      if (result.success && result.data?.user) {
        console.log('✅ AuthModal: Login bem-sucedido via AuthService');
        dispatch('login', result.data);
        closeModal();
      } else {
        error = result.error?.message || 'Erro ao fazer login';
      }
    } catch (err) {
      error = 'Erro ao fazer login. Tente novamente.';
    } finally {
      loading = false;
    }
  }
  
  async function handleRegister() {
    if (!registerData.name || !registerData.email || !registerData.password) {
      error = 'Preencha todos os campos';
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      error = 'Senhas não coincidem';
      return;
    }
    
    if (registerData.password.length < 6) {
      error = 'Senha deve ter pelo menos 6 caracteres';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      console.log('🔐 AuthModal: Usando AuthService para registro...');
      const { confirmPassword, ...userData } = registerData;
      const result = await AuthService.register(userData);
      
      if (result.success && result.data?.user) {
        console.log('✅ AuthModal: Registro bem-sucedido via AuthService');
        dispatch('register', result.data);
        closeModal();
      } else {
        error = result.error?.message || 'Erro ao criar conta';
      }
    } catch (err) {
      error = 'Erro ao criar conta. Tente novamente.';
    } finally {
      loading = false;
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  // Debug: Log quando isOpen muda
  $effect(() => {
    console.log('🔐 AuthModal isOpen:', isOpen);
    if (isOpen) {
      console.log('✅ Modal deve estar visível agora');
    } else {
      console.log('❌ Modal deve estar oculto agora');
    }
  });
  
  // Se já está autenticado, fechar modal automaticamente
  $effect(() => {
    if ($isAuthenticated && isOpen) {
      console.log('✅ AuthModal: Usuário já autenticado, fechando modal...');
      dispatch('login', { user: $user });
      closeModal();
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    on:click={closeModal}
  >
    <!-- Modal -->
    <div 
      class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b">
        <h2 class="text-xl font-bold text-gray-900">
          {mode === 'choice' ? 'Finalizar Compra' : 
           mode === 'login' ? 'Entrar na sua conta' : 'Criar sua conta'}
        </h2>
        <button
          on:click={closeModal}
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-6">
        
        {#if mode === 'choice'}
          <!-- Escolha inicial -->
          <div class="text-center mb-6">
            <p class="text-gray-600 mb-6">Como você gostaria de continuar?</p>
            
            <!-- Botão Continuar como Convidado -->
            <button
              on:click={continueAsGuest}
              class="w-full mb-4 py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
              <span>Continuar como Convidado</span>
            </button>
            
            <div class="relative mb-4">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-200"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>
            
            <!-- Botão Fazer Login -->
            <button
              on:click={() => mode = 'login'}
              class="w-full mb-3 py-3 px-4 border-2 border-[#00BFB3] text-[#00BFB3] font-semibold rounded-lg hover:bg-[#00BFB3] hover:text-white transition-colors flex items-center justify-center space-x-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Entrar na minha conta</span>
            </button>
            
            <!-- Link Criar Conta -->
            <p class="text-sm text-gray-600">
              Não tem conta? 
              <button 
                on:click={() => mode = 'register'}
                class="text-[#00BFB3] hover:text-[#00A89D] font-medium"
              >
                Criar agora
              </button>
            </p>
          </div>
          
          <!-- Benefícios -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2">Vantagens de ter uma conta:</h3>
            <ul class="text-sm text-gray-600 space-y-1">
              <li class="flex items-center">
                <svg class="w-4 h-4 text-[#00BFB3] mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Acompanhar pedidos em tempo real
              </li>
              <li class="flex items-center">
                <svg class="w-4 h-4 text-[#00BFB3] mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Salvar endereços para futuras compras
              </li>
              <li class="flex items-center">
                <svg class="w-4 h-4 text-[#00BFB3] mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Receber ofertas exclusivas
              </li>
            </ul>
          </div>
          
        {:else if mode === 'login'}
          <!-- Formulário de Login -->
          <form on:submit|preventDefault={handleLogin} class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                bind:value={loginData.email}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                placeholder="seu@email.com"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                bind:value={loginData.password}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                placeholder="Sua senha"
                disabled={loading}
                required
              />
            </div>
            
            {#if error}
              <div class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            {/if}
            
            <button
              type="submit"
              disabled={loading}
              class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {#if loading}
                <LoadingSpinner size="small" color="white" />
                <span>Entrando...</span>
              {:else}
                <span>Entrar</span>
              {/if}
            </button>
            
            <div class="text-center">
              <p class="text-sm text-gray-600">
                <button 
                  type="button"
                  on:click={() => mode = 'choice'}
                  class="text-[#00BFB3] hover:text-[#00A89D]"
                >
                  ← Voltar
                </button>
                <span class="mx-2">•</span>
                <button 
                  type="button"
                  on:click={() => mode = 'register'}
                  class="text-[#00BFB3] hover:text-[#00A89D]"
                >
                  Criar conta
                </button>
              </p>
            </div>
          </form>
          
        {:else if mode === 'register'}
          <!-- Formulário de Registro -->
          <form on:submit|preventDefault={handleRegister} class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <input
                id="name"
                type="text"
                bind:value={registerData.name}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                placeholder="Seu nome completo"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label for="reg-email" class="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="reg-email"
                type="email"
                bind:value={registerData.email}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                placeholder="seu@email.com"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label for="reg-password" class="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                id="reg-password"
                type="password"
                bind:value={registerData.password}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">
                Confirmar senha
              </label>
              <input
                id="confirm-password"
                type="password"
                bind:value={registerData.confirmPassword}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                placeholder="Digite a senha novamente"
                disabled={loading}
                required
              />
            </div>
            
            {#if error}
              <div class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            {/if}
            
            <button
              type="submit"
              disabled={loading}
              class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {#if loading}
                <LoadingSpinner size="small" color="white" />
                <span>Criando conta...</span>
              {:else}
                <span>Criar conta</span>
              {/if}
            </button>
            
            <div class="text-center">
              <p class="text-sm text-gray-600">
                <button 
                  type="button"
                  on:click={() => mode = 'choice'}
                  class="text-[#00BFB3] hover:text-[#00A89D]"
                >
                  ← Voltar
                </button>
                <span class="mx-2">•</span>
                <button 
                  type="button"
                  on:click={() => mode = 'login'}
                  class="text-[#00BFB3] hover:text-[#00A89D]"
                >
                  Já tenho conta
                </button>
              </p>
            </div>
          </form>
        {/if}
      </div>
    </div>
  </div>
{/if} 