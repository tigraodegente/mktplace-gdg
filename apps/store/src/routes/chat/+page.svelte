<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let conversations: any[] = [];
  let loading = true;
  let error = '';
  let selectedType = 'all';
  let searchQuery = '';

  // Ícones SVG do site (mesmos do widget)
  function getIconSVG(iconName: string) {
    const icons: Record<string, string> = {
      support: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />`,
      seller: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />`,
      order: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />`,
      search: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />`,
      plus: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />`,
      info: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      refresh: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`,
      filter: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />`
    };
    return icons[iconName] || icons.support;
  }

  const chatTypes = [
    { value: 'all', label: 'Todas', icon: 'support', color: 'from-[#00BFB3] to-[#00A89D]' },
    { value: 'support', label: 'Suporte', icon: 'support', color: 'from-[#00BFB3] to-[#00A89D]' },
    { value: 'seller', label: 'Vendedores', icon: 'seller', color: 'from-purple-500 to-purple-600' },
    { value: 'order', label: 'Pedidos', icon: 'order', color: 'from-blue-500 to-blue-600' }
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

  function getTypeAvatar(type: string) {
    const typeConfig = chatTypes.find(t => t.value === type) || chatTypes[0];
    return {
      icon: typeConfig.icon,
      gradient: typeConfig.color
    };
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
  <title>Chat - Grão de Gente</title>
  <meta name="description" content="Central de conversas e suporte ao cliente" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Container centralizado -->
  <div class="max-w-5xl mx-auto px-4 py-8">
    <!-- Header Hero -->
    <div class="text-center mb-12">
      <div class="relative inline-block">
        <div class="w-20 h-20 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-xl">
          <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('support')}
          </svg>
        </div>
        <!-- Pulse indicator -->
        <div class="absolute -inset-2 bg-[#00BFB3] rounded-full animate-ping opacity-25"></div>
      </div>
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Central de Conversas</h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        Converse com nossa equipe especializada. Estamos aqui para ajudar com produtos, pedidos e dúvidas!
      </p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-xl shadow-sm border p-6 text-center hover:shadow-md transition-shadow">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <h3 class="font-semibold text-gray-900 mb-1">Suporte Online</h3>
        <p class="text-sm text-gray-600">Respondemos em até 5 minutos</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border p-6 text-center hover:shadow-md transition-shadow">
        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('support')}
          </svg>
        </div>
        <h3 class="font-semibold text-gray-900 mb-1">Chat Inteligente</h3>
        <p class="text-sm text-gray-600">Respostas automáticas e personalizadas</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border p-6 text-center hover:shadow-md transition-shadow">
        <div class="w-12 h-12 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="font-semibold text-gray-900 mb-1">Resolução Rápida</h3>
        <p class="text-sm text-gray-600">95% das dúvidas resolvidas no primeiro contato</p>
      </div>
    </div>

    <!-- Filtros e Ações -->
    <div class="bg-white rounded-xl shadow-sm border p-6 mb-8">
      <div class="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        <!-- Filtros -->
        <div class="flex flex-wrap gap-3">
          {#each chatTypes as type}
            <button
              on:click={() => selectedType = type.value}
              class="px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3 hover:shadow-md {
                selectedType === type.value 
                  ? 'bg-[#00BFB3] text-white shadow-lg transform scale-105' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }"
            >
              <div class="w-5 h-5 {selectedType === type.value ? 'text-white' : 'text-gray-500'}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {@html getIconSVG(type.icon)}
                </svg>
              </div>
              {type.label}
            </button>
          {/each}
        </div>

        <!-- Ações -->
        <div class="flex gap-3">
          <button
            on:click={loadConversations}
            class="p-3 text-gray-500 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 rounded-xl transition-colors border border-gray-200"
            aria-label="Atualizar conversas"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {@html getIconSVG('refresh')}
            </svg>
          </button>
          
          <button
            on:click={createSupportChat}
            class="bg-[#00BFB3] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#00A89D] transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {@html getIconSVG('plus')}
            </svg>
            Nova Conversa
          </button>
        </div>
      </div>

      <!-- Campo de Busca -->
      <div class="mt-6">
        <div class="relative">
          <svg class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('search')}
          </svg>
          <input
            type="text"
            placeholder="Buscar conversas, mensagens ou tópicos..."
            bind:value={searchQuery}
            class="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all text-base"
          />
          {#if searchQuery}
            <button
              on:click={() => searchQuery = ''}
              class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Lista de Conversas -->
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      {#if loading}
        <div class="p-12 text-center">
          <div class="relative inline-block mb-6">
            <div class="w-16 h-16 border-4 border-[#00BFB3]/20 border-t-[#00BFB3] rounded-full animate-spin"></div>
            <div class="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-[#00BFB3]/40 rounded-full animate-ping"></div>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Carregando conversas</h3>
          <p class="text-gray-600">Buscando suas conversas mais recentes...</p>
        </div>
      {:else if error}
        <div class="p-12 text-center">
          <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-red-600 mb-2">Ops! Algo deu errado</h3>
          <p class="text-red-600 mb-6">{error}</p>
          <button
            on:click={loadConversations}
            class="px-6 py-3 bg-[#00BFB3] text-white rounded-xl hover:bg-[#00A89D] transition-colors font-medium"
          >
            Tentar novamente
          </button>
        </div>
      {:else if filteredConversations.length === 0}
        <div class="p-12 text-center">
          <div class="w-24 h-24 bg-gradient-to-br from-[#00BFB3]/10 to-[#00A89D]/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg class="w-12 h-12 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {@html getIconSVG('support')}
            </svg>
          </div>
          <h3 class="text-xl font-medium text-gray-900 mb-4">
            {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
          </h3>
          <p class="text-gray-600 mb-8 max-w-md mx-auto">
            {searchQuery 
              ? 'Nenhuma conversa corresponde à sua busca. Tente outros termos.' 
              : 'Você ainda não tem conversas. Que tal começar uma nova conversa com nossa equipe?'}
          </p>
          {#if !searchQuery}
            <div class="space-y-4">
              <button
                on:click={createSupportChat}
                class="bg-[#00BFB3] text-white px-8 py-4 rounded-xl font-medium hover:bg-[#00A89D] transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {@html getIconSVG('plus')}
                </svg>
                Iniciar primeira conversa
              </button>
              
              <!-- Quick action buttons -->
              <div class="flex flex-wrap gap-3 justify-center mt-6">
                <button class="px-4 py-2 bg-gray-50 hover:bg-[#00BFB3] hover:text-white rounded-lg transition-colors text-sm border border-gray-200">
                  💬 Dúvida geral
                </button>
                <button class="px-4 py-2 bg-gray-50 hover:bg-[#00BFB3] hover:text-white rounded-lg transition-colors text-sm border border-gray-200">
                  📦 Sobre pedido
                </button>
                <button class="px-4 py-2 bg-gray-50 hover:bg-[#00BFB3] hover:text-white rounded-lg transition-colors text-sm border border-gray-200">
                  🛍️ Dúvida produto
                </button>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="divide-y divide-gray-200">
          {#each filteredConversations as conversation}
            {@const avatar = getTypeAvatar(conversation.type)}
            <button
              on:click={() => openConversation(conversation.id)}
              class="w-full p-6 text-left hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:bg-gray-50 group"
            >
              <div class="flex items-start gap-4">
                <!-- Avatar Melhorado -->
                <div class="flex-shrink-0 relative">
                  <div class="w-14 h-14 bg-gradient-to-br {avatar.gradient} rounded-full flex items-center justify-center text-white text-xl shadow-lg group-hover:shadow-xl transition-shadow">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG(avatar.icon)}
                    </svg>
                  </div>
                  <!-- Status online -->
                  <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                </div>

                <!-- Conteúdo -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0 flex-1">
                      <h3 class="text-lg font-medium text-gray-900 truncate group-hover:text-[#00BFB3] transition-colors">
                        {conversation.title || `Conversa ${conversation.type}`}
                      </h3>
                      
                      {#if conversation.order_id}
                        <div class="flex items-center gap-2 mt-1 mb-2">
                          <svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {@html getIconSVG('order')}
                          </svg>
                          <span class="text-sm text-[#00BFB3] font-medium">
                            Pedido: {conversation.order_id}
                          </span>
                        </div>
                      {/if}
                      
                      {#if conversation.last_message}
                        <div class="flex items-start gap-2 mt-2">
                          <span class="text-sm font-medium text-gray-700">{conversation.last_message.sender_name}:</span>
                          <p class="text-sm text-gray-600 line-clamp-2 flex-1">
                            {conversation.last_message.content}
                          </p>
                        </div>
                      {:else}
                        <p class="text-sm text-gray-400 italic mt-2">Nenhuma mensagem ainda</p>
                      {/if}
                    </div>

                    <!-- Meta info -->
                    <div class="flex flex-col items-end gap-2">
                      {#if conversation.last_message}
                        <span class="text-xs text-gray-500 font-medium">
                          {formatTime(conversation.last_message.created_at)}
                        </span>
                      {/if}
                      
                      {#if conversation.unread_count > 0}
                        <span class="bg-[#00BFB3] text-white text-xs rounded-full px-3 py-1 font-bold min-w-[24px] text-center shadow-lg animate-pulse">
                          {conversation.unread_count}
                        </span>
                      {/if}
                      
                      <!-- Arrow indicator -->
                      <svg class="w-5 h-5 text-gray-400 group-hover:text-[#00BFB3] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Footer/Help Section -->
    <div class="mt-8">
      <div class="bg-gradient-to-r from-blue-50 to-[#00BFB3]/5 border border-blue-200 rounded-xl p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {@html getIconSVG('info')}
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="font-medium text-blue-900 mb-2">💡 Dicas para um melhor atendimento</h3>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• Tenha o número do pedido em mãos para consultas sobre entregas</li>
              <li>• Descreva detalhadamente o problema para respostas mais precisas</li>
              <li>• Use o chat durante horário comercial para respostas mais rápidas</li>
              <li>• Todas as conversas são criptografadas e seguras</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style> 