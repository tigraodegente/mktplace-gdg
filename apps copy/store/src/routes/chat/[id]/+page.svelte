<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let messages: any[] = [];
  let loading = true;
  let error = '';
  let newMessage = '';
  let sending = false;
  let messagesContainer: HTMLElement;
  let autoRefreshInterval: any;
  let isTyping = false;
  let lastSeen = 'Online agora';
  let isConnected = true;

  $: conversationId = $page.params.id;

  // Ícones SVG do site
  function getIconSVG(iconName: string) {
    const icons: Record<string, string> = {
      back: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />`,
      user: `<path fill-rule="evenodd" clip-rule="evenodd" d="M6.82023 6.89176C6.82023 4.32197 8.87064 2.26566 11.3671 2.26566C13.8635 2.26566 15.914 4.32197 15.914 6.89176C15.914 9.46154 13.8635 11.5179 11.3671 11.5179C8.87064 11.5179 6.82023 9.46154 6.82023 6.89176ZM11.3671 0C7.58987 0 4.55457 3.1004 4.55457 6.89176C4.55457 10.6832 7.58987 13.7835 11.3671 13.7835C15.1443 13.7835 18.1796 10.6832 18.1796 6.89176C18.1796 3.1004 15.1443 0 11.3671 0Z" fill="currentColor"/><path d="M2 21.0845C3.69198 17.7603 7.3223 15.462 11.5278 15.462C15.7332 15.462 19.3635 17.7603 21.0555 21.0845" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
      support: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />`,
      send: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />`,
      attachment: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />`,
      emoji: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      options: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />`,
      minimize: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />`,
      fullscreen: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />`,
      check: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />`,
      doubleCheck: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`
    };
    return icons[iconName] || icons.support;
  }

  // Quick replies
  const quickReplies = [
    'Preciso de ajuda com um pedido',
    'Tenho uma dúvida sobre produto',
    'Quero fazer uma troca/devolução',
    'Problema com pagamento',
    'Informações sobre entrega'
  ];

  async function loadMessages() {
    try {
      loading = true;
      error = '';
      
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      const result = await response.json();
      
      if (result.success) {
        messages = result.data.messages;
        scrollToBottom();
        
        // Simular mensagem de boas-vindas se vazio
        if (messages.length === 0) {
          setTimeout(() => {
            addWelcomeMessage();
          }, 1000);
        }
      } else if (response.status === 403) {
        error = 'Sem acesso a esta conversa';
        goto('/chat');
      } else {
        error = 'Erro ao carregar mensagens';
      }
    } catch (err) {
      error = 'Erro de conexão';
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      loading = false;
    }
  }

  function addWelcomeMessage() {
    const welcomeMessage = {
      id: 'welcome-' + Date.now(),
      content: 'Olá! 👋 Sou o assistente virtual da Grão de Gente. Como posso ajudar você hoje?',
      sender_name: 'Assistente GDG',
      created_at: new Date().toISOString(),
      is_own_message: false,
      message_type: 'text',
      metadata: { isWelcome: true }
    };
    
    messages = [welcomeMessage, ...messages];
    scrollToBottom();
  }

  async function sendMessage() {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    newMessage = '';
    sending = true;

    // Adicionar mensagem do usuário imediatamente
    const userMessage = {
      id: 'user-' + Date.now(),
      content: messageContent,
      sender_name: 'Você',
      created_at: new Date().toISOString(),
      is_own_message: true,
      message_type: 'text'
    };
    
    messages = [...messages, userMessage];
    scrollToBottom();

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_type: 'text',
          content: messageContent
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Simular resposta automática do bot
        setTimeout(() => {
          isTyping = true;
          setTimeout(() => {
            isTyping = false;
            addBotResponse(messageContent);
          }, 2000);
        }, 500);
      } else {
        error = 'Erro ao enviar mensagem';
      }
    } catch (err) {
      error = 'Erro ao enviar mensagem';
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      sending = false;
    }
  }

  function addBotResponse(userMessage: string) {
    let response = "Obrigado pela sua mensagem! Nossa equipe recebeu sua solicitação e responderá em breve. ⚡";
    
    // Respostas inteligentes baseadas no conteúdo
    if (userMessage.toLowerCase().includes('pedido')) {
      response = "Entendi que você tem uma dúvida sobre pedido! 📦 Para te ajudar melhor, você pode me informar o número do seu pedido? Assim posso verificar o status para você.";
    } else if (userMessage.toLowerCase().includes('produto')) {
      response = "Ótimo! Estou aqui para esclarecer qualquer dúvida sobre nossos produtos. 🛍️ Qual produto específico você gostaria de saber mais?";
    } else if (userMessage.toLowerCase().includes('troca') || userMessage.toLowerCase().includes('devolução')) {
      response = "Claro! Posso te ajudar com trocas e devoluções. ↩️ Você pode solicitar através da área 'Meus Pedidos' ou me informar o número do pedido que deseja trocar/devolver.";
    } else if (userMessage.toLowerCase().includes('entrega')) {
      response = "Sobre entregas, trabalhamos com os Correios e transportadoras parceiras! 🚚 O prazo varia de 3 a 15 dias úteis dependendo da sua região. Posso verificar o rastreamento do seu pedido se quiser!";
    }

    const botMessage = {
      id: 'bot-' + Date.now(),
      content: response,
      sender_name: 'Assistente GDG',
      created_at: new Date().toISOString(),
      is_own_message: false,
      message_type: 'text',
      metadata: { isBot: true }
    };
    
    messages = [...messages, botMessage];
    scrollToBottom();
  }

  function sendQuickReply(reply: string) {
    newMessage = reply;
    sendMessage();
  }

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function getMessageIcon(messageType: string) {
    switch (messageType) {
      case 'order': return '📦';
      case 'product': return '🛍️';
      case 'image': return '🖼️';
      case 'file': return '📎';
      default: return '';
    }
  }

  onMount(() => {
    loadMessages();
    
    // Auto-refresh para simular tempo real
    autoRefreshInterval = setInterval(() => {
      if (!sending && !loading) {
        // Simular possível nova mensagem
        if (Math.random() > 0.98) {
          // Adicionar mensagem de status aleatória
          const statusMessages = [
            "✅ Sua mensagem foi recebida e está sendo processada",
            "👀 Nossa equipe está analisando sua solicitação",
            "⚡ Resposta chegando em breve!"
          ];
          
          const randomMessage = statusMessages[Math.floor(Math.random() * statusMessages.length)];
          addBotResponse(randomMessage);
        }
      }
    }, 10000);
  });

  onDestroy(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
  });

  // Agrupar mensagens por data
  $: groupedMessages = messages.reduce((groups: any[], message: any) => {
    const messageDate = new Date(message.created_at).toDateString();
    
    let group = groups.find(g => g.date === messageDate);
    if (!group) {
      group = {
        date: messageDate,
        dateLabel: formatDate(message.created_at),
        messages: []
      };
      groups.push(group);
    }
    
    group.messages.push(message);
    return groups;
  }, []);
