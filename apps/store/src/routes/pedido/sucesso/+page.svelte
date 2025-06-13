<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, user } from '$lib/stores/authStore';
  
  let orderNumber = '';
  let loading = true;
  let orderDetails: any = null;
  let isGuestOrder = false;
  
  onMount(async () => {
    
    orderNumber = $page.url.searchParams.get('order') || '';
    
    if (!orderNumber) {
      goto('/');
      return;
    }
    
    // Primeiro tentar buscar do sessionStorage
    if (typeof window !== 'undefined') {
      const savedResult = sessionStorage.getItem('orderResult');
      
      if (savedResult) {
        try {
          const sessionData = JSON.parse(savedResult);
          
          // Usar dados do sessionStorage se disponíveis
          if (sessionData.order) {
            orderDetails = sessionData.order;
          }
        } catch (e) {
        }
      }
    }
    
    // Função para tentar buscar pedido de convidado
    async function tryLoadGuestOrder() {
      try {
        // Verificar dados de checkout de convidado
        const guestCheckoutData = sessionStorage.getItem('guest-checkout-data');
        if (!guestCheckoutData) {
          return false;
        }
        
        const guestData = JSON.parse(guestCheckoutData);
        const guestEmail = guestData.email;
        
        if (!guestEmail) {
          return false;
        }
        
        
        // Buscar via nova API de convidados
        const response = await fetch(`/api/orders/guest/${orderNumber}?email=${encodeURIComponent(guestEmail)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            orderDetails = result.data;
            isGuestOrder = true;
            return true;
          }
        }
        
        return false;
        
      } catch (error) {
        console.error('❌ Erro ao tentar buscar pedido de convidado:', error);
        return false;
      }
    }
    
    // Se não tem dados do sessionStorage, tentar buscar da API
    if (!orderDetails && orderNumber) {
      
      // STEP 1: Tentar como pedido de convidado primeiro
      const guestSuccess = await tryLoadGuestOrder();
      
      // STEP 2: Se não conseguiu como convidado e usuário logado, tentar API normal
      if (!guestSuccess && $isAuthenticated) {
        
        try {
          // Tentar buscar direto pelo ID do pedido
          const response = await fetch(`/api/orders/${orderNumber}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              orderDetails = result.data;
              isGuestOrder = false;
            } else {
              
              // Fallback: buscar lista de pedidos e encontrar o correto
              const listResponse = await fetch(`/api/orders?limit=10`);
              const listResult = await listResponse.json();
              
              if (listResult.success && listResult.data.orders.length > 0) {
                const recentOrder = listResult.data.orders.find((order: any) => 
                  order.orderNumber === orderNumber
                );
                
                if (recentOrder) {
                  orderDetails = recentOrder;
                  isGuestOrder = false;
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Erro ao buscar detalhes do pedido (usuário logado):', error);
        }
      }
    }
    
    loading = false;
  });
  
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }
  
  function getProductImage(item: any): string {
    
    // 1. Novo formato da API: productImage (string única)
    if (item?.productImage && typeof item.productImage === 'string') {
      const imageUrl = item.productImage;
      return imageUrl;
    }
    
    // 2. Formato antigo: item.product.images (array)
    if (item?.product?.images && Array.isArray(item.product.images) && item.product.images.length > 0) {
      const imageUrl = item.product.images[0];
      return imageUrl;
    }
    
    // 3. Formato alternativo: item.product.image (string única)
    if (item?.product?.image && typeof item.product.image === 'string') {
      const imageUrl = item.product.image;
      return imageUrl;
    }
    
    // 4. Tentar imagem do produto no formato JSON
    if (item?.product?.images && typeof item.product.images === 'string') {
      try {
        const parsedImages = JSON.parse(item.product.images);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          const imageUrl = parsedImages[0];
          return imageUrl;
        }
      } catch (e) {
      }
    }
    
    // 5. Tentar construir URL baseada no slug ou ID
    const productSlug = item?.productSlug || item?.product?.slug;
    const productId = item?.productId || item?.product?.id;
    
    if (productSlug) {
      const constructedUrl = `/api/products/${productSlug}/image`;
      return constructedUrl;
    }
    
    if (productId) {
      const constructedUrl = `/api/products/${productId}/image`;
      return constructedUrl;
    }
    
    // 6. Fallback para placeholder
    const fallbackUrl = `/api/placeholder/80/80`;
    return fallbackUrl;
  }
</script>

<svelte:head>
  <title>Pedido Criado com Sucesso - Marketplace GDG</title>
  <meta name="description" content="Seu pedido foi criado com sucesso!" />
</svelte:head>

