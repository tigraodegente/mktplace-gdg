<script lang="ts">
  import { onMount } from 'svelte';
  
  let postalCode = '01310-100';
  let productWeight = 0.2;
  let productPrice = 299.99;
  let productName = 'iPhone 15 Pro';
  let sellerId = 'seller-1';
  
  let loading = false;
  let result: any = null;
  let error = '';

  async function testBasicConnection() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/shipping/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postalCode: postalCode.replace(/\D/g, '') })
      });
      
      const data = await response.json();
      result = data;
    } catch (err) {
      error = 'Erro na conexão: ' + err;
    } finally {
      loading = false;
    }
  }

  async function calculateShipping() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/shipping/calculate-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postalCode,
          sellerId,
          items: [{
            product: {
              id: 'test-product',
              name: productName,
              price: productPrice,
              weight: productWeight
            },
            quantity: 1
          }]
        })
      });
      
      const data = await response.json();
      result = data;
    } catch (err) {
      error = 'Erro no cálculo: ' + err;
    } finally {
      loading = false;
    }
  }

  async function testFreeShipping() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/shipping/calculate-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postalCode,
          sellerId,
          items: [{
            product: {
              id: 'iphone-15-pro', // Produto configurado para frete grátis
              name: 'iPhone 15 Pro Especial',
              price: 199.99,
              weight: 0.2
            },
            quantity: 1
          }]
        })
      });
      
      const data = await response.json();
      result = data;
    } catch (err) {
      error = 'Erro no teste: ' + err;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Teste - Sistema Universal de Frete</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-4xl mx-auto px-4">
    
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        🚛 Sistema Universal de Frete
      </h1>
      <p class="text-gray-600">
        Teste do sistema integrado com dados reais da Frenet
      </p>
    </div>

    <!-- Configurações -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Configurações do Teste</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            CEP de Destino
          </label>
          <input 
            type="text" 
            bind:value={postalCode}
            placeholder="01310-100"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Seller ID
          </label>
          <input 
            type="text" 
            bind:value={sellerId}
            placeholder="seller-1"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Nome do Produto
          </label>
          <input 
            type="text" 
            bind:value={productName}
            placeholder="iPhone 15 Pro"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Peso (kg)
          </label>
          <input 
            type="number" 
            bind:value={productWeight}
            step="0.1"
            min="0"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Preço (R$)
          </label>
          <input 
            type="number" 
            bind:value={productPrice}
            step="0.01"
            min="0"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Botões de Teste -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Testes Disponíveis</h2>
      
      <div class="flex flex-wrap gap-4">
        <button 
          on:click={testBasicConnection}
          disabled={loading}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⏳' : '🔌'} Testar Conexão
        </button>
        
        <button 
          on:click={calculateShipping}
          disabled={loading}
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? '⏳' : '💰'} Calcular Frete
        </button>
        
        <button 
          on:click={testFreeShipping}
          disabled={loading}
          class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? '⏳' : '🎁'} Testar Frete Grátis
        </button>
      </div>
    </div>

    <!-- Resultados -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h3 class="text-lg font-semibold text-red-800 mb-2">❌ Erro</h3>
        <p class="text-red-700">{error}</p>
      </div>
    {/if}

    {#if result}
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h2 class="text-xl font-semibold mb-4">📊 Resultado</h2>
        
        {#if result.success}
          <!-- Resultado de Sucesso -->
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 class="text-lg font-semibold text-green-800 mb-2">✅ Sucesso</h3>
            
            {#if result.data.options}
              <!-- Opções de Frete -->
              <div class="space-y-3">
                {#each result.data.options as option}
                  <div class="bg-white border rounded-lg p-4">
                    <div class="flex justify-between items-start mb-2">
                      <h4 class="font-semibold text-gray-900">{option.name}</h4>
                      <div class="text-right">
                        {#if option.isFree}
                          <span class="text-2xl font-bold text-green-600">GRÁTIS</span>
                          <p class="text-sm text-gray-500 line-through">R$ {option.originalPrice.toFixed(2)}</p>
                        {:else}
                          <span class="text-2xl font-bold text-gray-900">R$ {option.price.toFixed(2)}</span>
                        {/if}
                      </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>Prazo:</strong> {option.deliveryDaysMin}-{option.deliveryDaysMax} dias
                      </div>
                      <div>
                        <strong>Transportadora:</strong> {option.carrierName}
                      </div>
                      {#if option.freeReason}
                        <div class="col-span-2">
                          <strong>Motivo:</strong> {option.freeReason}
                        </div>
                      {/if}
                    </div>
                    
                    {#if option.breakdown}
                      <div class="mt-3 pt-3 border-t">
                        <h5 class="font-medium text-gray-700 mb-2">Detalhamento:</h5>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                          <div>Preço Base: R$ {option.breakdown.basePrice.toFixed(2)}</div>
                          <div>GRIS: R$ {(option.breakdown.taxes.gris || 0).toFixed(2)}</div>
                          <div>ADV: R$ {(option.breakdown.taxes.adv || 0).toFixed(2)}</div>
                          <div>Total Taxas: R$ {option.breakdown.totalTaxes.toFixed(2)}</div>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
            
            <!-- Resumo do Cálculo -->
            {#if result.data.totalWeight || result.data.totalValue}
              <div class="mt-4 p-3 bg-gray-50 rounded">
                <h5 class="font-medium text-gray-700 mb-2">Resumo:</h5>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  {#if result.data.totalWeight}
                    <div>Peso Total: {result.data.totalWeight}g</div>
                  {/if}
                  {#if result.data.totalValue}
                    <div>Valor Total: R$ {result.data.totalValue.toFixed(2)}</div>
                  {/if}
                  {#if result.data.postalCode}
                    <div>CEP: {result.data.postalCode}</div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Resultado de Erro -->
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-red-800 mb-2">❌ Erro na API</h3>
            <p class="text-red-700">{result.error?.message}</p>
            {#if result.error?.details}
              <p class="text-sm text-red-600 mt-2">{result.error.details}</p>
            {/if}
          </div>
        {/if}
        
        <!-- JSON Raw para Debug -->
        <details class="mt-4">
          <summary class="cursor-pointer text-gray-600 hover:text-gray-800">
            Ver JSON completo
          </summary>
          <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </details>
      </div>
    {/if}
  </div>
</div> 