<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/authStore';

  // Estados do widget
  let isOpen = $state(false);
  let isMinimized = $state(false);
  let unreadCount = $state(0);
  let isTyping = $state(false);
  let messages: any[] = $state([]);
  let newMessage = $state('');
  let widgetPosition = $state({ x: 0, y: 0 });
  let isDragging = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  
  // Auto-refresh
  let refreshInterval: any;
  
  // Estados visuais
  let showQuickActions = $state(false);
  let isConnected = $state(true);
  let lastSeen = $state('Agora há pouco');

  // Configurações do widget
  const widgetConfig = {
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    enableSound: true,
    enableNotifications: true,
    autoHide: false,
    minimizeOnClose: true
  };

  // Mensagens quick start
  const quickActions = [
    { id: 'help', label: 'Como posso ajudar?', icon: 'help' },
    { id: 'order', label: 'Sobre meu pedido', icon: 'package' },
    { id: 'product', label: 'Dúvida sobre produto', icon: 'shopping' },
    { id: 'return', label: 'Troca ou devolução', icon: 'return' }
  ];

  // Simulação de mensagens automáticas
  const autoMessages = [
    "Olá! 👋 Como posso ajudar você hoje?",
    "Estou aqui para esclarecer qualquer dúvida sobre produtos, pedidos ou nossa loja!",
    "Posso te ajudar a encontrar o que procura? 🔍"
  ];

  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  function openWidget() {
    isOpen = true;
    isMinimized = false;
    if (messages.length === 0) {
      startWelcomeFlow();
    }
    markAsRead();
  }

  function closeWidget() {
    if (widgetConfig.minimizeOnClose) {
      isMinimized = true;
      isOpen = false;
    } else {
      isOpen = false;
    }
  }

  function startWelcomeFlow() {
    setTimeout(() => {
      addBotMessage(autoMessages[0]);
      showQuickActions = true;
    }, 500);
  }

  function addBotMessage(content: string) {
    const message = {
      id: Date.now(),
      content,
      sender: 'bot',
      timestamp: new Date(),
      isBot: true
    };
    messages = [...messages, message];
    
    if (widgetConfig.enableSound) {
      playNotificationSound();
    }
  }

  function addUserMessage(content: string) {
    const message = {
      id: Date.now(),
      content,
      sender: 'user',
      timestamp: new Date(),
      isBot: false
    };
    messages = [...messages, message];
    newMessage = '';
    showQuickActions = false;
    
    // Simular digitação do bot
    setTimeout(() => {
      isTyping = true;
      setTimeout(() => {
        isTyping = false;
        addBotMessage("Obrigado pela sua mensagem! Em breve nossa equipe responderá. ⚡");
      }, 2000);
    }, 500);
  }

  function handleQuickAction(action: any) {
    addUserMessage(action.label);
  }

  function sendMessage() {
    if (newMessage.trim()) {
      addUserMessage(newMessage.trim());
    }
  }

  function markAsRead() {
    unreadCount = 0;
  }

  function playNotificationSound() {
    if (typeof Audio !== 'undefined') {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYfCDWH0fPTgjMGHm7A7+OZQQ4PZqzn77BSGAJEPnZAWAoJ');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }

  function getIconSVG(iconName: string) {
    const icons: Record<string, string> = {
      help: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      package: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />`,
      shopping: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />`,
      return: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />`,
      message: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />`,
      close: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />`,
      minimize: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />`,
      send: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />`
    };
    return icons[iconName] || icons.message;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function openFullChat() {
    goto('/chat');
  }

  // Drag and drop functionality
  function startDrag(event: MouseEvent) {
    isDragging = true;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function onDrag(event: MouseEvent) {
    if (isDragging) {
      widgetPosition = {
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y
      };
    }
  }

  function stopDrag() {
    isDragging = false;
  }

  onMount(() => {
    // Simular notificações não lidas
    setTimeout(() => {
      unreadCount = 1;
    }, 3000);

    // Auto-refresh para simular atualizações
    refreshInterval = setInterval(() => {
      if (Math.random() > 0.95 && !isOpen) {
        unreadCount++;
      }
    }, 10000);

    // Event listeners for dragging
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);

    return () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
</script>

<!-- Widget Container -->
<div class="fixed z-50 transition-all duration-300 ease-out"
     class:bottom-4={widgetConfig.position.includes('bottom')}
     class:top-4={widgetConfig.position.includes('top')}
     class:right-4={widgetConfig.position.includes('right')}
     class:left-4={widgetConfig.position.includes('left')}
     style={isDragging ? `left: ${widgetPosition.x}px; top: ${widgetPosition.y}px;` : ''}>
  
  {#if isOpen}
    <!-- Chat Window -->
    <div class="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 h-96 flex flex-col overflow-hidden transform transition-all duration-300 ease-out scale-100">
      <!-- Header -->
      <div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] p-4 text-white relative cursor-move" 
           onmousedown={startDrag}>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('message')}
              </svg>
            </div>
            <div>
              <h3 class="font-medium text-sm">Suporte Grão de Gente</h3>
              <div class="flex items-center gap-1 text-xs">
                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span class="opacity-90">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button onclick={() => isMinimized = true} 
                    class="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('minimize')}
              </svg>
            </button>
            <button onclick={closeWidget} 
                    class="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('close')}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {#each messages as message}
          <div class="flex {message.isBot ? 'justify-start' : 'justify-end'}">
            <div class="flex items-end gap-2 max-w-xs">
              {#if message.isBot}
                <div class="w-6 h-6 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center text-white text-xs">
                  🤖
                </div>
              {/if}
              
              <div class="px-3 py-2 rounded-2xl text-sm {
                message.isBot 
                  ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-md' 
                  : 'bg-[#00BFB3] text-white rounded-br-md'
              }">
                {message.content}
                <div class="text-xs opacity-70 mt-1">
                  {formatTime(message.timestamp)}
                </div>
              </div>
              
              {#if !message.isBot}
                <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  👤
                </div>
              {/if}
            </div>
          </div>
        {/each}

        {#if isTyping}
          <div class="flex justify-start">
            <div class="flex items-end gap-2">
              <div class="w-6 h-6 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center text-white text-xs">
                🤖
              </div>
              <div class="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-md">
                <div class="flex gap-1">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Quick Actions -->
      {#if showQuickActions}
        <div class="p-3 bg-white border-t border-gray-100">
          <div class="text-xs text-gray-600 mb-2">Respostas rápidas:</div>
          <div class="grid grid-cols-2 gap-2">
            {#each quickActions as action}
              <button onclick={() => handleQuickAction(action)}
                      class="p-2 text-xs bg-gray-50 hover:bg-[#00BFB3] hover:text-white rounded-lg transition-colors text-left">
                <div class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {@html getIconSVG(action.icon)}
                  </svg>
                  {action.label}
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Input -->
      <div class="p-3 bg-white border-t border-gray-100">
        <div class="flex gap-2">
          <input type="text" 
                 bind:value={newMessage}
                 onkeydown={handleKeyDown}
                 placeholder="Digite sua mensagem..."
                 class="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent">
          <button onclick={sendMessage}
                  disabled={!newMessage.trim()}
                  class="w-8 h-8 bg-[#00BFB3] text-white rounded-full flex items-center justify-center hover:bg-[#00A89D] transition-colors disabled:bg-gray-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {@html getIconSVG('send')}
            </svg>
          </button>
        </div>
        <div class="mt-2 text-center">
          <button onclick={openFullChat} 
                  class="text-xs text-[#00BFB3] hover:text-[#00A89D] font-medium">
            Abrir chat completo →
          </button>
        </div>
      </div>
    </div>

  {:else if isMinimized}
    <!-- Minimized State -->
    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 p-3 cursor-pointer hover:shadow-xl transition-all"
         onclick={openWidget}>
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] rounded-full flex items-center justify-center text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIconSVG('message')}
          </svg>
        </div>
        <div class="text-sm">
          <div class="font-medium text-gray-900">Chat minimizado</div>
          {#if unreadCount > 0}
            <div class="text-xs text-[#00BFB3]">{unreadCount} nova{unreadCount > 1 ? 's' : ''} mensagem{unreadCount > 1 ? 's' : ''}</div>
          {/if}
        </div>
        {#if unreadCount > 0}
          <div class="w-5 h-5 bg-[#00BFB3] text-white rounded-full flex items-center justify-center text-xs font-medium">
            {unreadCount}
          </div>
        {/if}
      </div>
    </div>

  {:else}
    <!-- Floating Button -->
    <button onclick={openWidget}
            class="group relative w-14 h-14 bg-gradient-to-br from-[#00BFB3] to-[#00A89D] text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out flex items-center justify-center">
      <!-- Pulse animation -->
      <div class="absolute inset-0 bg-[#00BFB3] rounded-full animate-ping opacity-25"></div>
      
      <!-- Icon -->
      <svg class="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {@html getIconSVG('message')}
      </svg>
      
      <!-- Unread badge -->
      {#if unreadCount > 0}
        <div class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
          {unreadCount}
        </div>
      {/if}
      
      <!-- Tooltip -->
      <div class="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Precisa de ajuda? 💬
        <div class="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </button>
  {/if}
</div>

<style>
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-4px);
    }
    60% {
      transform: translateY(-2px);
    }
  }
  
  .animate-bounce {
    animation: bounce 1.4s infinite;
  }
</style> 