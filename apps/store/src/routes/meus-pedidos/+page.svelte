<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, user } from '$lib/stores/authStore';
  import { page } from '$app/stores';
  import ErrorMessage from '$lib/components/ui/ErrorMessage.svelte';
  import LoadingState from '$lib/components/ui/LoadingState.svelte';
  
  // Estado para expansão de texto
  let mostrarMais = false;
  
  interface Order {
    id: string;
    orderNumber: string;
    status: string;
    statusLabel: string;
    statusColor: string;
    totalAmount: number;
    shippingCost: number;
    discountAmount: number;
    paymentMethod: string;
    items: any[];
    itemsCount: number;
    createdAt: string;
  }
  
  let orders: Order[] = [];
  let loading = true;
  let error = '';
  let currentPage = 1;
  let totalPages = 1;
  let selectedStatus = '';
  
  // Status disponíveis para filtro
  const statusOptions = [
    { value: '', label: 'Todos', count: 0 },
    { value: 'pending', label: 'Aguardando', count: 0 },
    { value: 'confirmed', label: 'Confirmado', count: 0 },
    { value: 'processing', label: 'Preparando', count: 0 },
    { value: 'shipped', label: 'Enviado', count: 0 },
    { value: 'delivered', label: 'Entregue', count: 0 },
    { value: 'cancelled', label: 'Cancelado', count: 0 }
  ];
  
  onMount(() => {
    // Verificar se está logado
    if (!$isAuthenticated) {
      goto('/login?redirect=/meus-pedidos');
      return;
    }
    
    // Obter parâmetros da URL
    currentPage = parseInt($page.url.searchParams.get('page') || '1');
    selectedStatus = $page.url.searchParams.get('status') || '';
    
    loadOrders();
  });
  
  async function loadOrders() {
    loading = true;
    error = '';
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }
      
      const response = await fetch(`/api/orders?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        orders = result.data.orders;
        totalPages = result.data.pagination.totalPages;
      } else {
        error = result.error?.message || 'Erro ao carregar pedidos';
      }
    } catch (err: any) {
      error = 'Erro de conexão. Tente novamente.';
      console.error('Erro ao carregar pedidos:', err);
    } finally {
      loading = false;
    }
  }
  
  function handleStatusChange() {
    // Atualizar URL e recarregar
    const url = new URL(window.location.href);
    if (selectedStatus) {
      url.searchParams.set('status', selectedStatus);
    } else {
      url.searchParams.delete('status');
    }
    url.searchParams.set('page', '1');
    
    history.pushState({}, '', url.toString());
    currentPage = 1;
    loadOrders();
  }

  function changeFilter(status: string) {
    selectedStatus = status;
    handleStatusChange();
  }
  
  function goToPage(newPage: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    history.pushState({}, '', url.toString());
    
    currentPage = newPage;
    loadOrders();
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
  
  function getStatusIcon(status: string): { icon: string; color: string } {
    const statusMap: Record<string, { icon: string; color: string }> = {
      'pending': { 
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', 
        color: 'text-orange-500' 
      },
      'confirmed': { 
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 
        color: 'text-green-500' 
      },
      'processing': { 
        icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', 
        color: 'text-blue-500' 
      },
      'shipped': { 
        icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', 
        color: 'text-indigo-500' 
      },
      'delivered': { 
        icon: 'M5 13l4 4L19 7', 
        color: 'text-green-600' 
      },
      'cancelled': { 
        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', 
        color: 'text-red-500' 
      },
      'refunded': { 
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1', 
        color: 'text-purple-500' 
      }
    };
    
    return statusMap[status] || { 
      icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 
      color: 'text-gray-500' 
    };
  }
  
  function toggleMostrarMais() {
    mostrarMais = !mostrarMais;
  }
</script>

<svelte:head>
  <title>Meus Pedidos - Grão de Gente Marketplace</title>
  <meta name="description" content="Acompanhe todos os seus pedidos e compras no Marketplace Grão de Gente" />
  <meta name="keywords" content="meus pedidos, compras, histórico, status, grão de gente, marketplace" />
</svelte:head>

<!-- Header Padrão do Projeto -->
<div class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">Meus Pedidos</h1>
          <p class="mt-1 text-gray-600 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">
            {#if loading}
              Carregando seus pedidos...
            {:else if orders.length === 0}
              Acompanhe todas as suas compras em um só lugar
            {:else}
              {orders.length} {orders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
            {/if}
          </p>
        </div>
      </div>
      
      <a 
        href="/" 
        class="text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm sm:text-base px-4 py-2 sm:px-0 sm:py-0 bg-[#00BFB3]/5 sm:bg-transparent rounded-lg sm:rounded-none"
        style="font-family: 'Lato', sans-serif;"
      >
        <span class="sm:hidden">Voltar</span>
        <span class="hidden sm:inline">← Continuar Comprando</span>
      </a>
    </div>
    
    <!-- Descrição expandível -->
    <div class="mt-6 pt-6 border-t border-gray-200">
      <div class="text-center">
        <p class="text-gray-600 text-base leading-relaxed mb-4" style="font-family: 'Lato', sans-serif;">
          Acompanhe todos os seus pedidos em tempo real e tenha controle completo das suas compras. 
          Receba notificações sobre cada etapa do processo de entrega.
        </p>
      </div>
    </div>
  </div>
</div>

<!-- Conteúdo Principal -->
<main class="py-4 sm:py-6 lg:py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Filtros Responsivos -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
      <div class="flex items-center gap-3 mb-4 sm:mb-6">
        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="h-4 w-4 sm:h-5 sm:w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
          </svg>
        </div>
        <h2 class="text-base sm:text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
          Filtrar Pedidos
        </h2>
      </div>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
        {#each statusOptions as filter}
          <button
            onclick={() => changeFilter(filter.value)}
            class="flex items-center justify-center px-3 sm:px-4 py-3 text-left rounded-lg transition-colors text-xs sm:text-sm font-medium border touch-manipulation
              {selectedStatus === filter.value 
                ? 'bg-[#00BFB3] text-white border-[#00BFB3]' 
                : 'text-gray-700 hover:bg-gray-50 border-gray-200 bg-white'}"
            style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
          >
            <span class="truncate">{filter.label}</span>
            {#if filter.count > 0}
              <span class="ml-2 text-xs {selectedStatus === filter.value ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'} px-2 py-1 rounded-full flex-shrink-0">
                {filter.count}
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    {#if loading}
      <!-- Loading State -->
      <LoadingState message="Carregando seus pedidos..." />
      
    {:else if error}
      <!-- Error State -->
      <ErrorMessage 
        title="Erro ao carregar pedidos"
        message={error}
        onRetry={loadOrders}
      />
      
    {:else if orders.length === 0}
      <!-- Estado vazio -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
        <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <svg class="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3" style="font-family: 'Lato', sans-serif;">
          {selectedStatus ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
        </h2>
        <p class="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed" style="font-family: 'Lato', sans-serif;">
          {selectedStatus 
            ? 'Não há pedidos com este status. Tente filtrar por outro status ou ver todos os pedidos.' 
            : 'Você ainda não fez nenhum pedido. Explore nossos produtos e faça sua primeira compra!'
          }
        </p>
        
        <div class="flex flex-col sm:flex-row gap-3 justify-center max-w-sm sm:max-w-none mx-auto">
          {#if selectedStatus}
            <button 
              onclick={() => { selectedStatus = ''; handleStatusChange(); }}
              class="inline-flex items-center justify-center px-6 py-3 bg-white text-[#00BFB3] text-sm font-semibold rounded-lg border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
              style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Ver Todos os Pedidos
            </button>
          {/if}
          
          <a
            href="/"
            class="inline-flex items-center justify-center px-6 py-3 bg-[#00BFB3] text-white text-sm font-semibold rounded-lg hover:bg-[#00A89D] focus:ring-2 focus:ring-[#00BFB3]/20 transition-all touch-manipulation"
            style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Começar a Comprar
          </a>
        </div>
      </div>
      
    {:else}
      <!-- Lista de Pedidos -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div class="flex items-center gap-3 mb-4 sm:mb-6">
          <div class="w-8 h-8 sm:w-10 sm:h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="h-4 w-4 sm:h-5 sm:w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 class="text-base sm:text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
            Seus Pedidos
          </h3>
        </div>
        
      <div class="space-y-4 sm:space-y-6">
        {#each orders as order}
            <div class="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <!-- Order Header -->
            <div class="px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-200">
              <div class="flex flex-col gap-3 sm:gap-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3 min-w-0 flex-1">
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 sm:w-10 sm:h-10 bg-{getStatusIcon(order.status).color.replace('text-', '')}-100 rounded-lg flex items-center justify-center">
                        <svg class="h-4 w-4 sm:h-5 sm:w-5 {getStatusIcon(order.status).color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getStatusIcon(order.status).icon} />
                        </svg>
                      </div>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="text-base sm:text-lg font-semibold text-gray-900 truncate" style="font-family: 'Lato', sans-serif;">
                        Pedido #{order.orderNumber}
                      </h3>
                      <p class="text-xs sm:text-sm text-gray-500" style="font-family: 'Lato', sans-serif;">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div class="flex-shrink-0">
                    <span class="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
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
                          class:text-gray-800={order.statusColor === 'gray'}
                          style="font-family: 'Lato', sans-serif;">
                      {order.statusLabel}
                    </span>
                  </div>
                </div>
                
                <div class="flex justify-center sm:justify-end">
                  <a
                    href="/meus-pedidos/{order.id}"
                    class="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation w-full sm:w-auto"
                    style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
                  >
                    <span class="sm:hidden">Ver Detalhes</span>
                    <span class="hidden sm:inline">Ver Detalhes</span>
                    <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            
            <!-- Order Content -->
            <div class="p-4 sm:p-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <!-- Items Preview -->
                <div class="lg:col-span-2">
                  <h4 class="font-medium text-gray-900 mb-3 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">
                    {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'}
                  </h4>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                    {#each order.items.slice(0, 4) as item}
                      <div class="flex items-center space-x-3 bg-white rounded-lg p-3 border border-gray-200">
                        <img 
                          src={item.productImage} 
                          alt={item.productName}
                          class="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg flex-shrink-0"
                        />
                        <div class="text-sm min-w-0 flex-1">
                          <p class="font-medium text-gray-900 truncate" style="font-family: 'Lato', sans-serif;">
                            {item.productName}
                          </p>
                          <p class="text-gray-500 text-xs sm:text-sm" style="font-family: 'Lato', sans-serif;">Qtd: {item.quantity}</p>
                        </div>
                      </div>
                    {/each}
                    
                    {#if order.items.length > 4}
                      <div class="flex items-center justify-center bg-white rounded-lg p-3 border border-gray-200 min-h-[72px] sm:min-h-[80px]">
                        <span class="text-sm text-gray-600 font-medium" style="font-family: 'Lato', sans-serif;">
                          +{order.items.length - 4} {order.items.length - 4 === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>
                
                <!-- Order Summary -->
                <div class="mt-4 lg:mt-0">
                  <div class="bg-white rounded-lg border border-gray-200 p-4">
                    <h5 class="font-medium text-gray-900 mb-3 text-sm sm:text-base" style="font-family: 'Lato', sans-serif;">Resumo do Pedido</h5>
                    
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600" style="font-family: 'Lato', sans-serif;">Subtotal:</span>
                        <span class="font-medium" style="font-family: 'Lato', sans-serif;">{formatCurrency(order.totalAmount - order.shippingCost + order.discountAmount)}</span>
                      </div>
                      
                      {#if order.shippingCost > 0}
                        <div class="flex justify-between">
                          <span class="text-gray-600" style="font-family: 'Lato', sans-serif;">Frete:</span>
                          <span class="font-medium" style="font-family: 'Lato', sans-serif;">{formatCurrency(order.shippingCost)}</span>
                        </div>
                      {/if}
                      
                      {#if order.discountAmount > 0}
                        <div class="flex justify-between text-green-600">
                          <span style="font-family: 'Lato', sans-serif;">Desconto:</span>
                          <span class="font-medium" style="font-family: 'Lato', sans-serif;">-{formatCurrency(order.discountAmount)}</span>
                        </div>
                      {/if}
                      
                      <div class="flex justify-between text-base sm:text-lg font-bold border-t border-gray-200 pt-2 mt-3">
                        <span style="font-family: 'Lato', sans-serif;">Total:</span>
                        <span class="text-[#00BFB3]" style="font-family: 'Lato', sans-serif;">{formatCurrency(order.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
        </div>
      </div>
      
      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="flex items-center justify-center space-x-1 sm:space-x-2 mt-6 sm:mt-8">
          <button 
            onclick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            class="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation"
            style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
          >
            <span class="hidden sm:inline">Anterior</span>
            <span class="sm:hidden">‹</span>
          </button>
          
          <div class="flex space-x-1 sm:space-x-2 max-w-[200px] sm:max-w-none overflow-x-auto">
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
              {#if pageNum === currentPage || Math.abs(pageNum - currentPage) <= 1 || pageNum === 1 || pageNum === totalPages}
                <button 
                  onclick={() => goToPage(pageNum)}
                  class="px-3 sm:px-4 py-2 text-sm font-semibold rounded-lg transition-all touch-manipulation flex-shrink-0"
                  class:bg-[#00BFB3]={pageNum === currentPage}
                  class:text-white={pageNum === currentPage}
                  class:bg-white={pageNum !== currentPage}
                  class:text-gray-700={pageNum !== currentPage}
                  class:border={pageNum !== currentPage}
                  class:border-gray-300={pageNum !== currentPage}
                  class:hover:bg-gray-50={pageNum !== currentPage}
                  class:focus:ring-2={pageNum !== currentPage}
                  class:focus:ring-gray-200={pageNum !== currentPage}
                  style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
                >
                  {pageNum}
                </button>
              {:else if Math.abs(pageNum - currentPage) === 2 && (pageNum === 2 || pageNum === totalPages - 1)}
                <span class="px-2 text-gray-500 flex items-center" style="font-family: 'Lato', sans-serif;">...</span>
              {/if}
            {/each}
          </div>
          
          <button 
            onclick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            class="px-3 sm:px-4 py-2 text-sm font-semibold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-200 transition-all touch-manipulation"
            style="font-family: 'Lato', sans-serif; -webkit-tap-highlight-color: transparent;"
          >
            <span class="hidden sm:inline">Próxima</span>
            <span class="sm:hidden">›</span>
          </button>
        </div>
      {/if}
    {/if}
  </div>
</main> 

<style>
  /* Animação suave para os pedidos */
  .space-y-6 > *, .space-y-4 > * {
    animation: fadeIn 0.3s ease-in-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Melhorias responsivas mobile-first */
  @media (max-width: 640px) {
    /* Scrolling suave no mobile */
    html {
      scroll-behavior: smooth;
    }
    
    /* Reduzir padding em elementos pequenos */
    .responsive-padding {
      padding: 0.75rem !important;
    }
    
    /* Paginação com scrolling horizontal suave */
    .overflow-x-auto {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    
    .overflow-x-auto::-webkit-scrollbar {
      display: none;
    }
  }
  
  /* Tablets */
  @media (min-width: 641px) and (max-width: 1024px) {
    /* Ajustes específicos para tablets */
    .tablet-padding {
      padding: 1.5rem;
    }
  }
  
  /* Remove hover effects em dispositivos touch */
  @media (hover: none) and (pointer: coarse) {
    .bg-white:hover {
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    }
  }
  
  /* Melhorias de acessibilidade */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  
  @media (prefers-contrast: high) {
    /* High contrast adjustments */
    button {
      background-color: #000 !important;
      color: #fff !important;
      border-color: #000 !important;
    }
  }
  
  /* Otimizações para dispositivos de baixa potência */
  @media (prefers-reduced-data: reduce) {
    .bg-gradient-to-br {
      background: #f9fafb !important;
    }
    
    .shadow-sm, .shadow-md {
      box-shadow: none !important;
      border: 1px solid #e5e7eb !important;
    }
  }
  
  /* Touch improvements */
  @supports (-webkit-touch-callout: none) {
    .touch-manipulation {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    
    button, a {
      -webkit-tap-highlight-color: transparent;
    }
  }
  
  /* Focus improvements para navegação por teclado */
  button:focus, a:focus {
    outline: 2px solid #00BFB3;
    outline-offset: 2px;
  }
  
  /* Performance improvements */
  .transition-all {
    will-change: transform, opacity;
  }
  
  /* Preparação para dark mode futuro */
  @media (prefers-color-scheme: dark) {
    /* Será implementado futuramente */
  }
  
  /* Grid responsive melhorado */
  @media (max-width: 640px) {
    .grid-cols-1.sm\:grid-cols-2 {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
    
    .grid-cols-2.sm\:grid-cols-3 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  
  /* Status color fixes */
  .bg-orange-100 { background-color: rgb(255 237 213); }
  .bg-blue-100 { background-color: rgb(219 234 254); }
  .bg-purple-100 { background-color: rgb(243 232 255); }
  .bg-indigo-100 { background-color: rgb(224 231 255); }
  .bg-green-100 { background-color: rgb(220 252 231); }
  .bg-red-100 { background-color: rgb(254 226 226); }
  
  /* Melhorias na aparência dos filtros */
  .filter-button-active {
    background: linear-gradient(135deg, #00BFB3 0%, #00A89D 100%);
    box-shadow: 0 2px 4px rgba(0, 191, 179, 0.2);
  }
</style> 