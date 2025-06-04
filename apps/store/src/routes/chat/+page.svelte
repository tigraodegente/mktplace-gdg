<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let conversations: any[] = [];
  let loading = true;
  let error = '';
  let selectedType = 'all';
  let searchQuery = '';

  // Estado para expansão de texto
  let mostrarMais = false;

  // Ícones SVG profissionais
  function getIconSVG(iconName: string) {
    const icons: Record<string, string> = {
      support: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />`,
      seller: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />`,
      order: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />`,
      search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />`,
      plus: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />`,
      refresh: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`,
      filter: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />`,
      chat: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />`
    };
    return icons[iconName] || icons.support;
  }

  const chatTypes = [
    { value: 'all', label: 'Todas', icon: 'support' },
    { value: 'support', label: 'Suporte', icon: 'support' },
    { value: 'seller', label: 'Vendedores', icon: 'seller' },
    { value: 'order', label: 'Pedidos', icon: 'order' }
  ];

  async function loadConversations() {
    try {
      loading = true;
      error = '';
      
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.set('type', selectedType);
      
      const response = await fetch(`/api/chat/conversations?${params}`);
      const result = await response.json();
      
      if (result.success) {
        conversations = result.data.conversations;
      } else {
        error = 'Erro ao carregar conversas';
      }
    } catch (err) {
      error = 'Erro de conexão';
      console.error('Erro ao carregar conversas:', err);
    } finally {
      loading = false;
    }
  }

  function openConversation(conversationId: string) {
    goto(`/chat/${conversationId}`);
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Agora há pouco';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  }

  function getTypeIcon(type: string) {
    const typeConfig = chatTypes.find(t => t.value === type) || chatTypes[0];
    return typeConfig.icon;
  }

  async function createSupportChat() {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'support',
          title: 'Conversa com Suporte',
          participants: ['current-user', 'support-team']
        })
      });
      
      const result = await response.json();
      if (result.success) {
        if (result.data.conversation_id) {
          goto(`/chat/${result.data.conversation_id}`);
        } else {
          goto(`/chat/${result.data.id}`);
        }
      }
    } catch (err) {
      console.error('Erro ao criar chat:', err);
    }
  }
  
  function toggleMostrarMais() {
    mostrarMais = !mostrarMais;
  }

  onMount(() => {
    loadConversations();
  });

  $: if (selectedType) {
    loadConversations();
  }

  $: filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    return conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.last_message?.content?.toLowerCase().includes(searchQuery.toLowerCase());
  });
</script>

<svelte:head>
  <title>Chat - Grão de Gente Marketplace</title>
  <meta name="description" content="Central de conversas e suporte ao cliente do marketplace Grão de Gente" />
  <meta name="keywords" content="chat, suporte, atendimento, conversas, grão de gente, marketplace" />
</svelte:head>

