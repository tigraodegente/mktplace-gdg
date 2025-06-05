<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  // Tipos
  interface SupportCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    order_index: number;
  }

  interface FAQCategory {
    id: string;
    name: string;
    description: string;
    order_index: number;
  }

  interface FAQItem {
    id: string;
    question: string;
    answer: string;
    view_count: number;
    helpful_count: number;
    not_helpful_count: number;
    category_id: string;
    category_name: string;
  }

  // Estados
  let supportCategories: SupportCategory[] = [];
  let faqCategories: FAQCategory[] = [];
  let faqItems: FAQItem[] = [];
  let loading = true;
  let error = '';
  let activeTab = 'faq'; // 'faq', 'chat', 'ticket'
  let selectedFAQCategory = '';
  let searchQuery = '';
  let expandedFAQ: string[] = [];
  
  // Estado para expansão de texto
  let mostrarMais = false;

  // Estados da IA Contextual
  let perguntaUsuario = '';
  let processandoIA = false;
  let respostaIA: any = null;
  let etapasProcessamento: string[] = [];

  // Ícones SVG profissionais
  function getIconSVG(iconName: string) {
    const icons: Record<string, string> = {
      'question-mark-circle': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      'chat-bubble-left-right': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />`,
      'ticket': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />`,
      'search': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />`,
      'chevron-down': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19.5 8.25-7.5 7.5-7.5-7.5" />`,
      'shopping-bag': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119.993z" />`,
      'cube': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />`,
      'credit-card': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />`,
      'cog': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />`,
      'thumb-up': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5.25 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />`,
      'thumb-down': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 15h2.25m8.25-9.75H15m.75 5.25v6.75m0 0v1.5a2.25 2.25 0 01-2.25 2.25h-1.5m3.75-3.75l-3.75 3.75m0 0h-3.75m3.75 0v-1.5a2.25 2.25 0 00-2.25-2.25H9m12 0V9m0 0H9m12 0v.75M9 21v-3.75m0 0h3.75M9 17.25v.75" />`,
      'home': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />`
    };
    return icons[iconName] || icons['question-mark-circle'];
  }

  // Carregar dados
  async function loadData() {
    try {
      loading = true;
      error = '';

      // Carregar categorias de suporte e FAQ
      const [categoriesRes, faqRes] = await Promise.all([
        fetch('/api/atendimento/categories'),
        fetch('/api/atendimento/faq')
      ]);

      const categoriesData = await categoriesRes.json();
      const faqData = await faqRes.json();

      if (categoriesData.success) {
        supportCategories = categoriesData.categories;
      }

      if (faqData.success) {
        faqCategories = faqData.categories;
        faqItems = faqData.faq;
      }

    } catch (err) {
      error = 'Erro ao carregar dados de atendimento';
      console.error('Erro ao carregar dados:', err);
    } finally {
      loading = false;
    }
  }

  // Funções de navegação
  function startChat(categoryId?: string) {
    if (categoryId) {
      goto(`/chat?category=${categoryId}`);
    } else {
      goto('/chat');
    }
  }

  function createTicket(categoryId?: string) {
    if (categoryId) {
      goto(`/suporte?category=${categoryId}`);
    } else {
      goto('/suporte');
    }
  }

  // FAQ functions
  function toggleFAQ(faqId: string) {
    if (expandedFAQ.includes(faqId)) {
      expandedFAQ = expandedFAQ.filter(id => id !== faqId);
    } else {
      expandedFAQ = [...expandedFAQ, faqId];
    }
  }

  function searchFAQ() {
    if (searchQuery.trim()) {
      // Recarregar FAQ com busca
      loadFAQWithSearch();
    }
  }

  async function loadFAQWithSearch() {
    try {
      const params = new URLSearchParams();
      if (selectedFAQCategory) params.append('category_id', selectedFAQCategory);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await fetch(`/api/atendimento/faq?${params}`);
      const data = await response.json();

      if (data.success) {
        faqItems = data.faq;
      }
    } catch (err) {
      console.error('Erro ao buscar FAQ:', err);
    }
  }

  function markFAQHelpful(faqId: string, isHelpful: boolean) {
    // TODO: Implementar feedback API
    console.log('FAQ feedback:', faqId, isHelpful);
  }

  // Filtrar FAQ
  $: filteredFAQ = faqItems.filter(item => {
    if (selectedFAQCategory && item.category_id !== selectedFAQCategory) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return item.question.toLowerCase().includes(search) || 
             item.answer.toLowerCase().includes(search);
    }
    return true;
  });

  // IA CONTEXTUAL - Resposta direta e inteligente
  async function obterRespostaIA() {
    if (!perguntaUsuario.trim()) return;
    
    processandoIA = true;
    etapasProcessamento = [];
    respostaIA = null;
    
    console.log('🧠 IA Contextual processando:', perguntaUsuario);
    
    try {
      const response = await fetch('/api/atendimento/smart-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: perguntaUsuario
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        respostaIA = result.data;
        etapasProcessamento = result.data.processing_steps || [];
        console.log('✅ Resposta IA:', respostaIA);
      } else {
        console.error('❌ Erro na IA:', result.error);
        mostrarErroIA();
      }
    } catch (error) {
      console.error('❌ Erro ao chamar IA:', error);
      mostrarErroIA();
    } finally {
      processandoIA = false;
    }
  }
  
  function mostrarErroIA() {
    respostaIA = {
      success: false,
      category: 'Erro',
      answer: 'Houve um problema técnico. Use os canais de contato direto abaixo.',
      next_actions: [
        { label: 'WhatsApp', action: 'whatsapp', value: '5511999990000', priority: 'high' },
        { label: 'Telefone', action: 'phone', value: '08001234567', priority: 'high' }
      ],
      specialist_used: 'Fallback de Erro'
    };
  }

  // Executar ação baseada no tipo
  function executarAcao(action: any) {
    console.log('🎯 Executando ação:', action);
    
    switch (action.action) {
      case 'whatsapp':
        window.open(`https://wa.me/${action.value}`, '_blank');
        break;
      case 'phone':
        window.open(`tel:${action.value}`, '_self');
        break;
      case 'email':
        window.open(`mailto:${action.value}`, '_self');
        break;
      case 'link':
        if (action.value.startsWith('http')) {
          window.open(action.value, '_blank');
        } else {
          goto(action.value);
        }
        break;
      case 'internal':
        // Ações internas específicas
        if (action.value === 'escalate_pedidos') {
          goto('/suporte?category=pedidos');
        } else if (action.value === 'generate_pix') {
          goto('/checkout?payment=pix');
        } else if (action.value === 'open_chat') {
          goto('/chat');
        }
        break;
      default:
        console.log('Ação não reconhecida:', action.action);
    }
  }
  
  // Nova pergunta - limpar resultado anterior
  function novaPergunta() {
    respostaIA = null;
    etapasProcessamento = [];
    perguntaUsuario = '';
  }
  
  // Expandir FAQ específico
  function expandirFAQEspecifico(faqItem: FAQItem) {
    activeTab = 'faq';
    // Expandir o FAQ específico
    toggleFAQ(faqItem.id);
    // Lógica para destacar/expandir o FAQ específico
    setTimeout(() => {
      const elemento = document.querySelector(`[data-faq="${faqItem.id}"]`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth' });
        // Adicionar destaque visual
        elemento.classList.add('bg-teal-50', 'border-teal-200');
      }
    }, 100);
  }

  // Abrir FAQ de categoria específica
  function abrirFAQCategoria(categoria: string) {
    activeTab = 'faq';
    // Encontrar ID da categoria
    const categoryFound = faqCategories.find(cat => 
      cat.name.toLowerCase().includes(categoria.toLowerCase())
    );
    if (categoryFound) {
      selectedFAQCategory = categoryFound.id;
      loadFAQWithSearch();
    }
  }

  onMount(() => {
    // Ler parâmetros da URL
    const urlParams = $page.url.searchParams;
    const tabParam = urlParams.get('tab');
    const categoryParam = urlParams.get('category');
    
    // Definir tab ativo baseado no parâmetro
    if (tabParam && ['faq', 'chat', 'ticket'].includes(tabParam)) {
      activeTab = tabParam;
    }
    
    // Definir categoria se fornecida
    if (categoryParam) {
      selectedFAQCategory = categoryParam;
    }
    
    loadData();
  });
