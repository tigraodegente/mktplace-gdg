<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let orderNumber = '';
  
  onMount(() => {
    orderNumber = $page.url.searchParams.get('order') || '';
  });
</script>

<svelte:head>
  <title>Pedido Criado com Sucesso - Marketplace GDG</title>
</svelte:head>

<main class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Ícone de sucesso -->
    <div class="text-center">
      <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
        <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      
      <h1 class="mt-6 text-3xl font-bold text-gray-900">
        Pedido Criado com Sucesso!
      </h1>
      
      {#if orderNumber}
        <p class="mt-2 text-lg text-gray-600">
          Número do pedido: <span class="font-semibold text-gray-900">{orderNumber}</span>
        </p>
      {/if}
    </div>

    <!-- Informações do pedido -->
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">O que acontece agora?</h2>
      
      <div class="space-y-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
              <span class="text-sm font-medium text-blue-600">1</span>
            </div>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-gray-900">Confirmação por e-mail</h3>
            <p class="text-sm text-gray-500">Você receberá um e-mail com os detalhes do seu pedido.</p>
          </div>
        </div>

        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
              <span class="text-sm font-medium text-blue-600">2</span>
            </div>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-gray-900">Processamento</h3>
            <p class="text-sm text-gray-500">Seu pedido será processado e preparado para envio.</p>
          </div>
        </div>

        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100">
              <span class="text-sm font-medium text-blue-600">3</span>
            </div>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-gray-900">Acompanhamento</h3>
            <p class="text-sm text-gray-500">Você receberá atualizações sobre o status do pedido.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Ações -->
    <div class="flex flex-col space-y-3">
      <a 
        href="/" 
        class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Continuar Comprando
      </a>
      
      <a 
        href="/pedidos" 
        class="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Ver Meus Pedidos
      </a>
    </div>
  </div>
</main> 