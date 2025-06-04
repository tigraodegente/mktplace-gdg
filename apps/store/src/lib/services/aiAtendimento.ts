// Serviço de IA Contextual para Atendimento - Arquitetura Especializada
// Router → Specialist → Resposta Direta

interface AtendimentoResponse {
  success: boolean;
  category: string;
  confidence: number;
  answer: string;
  source: 'specialist' | 'fallback';
  next_actions: Array<{
    label: string;
    action: 'link' | 'whatsapp' | 'phone' | 'email' | 'internal';
    value: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  escalate: boolean;
  specialist_used: string;
  processing_steps: string[];
}

interface CategoryRouter {
  category: 'Pedidos' | 'Produtos' | 'Pagamentos' | 'Técnico' | 'Geral';
  confidence: number;
  keywords_matched: string[];
  urgency: 'baixa' | 'média' | 'alta' | 'crítica';
  sentiment: 'positivo' | 'neutro' | 'negativo' | 'frustrado';
}

export class AIAtendimentoContextual {
  private readonly processingSteps: string[] = [];

  // ROUTER INTELIGENTE - Categorização rápida e precisa
  async routeQuestion(question: string): Promise<CategoryRouter> {
    this.addProcessingStep('🔍 Analisando sua pergunta...');
    
    const questionLower = question.toLowerCase();
    
    // Palavras-chave especializadas por categoria
    const categoryKeywords = {
      'Pedidos': {
        primary: ['pedido', 'entrega', 'prazo', 'enviado', 'chegou', 'receber'],
        secondary: ['rastreamento', 'codigo', 'correios', 'despacho', 'transporte'],
        urgent: ['atrasado', 'perdido', 'não chegou', 'cancelar']
      },
      'Produtos': {
        primary: ['produto', 'estoque', 'disponível', 'item', 'comprar'],
        secondary: ['qualidade', 'tamanho', 'cor', 'marca', 'especificação'],
        urgent: ['defeito', 'quebrado', 'errado', 'trocar']
      },
      'Pagamentos': {
        primary: ['pagamento', 'pagar', 'cartão', 'pix', 'boleto'],
        secondary: ['parcela', 'desconto', 'valor', 'preço', 'dinheiro'],
        urgent: ['recusado', 'erro', 'cobrança', 'reembolso', 'estorno']
      },
      'Técnico': {
        primary: ['site', 'app', 'login', 'senha', 'acesso'],
        secondary: ['erro', 'bug', 'lento', 'carregando', 'problema'],
        urgent: ['não funciona', 'travou', 'não abre', 'não carrega']
      }
    };

    let bestMatch: { category: CategoryRouter['category'], score: number, keywords: string[] } = { 
      category: 'Geral', 
      score: 0, 
      keywords: [] 
    };
    let urgency: CategoryRouter['urgency'] = 'média';
    let sentiment: CategoryRouter['sentiment'] = 'neutro';

    // Análise por categoria
    for (const [category, words] of Object.entries(categoryKeywords)) {
      const primaryMatches = words.primary.filter(word => questionLower.includes(word));
      const secondaryMatches = words.secondary.filter(word => questionLower.includes(word));
      const urgentMatches = words.urgent.filter(word => questionLower.includes(word));

      const score = (primaryMatches.length * 3) + (secondaryMatches.length * 2) + (urgentMatches.length * 4);
      const allMatches = [...primaryMatches, ...secondaryMatches, ...urgentMatches];

      if (score > bestMatch.score) {
        bestMatch = { 
          category: category as CategoryRouter['category'], 
          score, 
          keywords: allMatches 
        };
      }

      // Detectar urgência
      if (urgentMatches.length > 0) {
        urgency = 'alta';
      }
    }

    // Análise de sentimento
    const sentimentWords = {
      positivo: ['obrigado', 'ótimo', 'excelente', 'perfeito', 'satisfeito'],
      negativo: ['problema', 'ruim', 'insatisfeito', 'decepcionado'],
      frustrado: ['absurdo', 'revoltado', 'nunca mais', 'péssimo', 'horrível']
    };

    for (const [sent, words] of Object.entries(sentimentWords)) {
      if (words.some(word => questionLower.includes(word))) {
        sentiment = sent as CategoryRouter['sentiment'];
        break;
      }
    }

    // CAPS LOCK = frustração
    if (question.length > 10 && question === question.toUpperCase()) {
      sentiment = 'frustrado';
      urgency = 'alta';
    }

    // Palavras de urgência geral
    if (questionLower.includes('urgente') || questionLower.includes('imediato')) {
      urgency = 'crítica';
    }

    const confidence = Math.min(95, Math.max(60, bestMatch.score * 15));
    
    this.addProcessingStep(`✅ Categoria identificada: ${bestMatch.category} (${confidence}% confiança)`);

    return {
      category: bestMatch.category,
      confidence,
      keywords_matched: bestMatch.keywords,
      urgency,
      sentiment
    };
  }

