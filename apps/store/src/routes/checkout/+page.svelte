<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import AddressManager from '$lib/components/address/AddressManager.svelte';
  import OrderSummary from '$lib/components/cart/OrderSummary.svelte';
  import CheckoutAuth from '$lib/components/checkout/CheckoutAuth.svelte';
  import CheckoutAddress from '$lib/components/checkout/CheckoutAddress.svelte';
  import { advancedCartStore } from '$lib/features/cart';
  import { isAuthenticated, user } from '$lib/stores/authStore';
  import type { CartItem, Address } from '$lib/types/checkout';
  import { toastStore } from '$lib/stores/toastStore';
  import { usePricing } from '$lib/stores/pricingStore';

  // Desestruturar o advancedCartStore
  const { sellerGroups, cartTotals, clearCart } = advancedCartStore;
  
  // Sistema de pricing dinâmico
  const pricing = usePricing();
  let pricingConfig = $state<any>(null);

  // Estado do checkout
  let loading = false;
  let error: string | null = null;
  let currentStep: 'auth' | 'address' | 'payment' = 'auth';
  let isGuest = false;
  
  // Dados do carrinho e checkout
  let cartItems: CartItem[] = [];
  let checkoutData: any = null;
  let orderResult: any = null;
  
  // Estado de endereços
  let addressMode: 'select' | 'new' = 'select';
  let selectedAddress: Address | null = null;
  let showAddressManager = false;
  let userAddresses: Address[] = [];
  let loadingAddresses = false;
  
  // Formulário de endereço
  let addressForm: Address = {
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  };
  
  // Validação de endereço
  let addressErrors: Record<string, string> = {};
  let loadingCep = false;
  
  // Estados de pagamento
  let selectedPaymentMethod = 'pix';
  let cardData = {
    number: '',
    name: '',
    expiry: '',
    cvv: '',
    installments: 1
  };
  let notes = '';
  
  // Estados brasileiros
  const states = [
    { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' }, { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' }, { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
  ];
  
  const paymentMethods = $derived([
    { id: 'pix', name: 'PIX', description: 'Pagamento instantâneo com 5% de desconto', icon: '💲', discount: 5 },
    { id: 'credit_card', name: 'Cartão de Crédito', description: `Até ${pricingConfig?.installments_default || 12}x sem juros`, icon: '💳', discount: 0 },
    { id: 'debit_card', name: 'Cartão de Débito', description: 'Débito à vista', icon: '💳', discount: 0 },
    { id: 'boleto', name: 'Boleto Bancário', description: 'Vence em 3 dias úteis', icon: '🏦', discount: 0 }
  ]);

  onMount(async () => {
    // Carregar configurações de pricing
    pricing.getConfig().then(config => {
      if (config) {
        pricingConfig = config;
      }
    }).catch(() => {
      console.warn('Falha ao carregar configurações de pricing, usando valores padrão');
    });
    
    // RECUPERAÇÃO: Verificar se há dados salvos de sessão expirada
    await recoverCheckoutData();
    
    // Verificar se há itens no carrinho
    const groups = $sellerGroups;
    if (!groups || groups.length === 0) {
      await goto('/cart');
      return;
    }
    
    // Converter items dos grupos para format compatível
    cartItems = groups.flatMap(group => 
      group.items.map((item: any) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        image: item.product.images?.[0] || '/placeholder.jpg',
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
        sellerName: group.sellerName || 'Marketplace GDG'
      }))
    );
    
    // Definir step inicial baseado na autenticação
    if ($isAuthenticated) {
      console.log('✅ Usuário já autenticado, indo para endereços');
      currentStep = 'address';
      await loadUserAddresses();
      addressMode = userAddresses.length > 0 ? 'select' : 'new';
    } else {
      console.log('🔐 Usuário não autenticado, mostrando opções de login');
      currentStep = 'auth';
    }
    
    // Carregar dados salvos do carrinho
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('checkoutData');
      if (savedData) {
        try {
          checkoutData = JSON.parse(savedData);
          
          // Pré-preencher CEP se disponível
          if (checkoutData.zipCode) {
            addressForm.zipCode = checkoutData.zipCode;
            await searchCep();
          }
        } catch (error) {
          console.error('Erro ao carregar dados do checkout:', error);
        }
      }
    }
  });
  
  // FUNÇÃO DE RECUPERAÇÃO DE DADOS
  async function recoverCheckoutData() {
    if (typeof window === 'undefined') return;
    
    try {
      const recoveryData = sessionStorage.getItem('checkout_recovery_data');
      if (!recoveryData) return;
      
      const parsed = JSON.parse(recoveryData);
      const timeDiff = Date.now() - parsed.timestamp;
      
      // Se os dados são muito antigos (mais de 30 minutos), ignorar
      if (timeDiff > 30 * 60 * 1000) {
        sessionStorage.removeItem('checkout_recovery_data');
        return;
      }
      
      console.log('🔄 Recuperando dados do checkout após reautenticação...');
      
      // Restaurar dados do checkout
      if (parsed.checkoutData) {
        checkoutData = parsed.checkoutData;
        
        // Restaurar dados de endereço se havia
        if (parsed.checkoutData.addressData) {
          addressForm = { ...addressForm, ...parsed.checkoutData.addressData };
        }
      }
      
      // Restaurar step atual (mas não voltar para auth se já estiver logado)
      if ($isAuthenticated && parsed.currentStep && parsed.currentStep !== 'auth') {
        currentStep = parsed.currentStep;
      }
      
      // Mostrar mensagem de recuperação bem-sucedida
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          toastStore.add({
            type: 'success',
            title: 'Dados Recuperados',
            message: 'Dados do checkout recuperados! Você pode continuar de onde parou.',
            duration: 4000
          });
        }
      }, 1000);
      
      // Remover dados de recuperação após usar
      sessionStorage.removeItem('checkout_recovery_data');
      
    } catch (error) {
      console.error('❌ Erro ao recuperar dados do checkout:', error);
      // Remover dados corrompidos
      sessionStorage.removeItem('checkout_recovery_data');
    }
  }
  
  // Função para carregar endereços do usuário
  async function loadUserAddresses() {
    if (!$isAuthenticated) return;
    
    loadingAddresses = true;
    try {
      const response = await fetch('/api/addresses');
      const data = await response.json();
      
      if (data.success) {
        userAddresses = data.data || [];
      } else {
        console.error('Erro ao carregar endereços:', data.error);
        userAddresses = [];
      }
    } catch (error) {
      console.error('Erro ao carregar endereços:', error);
      userAddresses = [];
    } finally {
      loadingAddresses = false;
    }
  }
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  function calculateSubtotal(): number {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
  
  function getShippingCost(): number {
    return checkoutData?.realCartTotals?.totalShipping || 15.90;
  }
  
  function getDiscount(): number {
    let discount = checkoutData?.realCartTotals?.totalDiscount || 0;
    
    // Adicionar desconto PIX se selecionado
    if (selectedPaymentMethod === 'pix') {
      const method = paymentMethods.find(m => m.id === 'pix');
      if (method) {
        discount += calculateSubtotal() * (method.discount / 100);
      }
    }
    
    return discount;
  }
  
  function calculateTotal(): number {
    return calculateSubtotal() + getShippingCost() - getDiscount();
  }
  
  // Buscar CEP
  async function searchCep() {
    const cleanCep = addressForm.zipCode.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    loadingCep = true;
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        addressForm.street = data.logradouro || addressForm.street;
        addressForm.neighborhood = data.bairro || addressForm.neighborhood;
        addressForm.city = data.localidade || addressForm.city;
        addressForm.state = data.uf || addressForm.state;
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      loadingCep = false;
    }
  }
  
  function maskCep(value: string): string {
    return value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
  }
  
  function handleCepInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const masked = maskCep(target.value);
    addressForm.zipCode = masked;
    target.value = masked;
    
    if (masked.replace(/\D/g, '').length === 8) {
      searchCep();
    }
  }
  
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
  
  function validateAddress(): boolean {
    addressErrors = {};
    
    if (!addressForm.name.trim()) addressErrors.name = 'Nome é obrigatório';
    if (!addressForm.zipCode.trim() || addressForm.zipCode.replace(/\D/g, '').length !== 8) {
      addressErrors.zipCode = 'CEP deve ter 8 dígitos';
    }
    if (!addressForm.street.trim()) addressErrors.street = 'Logradouro é obrigatório';
    if (!addressForm.number.trim()) addressErrors.number = 'Número é obrigatório';
    if (!addressForm.neighborhood.trim()) addressErrors.neighborhood = 'Bairro é obrigatório';
    if (!addressForm.city.trim()) addressErrors.city = 'Cidade é obrigatória';
    if (!addressForm.state.trim()) addressErrors.state = 'Estado é obrigatório';
    
    return Object.keys(addressErrors).length === 0;
  }
  
  function proceedToPayment() {
    if (validateAddress()) {
      currentStep = 'payment';
    }
  }
  
  function getInstallmentOptions() {
    const total = calculateTotal();
    const options = [];
    const maxInstallments = pricingConfig?.installments_max || 12;
    const minValue = pricingConfig?.installments_min_value || 10;
    
    for (let i = 1; i <= maxInstallments; i++) {
      const value = total / i;
      if (value >= minValue) {
        options.push({
          number: i,
          value,
          text: i === 1 ? `À vista ${formatCurrency(total)}` : `${i}x de ${formatCurrency(value)} sem juros`
        });
      }
    }
    
    return options;
  }
  
  async function handleFinalizeOrder() {
    loading = true;
    error = null;
    
    try {
      // Criar pedido
      const orderResponse = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          })),
          shippingAddress: addressForm,
          paymentMethod: selectedPaymentMethod,
          couponCode: checkoutData?.appliedCoupon?.code,
          notes
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.error.message);
      }

      // Processar pagamento
      let paymentData: any = {};
      
      switch (selectedPaymentMethod) {
        case 'pix':
          paymentData = { pixKey: 'marketplace@exemplo.com' };
          break;
        case 'credit_card':
        case 'debit_card':
          paymentData = {
            cardToken: `token_${Date.now()}`,
            installments: cardData.installments,
            cardName: cardData.name,
            cardLast4: cardData.number.slice(-4)
          };
          break;
        case 'boleto':
          paymentData = {
            customerDocument: '000.000.000-00',
            customerName: addressForm.name
          };
          break;
      }

      const paymentResponse = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.data.order.id,
          method: selectedPaymentMethod,
          paymentData
        })
      });

      const paymentResult = await paymentResponse.json();
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error.message);
      }

      // Preparar dados completos para a página de sucesso
      orderResult = {
        order: {
          ...orderData.data.order,
          items: cartItems.map((item: any) => ({
            product: {
              id: item.productId,
              name: item.productName,
              price: item.price,
              images: [item.image]
            },
            quantity: item.quantity,
            selectedColor: item.selectedColor || null,
            selectedSize: item.selectedSize || null,
            sellerName: item.sellerName || 'Marketplace GDG'
          })),
          address: addressForm,
          shipping: {
            option: 'Entrega Padrão',
            deliveryDays: 5
          },
          totals: {
            subtotal: calculateSubtotal(),
            shipping: getShippingCost(),
            discount: getDiscount(),
            total: calculateTotal()
          }
        },
        payment: {
          ...paymentResult.data.payment,
          method: selectedPaymentMethod,
          paymentData: paymentData
        }
      };
      
      // Limpar dados e redirecionar para confirmação
      clearCart();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('checkoutData');
        console.log('💾 Salvando orderResult no sessionStorage:', orderResult);
        sessionStorage.setItem('orderResult', JSON.stringify(orderResult));
        console.log('✅ orderResult salvo com sucesso!');
      }
      
      await goto(`/pedido/sucesso?order=${orderData.data.order.orderNumber}`);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
    } finally {
      loading = false;
    }
  }
  
  // Funções para gerenciar endereços
  function handleAddressSelected(event: CustomEvent) {
    const { address } = event.detail;
    selectedAddress = address;
    
    // Preencher formulário com dados do endereço selecionado
    addressForm = {
      name: address.name,
      street: address.street,
      number: address.number,
      complement: address.complement || '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode
    };
    
    showAddressManager = false;
  }
  
  function selectNewAddress() {
    addressMode = 'new';
    selectedAddress = null;
    addressForm = {
      name: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    };
  }
  
  function selectSavedAddress() {
    // Verificar se há endereços carregados
    if (userAddresses.length === 0) {
      // Recarregar endereços se necessário
      loadUserAddresses().then(() => {
        if (userAddresses.length > 0) {
          addressMode = 'select';
          showAddressManager = true;
        } else {
          // Se ainda não há endereços, ir para novo endereço
          addressMode = 'new';
        }
      });
    } else {
      addressMode = 'select';
      showAddressManager = true;
    }
  }

  async function saveCurrentAddress() {
    if (!$isAuthenticated || !$user?.id) return;
    
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addressForm.name,
          street: addressForm.street,
          number: addressForm.number,
          complement: addressForm.complement,
          neighborhood: addressForm.neighborhood,
          city: addressForm.city,
          state: addressForm.state,
          zipCode: addressForm.zipCode.replace(/\D/g, ''),
          label: `Endereço ${userAddresses.length + 1}`,
          type: 'shipping'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Recarregar lista de endereços
        await loadUserAddresses();
        // Exibir mensagem de sucesso
        console.log('✅ Endereço salvo com sucesso!');
      } else {
        console.error('Erro ao salvar endereço:', result.error);
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    }
  }

  // Funções para o fluxo de autenticação
  async function handleAuthNext(event: CustomEvent) {
    const { user: authUser, isGuest: guestMode } = event.detail;
    
    if (guestMode) {
      console.log('👤 Usuário escolheu checkout como convidado');
      isGuest = true;
      currentStep = 'address';
      addressMode = 'new';
    } else if (authUser) {
      console.log('✅ Login bem-sucedido, carregando endereços...');
      isGuest = false;
      currentStep = 'address';
      await loadUserAddresses();
      addressMode = userAddresses.length > 0 ? 'select' : 'new';
    }
  }
  
  // Função para avançar do endereço para pagamento
  function handleAddressNext(event: CustomEvent) {
    const { address, addressData } = event.detail;
    
    if (address) {
      selectedAddress = address;
    }
    
    // Copiar dados do endereço para o formulário
    addressForm = { ...addressData };
    
    console.log('📍 Endereço confirmado, indo para pagamento');
    currentStep = 'payment';
  }
