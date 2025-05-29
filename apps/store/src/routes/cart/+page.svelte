<script lang="ts">
  import { advancedCartStore } from '$lib/stores/advancedCartStore';
  import CartItem from '$lib/components/cart/CartItem.svelte';
  import SellerGroupSummary from '$lib/components/cart/SellerGroupSummary.svelte';
  import ShippingCalculator from '$lib/components/cart/ShippingCalculator.svelte';
  import ShippingModeSelector from '$lib/components/cart/ShippingModeSelector.svelte';
  import CouponSection from '$lib/components/cart/CouponSection.svelte';
  import EmptyCart from '$lib/components/cart/EmptyCart.svelte';
  import BenefitBadge from '$lib/components/cart/BenefitBadge.svelte';
  import CartNotifications from '$lib/components/cart/CartNotifications.svelte';
  import { goto } from '$app/navigation';
  
  const { 
    sellerGroups, 
    cartTotals, 
    zipCode, 
    shippingMode,
    appliedCoupon,
    updateQuantity,
    removeItem,
    calculateAllShipping,
    setShippingMode,
    applyCoupon,
    removeCoupon,
    clearCart
  } = advancedCartStore;
  
  // Verificar se tem frete grátis no carrinho todo
  const hasCartFreeShipping = $derived(
    $cartTotals.totalShipping === 0 && $sellerGroups.length > 0 && $zipCode
  );
  
  // Calcular economia total
  const totalSavings = $derived(() => {
    let savings = $cartTotals.totalDiscount;
    if (hasCartFreeShipping) {
      const estimatedShipping = $sellerGroups.reduce((sum, group) => {
        return sum + (group.groupedShipping?.price || 0);
      }, 0);
      savings += estimatedShipping;
    }
    return savings;
  });
  
  // Prazo máximo de entrega
  const maxDeliveryDays = $derived(() => {
    const days = $sellerGroups
      .map(group => {
        if ($shippingMode === 'grouped') {
          return group.groupedShipping?.estimatedDays || 0;
        } else {
          const maxInGroup = Math.max(
            ...group.items.map(item => item.individualShipping?.estimatedDays || 0)
          );
          return maxInGroup;
        }
      })
      .filter(d => d > 0);
    
    return days.length > 0 ? Math.max(...days) : undefined;
  });
  
  async function handleZipCodeChange(newZipCode: string) {
    if (newZipCode && newZipCode.length === 8) {
      await calculateAllShipping(newZipCode);
    }
  }
  
  async function handleApplyCoupon(code: string) {
    await applyCoupon(code);
  }
  
  function handleCheckout() {
    if ($sellerGroups.length === 0) return;
    if (!$zipCode) {
      alert('Por favor, informe seu CEP para continuar');
      return;
    }
    goto('/checkout');
  }
  
  function handleUpdateQuantity(productId: string, sellerId: string, quantity: number, options?: any) {
    updateQuantity(productId, sellerId, quantity, options);
  }
  
  function handleRemoveItem(productId: string, sellerId: string, options?: any) {
    removeItem(productId, sellerId, options);
  }
</script>

