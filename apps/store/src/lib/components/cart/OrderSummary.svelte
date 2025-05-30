<script lang="ts">
  interface CartItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image?: string;
  }
  
  interface OrderTotals {
    cartSubtotal: number;
    totalShipping: number;
    totalDiscount: number;
    productDiscounts?: number;
    couponDiscount?: number;
    freeShippingSavings?: number;
    cartTotal: number;
    installmentValue: number;
    maxDeliveryDays?: number;
  }
  
  interface AppliedCoupon {
    code: string;
    type: string;
    value: number;
    description: string;
  }

  // Props
  export let cartItems: CartItem[] = [];
  export let totals: OrderTotals;
  export let appliedCoupon: AppliedCoupon | null = null;
  export let showItems = true;
  export let showActions = true;
  export let isLoading = false;
  export let onCheckout: (() => void) | null = null;
  export let onContinueShopping: (() => void) | null = null;
  export let checkoutButtonText = "Finalizar Compra";
  export let checkoutButtonDisabled = false;
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
</script>

<div class="bg-white rounded-lg shadow-sm p-6 sticky top-4">
  <h2 class="text-lg font-semibold mb-4">Resumo do pedido</h2>
  
  <!-- Lista de Produtos (se solicitado) -->
  {#if showItems && cartItems.length > 0}
    <div class="mb-6">
      <h4 class="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Produtos</h4>
      <div class="space-y-3 max-h-48 overflow-y-auto">
        {#each cartItems as item}
          <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <img 
              src={item.image || '/placeholder.jpg'} 
              alt={item.productName}
              class="w-12 h-12 object-cover rounded border border-gray-200"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
              <p class="text-xs text-gray-500">Quantidade: {item.quantity}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Totais -->
  <div class="space-y-3 text-sm">
    <!-- Subtotal -->
    <div class="flex justify-between">
      <span class="text-gray-600">Subtotal dos produtos</span>
      <span class="font-medium">{formatCurrency(totals.cartSubtotal)}</span>
    </div>
    
    <!-- Frete -->
    {#if totals.totalShipping !== undefined}
      <div class="flex justify-between">
        <span class="text-gray-600">Frete total</span>
        <span class="font-medium {totals.totalShipping === 0 ? 'text-[#00BFB3]' : ''}">
          {totals.totalShipping === 0 ? 'Grátis' : formatCurrency(totals.totalShipping)}
        </span>
      </div>
    {/if}
    
    <!-- Descontos (UNIFICADO - igual ao carrinho) -->
    {#if totals.totalDiscount > 0}
      <div class="space-y-1">
        {#if totals.productDiscounts && totals.productDiscounts > 0}
          <div class="flex justify-between text-[#00BFB3] text-xs">
            <span>Descontos de produtos</span>
            <span>-{formatCurrency(totals.productDiscounts)}</span>
          </div>
        {/if}
        
        {#if totals.couponDiscount && totals.couponDiscount > 0}
          <div class="flex justify-between text-[#00BFB3] text-xs">
            <span>
              Cupom de desconto
              {#if appliedCoupon}
                <span class="font-medium">({appliedCoupon.code})</span>
              {/if}
            </span>
            <span>-{formatCurrency(totals.couponDiscount)}</span>
          </div>
        {/if}
        
        {#if totals.freeShippingSavings && totals.freeShippingSavings > 0}
          <div class="flex justify-between text-[#00BFB3] text-xs">
            <span>
              Frete grátis (cupom)
              {#if appliedCoupon && appliedCoupon.type === 'free_shipping'}
                <span class="font-medium">({appliedCoupon.code})</span>
              {/if}
            </span>
            <span>-{formatCurrency(totals.freeShippingSavings)}</span>
          </div>
        {/if}
        
        <div class="flex justify-between text-[#00BFB3] font-medium pt-1 border-t border-[#00BFB3]/20">
          <span>Total de descontos</span>
          <span>-{formatCurrency(totals.totalDiscount)}</span>
        </div>
      </div>
    {/if}
    
    <!-- Prazo máximo -->
    {#if totals.maxDeliveryDays && totals.maxDeliveryDays > 0}
      <div class="flex justify-between text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
          </svg>
          Prazo máximo
        </span>
        <span>{totals.maxDeliveryDays} dias úteis</span>
      </div>
    {/if}
    
    <!-- Total Final -->
    <div class="pt-3 border-t">
      <div class="flex justify-between text-lg font-semibold">
        <span>Total geral</span>
        <span class="text-[#00BFB3]">{formatCurrency(totals.cartTotal)}</span>
      </div>
      <p class="text-xs text-gray-500 mt-1">
        ou até 12x de {formatCurrency(totals.installmentValue)}
      </p>
      
      <!-- Economia Total (igual ao carrinho) -->
      {#if totals.totalDiscount > 0}
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
                  {formatCurrency(totals.totalDiscount)} no total
                </p>
                {#if totals.freeShippingSavings && totals.freeShippingSavings > 0}
                  <p class="text-xs">
                    Incluindo {formatCurrency(totals.freeShippingSavings)} de frete grátis
                  </p>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Ações (se solicitado) -->
  {#if showActions}
    <div class="mt-6 space-y-3">
      {#if onCheckout}
        <button
          onclick={onCheckout}
          disabled={checkoutButtonDisabled || isLoading}
          class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {#if isLoading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Processando...</span>
          {:else}
            <span>{checkoutButtonText}</span>
          {/if}
        </button>
      {/if}
      
      {#if onContinueShopping}
        <button 
          onclick={onContinueShopping}
          class="block w-full text-center text-sm text-[#00BFB3] hover:text-[#00A89D] py-2"
        >
          Continuar comprando
        </button>
      {/if}
    </div>
  {/if}
  
  <!-- Badge de Segurança -->
  <div class="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div class="flex items-center justify-center space-x-2 text-gray-600">
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
      </svg>
      <span class="text-xs font-medium">Compra 100% segura</span>
    </div>
  </div>
</div> 