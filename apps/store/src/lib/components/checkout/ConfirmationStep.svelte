<script lang="ts">
  export let order: any;
  export let onNewOrder: () => void;
  
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
      alert('Código copiado para a área de transferência!');
    });
  }
  
  function downloadBoleto() {
    // Em produção, seria um link real do boleto
    alert('Download do boleto iniciado!');
  }
  
  $: paymentMethod = order?.payment?.method || '';
  $: paymentData = order?.payment?.paymentData || {};
</script>

<div class="p-6 text-center">
  <!-- Ícone de Sucesso -->
  <div class="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
  </div>
  
  <!-- Título -->
  <h2 class="text-3xl font-bold text-gray-900 mb-2">Pedido Realizado com Sucesso!</h2>
  <p class="text-gray-600 mb-8">
    Seu pedido <strong>#{order?.order?.orderNumber}</strong> foi criado em {formatDate(order?.order?.createdAt)}
  </p>
  
  <!-- Informações de Pagamento -->
  <div class="max-w-2xl mx-auto">
    {#if paymentMethod === 'pix'}
      <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <span class="text-2xl">💲</span>
          <h3 class="text-xl font-semibold text-green-800">Pagamento PIX</h3>
        </div>
        
        <p class="text-green-700 mb-4">
          Escaneie o QR Code ou use o código PIX para finalizar o pagamento
        </p>
        
        <!-- QR Code simulado -->
        <div class="bg-white p-4 rounded-lg border-2 border-green-300 mb-4 inline-block">
          <div class="w-48 h-48 bg-gray-200 flex items-center justify-center rounded">
            <span class="text-gray-500 text-sm">QR Code PIX</span>
          </div>
        </div>
        
        <!-- Código PIX -->
        <div class="bg-white border border-green-300 rounded-lg p-4">
          <p class="text-sm text-gray-700 mb-2">Código PIX (Copiar e Colar):</p>
          <div class="flex items-center space-x-2">
            <code class="flex-1 text-xs bg-gray-50 p-2 rounded border font-mono break-all">
              {paymentData.copyPaste || paymentData.qrCode || 'Código PIX será gerado em instantes...'}
            </code>
            <button
              onclick={() => copyToClipboard(paymentData.copyPaste || paymentData.qrCode)}
              class="px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Copiar
            </button>
          </div>
        </div>
        
        <p class="text-sm text-green-600 mt-4">
          ⏰ Este código expira em 15 minutos
        </p>
      </div>
      
    {:else if paymentMethod === 'credit_card' || paymentMethod === 'debit_card'}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <span class="text-2xl">💳</span>
          <h3 class="text-xl font-semibold text-blue-800">
            Pagamento {paymentMethod === 'credit_card' ? 'no Cartão de Crédito' : 'no Cartão de Débito'}
          </h3>
        </div>
        
        {#if order?.payment?.status === 'paid'}
          <div class="flex items-center justify-center space-x-2 text-green-600 mb-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="font-semibold">Pagamento Aprovado!</span>
          </div>
          
          <p class="text-blue-700 mb-2">
            Transação aprovada com sucesso
          </p>
          {#if paymentData.authorizationCode}
            <p class="text-sm text-blue-600">
              Código de autorização: <code class="font-mono">{paymentData.authorizationCode}</code>
            </p>
          {/if}
        {:else}
          <p class="text-blue-700">
            Seu pagamento está sendo processado. Você receberá uma confirmação em breve.
          </p>
        {/if}
      </div>
      
    {:else if paymentMethod === 'boleto'}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <span class="text-2xl">🏦</span>
          <h3 class="text-xl font-semibold text-yellow-800">Boleto Bancário</h3>
        </div>
        
        <p class="text-yellow-700 mb-4">
          Seu boleto foi gerado com sucesso!
        </p>
        
        <!-- Código de Barras simulado -->
        <div class="bg-white border border-yellow-300 rounded-lg p-4 mb-4">
          <p class="text-sm text-gray-700 mb-2">Código de Barras:</p>
          <code class="text-xs font-mono bg-gray-50 p-2 rounded block">
            {paymentData.barcodeNumber || '03399876543210987654321098765432109876543210'}
          </code>
        </div>
        
        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 justify-center">
          <button
            onclick={downloadBoleto}
            class="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            📄 Baixar Boleto PDF
          </button>
          <button
            onclick={() => copyToClipboard(paymentData.digitableLine || paymentData.barcodeNumber)}
            class="px-6 py-2 border border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50"
          >
            📋 Copiar Código
          </button>
        </div>
        
        <p class="text-sm text-yellow-600 mt-4">
          ⏰ Vencimento: 3 dias úteis
        </p>
      </div>
    {/if}
    
    <!-- Resumo do Pedido -->
    <div class="bg-gray-50 rounded-lg p-6 mb-6 text-left">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Resumo do Pedido</h3>
      
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-600">Número do Pedido:</span>
          <span class="font-semibold">#{order?.order?.orderNumber}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-gray-600">Total:</span>
          <span class="font-semibold text-lg text-green-600">
            {formatCurrency(order?.order?.total || 0)}
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
          <span class="font-semibold text-yellow-600">
            {order?.payment?.status === 'paid' ? 'Pago' : 'Aguardando Pagamento'}
          </span>
        </div>
      </div>
    </div>
    
    <!-- Próximos Passos -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-left">
      <h3 class="text-lg font-semibold text-blue-900 mb-3">📋 Próximos Passos</h3>
      
      <div class="space-y-2 text-blue-800">
        {#if paymentMethod === 'pix'}
          <p>• Realize o pagamento PIX usando o código ou QR Code acima</p>
          <p>• Aguarde a confirmação automática do pagamento</p>
        {:else if paymentMethod === 'boleto'}
          <p>• Baixe o boleto e pague em qualquer banco ou casa lotérica</p>
          <p>• O pagamento pode levar até 3 dias úteis para ser confirmado</p>
        {:else}
          <p>• Aguarde a confirmação do pagamento</p>
        {/if}
        <p>• Você receberá um e-mail de confirmação</p>
        <p>• Acompanhe o status do seu pedido na área "Meus Pedidos"</p>
        <p>• Em caso de dúvidas, entre em contato conosco</p>
      </div>
    </div>
    
    <!-- Botões de Ação -->
    <div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
      <button
        onclick={() => window.print()}
        class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
      >
        🖨️ Imprimir Confirmação
      </button>
      
      <a
        href="/orders"
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
      >
        📦 Ver Meus Pedidos
      </a>
      
      <button
        onclick={onNewOrder}
        class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        🛒 Fazer Novo Pedido
      </button>
    </div>
    
    <!-- Suporte -->
    <div class="mt-8 p-4 bg-gray-50 rounded-lg">
      <p class="text-sm text-gray-600">
        <strong>Precisa de ajuda?</strong><br>
        Entre em contato conosco pelo WhatsApp: (11) 99999-9999<br>
        Ou envie um e-mail para: suporte@marketplace.com
      </p>
    </div>
  </div>
</div>

<style>
  @media print {
    button {
      display: none;
    }
  }
</style> 