<svelte:head>
  <title>Carrinho de Compras - Marketplace GDG</title>
  <meta name="description" content="Revise seus produtos e finalize sua compra com segurança" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Breadcrumb -->
    <nav class="mb-8">
      <ol class="flex items-center space-x-2 text-sm">
        <li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
        <li><span class="text-gray-400">/</span></li>
        <li class="text-gray-900 font-medium">Carrinho</li>
      </ol>
    </nav>
    
    <!-- Cabeçalho do Carrinho -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Meu Carrinho</h1>
        {#if $sellerGroups.length > 0}
          <p class="text-sm text-gray-600 mt-1">
            {$sellerGroups.reduce((total, group) => total + group.items.length, 0)} {$sellerGroups.reduce((total, group) => total + group.items.length, 0) === 1 ? 'produto' : 'produtos'} de {$sellerGroups.length} {$sellerGroups.length === 1 ? 'vendedor' : 'vendedores'}
          </p>
        {/if}
      </div>
      
      {#if $sellerGroups.length > 0}
        <button 
          onclick={() => {
            if (confirm('Tem certeza que deseja remover todos os produtos do carrinho?')) {
              clearCart();
            }
          }}
          class="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 border border-red-200 hover:border-red-300"
          aria-label="Limpar carrinho"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="text-sm font-medium hidden sm:block">Limpar carrinho</span>
        </button>
      {/if}
    </div>
    
    {#if $sellerGroups.length === 0}
      <EmptyCart onContinueShopping={() => goto('/busca')} />
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Coluna Principal - Produtos e Frete -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Notificações e Avisos -->
          <CartNotifications 
            sellerGroups={$sellerGroups}
            zipCode={$zipCode}
            shippingMode={$shippingMode}
          />
          
          <!-- Calculadora de Frete -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold mb-4">Calcular frete e prazo</h2>
            <ShippingCalculator
              zipCode={$zipCode}
              onCalculate={handleZipCodeChange}
            />
            
            {#if $zipCode && $sellerGroups.some(g => g.shippingOptions.length > 0)}
              <div class="mt-6 pt-6 border-t">
                <ShippingModeSelector
                  shippingMode={$shippingMode}
                  onModeChange={setShippingMode}
                  sellerGroups={$sellerGroups}
                />
              </div>
            {/if}
          </div>
          
          <!-- Produtos por Vendedor -->
          {#each $sellerGroups as group (group.sellerId)}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <!-- Cabeçalho do Vendedor -->
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-900">
                  Vendido por {group.sellerName}
                </h3>
                <span class="text-sm text-gray-500">
                  {group.items.length} {group.items.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
              
              <!-- Lista de Produtos -->
              <div class="space-y-4 mb-6">
                {#each group.items as item (item.product.id + '-' + item.selectedColor + '-' + item.selectedSize)}
                  <CartItem
                    {item}
                    estimatedDays={$shippingMode === 'grouped' 
                      ? group.groupedShipping?.estimatedDays 
                      : item.individualShipping?.estimatedDays}
                    shippingMode={$shippingMode}
                    onUpdateQuantity={(qty) => handleUpdateQuantity(
                      item.product.id, 
                      item.sellerId, 
                      qty,
                      { color: item.selectedColor, size: item.selectedSize }
                    )}
                    onRemove={() => handleRemoveItem(
                      item.product.id, 
                      item.sellerId,
                      { color: item.selectedColor, size: item.selectedSize }
                    )}
                  />
                {/each}
              </div>
              
              <!-- Resumo do Seller -->
              <SellerGroupSummary 
                {group} 
                shippingMode={$shippingMode}
              />
            </div>
          {/each}
        </div>
        
        <!-- Coluna Lateral - Resumo do Pedido -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm p-6 sticky top-4">
            <h2 class="text-lg font-semibold mb-4">Resumo do pedido</h2>
            
            <!-- Badges de benefícios do carrinho -->
            {#if hasCartFreeShipping || ($appliedCoupon && $appliedCoupon.scope === 'cart')}
              <div class="flex flex-wrap gap-2 mb-4">
                {#if hasCartFreeShipping}
                  <BenefitBadge 
                    type="free-shipping" 
                    level="cart"
                    description="Frete grátis em toda compra"
                  />
                {/if}
                
                {#if $appliedCoupon && $appliedCoupon.scope === 'cart'}
                  <BenefitBadge 
                    type="coupon" 
                    level="cart"
                    value={$appliedCoupon.value}
                    description={$appliedCoupon.description}
                  />
                {/if}
              </div>
            {/if}
            
            <!-- Cupom de Desconto -->
            <div class="mb-6">
              <CouponSection
                appliedCoupon={$appliedCoupon}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={removeCoupon}
              />
            </div>
            
            <!-- Totais -->
            <div class="space-y-3 text-sm">
              <!-- Subtotal -->
              <div class="flex justify-between">
                <span class="text-gray-600">Subtotal dos produtos</span>
                <span class="font-medium">R$ {$cartTotals.cartSubtotal.toFixed(2)}</span>
              </div>
              
              <!-- Frete -->
              {#if $zipCode && $sellerGroups.length > 0}
                <div class="flex justify-between">
                  <span class="text-gray-600">
                    Frete total
                    <span class="text-xs text-[#00A89D]">
                      ({$shippingMode === 'express' ? 'Expressa' : 'Agrupada'})
                    </span>
                  </span>
                  <span class="font-medium {hasCartFreeShipping ? 'text-[#00BFB3]' : ''}">
                    {hasCartFreeShipping ? 'Grátis' : `R$ ${$cartTotals.totalShipping.toFixed(2)}`}
                  </span>
                </div>
              {/if}
              
              <!-- Descontos -->
              {#if $cartTotals.totalDiscount > 0}
                <div class="flex justify-between text-[#00BFB3]">
                  <span>Descontos totais</span>
                  <span>-R$ {$cartTotals.totalDiscount.toFixed(2)}</span>
                </div>
              {/if}
              
              <!-- Prazo máximo -->
              {#if $zipCode && maxDeliveryDays()}
                <div class="flex justify-between text-xs text-gray-500">
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Prazo máximo
                  </span>
                  <span>{maxDeliveryDays()} dias úteis</span>
                </div>
              {/if}
              
              <!-- Total Final -->
              <div class="pt-3 border-t">
                <div class="flex justify-between text-lg font-semibold">
                  <span>Total geral</span>
                  <span class="text-[#00BFB3]">R$ {$cartTotals.cartTotal.toFixed(2)}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  ou até 12x de R$ {$cartTotals.installmentValue.toFixed(2)}
                </p>
                
                <!-- Economia Total -->
                {#if totalSavings() > 0}
                  <div class="mt-3 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg p-3">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-[#00BFB3] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="text-sm">
                        <p class="font-semibold text-[#00A89D]">
                          Você está economizando!
                        </p>
                        <p class="text-[#00BFB3]">
                          R$ {totalSavings().toFixed(2)} no total
                        </p>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
            
            <!-- Botão de Checkout -->
            <button
              onclick={handleCheckout}
              disabled={!$zipCode || $sellerGroups.length === 0}
              class="w-full mt-6 bg-[#00BFB3] text-white py-3 px-4 rounded-lg font-semibold
                     hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 
                     disabled:cursor-not-allowed"
            >
              Continuar para pagamento
            </button>
            
            <!-- Link para continuar comprando -->
            <a 
              href="/busca" 
              class="block text-center text-sm text-[#00BFB3] hover:text-[#00A89D] mt-4"
            >
              Continuar comprando
            </a>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div> 