<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { isAuthenticated, user } from '$lib/stores/authStore';
  import { AuthService, type LoginCredentials, type RegisterData } from '$lib/services/auth.service';
  
  const dispatch = createEventDispatcher();
  
  // Estados locais
  let authMode = $state<'choice' | 'login' | 'register'>('choice');
  let authLoading = $state(false);
  let authError = $state('');
  
  // Dados dos formulários
  let loginData = $state<LoginCredentials>({
    email: '',
    password: ''
  });
  
  let registerData = $state<RegisterData & { confirmPassword: string }>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Se já está autenticado, avançar automaticamente
  $effect(() => {
    if ($isAuthenticated) {
      dispatch('next', { user: $user });
    }
  });
  
  async function handleLogin() {
    if (!loginData.email || !loginData.password) {
      authError = 'Preencha todos os campos';
      return;
    }
    
    authLoading = true;
    authError = '';
    
    try {
      console.log('🔐 CheckoutAuth: Usando AuthService para login...');
      const result = await AuthService.login(loginData);
      
      if (result.success && result.data?.user) {
        console.log('✅ CheckoutAuth: Login bem-sucedido via AuthService');
        dispatch('next', { user: result.data.user });
      } else {
        authError = result.error?.message || 'Erro ao fazer login';
      }
    } catch (err) {
      authError = 'Erro ao fazer login. Tente novamente.';
    } finally {
      authLoading = false;
    }
  }
  
  async function handleRegister() {
    if (!registerData.name || !registerData.email || !registerData.password) {
      authError = 'Preencha todos os campos';
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      authError = 'Senhas não coincidem';
      return;
    }
    
    if (registerData.password.length < 6) {
      authError = 'Senha deve ter pelo menos 6 caracteres';
      return;
    }
    
    authLoading = true;
    authError = '';
    
    try {
      console.log('🔐 CheckoutAuth: Usando AuthService para registro...');
      const { confirmPassword, ...userData } = registerData;
      const result = await AuthService.register(userData);
      
      if (result.success && result.data?.user) {
        console.log('✅ CheckoutAuth: Registro bem-sucedido via AuthService');
        dispatch('next', { user: result.data.user });
      } else {
        authError = result.error?.message || 'Erro ao criar conta';
      }
    } catch (err) {
      authError = 'Erro ao criar conta. Tente novamente.';
    } finally {
      authLoading = false;
    }
  }
  
  function handleGuestCheckout() {
    dispatch('next', { user: null, isGuest: true });
  }
  
  function resetForm() {
    authError = '';
    loginData = { email: '', password: '' };
    registerData = { name: '', email: '', password: '', confirmPassword: '' };
  }
</script>

<div class="space-y-6">
  {#if authMode === 'choice'}
    <!-- Escolha de método -->
    <div class="text-center space-y-4">
      <div class="space-y-3">
        <button
          onclick={() => authMode = 'login'}
          class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors flex items-center justify-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Entrar na minha conta</span>
        </button>
        
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-200"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>
        
        <button
          onclick={handleGuestCheckout}
          class="w-full py-3 px-4 border-2 border-[#00BFB3] text-[#00BFB3] font-semibold rounded-lg hover:bg-[#00BFB3] hover:text-white transition-colors flex items-center justify-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5-5 5M6 12h12" />
          </svg>
          <span>Continuar como Convidado</span>
        </button>
      </div>
      
      <p class="text-sm text-gray-600">
        Não tem conta? 
        <button 
          onclick={() => { authMode = 'register'; resetForm(); }}
          class="text-[#00BFB3] hover:text-[#00A89D] font-medium"
        >
          Criar agora
        </button>
      </p>
    </div>
    
  {:else if authMode === 'login'}
    <!-- Formulário de Login -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Entrar na conta</h3>
        <button
          onclick={() => { authMode = 'choice'; resetForm(); }}
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </button>
      </div>
      
      <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
        <div>
          <label for="login-email" class="block text-sm font-medium text-gray-700 mb-1">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            bind:value={loginData.email}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
            placeholder="seu@email.com"
            disabled={authLoading}
            required
          />
        </div>
        
        <div>
          <label for="login-password" class="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <input
            id="login-password"
            type="password"
            bind:value={loginData.password}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
            placeholder="Sua senha"
            disabled={authLoading}
            required
          />
        </div>
        
        {#if authError}
          <div class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {authError}
          </div>
        {/if}
        
        <button
          type="submit"
          disabled={authLoading}
          class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {#if authLoading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Entrando...</span>
          {:else}
            <span>Entrar</span>
          {/if}
        </button>
        
        <div class="text-center text-sm">
          <button 
            type="button"
            onclick={() => { authMode = 'register'; resetForm(); }}
            class="text-[#00BFB3] hover:text-[#00A89D]"
          >
            Não tem conta? Criar agora
          </button>
        </div>
      </form>
    </div>
    
  {:else if authMode === 'register'}
    <!-- Formulário de Registro -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Criar conta</h3>
        <button
          onclick={() => { authMode = 'choice'; resetForm(); }}
          class="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar
        </button>
      </div>
      
      <form onsubmit={(e) => { e.preventDefault(); handleRegister(); }} class="space-y-4">
        <div>
          <label for="reg-name" class="block text-sm font-medium text-gray-700 mb-1">
            Nome completo
          </label>
          <input
            id="reg-name"
            type="text"
            bind:value={registerData.name}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
            placeholder="Seu nome completo"
            disabled={authLoading}
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
            disabled={authLoading}
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
            disabled={authLoading}
            required
          />
        </div>
        
        <div>
          <label for="reg-confirm-password" class="block text-sm font-medium text-gray-700 mb-1">
            Confirmar senha
          </label>
          <input
            id="reg-confirm-password"
            type="password"
            bind:value={registerData.confirmPassword}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
            placeholder="Digite a senha novamente"
            disabled={authLoading}
            required
          />
        </div>
        
        {#if authError}
          <div class="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {authError}
          </div>
        {/if}
        
        <button
          type="submit"
          disabled={authLoading}
          class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {#if authLoading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Criando conta...</span>
          {:else}
            <span>Criar conta</span>
          {/if}
        </button>
        
        <div class="text-center text-sm">
          <button 
            type="button"
            onclick={() => { authMode = 'login'; resetForm(); }}
            class="text-[#00BFB3] hover:text-[#00A89D]"
          >
            Já tenho conta? Entrar
          </button>
        </div>
      </form>
    </div>
  {/if}
</div> 