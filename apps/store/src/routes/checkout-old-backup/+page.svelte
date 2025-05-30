<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import CartStep from '$lib/components/checkout/CartStep.svelte';
  import AddressStep from '$lib/components/checkout/AddressStep.svelte';
  import PaymentStep from '$lib/components/checkout/PaymentStep.svelte';
  import ConfirmationStep from '$lib/components/checkout/ConfirmationStep.svelte';
  import StepIndicator from '$lib/components/checkout/StepIndicator.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { checkoutStore } from '$lib/stores/checkout';
  import { cartStore } from '$lib/stores/cart';
  import type { CheckoutStep, CartItem, Address } from '$lib/types/checkout';

  // Estado atual do checkout
  let currentStep: CheckoutStep = 'cart';
  let loading = false;
  let error: string | null = null;

  // Dados do checkout
  let cartItems: CartItem[] = [];
  let selectedAddress: Address | null = null;
  let selectedPaymentMethod: string | null = null;
  let validationResult: any = null;
  let orderResult: any = null;

  const steps: CheckoutStep[] = ['cart', 'address', 'payment', 'confirmation'];
  
  const stepLabels = {
    cart: 'Carrinho',
    address: 'Endereço',
    payment: 'Pagamento',
    confirmation: 'Confirmação'
  };

  onMount(async () => {
    // Verificar se há itens no carrinho
    const cart = $cartStore;
    if (!cart.items || cart.items.length === 0) {
      await goto('/cart');
      return;
    }
    
    cartItems = cart.items;
    
    // Carregar dados salvos do carrinho avançado
    if (typeof window !== 'undefined') {
      const savedCheckoutData = sessionStorage.getItem('checkoutData');
      if (savedCheckoutData) {
        try {
          const checkoutData = JSON.parse(savedCheckoutData);
          
          // Usar dados de frete calculados no carrinho
          if (checkoutData.realCartTotals) {
            validationResult = {
              isValid: true,
              errors: [],
              items: cartItems,
              totals: {
                subtotal: checkoutData.realCartTotals.cartSubtotal,
                shipping: checkoutData.realCartTotals.totalShipping,
                discount: checkoutData.realCartTotals.totalDiscount,
                total: checkoutData.realCartTotals.cartTotal
              },
              couponCode: checkoutData.appliedCoupon?.code
            };
            
            checkoutStore.setValidation(validationResult);
          }
          
          // Se há CEP, criar endereço básico
          if (checkoutData.zipCode) {
            selectedAddress = {
              name: 'Endereço de entrega',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
              zipCode: checkoutData.zipCode
            };
          }
          
        } catch (error) {
          console.error('Erro ao carregar dados do checkout:', error);
        }
      }
    }
    
    // Inicializar store do checkout
    checkoutStore.initialize();
  });

  async function handleStepComplete(step: CheckoutStep, data: any) {
    loading = true;
    error = null;

    try {
      switch (step) {
        case 'cart':
          // Validar carrinho
          await validateCart(data);
          currentStep = 'address';
          break;
          
        case 'address':
          selectedAddress = data.address;
          checkoutStore.setAddress(data.address);
          currentStep = 'payment';
          break;
          
        case 'payment':
          selectedPaymentMethod = data.method;
          checkoutStore.setPaymentMethod(data.method);
          await createOrder(data);
          currentStep = 'confirmation';
          break;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro no checkout:', err);
    } finally {
      loading = false;
    }
  }

  async function validateCart(data: { items: CartItem[], couponCode?: string }) {
    // Se já temos validação dos dados do carrinho avançado, usar ela
    if (validationResult && validationResult.isValid) {
      console.log('Usando validação já calculada do carrinho avançado');
      return;
    }
    
    const response = await fetch('/api/checkout/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: data.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        zipCode: selectedAddress?.zipCode,
        couponCode: data.couponCode
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error.message);
    }

    validationResult = result.data;
    checkoutStore.setValidation(validationResult);
  }

  async function createOrder(paymentData: any) {
    // Primeiro criar o pedido
    const orderResponse = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        shippingAddress: selectedAddress,
        paymentMethod: selectedPaymentMethod,
        couponCode: validationResult?.couponCode,
        notes: paymentData.notes
      })
    });

    const orderResponseData = await orderResponse.json();
    
    if (!orderResponseData.success) {
      throw new Error(orderResponseData.error.message);
    }

    // Processar pagamento
    const paymentResponse = await fetch('/api/payments/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderResponseData.data.order.id,
        method: selectedPaymentMethod,
        paymentData: paymentData.paymentData
      })
    });

    const paymentResult = await paymentResponse.json();
    
    if (!paymentResult.success) {
      throw new Error(paymentResult.error.message);
    }

    orderResult = {
      order: orderResponseData.data.order,
      payment: paymentResult.data.payment
    };

    checkoutStore.setOrderResult(orderResult);
    
    // Limpar carrinho após sucesso
    cartStore.clear();
    
    // Limpar dados salvos do checkout
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('checkoutData');
    }
  }

  function goToStep(step: string) {
    const checkoutStep = step as CheckoutStep;
    if (steps.indexOf(checkoutStep) <= steps.indexOf(currentStep)) {
      currentStep = checkoutStep;
    }
  }

  function handleBack() {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      currentStep = steps[currentIndex - 1];
    }
  }
