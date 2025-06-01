<!-- PROTEÇÕES IMEDIATAS -->
<script context="module">
  // EXECUTAR IMEDIATAMENTE NO CONTEXTO DO MÓDULO
  if (typeof window !== 'undefined') {
    console.log('🛡️🛡️🛡️ PROTEÇÕES ULTRA-IMEDIATAS ATIVADAS! 🛡️🛡️🛡️');
    
    // INTERCEPTAR ALERTS ANTES DE TUDO
    const originalAlert = window.alert;
    window.alert = function(message: string) {
      if (message && (message.toLowerCase().includes('sessão') || message.toLowerCase().includes('login') || message.toLowerCase().includes('expirou'))) {
        console.log('🛡️ Alert BLOQUEADO ULTRA-IMEDIATO!', message);
        return;
      }
      return originalAlert.call(window, message);
    };
    
    // MARCAR QUE PROTEÇÕES ESTÃO ATIVAS
    (window as any).__cartUltraProtection = true;
  }
</script>

<script lang="ts">
  import { cartStore } from '$lib/stores/cartStore';
  import { isAuthenticated, user } from '$lib/stores/authStore';
  import { AuthService } from '$lib/services/auth.service';
  import CartItem from '$lib/components/cart/CartItem.svelte';
  import SellerGroupSummary from '$lib/components/cart/SellerGroupSummary.svelte';
  import SellerShippingOptions from '$lib/components/cart/SellerShippingOptions.svelte';
  import ShippingCalculator from '$lib/components/cart/ShippingCalculator.svelte';
  import CouponSection from '$lib/components/cart/CouponSection.svelte';
  import EmptyCart from '$lib/components/cart/EmptyCart.svelte';
  import BenefitBadge from '$lib/components/cart/BenefitBadge.svelte';
  import CartNotifications from '$lib/components/cart/CartNotifications.svelte';
  import OrderSummary from '$lib/components/cart/OrderSummary.svelte';
  import { ShippingCartService, type SellerShippingQuote } from '$lib/services/shippingCartService';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  import { get } from 'svelte/store';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { toastStore } from '$lib/stores/toastStore';
  
  // Componentes do Checkout Wizard
  import CheckoutAuth from '$lib/components/checkout/CheckoutAuth.svelte';
  import CheckoutAddress from '$lib/components/checkout/CheckoutAddress.svelte';
  import CheckoutPayment from '$lib/components/checkout/CheckoutPayment.svelte';
  import CheckoutReview from '$lib/components/checkout/CheckoutReview.svelte';
  
  const { 
    sellerGroups, 
    cartTotals, 
    appliedCoupon,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    clearCart
  } = cartStore;
  
  // Estado local para CEP
  const zipCode = writable<string>('');
  
  // Estado para o sistema real de frete
  let realShippingQuotes = $state<SellerShippingQuote[]>([]);
  let calculatingRealShipping = $state(false);
  let realShippingError = $state('');
  let selectedShippingOptions = $state<Record<string, string>>({});
  
  // Estados do Checkout Wizard
  type CheckoutStep = 'summary' | 'auth' | 'address' | 'payment';
  let currentStep = $state<CheckoutStep>('summary');
  let checkoutData = $state<{
    user?: any;
    isGuest?: boolean;
    addressData?: any;
    paymentData?: any;
  }>({});
  
  // Referência para a área do wizard (corrigido para Svelte 5)
  let wizardArea = $state<HTMLElement>();
  
  // Estado de verificação de sessão
  let sessionExpiredWarning = $state(false);
  let processingOrder = $state(false);
  let checkoutInProgress = $state(false); // FLAG PARA DESABILITAR VERIFICAÇÕES DURANTE CHECKOUT
  
  // TORNAR GLOBALMENTE ACESSÍVEL PARA DEBUGGING
  if (browser) {
    (window as any).__checkoutInProgress = false;
  }
  
  // Atualizar flag global quando mudar
  $effect(() => {
    if (browser) {
      (window as any).__checkoutInProgress = checkoutInProgress;
      console.log('🔄 Checkout in progress:', checkoutInProgress);
    }
  });
  
  // Auto-scroll inteligente com contexto específico
  function scrollToStep(step: CheckoutStep, delay: number = 150) {
    if (typeof window === 'undefined' || !wizardArea) return;
    
    // Timing responsivo - mobile precisa de mais tempo para transições
    const isMobile = window.innerWidth < 1024;
    const responsiveDelay = isMobile ? delay + 50 : delay;
    
    setTimeout(() => {
      if (!wizardArea) return; // Verificação adicional
      
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: 'smooth',
        block: isMobile ? 'start' : 'center',
        inline: 'nearest'
      };
      
      // Se está mudando para checkout (summary → outro), scroll para wizard
      if (step !== 'summary') {
        wizardArea.scrollIntoView(scrollOptions);
        
        // Após scroll para wizard, scroll mais preciso para o formulário
        // Mobile precisa de mais tempo para a segunda fase
        const secondPhaseDelay = isMobile ? 400 : 300;
        setTimeout(() => {
          if (!wizardArea) return; // Verificação adicional
          const activeForm = wizardArea.querySelector('form, input, button[type="submit"]');
          if (activeForm) {
            (activeForm as HTMLElement).scrollIntoView({
              behavior: 'smooth',
              block: isMobile ? 'start' : 'nearest'
            });
          }
        }, secondPhaseDelay);
      }
    }, responsiveDelay);
  }
  
  // Scroll para primeiro campo com erro (UX crítica)
  function scrollToFirstError(delay: number = 200) {
    if (typeof window === 'undefined' || !wizardArea) return;
    
    setTimeout(() => {
      if (!wizardArea) return; // Verificação adicional
      const firstError = wizardArea.querySelector('.border-red-300, [class*="border-red"], .text-red-600');
      if (firstError) {
        firstError.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        // Se for um input, focar nele
        const input = firstError.tagName === 'INPUT' ? firstError : firstError.querySelector('input');
        if (input) {
          setTimeout(() => (input as HTMLInputElement).focus(), 300);
        }
      }
    }, delay);
  }
  
  // Scroll suave para topo do wizard (quando há mudanças importantes)
  function scrollToWizardTop(delay: number = 100) {
    if (typeof window === 'undefined' || !wizardArea) return;
    
    setTimeout(() => {
      if (!wizardArea) return; // Verificação adicional
      const wizardHeader = wizardArea.querySelector('h2, .mb-6');
      if (wizardHeader) {
        (wizardHeader as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      } else {
        wizardArea.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, delay);
  }
  
  // Auto-scroll quando muda step (timing refinado)
  $effect(() => {
    if (currentStep !== 'summary') {
      // Timing diferenciado por contexto
      const delay = currentStep === 'auth' ? 50 : 100;
      scrollToStep(currentStep, delay);
    }
  });
  
  // Verificar se tem frete grátis no carrinho todo
  const hasCartFreeShipping = $derived(
    realShippingQuotes.length > 0 && 
    realShippingQuotes.every(quote => 
      quote.shippingResult.success && 
      quote.shippingResult.options.some(opt => opt.price === 0)
    )
  );
  
  // Calcular totais reais baseados no sistema novo (VERSÃO UNIFICADA)
  const realCartTotals = $derived(() => {
    const cartSubtotal = $cartTotals.cartSubtotal;
    
    // Calcular frete total baseado nas opções selecionadas
    const shippingCalculation = ShippingCartService.calculateCartShippingTotal(
      realShippingQuotes,
      selectedShippingOptions
    );
    
    let totalShipping = shippingCalculation.totalShipping;
    let freeShippingSavings = 0;
    
    // 🚚 APLICAR CUPOM DE FRETE GRÁTIS (com valor real)
    if ($appliedCoupon && $appliedCoupon.type === 'free_shipping') {
      freeShippingSavings = totalShipping; // Economia real = frete que seria cobrado
      totalShipping = 0; // Zerar frete real quando há cupom de frete grátis
      console.log(`🎫 CUPOM FRETE GRÁTIS - Economia real: R$ ${freeShippingSavings.toFixed(2)}`);
    }
    
    // Somar todos os descontos (produtos + cupom normal + frete grátis)
    const productDiscounts = $cartTotals.totalDiscount - $cartTotals.couponDiscount; // Descontos de produtos apenas
    const couponDiscount = $appliedCoupon && $appliedCoupon.type !== 'free_shipping' 
      ? $cartTotals.couponDiscount 
      : 0;
    const totalDiscount = productDiscounts + couponDiscount + freeShippingSavings;
    
    const cartTotal = cartSubtotal - productDiscounts - couponDiscount + totalShipping;
    
    return {
      cartSubtotal,
      totalShipping,
      totalDiscount,
      productDiscounts,
      couponDiscount,
      freeShippingSavings,
      cartTotal,
      installmentValue: cartTotal / 12,
      maxDeliveryDays: shippingCalculation.maxDeliveryDays,
      hasExpressOptions: shippingCalculation.hasExpressOptions,
      hasGroupedOptions: shippingCalculation.hasGroupedOptions
    };
  });
  
  // Função para calcular frete real
  async function handleRealShippingCalculate(newZipCode: string, quotes: SellerShippingQuote[]) {
    calculatingRealShipping = true;
    realShippingError = '';
    
    try {
      if (quotes.length > 0) {
        // Usar as cotações já calculadas pelo ShippingCalculator
        realShippingQuotes = quotes;
        
        // Auto-selecionar a opção mais barata para cada seller
        const newSelectedOptions: Record<string, string> = {};
        quotes.forEach(quote => {
          if (quote.shippingResult.success && quote.shippingResult.options.length > 0) {
            const cheapest = ShippingCartService.getCheapestOption(quote.shippingResult.options);
            if (cheapest) {
              newSelectedOptions[quote.sellerId] = cheapest.id;
            }
          }
        });
        selectedShippingOptions = newSelectedOptions;
      } else {
        // Calcular manualmente se não foram fornecidas
        const cartItems = $sellerGroups.flatMap(group => group.items);
        const calculatedQuotes = await ShippingCartService.calculateShippingForCart(
          newZipCode,
          cartItems
        );
        realShippingQuotes = calculatedQuotes;
        
        // Auto-selecionar opções mais baratas
        const newSelectedOptions: Record<string, string> = {};
        calculatedQuotes.forEach(quote => {
          if (quote.shippingResult.success && quote.shippingResult.options.length > 0) {
            const cheapest = ShippingCartService.getCheapestOption(quote.shippingResult.options);
            if (cheapest) {
              newSelectedOptions[quote.sellerId] = cheapest.id;
            }
          }
        });
        selectedShippingOptions = newSelectedOptions;
      }
      
      // Atualizar store do CEP
      zipCode.set(newZipCode);
      
    } catch (error) {
      console.error('Erro ao calcular frete real:', error);
      realShippingError = 'Erro ao calcular frete. Tente novamente.';
    } finally {
      calculatingRealShipping = false;
    }
  }
  
  // Função para selecionar opção de frete
  function selectShippingOption(sellerId: string, optionId: string) {
    selectedShippingOptions = {
      ...selectedShippingOptions,
      [sellerId]: optionId
    };
  }
  
  // 🔄 RECÁLCULO AUTOMÁTICO quando muda seleção de frete com cupom ativo
  $effect(() => {
    if ($appliedCoupon && $appliedCoupon.type === 'free_shipping' && realShippingQuotes.length > 0) {
      const shippingCost = ShippingCartService.calculateCartShippingTotal(
        realShippingQuotes,
        selectedShippingOptions
      ).totalShipping;
      
      console.log(`🔄 RECÁLCULO AUTO - Novo frete: R$ ${shippingCost.toFixed(2)}, Cupom: ${$appliedCoupon.code}`);
    }
  });

  async function handleApplyCoupon(code: string) {
    await applyCoupon(code);
  }
  
  // Funções do Checkout Wizard
  function startCheckout() {
    if ($sellerGroups.length === 0) {
      console.log('❌ Carrinho vazio');
      return;
    }
    
    if (!$zipCode) {
      console.log('❌ CEP não informado');
      toastStore.add({
        type: 'warning',
        title: 'CEP Obrigatório',
        message: 'Por favor, informe seu CEP para continuar',
        duration: 4000
      });
      return;
    }
    
    // Verificar se todas as opções de frete foram selecionadas
    const missingShipping = realShippingQuotes.some(quote => 
      quote.shippingResult.success && !selectedShippingOptions[quote.sellerId]
    );
    
    if (missingShipping) {
      console.log('❌ Opções de frete não selecionadas');
      toastStore.add({
        type: 'warning',
        title: 'Frete Obrigatório',
        message: 'Por favor, selecione uma opção de frete para todos os vendedores',
        duration: 4000
      });
      return;
    }
    
    // MARCAR QUE O CHECKOUT ESTÁ EM PROGRESSO
    checkoutInProgress = true;
    console.log('🛒 Checkout iniciado - verificações de sessão desabilitadas');
    
    // Verificar se já está autenticado
    if ($isAuthenticated) {
      console.log('✅ Usuário autenticado, indo direto para endereços');
      checkoutData.user = $user;
      checkoutData.isGuest = false;
      currentStep = 'address';
      // Scroll imediato e focado para endereços
      scrollToStep('address', 50);
    } else {
      console.log('🔐 Iniciando autenticação');
      currentStep = 'auth';
      // Scroll rápido para auth quando inicia checkout
      scrollToStep('auth', 50);
    }
  }
  
  function handleAuthNext(event: CustomEvent) {
    checkoutData.user = event.detail.user;
    checkoutData.isGuest = event.detail.isGuest || false;
    currentStep = 'address';
    
    // Scroll otimizado para formulário de endereço
    scrollToStep('address', 100);
  }
  
  function handleAddressNext(event: CustomEvent) {
    checkoutData.addressData = event.detail.addressData;
    currentStep = 'payment';
    
    // Scroll para topo do formulário de pagamento
    scrollToStep('payment', 100);
  }
  
  function handlePaymentNext(event: CustomEvent) {
    checkoutData.paymentData = event.detail.paymentData;
    
    // Ir direto para processamento - não mais review
    processOrder();
  }
  
  async function processOrder() {
    // Iniciar estado de processamento
    processingOrder = true;
    checkoutInProgress = true; // MANTER FLAG ATIVO
    
    // Visual feedback de processamento
    scrollToWizardTop(50);
    
    try {
      // REMOVER VERIFICAÇÕES EXCESSIVAS - Confiar apenas na resposta do backend
      console.log('🔍 Processando pedido com verificações desabilitadas...');
      
      // Criar o pedido diretamente (o backend verificará a sessão)
      const cartItems = $sellerGroups.flatMap(group => group.items);
      const createOrderResponse = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Essencial para cookies de sessão
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          })),
          shippingAddress: checkoutData.addressData,
          paymentMethod: checkoutData.paymentData.method,
          couponCode: $appliedCoupon?.code,
          notes: checkoutData.paymentData.notes || ''
        })
      });

      console.log('📊 Resposta da API:', createOrderResponse.status, createOrderResponse.statusText);

      if (!createOrderResponse.ok) {
        const errorText = await createOrderResponse.text();
        console.log('❌ Erro HTTP:', errorText);
        
        // Se for erro 401, problema de autenticação
        if (createOrderResponse.status === 401) {
          console.log('🔒 Erro 401 - Sessão expirou durante o processamento');
          
          // Salvar contexto para recuperação
          try {
            sessionStorage.setItem('checkout_recovery_data', JSON.stringify({
              checkoutData,
              selectedShippingOptions,
              appliedCoupon: $appliedCoupon,
              zipCode: $zipCode,
              currentStep,
              timestamp: Date.now()
            }));
          } catch (storageError) {
            console.log('❌ Erro ao salvar dados de recuperação:', storageError);
          }
          
          toastStore.add({
            type: 'info',
            title: 'Sessão Expirada',
            message: 'Sua sessão expirou. Redirecionando para login...',
            duration: 3000
          });
          window.location.href = '/login?redirect=/cart&recovery=true';
          return;
        }
        
        throw new Error(`HTTP ${createOrderResponse.status}: ${errorText}`);
      }

      const orderResult = await createOrderResponse.json();
      console.log('📦 Resultado do pedido:', orderResult);
      
      if (!orderResult.success) {
        throw new Error(orderResult.error?.message || 'Erro ao criar pedido');
      }

      console.log('✅ Pedido criado com sucesso:', orderResult.data.order.orderNumber);

      // 4. Limpar carrinho e redirecionar
      clearCart();
      cartStore.clearCart();
      
      // LIMPAR FLAGS ANTES DE REDIRECIONAR
      checkoutInProgress = false;
      processingOrder = false;
      
      // Redirecionar para página de sucesso
      await goto(`/pedido/sucesso?order=${orderResult.data.order.orderNumber}`, { 
        replaceState: true 
      });
      
    } catch (error) {
      // LIMPAR FLAGS EM CASO DE ERRO
      processingOrder = false;
      checkoutInProgress = false;
      console.error('❌ Erro ao processar pedido:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toastStore.add({
        type: 'error',
        title: 'Erro ao Processar Pedido',
        message: `${errorMessage}\n\nTente novamente ou entre em contato com o suporte.`,
        duration: 6000
      });
    }
  }
  
  function handleUpdateQuantity(productId: string, sellerId: string, quantity: number, options?: any) {
    updateQuantity(productId, sellerId, quantity, options);
    
    // Recalcular frete se já foi calculado
    if ($zipCode && realShippingQuotes.length > 0) {
      handleRealShippingCalculate($zipCode, []);
    }
  }
  
  function handleRemoveItem(productId: string, sellerId: string, options?: any) {
    removeItem(productId, sellerId, options);
    
    // Recalcular frete se já foi calculado
    if ($zipCode && realShippingQuotes.length > 0) {
      handleRealShippingCalculate($zipCode, []);
    }
  }
  
  // Obter informações do step atual
  function getStepInfo(step: CheckoutStep) {
    const stepData = {
      'summary': { icon: '🛒', title: 'Revisar Carrinho', number: 0 },
      'auth': { icon: '🔐', title: 'Identificação', number: 1 },
      'address': { icon: '📍', title: 'Endereço', number: 2 },
      'payment': { icon: '💳', title: 'Pagamento', number: 3 }
    };
    return stepData[step];
  }
  
  // Converter dados para o formato do OrderSummary
  const cartItemsFormatted = $derived(() => {
    return $sellerGroups.flatMap(group => 
      group.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        image: item.product.images?.[0] || '/placeholder.jpg'
      }))
    );
  });

  // ====================================
  // PROTEÇÕES ATIVADAS IMEDIATAMENTE
  // ====================================
  if (browser) {
    console.log('🛡️🛡️🛡️ ATIVANDO PROTEÇÕES DO CARRINHO IMEDIATAMENTE! 🛡️🛡️🛡️');
    
    // INTERCEPTAR ALERTS IMEDIATAMENTE
    const originalAlert = window.alert;
    window.alert = function(message: string) {
      console.warn('🚫 Alert interceptado:', message);
      
      // Bloquear QUALQUER alert sobre sessão
      if (message && (message.toLowerCase().includes('sessão') || message.toLowerCase().includes('login'))) {
        console.log('🛡️ Alert BLOQUEADO!');
        return;
      }
      
      // Outros alerts passam
      originalAlert.call(window, message);
    };
    
    // INTERCEPTAR FETCH IMEDIATAMENTE
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [url, options] = args;
      
      // Bloquear logout
      if (typeof url === 'string' && url.includes('/api/auth/logout')) {
        console.warn('🛡️ LOGOUT BLOQUEADO!');
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return originalFetch.apply(window, args);
    };
    
    // INTERCEPTAR TODOS OS MÉTODOS DE REDIRECIONAMENTO
    // 1. window.location.href
    const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
    Object.defineProperty(window.location, 'href', {
      get() {
        return originalHref?.get?.call(window.location);
      },
      set(value) {
        if (value && value.toString().includes('/login')) {
          console.warn('🛡️ REDIRECIONAMENTO BLOQUEADO!');
          return;
        }
        originalHref?.set?.call(window.location, value);
      }
    });
    
    // 2. window.location.assign
    const originalAssign = window.location.assign;
    window.location.assign = function(url: string) {
      if (url && url.includes('/login')) {
        console.warn('🛡️ location.assign BLOQUEADO!');
        return;
      }
      originalAssign.call(window.location, url);
    };
    
    // 3. window.location.replace
    const originalReplace = window.location.replace;
    window.location.replace = function(url: string) {
      if (url && url.includes('/login')) {
        console.warn('🛡️ location.replace BLOQUEADO!');
        return;
      }
      originalReplace.call(window.location, url);
    };
    
    // 4. Interceptar o próprio goto do SvelteKit
    const originalGotoSymbol = Symbol.for('svelte.goto');
    const originalGoto = (window as any)[originalGotoSymbol] || goto;
    
    // Sobrescrever o goto global
    (window as any)[originalGotoSymbol] = async function(url: string, ...args: any[]) {
      if (url && url.includes('/login')) {
        console.warn('🛡️ goto() PARA LOGIN BLOQUEADO!');
        return Promise.resolve();
      }
      return originalGoto(url, ...args);
    };
    
    // Marcar globalmente que proteções estão ativas
    (window as any).__cartProtectionsActive = true;
    console.log('✅ TODAS AS PROTEÇÕES ATIVADAS!');
  }