<!-- Header Padrão do Projeto -->
<div class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">Chat</h1>
        <p class="mt-1 text-gray-600" style="font-family: 'Lato', sans-serif;">
          {#if conversations.length > 0}
            {conversations.length} {conversations.length === 1 ? 'conversa' : 'conversas'} • Atendimento especializado
          {:else}
            Central de conversas e suporte ao cliente
          {/if}
        </p>
      </div>
      
      <a 
        href="/" 
        class="text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors"
        style="font-family: 'Lato', sans-serif;"
      >
        ← Continuar Comprando
      </a>
    </div>

    <!-- Descrição expandível -->
    <div class="mt-6 pt-6 border-t border-gray-200">
      <div class="text-center">
        <p class="text-gray-600 text-base leading-relaxed mb-4" style="font-family: 'Lato', sans-serif;">
          Converse com nossa equipe especializada. Estamos aqui para ajudar com produtos, 
          pedidos e dúvidas em tempo real!
        </p>
        
        <button
          onclick={toggleMostrarMais}
          class="inline-flex items-center gap-2 text-[#00BFB3] hover:text-[#00A89D] font-medium transition-colors text-sm"
          style="font-family: 'Lato', sans-serif;"
        >
          <span>{mostrarMais ? 'Ver Menos' : 'Ver Mais'}</span>
          <svg 
            class="w-4 h-4 transition-transform {mostrarMais ? 'rotate-180' : ''}" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {#if mostrarMais}
          <div class="mt-4 text-gray-600 text-base leading-relaxed" style="font-family: 'Lato', sans-serif;">
            <p>
              Respondemos em até 5 minutos durante o horário comercial. Use os filtros para 
              organizar suas conversas e tenha sempre em mãos o número do pedido para consultas sobre entregas.
            </p>
        </div>
        {/if}
      </div>
    </div>
      </div>
    </div>

<!-- Conteúdo Principal -->
<main class="py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Sidebar com filtros -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">Filtros</h2>
          <nav class="space-y-2">
          {#each chatTypes as type}
            <button
              onclick={() => selectedType = type.value}
                class="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors text-sm font-medium
                  {selectedType === type.value 
                    ? 'bg-[#00BFB3] text-white' 
                    : 'text-gray-700 hover:bg-gray-50'}"
                style="font-family: 'Lato', sans-serif;"
            >
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {@html getIconSVG(type.icon)}
                </svg>
                  <span>{type.label}</span>
              </div>
            </button>
          {/each}
          </nav>
        </div>
      </div>

      <!-- Lista de conversas -->
      <div class="lg:col-span-3">
        {#if !loading && conversations.length > 0}
          <!-- Action Bar igual aos outros -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                <svg class="h-6 w-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <div>
                  <h2 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
                    Central de Conversas
                  </h2>
                  <p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
                    Gerencie suas conversas e suporte
                  </p>
                </div>
        </div>

        <div class="flex gap-3">
          <button
            onclick={loadConversations}
                  class="inline-flex items-center px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                  style="font-family: 'Lato', sans-serif;"
          >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
                  Atualizar
          </button>
          <button
            onclick={createSupportChat}
                  class="inline-flex items-center px-4 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
                  style="font-family: 'Lato', sans-serif;"
          >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nova Conversa
          </button>
        </div>
      </div>

            <!-- Campo de Busca dentro do Action Bar -->
            <div class="mt-4 pt-4 border-t border-gray-100">
        <div class="relative">
                <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('search')}
          </svg>
          <input
            type="text"
                  placeholder="Buscar conversas..."
            bind:value={searchQuery}
                  class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
                  style="font-family: 'Lato', sans-serif;"
          />
          {#if searchQuery}
            <button
              onclick={() => searchQuery = ''}
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      </div>
    </div>
        {/if}

      {#if loading}
          <!-- Loading -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00BFB3] mx-auto mb-4"></div>
            <p class="text-gray-600" style="font-family: 'Lato', sans-serif;">Carregando conversas...</p>
        </div>
      {:else if error}
          <!-- Erro -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div class="text-red-500 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
            <p class="text-gray-900 font-medium mb-2" style="font-family: 'Lato', sans-serif;">Erro ao carregar</p>
            <p class="text-gray-600 mb-4" style="font-family: 'Lato', sans-serif;">{error}</p>
          <button
            onclick={loadConversations}
              class="px-4 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] font-medium transition-colors"
              style="font-family: 'Lato', sans-serif;"
          >
            Tentar novamente
          </button>
        </div>
      {:else if filteredConversations.length === 0}
          <!-- Estado vazio igual aos outros -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg class="mx-auto h-16 w-16 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 class="text-xl font-medium text-gray-900 mb-2" style="font-family: 'Lato', sans-serif;">
            {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </h2>
            <p class="text-gray-600 mb-8 max-w-md mx-auto" style="font-family: 'Lato', sans-serif;">
            {searchQuery 
              ? 'Nenhuma conversa corresponde à sua busca. Tente outros termos.' 
              : 'Você ainda não tem conversas. Que tal começar uma nova conversa com nossa equipe?'}
          </p>
            
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              {#if searchQuery}
                <button 
                  onclick={() => searchQuery = ''}
                  class="inline-flex items-center px-6 py-2 bg-white text-[#00BFB3] text-sm font-medium rounded-md border border-[#00BFB3] hover:bg-[#00BFB3] hover:text-white transition-colors"
                  style="font-family: 'Lato', sans-serif;"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Ver Todas
                </button>
              {/if}
              <button
                onclick={createSupportChat}
                class="inline-flex items-center px-6 py-2 bg-[#00BFB3] text-white text-sm font-medium rounded-md hover:bg-[#00A89D] transition-colors"
                style="font-family: 'Lato', sans-serif;"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {searchQuery ? 'Nova Conversa' : 'Iniciar Primeira Conversa'}
              </button>
            </div>
        </div>
      {:else}
          <!-- Lista de conversas igual aos outros -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-6">
              <svg class="h-5 w-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              <h3 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
                Suas Conversas
              </h3>
            </div>
            
            <div class="space-y-4">
          {#each filteredConversations as conversation}
                <div class="border-l-4 border-[#00BFB3] bg-gray-50 rounded-r-lg">
            <button
              onclick={() => openConversation(conversation.id)}
                    class="w-full p-4 text-left hover:bg-gray-100 transition-colors rounded-r-lg"
            >
              <div class="flex items-start gap-4">
                      <!-- Ícone -->
                      <div class="text-[#00BFB3] mt-1">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {@html getIconSVG(getTypeIcon(conversation.type))}
                    </svg>
                </div>

                <!-- Conteúdo -->
                <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between">
                          <h3 class="text-lg font-medium text-gray-900" style="font-family: 'Lato', sans-serif;">
                        {conversation.title || `Conversa ${conversation.type}`}
                      </h3>
                          <div class="flex items-center gap-2 ml-4">
                            {#if conversation.last_message}
                              <span class="text-sm text-gray-500 whitespace-nowrap" style="font-family: 'Lato', sans-serif;">
                                {formatTime(conversation.last_message.created_at)}
                              </span>
                            {/if}
                            {#if conversation.unread_count > 0}
                              <span class="bg-[#00BFB3] text-white text-xs rounded-full px-2 py-1 font-medium min-w-[20px] text-center">
                                {conversation.unread_count}
                              </span>
                            {/if}
                          </div>
                        </div>
                      
                      {#if conversation.order_id}
                          <div class="flex items-center gap-2 mt-1">
                          <svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {@html getIconSVG('order')}
                          </svg>
                            <span class="text-sm text-[#00BFB3] font-medium" style="font-family: 'Lato', sans-serif;">
                            Pedido: {conversation.order_id}
                          </span>
                        </div>
                      {/if}
                      
                      {#if conversation.last_message}
                          <div class="mt-2">
                            <span class="text-sm font-medium text-gray-700" style="font-family: 'Lato', sans-serif;">
                              {conversation.last_message.sender_name}:
                            </span>
                            <span class="text-sm text-gray-600 ml-1" style="font-family: 'Lato', sans-serif;">
                            {conversation.last_message.content}
                            </span>
                          </div>
                        {:else}
                          <p class="text-sm text-gray-400 italic mt-2" style="font-family: 'Lato', sans-serif;">
                            Nenhuma mensagem ainda
                          </p>
                      {/if}
                    </div>

                      <!-- Seta -->
                      <div class="text-gray-400 mt-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  </button>
                </div>
          {/each}
        </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  /* Animação suave para as conversas */
  .space-y-4 > * {
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
  
  /* Motion preferences */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style> 