  // ESPECIALISTAS POR CATEGORIA
  async resolveWithSpecialist(question: string, router: CategoryRouter): Promise<AtendimentoResponse> {
    this.addProcessingStep(`🧠 Acionando especialista em ${router.category}...`);

    let specialist = '';
    let answer = '';
    let next_actions: AtendimentoResponse['next_actions'] = [];
    let escalate = false;

    switch (router.category) {
      case 'Pedidos':
        ({ specialist, answer, next_actions, escalate } = this.pedidosSpecialist(question, router));
        break;
      case 'Produtos':
        ({ specialist, answer, next_actions, escalate } = this.produtosSpecialist(question, router));
        break;
      case 'Pagamentos':
        ({ specialist, answer, next_actions, escalate } = this.pagamentosSpecialist(question, router));
        break;
      case 'Técnico':
        ({ specialist, answer, next_actions, escalate } = this.tecnicoSpecialist(question, router));
        break;
      default:
        ({ specialist, answer, next_actions, escalate } = this.geralSpecialist(question, router));
    }

    this.addProcessingStep('✅ Solução encontrada!');

    return {
      success: true,
      category: router.category,
      confidence: router.confidence,
      answer,
      source: 'specialist',
      next_actions,
      escalate,
      specialist_used: specialist,
      processing_steps: [...this.processingSteps]
    };
  }

  // ESPECIALISTA EM PEDIDOS
  private pedidosSpecialist(question: string, router: CategoryRouter) {
    const qLower = question.toLowerCase();
    let answer = '';
    let escalate = false;

    if (qLower.includes('acompanhar') || qLower.includes('rastrear')) {
      answer = `**🚚 Para acompanhar seu pedido:**

**Método 1 - Site:** Acesse "Meus Pedidos" com seu CPF em graodegente.com.br

**Método 2 - Rastreamento:** Use o código enviado por email em:
• Site: ra.correios.com.br  
• App: Correios (iOS/Android)

**Prazos normais:**
• Sul/Sudeste: 3-7 dias úteis
• Demais regiões: 5-12 dias úteis

**Não recebeu o código?** Posso reenviar agora mesmo!`;
    }
    else if (qLower.includes('atrasado') || qLower.includes('não chegou')) {
      answer = `**⏰ Pedido atrasado? Vou resolver agora:**

**Se passou do prazo:**
1. **Rastreamento urgente** - Solicito aos Correios em até 2h
2. **Reenvio expresso** - Nova entrega gratuita e prioritária  
3. **Reembolso total** - Estorno completo em 24-48h

**Primeira verificação:** Confirme o endereço de entrega e se alguém recebeu.

**Resolução garantida hoje!**`;
      escalate = true;
    }
    else {
      answer = `**📦 Sobre seu pedido:**

**Informações úteis:**
• Pedidos até 14h: despachados no mesmo dia
• Frete grátis acima de R$ 150  
• Embalagem segura e lacrada
• Nota fiscal em todos os envios

**Precisa de algo específico?** Informe o número do pedido para consulta detalhada.`;
    }

    const next_actions: AtendimentoResponse['next_actions'] = [
      { label: 'Acessar Meus Pedidos', action: 'link', value: '/meus-pedidos', priority: 'high' },
      { label: 'Rastrear nos Correios', action: 'link', value: 'https://ra.correios.com.br', priority: 'high' },
      { label: 'WhatsApp Pedidos', action: 'whatsapp', value: '5511999990000', priority: 'medium' },
      { label: 'Falar com especialista', action: 'internal', value: 'escalate_pedidos', priority: 'low' }
    ];

    return {
      specialist: 'Especialista em Pedidos',
      answer,
      next_actions,
      escalate
    };
  }

