<script lang="ts">
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  
  interface Props {
    order: any;
    onComplete: (data: any) => void;
    onBack: () => void;
    loading?: boolean;
  }
  
  let {
    order,
    onComplete,
    onBack,
    loading = false
  }: Props = $props();
  
  let selectedMethod = $state('pix');
  let cardData = $state({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: 1
  });
  let notes = $state('');
  
  const paymentMethods = [
    {
      id: 'pix',
      name: 'PIX',
      description: 'Pagamento instantâneo',
      icon: '💲',
      discount: 5
    },
    {
      id: 'credit_card',
      name: 'Cartão de Crédito',
      description: 'Até 12x sem juros',
      icon: '💳',
      discount: 0
    },
    {
      id: 'debit_card',
      name: 'Cartão de Débito',
      description: 'Débito à vista',
      icon: '💳',
      discount: 0
    },
    {
      id: 'boleto',
      name: 'Boleto Bancário',
      description: 'Vence em 3 dias úteis',
      icon: '🏦',
      discount: 0
    }
  ];
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  function maskCardNumber(value: string): string {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .substring(0, 19);
  }
  
  function maskExpiry(value: string): string {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .substring(0, 5);
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
  
  function getInstallmentOptions() {
    const total = order.totals?.total || 0;
    const options = [];
    
    for (let i = 1; i <= 12; i++) {
      const value = total / i;
      if (value >= 10) { // Parcela mínima de R$ 10
        options.push({
          number: i,
          value,
          text: i === 1 
            ? `À vista ${formatCurrency(total)}` 
            : `${i}x de ${formatCurrency(value)} sem juros`
        });
      }
    }
    
    return options;
  }
  
  function calculateTotal() {
    const baseTotal = order.totals?.total || 0;
    const method = paymentMethods.find(m => m.id === selectedMethod);
    const discount = method?.discount || 0;
    
    return baseTotal * (1 - discount / 100);
  }
  
  function handleSubmit() {
    let paymentData: any = {};
    
    switch (selectedMethod) {
      case 'pix':
        paymentData = {
          pixKey: 'marketplace@exemplo.com'
        };
        break;
        
      case 'credit_card':
      case 'debit_card':
        paymentData = {
          cardToken: `token_${Date.now()}`, // Em produção seria tokenizado
          installments: cardData.installments,
          cardName: cardData.name,
          cardLast4: cardData.number.slice(-4)
        };
        break;
        
      case 'boleto':
        paymentData = {
          customerDocument: '000.000.000-00', // Seria obtido do usuário
          customerName: order.address?.name || 'Cliente'
        };
        break;
    }
    
    onComplete({
      method: selectedMethod,
      paymentData,
      notes
    });
  }
</script>

<div class="p-6">
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    <!-- Formulário de Pagamento -->
    <div class="lg:col-span-2">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Forma de Pagamento</h2>
      
      <!-- Métodos de Pagamento -->
      <div class="space-y-3 mb-6">
        {#each paymentMethods as method}
          <label 
            class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-300
                   {selectedMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
          >
            <input
              type="radio"
              bind:group={selectedMethod}
              value={method.id}
              class="w-4 h-4 text-blue-600"
            />
            <div class="ml-3 flex-1">
              <div class="flex items-center space-x-2">
                <span class="text-xl">{method.icon}</span>
                <span class="font-medium text-gray-900">{method.name}</span>
                {#if method.discount > 0}
                  <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {method.discount}% OFF
                  </span>
                {/if}
              </div>
              <p class="text-sm text-gray-600 mt-1">{method.description}</p>
            </div>
          </label>
        {/each}
      </div>
      
      <!-- Formulário específico por método -->
      {#if selectedMethod === 'credit_card' || selectedMethod === 'debit_card'}
        <div class="border-t pt-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">
            Dados do {selectedMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito'}
          </h3>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Número do Cartão
            </label>
            <input
              type="text"
              value={cardData.number}
              oninput={handleCardNumberInput}
              placeholder="0000 0000 0000 0000"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxlength="19"
              disabled={loading}
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nome no Cartão
            </label>
            <input
              type="text"
              bind:value={cardData.name}
              placeholder="Como está no cartão"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Validade
              </label>
              <input
                type="text"
                value={cardData.expiry}
                oninput={handleExpiryInput}
                placeholder="MM/AA"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxlength="5"
                disabled={loading}
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                CVV
              </label>
              <input
                type="text"
                bind:value={cardData.cvv}
                placeholder="000"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxlength="4"
                disabled={loading}
              />
            </div>
          </div>
          
          {#if selectedMethod === 'credit_card'}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Parcelas
              </label>
              <select
                bind:value={cardData.installments}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {#each getInstallmentOptions() as option}
                  <option value={option.number}>{option.text}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>
        
      {:else if selectedMethod === 'pix'}
        <div class="border-t pt-6">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-green-600 text-xl">💲</span>
              <h3 class="font-semibold text-green-800">Pagamento PIX</h3>
            </div>
            <p class="text-green-700 mb-2">
              Você receberá 5% de desconto pagando com PIX!
            </p>
            <p class="text-sm text-green-600">
              Após confirmar o pedido, você receberá o código PIX e QR Code para pagamento instantâneo.
            </p>
          </div>
        </div>
        
      {:else if selectedMethod === 'boleto'}
        <div class="border-t pt-6">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-blue-600 text-xl">🏦</span>
              <h3 class="font-semibold text-blue-800">Boleto Bancário</h3>
            </div>
            <p class="text-blue-700 mb-2">
              O boleto será gerado após a confirmação do pedido.
            </p>
            <p class="text-sm text-blue-600">
              Prazo de pagamento: 3 dias úteis. Pode ser pago em qualquer banco, casa lotérica ou pelo internet banking.
            </p>
          </div>
        </div>
      {/if}
      
      <!-- Observações -->
      <div class="mt-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Observações (opcional)
        </label>
        <textarea
          bind:value={notes}
          placeholder="Observações sobre o pedido ou entrega..."
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        ></textarea>
      </div>
    </div>
    
    <!-- Resumo do Pedido -->
    <div class="lg:col-span-1">
      <div class="bg-gray-50 rounded-lg p-6 sticky top-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Resumo do Pedido</h3>
        
        <!-- Endereço -->
        {#if order.address}
          <div class="mb-4 pb-4 border-b">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Entregar em:</h4>
            <p class="text-sm text-gray-600">
              {order.address.street}, {order.address.number}
              {order.address.complement ? `, ${order.address.complement}` : ''}
            </p>
            <p class="text-sm text-gray-600">
              {order.address.neighborhood} - {order.address.city}/{order.address.state}
            </p>
            <p class="text-sm text-gray-600">CEP: {order.address.zipCode}</p>
          </div>
        {/if}
        
        <!-- Produtos -->
        <div class="mb-4 pb-4 border-b">
          <h4 class="text-sm font-medium text-gray-700 mb-2">
            Itens ({order.items?.length || 0})
          </h4>
          <div class="space-y-2 max-h-32 overflow-y-auto">
            {#each order.items || [] as item}
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 truncate">{item.quantity}x {item.productName}</span>
                <span class="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Totais -->
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Subtotal</span>
            <span>{formatCurrency(order.totals?.subtotal || 0)}</span>
          </div>
          
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Frete</span>
            <span>{formatCurrency(order.totals?.shipping || 0)}</span>
          </div>
          
          {#if order.totals?.discount > 0}
            <div class="flex justify-between text-sm text-green-600">
              <span>Desconto</span>
              <span>-{formatCurrency(order.totals.discount)}</span>
            </div>
          {/if}
          
          {#if selectedMethod === 'pix'}
            <div class="flex justify-between text-sm text-green-600">
              <span>Desconto PIX (5%)</span>
              <span>-{formatCurrency((order.totals?.total || 0) * 0.05)}</span>
            </div>
          {/if}
          
          <div class="border-t pt-2">
            <div class="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Botões de Ação -->
  <div class="flex justify-between items-center mt-8 pt-6 border-t">
    <button
      type="button"
      onclick={onBack}
      disabled={loading}
      class="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      ← Voltar
    </button>
    
    <button
      onclick={handleSubmit}
      disabled={loading}
      class="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
    >
      {#if loading}
        <LoadingSpinner size="small" color="white" />
        <span>Processando Pagamento...</span>
      {:else}
        <span>Finalizar Pedido</span>
        <span>{formatCurrency(calculateTotal())}</span>
      {/if}
    </button>
  </div>
</div> 