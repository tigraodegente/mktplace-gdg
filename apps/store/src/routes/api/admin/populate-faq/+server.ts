import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const POST: RequestHandler = async ({ platform, request }) => {
  try {
    // Verificação de segurança básica (em produção, usar autenticação adequada)
    const { adminKey } = await request.json();
    
    if (adminKey !== 'gdg-populate-2024') {
      return json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const db = getDatabase(platform);

    // 1. Limpar dados existentes
    try {
      await db.query(`DELETE FROM faq_feedback`);
      await db.query(`DELETE FROM faq_items`);
      await db.query(`DELETE FROM faq_categories`);
      await db.query(`DELETE FROM support_categories`);
    } catch (e) {
      console.log('Tabelas vazias, continuando...');
    }

    // 2. Inserir categorias FAQ usando UUIDs válidos
    const catIds = {
      pedidos: 'e1234567-e89b-12d3-a456-426614174001',
      produtos: 'e1234567-e89b-12d3-a456-426614174002', 
      pagamentos: 'e1234567-e89b-12d3-a456-426614174003',
      conta: 'e1234567-e89b-12d3-a456-426614174004',
      trocas: 'e1234567-e89b-12d3-a456-426614174005',
      tecnico: 'e1234567-e89b-12d3-a456-426614174006'
    };

    // Inserir uma por vez para evitar problemas
    await db.query(`INSERT INTO faq_categories (name, description, icon, order_index, is_active) VALUES ('Pedidos e Entrega', 'Dúvidas sobre como fazer pedidos, acompanhar status e prazos de entrega', 'shopping-bag', 1, true) RETURNING id`);
    await db.query(`INSERT INTO faq_categories (name, description, icon, order_index, is_active) VALUES ('Produtos e Qualidade', 'Informações sobre nossos produtos, qualidade, origem e armazenamento', 'cube', 2, true)`);
    await db.query(`INSERT INTO faq_categories (name, description, icon, order_index, is_active) VALUES ('Pagamentos e Preços', 'Formas de pagamento, parcelamento, cupons de desconto e política de preços', 'credit-card', 3, true)`);
    await db.query(`INSERT INTO faq_categories (name, description, icon, order_index, is_active) VALUES ('Conta e Cadastro', 'Criação de conta, alteração de dados, senhas e perfil do usuário', 'user-circle', 4, true)`);
    await db.query(`INSERT INTO faq_categories (name, description, icon, order_index, is_active) VALUES ('Trocas e Devoluções', 'Política de trocas, devoluções, prazos e procedimentos', 'arrow-path', 5, true)`);
    await db.query(`INSERT INTO faq_categories (name, description, icon, order_index, is_active) VALUES ('Suporte Técnico', 'Problemas técnicos, erro no site, aplicativo e questões de acesso', 'cog', 6, true)`);
    
    // Buscar os IDs gerados
    const faqCategories = await db.query(`SELECT id, name FROM faq_categories ORDER BY order_index`);
    const catIdMap: Record<string, string> = {};
    faqCategories.forEach((cat: any) => {
      if (cat.name.includes('Pedidos')) catIdMap.pedidos = cat.id;
      if (cat.name.includes('Produtos')) catIdMap.produtos = cat.id;
      if (cat.name.includes('Pagamentos')) catIdMap.pagamentos = cat.id;
      if (cat.name.includes('Conta')) catIdMap.conta = cat.id;
      if (cat.name.includes('Trocas')) catIdMap.trocas = cat.id;
      if (cat.name.includes('Suporte')) catIdMap.tecnico = cat.id;
    });

    // 3. Inserir FAQ items (deixar banco gerar IDs)
    await db.query(`
      INSERT INTO faq_items (category_id, question, answer, order_index, view_count, helpful_count, not_helpful_count, is_active) VALUES
      ('${catIdMap.pedidos}', 'Como posso acompanhar meu pedido?', 'Você pode acompanhar seu pedido de várias formas: 1) Acesse "Meus Pedidos" em sua conta; 2) Verifique o email de confirmação enviado após a compra; 3) Receba notificações SMS em tempo real. Nosso sistema atualiza automaticamente o status: Confirmado → Preparando → Em transporte → Entregue.', 1, 456, 89, 5, true),
      ('${catIdMap.pedidos}', 'Qual o prazo de entrega?', 'Os prazos variam por região: • Região Metropolitana: 1-3 dias úteis • Interior do Estado: 3-5 dias úteis • Outras regiões: 5-10 dias úteis. Para produtos refrigerados, a entrega é mais rápida (1-2 dias). O prazo é calculado automaticamente no checkout baseado no seu CEP.', 2, 389, 76, 8, true),
      ('${catIdMap.pedidos}', 'Posso alterar ou cancelar meu pedido?', 'Sim, mas depende do status: • Até 2 horas após a confirmação: alteração/cancelamento gratuito pelo site • Entre 2-6 horas: entre em contato conosco • Após preparação iniciada: não é possível alterar, mas você pode recusar na entrega. Para cancelar, acesse "Meus Pedidos" ou chat.', 3, 234, 45, 12, true),
      ('${catIdMap.pedidos}', 'Não estarei em casa na entrega, e agora?', 'Temos várias opções: 1) Reagende gratuitamente pelo WhatsApp; 2) Autorize a entrega com vizinho/porteiro; 3) Escolha um ponto de retirada próximo; 4) Para apartamentos, podemos deixar na portaria. Tentamos 3 vezes a entrega antes de retornar o produto.', 4, 167, 52, 6, true),
      ('${catIdMap.produtos}', 'Como sei se um produto está fresco/dentro da validade?', 'Garantimos produtos sempre frescos: • Grãos: máximo 30 dias da colheita • Perecíveis: mínimo 70% da validade • Congelados: temperatura controlada • Frescos: entrega em até 24h da colheita. Todas as datas são informadas na embalagem e você pode verificar antes de aceitar a entrega.', 1, 298, 78, 4, true),
      ('${catIdMap.produtos}', 'Vocês vendem produtos orgânicos certificados?', 'Sim! Temos uma linha completa de produtos orgânicos certificados pelo IBD, Ecocert e ABIO. Todos os produtos orgânicos têm o selo na embalagem e certificado disponível no site. Busque por "Orgânico" ou use o filtro "Certificação Orgânica" na busca.', 2, 245, 67, 3, true),
      ('${catIdMap.produtos}', 'Como armazenar os produtos corretamente?', 'Cada produto tem instruções específicas: • Grãos secos: local arejado, longe da umidade • Farinhas: recipiente fechado, até 6 meses • Refrigerados: geladeira imediatamente • Congelados: freezer sem descongelar. Enviamos um guia de armazenamento junto com o pedido.', 3, 189, 54, 7, true),
      ('${catIdMap.produtos}', 'Posso comprar em grande quantidade (atacado)?', 'Sim! Para compras acima de 50kg ou R$ 500, oferecemos preços especiais: • 5% desconto: R$ 500-1000 • 10% desconto: R$ 1000-2000 • 15% desconto: acima de R$ 2000. Entre em contato conosco para orçamento personalizado e condições especiais de entrega.', 4, 156, 41, 5, true),
      ('${catIdMap.pagamentos}', 'Quais formas de pagamento vocês aceitam?', 'Aceitamos: • Cartão de crédito (Visa, Master, Elo) em até 12x • Cartão de débito • PIX (5% desconto) • Boleto bancário • Vale-alimentação (Sodexo, Ticket, Alelo) • Crédito da loja. O PIX tem compensação imediata e o boleto até 2 dias úteis.', 1, 445, 92, 3, true),
      ('${catIdMap.pagamentos}', 'Como funciona o programa de fidelidade?', 'Nosso programa "Grão de Ouro" tem 3 níveis: • Bronze (0-500 pontos): 1% cashback • Prata (500-1500): 2% cashback + frete grátis • Ouro (1500+): 3% cashback + descontos exclusivos. A cada R$ 1 gasto = 1 ponto. Pontos não expiram e podem ser trocados por produtos.', 2, 278, 65, 8, true),
      ('${catIdMap.pagamentos}', 'Vocês oferecem cupons de desconto?', 'Sim! Enviamos cupons por: • Email newsletter (10-15% desconto) • Primeira compra (15% off) • Aniversário (20% off) • Compras acima de R$ 200 (frete grátis) • Liquidações sazonais (até 30% off). Inscreva-se na newsletter para receber todas as promoções.', 3, 334, 71, 4, true),
      ('${catIdMap.conta}', 'Como criar uma conta no site?', 'É muito simples: 1) Clique em "Entrar/Cadastrar" 2) Escolha "Criar conta" 3) Preencha: nome, email, telefone e senha 4) Confirme seu email clicando no link enviado. Você também pode fazer login com Google ou Facebook para maior praticidade.', 1, 267, 58, 6, true),
      ('${catIdMap.conta}', 'Esqueci minha senha, como recuperar?', 'Para recuperar: 1) Clique em "Esqueci a senha" na tela de login 2) Digite seu email cadastrado 3) Verifique sua caixa de entrada (e spam) 4) Clique no link recebido 5) Crie uma nova senha. O link expira em 24 horas. Se não receber, verifique se o email está correto.', 2, 198, 44, 9, true),
      ('${catIdMap.conta}', 'Como alterar meus dados pessoais?', 'Acesse "Minha Conta" → "Dados Pessoais" para alterar: nome, telefone, CPF e endereços. Para alterar email ou senha, use as opções específicas no menu. Algumas alterações podem precisar de confirmação por email ou SMS para segurança.', 3, 145, 38, 3, true),
      ('${catIdMap.trocas}', 'Qual a política de troca e devolução?', 'Você tem 7 dias para trocar/devolver produtos não perecíveis. Para produtos perecíveis, aceite apenas se estiver satisfeito na entrega. Motivos aceitos: produto danificado, diferente do pedido, ou insatisfação. O produto deve estar na embalagem original. Estornamos em até 5 dias úteis.', 1, 312, 67, 11, true),
      ('${catIdMap.trocas}', 'Como solicitar uma troca ou devolução?', 'Processo simples: 1) Acesse "Meus Pedidos" 2) Clique em "Solicitar troca/devolução" 3) Selecione o motivo 4) Envie fotos se necessário 5) Aguarde aprovação (até 24h) 6) Coletamos o produto gratuitamente. Você acompanha todo o processo pelo site.', 2, 189, 45, 7, true),
      ('${catIdMap.trocas}', 'Vocês fazem reembolso em dinheiro?', 'Sim! Fazemos reembolso: • PIX: até 24 horas • Cartão de crédito: 5-10 dias úteis • Boleto: transferência bancária em até 5 dias • Você também pode optar por crédito na loja (disponível imediatamente) com 10% de bônus. O valor inclui o frete pago.', 3, 156, 41, 5, true),
      ('${catIdMap.tecnico}', 'O site está lento ou com erro, o que fazer?', 'Primeiro, tente: 1) Atualizar a página (F5) 2) Limpar cache do navegador 3) Testar em aba anônima 4) Verificar sua conexão. Se persistir, entre em contato informando: navegador usado, tipo de erro e horário. Temos suporte técnico 24/7 via chat.', 1, 234, 52, 8, true),
      ('${catIdMap.tecnico}', 'Como usar o aplicativo mobile?', 'Baixe na App Store ou Google Play. Funcionalidades: • Login com mesma conta do site • Notificações push de ofertas • Escaneamento de código de barras • Localização automática para frete • Chat integrado. O app sincroniza automaticamente com o site.', 2, 178, 43, 6, true),
      ('${catIdMap.tecnico}', 'Meu pagamento foi recusado, por quê?', 'Principais motivos: • Dados do cartão incorretos • Limite insuficiente • Cartão vencido/bloqueado • Problema no banco emissor • CEP não confere. Verifique os dados e tente novamente. Se persistir, use PIX ou entre em contato com seu banco. Oferecemos suporte para resolver.', 3, 267, 48, 12, true)
    `);

    // 4. Inserir categorias de suporte (deixar banco gerar IDs)
    await db.query(`
      INSERT INTO support_categories (name, description, is_active) VALUES
      ('Problemas com Pedidos', 'Questões sobre pedidos em andamento, atrasos ou problemas na entrega', true),
      ('Qualidade dos Produtos', 'Reclamações sobre qualidade, produtos danificados ou diferentes do esperado', true),
      ('Problemas de Pagamento', 'Dificuldades com pagamento, cobrança indevida ou reembolsos', true),
      ('Suporte Técnico', 'Problemas com o site, aplicativo ou dificuldades para usar a plataforma', true),
      ('Comercial e Vendas', 'Dúvidas sobre produtos, orçamentos, parcerias ou venda em grande escala', true),
      ('Outros Assuntos', 'Sugestões, elogios, reclamações gerais ou assuntos não categorizados', true)
    `);

    // 5. Contar resultados
    const finalCategories = await db.query(`SELECT COUNT(*) as count FROM faq_categories`);
    const finalFaqs = await db.query(`SELECT COUNT(*) as count FROM faq_items`);
    const finalSupportCats = await db.query(`SELECT COUNT(*) as count FROM support_categories`);

    return json({
      success: true,
      message: 'Dados populados com sucesso!',
      data: {
        faq_categories: finalCategories[0]?.count || 0,
        faq_items: finalFaqs[0]?.count || 0,
        support_categories: finalSupportCats[0]?.count || 0
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao popular dados FAQ:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 