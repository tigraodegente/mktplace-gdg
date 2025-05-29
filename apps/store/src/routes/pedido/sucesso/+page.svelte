<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let orderId = $state('');
  let orderData = $state<any>(null);
  
  onMount(() => {
    // Pegar o ID do pedido da URL
    const urlParams = new URLSearchParams($page.url.search);
    orderId = urlParams.get('orderId') || '';
    
    // TODO: Buscar dados reais do pedido
    // Por enquanto, vamos mockar
    orderData = {
      id: orderId,
      status: 'pending_payment',
      paymentMethod: 'pix',
      pixCode: '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000',
      total: 299.90,
      estimatedDelivery: '7 a 10 dias úteis'
    };
  });
  
  function copyPixCode() {
    if (orderData?.pixCode) {
      navigator.clipboard.writeText(orderData.pixCode);
      alert('Código PIX copiado!');
    }
  }
</script>

<svelte:head>
  <title>Pedido Realizado com Sucesso - Marketplace GDG</title>
  <meta name="description" content="Seu pedido foi realizado com sucesso" />
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12">
  <div class="max-w-3xl mx-auto px-4">
    <!-- Sucesso -->
    <div class="bg-white rounded-lg shadow-sm p-8 text-center mb-8">
      <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Pedido Realizado com Sucesso!</h1>
      <p class="text-gray-600 mb-6">
        Seu pedido <span class="font-semibold">#{orderId}</span> foi recebido e está sendo processado.
      </p>
      
      {#if orderData?.paymentMethod === 'pix'}
        <!-- Instruções PIX -->
        <div class="bg-orange-50 border border-orange-200 rounded-lg p-6 text-left mb-6">
          <h2 class="text-lg font-semibold text-orange-900 mb-3">
            Aguardando Pagamento via PIX
          </h2>
          <p class="text-sm text-orange-800 mb-4">
            Para confirmar seu pedido, realize o pagamento usando o código PIX abaixo:
          </p>
          
          <div class="bg-white border border-orange-300 rounded p-3 mb-3">
            <p class="text-xs text-gray-600 mb-1">Código PIX (copia e cola)</p>
            <p class="font-mono text-sm break-all">{orderData.pixCode}</p>
          </div>
          
          <button
            onclick={copyPixCode}
            class="w-full bg-orange-600 text-white py-2 px-4 rounded font-medium
                   hover:bg-orange-700 transition-colors"
          >
            Copiar Código PIX
          </button>
          
          <p class="text-xs text-orange-700 mt-3">
            * O código expira em 30 minutos. Após o pagamento, seu pedido será confirmado automaticamente.
          </p>
        </div>
        
        <!-- QR Code (placeholder) -->
        <div class="mb-6">
          <p class="text-sm text-gray-600 mb-3">Ou escaneie o QR Code:</p>
          <div class="w-48 h-48 bg-gray-200 mx-auto rounded-lg flex items-center justify-center">
            <span class="text-gray-500">QR Code PIX</span>
          </div>
        </div>
      {:else if orderData?.paymentMethod === 'boleto'}
        <!-- Instruções Boleto -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left mb-6">
          <h2 class="text-lg font-semibold text-blue-900 mb-3">
            Boleto Bancário Gerado
          </h2>
          <p class="text-sm text-blue-800 mb-4">
            Seu boleto foi gerado e enviado para seu e-mail. Você tem até 3 dias úteis para efetuar o pagamento.
          </p>
          
          <a
            href="#"
            class="inline-block bg-blue-600 text-white py-2 px-6 rounded font-medium
                   hover:bg-blue-700 transition-colors"
          >
            Baixar Boleto
          </a>
        </div>
      {/if}
      
      <!-- Informações do Pedido -->
      <div class="border-t pt-6">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-600">Valor Total</p>
            <p class="font-semibold text-lg">R$ {orderData?.total?.toFixed(2) || '0,00'}</p>
          </div>
          <div>
            <p class="text-gray-600">Prazo de Entrega</p>
            <p class="font-semibold">{orderData?.estimatedDelivery || 'A calcular'}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Próximos Passos -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Próximos Passos</h2>
      <ol class="space-y-3">
        <li class="flex items-start">
          <span class="flex-shrink-0 w-6 h-6 bg-[#00BFB3] text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
            1
          </span>
          <div>
            <p class="font-medium">Confirmação do Pagamento</p>
            <p class="text-sm text-gray-600">Aguardamos a confirmação do seu pagamento</p>
          </div>
        </li>
        <li class="flex items-start">
          <span class="flex-shrink-0 w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
            2
          </span>
          <div>
            <p class="font-medium">Preparação do Pedido</p>
            <p class="text-sm text-gray-600">O vendedor preparará seu pedido para envio</p>
          </div>
        </li>
        <li class="flex items-start">
          <span class="flex-shrink-0 w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
            3
          </span>
          <div>
            <p class="font-medium">Envio e Rastreamento</p>
            <p class="text-sm text-gray-600">Você receberá o código de rastreamento por e-mail</p>
          </div>
        </li>
      </ol>
    </div>
    
    <!-- Ações -->
    <div class="flex flex-col sm:flex-row gap-4">
      <a
        href="/pedidos"
        class="flex-1 bg-[#00BFB3] text-white py-3 px-6 rounded-lg font-semibold text-center
               hover:bg-[#00A89D] transition-colors"
      >
        Acompanhar Pedido
      </a>
      <a
        href="/"
        class="flex-1 bg-white text-[#00BFB3] py-3 px-6 rounded-lg font-semibold text-center
               border-2 border-[#00BFB3] hover:bg-[#00BFB3]/10 transition-colors"
      >
        Continuar Comprando
      </a>
    </div>
  </div>
</div> 