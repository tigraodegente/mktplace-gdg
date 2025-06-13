<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  interface Props {
    isLoading?: boolean;
    errors?: Record<string, string>;
    showCreateAccountOption?: boolean;
  }

  let {
    isLoading = false,
    errors = {},
    showCreateAccountOption = true
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    submit: { 
      email: string; 
      name: string; 
      phone: string; 
      acceptsMarketing: boolean;
      createAccount: boolean;
      password?: string;
    };
    switchToLogin: void;
  }>();

  let formData = $state({
    email: '',
    name: '',
    phone: '',
    acceptsMarketing: false,
    createAccount: false,
    password: ''
  });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isLoading) return;

    dispatch('submit', {
      email: formData.email.trim(),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      acceptsMarketing: formData.acceptsMarketing,
      createAccount: formData.createAccount,
      password: formData.createAccount ? formData.password : undefined
    });
  }

  function formatPhone(value: string): string {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 2) {
      return `(${numbers}`;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  }

  function handlePhoneInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const formatted = formatPhone(target.value);
    formData.phone = formatted;
  }

  function getFieldError(field: string): string {
    return errors[field] || '';
  }

  function isFieldInvalid(field: string): boolean {
    return !!errors[field];
  }
</script>

<div class="space-y-6">
  <div class="text-center">
    <h3 class="text-lg font-semibold text-gray-900">Checkout como convidado</h3>
    <p class="text-sm text-gray-600 mt-1">
      Preencha seus dados para continuar
    </p>
  </div>

  <form onsubmit={handleSubmit} class="space-y-4">
    <!-- Name -->
    <div>
      <label for="guestName" class="block text-sm font-medium text-gray-700 mb-1">
        Nome completo *
      </label>
      <input
        type="text"
        id="guestName"
        bind:value={formData.name}
        required
        autocomplete="name"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('name') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
        placeholder="Seu nome completo"
      />
      {#if getFieldError('name')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('name')}</p>
      {/if}
    </div>

    <!-- Email -->
    <div>
      <label for="guestEmail" class="block text-sm font-medium text-gray-700 mb-1">
        E-mail *
      </label>
      <input
        type="email"
        id="guestEmail"
        bind:value={formData.email}
        required
        autocomplete="email"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('email') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
        placeholder="seu@email.com"
      />
      {#if getFieldError('email')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
      {/if}
    </div>

    <!-- Phone -->
    <div>
      <label for="guestPhone" class="block text-sm font-medium text-gray-700 mb-1">
        Telefone *
      </label>
      <input
        type="tel"
        id="guestPhone"
        bind:value={formData.phone}
        oninput={handlePhoneInput}
        required
        autocomplete="tel"
        maxlength="15"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('phone') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
        placeholder="(11) 99999-9999"
      />
      {#if getFieldError('phone')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('phone')}</p>
      {/if}
    </div>

    <!-- Create account option -->
    {#if showCreateAccountOption}
      <div class="bg-gray-50 rounded-lg p-4 space-y-3">
        <div class="flex items-start">
          <input
            type="checkbox"
            id="createAccount"
            bind:checked={formData.createAccount}
            class="mt-1 text-[#00BFB3] focus:ring-[#00BFB3] focus:ring-offset-0 rounded"
          />
          <label for="createAccount" class="ml-3 text-sm text-gray-700">
            <span class="font-medium">Criar uma conta</span>
            <p class="text-gray-500 mt-1">
              Facilite suas próximas compras e acompanhe seus pedidos
            </p>
          </label>
        </div>

        {#if formData.createAccount}
          <div>
            <label for="guestPassword" class="block text-sm font-medium text-gray-700 mb-1">
              Escolha uma senha *
            </label>
            <input
              type="password"
              id="guestPassword"
              bind:value={formData.password}
              required={formData.createAccount}
              autocomplete="new-password"
              minlength="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
                isFieldInvalid('password') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
              }"
              placeholder="Mínimo 6 caracteres"
            />
            {#if getFieldError('password')}
              <p class="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
            {/if}
            <p class="mt-1 text-xs text-gray-500">
              Sua conta será criada automaticamente após a compra
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Marketing consent -->
    <div class="flex items-start">
      <input
        type="checkbox"
        id="acceptsMarketing"
        bind:checked={formData.acceptsMarketing}
        class="mt-1 text-[#00BFB3] focus:ring-[#00BFB3] focus:ring-offset-0 rounded"
      />
      <label for="acceptsMarketing" class="ml-3 text-sm text-gray-700">
        Aceito receber ofertas e novidades por e-mail
        <span class="text-gray-500">(opcional)</span>
      </label>
    </div>

    <!-- Submit button -->
    <button
      type="submit"
      disabled={isLoading}
      class="w-full py-2 px-4 bg-[#00BFB3] text-white font-medium rounded-lg hover:bg-[#00A89D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
    >
      {#if isLoading}
        <LoadingSpinner size="small" color="white" />
        <span>Continuando...</span>
      {:else}
        <span>Continuar para Endereço</span>
      {/if}
    </button>
  </form>

  <!-- Switch to login -->
  <div class="pt-4 border-t border-gray-200 text-center">
    <p class="text-sm text-gray-600">
      Já tem uma conta?
      <button
        type="button"
        onclick={() => dispatch('switchToLogin')}
        disabled={isLoading}
        class="text-[#00BFB3] hover:text-[#00A89D] font-medium disabled:opacity-50 transition-colors"
      >
        Fazer login
      </button>
    </p>
  </div>

  <!-- Security notice -->
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div class="flex items-start space-x-3">
      <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <div class="text-sm text-blue-800">
        <p class="font-medium mb-1">Seus dados estão protegidos</p>
        <p>
          Utilizamos criptografia SSL para proteger suas informações pessoais.
          Seus dados não serão compartilhados com terceiros.
        </p>
      </div>
    </div>
  </div>
</div> 