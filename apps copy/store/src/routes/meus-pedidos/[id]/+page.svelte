<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isAuthenticated } from '$lib/stores/authStore';
  
  interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
    total: number;
    createdAt: string;
  }
  
  interface StatusHistory {
    status: string;
    statusLabel: string;
    notes: string;
    createdAt: string;
  }
  
  interface OrderDetails {
    id: string;
    orderNumber: string;
    status: string;
    statusLabel: string;
    statusColor: string;
    totalAmount: number;
    shippingCost: number;
    discountAmount: number;
    paymentMethod: string;
    paymentMethodLabel: string;
    shippingAddress: any;
    notes: string;
    createdAt: string;
    updatedAt: string;
    items: OrderItem[];
    statusHistory: StatusHistory[];
    summary: {
      itemsCount: number;
      subtotal: number;
      shipping: number;
      discount: number;
      total: number;
    };
  }
  
  let order: OrderDetails | null = null;
  let loading = true;
  let error = '';
  let orderId = '';
  
  // Novo: Estados para rastreamento avançado
  let trackingData: any = null;
  let showFullTracking = false;
  
  onMount(() => {
    // Verificar se está logado
    if (!$isAuthenticated) {
      goto('/login?redirect=/meus-pedidos');
      return;
    }
    
    orderId = $page.params.id;
    loadOrderDetails();
    loadTracking();
  });
  
  async function loadOrderDetails() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();
      
      if (result.success) {
        order = result.data;
      } else {
        error = result.error?.message || 'Erro ao carregar detalhes do pedido';
        if (result.error?.code === 'ORDER_NOT_FOUND') {
          setTimeout(() => goto('/meus-pedidos'), 3000);
        }
      }
    } catch (err: any) {
      error = 'Erro de conexão. Tente novamente.';
      console.error('Erro ao carregar pedido:', err);
    } finally {
      loading = false;
    }
  }
  
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
  
  function formatDateShort(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }
  
  function getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'pending': '⏳',
      'confirmed': '✅',
      'processing': '📦',
      'shipped': '🚚',
      'delivered': '✔️',
      'cancelled': '❌',
      'refunded': '💰'
    };
    return icons[status] || '📋';
  }
  
  function copyOrderNumber() {
    if (order) {
      navigator.clipboard.writeText(order.orderNumber);
      // Você pode adicionar um toast/notificação aqui
      alert('Número do pedido copiado!');
    }
  }
  
  // Novo: Função para carregar rastreamento
  async function loadTracking() {
    if (!order?.id) return;
    
    try {
      const response = await fetch(`/api/orders/${order.id}/tracking`);
      const data = await response.json();
      
      if (data.success) {
        trackingData = data.data;
      }
    } catch (err) {
      console.error('Erro ao carregar rastreamento:', err);
    }
  }
</script>

<svelte:head>
  <title>{order ? `Pedido ${order.orderNumber}` : 'Carregando...'} - Marketplace GDG</title>
  <meta name="description" content="Detalhes do seu pedido" />
</svelte:head>

