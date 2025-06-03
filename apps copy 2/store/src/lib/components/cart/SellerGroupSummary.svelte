<script lang="ts">
  import { formatCurrency } from '$lib/utils';
  import type { SellerGroup } from '$lib/types/cart';
  import BenefitBadge from './BenefitBadge.svelte';
  import { fade } from 'svelte/transition';
  
  interface SellerGroupSummaryProps {
    group: SellerGroup;
    shippingMode?: 'express' | 'grouped';
    selectedShippingPrice?: number;
    selectedShippingName?: string;
    selectedShippingDays?: number;
  }
  
  let { 
    group, 
    shippingMode, 
    selectedShippingPrice = 0,
    selectedShippingName,
    selectedShippingDays 
  }: SellerGroupSummaryProps = $props();
  
  // Calcular economia total do seller (apenas descontos de produtos)
  const totalSavings = $derived(() => {
    return group.discount;
  });

  // Total final do vendedor incluindo frete
  const sellerTotal = $derived(() => {
    return group.subtotal - group.discount + selectedShippingPrice;
  });
</script>

<div class="bg-gray-50 rounded-lg p-4 mt-4 space-y-3" transition:fade={{ duration: 200 }}>
  <!-- Badges do Seller -->
  {#if group.appliedCoupon}
    <div class="flex flex-wrap gap-2 mb-3">
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
  <div class="flex items-center gap-2 text-sm">
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
  
  <!-- Subtotal do vendedor -->
  <div class="pt-3 border-t border-gray-200 space-y-2">
    <!-- Subtotal dos produtos -->
    <div class="flex justify-between text-sm">
      <span class="text-gray-600">Subtotal dos produtos</span>
      <span class="text-gray-900">{formatCurrency(group.subtotal)}</span>
    </div>
    
    <!-- Desconto se houver -->
    {#if group.discount > 0}
      <div class="flex justify-between text-sm text-[#00BFB3]">
        <span>Desconto</span>
        <span>-{formatCurrency(group.discount)}</span>
      </div>
    {/if}
    
    <!-- Frete selecionado -->
    {#if selectedShippingName}
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">
          Frete - {selectedShippingName}
          {#if selectedShippingDays}
            <span class="text-xs text-gray-500">
              ({selectedShippingDays === 0 ? 'Hoje' : selectedShippingDays === 1 ? 'Amanhã' : `${selectedShippingDays} dias`})
            </span>
          {/if}
        </span>
        <span class="{selectedShippingPrice === 0 ? 'text-[#00BFB3]' : 'text-gray-900'}">
          {selectedShippingPrice === 0 ? 'Grátis' : formatCurrency(selectedShippingPrice)}
        </span>
      </div>
    {/if}
    
    <!-- Total dos produtos do vendedor -->
    <div class="flex justify-between pt-2 border-t">
      <span class="font-medium">Total do vendedor</span>
      <span class="font-medium text-lg text-[#00BFB3]">{formatCurrency(sellerTotal())}</span>
    </div>
    
    {#if totalSavings() > 0}
      <div class="text-xs text-[#00BFB3] text-right">
        Você economizou {formatCurrency(totalSavings())} neste vendedor
      </div>
    {/if}
  </div>
</div> 