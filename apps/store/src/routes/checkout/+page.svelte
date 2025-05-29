<script lang="ts">
  import { advancedCartStore } from '$lib/stores/advancedCartStore';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { formatCurrency } from '@mktplace/utils';
  
  const { sellerGroups, cartTotals, clearCart } = advancedCartStore;
  
  // Estado
  let currentStep: 'shipping' | 'payment' | 'review' = 'shipping';
  let isProcessing = $state(false);
  let addressData = $state({
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: ''
  });
  let paymentData = $state({
    method: 'credit_card',
    installments: 1,
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: ''
  });
  
  // Sistema de estoque
  let stockReservationId = $state<string | null>(null);
  let reservationExpiresAt = $state<Date | null>(null);
  let stockValidationError = $state<string | null>(null);

  // Função para gerar session ID único
  function generateSessionId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2);
  }

  // Reservar estoque ao entrar no checkout
  onMount(async () => {
    await reserveStock();
  });

  // Limpar reserva ao sair da página
  onDestroy(async () => {
    if (stockReservationId) {
      await releaseReservation();
    }
  });

  async function reserveStock() {
    try {
      stockValidationError = null;
      
      // Preparar itens para reserva
      const items = $sellerGroups.flatMap(group => 
        group.items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      );

      if (items.length === 0) {
        goto('/cart');
        return;
      }

      const sessionId = generateSessionId();
      
      const response = await fetch('/api/stock/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items,
          session_id: sessionId,
          expires_in_minutes: 15
        })
      });

      const result = await response.json();

      if (result.success) {
        stockReservationId = result.reservation_id;
        reservationExpiresAt = new Date(result.expires_at);
        console.log('✅ Estoque reservado:', stockReservationId);
      } else {
        stockValidationError = result.error?.message || 'Erro ao reservar estoque';
        console.error('❌ Falha ao reservar estoque:', result.error);
      }

    } catch (error) {
      console.error('❌ Erro ao reservar estoque:', error);
      stockValidationError = 'Erro de conexão ao validar estoque';
    }
  }

  async function releaseReservation() {
    if (!stockReservationId) return;

    try {
      await fetch(`/api/stock/reserve?reservation_id=${stockReservationId}&session_id=${generateSessionId()}`, {
        method: 'DELETE'
      });
      console.log('🔓 Reserva liberada');
    } catch (error) {
      console.error('❌ Erro ao liberar reserva:', error);
    }
  }

  async function processOrder() {
    isProcessing = true;
    
    try {
      // Validar dados obrigatórios
      if (!addressData.name || !addressData.street || !addressData.postal_code) {
        alert('Por favor, preencha todos os campos obrigatórios do endereço');
        return;
      }

      if (!stockReservationId) {
        // Tentar reservar novamente se não houver reserva
        await reserveStock();
        if (!stockReservationId) {
          alert('Erro ao validar estoque. Tente novamente.');
          return;
        }
      }

      // Preparar dados do pedido
      const orderData = {
        items: $sellerGroups.flatMap(group => 
          group.items.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            seller_id: item.sellerId,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize
          }))
        ),
        shipping_address: addressData,
        billing_address: addressData, // Por enquanto usar o mesmo endereço
        payment_method: paymentData.method,
        installments: paymentData.installments,
        notes: '',
        user_id: 'guest-user', // TODO: Implementar autenticação real
      };

      console.log('🚀 Criando pedido...', orderData);

      // Criar pedido via API
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Pedido criado com sucesso:', result.order);
        
        // Confirmar reserva na API (marcar como usada)
        if (stockReservationId) {
          await confirmReservation();
        }

        // Limpar carrinho
        clearCart();
        
        // Redirecionar para página de sucesso
        goto(`/pedido/sucesso?orderId=${result.order.order_number}`);
        
      } else {
        console.error('❌ Erro ao criar pedido:', result.error);
        
        if (result.error?.code === 'INSUFFICIENT_STOCK') {
          stockValidationError = result.error.message;
          alert(`Erro de estoque: ${result.error.message}`);
          // Redirecionar para o carrinho para ajustar quantidades
          goto('/cart');
        } else {
          alert(result.error?.message || 'Erro ao processar pedido. Tente novamente.');
        }
      }
      
    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      isProcessing = false;
    }
  }

  async function confirmReservation() {
    if (!stockReservationId) return;

    try {
      // Atualizar status da reserva para 'confirmed'
      await fetch('/api/stock/reserve', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservation_id: stockReservationId,
          status: 'confirmed'
        })
      });
    } catch (error) {
      console.error('❌ Erro ao confirmar reserva:', error);
    }
  }

  // Buscar endereço pelo CEP
  async function fetchAddress(cep: string) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        addressData.street = data.logradouro;
        addressData.neighborhood = data.bairro;
        addressData.city = data.localidade;
        addressData.state = data.uf;
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  }
  
  // Máscaras de input
  function maskCPF(value: string) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
  
  function maskPhone(value: string) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
  
  function maskCardNumber(value: string) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})\d+?$/, '$1');
  }
  
  function maskCardExpiry(value: string) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\/\d{2})\d+?$/, '$1');
  }
  
  // Validação dos passos
  function validateAddress() {
    return addressData.name && 
           addressData.street && 
           addressData.postal_code;
  }
  
  function validatePayment() {
    if (paymentData.method === 'credit_card') {
      return true;
    }
    return true;
  }
  
  // Calcular parcelas disponíveis
  function getInstallmentOptions() {
    const total = $cartTotals.cartTotal;
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
</script>

<svelte:head>
  <title>Checkout - Marketplace GDG</title>
  <meta name="description" content="Finalize sua compra com segurança" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Finalizar Compra</h1>
      
      <!-- Progress Steps -->
      <div class="mt-6">
        <div class="flex items-center">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center
                        {currentStep === 'shipping' ? 'bg-[#00BFB3] text-white' : 'bg-gray-300 text-gray-600'}">
              1
            </div>
            <span class="ml-2 text-sm font-medium {currentStep === 'shipping' ? 'text-gray-900' : 'text-gray-500'}">
              Endereço
            </span>
          </div>
          
          <div class="flex-1 mx-4">
            <div class="h-0.5 bg-gray-300">
              <div class="h-0.5 bg-[#00BFB3] transition-all duration-300"
                   style="width: {currentStep === 'shipping' ? '0%' : currentStep === 'payment' ? '50%' : '100%'}">
              </div>
            </div>
          </div>
          
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center
                        {currentStep === 'payment' || currentStep === 'review' ? 'bg-[#00BFB3] text-white' : 'bg-gray-300 text-gray-600'}">
              2
            </div>
            <span class="ml-2 text-sm font-medium {currentStep === 'payment' || currentStep === 'review' ? 'text-gray-900' : 'text-gray-500'}">
              Pagamento
            </span>
          </div>
          
          <div class="flex-1 mx-4">
            <div class="h-0.5 bg-gray-300">
              <div class="h-0.5 bg-[#00BFB3] transition-all duration-300"
                   style="width: {currentStep === 'review' ? '100%' : '0%'}">
              </div>
            </div>
          </div>
          
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center
                        {currentStep === 'review' ? 'bg-[#00BFB3] text-white' : 'bg-gray-300 text-gray-600'}">
              3
            </div>
            <span class="ml-2 text-sm font-medium {currentStep === 'review' ? 'text-gray-900' : 'text-gray-500'}">
              Revisão
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Formulário Principal -->
      <div class="lg:col-span-2">
        {#if currentStep === 'shipping'}
          <!-- Formulário de Endereço -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold mb-6">Dados de Entrega</h2>
            
            <form class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    bind:value={addressData.name}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    bind:value={addressData.postal_code}
                    onblur={() => fetchAddress(addressData.postal_code)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                    placeholder="00000-000"
                    required
                  />
                </div>
              </div>
              
              <div class="border-t pt-4">
                <h3 class="font-medium mb-4">Endereço de Entrega</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Rua
                    </label>
                    <input
                      type="text"
                      bind:value={addressData.street}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      bind:value={addressData.number}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Complemento
                    </label>
                    <input
                      type="text"
                      bind:value={addressData.complement}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      placeholder="Apto, Bloco, etc"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      bind:value={addressData.neighborhood}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      bind:value={addressData.city}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      bind:value={addressData.state}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="flex justify-end pt-4">
                <button
                  type="button"
                  onclick={() => currentStep = 'payment'}
                  disabled={!validateAddress()}
                  class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg font-semibold
                         hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 
                         disabled:cursor-not-allowed"
                >
                  Continuar para Pagamento
                </button>
              </div>
            </form>
          </div>
          
        {:else if currentStep === 'payment'}
          <!-- Formulário de Pagamento -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold mb-6">Forma de Pagamento</h2>
            
            <!-- Métodos de Pagamento -->
            <div class="space-y-3 mb-6">
              <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                            {paymentData.method === 'credit_card' ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200 hover:border-gray-300'}">
                <input
                  type="radio"
                  bind:group={paymentData.method}
                  value="credit_card"
                  class="w-4 h-4 text-[#00BFB3]"
                />
                <span class="ml-3 font-medium">Cartão de Crédito</span>
              </label>
              
              <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                            {paymentData.method === 'pix' ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200 hover:border-gray-300'}">
                <input
                  type="radio"
                  bind:group={paymentData.method}
                  value="pix"
                  class="w-4 h-4 text-[#00BFB3]"
                />
                <span class="ml-3 font-medium">PIX (5% de desconto)</span>
              </label>
              
              <label class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
                            {paymentData.method === 'boleto' ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200 hover:border-gray-300'}">
                <input
                  type="radio"
                  bind:group={paymentData.method}
                  value="boleto"
                  class="w-4 h-4 text-[#00BFB3]"
                />
                <span class="ml-3 font-medium">Boleto Bancário</span>
              </label>
            </div>
            
            <!-- Formulário de Cartão -->
            {#if paymentData.method === 'credit_card'}
              <div class="space-y-4 border-t pt-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <input
                    type="text"
                    value={paymentData.cardNumber}
                    oninput={(e) => paymentData.cardNumber = maskCardNumber(e.currentTarget.value)}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                    placeholder="0000 0000 0000 0000"
                    maxlength="19"
                    required
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Nome no Cartão
                  </label>
                  <input
                    type="text"
                    bind:value={paymentData.cardName}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                    placeholder="Como está no cartão"
                    required
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Validade
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardExpiry}
                      oninput={(e) => paymentData.cardExpiry = maskCardExpiry(e.currentTarget.value)}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      placeholder="MM/AA"
                      maxlength="5"
                      required
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      bind:value={paymentData.cardCvv}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      placeholder="000"
                      maxlength="4"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Parcelas
                  </label>
                  <select
                    bind:value={paymentData.installments}
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                  >
                    {#each getInstallmentOptions() as option}
                      <option value={option.number}>{option.text}</option>
                    {/each}
                  </select>
                </div>
              </div>
            {:else if paymentData.method === 'pix'}
              <div class="border-t pt-4">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p class="text-green-800 font-medium mb-2">
                    Você receberá 5% de desconto pagando com PIX!
                  </p>
                  <p class="text-sm text-green-700">
                    Após finalizar o pedido, você receberá o código PIX para pagamento.
                  </p>
                </div>
              </div>
            {:else if paymentData.method === 'boleto'}
              <div class="border-t pt-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p class="text-blue-800 font-medium mb-2">
                    Pagamento via Boleto Bancário
                  </p>
                  <p class="text-sm text-blue-700">
                    O boleto será gerado após a confirmação do pedido. Prazo de pagamento: 3 dias úteis.
                  </p>
                </div>
              </div>
            {/if}
            
            <div class="flex justify-between pt-6">
              <button
                type="button"
                onclick={() => currentStep = 'shipping'}
                class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold
                       hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onclick={() => currentStep = 'review'}
                disabled={!validatePayment()}
                class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg font-semibold
                       hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 
                       disabled:cursor-not-allowed"
              >
                Revisar Pedido
              </button>
            </div>
          </div>
          
        {:else if currentStep === 'review'}
          <!-- Revisão do Pedido -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold mb-6">Revise seu Pedido</h2>
            
            <!-- Endereço de Entrega -->
            <div class="mb-6">
              <h3 class="font-medium text-gray-900 mb-3">Endereço de Entrega</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <p class="font-medium">{addressData.name}</p>
                <p class="text-sm text-gray-600 mt-1">
                  {addressData.street}, {addressData.number}
                  {addressData.complement ? `, ${addressData.complement}` : ''}
                </p>
                <p class="text-sm text-gray-600">
                  {addressData.neighborhood} - {addressData.city}/{addressData.state}
                </p>
                <p class="text-sm text-gray-600">CEP: {addressData.postal_code}</p>
              </div>
            </div>
            
            <!-- Forma de Pagamento -->
            <div class="mb-6">
              <h3 class="font-medium text-gray-900 mb-3">Forma de Pagamento</h3>
              <div class="bg-gray-50 rounded-lg p-4">
                {#if paymentData.method === 'credit_card'}
                  <p class="font-medium">Cartão de Crédito</p>
                  <p class="text-sm text-gray-600">
                    **** **** **** {paymentData.cardNumber.slice(-4)}
                  </p>
                  <p class="text-sm text-gray-600">
                    {paymentData.installments}x de {formatCurrency($cartTotals.cartTotal / paymentData.installments)}
                  </p>
                {:else if paymentData.method === 'pix'}
                  <p class="font-medium">PIX</p>
                  <p class="text-sm text-green-600">5% de desconto aplicado</p>
                {:else}
                  <p class="font-medium">Boleto Bancário</p>
                  <p class="text-sm text-gray-600">Vencimento em 3 dias úteis</p>
                {/if}
              </div>
            </div>
            
            <!-- Produtos -->
            <div class="mb-6">
              <h3 class="font-medium text-gray-900 mb-3">Produtos</h3>
              <div class="space-y-3">
                {#each $sellerGroups as group}
                  <div class="bg-gray-50 rounded-lg p-4">
                    <p class="text-sm font-medium text-gray-900 mb-2">
                      Vendido por {group.sellerName}
                    </p>
                    {#each group.items as item}
                      <div class="flex justify-between text-sm py-1">
                        <span class="text-gray-600">
                          {item.quantity}x {item.product.name}
                        </span>
                        <span class="font-medium">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/each}
              </div>
            </div>
            
            <div class="flex justify-between pt-6">
              <button
                type="button"
                onclick={() => currentStep = 'payment'}
                class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold
                       hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onclick={processOrder}
                disabled={isProcessing}
                class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg font-semibold
                       hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 
                       disabled:cursor-not-allowed flex items-center gap-2"
              >
                {#if isProcessing}
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processando...
                {:else}
                  Finalizar Compra
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Resumo do Pedido (Lateral) -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm p-6 sticky top-4">
          <h2 class="text-lg font-semibold mb-4">Resumo do Pedido</h2>
          
          <!-- Produtos -->
          <div class="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {#each $sellerGroups as group}
              {#each group.items as item}
                <div class="flex items-center gap-3">
                  <img 
                    src={item.product.images?.[0] || '/placeholder.jpg'} 
                    alt={item.product.name}
                    class="w-12 h-12 object-contain rounded"
                  />
                  <div class="flex-1">
                    <p class="text-sm font-medium line-clamp-1">{item.product.name}</p>
                    <p class="text-xs text-gray-500">Qtd: {item.quantity}</p>
                  </div>
                  <p class="text-sm font-medium">
                    {formatCurrency(item.product.price * item.quantity)}
                  </p>
                </div>
              {/each}
            {/each}
          </div>
          
          <!-- Totais -->
          <div class="border-t pt-4 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Subtotal</span>
              <span>{formatCurrency($cartTotals.cartSubtotal)}</span>
            </div>
            
            {#if $cartTotals.totalShipping > 0}
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Frete</span>
                <span>{formatCurrency($cartTotals.totalShipping)}</span>
              </div>
            {/if}
            
            {#if $cartTotals.totalDiscount > 0}
              <div class="flex justify-between text-sm text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency($cartTotals.totalDiscount)}</span>
              </div>
            {/if}
            
            {#if paymentData.method === 'pix'}
              <div class="flex justify-between text-sm text-green-600">
                <span>Desconto PIX (5%)</span>
                <span>-{formatCurrency($cartTotals.cartTotal * 0.05)}</span>
              </div>
            {/if}
            
            <div class="border-t pt-2">
              <div class="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>
                  {formatCurrency(
                    paymentData.method === 'pix' 
                      ? $cartTotals.cartTotal * 0.95 
                      : $cartTotals.cartTotal
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div> 