<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let orderResult: any = null;
  let loading = true;
  
  onMount(() => {
    // Carregar dados do pedido
    if (typeof window !== 'undefined') {
      const savedResult = sessionStorage.getItem('orderResult');
      if (savedResult) {
        try {
          orderResult = JSON.parse(savedResult);
        } catch (error) {
          console.error('Erro ao carregar resultado do pedido:', error);
          goto('/');
          return;
        }
      } else {
        // Se não há dados, redirecionar para home
        goto('/');
        return;
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
  
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Código copiado!');
    });
  }
  
  function handleNewOrder() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('orderResult');
    }
    goto('/');
  }
  
  $: paymentMethod = orderResult?.payment?.method || '';
  $: paymentData = orderResult?.payment?.paymentData || {};
</script>

<svelte:head>
  <title>Pedido Realizado com Sucesso! - Marketplace GDG</title>
  <meta name="description" content="Seu pedido foi realizado com sucesso" />
</svelte:head>

{#if loading}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFB3] mx-auto mb-4"></div>
      <p class="text-gray-600">Carregando...</p>
    </div>
  </div>
{:else if orderResult}
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header de Sucesso -->
      <div class="text-center mb-8">
        <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Pedido Realizado com Sucesso!</h1>
        <p class="text-gray-600 mb-4">
          Pedido <strong>#{orderResult.order.orderNumber}</strong> criado em {formatDate(orderResult.order.createdAt)}
        </p>
        
        <!-- Status badge -->
        <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          {orderResult.payment.status === 'paid' ? 'Pagamento Confirmado' : 'Aguardando Pagamento'}
        </div>
      </div>
      
      <!-- Informações de Pagamento -->
      <div class="mb-8">
        {#if paymentMethod === 'pix'}
          <div class="bg-green-50 border border-green-200 rounded-xl p-6">
            <div class="flex items-center space-x-3 mb-4">
              <span class="text-3xl">💲</span>
              <div>
                <h3 class="text-xl font-bold text-green-800">Pagamento PIX</h3>
                <p class="text-green-700">Complete o pagamento para confirmar seu pedido</p>
              </div>
            </div>
            
            <!-- QR Code simulado -->
            <div class="bg-white p-6 rounded-lg border-2 border-green-300 mb-4 text-center">
              <div class="w-48 h-48 bg-gray-50 mx-auto mb-4 rounded-lg flex items-center justify-center">
                <span class="text-gray-500">QR Code PIX</span>
              </div>
              <p class="text-sm text-gray-600 mb-4">Escaneie com o app do seu banco</p>
              
              <!-- Código copia e cola -->
              <div class="bg-gray-50 p-3 rounded border">
                <p class="text-xs text-gray-700 mb-2">Código PIX (Copiar e Colar):</p>
                <div class="flex items-center space-x-2">
                  <code class="flex-1 text-xs bg-white p-2 rounded border font-mono break-all">
                    {paymentData.qrCode || '00020126580014br.gov.bcb.pix2536marketplace@exemplo.com.br'}
                  </code>
                  <button
                    onclick={() => copyToClipboard(paymentData.qrCode || '00020126580014br.gov.bcb.pix2536marketplace@exemplo.com.br')}
                    class="px-3 py-2 bg-[#00BFB3] text-white text-xs rounded hover:bg-[#00A89D]"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
            
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p class="text-sm text-yellow-800">
                ⏰ <strong>Importante:</strong> Este código expira em 15 minutos. Após o pagamento, você receberá confirmação automaticamente.
              </p>
            </div>
          </div>
          
        {:else if paymentMethod === 'credit_card' || paymentMethod === 'debit_card'}
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div class="flex items-center space-x-3 mb-4">
              <span class="text-3xl">💳</span>
              <div>
                <h3 class="text-xl font-bold text-blue-800">
                  {paymentMethod === 'credit_card' ? 'Cartão de Crédito' : 'Cartão de Débito'}
                </h3>
                <p class="text-blue-700">Pagamento processado com sucesso</p>
              </div>
            </div>
            
            {#if orderResult.payment.status === 'paid'}
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <div class="flex items-center space-x-2 text-green-800">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span class="font-semibold">Transação Aprovada!</span>
                </div>
                <p class="text-green-700 mt-1">
                  Cartão final {paymentData.cardLast4 || '****'} • Autorização: {paymentData.authorizationCode || 'AUTH123456'}
                </p>
              </div>
            {:else}
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p class="text-yellow-800">
                  Processando pagamento... Você receberá confirmação em breve.
                </p>
              </div>
            {/if}
          </div>
          
        {:else if paymentMethod === 'boleto'}
          <div class="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div class="flex items-center space-x-3 mb-4">
              <span class="text-3xl">🏦</span>
              <div>
                <h3 class="text-xl font-bold text-orange-800">Boleto Bancário</h3>
                <p class="text-orange-700">Pague em qualquer banco ou casa lotérica</p>
              </div>
            </div>
            
            <div class="bg-white border border-orange-300 rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-2">Código de Barras:</p>
              <div class="font-mono text-xs bg-gray-50 p-2 rounded border break-all">
                {paymentData.barcodeNumber || '03399876543210987654321098765432109876543210'}
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onclick={() => window.open('#', '_blank')}
                class="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
              >
                📄 Baixar Boleto PDF
              </button>
              <button
                onclick={() => copyToClipboard(paymentData.barcodeNumber || '03399876543210987654321098765432109876543210')}
                class="flex-1 py-2 px-4 border border-orange-600 text-orange-700 rounded-lg hover:bg-orange-50 text-sm font-medium"
              >
                📋 Copiar Código
              </button>
            </div>
            
            <div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p class="text-sm text-yellow-800">
                📅 <strong>Vencimento:</strong> 3 dias úteis • Processamento: até 3 dias após pagamento
              </p>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Resumo do Pedido -->
      <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Resumo do Pedido</h3>
        
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Número do Pedido:</span>
            <span class="font-semibold">#{orderResult.order.orderNumber}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Valor Total:</span>
            <span class="font-bold text-lg text-[#00BFB3]">
              {formatCurrency(orderResult.order.total)}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Forma de Pagamento:</span>
            <span class="font-semibold">
              {paymentMethod === 'pix' ? 'PIX' :
               paymentMethod === 'credit_card' ? 'Cartão de Crédito' :
               paymentMethod === 'debit_card' ? 'Cartão de Débito' :
               paymentMethod === 'boleto' ? 'Boleto Bancário' : 'N/A'}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-semibold">
              {orderResult.payment.status === 'paid' ? 
                '✅ Pago' : 
                '⏳ Aguardando Pagamento'}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Próximos Passos -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <h3 class="text-lg font-bold text-blue-900 mb-3">📋 Próximos Passos</h3>
        
        <div class="space-y-2 text-blue-800 text-sm">
          {#if paymentMethod === 'pix'}
            <p>• Complete o pagamento PIX usando o código ou QR Code acima</p>
            <p>• Receba confirmação automática em alguns segundos</p>
          {:else if paymentMethod === 'boleto'}
            <p>• Pague o boleto em qualquer banco, casa lotérica ou app bancário</p>
            <p>• Aguarde até 3 dias úteis para confirmação do pagamento</p>
          {:else}
            <p>• Aguarde confirmação do pagamento (pode levar alguns minutos)</p>
          {/if}
          <p>• Receba e-mail de confirmação com detalhes do pedido</p>
          <p>• Acompanhe o status na seção "Meus Pedidos"</p>
          <p>• Prepare-se para receber seu produto no endereço informado</p>
        </div>
      </div>
      
      <!-- Botões de Ação -->
      <div class="text-center space-y-4">
        <div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
          <button
            onclick={() => window.print()}
            class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            🖨️ Imprimir Comprovante
          </button>
          
          <a
            href="/orders"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-block"
          >
            📦 Meus Pedidos
          </a>
          
          <button
            onclick={handleNewOrder}
            class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] font-medium"
          >
            🛒 Nova Compra
          </button>
        </div>
        
        <!-- Suporte -->
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-600">
            <strong>Precisa de ajuda?</strong><br>
            WhatsApp: (11) 99999-9999 • E-mail: suporte@marketplace.com
          </p>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h1>
      <p class="text-gray-600 mb-4">Não foi possível carregar as informações do pedido.</p>
      <a href="/" class="px-6 py-3 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] font-medium">
        Voltar ao Início
      </a>
    </div>
  </div>
{/if}

<style>
  @media print {
    button, a[href^="tel"], a[href^="mailto"] {
      display: none !important;
    }
  }
</style> 