</script>

<svelte:head>
  <title>Central de Atendimento - Grão de Gente</title>
  <meta name="description" content="Central de atendimento completa: FAQ, Chat e Suporte técnico. Encontre respostas rápidas ou entre em contato conosco." />
</svelte:head>

<!-- Header padrão -->
<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center py-4">
      <h1 class="text-2xl font-bold text-gray-900" style="font-family: 'Lato', sans-serif;">
        Central de Atendimento
      </h1>
      <a 
        href="/" 
        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
        style="font-family: 'Lato', sans-serif;"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {@html getIconSVG('home')}
        </svg>
        Continuar Comprando
      </a>
    </div>

    <!-- Descrição expansível DENTRO do header -->
    <div class="border-t border-gray-200">
      <button 
        on:click={() => mostrarMais = !mostrarMais}
        class="w-full py-3 flex items-center justify-between text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
        style="font-family: 'Lato', sans-serif;"
      >
        <span>
          {#if mostrarMais}
            Nossa central de atendimento oferece múltiplas formas de suporte: FAQ para respostas rápidas, chat em tempo real e sistema de tickets para questões complexas.
          {:else}
            Central de atendimento completa: FAQ, Chat e Suporte técnico
          {/if}
        </span>
        <svg 
          class="w-4 h-4 transform transition-transform duration-200 {mostrarMais ? 'rotate-180' : ''}" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {@html getIconSVG('chevron-down')}
        </svg>
      </button>
    </div>
  </div>
</header>

<!-- Main content -->
<main class="py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    
    <!-- IA Contextual - Resposta Direta -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">
        🧠 Assistente Inteligente - Resposta Direta
      </h2>
      <p class="text-sm text-gray-600 mb-4" style="font-family: 'Lato', sans-serif;">
        Descreva sua dúvida e nossa IA especializada irá resolver diretamente com soluções práticas e próximas ações
      </p>
      
      <div class="flex gap-3">
        <div class="flex-1 relative">
          <input
            type="text"
            bind:value={perguntaUsuario}
            on:keydown={(e) => e.key === 'Enter' && obterRespostaIA()}
            placeholder="Ex: Meu pedido não chegou ainda, como posso acompanhar?"
            class="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
            style="font-family: 'Lato', sans-serif;"
            disabled={processandoIA}
          />
          {#if processandoIA}
            <div class="absolute right-3 top-3">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00BFB3]"></div>
            </div>
          {/if}
        </div>
        
        <button 
          on:click={obterRespostaIA}
          disabled={!perguntaUsuario.trim() || processandoIA}
          class="px-6 py-3 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style="font-family: 'Lato', sans-serif;"
        >
          {#if processandoIA}
            Processando...
          {:else}
            Obter Resposta
          {/if}
        </button>
      </div>

      <!-- Resultado da IA Contextual -->
      {#if respostaIA}
        <div class="mt-4 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
          <!-- Cabeçalho da Resposta -->
          <div class="flex items-start gap-4 mb-4">
            <div class="text-[#00BFB3] bg-white p-2 rounded-full shadow-sm">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div class="flex-1">
              <h4 class="text-lg font-semibold text-gray-900 mb-1" style="font-family: 'Lato', sans-serif;">
                {respostaIA.specialist_used}
              </h4>
              <div class="flex items-center gap-4 text-sm text-gray-600">
                <span class="bg-[#00BFB3] text-white px-2 py-1 rounded-full text-xs font-medium">
                  {respostaIA.category}
                </span>
                <span class="text-xs">
                  {respostaIA.confidence}% confiança
                </span>
                {#if respostaIA.escalate}
                  <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                    Requer atenção
                  </span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Etapas de Processamento -->
          {#if etapasProcessamento.length > 0}
            <div class="mb-4 p-3 bg-white/60 rounded-md">
              <p class="text-xs font-medium text-gray-700 mb-2">Processamento:</p>
              <ul class="text-xs text-gray-600 space-y-1">
                {#each etapasProcessamento as etapa}
                  <li class="flex items-center gap-2">
                    <div class="w-1 h-1 bg-[#00BFB3] rounded-full"></div>
                    {etapa}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Resposta Principal -->
          <div class="mb-6 p-4 bg-white rounded-lg shadow-sm">
            <div class="prose prose-sm max-w-none text-gray-800" style="font-family: 'Lato', sans-serif;">
              {@html respostaIA.answer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
            </div>
          </div>

          <!-- Ações Rápidas -->
          {#if respostaIA.next_actions && respostaIA.next_actions.length > 0}
            <div>
              <h5 class="text-sm font-medium text-gray-900 mb-3" style="font-family: 'Lato', sans-serif;">
                Próximas ações:
              </h5>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each respostaIA.next_actions as action}
                  <button
                    on:click={() => executarAcao(action)}
                    class="flex items-center gap-3 px-4 py-3 text-left rounded-lg border transition-all duration-200 hover:shadow-md
                      {action.priority === 'high' ? 'bg-[#00BFB3] text-white hover:bg-[#00a89b] border-[#00BFB3]' : 
                       action.priority === 'medium' ? 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200' : 
                       'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}"
                    style="font-family: 'Lato', sans-serif;"
                  >
                    <div class="text-sm font-medium">
                      {action.label}
                    </div>
                    <svg class="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Botão Nova Pergunta -->
          <div class="mt-4 pt-4 border-t border-gray-200">
            <button
              on:click={novaPergunta}
              class="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[#00BFB3] transition-colors duration-200"
              style="font-family: 'Lato', sans-serif;"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Fazer nova pergunta
            </button>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      
      <!-- Sidebar: Navegação -->
      <aside class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">
            Como podemos ajudar?
          </h3>
          
          <!-- Tabs de Atendimento -->
          <nav class="space-y-2">
            <button
              on:click={() => activeTab = 'faq'}
              class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 {activeTab === 'faq' ? 'bg-[#00BFB3] text-white' : 'text-gray-700 hover:bg-gray-100'}"
              style="font-family: 'Lato', sans-serif;"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('question-mark-circle')}
              </svg>
              Perguntas Frequentes
            </button>
            
            <button
              on:click={() => activeTab = 'chat'}
              class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 {activeTab === 'chat' ? 'bg-[#00BFB3] text-white' : 'text-gray-700 hover:bg-gray-100'}"
              style="font-family: 'Lato', sans-serif;"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('chat-bubble-left-right')}
              </svg>
              Chat em Tempo Real
            </button>
            
            <button
              on:click={() => activeTab = 'ticket'}
              class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 {activeTab === 'ticket' ? 'bg-[#00BFB3] text-white' : 'text-gray-700 hover:bg-gray-100'}"
              style="font-family: 'Lato', sans-serif;"
            >
              <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {@html getIconSVG('ticket')}
              </svg>
              Suporte Técnico
            </button>
          </nav>

          <!-- Categorias (se FAQ selecionado) -->
          {#if activeTab === 'faq' && faqCategories.length > 0}
            <div class="mt-6 pt-6 border-t border-gray-200">
              <h4 class="text-sm font-medium text-gray-900 mb-3" style="font-family: 'Lato', sans-serif;">
                Filtrar por categoria
              </h4>
              <select 
                bind:value={selectedFAQCategory}
                on:change={loadFAQWithSearch}
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                style="font-family: 'Lato', sans-serif;"
              >
                <option value="">Todas as categorias</option>
                {#each faqCategories as category}
                  <option value={category.id}>{category.name}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>
      </aside>

      <!-- Content Area -->
      <div class="lg:col-span-3 space-y-6">
        
        {#if loading}
          <!-- Loading state -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00BFB3] mx-auto mb-4"></div>
            <p class="text-gray-600" style="font-family: 'Lato', sans-serif;">Carregando atendimento...</p>
          </div>
        
        {:else if error}
          <!-- Error state -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div class="text-red-500 mb-4">
              <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p class="text-red-600 font-medium mb-2" style="font-family: 'Lato', sans-serif;">{error}</p>
            <button 
              on:click={loadData}
              class="px-4 py-2 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200"
              style="font-family: 'Lato', sans-serif;"
            >
              Tentar Novamente
            </button>
          </div>

        {:else}
          
          <!-- FAQ Tab -->
          {#if activeTab === 'faq'}
            <div class="space-y-6">
              
              <!-- Search bar -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div class="flex gap-4">
                  <div class="flex-1 relative">
                    <input
                      type="text"
                      bind:value={searchQuery}
                      on:keydown={(e) => e.key === 'Enter' && searchFAQ()}
                      placeholder="Buscar nas perguntas frequentes..."
                      class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
                      style="font-family: 'Lato', sans-serif;"
                    />
                    <svg class="w-5 h-5 absolute left-3 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG('search')}
                    </svg>
                  </div>
                  <button 
                    on:click={searchFAQ}
                    class="px-6 py-3 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200"
                    style="font-family: 'Lato', sans-serif;"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <!-- FAQ Items -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                {#if filteredFAQ.length > 0}
                  <div class="divide-y divide-gray-200">
                    {#each filteredFAQ as faq, index}
                      <div class="p-6">
                        <button
                          on:click={() => toggleFAQ(faq.id)}
                          class="w-full flex items-start justify-between text-left group focus:outline-none"
                        >
                          <div class="flex-1">
                            <h3 class="text-lg font-medium text-gray-900 group-hover:text-[#00BFB3] transition-colors duration-200" style="font-family: 'Lato', sans-serif;">
                              {faq.question}
                            </h3>
                            <div class="flex items-center mt-2 text-sm text-gray-500">
                              <span class="mr-4">{faq.view_count} visualizações</span>
                              <span class="inline-flex items-center">
                                <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {@html getIconSVG('thumb-up')}
                                </svg>
                                {faq.helpful_count}
                              </span>
                            </div>
                          </div>
                          <svg 
                            class="w-5 h-5 text-gray-400 transform transition-transform duration-200 {expandedFAQ.includes(faq.id) ? 'rotate-180' : ''}" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            {@html getIconSVG('chevron-down')}
                          </svg>
                        </button>

                        {#if expandedFAQ.includes(faq.id)}
                          <div 
                            class="mt-4 pt-4 border-t border-gray-100 animate-fade-in"
                            style="animation: fadeIn 0.2s ease-in-out;"
                          >
                            <p class="text-gray-700 leading-relaxed mb-4" style="font-family: 'Lato', sans-serif;">
                              {faq.answer}
                            </p>
                            
                            <!-- Feedback buttons -->
                            <div class="flex items-center space-x-4">
                              <span class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">Esta resposta foi útil?</span>
                              <button 
                                on:click={() => markFAQHelpful(faq.id, true)}
                                class="inline-flex items-center px-3 py-1 text-sm text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors duration-200"
                                style="font-family: 'Lato', sans-serif;"
                              >
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {@html getIconSVG('thumb-up')}
                                </svg>
                                Sim
                              </button>
                              <button 
                                on:click={() => markFAQHelpful(faq.id, false)}
                                class="inline-flex items-center px-3 py-1 text-sm text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-200"
                                style="font-family: 'Lato', sans-serif;"
                              >
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {@html getIconSVG('thumb-down')}
                                </svg>
                                Não
                              </button>
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="p-8 text-center">
                    <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG('question-mark-circle')}
                    </svg>
                    <p class="text-gray-600 mb-4" style="font-family: 'Lato', sans-serif;">
                      {searchQuery ? 'Nenhuma pergunta encontrada para sua busca.' : 'Nenhuma pergunta disponível.'}
                    </p>
                    <button 
                      on:click={() => activeTab = 'chat'}
                      class="px-4 py-2 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200"
                      style="font-family: 'Lato', sans-serif;"
                    >
                      Iniciar Chat
                    </button>
                  </div>
                {/if}
              </div>
            </div>

          <!-- Chat Tab -->
          {:else if activeTab === 'chat'}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto text-[#00BFB3] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {@html getIconSVG('chat-bubble-left-right')}
                </svg>
                <h3 class="text-xl font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">
                  Chat em Tempo Real
                </h3>
                <p class="text-gray-600 mb-6 max-w-2xl mx-auto" style="font-family: 'Lato', sans-serif;">
                  Converse diretamente com nossa equipe de atendimento. Resposta rápida e personalizada para suas dúvidas.
                </p>
                
                {#if supportCategories.length > 0}
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {#each supportCategories as category}
                      <button
                        on:click={() => startChat(category.id)}
                        class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all duration-200 group"
                      >
                        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-lg" style="background-color: {category.color}20;">
                          <svg class="w-6 h-6" style="color: {category.color};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {@html getIconSVG(category.icon)}
                          </svg>
                        </div>
                        <h4 class="font-medium text-gray-900 group-hover:text-[#00BFB3] transition-colors duration-200" style="font-family: 'Lato', sans-serif;">
                          {category.name}
                        </h4>
                        <p class="text-sm text-gray-600 mt-1" style="font-family: 'Lato', sans-serif;">
                          {category.description}
                        </p>
                      </button>
                    {/each}
                  </div>
                {/if}

                <button 
                  on:click={() => startChat()}
                  class="px-6 py-3 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200"
                  style="font-family: 'Lato', sans-serif;"
                >
                  Iniciar Chat Geral
                </button>
              </div>
            </div>

          <!-- Ticket Tab -->
          {:else if activeTab === 'ticket'}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div class="text-center">
                <svg class="w-16 h-16 mx-auto text-[#00BFB3] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {@html getIconSVG('ticket')}
                </svg>
                <h3 class="text-xl font-semibold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">
                  Suporte Técnico
                </h3>
                <p class="text-gray-600 mb-6 max-w-2xl mx-auto" style="font-family: 'Lato', sans-serif;">
                  Para questões mais complexas, abra um ticket de suporte. Nossa equipe especializada analisará seu caso e fornecerá uma solução detalhada.
                </p>
                
                {#if supportCategories.length > 0}
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {#each supportCategories as category}
                      <button
                        on:click={() => createTicket(category.id)}
                        class="p-4 border border-gray-200 rounded-lg hover:border-[#00BFB3] hover:bg-[#00BFB3]/5 transition-all duration-200 group"
                      >
                        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-lg" style="background-color: {category.color}20;">
                          <svg class="w-6 h-6" style="color: {category.color};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {@html getIconSVG(category.icon)}
                          </svg>
                        </div>
                        <h4 class="font-medium text-gray-900 group-hover:text-[#00BFB3] transition-colors duration-200" style="font-family: 'Lato', sans-serif;">
                          {category.name}
                        </h4>
                        <p class="text-sm text-gray-600 mt-1" style="font-family: 'Lato', sans-serif;">
                          {category.description}
                        </p>
                      </button>
                    {/each}
                  </div>
                {/if}

                <button 
                  on:click={() => createTicket()}
                  class="px-6 py-3 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200"
                  style="font-family: 'Lato', sans-serif;"
                >
                  Abrir Ticket de Suporte
                </button>
              </div>
            </div>
          {/if}

        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in {
      animation: none;
    }
    
    * {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
</style> 