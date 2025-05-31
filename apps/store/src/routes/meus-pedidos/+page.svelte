<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, user } from '$lib/stores/auth';
  import { page } from '$app/stores';
  
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
    { value: '', label: 'Todos os Status' },
    { value: 'pending', label: 'Aguardando Pagamento' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'processing', label: 'Preparando' },
    { value: 'shipped', label: 'Enviado' },
    { value: 'delivered', label: 'Entregue' },
    { value: 'cancelled', label: 'Cancelado' }
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
</script>

<svelte:head>
  <title>Meus Pedidos - Marketplace GDG</title>
  <meta name="description" content="Acompanhe todos os seus pedidos" />
</svelte:head>

<main class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Meus Pedidos</h1>
          <p class="mt-1 text-gray-600">Acompanhe o status dos seus pedidos</p>
        </div>
        
        <a 
          href="/" 
          class="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          ← Continuar Comprando
        </a>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Filtros -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div class="flex-1">
          <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por Status:
          </label>
          <select 
            id="status-filter"
            bind:value={selectedStatus}
            onchange={handleStatusChange}
            class="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {#each statusOptions as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
        
        <div class="text-sm text-gray-500">
          {#if !loading}
            {orders.length > 0 ? `${orders.length} pedido${orders.length !== 1 ? 's' : ''} encontrado${orders.length !== 1 ? 's' : ''}` : 'Nenhum pedido encontrado'}
          {/if}
        </div>
      </div>
    </div>

    {#if loading}
      <!-- Loading State -->
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span class="ml-3 text-gray-600">Carregando pedidos...</span>
      </div>
      
    {:else if error}
      <!-- Error State -->
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 class="text-lg font-medium text-red-800 mb-2">Erro ao carregar pedidos</h3>
        <p class="text-red-600 mb-4">{error}</p>
        <button 
          onclick={loadOrders}
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
      
    {:else if orders.length === 0}
      <!-- Empty State -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <svg class="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 class="text-xl font-medium text-gray-900 mb-2">Nenhum pedido encontrado</h3>
        <p class="text-gray-600 mb-6">
          {selectedStatus ? 'Não há pedidos com este status.' : 'Você ainda não fez nenhum pedido.'}
        </p>
        
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          {#if selectedStatus}
            <button 
              onclick={() => { selectedStatus = ''; handleStatusChange(); }}
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Ver Todos os Pedidos
            </button>
          {/if}
          
          <a
            href="/"
            class="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
          >
            Começar a Comprar
          </a>
        </div>
      </div>
      
    {:else}
      <!-- Orders List -->
      <div class="space-y-6">
        {#each orders as order}
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <!-- Order Header -->
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="flex items-center space-x-4">
                  <span class="text-2xl">{getStatusIcon(order.status)}</span>
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900">
                      Pedido #{order.orderNumber}
                    </h3>
                    <p class="text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div class="flex items-center space-x-4">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
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
                  
                  <a
                    href="/meus-pedidos/{order.id}"
                    class="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Ver Detalhes
                    <svg class="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            
            <!-- Order Content -->
            <div class="p-6">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Items Preview -->
                <div class="lg:col-span-2">
                  <h4 class="font-medium text-gray-900 mb-3">
                    {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'itens'}
                  </h4>
                  
                  <div class="flex flex-wrap gap-2">
                    {#each order.items.slice(0, 4) as item}
                      <div class="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
                        <img 
                          src={item.productImage} 
                          alt={item.productName}
                          class="w-10 h-10 object-cover rounded"
                        />
                        <div class="text-sm">
                          <p class="font-medium text-gray-900 truncate max-w-32">
                            {item.productName}
                          </p>
                          <p class="text-gray-500">Qtd: {item.quantity}</p>
                        </div>
                      </div>
                    {/each}
                    
                    {#if order.items.length > 4}
                      <div class="flex items-center justify-center bg-gray-50 rounded-lg p-2 w-20 h-16">
                        <span class="text-sm text-gray-600">
                          +{order.items.length - 4}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>
                
                <!-- Order Summary -->
                <div class="lg:text-right">
                  <div class="space-y-2">
                    <div class="flex justify-between lg:justify-end lg:flex-col lg:text-right">
                      <span class="text-gray-600">Subtotal:</span>
                      <span>{formatCurrency(order.totalAmount - order.shippingCost + order.discountAmount)}</span>
                    </div>
                    
                    {#if order.shippingCost > 0}
                      <div class="flex justify-between lg:justify-end lg:flex-col lg:text-right">
                        <span class="text-gray-600">Frete:</span>
                        <span>{formatCurrency(order.shippingCost)}</span>
                      </div>
                    {/if}
                    
                    {#if order.discountAmount > 0}
                      <div class="flex justify-between lg:justify-end lg:flex-col lg:text-right text-green-600">
                        <span>Desconto:</span>
                        <span>-{formatCurrency(order.discountAmount)}</span>
                      </div>
                    {/if}
                    
                    <div class="flex justify-between lg:justify-end lg:flex-col lg:text-right text-lg font-bold border-t border-gray-200 pt-2">
                      <span>Total:</span>
                      <span class="text-primary">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="flex items-center justify-center space-x-2 mt-8">
          <button 
            onclick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
            {#if pageNum === currentPage || Math.abs(pageNum - currentPage) <= 2 || pageNum === 1 || pageNum === totalPages}
              <button 
                onclick={() => goToPage(pageNum)}
                class="px-3 py-2 text-sm font-medium rounded-md transition-colors"
                class:bg-primary={pageNum === currentPage}
                class:text-white={pageNum === currentPage}
                class:bg-white={pageNum !== currentPage}
                class:text-gray-700={pageNum !== currentPage}
                class:border={pageNum !== currentPage}
                class:border-gray-300={pageNum !== currentPage}
                class:hover:bg-gray-50={pageNum !== currentPage}
              >
                {pageNum}
              </button>
            {:else if Math.abs(pageNum - currentPage) === 3}
              <span class="px-2 text-gray-500">...</span>
            {/if}
          {/each}
          
          <button 
            onclick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      {/if}
    {/if}
  </div>
</main> 