<script lang="ts">
  import { formatCurrency } from '@mktplace/utils';
  import type { SellerGroup } from '$lib/types/cart';
  import BenefitBadge from './BenefitBadge.svelte';
  import { fade } from 'svelte/transition';
  
  interface SellerGroupSummaryProps {
    group: SellerGroup;
    shippingMode: 'express' | 'grouped';
  }
  
  let { group, shippingMode }: SellerGroupSummaryProps = $props();
  
  // Calcular se o seller tem frete grátis
  const hasFreeShipping = $derived(
    group.shippingCost === 0 && group.items.length > 0
  );
  
  // Calcular economia total do seller
  const totalSavings = $derived(() => {
    let savings = group.discount;
    
    // Adicionar economia de frete grátis se aplicável
    if (hasFreeShipping && shippingMode === 'grouped' && group.groupedShipping) {
      // Assumir que o frete normal seria o valor calculado
      savings += group.groupedShipping.price || 0;
    }
    
    return savings;
  });
  
  // Prazo de entrega do seller
  const deliveryDays = $derived(() => {
    if (shippingMode === 'grouped') {
      return group.groupedShipping?.estimatedDays;
    } else {
      // No modo express, pegar o maior prazo entre os produtos
      const days = group.items
        .map(item => item.individualShipping?.estimatedDays || 0)
        .filter(d => d > 0);
      return days.length > 0 ? Math.max(...days) : undefined;
    }
  });
  
  // Calcular subtotal do vendedor (produtos - descontos + frete)
  const sellerSubtotal = $derived(() => {
    return group.subtotal - group.discount + group.shippingCost;
  });
</script>

<div class="bg-gray-50 rounded-lg p-4 mt-4 space-y-3" transition:fade={{ duration: 200 }}>
  <!-- Badges do Seller -->
  {#if hasFreeShipping || group.appliedCoupon}
    <div class="flex flex-wrap gap-2 mb-3">
      {#if hasFreeShipping}
        <BenefitBadge 
          type="free-shipping" 
          level="seller"
          description="Frete grátis neste vendedor"
        />
      {/if}
      
      {#if group.appliedCoupon}
        <BenefitBadge 
          type="coupon" 
          level="seller"
          value={group.appliedCoupon.value}
          description={group.appliedCoupon.description}
        />
      {/if}
    </div>
  {/if}
  
  <!-- Informação de Entrega -->
  <div class="flex items-center justify-between text-sm">
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      <span class="text-gray-700">
        {#if shippingMode === 'express'}
          <span class="font-medium">Entrega Expressa</span>
          <span class="text-gray-500">• {group.items.length} {group.items.length === 1 ? 'item' : 'itens'} em entregas separadas</span>
        {:else}
          <span class="font-medium">Entrega Agrupada</span>
          <span class="text-gray-500">• {group.items.length} {group.items.length === 1 ? 'item' : 'itens'} em 1 entrega</span>
        {/if}
      </span>
    </div>
    <div class="text-right">
      <div class="font-medium {hasFreeShipping ? 'text-[#00BFB3]' : 'text-gray-900'}">
        {#if hasFreeShipping}
          Grátis
        {:else}
          {formatCurrency(group.shippingCost)}
        {/if}
      </div>
      {#if deliveryDays()}
        <div class="text-xs text-gray-500">{deliveryDays()}d úteis</div>
      {/if}
    </div>
  </div>
  
  <!-- Detalhamento do frete express se aplicável -->
  {#if shippingMode === 'express' && !hasFreeShipping && group.items.some(item => item.individualShipping)}
    <div class="pl-6 space-y-1 text-xs text-gray-500">
      {#each group.items as item}
        {#if item.individualShipping}
          <div class="flex justify-between">
            <span class="truncate flex-1 mr-2">• {item.product.name}</span>
            <span>R$ {item.individualShipping.price.toFixed(2)}</span>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
  
  <!-- Desconto do seller se houver -->
  {#if group.discount > 0}
    <div class="flex justify-between text-sm text-[#00BFB3]">
      <span>Desconto aplicado</span>
      <span>-{formatCurrency(group.discount)}</span>
    </div>
  {/if}
  
  <!-- Subtotal do vendedor -->
  <div class="pt-3 border-t border-gray-200 space-y-2">
    <!-- Subtotal dos produtos -->
    <div class="flex justify-between text-sm">
      <span class="text-gray-600">Subtotal dos produtos</span>
      <span class="text-gray-900">{formatCurrency(group.subtotal)}</span>
    </div>
    
    <!-- Frete -->
    <div class="flex justify-between text-sm">
      <span class="text-gray-600">Frete</span>
      <span class="{hasFreeShipping ? 'text-[#00BFB3]' : 'text-gray-900'}">
        {#if hasFreeShipping}
          Grátis
        {:else}
          {formatCurrency(group.shippingCost)}
        {/if}
      </span>
    </div>
    
    <!-- Desconto se houver -->
    {#if group.discount > 0}
      <div class="flex justify-between text-sm text-[#00BFB3]">
        <span>Desconto</span>
        <span>-{formatCurrency(group.discount)}</span>
      </div>
    {/if}
    
    <!-- Total do vendedor -->
    <div class="flex justify-between pt-2 border-t">
      <span class="font-semibold">Total do vendedor</span>
      <span class="font-semibold text-lg text-[#00BFB3]">{formatCurrency(group.total)}</span>
    </div>
    
    {#if totalSavings() > 0}
      <div class="text-xs text-[#00BFB3] text-right">
        Você economizou {formatCurrency(totalSavings())} neste vendedor
      </div>
    {/if}
  </div>
</div> 