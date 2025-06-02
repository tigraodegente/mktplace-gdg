<script lang="ts">
  import type { UnifiedShippingQuote } from '$lib/services/unifiedShippingService';
  
  interface SellerShippingOptionsProps {
    sellerQuote: UnifiedShippingQuote;
    selectedOptionId: string | undefined;
    onSelectOption: (optionId: string) => void;
  }
  
  let { sellerQuote, selectedOptionId, onSelectOption }: SellerShippingOptionsProps = $props();
</script>

<div class="border-t pt-4 mb-4">
  <h4 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
    <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
    Opções de entrega
    <span class="text-sm text-gray-500 font-normal">
      • {sellerQuote.items.length} {sellerQuote.items.length === 1 ? 'item' : 'itens'} • 
      {(sellerQuote.totalWeight/1000).toFixed(1)}kg
    </span>
  </h4>

  {#if sellerQuote.success && sellerQuote.options.length > 0}
    <div class="space-y-3">
      {#each sellerQuote.options as option}
        <label class="flex items-center justify-between p-3 border border-gray-200 rounded-lg
                     hover:border-[#00BFB3] transition-colors cursor-pointer
                     {selectedOptionId === option.id ? 'border-[#00BFB3] bg-[#00BFB3]/5' : ''}">
          <div class="flex items-center gap-3">
            <input
              type="radio"
              name="shipping-{sellerQuote.sellerId}"
              value={option.id}
              checked={selectedOptionId === option.id}
              onchange={() => onSelectOption(option.id)}
              class="w-4 h-4 text-[#00BFB3] border-gray-300 focus:ring-[#00BFB3]"
            />
            
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-gray-900">{option.name}</span>
                
                <!-- Badge da modalidade -->
                <span class="px-2 py-0.5 text-xs font-medium rounded-full
                            {option.modalityId === 'expressa' 
                              ? 'bg-orange-100 text-orange-800' 
                              : 'bg-blue-100 text-blue-800'}">
                  {option.modalityName}
                </span>
                
                <!-- Badge de frete grátis -->
                {#if option.price === 0}
                  <span class="px-2 py-0.5 text-xs font-medium rounded-full 
                               bg-green-100 text-green-800">
                    Grátis
                  </span>
                {/if}
              </div>
              
              <p class="text-sm text-gray-600">
                {option.description} • {option.carrier}
              </p>
              
              {#if option.pricingType === 'per_item'}
                <p class="text-xs text-gray-500 mt-1">
                  💡 Cobrança por item (entrega mais rápida)
                </p>
              {/if}
            </div>
          </div>
          
          <div class="text-right">
            <div class="font-semibold text-gray-900">
              {option.price === 0 ? 'Grátis' : `R$ ${option.price.toFixed(2)}`}
            </div>
            <div class="text-sm text-gray-500">
              {option.deliveryDays === 0 ? 'Hoje' : 
               option.deliveryDays === 1 ? 'Amanhã' : 
               `${option.deliveryDays} dias úteis`}
            </div>
          </div>
        </label>
      {/each}
    </div>
  {:else if sellerQuote.error}
    <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-600">
        Erro: {sellerQuote.error}
      </p>
    </div>
  {:else}
    <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <p class="text-sm text-gray-600">
        Nenhuma opção de frete disponível
      </p>
    </div>
  {/if}
</div> 