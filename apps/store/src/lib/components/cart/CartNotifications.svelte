<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import type { SellerGroup } from '$lib/types/cart';
  
  interface CartNotificationsProps {
    sellerGroups: SellerGroup[];
    zipCode: string;
    shippingMode: 'express' | 'grouped';
  }
  
  let { sellerGroups, zipCode, shippingMode }: CartNotificationsProps = $props();
  
  // Verificar produtos com estoque baixo
  const lowStockItems = $derived(
    sellerGroups.flatMap(group => 
      group.items.filter(item => 
        item.product.stock !== undefined && 
        item.product.stock > 0 && 
        item.product.stock <= 5
      )
    )
  );
  
  // Verificar se há promoções ativas
  const hasActivePromotions = $derived(
    sellerGroups.some(group => 
      group.appliedCoupon || 
      group.hasFreeShipping || 
      group.items.some(item => item.appliedCoupon || item.benefits?.freeShipping)
    )
  );
  
  // Mensagens baseadas no contexto
  const contextMessages = $derived(() => {
    const messages: Array<{
      type: 'warning' | 'alert' | 'info' | 'success';
      icon: 'location' | 'alert' | 'lightning' | 'check';
      text: string;
    }> = [];
    
    // Lembrete de CEP
    if (!zipCode && sellerGroups.length > 0) {
      messages.push({
        type: 'warning',
        icon: 'location',
        text: 'Informe seu CEP para calcular o frete e prazo de entrega'
      });
    }
    
    // Estoque baixo
    if (lowStockItems.length > 0) {
      messages.push({
        type: 'alert',
        icon: 'alert',
        text: `${lowStockItems.length} ${lowStockItems.length === 1 ? 'produto com estoque limitado' : 'produtos com estoque limitado'}`
      });
    }
    
    // Modo de entrega
    if (zipCode && shippingMode === 'express') {
      messages.push({
        type: 'info',
        icon: 'lightning',
        text: 'Entrega expressa selecionada - receba seus produtos mais rápido!'
      });
    }
    
    // Promoções ativas
    if (hasActivePromotions) {
      messages.push({
        type: 'success',
        icon: 'check',
        text: 'Você tem benefícios aplicados nesta compra'
      });
    }
    
    return messages;
  });
  
  const iconMap = {
    location: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>`,
    alert: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`,
    lightning: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>`,
    check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`
  };
  
  const typeStyles = {
    warning: 'bg-gray-50 border-gray-200 text-gray-800',
    alert: 'bg-[#00BFB3]/5 border-[#00BFB3]/20 text-[#00A89D]',
    info: 'bg-[#00BFB3]/5 border-[#00BFB3]/20 text-[#00A89D]',
    success: 'bg-[#00BFB3]/10 border-[#00BFB3]/30 text-[#00A89D]'
  };
</script>

{#if contextMessages().length > 0}
  <div class="space-y-2 mb-6" transition:slide={{ duration: 300 }}>
    {#each contextMessages() as message}
      <div 
        class="flex items-center gap-3 p-3 rounded-lg border {typeStyles[message.type]}"
        transition:fade={{ duration: 200 }}
      >
        <div class="flex-shrink-0">
          {@html iconMap[message.icon]}
        </div>
        <p class="text-sm font-medium flex-1">{message.text}</p>
      </div>
    {/each}
  </div>
{/if}

<!-- Banner promocional se aplicável -->
{#if sellerGroups.length >= 3}
  <div 
    class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white p-4 rounded-lg mb-6"
    transition:fade={{ duration: 300 }}
  >
    <div class="flex items-center gap-3">
      <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
      <div>
        <p class="font-semibold">Compra com múltiplos vendedores!</p>
        <p class="text-sm opacity-90">
          Aproveite para economizar no frete agrupando suas entregas
        </p>
      </div>
    </div>
  </div>
{/if} 