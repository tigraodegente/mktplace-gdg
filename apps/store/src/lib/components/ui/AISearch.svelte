<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { notificationStore } from '$lib/stores/notificationStore';
  
  const dispatch = createEventDispatcher();
  
  export let placeholder = "Busque sua dúvida aqui...";
  export let maxResults = 5;
  
  let query = '';
  let isSearching = false;
  let searchResults: any[] = [];
  let queryAnalysis: any = null;
  let searchMetadata: any = null;
  let showResults = false;
  let sessionId = crypto.randomUUID();
  
  // Tipos para as categorias de intenção
  type IntentCategory = 'informacao' | 'problema' | 'procedimento' | 'suporte';
  
  // Função de busca inteligente
  async function performAISearch() {
    if (!query.trim() || query.trim().length < 2) {
      notificationStore.addNotification({
        type: 'warning',
        title: 'Texto muito curto',
        message: 'Digite pelo menos 2 caracteres para realizar a busca inteligente'
      });
      return;
    }
    
    isSearching = true;
    
    try {
      const response = await fetch('/api/atendimento/faq/ai-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          user_session: sessionId,
          max_results: maxResults
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Erro na busca');
      }
      
      searchResults = data.data.results;
      queryAnalysis = data.data.query_analysis;
      searchMetadata = data.data.search_metadata;
      showResults = true;
      
      // Dispatch evento com resultados
      dispatch('searchResults', {
        query,
        results: searchResults,
        analysis: queryAnalysis,
        metadata: searchMetadata
      });
      
             // Analytics - notificação apenas se não encontrou nada
       if (searchResults.length === 0) {
         notificationStore.addNotification({
           type: 'warning',
           title: 'Nenhuma FAQ encontrada',
           message: `A IA não encontrou resultados para "${query}". Tente reformular sua pergunta.`
         });
       }
       
     } catch (error: any) {
       console.error('🤖 Erro na busca IA:', error);
       notificationStore.addNotification({
         type: 'error',
         title: 'Erro na busca inteligente',
         message: error.message || 'Tente novamente em alguns momentos'
       });
    } finally {
      isSearching = false;
    }
  }
  
  // Função para lidar com input (sem busca automática)
  function handleInput() {
    // Limpar resultados se query for muito curta
    if (query.trim().length < 2) {
      showResults = false;
      searchResults = [];
    }
  }
  
  // Função para buscar ao pressionar Enter
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      performAISearch();
    }
  }
  
  // Seleção de FAQ
  function selectFAQ(faq: any) {
    dispatch('faqSelected', faq);
    showResults = false;
  }
  
  // Categorias de intenção
  const intentCategories = {
    'informacao': { 
      label: 'Informação', 
      color: 'bg-blue-100 text-blue-800',
      icon: '💡'
    },
    'problema': { 
      label: 'Problema', 
      color: 'bg-red-100 text-red-800',
      icon: '🚨'
    },
    'procedimento': { 
      label: 'Procedimento', 
      color: 'bg-green-100 text-green-800',
      icon: '📋'
    },
    'suporte': { 
      label: 'Suporte', 
      color: 'bg-yellow-100 text-yellow-800',
      icon: '🛠️'
    }
  };
</script>

