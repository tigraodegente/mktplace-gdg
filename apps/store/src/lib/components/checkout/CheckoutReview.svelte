<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import OrderSummary from '$lib/components/cart/OrderSummary.svelte';
  
  const { 
    cartItems = [],
    cartTotals = null,
    addressData = null,
    paymentData = null,
    appliedCoupon = null
  } = $props<{
    cartItems?: any[];
    cartTotals?: any;
    addressData?: any;
    paymentData?: any;
    appliedCoupon?: any;
  }>();
  
  const dispatch = createEventDispatcher();
  
  let processingOrder = $state(false);
  let orderError = $state('');
  
  // Formatar moeda
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  // Obter nome do método de pagamento
  function getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      'pix': 'PIX',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'boleto': 'Boleto Bancário'
    };
    return methods[method] || method;
  }
  
  // Finalizar pedido
  async function handleFinalizeOrder() {
    processingOrder = true;
    orderError = '';
    
    try {
      // Criar pedido
      const orderResponse = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map((item: any) => ({
            productId: item.productId || item.product?.id,
            quantity: item.quantity
          })),
          shippingAddress: addressData,
          paymentMethod: paymentData.method,
          couponCode: appliedCoupon?.code,
          notes: paymentData.notes
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.error?.message || 'Erro ao criar pedido');
      }

      // Processar pagamento
      let paymentPayload: any = {};
      
      switch (paymentData.method) {
        case 'pix':
          paymentPayload = { pixKey: 'marketplace@exemplo.com' };
          break;
        case 'credit_card':
        case 'debit_card':
          paymentPayload = {
            cardToken: `token_${Date.now()}`,
            installments: paymentData.card?.installments || 1,
            cardName: paymentData.card?.name,
            cardLast4: paymentData.card?.number?.slice(-4)
          };
          break;
        case 'boleto':
          paymentPayload = {
            customerDocument: '000.000.000-00',
            customerName: addressData.name
          };
          break;
      }

      const paymentResponse = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.data.order.id,
          method: paymentData.method,
          paymentData: paymentPayload
        })
      });

      const paymentResult = await paymentResponse.json();
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error?.message || 'Erro ao processar pagamento');
      }

      const finalResult = {
        order: orderData.data.order,
        payment: paymentResult.data.payment
      };
      
      // Informar sucesso
      dispatch('complete', { orderResult: finalResult });
      
    } catch (err) {
      orderError = err instanceof Error ? err.message : 'Erro desconhecido';
    } finally {
      processingOrder = false;
    }
  }
  
  // Voltar para step anterior
  function goBack() {
    dispatch('back');
  }
</script>