</script>

<svelte:head>
  <title>Finalizar Compra - Marketplace GDG</title>
  <meta name="description" content="Complete sua compra de forma rápida e segura" />
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- Header -->
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Finalizar Compra</h1>
      <p class="text-gray-600">Complete seus dados e finalize seu pedido</p>
    </div>
    
    <!-- Progress indicator -->
    <div class="mb-8">
      <div class="flex items-center justify-center space-x-4">
        <!-- Step 1: Auth -->
        <div class="flex items-center">
          <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${currentStep === 'auth' ? 'bg-[#00BFB3] text-white' : 
                        currentStep === 'address' || currentStep === 'payment' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            {currentStep === 'address' || currentStep === 'payment' ? '✓' : '1'}
          </div>
          <span class={`ml-2 text-sm font-medium ${currentStep === 'auth' ? 'text-[#00BFB3]' : 
                      currentStep === 'address' || currentStep === 'payment' ? 'text-green-600' : 'text-gray-500'}`}>
            {$isAuthenticated || isGuest ? 'Autenticado' : 'Login'}
          </span>
        </div>
        
        <div class={`w-16 h-1 ${currentStep === 'address' || currentStep === 'payment' ? 'bg-[#00BFB3]' : 'bg-gray-300'}`}></div>
        
        <!-- Step 2: Address -->
        <div class="flex items-center">
          <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${currentStep === 'address' ? 'bg-[#00BFB3] text-white' : 
                        currentStep === 'payment' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            {currentStep === 'payment' ? '✓' : '2'}
          </div>
          <span class={`ml-2 text-sm font-medium ${currentStep === 'address' ? 'text-[#00BFB3]' : 
                      currentStep === 'payment' ? 'text-green-600' : 'text-gray-500'}`}>
            Endereço
          </span>
        </div>
        
        <div class={`w-16 h-1 ${currentStep === 'payment' ? 'bg-[#00BFB3]' : 'bg-gray-300'}`}></div>
        
        <!-- Step 3: Payment -->
        <div class="flex items-center">
          <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${currentStep === 'payment' ? 'bg-[#00BFB3] text-white' : 'bg-gray-300 text-gray-600'}`}>
            3
          </div>
          <span class={`ml-2 text-sm font-medium ${currentStep === 'payment' ? 'text-[#00BFB3]' : 'text-gray-500'}`}>
            Pagamento
          </span>
        </div>
      </div>
    </div>
    
    <!-- Error Alert -->
    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div class="ml-3">
            <p class="text-sm text-red-800">{error}</p>
          </div>
          <div class="ml-auto">
            <button class="text-red-400 hover:text-red-600" onclick={() => error = null} aria-label="Fechar mensagem de erro">
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    {/if}
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Formulário Principal -->
      <div class="lg:col-span-2">
        
        {#if currentStep === 'auth'}
          <!-- Etapa de Autenticação -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-6">Como você quer continuar?</h2>
            <CheckoutAuth on:next={handleAuthNext} />
          </div>
          
        {:else if currentStep === 'address'}
          <!-- Etapa de Endereço -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-6">Endereço de Entrega</h2>
            <CheckoutAddress 
              currentUser={$user} 
              isGuest={isGuest}
              on:next={handleAddressNext} 
            />
          </div>
          
        {:else if currentStep === 'payment'}
          <!-- Formulário de Pagamento -->
          <div class="bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-6">Forma de Pagamento</h2>
            
            <!-- Métodos de Pagamento -->
            <div class="space-y-3 mb-6">
              {#each paymentMethods as method}
                <label 
                  class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-[#00BFB3]/50
                         {selectedPaymentMethod === method.id ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-200'}"
                >
                  <input
                    type="radio"
                    bind:group={selectedPaymentMethod}
                    value={method.id}
                    class="w-4 h-4 text-[#00BFB3] focus:ring-[#00BFB3]"
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
            {#if selectedPaymentMethod === 'credit_card' || selectedPaymentMethod === 'debit_card'}
              <div class="border-t pt-6 space-y-4">
                <h3 class="text-lg font-semibold text-gray-900">
                  Dados do {selectedPaymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                </h3>
                
                <div>
                  <label for="card-number" class="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <input
                    id="card-number"
                    type="text"
                    value={cardData.number}
                    oninput={handleCardNumberInput}
                    placeholder="0000 0000 0000 0000"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                    maxlength="19"
                  />
                </div>
                
                <div>
                  <label for="card-name" class="block text-sm font-medium text-gray-700 mb-1">
                    Nome no Cartão
                  </label>
                  <input
                    id="card-name"
                    type="text"
                    bind:value={cardData.name}
                    placeholder="Como está no cartão"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="card-expiry" class="block text-sm font-medium text-gray-700 mb-1">
                      Validade
                    </label>
                    <input
                      id="card-expiry"
                      type="text"
                      value={cardData.expiry}
                      oninput={handleExpiryInput}
                      placeholder="MM/AA"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      maxlength="5"
                    />
                  </div>
                  
                  <div>
                    <label for="card-cvv" class="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      id="card-cvv"
                      type="text"
                      bind:value={cardData.cvv}
                      placeholder="000"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      maxlength="4"
                    />
                  </div>
                </div>
                
                {#if selectedPaymentMethod === 'credit_card'}
                  <div>
                    <label for="card-installments" class="block text-sm font-medium text-gray-700 mb-1">
                      Parcelas
                    </label>
                    <select
                      id="card-installments"
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
            {/if}
            
            <!-- Observações -->
            <div class="mt-6">
              <label for="order-notes" class="block text-sm font-medium text-gray-700 mb-1">
                Observações (opcional)
              </label>
              <textarea
                id="order-notes"
                bind:value={notes}
                placeholder="Observações sobre o pedido ou entrega..."
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
              ></textarea>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Resumo do Pedido -->
      <div class="lg:col-span-1">
        <OrderSummary
          cartItems={cartItems.map(item => ({
            productId: item.productId || '',
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          }))}
          totals={{
            cartSubtotal: calculateSubtotal(),
            totalShipping: getShippingCost(),
            totalDiscount: getDiscount(),
            cartTotal: calculateTotal(),
            installmentValue: calculateTotal() / 12
          }}
          appliedCoupon={checkoutData?.appliedCoupon}
          showItems={true}
          showActions={true}
          isLoading={loading}
          onCheckout={currentStep === 'address' ? proceedToPayment : handleFinalizeOrder}
          onContinueShopping={() => window.location.href = '/cart'}
          checkoutButtonText={currentStep === 'address' ? 'Continuar para Pagamento' : `Finalizar Pedido`}
          checkoutButtonDisabled={currentStep === 'address' ? false : loading}
        />
        
        {#if currentStep === 'payment'}
          <!-- Endereço de Entrega Confirmado -->
          {#if addressForm.name}
            <div class="mt-4 bg-white rounded-lg shadow-sm p-4">
              <h4 class="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <svg class="w-4 h-4 mr-2 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Entregar em:
              </h4>
              <div class="text-sm text-gray-700 space-y-1">
                <p class="font-semibold">{addressForm.name}</p>
                <p>{addressForm.street}, {addressForm.number}</p>
                {#if addressForm.complement}
                  <p>{addressForm.complement}</p>
                {/if}
                <p>{addressForm.neighborhood} - {addressForm.city}/{addressForm.state}</p>
                <p>CEP: {addressForm.zipCode}</p>
              </div>
              <button
                onclick={() => currentStep = 'address'}
                class="mt-2 text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium"
              >
                Alterar endereço
              </button>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Modal de Seleção de Endereços -->
{#if showAddressManager && $isAuthenticated}
  <div 
    class="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50" 
    onclick={() => showAddressManager = false}
    onkeydown={(e) => e.key === 'Escape' && (showAddressManager = false)}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div 
        class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6"
        role="document"
      >
        <div class="mb-4 flex items-center justify-between">
          <h3 id="modal-title" class="text-lg font-medium text-gray-900">Selecionar Endereço</h3>
          <button 
            onclick={() => showAddressManager = false}
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal de seleção de endereços"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <AddressManager
          userId={$user?.id}
          addressType="shipping"
          mode="select"
          showHistory={false}
          on:addressSelected={handleAddressSelected}
        />
      </div>
    </div>
  </div>
{/if} 