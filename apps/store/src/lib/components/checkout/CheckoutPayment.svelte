<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const { 
    cartTotal = 0,
    addressData = null,
    isGuest = false
  } = $props<{
    cartTotal?: number;
    addressData?: any;
    isGuest?: boolean;
  }>();
  
  const dispatch = createEventDispatcher();
  
  // Estados
  let selectedPaymentMethod = $state('pix');
  let cardData = $state({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: 1
  });
  let notes = $state('');
  let validatingCard = $state(false);
  
  // Métodos de pagamento
  const paymentMethods = [
    { 
      id: 'pix', 
      name: 'PIX', 
      description: 'Pagamento instantâneo com 5% de desconto', 
      icon: '💲', 
      discount: 5,
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    { 
      id: 'credit_card', 
      name: 'Cartão de Crédito', 
      description: 'Até 12x sem juros', 
      icon: '💳', 
      discount: 0,
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    { 
      id: 'debit_card', 
      name: 'Cartão de Débito', 
      description: 'Débito à vista', 
      icon: '💳', 
      discount: 0,
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    { 
      id: 'boleto', 
      name: 'Boleto Bancário', 
      description: 'Vence em 3 dias úteis', 
      icon: '🏦', 
      discount: 0,
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    }
  ];
  
  // Funções de máscara
  function maskCardNumber(value: string): string {
    return value.replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .substring(0, 19);
  }
  
  function maskExpiry(value: string): string {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
  }
  
  function handleCardNumberInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const masked = maskCardNumber(target.value);
    cardData.number = masked;
    target.value = masked;
  }
  
  function handleExpiryInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const masked = maskExpiry(target.value);
    cardData.expiry = masked;
    target.value = masked;
  }
  
  // Calcular valor total com desconto
  function calculateFinalAmount(): number {
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (method && method.discount > 0) {
      return cartTotal * (1 - method.discount / 100);
    }
    return cartTotal;
  }
  
  // Calcular valor do desconto
  function getDiscountAmount(): number {
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (method && method.discount > 0) {
      return cartTotal * (method.discount / 100);
    }
    return 0;
  }
  
  // Opções de parcelamento
  function getInstallmentOptions() {
    const total = calculateFinalAmount();
    const options = [];
    
    for (let i = 1; i <= 12; i++) {
      const value = total / i;
      if (value >= 10) {
        options.push({
          number: i,
          value,
          text: i === 1 ? `À vista ${formatCurrency(total)}` : `${i}x de ${formatCurrency(value)} sem juros`
        });
      }
    }
    
    return options;
  }
  
  // Validar cartão
  function validateCardData(): boolean {
    if (selectedPaymentMethod === 'credit_card' || selectedPaymentMethod === 'debit_card') {
      return !!(
        cardData.number.replace(/\s/g, '').length >= 13 &&
        cardData.name.trim() &&
        cardData.expiry.length === 5 &&
        cardData.cvv.length >= 3
      );
    }
    return true;
  }
  
  // Formatar moeda
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  // Continuar para revisão
  function handleNext() {
    if (!validateCardData()) return;
    
    const paymentData = {
      method: selectedPaymentMethod,
      finalAmount: calculateFinalAmount(),
      discountAmount: getDiscountAmount(),
      notes,
      ...(selectedPaymentMethod === 'credit_card' || selectedPaymentMethod === 'debit_card' ? {
        card: {
          number: cardData.number,
          name: cardData.name,
          expiry: cardData.expiry,
          cvv: cardData.cvv,
          installments: cardData.installments
        }
      } : {})
    };
    
    dispatch('next', { paymentData });
  }
</script>

<div class="space-y-6">
  <!-- Métodos de Pagamento -->
  <div class="space-y-3">
    {#each paymentMethods as method}
      <label 
        class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-[#00BFB3]/50
               {selectedPaymentMethod === method.id ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200'}"
      >
        <input
          type="radio"
          bind:group={selectedPaymentMethod}
          value={method.id}
          class="w-4 h-4 text-[#00BFB3] focus:ring-[#00BFB3] mr-3"
        />
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xl">{method.icon}</span>
              <span class="font-medium text-gray-900">{method.name}</span>
              {#if method.discount > 0}
                <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                  {method.discount}% OFF
                </span>
              {/if}
            </div>
            {#if method.discount > 0 && selectedPaymentMethod === method.id}
              <div class="text-right">
                <p class="text-sm text-[#00BFB3] font-medium">
                  Economia: {formatCurrency(getDiscountAmount())}
                </p>
                <p class="text-lg font-bold text-[#00BFB3]">
                  {formatCurrency(calculateFinalAmount())}
                </p>
              </div>
            {/if}
          </div>
          <p class="text-sm text-gray-600 mt-1">{method.description}</p>
        </div>
      </label>
    {/each}
  </div>
  
  <!-- Formulário específico por método -->
  {#if selectedPaymentMethod === 'credit_card' || selectedPaymentMethod === 'debit_card'}
    <div class="border-t pt-6 space-y-4">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center space-x-2">
        <svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <span>Dados do {selectedPaymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito'}</span>
      </h3>
      
      <div>
        <label for="payment-card-number" class="block text-sm font-medium text-gray-700 mb-1">
          Número do Cartão *
        </label>
        <input
          id="payment-card-number"
          type="text"
          value={cardData.number}
          oninput={handleCardNumberInput}
          placeholder="0000 0000 0000 0000"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
          maxlength="19"
          required
        />
      </div>
      
      <div>
        <label for="payment-card-name" class="block text-sm font-medium text-gray-700 mb-1">
          Nome no Cartão *
        </label>
        <input
          id="payment-card-name"
          type="text"
          bind:value={cardData.name}
          placeholder="Como está no cartão"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
          required
        />
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="payment-card-expiry" class="block text-sm font-medium text-gray-700 mb-1">
            Validade *
          </label>
          <input
            id="payment-card-expiry"
            type="text"
            value={cardData.expiry}
            oninput={handleExpiryInput}
            placeholder="MM/AA"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
            maxlength="5"
            required
          />
        </div>
        
        <div>
          <label for="payment-card-cvv" class="block text-sm font-medium text-gray-700 mb-1">
            CVV *
          </label>
          <input
            id="payment-card-cvv"
            type="text"
            bind:value={cardData.cvv}
            placeholder="000"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
            maxlength="4"
            required
          />
        </div>
      </div>
      
      {#if selectedPaymentMethod === 'credit_card'}
        <div>
          <label for="payment-installments" class="block text-sm font-medium text-gray-700 mb-1">
            Parcelas
          </label>
          <select
            id="payment-installments"
            bind:value={cardData.installments}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
          >
            {#each getInstallmentOptions() as option}
              <option value={option.number}>{option.text}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
    
  {:else if selectedPaymentMethod === 'pix'}
    <div class="border-t pt-6">
      <div class="bg-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-lg p-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-[#00BFB3]/20 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 class="font-medium text-[#00BFB3]">PIX - Pagamento Instantâneo</h3>
            <p class="text-sm text-[#00BFB3]">
              Após confirmar o pedido, você receberá o código PIX para pagamento.
              O código tem validade de 30 minutos.
            </p>
          </div>
        </div>
        
        <div class="mt-4 p-3 bg-[#00BFB3]/20 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-[#00BFB3]">💰 Você está economizando:</p>
              <p class="text-lg font-bold text-[#00BFB3]">{formatCurrency(getDiscountAmount())}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-[#00BFB3]">Total final:</p>
              <p class="text-xl font-bold text-[#00BFB3]">{formatCurrency(calculateFinalAmount())}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  {:else if selectedPaymentMethod === 'boleto'}
    <div class="border-t pt-6">
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 class="font-medium text-orange-800">Boleto Bancário</h3>
            <p class="text-sm text-orange-700">
              Após confirmar o pedido, você poderá imprimir o boleto.
              Vencimento em 3 dias úteis.
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Observações -->
  <div>
    <label for="payment-notes" class="block text-sm font-medium text-gray-700 mb-1">
      Observações (opcional)
    </label>
    <textarea
      id="payment-notes"
      bind:value={notes}
      placeholder="Observações sobre o pedido ou entrega..."
      rows="3"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
    ></textarea>
  </div>
  
  <!-- Resumo do endereço -->
  {#if addressData}
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 class="text-sm font-semibold text-gray-900 mb-2 flex items-center">
        <svg class="w-4 h-4 mr-2 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        Entregar em:
      </h4>
      <div class="text-sm text-gray-700 space-y-1">
        <p class="font-semibold">{addressData.name}</p>
        <p>{addressData.street}, {addressData.number}</p>
        {#if addressData.complement}
          <p>{addressData.complement}</p>
        {/if}
        <p>{addressData.neighborhood} - {addressData.city}/{addressData.state}</p>
        <p>CEP: {addressData.zipCode}</p>
      </div>
    </div>
  {/if}
  
  <!-- Aviso para usuários convidados -->
  {#if isGuest}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 class="font-medium text-blue-800">Checkout como Convidado</h4>
          <p class="text-sm text-blue-700 mt-1">
            Para finalizar o pedido, será necessário fazer login ou criar uma conta rapidamente.
          </p>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Botão de continuar -->
  <button
    onclick={handleNext}
    disabled={!validateCardData()}
    class="w-full py-3 px-4 bg-[#00BFB3] text-white font-semibold rounded-lg hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
  >
    <span>Finalizar Pedido</span>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</div> 