</script>

<svelte:head>
  <title>Checkout - Marketplace GDG</title>
  <meta name="description" content="Finalize sua compra de forma segura e rápida" />
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
      <p class="text-gray-600">Finalize sua compra de forma segura</p>
    </div>
    
    <!-- Indicador de Etapas -->
    <div class="mb-8">
      <StepIndicator 
        {steps} 
        {currentStep} 
        {stepLabels}
        onStepClick={goToStep}
                  />
                </div>
                
    <!-- Loading Overlay -->
    {#if loading}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 max-w-sm mx-4">
          <LoadingSpinner size="large" />
          <p class="text-center mt-4 text-gray-600">Processando...</p>
                </div>
              </div>
            {/if}
            
    <!-- Error Alert -->
    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            </div>
          <div class="ml-3">
            <p class="text-sm text-red-800">{error}</p>
          </div>
          <div class="ml-auto pl-3">
              <button
              class="text-red-400 hover:text-red-600"
              on:click={() => error = null}
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
              </button>
            </div>
          </div>
      </div>
    {/if}

    <!-- Conteúdo das Etapas -->
    <div class="bg-white shadow-lg rounded-lg overflow-hidden">
      
      {#if currentStep === 'cart'}
        <CartStep 
          items={cartItems}
          validation={validationResult}
          onComplete={(data) => handleStepComplete('cart', data)}
          {loading}
        />
      
      {:else if currentStep === 'address'}
        <AddressStep 
          selectedAddress={selectedAddress}
          onComplete={(data) => handleStepComplete('address', data)}
          onBack={handleBack}
          {loading}
        />
      
      {:else if currentStep === 'payment'}
        <PaymentStep 
          order={{
            items: cartItems,
            address: selectedAddress,
            totals: validationResult?.totals
          }}
          onComplete={(data) => handleStepComplete('payment', data)}
          onBack={handleBack}
          {loading}
        />
      
      {:else if currentStep === 'confirmation'}
        <ConfirmationStep 
          order={orderResult}
          onNewOrder={() => goto('/')}
        />
            {/if}
            
              </div>

    <!-- Footer -->
    <div class="mt-8 text-center text-sm text-gray-500">
      <p>Suas informações estão protegidas com criptografia SSL</p>
      <div class="flex justify-center items-center mt-2 space-x-4">
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
        </svg>
        <span>Compra 100% segura</span>
      </div>
    </div>
  </div>
</div> 

<style>
  /* Estilos adicionais se necessário */
</style> 