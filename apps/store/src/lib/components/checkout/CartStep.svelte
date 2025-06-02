<script lang="ts">
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import type { CartItem } from '$lib/types/checkout';
  
  interface Props {
    items?: CartItem[];
    validation?: any;
    onComplete: (data: any) => void;
    loading?: boolean;
  }
  
  let {
    items = [],
    validation = null,
    onComplete,
    loading = false
  }: Props = $props();
  
  let couponCode = $state('');
  let couponError = $state('');
  let showCouponInput = $state(false);
  
  // Calcular totais
  const subtotal = $derived(items.reduce((total, item) => total + (item.price * item.quantity), 0));
  const shippingCost = $derived(validation?.totals?.shipping || 15.90);
  const discount = $derived(validation?.totals?.discount || 0);
  const total = $derived(subtotal + shippingCost - discount);
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  function handleContinue() {
    onComplete({
      items,
      couponCode: couponCode || undefined
    });
  }
  
  function applyCoupon() {
    if (couponCode.trim()) {
      onComplete({
        items,
        couponCode: couponCode.trim()
      });
    }
  }
</script>

<div class="p-6">
  <h2 class="text-2xl font-bold text-gray-900 mb-6">Revisar Carrinho</h2>
  
  <!-- Lista de Produtos -->
  <div class="space-y-4 mb-6">
    {#each items as item}
      <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <div class="flex-shrink-0">
          <img 
            src={item.image || '/placeholder.jpg'} 
            alt={item.productName}
            class="w-16 h-16 object-cover rounded-md"
          />
        </div>
        
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium text-gray-900 truncate">
            {item.productName}
          </h3>
          <p class="text-sm text-gray-500">Qtd: {item.quantity}</p>
          <p class="text-sm font-medium text-gray-900">
            {formatCurrency(item.price)}
          </p>
        </div>
        
        <div class="text-right">
          <p class="text-lg font-semibold text-gray-900">
            {formatCurrency(item.price * item.quantity)}
          </p>
        </div>
      </div>
    {/each}
  </div>
  
  <!-- Cupom de Desconto -->
  <div class="border-t pt-4 mb-6">
    {#if !showCouponInput}
      <button
        class="text-blue-600 hover:text-blue-800 text-sm font-medium"
        onclick={() => showCouponInput = true}
      >
        + Adicionar cupom de desconto
      </button>
    {:else}
      <div class="flex space-x-3">
        <div class="flex-1">
          <input
            type="text"
            bind:value={couponCode}
            placeholder="Digite o código do cupom"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            class:border-red-300={couponError}
            disabled={loading}
          />
          {#if couponError}
            <p class="text-red-600 text-xs mt-1">{couponError}</p>
          {/if}
        </div>
        <button
          onclick={applyCoupon}
          disabled={loading || !couponCode.trim()}
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if loading}
            <LoadingSpinner size="small" color="white" />
          {:else}
            Aplicar
          {/if}
        </button>
        <button
          onclick={() => { showCouponInput = false; couponCode = ''; couponError = ''; }}
          class="px-3 py-2 text-gray-400 hover:text-gray-600"
          disabled={loading}
        >
          ×
        </button>
      </div>
    {/if}
  </div>
  
  <!-- Resumo de Valores -->
  <div class="bg-gray-50 rounded-lg p-4 mb-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-3">Resumo do Pedido</h3>
    
    <div class="space-y-2">
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">Frete</span>
        <span>{formatCurrency(shippingCost)}</span>
      </div>
      
      {#if discount > 0}
        <div class="flex justify-between text-sm text-green-600">
          <span>Desconto</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      {/if}
      
      <div class="border-t pt-2 mt-2">
        <div class="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Avisos de Validação -->
  {#if validation && validation.errors && validation.errors.length > 0}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <h4 class="text-red-800 font-medium mb-2">Atenção:</h4>
      <ul class="text-red-700 text-sm space-y-1">
        {#each validation.errors as error}
          <li>• {error}</li>
        {/each}
      </ul>
    </div>
  {/if}
  
  <!-- Botões de Ação -->
  <div class="flex justify-between items-center">
    <a
      href="/cart"
      class="text-blue-600 hover:text-blue-800 text-sm font-medium"
    >
      ← Editar carrinho
    </a>
    
    <button
      onclick={handleContinue}
      disabled={loading || items.length === 0 || (validation && !validation.isValid)}
      class="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
    >
      {#if loading}
        <LoadingSpinner size="small" color="white" />
        <span>Validando...</span>
      {:else}
        <span>Continuar para Endereço</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      {/if}
    </button>
  </div>
</div> 