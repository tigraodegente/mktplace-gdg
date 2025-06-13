<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

  interface Props {
    isLoading?: boolean;
    errors?: Record<string, string>;
    showForgotPassword?: boolean;
  }

  let {
    isLoading = false,
    errors = {},
    showForgotPassword = true
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    submit: { email: string; password: string; rememberMe: boolean };
    forgotPassword: { email: string };
    switchToRegister: void;
    switchToGuest: void;
  }>();

  let formData = $state({
    email: '',
    password: '',
    rememberMe: false
  });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isLoading) return;

    dispatch('submit', {
      email: formData.email.trim(),
      password: formData.password,
      rememberMe: formData.rememberMe
    });
  }

  function handleForgotPassword() {
    if (!formData.email.trim()) {
      return;
    }
    dispatch('forgotPassword', { email: formData.email.trim() });
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
    <h3 class="text-lg font-semibold text-gray-900">Entrar na sua conta</h3>
    <p class="text-sm text-gray-600 mt-1">
      Para continuar com suas informações salvas
    </p>
  </div>

  <form onsubmit={handleSubmit} class="space-y-4">
    <!-- Email -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
        E-mail *
      </label>
      <input
        type="email"
        id="email"
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

    <!-- Password -->
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
        Senha *
      </label>
      <input
        type="password"
        id="password"
        bind:value={formData.password}
        required
        autocomplete="current-password"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors {
          isFieldInvalid('password') ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        }"
        placeholder="Sua senha"
      />
      {#if getFieldError('password')}
        <p class="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
      {/if}
    </div>

    <!-- Remember me -->
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <input
          type="checkbox"
          id="rememberMe"
          bind:checked={formData.rememberMe}
          class="text-[#00BFB3] focus:ring-[#00BFB3] focus:ring-offset-0 rounded"
        />
        <label for="rememberMe" class="ml-2 text-sm text-gray-700">
          Lembrar de mim
        </label>
      </div>

      {#if showForgotPassword}
        <button
          type="button"
          onclick={handleForgotPassword}
          disabled={!formData.email.trim() || isLoading}
          class="text-sm text-[#00BFB3] hover:text-[#00A89D] disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Esqueci minha senha
        </button>
      {/if}
    </div>

    <!-- Submit button -->
    <button
      type="submit"
      disabled={isLoading}
      class="w-full py-2 px-4 bg-[#00BFB3] text-white font-medium rounded-lg hover:bg-[#00A89D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
    >
      {#if isLoading}
        <LoadingSpinner size="small" color="white" />
        <span>Entrando...</span>
      {:else}
        <span>Entrar</span>
      {/if}
    </button>
  </form>

  <!-- Alternative actions -->
  <div class="space-y-3 pt-4 border-t border-gray-200">
    <button
      type="button"
      onclick={() => dispatch('switchToRegister')}
      disabled={isLoading}
      class="w-full py-2 px-4 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3] disabled:opacity-50 transition-colors"
    >
      Criar uma conta
    </button>

    <button
      type="button"
      onclick={() => dispatch('switchToGuest')}
      disabled={isLoading}
      class="w-full py-2 px-4 text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 transition-colors"
    >
      Continuar como convidado
    </button>
  </div>
</div> 