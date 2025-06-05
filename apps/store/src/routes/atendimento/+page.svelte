<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AISearch from '$lib/components/ui/AISearch.svelte';

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
    created_at?: string;
    // Propriedades adicionais da IA
    relevance_score?: number;
    reasoning?: string;
    matched_concepts?: string[];
    intent_category?: string;
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
  
  // Novos estados para melhorias
  let sortBy = 'popularity'; // 'popularity', 'recent', 'helpful'
  let viewMode = 'expanded'; // 'compact', 'expanded'
  let feedbackModal = { show: false, faqId: '', type: '' };
  let shareModal = { show: false, faqId: '', url: '' };
  let userFeedbacks: Record<string, 'helpful' | 'not_helpful'> = {}; // Rastrear votos do usuário
  
  // Estados para busca integrada
  let searchMode = 'ai'; // 'ai', 'traditional'
  let showAIResults = false;
  
  // Sistema de notificações customizado
  let notifications: Array<{id: string, message: string, type: 'success' | 'error' | 'info'}> = [];
  
  // Paginação
  let currentPage = 1;
  let itemsPerPage = 10;
  
  // Session ID para tracking
  let sessionId = '';
  
  // Estado para expansão de texto
  let mostrarMais = false;



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
      'home': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />`,
      // Ícones adicionais para substituir emojis
      'chart-bar': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />`,
      'clipboard-document-list': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />`,
      'clock': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />`,
      'cpu-chip': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-16.5 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a3 3 0 003-3V5.25a3 3 0 00-3-3H6.75a3 3 0 00-3 3v13.5a3 3 0 003 3zm3.75-12a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z" />`,
      'light-bulb': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />`,
      'circle-solid': `<circle cx="12" cy="12" r="8" fill="currentColor" />`,
      'squares-2x2': `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />`
    };
    return icons[iconName] || icons['question-mark-circle'];
  }

  // Dados originais para reset
  let originalFaqItems: FAQItem[] = [];
  
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
        originalFaqItems = [...faqData.faq]; // Backup para reset
      }

    } catch (err) {
      error = 'Erro ao carregar dados de atendimento';
      console.error('Erro ao carregar dados:', err);
    } finally {
      loading = false;
    }
  }
  
  // Função para resetar para FAQ originais
  function resetToOriginalFAQ() {
    faqItems = [...originalFaqItems];
    showAIResults = false;
    searchQuery = '';
    selectedFAQCategory = '';
    expandedFAQ = [];
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
  async function toggleFAQ(faqId: string, isRelated = false) {
    if (expandedFAQ.includes(faqId)) {
      expandedFAQ = expandedFAQ.filter(id => id !== faqId);
    } else {
      // Se for uma FAQ relacionada, fechar a atual e abrir a nova
      if (isRelated) {
        expandedFAQ = [faqId];
      } else {
        expandedFAQ = [...expandedFAQ, faqId];
      }

      // Incrementar view_count quando expandir
      try {
        const response = await fetch(`/api/atendimento/faq/${faqId}/view`, {
          method: 'POST'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Atualizar view_count localmente
            const faq = faqItems.find(item => item.id === faqId);
            if (faq) {
              faq.view_count = data.view_count;
              faqItems = [...faqItems];
            }
          }
        }
      } catch (error) {
        // Falhar silenciosamente
      }
    }
  }

  function searchFAQ() {
    if (searchQuery.trim().length >= 2) {
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

  async function markFAQHelpful(faqId: string, isHelpful: boolean) {
    // Verificar se usuário já votou nesta FAQ
    if (userFeedbacks[faqId]) {
      return; // Já votou, não permitir nova votação
    }

    try {
      const response = await fetch(`/api/atendimento/faq/${faqId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isHelpful,
          sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar contadores com dados do servidor
        const faq = faqItems.find(item => item.id === faqId);
        if (faq) {
          faq.helpful_count = data.helpful_count;
          faq.not_helpful_count = data.not_helpful_count;
          faqItems = [...faqItems];
          
          // Marcar que usuário já votou
          userFeedbacks[faqId] = isHelpful ? 'helpful' : 'not_helpful';
          
          showNotification('Obrigado pelo seu feedback!', 'success');
        }
      } else {
        showNotification(data.error || 'Erro ao salvar feedback', 'error');
      }
    } catch (error) {
      showNotification('Erro ao salvar feedback', 'error');
    }
  }



  function getRelatedFAQs(currentFaqId: string) {
    const currentFaq = faqItems.find(item => item.id === currentFaqId);
    if (!currentFaq) return [];
    
    return faqItems
      .filter(item => 
        item.id !== currentFaqId && 
        item.category_id === currentFaq.category_id
      )
      .slice(0, 3);
  }

  function shareFAQ(faqId: string) {
    const url = `${window.location.origin}/atendimento?faq=${faqId}`;
    shareModal = { show: true, faqId, url };
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Link copiado para a área de transferência!', 'success');
      shareModal.show = false;
    });
  }

  function openFeedbackModal(faqId: string, type: string) {
    feedbackModal = { show: true, faqId, type };
  }

  async function submitFeedback(feedback: string) {
    try {
      const response = await fetch('/api/atendimento/faq/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          faqId: feedbackModal.faqId,
          feedback,
          sessionId
        })
      });

      const data = await response.json();
      
      // Fechar modal primeiro
      feedbackModal.show = false;
      
      // Aguardar um pouco antes de mostrar notificação
      setTimeout(() => {
        if (data.success) {
          showNotification('Obrigado pelo seu feedback! Sua sugestão nos ajuda a melhorar.', 'success');
        } else {
          showNotification('Erro ao enviar feedback. Tente novamente.', 'error');
        }
      }, 100);

    } catch (error) {
      feedbackModal.show = false;
      setTimeout(() => {
        showNotification('Erro ao enviar feedback. Tente novamente.', 'error');
      }, 100);
    }
  }

  // Sistema de notificações customizado
  function showNotification(message: string, type: 'success' | 'error' | 'info') {
    const id = Date.now().toString();
    notifications = [...notifications, { id, message, type }];
    
    // Auto remover após 4 segundos
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  }

  function removeNotification(id: string) {
    notifications = notifications.filter(n => n.id !== id);
  }

  function getHelpfulPercentage(faq: FAQItem) {
    const total = faq.helpful_count + faq.not_helpful_count;
    if (total === 0) return 0;
    return Math.round((faq.helpful_count / total) * 100);
  }

  function getCategoryIcon(categoryName: string) {
    const icons: Record<string, string> = {
      'Pedidos': 'shopping-bag',
      'Produtos': 'cube', 
      'Pagamentos': 'credit-card',
      'Técnico': 'cog',
      'Geral': 'question-mark-circle'
    };
    return icons[categoryName] || 'question-mark-circle';
  }

  // Filtrar e ordenar FAQ
  $: filteredFAQ = (() => {
    let filtered = faqItems.filter(item => {
      if (selectedFAQCategory && item.category_id !== selectedFAQCategory) return false;
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return item.question.toLowerCase().includes(search) || 
               item.answer.toLowerCase().includes(search);
      }
      return true;
    });

    // Ordenação
    switch (sortBy) {
      case 'popularity':
        filtered = filtered.sort((a, b) => b.view_count - a.view_count);
        break;
      case 'helpful':
        filtered = filtered.sort((a, b) => b.helpful_count - a.helpful_count);
        break;
      case 'recent':
        filtered = filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        break;
    }

    return filtered;
  })();

  // Paginação calculada
  $: totalPages = Math.ceil(filteredFAQ.length / itemsPerPage);
  $: paginatedFAQ = filteredFAQ.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Funções de paginação
  function goToPage(page: number) {
    currentPage = Math.max(1, Math.min(page, totalPages));
  }

  function nextPage() {
    if (currentPage < totalPages) currentPage++;
  }

  function prevPage() {
    if (currentPage > 1) currentPage--;
  }

  // Reset página quando filtros mudam
  $: if (searchQuery || selectedFAQCategory || sortBy || itemsPerPage) {
    currentPage = 1;
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
    // Gerar session ID único
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Carregar preferência de busca salva
    const savedSearchMode = localStorage.getItem('faq_search_mode');
    if (savedSearchMode && ['ai', 'traditional'].includes(savedSearchMode)) {
      searchMode = savedSearchMode;
    }
    
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
  
  // Salvar preferência quando alterar modo
  $: if (typeof window !== 'undefined' && searchMode) {
    localStorage.setItem('faq_search_mode', searchMode);
  }
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
              
              <!-- Busca e Filtros Integrados -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <!-- Header da busca -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-[#00BFB3] rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {@html getIconSVG('search')}
                      </svg>
                    </div>
                                         <div>
                       <h3 class="text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
                         {searchMode === 'ai' ? 'Busca Inteligente' : 'Busca Tradicional'}
                       </h3>
                       <p class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
                         {searchMode === 'ai' ? 'Digite sua pergunta e vamos usar IA para te auxiliar' : 'Busque por palavras-chave nas FAQ'}
                       </p>
                     </div>
                  </div>
                  
                  <!-- Toggle modo de busca -->
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">Modo:</span>
                    <div class="flex bg-gray-100 rounded-md p-1">
                      <button
                        on:click={() => searchMode = 'ai'}
                        class="px-3 py-1 text-xs rounded-md transition-colors {searchMode === 'ai' ? 'bg-[#00BFB3] text-white shadow-sm' : 'text-gray-600'}"
                        style="font-family: 'Lato', sans-serif;"
                      >
                        IA
                      </button>
                      <button
                        on:click={() => searchMode = 'traditional'}
                        class="px-3 py-1 text-xs rounded-md transition-colors {searchMode === 'traditional' ? 'bg-[#00BFB3] text-white shadow-sm' : 'text-gray-600'}"
                        style="font-family: 'Lato', sans-serif;"
                      >
                        Busca
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Busca principal -->
                {#if searchMode === 'ai'}
                  <!-- Busca IA integrada -->
                  <div class="mb-4">
                    <AISearch 
                      placeholder="Como posso te ajudar hoje? Digite sua pergunta..."
                      maxResults={5}
                      on:searchResults={(event: any) => {
                        const results = event.detail.results;
                        if (results.length > 0) {
                          expandedFAQ = [results[0].id];
                          faqItems = results;
                          viewMode = 'expanded';
                          // Mostrar badge de resultados IA
                          showAIResults = true;
                        }
                      }}
                      on:faqSelected={(event: any) => {
                        const faq = event.detail;
                        expandirFAQEspecifico(faq);
                      }}
                    />
                  </div>
                  
                  <!-- Dicas de uso da IA -->
                  <div class="mt-1 text-[11px] text-gray-500" style="font-family: 'Lato', sans-serif;">
                    <svg class="w-3 h-3 inline mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG('light-bulb')}
                    </svg>
                    <strong>Dica:</strong> Faça perguntas completas como "Como cancelar meu pedido?" → Pressione <kbd class="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Enter</kbd> ou clique <strong>Buscar</strong>
                  </div>
                {:else}
                  <!-- Busca tradicional -->
                  <div class="mb-4">
                    <div class="flex gap-3">
                    <div class="flex-1 relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      
                      <input
                        type="text"
                        bind:value={searchQuery}
                        on:keydown={(e) => e.key === 'Enter' && searchQuery.trim().length >= 2 && searchFAQ()}
                        placeholder="Digite palavras-chave para buscar..."
                        class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] sm:text-sm"
                        style="font-family: 'Lato', sans-serif;"
                        disabled={false}
                      />
                      
                      {#if searchQuery}
                        <button
                          on:click={() => { searchQuery = ''; }}
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
                      on:click={searchFAQ}
                      disabled={searchQuery.trim().length < 2}
                      class="px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center {
                        searchQuery.trim().length < 2 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-[#00BFB3] text-white hover:bg-[#00a89b] cursor-pointer'
                      }"
                      style="font-family: 'Lato', sans-serif;"
                      title={searchQuery.trim().length < 2 ? 'Digite pelo menos 2 caracteres' : 'Buscar nas FAQ'}
                    >
                                            <span>Buscar</span>
                    </button>
                    </div>
                  </div>
                  
                                                      <!-- Dicas de uso tradicional -->
                  <div class="mt-1 text-[11px] text-gray-500" style="font-family: 'Lato', sans-serif;">
                    <svg class="w-3 h-3 inline mr-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG('light-bulb')}
                    </svg>
                    <strong>Dica:</strong> Use palavras-chave como "cancelar pedido", "entrega" → Pressione <kbd class="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Enter</kbd> ou clique <strong>Buscar</strong>
                  </div>
                {/if}

                <!-- Status da Busca IA -->
                {#if showAIResults}
                  <div class="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mt-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {@html getIconSVG('cpu-chip')}
                          </svg>
                        </div>
                        <div>
                          <h4 class="text-sm font-semibold text-purple-900" style="font-family: 'Lato', sans-serif;">
                            Resultados da Busca Inteligente
                          </h4>
                          <p class="text-xs text-purple-700" style="font-family: 'Lato', sans-serif;">
                            {filteredFAQ.length} {filteredFAQ.length === 1 ? 'resposta encontrada' : 'respostas encontradas'} com análise semântica da IA
                          </p>
                        </div>
                      </div>
                      <button 
                        on:click={resetToOriginalFAQ}
                        class="flex items-center gap-2 px-4 py-2 bg-white text-purple-700 border border-purple-300 rounded-md hover:bg-purple-50 transition-colors duration-200 text-sm font-medium"
                        style="font-family: 'Lato', sans-serif;"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Ver todas as FAQ
                      </button>
                    </div>
                  </div>
                {/if}

                <!-- Filtros sutis no canto direito -->
                <div class="flex items-center justify-end gap-3 py-3 border-b border-gray-100">
                  <!-- Ordenação -->
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {@html getIconSVG('chart-bar')}
                    </svg>
                    <select 
                      bind:value={sortBy}
                      class="text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
                      style="font-family: 'Lato', sans-serif;"
                    >
                      <option value="popularity">Mais populares</option>
                      <option value="helpful">Mais úteis</option>
                      <option value="recent">Mais recentes</option>
                    </select>
                  </div>

                  <!-- Separador -->
                  {#if faqCategories.length > 0}
                    <div class="w-px h-4 bg-gray-300"></div>
                  {/if}

                  <!-- Categoria -->
                  {#if faqCategories.length > 0}
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {@html getIconSVG('squares-2x2')}
                      </svg>
                      <select 
                        bind:value={selectedFAQCategory}
                        on:change={loadFAQWithSearch}
                        class="text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
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
              </div>

              <!-- FAQ Items -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                {#if paginatedFAQ.length > 0}
                  <div class="divide-y divide-gray-200">
                    {#each paginatedFAQ as faq, index}
                      <div class="{viewMode === 'compact' ? 'p-4' : 'p-6'} hover:bg-gray-50 transition-colors duration-200">
                        <div class="flex items-start gap-{viewMode === 'compact' ? '3' : '4'}">
                          <!-- Ícone da categoria -->
                          {#if viewMode === 'expanded'}
                            <div class="flex-shrink-0 w-10 h-10 bg-[#00BFB3]/10 rounded-lg flex items-center justify-center">
                              <svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {@html getIconSVG(getCategoryIcon(faq.category_name))}
                              </svg>
                            </div>
                          {:else}
                            <div class="flex-shrink-0 w-8 h-8 bg-[#00BFB3]/10 rounded-md flex items-center justify-center">
                              <svg class="w-4 h-4 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {@html getIconSVG(getCategoryIcon(faq.category_name))}
                              </svg>
                            </div>
                          {/if}

                          <div class="flex-1 min-w-0">
                            <!-- Header com título e ações -->
                            <div class="flex items-start justify-between {viewMode === 'compact' ? 'mb-1' : 'mb-2'}">
                              <button
                                on:click={() => toggleFAQ(faq.id)}
                                class="flex-1 text-left group focus:outline-none pr-4"
                              >
                                <!-- Título com badge da categoria -->
                                <div class="flex items-start gap-3 {viewMode === 'compact' ? 'mb-1' : 'mb-2'}">
                                  <h3 class="{viewMode === 'compact' ? 'text-base' : 'text-lg'} font-medium text-gray-900 group-hover:text-[#00BFB3] transition-colors duration-200" style="font-family: 'Lato', sans-serif;">
                                    {faq.question}
                                  </h3>
                                  {#if viewMode === 'expanded'}
                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#00BFB3]/10 text-[#00BFB3]">
                                      {faq.category_name}
                                    </span>
                                  {/if}
                                </div>
                                
                                <!-- Métricas visuais -->
                                <div class="flex items-center gap-{viewMode === 'compact' ? '4' : '6'} text-{viewMode === 'compact' ? 'xs' : 'sm'} text-gray-500">
                                  {#if viewMode === 'expanded' || getHelpfulPercentage(faq) > 80}
                                    <span class="flex items-center gap-1">
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                      </svg>
                                      {faq.view_count} visualizações
                                    </span>
                                  {/if}
                                  
                                  {#if getHelpfulPercentage(faq) > 0}
                                    <span class="flex items-center gap-1 text-green-600">
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {@html getIconSVG('thumb-up')}
                                      </svg>
                                      {getHelpfulPercentage(faq)}% útil
                                    </span>
                                  {/if}

                                  {#if viewMode === 'expanded'}
                                    <span class="flex items-center gap-1">
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                                      </svg>
                                      {faq.helpful_count + faq.not_helpful_count} feedbacks
                                    </span>
                                  {/if}

                                  <!-- Score de relevância IA -->
                                  {#if showAIResults && faq.relevance_score}
                                    <span class="flex items-center gap-1 text-purple-600">
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                      </svg>
                                      {Math.round(faq.relevance_score * 100)}% relevante
                                    </span>
                                  {/if}

                                  <!-- Mostrar apenas categoria no modo compacto -->
                                  {#if viewMode === 'compact'}
                                    <span class="text-[#00BFB3] text-xs font-medium">
                                      {faq.category_name}
                                    </span>
                                  {/if}
                                </div>
                              </button>
                              
                              <!-- Ações rápidas -->
                              <div class="flex items-center gap-{viewMode === 'compact' ? '1' : '2'} ml-4">
                                {#if viewMode === 'expanded'}
                                  <!-- Compartilhar -->
                                  <button 
                                    on:click={() => shareFAQ(faq.id)}
                                    class="p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
                                    title="Compartilhar"
                                  >
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                                    </svg>
                                  </button>
                                {/if}

                                <!-- Expandir/colapsar -->
                                <button 
                                  on:click={() => toggleFAQ(faq.id)}
                                  class="p-{viewMode === 'compact' ? '1' : '2'} rounded-md hover:bg-gray-100 transition-colors duration-200"
                                  title="Expandir/Colapsar"
                                >
                                  <svg 
                                    class="w-{viewMode === 'compact' ? '4' : '5'} h-{viewMode === 'compact' ? '4' : '5'} text-gray-400 transform transition-transform duration-200 {expandedFAQ.includes(faq.id) ? 'rotate-180' : ''}" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    {@html getIconSVG('chevron-down')}
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {#if expandedFAQ.includes(faq.id)}
                              <div 
                                class="mt-6 pt-6 border-t border-gray-100 animate-fade-in"
                                style="animation: fadeIn 0.2s ease-in-out;"
                              >
                                <!-- Explicação da IA (se for resultado IA) -->
                                {#if showAIResults && faq.reasoning}
                                  <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                                    <div class="flex items-start gap-3">
                                      <div class="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          {@html getIconSVG('cpu-chip')}
                                        </svg>
                                      </div>
                                      <div>
                                        <h5 class="text-sm font-medium text-purple-900 mb-1" style="font-family: 'Lato', sans-serif;">
                                          Por que a IA escolheu esta resposta:
                                        </h5>
                                        <p class="text-sm text-purple-800" style="font-family: 'Lato', sans-serif;">
                                          {faq.reasoning}
                                        </p>
                                        {#if faq.matched_concepts && faq.matched_concepts.length > 0}
                                          <div class="flex flex-wrap gap-1 mt-2">
                                            <span class="text-xs text-purple-600">Conceitos:</span>
                                            {#each faq.matched_concepts as concept}
                                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                {concept}
                                              </span>
                                            {/each}
                                          </div>
                                        {/if}
                                      </div>
                                    </div>
                                  </div>
                                {/if}

                                <!-- Resposta -->
                                <div class="prose prose-sm max-w-none mb-6">
                                  <p class="text-gray-700 leading-relaxed" style="font-family: 'Lato', sans-serif;">
                                    {faq.answer}
                                  </p>
                                </div>
                                
                                <!-- Feedback aprimorado -->
                                <div class="bg-gray-50 rounded-lg p-4 mb-6">
                                  <div class="flex items-center justify-between mb-3">
                                    <span class="text-sm font-medium text-gray-700" style="font-family: 'Lato', sans-serif;">
                                      Esta resposta foi útil?
                                    </span>
                                    <div class="flex items-center gap-2 text-xs text-gray-500">
                                      <span class="flex items-center gap-1">
                                      <svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {@html getIconSVG('thumb-up')}
                                      </svg>
                                      {faq.helpful_count}
                                    </span>
                                      <span class="flex items-center gap-1">
                                        <svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          {@html getIconSVG('thumb-down')}
                                        </svg>
                                        {faq.not_helpful_count}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div class="flex items-center gap-3">
                                    <button 
                                      on:click={() => markFAQHelpful(faq.id, true)}
                                      disabled={!!userFeedbacks[faq.id]}
                                      class="flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors duration-200 {
                                        userFeedbacks[faq.id] === 'helpful' 
                                          ? 'text-green-800 bg-green-200 cursor-not-allowed' 
                                          : userFeedbacks[faq.id] 
                                            ? 'text-gray-500 bg-gray-100 cursor-not-allowed' 
                                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                                      }"
                                      style="font-family: 'Lato', sans-serif;"
                                    >
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {@html getIconSVG('thumb-up')}
                                      </svg>
                                      {userFeedbacks[faq.id] === 'helpful' ? '✓ Ajudou' : 'Sim, ajudou'}
                                    </button>
                                    
                                    <button 
                                      on:click={() => markFAQHelpful(faq.id, false)}
                                      disabled={!!userFeedbacks[faq.id]}
                                      class="flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors duration-200 {
                                        userFeedbacks[faq.id] === 'not_helpful' 
                                          ? 'text-red-800 bg-red-200 cursor-not-allowed' 
                                          : userFeedbacks[faq.id] 
                                            ? 'text-gray-500 bg-gray-100 cursor-not-allowed' 
                                            : 'text-red-700 bg-red-100 hover:bg-red-200'
                                      }"
                                      style="font-family: 'Lato', sans-serif;"
                                    >
                                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {@html getIconSVG('thumb-down')}
                                      </svg>
                                      {userFeedbacks[faq.id] === 'not_helpful' ? '✓ Não ajudou' : 'Não ajudou'}
                                    </button>

                                    <button 
                                      on:click={() => openFeedbackModal(faq.id, 'suggestion')}
                                      class="ml-auto px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                                      style="font-family: 'Lato', sans-serif;"
                                    >
                                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      {@html getIconSVG('light-bulb')}
                                    </svg>
                                    Sugerir melhoria
                                    </button>
                                  </div>
                                </div>

                                <!-- FAQ Relacionadas -->
                                {#if getRelatedFAQs(faq.id).length > 0}
                                  <div class="border-t border-gray-200 pt-4">
                                    <h4 class="text-sm font-medium text-gray-900 mb-3" style="font-family: 'Lato', sans-serif;">
                                      <svg class="w-4 h-4 inline mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      {@html getIconSVG('clipboard-document-list')}
                                    </svg>
                                    Perguntas relacionadas
                                    </h4>
                                    <div class="grid gap-2">
                                      {#each getRelatedFAQs(faq.id) as relatedFaq}
                                        <button
                                          on:click={() => toggleFAQ(relatedFaq.id, true)}
                                          class="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors duration-200"
                                        >
                                          <div class="flex items-center gap-2">
                                            <svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                            <span class="text-sm text-blue-800 font-medium" style="font-family: 'Lato', sans-serif;">
                                              {relatedFaq.question}
                                            </span>
                                          </div>
                                        </button>
                                      {/each}
                                    </div>
                                  </div>
                                {/if}
                              </div>
                            {/if}
                          </div>
                        </div>
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

              <!-- Paginação -->
              {#if totalPages > 1}
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <!-- Info da página -->
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <span class="text-sm text-gray-600" style="font-family: 'Lato', sans-serif;">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredFAQ.length)} de {filteredFAQ.length} resultados
                      </span>
                      
                      <!-- Seletor de itens por página -->
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-sm text-gray-600 whitespace-nowrap" style="font-family: 'Lato', sans-serif;">Por página:</span>
                        <select 
                          bind:value={itemsPerPage}
                          class="min-w-[80px] px-3 py-1 pr-8 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent bg-white"
                          style="font-family: 'Lato', sans-serif;"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>

                    <!-- Controles de navegação -->
                    <div class="flex items-center justify-center md:justify-end gap-2 flex-wrap">
                      <!-- Anterior -->
                      <button 
                        on:click={prevPage}
                        disabled={currentPage === 1}
                        class="flex items-center gap-1 px-2 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap"
                        style="font-family: 'Lato', sans-serif;"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        <span class="hidden sm:inline">Anterior</span>
                      </button>

                      <!-- Números das páginas -->
                      <div class="flex items-center gap-1">
                        {#each Array(Math.min(totalPages, 5)) as _, i}
                          {@const pageNum = totalPages <= 5 ? i + 1 : 
                            currentPage <= 3 ? i + 1 :
                            currentPage >= totalPages - 2 ? totalPages - 4 + i :
                            currentPage - 2 + i
                          }
                          <button
                            on:click={() => goToPage(pageNum)}
                            class="w-8 h-8 text-sm rounded-md transition-colors duration-200 flex-shrink-0 {
                              pageNum === currentPage 
                                ? 'bg-[#00BFB3] text-white' 
                                : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }"
                            style="font-family: 'Lato', sans-serif;"
                          >
                            {pageNum}
                          </button>
                        {/each}
                      </div>

                      <!-- Próximo -->
                      <button 
                        on:click={nextPage}
                        disabled={currentPage === totalPages}
                        class="flex items-center gap-1 px-2 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 whitespace-nowrap"
                        style="font-family: 'Lato', sans-serif;"
                      >
                        <span class="hidden sm:inline">Próximo</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              {/if}
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



<!-- Modal de Compartilhamento -->
{#if shareModal.show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
          Compartilhar FAQ
        </h3>
        <button 
          on:click={() => shareModal.show = false}
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
            Link para compartilhar:
          </label>
          <div class="flex gap-2">
            <input 
              type="text" 
              value={shareModal.url}
              readonly
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              style="font-family: 'Lato', sans-serif;"
            />
            <button 
              on:click={() => copyToClipboard(shareModal.url)}
              class="px-4 py-2 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200 text-sm"
              style="font-family: 'Lato', sans-serif;"
            >
              Copiar
            </button>
          </div>
        </div>
        
        <div class="flex justify-end">
          <button 
            on:click={() => shareModal.show = false}
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
            style="font-family: 'Lato', sans-serif;"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Modal de Feedback -->
{#if feedbackModal.show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900" style="font-family: 'Lato', sans-serif;">
          Enviar Feedback
        </h3>
        <button 
          on:click={() => feedbackModal.show = false}
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form on:submit|preventDefault={(e) => {
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const feedback = formData.get('feedback') as string;
        if (feedback && feedback.trim()) {
          submitFeedback(feedback);
        } else {
          showNotification('Por favor, escreva seu feedback antes de enviar.', 'error');
        }
      }}>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2" style="font-family: 'Lato', sans-serif;">
              O que mais você gostaria de saber sobre este tópico?
            </label>
            <textarea 
              name="feedback"
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
              placeholder="Compartilhe suas sugestões ou dúvidas adicionais..."
              style="font-family: 'Lato', sans-serif;"
              required
            ></textarea>
          </div>
          
          <div class="flex justify-end gap-3">
            <button 
              type="button"
              on:click={() => feedbackModal.show = false}
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
              style="font-family: 'Lato', sans-serif;"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              class="px-4 py-2 bg-[#00BFB3] text-white rounded-md hover:bg-[#00a89b] transition-colors duration-200"
              style="font-family: 'Lato', sans-serif;"
            >
              Enviar Feedback
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Sistema de Notificações - No final para maior z-index -->
{#if notifications.length > 0}
  <div class="fixed top-4 right-4 space-y-2 pointer-events-none" style="z-index: 99999;">
    {#each notifications as notification}
      <div 
        class="flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 bg-white max-w-sm animate-slide-in pointer-events-auto {
          notification.type === 'success' ? 'border-green-500' : 
          notification.type === 'error' ? 'border-red-500' : 
          'border-blue-500'
        }"
        style="box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); z-index: 99999;"
      >
        <!-- Ícone -->
        <div class="flex-shrink-0">
          {#if notification.type === 'success'}
            <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          {:else if notification.type === 'error'}
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          {:else}
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          {/if}
        </div>
        
        <!-- Mensagem -->
        <p class="text-sm text-gray-700 flex-1" style="font-family: 'Lato', sans-serif;">
          {notification.message}
        </p>
        
        <!-- Botão fechar -->
        <button 
          on:click={() => removeNotification(notification.id)}
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0; 
      transform: translateX(100%); 
    }
    to { 
      opacity: 1; 
      transform: translateX(0); 
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
  }

  .animate-slide-in {
    animation: slideIn 0.3s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in,
    .animate-slide-in {
      animation: none;
    }
    
    * {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
</style> 