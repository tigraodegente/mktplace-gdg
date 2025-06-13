<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface PaymentMethod {
    id: string;
    type: 'pix' | 'credit_card' | 'debit_card' | 'boleto';
    name: string;
    description?: string;
    icon?: string;
    discount?: number;
    isRecommended?: boolean;
    isActive: boolean;
  }

  interface Props {
    methods: PaymentMethod[];
    selectedMethod?: string;
    cartTotal: number;
  }

  let {
    methods = [],
    selectedMethod = '',
    cartTotal = 0
  }: Props = $props();

  const dispatch = createEventDispatcher<{
    select: { method: PaymentMethod };
  }>();

  function handleSelect(method: PaymentMethod) {
    if (!method.isActive) return;
    dispatch('select', { method });
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function calculateFinalPrice(method: PaymentMethod): number {
    if (!method.discount) return cartTotal;
    return cartTotal * (1 - method.discount / 100);
  }

  function getMethodIcon(type: string): string {
    const icons: Record<string, string> = {
      pix: '💰',
      credit_card: '💳',
      debit_card: '💳',
      boleto: '📄'
    };
    return icons[type] || '💳';
  }
</script>

<div class="space-y-4">
  <h3 class="text-lg font-semibold text-gray-900">Método de Pagamento</h3>
  
  <div class="space-y-3">
    {#each methods.filter(m => m.isActive) as method (method.id)}
      <div class="relative">
        <label class="flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 {
          selectedMethod === method.id 
            ? 'border-[#00BFB3] bg-[#00BFB3]/5 ring-1 ring-[#00BFB3]/20' 
            : 'border-gray-200'
        }">
          <input
            type="radio"
            name="paymentMethod"
            value={method.id}
            checked={selectedMethod === method.id}
            onchange={() => handleSelect(method)}
            class="mt-1 text-[#00BFB3] focus:ring-[#00BFB3] focus:ring-offset-0"
          />
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <span class="text-xl">{method.icon || getMethodIcon(method.type)}</span>
              <span class="font-medium text-gray-900">{method.name}</span>
              
              {#if method.isRecommended}
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Recomendado
                </span>
              {/if}
              
              {#if method.discount && method.discount > 0}
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00BFB3] text-white">
                  -{method.discount}%
                </span>
              {/if}
            </div>
            
            {#if method.description}
              <p class="text-sm text-gray-600 mt-1">{method.description}</p>
            {/if}
            
            <!-- Pricing info -->
            <div class="mt-2 space-y-1">
              {#if method.discount && method.discount > 0}
                <div class="text-sm">
                  <span class="text-gray-500 line-through">{formatCurrency(cartTotal)}</span>
                  <span class="text-[#00BFB3] font-semibold ml-2">{formatCurrency(calculateFinalPrice(method))}</span>
                </div>
                <p class="text-xs text-[#00BFB3]">
                  Economia de {formatCurrency(cartTotal - calculateFinalPrice(method))}
                </p>
              {:else}
                <div class="text-sm font-medium text-gray-900">
                  {formatCurrency(cartTotal)}
                </div>
              {/if}
              
              <!-- Method-specific info -->
              {#if method.type === 'pix'}
                <p class="text-xs text-gray-500">Aprovação instantânea</p>
              {:else if method.type === 'boleto'}
                <p class="text-xs text-gray-500">Vencimento em 3 dias úteis</p>
              {:else if method.type === 'credit_card'}
                <p class="text-xs text-gray-500">Parcelamento disponível</p>
              {/if}
            </div>
          </div>
        </label>
      </div>
    {/each}
  </div>
  
  <!-- Security notice -->
  <div class="bg-gray-50 rounded-lg p-4 mt-6">
    <div class="flex items-center space-x-2 text-gray-600">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span class="text-sm">Pagamento 100% seguro e criptografado</span>
    </div>
  </div>
</div> 