<main class="min-h-screen bg-gray-50">
  <!-- Header Fixo -->
  <div class="bg-white border-b border-gray-200 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900">Pedido Confirmado</h1>
            <p class="text-sm text-gray-600">#{orderNumber}</p>
          </div>
        </div>
        
        <a 
          href="/" 
          class="text-primary hover:text-primary/80 font-medium transition-colors text-sm"
        >
          ← Voltar à Loja
        </a>
      </div>
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if loading}
      <!-- Loading State -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span class="ml-3 text-gray-600">Carregando informações do pedido...</span>
        </div>
      </div>
    {:else}
      <!-- Conteúdo Principal -->
      <div class="space-y-6">
        
        <!-- Confirmação Principal -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <!-- Header com Status -->
          <div class="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 px-6 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-gray-900">Pedido Confirmado com Sucesso!</h2>
                  <p class="text-primary text-sm font-medium">Seu pedido foi processado e está sendo preparado</p>
                </div>
              </div>
              
              <div class="text-right">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                  ✓ Confirmado
                </span>
              </div>
            </div>
          </div>
          
          <!-- Informações do Pedido -->
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div class="text-center md:text-left">
                <p class="text-sm font-medium text-gray-500 mb-1">Número do Pedido</p>
                <p class="text-lg font-bold text-gray-900 font-mono">{orderNumber}</p>
                <button 
                  onclick={() => navigator.clipboard.writeText(orderNumber)}
                  class="text-xs text-primary hover:text-primary/80 mt-1"
                >
                  Copiar número
                </button>
              </div>
              
              <div class="text-center md:text-left">
                <p class="text-sm font-medium text-gray-500 mb-1">Data do Pedido</p>
                <p class="text-lg font-semibold text-gray-900">
                  {orderDetails ? formatDate(orderDetails.createdAt) : new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div class="text-center md:text-left">
                <p class="text-sm font-medium text-gray-500 mb-1">Valor Total</p>
                <p class="text-lg font-bold text-primary">
                  {orderDetails ? formatCurrency(orderDetails.totalAmount) : '---'}
                </p>
              </div>
            </div>
            
            <!-- Timeline de Próximos Passos -->
            <div class="border-t border-gray-200 pt-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Próximos Passos</h3>
              <div class="space-y-3">
                <div class="flex items-center space-x-3">
                  <div class="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div class="flex-1">
                    <p class="font-medium text-gray-900">E-mail de Confirmação</p>
                    <p class="text-sm text-gray-600">Você receberá todos os detalhes nos próximos minutos</p>
                  </div>
                  <span class="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">Em instantes</span>
                </div>
                
                <div class="flex items-center space-x-3">
                  <div class="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <div class="flex-1">
                    <p class="font-medium text-gray-900">Processamento</p>
                    <p class="text-sm text-gray-600">Preparação e separação dos seus produtos</p>
                  </div>
                  <span class="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">1-2 dias úteis</span>
                </div>
                
                <div class="flex items-center space-x-3">
                  <div class="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div class="flex-1">
                    <p class="font-medium text-gray-900">Envio</p>
                    <p class="text-sm text-gray-600">Código de rastreamento será enviado por e-mail</p>
                  </div>
                  <span class="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded">Em breve</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {#if orderDetails}
          <!-- Detalhes do Pedido -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Itens do Pedido -->
            <div class="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div class="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <h3 class="text-lg font-semibold text-gray-900">
                  Itens do Pedido ({orderDetails.itemsCount})
                </h3>
              </div>
              
              <div class="divide-y divide-gray-200">
                {#each orderDetails.items as item}
                  <div class="p-4 flex items-center space-x-4">
                    <div class="flex-shrink-0">
                      <img 
                        src={item.productImage || item.product?.images?.[0] || item.product?.image || `/api/placeholder/80/80`} 
                        alt={item.productName || item.product?.name || 'Produto'}
                        class="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        onerror={(e) => {
                          const img = e.target as HTMLImageElement;
                          
                          // Primeiro fallback: tentar placeholder do produto
                          if (!img.src.includes('placeholder')) {
                            img.src = '/api/placeholder/80/80';
                            return;
                          }
                          
                          // Segundo fallback: imagem padrão
                          img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzMkM0Ni41MDk3IDMyIDUwIDI4LjUwOTcgNTAgMjZDNTAgMjMuNDkwMyA0Ni41MDk3IDIwIDQ0IDIwQzQxLjQ5MDMgMjAgMzggMjMuNDkwMzM4IDM4IDIyNkMzOCAyOC41MDk3IDQxLjQ5MDMgMzIgNDQgMzJaIiBmaWxsPSIjOUIxMDE3Ii8+CjxwYXRoIGQ9Ik0yNCA1MEgyNFY0NkgyNFY1MFoiIGZpbGw9IiM5QjEwMTciLz4KPC9zdmc+Cg==';
                        }}
                      />
                    </div>
                    
                    <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-gray-900 truncate">{item.productName || item.product?.name || 'Produto'}</h4>
                      <div class="flex items-center space-x-4 mt-1">
                        <span class="text-sm text-gray-600">Qtd: {item.quantity}</span>
                        <span class="text-sm text-gray-600">Unit: {formatCurrency(item.price || item.product?.price || 0)}</span>
                      </div>
                      
                      {#if item.selectedColor || item.selectedSize}
                        <div class="flex gap-2 mt-2">
                          {#if item.selectedColor}
                            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {item.selectedColor}
                            </span>
                          {/if}
                          {#if item.selectedSize}
                            <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {item.selectedSize}
                            </span>
                          {/if}
                        </div>
                      {/if}
                      
                      {#if item.sellerName}
                        <p class="text-xs text-gray-500 mt-1">
                          Vendido por: {item.sellerName}
                        </p>
                      {/if}
                    </div>
                    
                    <div class="text-right">
                      <p class="font-semibold text-gray-900">{formatCurrency(item.total || (item.price * item.quantity) || 0)}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            
            <!-- Resumo Financeiro -->
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div class="bg-gray-50 border-b border-gray-200 px-6 py-3">
                <h3 class="text-lg font-semibold text-gray-900">Resumo do Pedido</h3>
              </div>
              
              <div class="p-6">
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Subtotal</span>
                    <span class="font-medium">{formatCurrency(orderDetails.totalAmount - orderDetails.shippingCost + orderDetails.discountAmount)}</span>
                  </div>
                  
                  <div class="flex justify-between">
                    <span class="text-gray-600">Frete</span>
                    <span class="font-medium">
                      {orderDetails.shippingCost > 0 ? formatCurrency(orderDetails.shippingCost) : 'Grátis'}
                    </span>
                  </div>
                  
                  {#if orderDetails.discountAmount > 0}
                    <div class="flex justify-between text-primary">
                      <span>Desconto</span>
                      <span class="font-medium">-{formatCurrency(orderDetails.discountAmount)}</span>
                    </div>
                  {/if}
                  
                  <hr class="border-gray-200">
                  
                  <div class="flex justify-between">
                    <span class="text-lg font-bold text-gray-900">Total Pago</span>
                    <span class="text-lg font-bold text-primary">{formatCurrency(orderDetails.totalAmount)}</span>
                  </div>
                </div>
                
                <div class="mt-6 pt-6 border-t border-gray-200">
                  <p class="text-sm font-medium text-gray-900 mb-2">Método de Pagamento</p>
                  <p class="text-sm text-gray-600">{orderDetails.paymentMethod}</p>
                </div>
              </div>
            </div>
          </div>
        {/if}
        
        <!-- Ações Principais -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            {#if $isAuthenticated && !isGuestOrder}
              <a
                href="/meus-pedidos"
                class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Acompanhar Pedido
              </a>
            {/if}
            
            {#if isGuestOrder}
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div class="flex items-start space-x-3">
                  <svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 class="text-sm font-medium text-yellow-800">Pedido como Convidado</h4>
                    <p class="text-sm text-yellow-700 mt-1">
                      Como você fez o pedido como convidado, você receberá todas as atualizações por e-mail. 
                      Para acompanhar pedidos online, crie uma conta na próxima compra.
                    </p>
                  </div>
                </div>
              </div>
            {/if}
            
            <a
              href="/"
              class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5.5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
              </svg>
              Continuar Comprando
            </a>
            
            <a
              href="/contato"
              class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Precisa de Ajuda?
            </a>
          </div>
        </div>
        
        <!-- Informações Adicionais -->
        <div class="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Informações Importantes</h3>
              <ul class="space-y-2 text-sm text-gray-700">
                <li class="flex items-start space-x-2">
                  <span class="text-primary">•</span>
                  <span>Você receberá atualizações por e-mail sobre o status do seu pedido</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-primary">•</span>
                  <span>Caso tenha dúvidas, entre em contato conosco pelo WhatsApp ou e-mail</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-primary">•</span>
                  <span>Acompanhe o progresso da entrega na seção "Meus Pedidos"</span>
                </li>
                <li class="flex items-start space-x-2">
                  <span class="text-primary">•</span>
                  <span>Prazo de entrega: Varia conforme modalidade de frete selecionada</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
      </div>
    {/if}
  </div>
</main> 