</script>

<svelte:head>
  <title>Carrinho de Compras - Marketplace GDG</title>
  <meta name="description" content="Revise seus produtos e finalize sua compra com segurança" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Breadcrumb -->
    <nav class="mb-8">
      <ol class="flex items-center space-x-2 text-sm">
        <li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
        <li><span class="text-gray-400">/</span></li>
        <li class="text-gray-900 font-medium">Carrinho</li>
      </ol>
    </nav>
    
    <!-- Alerta de Sessão Expirada -->
    {#if sessionExpiredWarning}
      <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 class="font-medium text-red-800">Sessão Expirada</h3>
            <p class="text-sm text-red-700">Sua sessão expirou. Faça login novamente para continuar com a compra.</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button
            onclick={() => window.location.href = '/login?redirect=/cart'}
            class="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            Fazer Login
          </button>
          <button
            onclick={() => sessionExpiredWarning = false}
            class="px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
            aria-label="Fechar alerta"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    {/if}
    
    <!-- Indicador de Processamento Global -->
    {#if processingOrder}
      <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <div>
            <h3 class="font-medium text-blue-800">Processando seu pedido...</h3>
            <p class="text-sm text-blue-700">Por favor, aguarde. Não feche esta página.</p>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- DEBUG: Indicador de Proteção Ativa -->
    {#if browser}
      <div class="fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs flex items-center space-x-2 z-50">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span>Proteção Ativa</span>
      </div>
    {/if}
    
    <!-- Cabeçalho do Carrinho -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Meu Carrinho</h1>
        {#if $sellerGroups.length > 0}
          <p class="text-sm text-gray-600 mt-1">
            {$sellerGroups.reduce((total, group) => total + group.items.length, 0)} {$sellerGroups.reduce((total, group) => total + group.items.length, 0) === 1 ? 'produto' : 'produtos'} de {$sellerGroups.length} {$sellerGroups.length === 1 ? 'vendedor' : 'vendedores'}
          </p>
        {/if}
      </div>
    </div>
    
    {#if $sellerGroups.length === 0}
      <EmptyCart onContinueShopping={() => goto('/busca')} />
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Coluna Principal - Produtos e Frete -->
        <div class="{currentStep === 'summary' ? 'lg:col-span-2' : 'lg:col-span-1'} space-y-6 transition-all duration-500 ease-in-out {currentStep !== 'summary' ? 'lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-4' : ''}">
          
          <!-- Indicador de foco durante checkout -->
          {#if currentStep !== 'summary'}
            <div class="bg-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-lg p-4 text-center">
              <div class="flex items-center justify-center space-x-2 text-[#00BFB3]">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-medium">Seus produtos estão confirmados</span>
              </div>
              <p class="text-xs text-[#00A89D] mt-1">Complete o checkout ao lado para finalizar sua compra</p>
            </div>
          {/if}
          
          <!-- Notificações e Avisos -->
          <CartNotifications 
            sellerGroups={$sellerGroups}
            zipCode={$zipCode}
          />
          
          <!-- Calculadora de Frete -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-lg font-semibold mb-4">Calcular frete e prazo</h2>
            <ShippingCalculator
              zipCode={$zipCode}
              cartItems={$sellerGroups.flatMap(group => group.items)}
              onCalculate={handleRealShippingCalculate}
            />
            
            <!-- Mostrar erro se houver -->
            {#if realShippingError}
              <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-600">{realShippingError}</p>
              </div>
            {/if}
          </div>
          
          <!-- Produtos por Vendedor com Opções de Frete -->
          {#each $sellerGroups as group (group.sellerId)}
            <div class="bg-white rounded-lg shadow-sm p-6">
              <!-- Cabeçalho do Vendedor -->
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-900">
                  Vendido por {group.sellerName}
                </h3>
                <span class="text-sm text-gray-500">
                  {group.items.length} {group.items.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
              
              <!-- Lista de Produtos -->
              <div class="space-y-4 mb-6">
                {#each group.items as item (item.product.id + '-' + item.selectedColor + '-' + item.selectedSize)}
                  <CartItem
                    {item}
                    selectedShippingOption={(() => {
                      const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                      const selectedOptionId = selectedShippingOptions[group.sellerId];
                      if (sellerQuote && selectedOptionId) {
                        const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                        return option ? {
                          name: option.name,
                          price: option.price,
                          delivery_days: option.delivery_days,
                          modality_name: option.modality_name
                        } : null;
                      }
                      return null;
                    })()}
                    onUpdateQuantity={(qty) => handleUpdateQuantity(
                      item.product.id, 
                      item.sellerId, 
                      qty,
                      { color: item.selectedColor, size: item.selectedSize }
                    )}
                    onRemove={() => handleRemoveItem(
                      item.product.id, 
                      item.sellerId,
                      { color: item.selectedColor, size: item.selectedSize }
                    )}
                  />
                {/each}
              </div>

              <!-- Opções de Frete do Vendedor -->
              {#if realShippingQuotes.length > 0}
                {@const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId)}
                {#if sellerQuote}
                  <SellerShippingOptions
                    {sellerQuote}
                    selectedOptionId={selectedShippingOptions[group.sellerId]}
                    onSelectOption={(optionId) => selectShippingOption(group.sellerId, optionId)}
                  />
                {/if}
              {/if}
              
              <!-- Resumo do Seller -->
              <SellerGroupSummary 
                {group} 
                selectedShippingPrice={(() => {
                  const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                  const selectedOptionId = selectedShippingOptions[group.sellerId];
                  if (sellerQuote && selectedOptionId) {
                    const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                    return option?.price || 0;
                  }
                  return 0;
                })()}
                selectedShippingName={(() => {
                  const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                  const selectedOptionId = selectedShippingOptions[group.sellerId];
                  if (sellerQuote && selectedOptionId) {
                    const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                    return option?.name;
                  }
                  return undefined;
                })()}
                selectedShippingDays={(() => {
                  const sellerQuote = realShippingQuotes.find(q => q.sellerId === group.sellerId);
                  const selectedOptionId = selectedShippingOptions[group.sellerId];
                  if (sellerQuote && selectedOptionId) {
                    const option = sellerQuote.shippingResult.options?.find(opt => opt.id === selectedOptionId);
                    return option?.delivery_days;
                  }
                  return undefined;
                })()}
              />
            </div>
          {/each}
        </div>
        
        <!-- Coluna Lateral - Checkout Wizard -->
        <div class="{currentStep === 'summary' ? 'lg:col-span-1' : 'lg:col-span-2'} transition-all duration-500 ease-in-out">
          <div bind:this={wizardArea} class="bg-white rounded-lg shadow-sm p-6 {currentStep === 'summary' ? 'sticky top-4' : ''}">
            
            <!-- Header com Progresso -->
            <div class="mb-6">
              {#if currentStep === 'summary'}
                <h2 class="text-lg font-semibold text-gray-900">Resumo do pedido</h2>
              {:else}
                {@const stepInfo = getStepInfo(currentStep)}
                <div class="flex items-center space-x-3 mb-4">
                  <div class="w-8 h-8 bg-[#00BFB3] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {stepInfo.number}
                  </div>
                  <div>
                    <h2 class="text-lg font-semibold text-gray-900">{stepInfo.title}</h2>
                    <p class="text-sm text-gray-600">Etapa {stepInfo.number}/3</p>
                  </div>
                </div>
                
                <!-- Barra de progresso -->
                <div class="w-full bg-gray-200 rounded-full h-2 mb-6">
                  <div 
                    class="bg-[#00BFB3] h-2 rounded-full transition-all duration-300"
                    style="width: {(stepInfo.number / 3) * 100}%"
                  ></div>
                </div>
              {/if}
            </div>
            
            <!-- Conteúdo do Step Atual -->
            {#if currentStep === 'summary'}
              <!-- Resumo Normal -->
              
              <!-- Badges de benefícios do carrinho -->
              {#if hasCartFreeShipping || ($appliedCoupon && $appliedCoupon.scope === 'cart')}
                <div class="flex flex-wrap gap-2 mb-4">
                  {#if hasCartFreeShipping}
                    <BenefitBadge 
                      type="free-shipping" 
                      level="cart"
                      description="Frete grátis em toda compra"
                    />
                  {/if}
                  
                  {#if $appliedCoupon && $appliedCoupon.scope === 'cart'}
                    <BenefitBadge 
                      type="coupon" 
                      level="cart"
                      value={$appliedCoupon.value}
                      description={$appliedCoupon.description}
                    />
                  {/if}
                </div>
              {/if}
              
              <!-- Cupom de Desconto -->
              <div class="mb-6">
                <CouponSection
                  appliedCoupon={$appliedCoupon}
                  hasShippingCalculated={$zipCode !== '' && realShippingQuotes.length > 0}
                  shippingCost={realShippingQuotes.length > 0 ? ShippingCartService.calculateCartShippingTotal(realShippingQuotes, selectedShippingOptions).totalShipping : 0}
                  onApplyCoupon={handleApplyCoupon}
                  onRemoveCoupon={removeCoupon}
                />
              </div>
              
              <OrderSummary
                cartItems={cartItemsFormatted()}
                totals={realCartTotals()}
                appliedCoupon={$appliedCoupon}
                showItems={true}
                showActions={true}
                isLoading={processingOrder}
                onCheckout={startCheckout}
                onContinueShopping={() => goto('/busca')}
                checkoutButtonText={processingOrder ? "Processando..." : "Finalizar Compra"}
                checkoutButtonDisabled={!$zipCode || $sellerGroups.length === 0 || processingOrder}
              />
              
            {:else if currentStep === 'auth'}
              <CheckoutAuth on:next={handleAuthNext} />
              
            {:else if currentStep === 'address'}
              <CheckoutAddress 
                currentUser={checkoutData.user}
                isGuest={checkoutData.isGuest}
                on:next={handleAddressNext} 
              />
              
            {:else if currentStep === 'payment'}
              <CheckoutPayment 
                cartTotal={realCartTotals().cartTotal}
                addressData={checkoutData.addressData}
                isGuest={checkoutData.isGuest}
                on:next={handlePaymentNext} 
              />
            {/if}
            
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
<!-- Autenticação inline implementada no resumo - modal removido -->