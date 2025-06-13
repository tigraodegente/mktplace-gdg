<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Props {
    amount: number;
    discount?: number;
    pixKey?: string;
    showInstructions?: boolean;
  }

  let {
    amount = 0,
    discount = 5, // 5% desconto padrão PIX
    pixKey = 'marketplace@gdgpayments.com',
    showInstructions = true
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    confirm: { amount: number; discountedAmount: number };
  }>();

  const discountedAmount = $derived(amount * (1 - (discount || 0) / 100));
  const savings = $derived(amount - discountedAmount);

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function handleConfirm() {
    dispatch('confirm', { 
      amount, 
      discountedAmount 
    });
  }
</script>

<div class="space-y-6">
  <!-- PIX Info -->
  <div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] rounded-lg p-6 text-white">
    <div class="flex items-center space-x-3 mb-4">
      <div class="bg-white/20 rounded-lg p-2">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-semibold">PIX - Pagamento Instantâneo</h3>
        <p class="text-white/80 text-sm">Aprovação imediata e desconto exclusivo</p>
      </div>
    </div>

    <!-- Price breakdown -->
    <div class="space-y-2">
      {#if discount && discount > 0}
        <div class="flex justify-between items-center">
          <span class="text-white/80">Valor original:</span>
          <span class="text-white/80 line-through">{formatCurrency(amount)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-white/80">Desconto PIX ({discount}%):</span>
          <span class="text-white">-{formatCurrency(savings)}</span>
        </div>
        <div class="border-t border-white/20 pt-2">
          <div class="flex justify-between items-center">
            <span class="font-semibold">Total a pagar:</span>
            <span class="text-2xl font-bold">{formatCurrency(discountedAmount)}</span>
          </div>
        </div>
      {:else}
        <div class="flex justify-between items-center">
          <span class="font-semibold">Total a pagar:</span>
          <span class="text-2xl font-bold">{formatCurrency(amount)}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- Instructions -->
  {#if showInstructions}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 class="font-medium text-blue-900 mb-3 flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Como pagar com PIX
      </h4>
      
      <ol class="space-y-2 text-sm text-blue-800">
        <li class="flex items-start">
          <span class="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-3 mt-0.5 flex-shrink-0">1</span>
          <span>Abra o aplicativo do seu banco ou carteira digital</span>
        </li>
        <li class="flex items-start">
          <span class="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-3 mt-0.5 flex-shrink-0">2</span>
          <span>Escolha a opção PIX e escaneie o QR Code ou copie o código</span>
        </li>
        <li class="flex items-start">
          <span class="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-3 mt-0.5 flex-shrink-0">3</span>
          <span>Confirme os dados e finalize o pagamento</span>
        </li>
        <li class="flex items-start">
          <span class="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mr-3 mt-0.5 flex-shrink-0">4</span>
          <span>Seu pedido será confirmado instantaneamente</span>
        </li>
      </ol>
    </div>
  {/if}

  <!-- Benefits -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="text-center p-4 bg-green-50 rounded-lg border border-green-200">
      <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h5 class="font-medium text-green-900 text-sm">Instantâneo</h5>
      <p class="text-green-700 text-xs mt-1">Aprovação imediata</p>
    </div>

    <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h5 class="font-medium text-blue-900 text-sm">Seguro</h5>
      <p class="text-blue-700 text-xs mt-1">Tecnologia do Banco Central</p>
    </div>

    <div class="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
      <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      </div>
      <h5 class="font-medium text-purple-900 text-sm">Desconto</h5>
      <p class="text-purple-700 text-xs mt-1">Até {discount}% off</p>
    </div>
  </div>

  <!-- Confirm button -->
  <button
    type="button"
    onclick={handleConfirm}
    class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00BFB3] transition-colors flex items-center justify-center space-x-2"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
    <span>Pagar {formatCurrency(discountedAmount)} com PIX</span>
  </button>

  <!-- Technical info -->
  <div class="text-center text-xs text-gray-500">
    <p>PIX é uma marca registrada do Banco Central do Brasil</p>
    <p>Disponível 24h por dia, todos os dias da semana</p>
  </div>
</div> 