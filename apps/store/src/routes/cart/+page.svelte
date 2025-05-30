<script lang="ts">
  import { advancedCartStore } from '$lib/stores/advancedCartStore';
  import CartItem from '$lib/components/cart/CartItem.svelte';
  import SellerGroupSummary from '$lib/components/cart/SellerGroupSummary.svelte';
  import SellerShippingOptions from '$lib/components/cart/SellerShippingOptions.svelte';
  import ShippingCalculator from '$lib/components/cart/ShippingCalculator.svelte';
  import CouponSection from '$lib/components/cart/CouponSection.svelte';
  import EmptyCart from '$lib/components/cart/EmptyCart.svelte';
  import BenefitBadge from '$lib/components/cart/BenefitBadge.svelte';
  import CartNotifications from '$lib/components/cart/CartNotifications.svelte';
  import { ShippingCartService, type SellerShippingQuote } from '$lib/services/shippingCartService';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  
  const { 
    sellerGroups, 
    cartTotals, 
    appliedCoupon,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    clearCart
  } = advancedCartStore;
  
  // Estado local para CEP
  const zipCode = writable<string>('');
  
  // Estado para o sistema real de frete
  let realShippingQuotes = $state<SellerShippingQuote[]>([]);
  let calculatingRealShipping = $state(false);
  let realShippingError = $state('');
  let selectedShippingOptions = $state<Record<string, string>>({});
  
  // Verificar se tem frete grátis no carrinho todo
  const hasCartFreeShipping = $derived(
    realShippingQuotes.length > 0 && 
    realShippingQuotes.every(quote => 
      quote.shippingResult.success && 
      quote.shippingResult.options.some(opt => opt.price === 0)
    )
  );
  
  // Calcular totais reais baseados no sistema novo (VERSÃO UNIFICADA)
  const realCartTotals = $derived(() => {
    const cartSubtotal = $cartTotals.cartSubtotal;
    
    // Calcular frete total baseado nas opções selecionadas
    const shippingCalculation = ShippingCartService.calculateCartShippingTotal(
      realShippingQuotes,
      selectedShippingOptions
    );
    
    let totalShipping = shippingCalculation.totalShipping;
    let freeShippingSavings = 0;
    
    // 🚚 APLICAR CUPOM DE FRETE GRÁTIS (com valor real)
    if ($appliedCoupon && $appliedCoupon.type === 'free_shipping') {
      freeShippingSavings = totalShipping; // Economia real = frete que seria cobrado
      totalShipping = 0; // Zerar frete real quando há cupom de frete grátis
      console.log(`🎫 CUPOM FRETE GRÁTIS - Economia real: R$ ${freeShippingSavings.toFixed(2)}`);
    }
    
    // Somar todos os descontos (produtos + cupom normal + frete grátis)
    const productDiscounts = $cartTotals.totalDiscount - $cartTotals.couponDiscount; // Descontos de produtos apenas
    const couponDiscount = $appliedCoupon && $appliedCoupon.type !== 'free_shipping' 
      ? $cartTotals.couponDiscount 
      : 0;
    const totalDiscount = productDiscounts + couponDiscount + freeShippingSavings;
    
    const cartTotal = cartSubtotal - productDiscounts - couponDiscount + totalShipping;
    
    return {
      cartSubtotal,
      totalShipping,
      totalDiscount,
      productDiscounts,
      couponDiscount,
      freeShippingSavings,
      cartTotal,
      installmentValue: cartTotal / 12,
      maxDeliveryDays: shippingCalculation.maxDeliveryDays,
      hasExpressOptions: shippingCalculation.hasExpressOptions,
      hasGroupedOptions: shippingCalculation.hasGroupedOptions
    };
  });
  
  // Calcular economia total (SIMPLIFICADO)
  const totalSavings = $derived(() => {
    return realCartTotals().totalDiscount;
  });
  
  // Função para calcular frete real
  async function handleRealShippingCalculate(newZipCode: string, quotes: SellerShippingQuote[]) {
    calculatingRealShipping = true;
    realShippingError = '';
    
    try {
      if (quotes.length > 0) {
        // Usar as cotações já calculadas pelo ShippingCalculator
        realShippingQuotes = quotes;
        
        // Auto-selecionar a opção mais barata para cada seller
        const newSelectedOptions: Record<string, string> = {};
        quotes.forEach(quote => {
          if (quote.shippingResult.success && quote.shippingResult.options.length > 0) {
            const cheapest = ShippingCartService.getCheapestOption(quote.shippingResult.options);
            if (cheapest) {
              newSelectedOptions[quote.sellerId] = cheapest.id;
            }
          }
        });
        selectedShippingOptions = newSelectedOptions;
      } else {
        // Calcular manualmente se não foram fornecidas
        const cartItems = $sellerGroups.flatMap(group => group.items);
        const calculatedQuotes = await ShippingCartService.calculateShippingForCart(
          newZipCode,
          cartItems
        );
        realShippingQuotes = calculatedQuotes;
        
        // Auto-selecionar opções mais baratas
        const newSelectedOptions: Record<string, string> = {};
        calculatedQuotes.forEach(quote => {
          if (quote.shippingResult.success && quote.shippingResult.options.length > 0) {
            const cheapest = ShippingCartService.getCheapestOption(quote.shippingResult.options);
            if (cheapest) {
              newSelectedOptions[quote.sellerId] = cheapest.id;
            }
          }
        });
        selectedShippingOptions = newSelectedOptions;
      }
      
      // Atualizar store do CEP
      zipCode.set(newZipCode);
      
    } catch (error) {
      console.error('Erro ao calcular frete real:', error);
      realShippingError = 'Erro ao calcular frete. Tente novamente.';
    } finally {
      calculatingRealShipping = false;
    }
  }
  
  // Função para selecionar opção de frete
  function selectShippingOption(sellerId: string, optionId: string) {
    selectedShippingOptions = {
      ...selectedShippingOptions,
      [sellerId]: optionId
    };
  }
  
  // 🔄 RECÁLCULO AUTOMÁTICO quando muda seleção de frete com cupom ativo
  $effect(() => {
    if ($appliedCoupon && $appliedCoupon.type === 'free_shipping' && realShippingQuotes.length > 0) {
      const shippingCost = ShippingCartService.calculateCartShippingTotal(
        realShippingQuotes,
        selectedShippingOptions
      ).totalShipping;
      
      console.log(`🔄 RECÁLCULO AUTO - Novo frete: R$ ${shippingCost.toFixed(2)}, Cupom: ${$appliedCoupon.code}`);
    }
  });

  async function handleApplyCoupon(code: string) {
    await applyCoupon(code);
  }
  
  function handleCheckout() {
    if ($sellerGroups.length === 0) return;
    if (!$zipCode) {
      alert('Por favor, informe seu CEP para continuar');
      return;
    }
    
    // Verificar se todas as opções de frete foram selecionadas
    const missingShipping = realShippingQuotes.some(quote => 
      quote.shippingResult.success && !selectedShippingOptions[quote.sellerId]
    );
    
    if (missingShipping) {
      alert('Por favor, selecione uma opção de frete para todos os vendedores');
      return;
    }
    
    goto('/checkout');
  }
  
  function handleUpdateQuantity(productId: string, sellerId: string, quantity: number, options?: any) {
    updateQuantity(productId, sellerId, quantity, options);
    
    // Recalcular frete se já foi calculado
    if ($zipCode && realShippingQuotes.length > 0) {
      handleRealShippingCalculate($zipCode, []);
    }
  }
  
  function handleRemoveItem(productId: string, sellerId: string, options?: any) {
    removeItem(productId, sellerId, options);
    
    // Recalcular frete se já foi calculado
    if ($zipCode && realShippingQuotes.length > 0) {
      handleRealShippingCalculate($zipCode, []);
    }
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
          />
          
          <!-- Calculadora de Frete -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold mb-4">Calcular frete e prazo</h2>
            <ShippingCalculator
              zipCode={$zipCode}
              cartItems={$sellerGroups.flatMap(group => group.items)}
              onCalculate={handleRealShippingCalculate}
            />
            
            <!-- Mostrar erro se houver -->
            {#if realShippingError}
              <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-600">{realShippingError}</p>
              </div>
            {/if}
          </div>
          
          <!-- Produtos por Vendedor com Opções de Frete -->
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
                    selectedShippingOption={(() => {
                      const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                      const selectedOptionId = selectedShippingOptions[group.sellerId];
                      if (sellerQuote && selectedOptionId) {
                        const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                        return option ? {
                          name: option.name,
                          price: option.price,
                          delivery_days: option.delivery_days,
                          modality_name: option.modality_name
                        } : null;
                      }
                      return null;
                    })()}
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

              <!-- Opções de Frete do Vendedor -->
              {#if realShippingQuotes.length > 0}
                {@const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId)}
                {#if sellerQuote}
                  <SellerShippingOptions
                    {sellerQuote}
                    selectedOptionId={selectedShippingOptions[group.sellerId]}
                    onSelectOption={(optionId) => selectShippingOption(group.sellerId, optionId)}
                  />
                {/if}
              {/if}
              
              <!-- Resumo do Seller -->
              <SellerGroupSummary 
                {group} 
                selectedShippingPrice={(() => {
                  const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                  const selectedOptionId = selectedShippingOptions[group.sellerId];
                  if (sellerQuote && selectedOptionId) {
                    const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                    return option?.price || 0;
                  }
                  return 0;
                })()}
                selectedShippingName={(() => {
                  const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                  const selectedOptionId = selectedShippingOptions[group.sellerId];
                  if (sellerQuote && selectedOptionId) {
                    const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                    return option?.name;
                  }
                  return undefined;
                })()}
                selectedShippingDays={(() => {
                  const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                  const selectedOptionId = selectedShippingOptions[group.sellerId];
                  if (sellerQuote && selectedOptionId) {
                    const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                    return option?.delivery_days;
                  }
                  return undefined;
                })()}
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
                hasShippingCalculated={$zipCode !== '' && realShippingQuotes.length > 0}
                shippingCost={realShippingQuotes.length > 0 ? ShippingCartService.calculateCartShippingTotal(realShippingQuotes, selectedShippingOptions).totalShipping : 0}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={removeCoupon}
              />
            </div>
            
            <!-- Totais -->
            <div class="space-y-3 text-sm">
              <!-- Subtotal -->
              <div class="flex justify-between">
                <span class="text-gray-600">Subtotal dos produtos</span>
                <span class="font-medium">R$ {realCartTotals().cartSubtotal.toFixed(2)}</span>
              </div>
              
              <!-- Frete -->
              {#if $zipCode && realShippingQuotes.length > 0}
                <div class="flex justify-between">
                  <span class="text-gray-600">Frete total</span>
                  <span class="font-medium {realCartTotals().totalShipping === 0 ? 'text-[#00BFB3]' : ''}">
                    {realCartTotals().totalShipping === 0 ? 'Grátis' : `R$ ${realCartTotals().totalShipping.toFixed(2)}`}
                  </span>
                </div>
              {:else if $zipCode && calculatingRealShipping}
                <div class="flex justify-between">
                  <span class="text-gray-600">Frete total</span>
                  <span class="font-medium text-gray-400">Calculando...</span>
                </div>
              {/if}
              
              <!-- Descontos (UNIFICADO) -->
              {#if realCartTotals().totalDiscount > 0}
                <div class="space-y-1">
                  {#if realCartTotals().productDiscounts > 0}
                    <div class="flex justify-between text-[#00BFB3] text-xs">
                      <span>Descontos de produtos</span>
                      <span>-R$ {realCartTotals().productDiscounts.toFixed(2)}</span>
                    </div>
                  {/if}
                  
                  {#if realCartTotals().couponDiscount > 0}
                    <div class="flex justify-between text-[#00BFB3] text-xs">
                      <span>Cupom de desconto</span>
                      <span>-R$ {realCartTotals().couponDiscount.toFixed(2)}</span>
                    </div>
                  {/if}
                  
                  {#if realCartTotals().freeShippingSavings > 0}
                    <div class="flex justify-between text-[#00BFB3] text-xs">
                      <span>Frete grátis (cupom)</span>
                      <span>-R$ {realCartTotals().freeShippingSavings.toFixed(2)}</span>
                    </div>
                  {/if}
                  
                  <div class="flex justify-between text-[#00BFB3] font-medium pt-1 border-t border-[#00BFB3]/20">
                    <span>Total de descontos</span>
                    <span>-R$ {realCartTotals().totalDiscount.toFixed(2)}</span>
                  </div>
                </div>
              {/if}
              
              <!-- Prazo máximo -->
              {#if $zipCode && realCartTotals().maxDeliveryDays > 0}
                <div class="flex justify-between text-xs text-gray-500">
                  <span class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                    </svg>
                    Prazo máximo
                  </span>
                  <span>{realCartTotals().maxDeliveryDays} dias úteis</span>
                </div>
              {/if}
              
              <!-- Total Final -->
              <div class="pt-3 border-t">
                <div class="flex justify-between text-lg font-semibold">
                  <span>Total geral</span>
                  <span class="text-[#00BFB3]">R$ {realCartTotals().cartTotal.toFixed(2)}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  ou até 12x de R$ {realCartTotals().installmentValue.toFixed(2)}
                </p>
                
                <!-- Economia Total -->
                {#if realCartTotals().totalDiscount > 0}
                  <div class="mt-3 bg-[#00BFB3]/10 border border-[#00BFB3]/30 rounded-lg p-3">
                    <div class="flex items-center gap-2">
                      <svg class="w-5 h-5 text-[#00BFB3] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div class="text-sm">
                        <p class="font-semibold text-[#00A89D]">
                          Você está economizando!
                        </p>
                        <div class="text-[#00BFB3] space-y-0.5">
                          <p class="font-bold">
                            R$ {realCartTotals().totalDiscount.toFixed(2)} no total
                          </p>
                          {#if realCartTotals().freeShippingSavings > 0}
                            <p class="text-xs">
                              Incluindo R$ {realCartTotals().freeShippingSavings.toFixed(2)} de frete grátis
                            </p>
                          {/if}
                        </div>
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