  // ESPECIALISTA EM PRODUTOS  
  private produtosSpecialist(question: string, router: CategoryRouter) {
    const qLower = question.toLowerCase();
    let answer = '';

    if (qLower.includes('estoque') || qLower.includes('disponível')) {
      answer = `**📊 Consulta de Estoque:**

**Verificação em tempo real:** Nosso site mostra disponibilidade atualizada a cada 5 minutos.

**Produto esgotado?**
• Receba aviso quando voltar (7-15 dias)
• Veja produtos similares na mesma página
• Reserve com 10% de sinal

**Produtos em alta:**
• Certificação INMETRO obrigatória
• Garantia mínima 30 dias
• Avaliações reais de clientes

**Qual produto específico você procura?**`;
    }
    else if (qLower.includes('qualidade') || qLower.includes('certificação')) {
      answer = `**🛡️ Garantia de Qualidade:**

**Nossos padrões:**
• **100% INMETRO** - Todos produtos certificados
• **Garantia 30 dias** - Troca sem questionamento
• **Origem confiável** - Marcas licenciadas
• **Testes rigorosos** - Segurança infantil

**Defeito de fábrica?**
• Troca imediata e gratuita
• Reenvio expresso em 24h
• Reembolso total se preferir

**Qualidade garantida ou seu dinheiro de volta!**`;
    }
    else {
      answer = `**🧸 Sobre nossos produtos:**

**Categorias principais:**
• Bebês (0-2 anos) • Crianças (3-12 anos)
• Educativos • Brinquedos • Roupas • Acessórios

**Filtros inteligentes:**
• Por idade • Por gênero • Por marca • Por preço

**Dica:** Use nossa busca por idade da criança para recomendações personalizadas!`;
    }

    const next_actions: AtendimentoResponse['next_actions'] = [
      { label: 'Ver Produtos', action: 'link', value: '/produtos', priority: 'high' },
      { label: 'Busca por Idade', action: 'link', value: '/produtos?filtro=idade', priority: 'high' },
      { label: 'Falar com Consultor', action: 'whatsapp', value: '5511999990001', priority: 'medium' },
      { label: 'Ver Avaliações', action: 'link', value: '/avaliacoes', priority: 'low' }
    ];

    return {
      specialist: 'Especialista em Produtos',
      answer,
      next_actions,
      escalate: false
    };
  }

  // ESPECIALISTA EM PAGAMENTOS
  private pagamentosSpecialist(question: string, router: CategoryRouter) {
    const qLower = question.toLowerCase();
    let answer = '';
    let escalate = false;

    if (qLower.includes('pix')) {
      answer = `**💰 PIX - Forma mais vantajosa:**

**Vantagens do PIX:**
• **5% desconto** em todos os produtos
• **Confirmação em 2 minutos**
• **Disponível 24/7**
• **Sem taxas adicionais**

**Como pagar:**
1. Finalize seu pedido
2. Copie o código PIX  
3. Abra seu app bancário
4. Confirme o pagamento

**Desconto aplicado automaticamente no checkout!**`;
    }
    else if (qLower.includes('cartão') || qLower.includes('parcel')) {
      answer = `**💳 Cartão de Crédito:**

**Condições:**
• **Até 6x sem juros** (compras acima R$ 100)
• Visa, Mastercard, Elo, American Express
• Aprovação em tempo real
• Primeira parcela no ato

**Problema na aprovação?**
1. Verifique dados do cartão
2. Confirme limite disponível  
3. Tente PIX como alternativa
4. Entre em contato com seu banco

**Parcelamento inteligente calculado no checkout!**`;
    }
    else if (qLower.includes('reembolso') || qLower.includes('estorno')) {
      answer = `**💸 Reembolso rápido e garantido:**

**Prazos por forma de pagamento:**
• **PIX:** 24h úteis (mais rápido!)
• **Cartão:** 5-7 dias úteis  
• **Transferência:** 3-5 dias úteis

**Como solicitar:**
1. Acesse "Meus Pedidos"
2. Clique em "Solicitar Reembolso"
3. Confirme dados bancários
4. Acompanhe por email

**Processamento garantido!**`;
      escalate = true;
    }
    else {
      answer = `**💎 Formas de pagamento:**

**Disponíveis:**
• **PIX** (5% desconto + confirmação 2min)
• **Cartão** (até 6x sem juros)  
• **Boleto** (3 dias para vencimento)

**Segurança total:**
• Criptografia SSL 256 bits
• PCI Compliance Level 1
• Dados protegidos 100%

**Escolha a forma que preferir no checkout!**`;
    }

    const next_actions: AtendimentoResponse['next_actions'] = [
      { label: 'Finalizar Compra', action: 'link', value: '/checkout', priority: 'high' },
      { label: 'Gerar PIX', action: 'internal', value: 'generate_pix', priority: 'high' },
      { label: 'Solicitar Reembolso', action: 'link', value: '/reembolso', priority: 'medium' },
      { label: 'Suporte Financeiro', action: 'whatsapp', value: '5511999990002', priority: 'low' }
    ];

    return {
      specialist: 'Especialista em Pagamentos',
      answer,
      next_actions,
      escalate
    };
  }