<div class="space-y-6">
  <!-- Cabeçalho -->
  <div class="text-center">
    <div class="w-16 h-16 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h2 class="text-2xl font-bold text-gray-900 mb-2">Revise seu pedido</h2>
    <p class="text-gray-600">Confira todos os dados antes de finalizar a compra</p>
  </div>
  
  {#if orderError}
    <!-- Erro do pedido -->
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex">
        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Erro ao finalizar pedido</h3>
          <p class="text-sm text-red-700 mt-1">{orderError}</p>
        </div>
        <div class="ml-auto">
          <button onclick={() => orderError = ''} class="text-red-400 hover:text-red-600" aria-label="Fechar mensagem de erro">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Endereço de Entrega -->
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center">
        <svg class="w-5 h-5 mr-2 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        Endereço de Entrega
      </h3>
      <button onclick={() => dispatch('editAddress')} class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium">
        Alterar
      </button>
    </div>
    
    {#if addressData}
      <div class="text-sm text-gray-700 space-y-1 bg-gray-50 p-4 rounded-lg">
        <p class="font-semibold">{addressData.name}</p>
        <p>{addressData.street}, {addressData.number}</p>
        {#if addressData.complement}
          <p>{addressData.complement}</p>
        {/if}
        <p>{addressData.neighborhood} - {addressData.city}/{addressData.state}</p>
        <p>CEP: {addressData.zipCode}</p>
      </div>
    {/if}
  </div>
  
  <!-- Forma de Pagamento -->
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center">
        <svg class="w-5 h-5 mr-2 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        Forma de Pagamento
      </h3>
      <button onclick={() => dispatch('editPayment')} class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium">
        Alterar
      </button>
    </div>
    
    {#if paymentData}
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-gray-900">{getPaymentMethodName(paymentData.method)}</p>
            
            {#if paymentData.method === 'credit_card' && paymentData.card}
              <p class="text-sm text-gray-600">
                Final: **** {paymentData.card.number?.slice(-4)}
              </p>
              <p class="text-sm text-gray-600">
                {paymentData.card.installments}x de {formatCurrency(paymentData.finalAmount / paymentData.card.installments)}
              </p>
            {:else if paymentData.method === 'debit_card' && paymentData.card}
              <p class="text-sm text-gray-600">
                Final: **** {paymentData.card.number?.slice(-4)}
              </p>
              <p class="text-sm text-gray-600">À vista</p>
            {:else if paymentData.method === 'pix'}
              <p class="text-sm text-gray-600">Pagamento instantâneo</p>
              {#if paymentData.discountAmount > 0}
                <p class="text-sm text-green-600 font-medium">
                  Desconto de 5%: -{formatCurrency(paymentData.discountAmount)}
                </p>
              {/if}
            {:else if paymentData.method === 'boleto'}
              <p class="text-sm text-gray-600">Vencimento em 3 dias úteis</p>
            {/if}
          </div>
          
          <div class="text-right">
            <p class="text-lg font-bold text-[#00BFB3]">
              {formatCurrency(paymentData.finalAmount)}
            </p>
          </div>
        </div>
        
        {#if paymentData.notes}
          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-sm text-gray-600">
              <strong>Observações:</strong> {paymentData.notes}
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
  
  <!-- Resumo do Pedido -->
  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div class="p-4 bg-gray-50 border-b border-gray-200">
      <h3 class="text-lg font-semibold text-gray-900">Resumo do Pedido</h3>
    </div>
    
    <div class="p-6">
      {#if cartTotals}
        <OrderSummary
          cartItems={cartItems}
          totals={cartTotals}
          appliedCoupon={appliedCoupon}
          showItems={true}
          showActions={false}
          isLoading={false}
          checkoutButtonText=""
          checkoutButtonDisabled={true}
        />
      {/if}
    </div>
  </div>
  
  <!-- Termos e Condições -->
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div class="flex items-start space-x-3">
      <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="text-sm text-blue-800">
        <p class="font-medium mb-1">Importante:</p>
        <p>
          Ao finalizar a compra, você concorda com nossos 
          <a href="/termos" class="underline hover:text-blue-900" target="_blank">Termos de Uso</a> e 
          <a href="/privacidade" class="underline hover:text-blue-900" target="_blank">Política de Privacidade</a>.
        </p>
        <p class="mt-2">
          Você receberá um e-mail de confirmação com os detalhes do pedido e informações de pagamento.
        </p>
      </div>
    </div>
  </div>
  
  <!-- Botões de ação -->
  <div class="flex flex-col sm:flex-row gap-3">
    <button
      onclick={goBack}
      class="sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span>Voltar</span>
    </button>
    
    <button
      onclick={handleFinalizeOrder}
      disabled={processingOrder}
      class="flex-1 py-3 px-6 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
    >
      {#if processingOrder}
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        <span>Processando...</span>
      {:else}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Finalizar Pedido</span>
      {/if}
    </button>
  </div>
  
  <!-- Badges de segurança -->
  <div class="flex items-center justify-center space-x-6 pt-4 border-t border-gray-200">
    <div class="flex items-center space-x-2 text-sm text-gray-600">
      <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>Compra Segura</span>
    </div>
    
    <div class="flex items-center space-x-2 text-sm text-gray-600">
      <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span>Dados Protegidos</span>
    </div>
    
    <div class="flex items-center space-x-2 text-sm text-gray-600">
      <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
      <span>Garantia de Qualidade</span>
    </div>
  </div>
</div> 