<div class="relative w-full">
  <!-- Campo de busca com botão -->
  <div class="flex gap-3">
    <div class="flex-1 relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {#if isSearching}
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00BFB3]"></div>
        {:else}
          <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        {/if}
      </div>
      
      <input
        type="text"
        bind:value={query}
        on:input={handleInput}
        on:keydown={handleKeydown}
        class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] sm:text-sm"
        {placeholder}
        disabled={isSearching}
      />
      
      {#if query}
        <button
          on:click={() => { query = ''; showResults = false; searchResults = []; }}
          class="absolute inset-y-0 right-0 pr-3 flex items-center"
          title="Limpar busca"
        >
          <svg class="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
    
    <!-- Botão de busca -->
    <button
      on:click={performAISearch}
      disabled={isSearching || query.trim().length < 2}
      class="px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center {
        isSearching 
          ? 'bg-[#00BFB3] text-white cursor-wait' 
          : query.trim().length < 2 
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
            : 'bg-[#00BFB3] text-white hover:bg-[#00a89b] cursor-pointer'
      }"
      style="font-family: 'Lato', sans-serif;"
      title={query.trim().length < 2 ? 'Digite pelo menos 2 caracteres' : 'Buscar com IA'}
    >
      {#if isSearching}
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span>Buscando...</span>
      {:else}
        <span>Buscar</span>
      {/if}
    </button>
  </div>
  


  <!-- Análise da consulta -->
  {#if queryAnalysis && showResults}
    <div class="mt-3 p-3 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg border border-[#00BFB3]/30">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <span class="text-lg">🧠</span>
          <span class="text-sm font-medium text-[#00BFB3]">
            Análise da IA: {queryAnalysis.intent}
          </span>
        </div>
        <span class="text-xs text-[#00a89b] font-mono">
          {Math.round(queryAnalysis.confidence * 100)}% confiança
        </span>
      </div>
      
      {#if queryAnalysis.suggested_keywords.length > 0}
        <div class="flex flex-wrap gap-1">
          <span class="text-xs text-gray-600">Palavras-chave:</span>
          {#each queryAnalysis.suggested_keywords as keyword}
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00BFB3]/10 text-[#00BFB3]">
              {keyword}
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Resultados da busca -->
  {#if showResults && searchResults.length > 0}
    <div class="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
      <div class="p-3 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-900">
            {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}
          </span>
          {#if searchMetadata}
            <span class="text-xs text-gray-500">
              {searchMetadata.processing_time_ms}ms • {searchMetadata.cache_hit ? 'Cache' : 'IA'}
            </span>
          {/if}
        </div>
      </div>
      
      {#each searchResults as result, index}
        <button
          on:click={() => selectFAQ(result)}
          class="w-full text-left p-4 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 {index < searchResults.length - 1 ? 'border-b border-gray-100' : ''}"
        >
          <!-- Header com score e categoria -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-medium text-green-600">
                {Math.round(result.relevance_score * 100)}% relevante
              </span>
              
                             {#if result.intent_category && intentCategories[result.intent_category as IntentCategory]}
                 <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {intentCategories[result.intent_category as IntentCategory].color}">
                   {intentCategories[result.intent_category as IntentCategory].icon} {intentCategories[result.intent_category as IntentCategory].label}
                 </span>
               {/if}
            </div>
            
            <span class="text-xs text-gray-500">
              {result.category_name}
            </span>
          </div>
          
          <!-- Pergunta -->
          <h4 class="text-sm font-medium text-gray-900 mb-2">
            {result.question}
          </h4>
          
          <!-- Resposta (resumida) -->
          <p class="text-sm text-gray-600 mb-2 line-clamp-2">
            {result.answer.length > 120 ? result.answer.substring(0, 120) + '...' : result.answer}
          </p>
          
          <!-- Análise da IA -->
          <div class="text-xs text-blue-600 mb-2">
            <strong>Por que é relevante:</strong> {result.reasoning}
          </div>
          
          <!-- Conceitos encontrados -->
          {#if result.matched_concepts.length > 0}
            <div class="flex flex-wrap gap-1 mb-2">
              {#each result.matched_concepts as concept}
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {concept}
                </span>
              {/each}
            </div>
          {/if}
          
          <!-- Stats -->
          <div class="flex items-center justify-between text-xs text-gray-500">
            <div class="flex items-center space-x-3">
              <span>👁️ {result.view_count} visualizações</span>
              <span>👍 {result.helpful_count} úteis</span>
            </div>
            <span>Clique para ver completa →</span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
  
  <!-- Estado vazio -->
  {#if showResults && searchResults.length === 0 && !isSearching}
    <div class="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-lg border border-gray-200 p-6 text-center">
      <div class="text-gray-400 mb-2">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 10-8 8 7.962 7.962 0 014.708-1.709L18 21l-3.6-3.6-.708-.709z" />
        </svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900 mb-1">Nenhuma FAQ encontrada</h3>
      <p class="text-sm text-gray-500">
        A IA não encontrou FAQ relevantes para "{query}". Tente reformular sua pergunta.
      </p>
    </div>
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style> 