  // ESPECIALISTA TÉCNICO
  private tecnicoSpecialist(question: string, router: CategoryRouter) {
    const qLower = question.toLowerCase();
    let answer = '';

    if (qLower.includes('site') || qLower.includes('lento') || qLower.includes('carrega')) {
      answer = `**⚡ Solução rápida para problemas no site:**

**Resolução em 3 passos:**

**1. Limpar cache:**
• Chrome/Edge: Ctrl+Shift+Del
• Safari: Cmd+Shift+Del
• Firefox: Ctrl+Shift+Del

**2. Modo anônimo:**
• Chrome: Ctrl+Shift+N  
• Safari: Cmd+Shift+N

**3. Teste outro navegador:**
• Recomendamos Chrome ou Firefox

**Ainda com problema?** Nossa equipe técnica resolve em até 2h!`;
    }
    else if (qLower.includes('login') || qLower.includes('senha')) {
      answer = `**🔐 Problemas de acesso:**

**Recuperar senha:**
1. Clique "Esqueci minha senha" no login
2. Digite seu email cadastrado  
3. Verifique sua caixa de entrada E spam
4. Clique no link recebido

**Não recebeu email?**
• Verifique se o email está correto
• Aguarde até 10 minutos
• Posso redefinir manualmente

**Conta bloqueada?** Entre em contato imediatamente.`;
    }
    else {
      answer = `**🔧 Suporte técnico completo:**

**Problemas comuns:**
• Site lento ou travando
• Login/senha não funciona
• App não abre ou atualiza
• Erro no checkout

**Informações úteis:**
• Velocidade ideal: 10Mbps+
• Navegadores suportados: Chrome, Firefox, Safari, Edge
• App disponível: iOS 12+ / Android 8+

**Precisa de ajuda específica?** Nossa equipe técnica está pronta!`;
    }

    const next_actions: AtendimentoResponse['next_actions'] = [
      { label: 'Testar Velocidade', action: 'link', value: 'https://speedtest.net', priority: 'high' },
      { label: 'Redefinir Senha', action: 'link', value: '/recuperar-senha', priority: 'high' },
      { label: 'Baixar App', action: 'link', value: '/app', priority: 'medium' },
      { label: 'Suporte Técnico', action: 'email', value: 'tecnico@graodegente.com.br', priority: 'low' }
    ];

    return {
      specialist: 'Especialista Técnico',
      answer,
      next_actions,
      escalate: false
    };
  }

  // ESPECIALISTA GERAL (FALLBACK)
  private geralSpecialist(question: string, router: CategoryRouter) {
    const answer = `**🤝 Estou aqui para ajudar!**

**Para resolver sua questão rapidamente:**

**Canais de atendimento:**
• **WhatsApp:** (11) 99999-0000 - Resposta imediata
• **Telefone:** 0800-123-4567 (8h-18h, seg-sex)
• **Email:** atendimento@graodegente.com.br  
• **Chat:** Disponível no site (horário comercial)

**Horários:**
• Segunda a Sexta: 8h às 18h
• Sábado: 8h às 14h  
• Domingo: Chat online até 16h

**Resposta garantida em até 2h úteis!**`;

    const next_actions: AtendimentoResponse['next_actions'] = [
      { label: 'WhatsApp Agora', action: 'whatsapp', value: '5511999990000', priority: 'high' },
      { label: 'Ligar 0800', action: 'phone', value: '08001234567', priority: 'high' },
      { label: 'Enviar Email', action: 'email', value: 'atendimento@graodegente.com.br', priority: 'medium' },
      { label: 'Abrir Chat', action: 'internal', value: 'open_chat', priority: 'low' }
    ];

    return {
      specialist: 'Atendimento Geral',
      answer,
      next_actions,
      escalate: true
    };
  }

  // FUNÇÃO PRINCIPAL - Entry point da IA
  async resolveQuestion(question: string): Promise<AtendimentoResponse> {
    try {
      this.processingSteps.length = 0; // Reset steps
      
      // 1. Router - categorizar pergunta
      const router = await this.routeQuestion(question);
      
      // 2. Specialist - resolver com especialista  
      const response = await this.resolveWithSpecialist(question, router);
      
      return response;
      
    } catch (error) {
      console.error('❌ Erro na resolução IA:', error);
      
      return {
        success: false,
        category: 'Erro',
        confidence: 0,
        answer: 'Ops! Houve um problema técnico. Entre em contato direto conosco via WhatsApp (11) 99999-0000 para resolução imediata.',
        source: 'fallback',
        next_actions: [
          { label: 'WhatsApp Urgente', action: 'whatsapp', value: '5511999990000', priority: 'high' }
        ],
        escalate: true,
        specialist_used: 'Fallback de Erro',
        processing_steps: ['❌ Erro no processamento']
      };
    }
  }

  private addProcessingStep(step: string) {
    this.processingSteps.push(step);
  }
}

export const aiAtendimento = new AIAtendimentoContextual(); 