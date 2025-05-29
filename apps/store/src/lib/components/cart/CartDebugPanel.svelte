<script lang="ts">
  import { advancedCartStore } from '$lib/stores/advancedCartStore';

  const { 
    sellerGroups, 
    cartTotals, 
    appliedCoupon,
    items
  } = advancedCartStore;

  // Função para verificar integridade dos cálculos
  function checkCalculationIntegrity() {
    const totals = $cartTotals;
    const manualSubtotal = $items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const manualTotal = manualSubtotal - totals.totalDiscount;
    const subtotalDiff = Math.abs(manualSubtotal - totals.cartSubtotal);
    const totalDiff = Math.abs(manualTotal - totals.cartTotal);

    return {
      subtotalDiff,
      totalDiff,
      subtotalOK: subtotalDiff < 0.01,
      totalOK: totalDiff < 0.01,
      manualSubtotal,
      manualTotal
    };
  }

  $: integrity = checkCalculationIntegrity();
</script>

<div class="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl text-xs font-mono max-w-md z-50 max-h-96 overflow-y-auto">
  <h3 class="text-sm font-bold mb-3 text-yellow-300">🐛 Debug do Carrinho</h3>
  
  <!-- Itens do carrinho -->
  <div class="mb-3">
    <h4 class="text-yellow-200 font-semibold mb-1">📦 Itens ({$items.length}):</h4>
    {#each $items as item}
      <div class="bg-gray-800 p-2 rounded mb-1">
        <div class="text-green-300">{item.product.name}</div>
        <div class="text-gray-300">
          R$ {item.product.price.toFixed(2)} × {item.quantity} = R$ {(item.product.price * item.quantity).toFixed(2)}
        </div>
        <div class="text-blue-300 text-xs">Vendedor: {item.sellerName}</div>
      </div>
    {/each}
  </div>

  <!-- Cupom aplicado -->
  {#if $appliedCoupon}
    <div class="mb-3">
      <h4 class="text-yellow-200 font-semibold mb-1">🎫 Cupom Ativo:</h4>
      <div class="bg-green-900 p-2 rounded">
        <div class="text-green-300">Código: {$appliedCoupon.code}</div>
        <div class="text-gray-300">Tipo: {$appliedCoupon.type}</div>
        <div class="text-gray-300">Valor: {$appliedCoupon.value}% | R$ {$appliedCoupon.value}</div>
        <div class="text-gray-300">Escopo: {$appliedCoupon.scope}</div>
      </div>
    </div>
  {:else}
    <div class="mb-3">
      <h4 class="text-yellow-200 font-semibold mb-1">🎫 Cupom:</h4>
      <div class="text-gray-400">Nenhum cupom aplicado</div>
    </div>
  {/if}

  <!-- Cálculos -->
  <div class="mb-3">
    <h4 class="text-yellow-200 font-semibold mb-1">💰 Cálculos:</h4>
    <div class="bg-gray-800 p-2 rounded space-y-1">
      <div class="text-blue-300">Subtotal: R$ {$cartTotals.cartSubtotal.toFixed(2)}</div>
      <div class="text-red-300">Desconto Cupom: -R$ {$cartTotals.couponDiscount.toFixed(2)}</div>
      <div class="text-red-300">Desconto Total: -R$ {$cartTotals.totalDiscount.toFixed(2)}</div>
      <div class="text-green-300 font-bold">Total Final: R$ {$cartTotals.cartTotal.toFixed(2)}</div>
      <div class="text-gray-400">Parcelas: 12x R$ {$cartTotals.installmentValue.toFixed(2)}</div>
    </div>
  </div>

  <!-- Verificação de integridade -->
  <div class="mb-3">
    <h4 class="text-yellow-200 font-semibold mb-1">🔍 Integridade:</h4>
    <div class="bg-gray-800 p-2 rounded space-y-1">
      <div class="text-gray-300">
        Subtotal Manual: R$ {integrity.manualSubtotal.toFixed(2)}
        <span class={integrity.subtotalOK ? 'text-green-400' : 'text-red-400'}>
          {integrity.subtotalOK ? '✅' : '❌'}
        </span>
      </div>
      <div class="text-gray-300">
        Total Manual: R$ {integrity.manualTotal.toFixed(2)}
        <span class={integrity.totalOK ? 'text-green-400' : 'text-red-400'}>
          {integrity.totalOK ? '✅' : '❌'}
        </span>
      </div>
      {#if !integrity.subtotalOK || !integrity.totalOK}
        <div class="text-red-400 text-xs">
          ⚠️ Diferenças detectadas!
        </div>
      {/if}
    </div>
  </div>

  <!-- Vendedores -->
  <div class="mb-3">
    <h4 class="text-yellow-200 font-semibold mb-1">🏪 Por Vendedor:</h4>
    {#each $sellerGroups as group}
      <div class="bg-gray-800 p-2 rounded mb-1">
        <div class="text-cyan-300">{group.sellerName}</div>
        <div class="text-gray-300">
          {group.items.length} itens • R$ {group.subtotal.toFixed(2)}
        </div>
        <div class="text-gray-300">
          Desconto: -R$ {group.discount.toFixed(2)}
        </div>
        <div class="text-green-300">
          Total: R$ {group.total.toFixed(2)}
        </div>
      </div>
    {/each}
  </div>

  <div class="text-xs text-gray-400 border-t pt-2 space-y-1">
    <div>🔧 Console Commands:</div>
    <div class="text-green-300">→ window.cartDebug.report()</div>
    <div class="text-blue-300">→ window.cartDebug.clear()</div>
  </div>
</div> 