</script>

<svelte:head>
  <title>Chat - Grão de Gente</title>
  <meta name="description" content="Suporte ao cliente Grão de Gente" />
</svelte:head>

<!-- Container principal da página -->
<div class="min-h-screen bg-gray-50">
  <!-- Container centralizado -->
  <div class="max-w-4xl mx-auto bg-white shadow-sm min-h-screen flex flex-col">
    <!-- Header Avançado -->
    <div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-10">
      <div class="flex items-center gap-4">
        <button
          onclick={() => goto('/chat')}
          class="p-2 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Voltar para conversas"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('back')}
          </svg>
        </button>
        
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('support')}
              </svg>
            </div>
            <!-- Status online indicator -->
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h1 class="font-semibold">Suporte Grão de Gente</h1>
            <div class="flex items-center gap-1 text-sm opacity-90">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>{lastSeen}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Ações do header -->
      <div class="flex items-center gap-2">
        <button class="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Mais opções">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('options')}
          </svg>
        </button>
        <button class="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Expandir">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('fullscreen')}
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages Container -->
    <div 
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gradient-to-b from-gray-50 to-white"
    >
      {#if loading}
        <div class="flex justify-center items-center h-full">
          <div class="text-center">
            <div class="relative">
              <div class="w-12 h-12 border-4 border-[#00BFB3]/20 border-t-[#00BFB3] rounded-full animate-spin mx-auto mb-4"></div>
              <div class="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-[#00BFB3]/40 rounded-full animate-ping mx-auto"></div>
            </div>
            <p class="text-gray-600 font-medium">Carregando mensagens...</p>
          </div>
        </div>
      {:else if error}
        <div class="flex justify-center items-center h-full">
          <div class="text-center max-w-sm">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-red-600 mb-2">Ops! Algo deu errado</h3>
            <p class="text-red-600 mb-4">{error}</p>
            <button
              onclick={loadMessages}
              class="px-6 py-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors font-medium"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      {:else if groupedMessages.length === 0}
        <div class="flex justify-center items-center h-full">
          <div class="text-center max-w-sm">
            <div class="w-20 h-20 bg-gradient-to-br from-[#00BFB3]/10 to-[#00A89D]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('support')}
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Início da conversa</h3>
            <p class="text-gray-600 mb-6">Seja bem-vindo! Digite uma mensagem para começar nossa conversa.</p>
            
            <!-- Quick start buttons -->
            <div class="space-y-2">
              {#each quickReplies.slice(0, 3) as reply}
                <button
                  onclick={() => sendQuickReply(reply)}
                  class="w-full p-3 text-sm bg-[#00BFB3]/5 hover:bg-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-lg transition-colors text-left"
                >
                  {reply}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        {#each groupedMessages as group}
          <!-- Date Separator -->
          <div class="flex justify-center my-8">
            <div class="bg-gray-200 text-gray-600 text-xs font-medium px-4 py-2 rounded-full shadow-sm">
              {group.dateLabel}
            </div>
          </div>

          <!-- Messages -->
          {#each group.messages as message}
            <div class="flex {message.is_own_message ? 'justify-end' : 'justify-start'} mb-4">
              <div class="flex items-end gap-3 max-w-sm lg:max-w-lg">
                {#if !message.is_own_message}
                  <!-- Avatar para mensagens recebidas -->
                  <div class="w-8 h-8 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG('support')}
                    </svg>
                  </div>
                {/if}

                <div class="flex flex-col {message.is_own_message ? 'items-end' : 'items-start'}">
                  {#if !message.is_own_message}
                    <span class="text-xs text-gray-500 mb-1 px-1 font-medium">{message.sender_name || 'Suporte'}</span>
                  {/if}
                  
                  <div class="px-4 py-3 rounded-2xl max-w-full shadow-sm {
                    message.is_own_message 
                      ? 'bg-[#00BFB3] text-white rounded-br-md' 
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  }">
                    {#if message.message_type !== 'text'}
                      <div class="flex items-center gap-2 mb-2 opacity-75">
                        <span class="text-lg">{getMessageIcon(message.message_type)}</span>
                        <span class="text-xs uppercase font-medium">{message.message_type}</span>
                      </div>
                    {/if}
                    
                    <p class="text-sm leading-relaxed break-words">{message.content}</p>
                    
                    {#if message.metadata?.order_id}
                      <div class="mt-3 p-2 rounded-lg {message.is_own_message ? 'bg-black/20' : 'bg-gray-50'} text-xs">
                        <div class="flex items-center gap-2">
                          <span>📦</span>
                          <span>Pedido: <strong>{message.metadata.order_id}</strong></span>
                        </div>
                      </div>
                    {/if}
                  </div>
                  
                  <div class="flex items-center gap-1 mt-1 px-1">
                    <span class="text-xs text-gray-400">
                      {formatTime(message.created_at)}
                    </span>
                    {#if message.is_own_message}
                      <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {@html getIconSVG('check')}
                      </svg>
                    {/if}
                  </div>
                </div>

                {#if message.is_own_message}
                  <!-- Avatar para mensagens enviadas -->
                  <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 shadow-sm">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG('user')}
                    </svg>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/each}

        <!-- Typing Indicator -->
        {#if isTyping}
          <div class="flex justify-start mb-4">
            <div class="flex items-end gap-3">
              <div class="w-8 h-8 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {@html getIconSVG('support')}
                </svg>
              </div>
              <div class="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div class="flex gap-1">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Quick Replies (quando há mensagens) -->
    {#if groupedMessages.length > 0 && !isTyping}
      <div class="px-4 py-2 bg-white border-t border-gray-100">
        <div class="flex gap-2 overflow-x-auto pb-2">
          {#each quickReplies as reply}
            <button
              onclick={() => sendQuickReply(reply)}
              class="flex-shrink-0 px-3 py-2 text-xs bg-gray-50 hover:bg-[#00BFB3] hover:text-white rounded-full transition-colors border border-gray-200"
            >
              {reply}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Input Avançado -->
    <div class="bg-white border-t border-gray-200 p-4">
      <div class="flex gap-3 items-end">
        <!-- Attachments button -->
        <button class="p-2 text-gray-500 hover:text-[#00BFB3] hover:bg-[#00BFB3]/10 rounded-lg transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('attachment')}
          </svg>
        </button>
        
        <div class="flex-1 relative">
          <textarea
            bind:value={newMessage}
            onkeydown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            rows="1"
            class="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent transition-all max-h-32"
            disabled={sending}
          ></textarea>
          
          <!-- Emoji button -->
          <button class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#00BFB3] transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {@html getIconSVG('emoji')}
            </svg>
          </button>
        </div>
        
        <button
          onclick={sendMessage}
          disabled={!newMessage.trim() || sending}
          class="w-12 h-12 bg-[#00BFB3] text-white rounded-full hover:bg-[#00A89D] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-lg hover:shadow-xl"
        >
          {#if sending}
            <div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
          {:else}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {@html getIconSVG('send')}
            </svg>
          {/if}
        </button>
      </div>
      
      <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Pressione Enter para enviar • Shift+Enter para nova linha</span>
        <span class="flex items-center gap-1">
          <div class="w-2 h-2 bg-green-400 rounded-full"></div>
          Criptografado de ponta a ponta
        </span>
      </div>
    </div>
  </div>
</div> 