<main class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <a 
            href="/meus-pedidos" 
            class="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 class="text-2xl font-bold text-gray-900">
            {order ? `Pedido ${order.orderNumber}` : 'Carregando...'}
          </h1>
        </div>
        
        <a 
          href="/" 
          class="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Continuar Comprando
        </a>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if loading}
      <!-- Loading State -->
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span class="ml-3 text-gray-600">Carregando detalhes do pedido...</span>
      </div>
      
    {:else if error}
      <!-- Error State -->
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 class="text-lg font-medium text-red-800 mb-2">Erro ao carregar pedido</h3>
        <p class="text-red-600 mb-4">{error}</p>
        
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onclick={loadOrderDetails}
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
          
          <a
            href="/meus-pedidos"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Voltar aos Pedidos
          </a>
        </div>
      </div>
      
    {:else if order}
      <!-- Order Details -->
      <div class="space-y-8">
        
        <!-- Order Header -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div class="flex items-center space-x-4">
              <span class="text-3xl">{getStatusIcon(order.status)}</span>
              <div>
                <div class="flex items-center space-x-3 mb-2">
                  <h2 class="text-2xl font-bold text-gray-900">
                    Pedido #{order.orderNumber}
                  </h2>
                  <button 
                    onclick={copyOrderNumber}
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copiar número do pedido"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p class="text-gray-600">Pedido realizado em {formatDate(order.createdAt)}</p>
              </div>
            </div>
            
            <div class="flex flex-col items-start lg:items-end space-y-3">
              <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
                    class:bg-orange-100={order.statusColor === 'orange'}
                    class:text-orange-800={order.statusColor === 'orange'}
                    class:bg-blue-100={order.statusColor === 'blue'}
                    class:text-blue-800={order.statusColor === 'blue'}
                    class:bg-purple-100={order.statusColor === 'purple'}
                    class:text-purple-800={order.statusColor === 'purple'}
                    class:bg-indigo-100={order.statusColor === 'indigo'}
                    class:text-indigo-800={order.statusColor === 'indigo'}
                    class:bg-green-100={order.statusColor === 'green'}
                    class:text-green-800={order.statusColor === 'green'}
                    class:bg-red-100={order.statusColor === 'red'}
                    class:text-red-800={order.statusColor === 'red'}
                    class:bg-gray-50={order.statusColor === 'gray'}
                    class:text-gray-800={order.statusColor === 'gray'}>
                {order.statusLabel}
              </span>
              
              <div class="text-right">
                <p class="text-2xl font-bold text-primary">{formatCurrency(order.totalAmount)}</p>
                <p class="text-sm text-gray-500">{order.paymentMethodLabel}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Status Timeline -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Status do Pedido</h2>
          <div class="relative">
            <div class="flex justify-between">
              <div class="flex items-center text-[#00BFB3]">
                <div class="w-8 h-8 bg-[#00BFB3] rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                <span class="ml-3 text-sm font-medium">Pedido Criado</span>
              </div>
              <div class="flex items-center {order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' ? 'text-[#00BFB3]' : 'text-gray-400'}">
                <div class="w-8 h-8 {order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' ? 'bg-[#00BFB3]' : 'bg-gray-200'} rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                <span class="ml-3 text-sm font-medium">Confirmado</span>
              </div>
              <div class="flex items-center {order.status === 'shipped' || order.status === 'delivered' ? 'text-[#00BFB3]' : 'text-gray-400'}">
                <div class="w-8 h-8 {order.status === 'shipped' || order.status === 'delivered' ? 'bg-[#00BFB3]' : 'bg-gray-200'} rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                <span class="ml-3 text-sm font-medium">Enviado</span>
              </div>
              <div class="flex items-center {order.status === 'delivered' ? 'text-[#00BFB3]' : 'text-gray-400'}">
                <div class="w-8 h-8 {order.status === 'delivered' ? 'bg-[#00BFB3]' : 'bg-gray-200'} rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                <span class="ml-3 text-sm font-medium">Entregue</span>
              </div>
            </div>
            <div class="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-10">
              <div class="h-full bg-[#00BFB3] transition-all duration-500" style="width: {
                order.status === 'pending' ? '0%' :
                order.status === 'confirmed' ? '33%' :
                order.status === 'shipped' ? '66%' :
                order.status === 'delivered' ? '100%' : '0%'
              }"></div>
            </div>
          </div>
          
          <!-- Rastreamento Avançado -->
          {#if trackingData}
            <div class="mt-8">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-900">Rastreamento Detalhado</h3>
                <button
                  onclick={() => showFullTracking = !showFullTracking}
                  class="text-sm text-[#00BFB3] hover:text-[#00A89D] font-medium"
                >
                  {showFullTracking ? 'Ocultar' : 'Ver histórico completo'}
                </button>
              </div>
              
              {#if trackingData.delivery?.tracking_code}
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div>
                      <p class="font-medium text-blue-900">Código de rastreamento</p>
                      <p class="text-sm text-blue-700 font-mono">{trackingData.delivery.tracking_code}</p>
                      {#if trackingData.delivery.carrier}
                        <p class="text-xs text-blue-600">Transportadora: {trackingData.delivery.carrier}</p>
                      {/if}
                    </div>
                  </div>
                </div>
              {/if}
              
              {#if trackingData.delivery?.estimated_delivery}
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div class="flex items-center gap-3">
                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p class="font-medium text-green-900">Previsão de entrega</p>
                      <p class="text-sm text-green-700">
                        {new Date(trackingData.delivery.estimated_delivery).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              {/if}
              
              <!-- Timeline de rastreamento -->
              {#if showFullTracking && trackingData.tracking?.length > 0}
                <div class="mt-4">
                  <h4 class="font-medium text-gray-900 mb-3">Histórico de movimentação</h4>
                  <div class="space-y-4">
                    {#each trackingData.tracking as event}
                      <div class="flex gap-3">
                        <div class="flex-shrink-0 w-8 h-8 bg-[#00BFB3] rounded-full flex items-center justify-center">
                          <div class="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between">
                            <p class="font-medium text-gray-900 capitalize">{event.status}</p>
                            <p class="text-sm text-gray-500">
                              {new Date(event.created_at).toLocaleDateString('pt-BR')} às {new Date(event.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {#if event.description}
                            <p class="text-sm text-gray-600 mt-1">{event.description}</p>
                          {/if}
                          {#if event.location}
                            <p class="text-xs text-gray-500 mt-1">📍 {event.location}</p>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
              
              <!-- Status Flow -->
              {#if trackingData.status_flow}
                <div class="mt-6">
                  <h4 class="font-medium text-gray-900 mb-3">Próximas etapas</h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {#each trackingData.status_flow as step}
                      <div class="flex items-center gap-2 p-3 rounded-lg {step.completed ? 'bg-green-50 border border-green-200' : step.current ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center {step.completed ? 'bg-green-100' : step.current ? 'bg-blue-100' : 'bg-gray-50'}">
                          {#if step.completed}
                            <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                          {:else if step.current}
                            <div class="w-2 h-2 bg-blue-600 rounded-full"></div>
                          {:else}
                            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
                          {/if}
                        </div>
                        <span class="text-sm font-medium {step.completed ? 'text-green-700' : step.current ? 'text-blue-700' : 'text-gray-500'}">{step.label}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Status History -->
        {#if order.statusHistory && order.statusHistory.length > 0}
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Histórico do Pedido</h3>
            </div>
            
            <div class="p-6">
              <div class="flow-root">
                <ul class="-mb-8">
                  {#each order.statusHistory as status, index}
                    <li>
                      <div class="relative pb-8">
                        {#if index < order.statusHistory.length - 1}
                          <span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        {/if}
                        <div class="relative flex space-x-3">
                          <div>
                            <span class="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white"
                                  class:bg-orange-100={order.statusColor === 'orange'}
                                  class:text-orange-600={order.statusColor === 'orange'}
                                  class:bg-blue-100={order.statusColor === 'blue'}
                                  class:text-blue-600={order.statusColor === 'blue'}
                                  class:bg-green-100={order.statusColor === 'green'}
                                  class:text-green-600={order.statusColor === 'green'}>
                              <span class="text-sm">{getStatusIcon(status.status)}</span>
                            </span>
                          </div>
                          <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p class="text-sm font-medium text-gray-900">{status.statusLabel}</p>
                              {#if status.notes}
                                <p class="text-sm text-gray-500">{status.notes}</p>
                              {/if}
                            </div>
                            <div class="text-right text-sm whitespace-nowrap text-gray-500">
                              {formatDateShort(status.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          </div>
        {/if}
        
        <!-- Order Items -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              Itens do Pedido ({order.summary.itemsCount})
            </h3>
          </div>
          
          <div class="divide-y divide-gray-200">
            {#each order.items as item}
              <div class="p-6 flex items-center space-x-6">
                <div class="flex-shrink-0">
                  <img 
                    src={item.productImage} 
                    alt={item.productName}
                    class="w-20 h-20 object-cover rounded-lg"
                  />
                </div>
                
                <div class="flex-1 min-w-0">
                  <h4 class="text-lg font-medium text-gray-900 truncate">
                    {item.productName}
                  </h4>
                  <p class="text-sm text-gray-500 mt-1">
                    Quantidade: {item.quantity}
                  </p>
                  <p class="text-sm text-gray-500">
                    Preço unitário: {formatCurrency(item.price)}
                  </p>
                </div>
                
                <div class="text-right">
                  <p class="text-lg font-bold text-gray-900">
                    {formatCurrency(item.total)}
                  </p>
                  <a
                    href="/produto/{item.productId}"
                    class="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Ver Produto
                  </a>
                </div>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Order Summary & Shipping -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- Order Summary -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Resumo do Pedido</h3>
            </div>
            
            <div class="p-6">
              <div class="space-y-4">
                <div class="flex justify-between">
                  <span class="text-gray-600">Subtotal ({order.summary.itemsCount} {order.summary.itemsCount === 1 ? 'item' : 'itens'}):</span>
                  <span class="font-medium">{formatCurrency(order.summary.subtotal)}</span>
                </div>
                
                <div class="flex justify-between">
                  <span class="text-gray-600">Frete:</span>
                  <span class="font-medium">
                    {order.summary.shipping > 0 ? formatCurrency(order.summary.shipping) : 'Grátis'}
                  </span>
                </div>
                
                {#if order.summary.discount > 0}
                  <div class="flex justify-between text-green-600">
                    <span>Desconto:</span>
                    <span class="font-medium">-{formatCurrency(order.summary.discount)}</span>
                  </div>
                {/if}
                
                <div class="border-t border-gray-200 pt-4">
                  <div class="flex justify-between">
                    <span class="text-lg font-bold text-gray-900">Total:</span>
                    <span class="text-lg font-bold text-primary">{formatCurrency(order.summary.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Shipping Address -->
          {#if order.shippingAddress}
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Endereço de Entrega</h3>
              </div>
              
              <div class="p-6">
                <div class="text-gray-900">
                  <p class="font-medium">{order.shippingAddress.name}</p>
                  <p class="mt-1">{order.shippingAddress.street}, {order.shippingAddress.number}</p>
                  {#if order.shippingAddress.complement}
                    <p>{order.shippingAddress.complement}</p>
                  {/if}
                  <p>{order.shippingAddress.neighborhood}</p>
                  <p>{order.shippingAddress.city} - {order.shippingAddress.state}</p>
                  <p class="font-mono">{order.shippingAddress.zipCode}</p>
                  {#if order.shippingAddress.phone}
                    <p class="mt-2 text-gray-600">Tel: {order.shippingAddress.phone}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        </div>
        
        <!-- Notes -->
        {#if order.notes}
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-900">Observações</h3>
            </div>
            
            <div class="p-6">
              <p class="text-gray-700">{order.notes}</p>
            </div>
          </div>
        {/if}
        
        <!-- Actions -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/meus-pedidos"
              class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Voltar aos Pedidos
            </a>
            
            <a
              href="/"
              class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5.5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
              </svg>
              Continuar Comprando
            </a>
            
            <a
              href="/contato"
              class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Precisa de Ajuda?
            </a>
          </div>
        </div>
        
      </div>
    {/if}
  </div>
</main> 