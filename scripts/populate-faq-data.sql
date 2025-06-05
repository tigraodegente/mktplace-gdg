-- POPULAR DADOS FAQ - GRÃO DE GENTE MARKETPLACE
-- Executar este script para inserir dados reais de exemplo

-- Limpar dados existentes (opcional)
DELETE FROM faq_feedback;
DELETE FROM faq_items;
DELETE FROM faq_categories;

-- 1. INSERIR CATEGORIAS FAQ
INSERT INTO faq_categories (id, name, description, icon, order_index, is_active) VALUES
('faq-cat-pedidos', 'Pedidos e Entrega', 'Dúvidas sobre como fazer pedidos, acompanhar status e prazos de entrega', 'shopping-bag', 1, true),
('faq-cat-produtos', 'Produtos e Qualidade', 'Informações sobre nossos produtos, qualidade, origem e armazenamento', 'cube', 2, true),
('faq-cat-pagamentos', 'Pagamentos e Preços', 'Formas de pagamento, parcelamento, cupons de desconto e política de preços', 'credit-card', 3, true),
('faq-cat-conta', 'Conta e Cadastro', 'Criação de conta, alteração de dados, senhas e perfil do usuário', 'user-circle', 4, true),
('faq-cat-trocas', 'Trocas e Devoluções', 'Política de trocas, devoluções, prazos e procedimentos', 'arrow-path', 5, true),
('faq-cat-tecnico', 'Suporte Técnico', 'Problemas técnicos, erro no site, aplicativo e questões de acesso', 'cog', 6, true);

-- 2. INSERIR FAQ ITEMS COM DADOS REAIS

-- CATEGORIA: PEDIDOS E ENTREGA
INSERT INTO faq_items (id, category_id, question, answer, order_index, view_count, helpful_count, not_helpful_count, is_active) VALUES
('faq-1', 'faq-cat-pedidos', 'Como posso acompanhar meu pedido?', 'Você pode acompanhar seu pedido de várias formas: 1) Acesse "Meus Pedidos" em sua conta; 2) Verifique o email de confirmação enviado após a compra; 3) Receba notificações SMS em tempo real. Nosso sistema atualiza automaticamente o status: Confirmado → Preparando → Em transporte → Entregue.', 1, 456, 89, 5, true),

('faq-2', 'faq-cat-pedidos', 'Qual o prazo de entrega?', 'Os prazos variam por região: • Região Metropolitana: 1-3 dias úteis • Interior do Estado: 3-5 dias úteis • Outras regiões: 5-10 dias úteis. Para produtos refrigerados, a entrega é mais rápida (1-2 dias). O prazo é calculado automaticamente no checkout baseado no seu CEP.', 2, 389, 76, 8, true),

('faq-3', 'faq-cat-pedidos', 'Posso alterar ou cancelar meu pedido?', 'Sim, mas depende do status: • Até 2 horas após a confirmação: alteração/cancelamento gratuito pelo site • Entre 2-6 horas: entre em contato conosco • Após preparação iniciada: não é possível alterar, mas você pode recusar na entrega. Para cancelar, acesse "Meus Pedidos" ou chat.', 3, 234, 45, 12, true),

('faq-4', 'faq-cat-pedidos', 'Não estarei em casa na entrega, e agora?', 'Temos várias opções: 1) Reagende gratuitamente pelo WhatsApp; 2) Autorize a entrega com vizinho/porteiro; 3) Escolha um ponto de retirada próximo; 4) Para apartamentos, podemos deixar na portaria. Tentamos 3 vezes a entrega antes de retornar o produto.', 4, 167, 52, 6, true),

-- CATEGORIA: PRODUTOS E QUALIDADE  
('faq-5', 'faq-cat-produtos', 'Como sei se um produto está fresco/dentro da validade?', 'Garantimos produtos sempre frescos: • Grãos: máximo 30 dias da colheita • Perecíveis: mínimo 70% da validade • Congelados: temperatura controlada • Frescos: entrega em até 24h da colheita. Todas as datas são informadas na embalagem e você pode verificar antes de aceitar a entrega.', 1, 298, 78, 4, true),

('faq-6', 'faq-cat-produtos', 'Vocês vendem produtos orgânicos certificados?', 'Sim! Temos uma linha completa de produtos orgânicos certificados pelo IBD, Ecocert e ABIO. Todos os produtos orgânicos têm o selo na embalagem e certificado disponível no site. Busque por "Orgânico" ou use o filtro "Certificação Orgânica" na busca.', 2, 245, 67, 3, true),

('faq-7', 'faq-cat-produtos', 'Como armazenar os produtos corretamente?', 'Cada produto tem instruções específicas: • Grãos secos: local arejado, longe da umidade • Farinhas: recipiente fechado, até 6 meses • Refrigerados: geladeira imediatamente • Congelados: freezer sem descongelar. Enviamos um guia de armazenamento junto com o pedido.', 3, 189, 54, 7, true),

('faq-8', 'faq-cat-produtos', 'Posso comprar em grande quantidade (atacado)?', 'Sim! Para compras acima de 50kg ou R$ 500, oferecemos preços especiais: • 5% desconto: R$ 500-1000 • 10% desconto: R$ 1000-2000 • 15% desconto: acima de R$ 2000. Entre em contato conosco para orçamento personalizado e condições especiais de entrega.', 4, 156, 41, 5, true),

-- CATEGORIA: PAGAMENTOS E PREÇOS
('faq-9', 'faq-cat-pagamentos', 'Quais formas de pagamento vocês aceitam?', 'Aceitamos: • Cartão de crédito (Visa, Master, Elo) em até 12x • Cartão de débito • PIX (5% desconto) • Boleto bancário • Vale-alimentação (Sodexo, Ticket, Alelo) • Crédito da loja. O PIX tem compensação imediata e o boleto até 2 dias úteis.', 1, 445, 92, 3, true),

('faq-10', 'faq-cat-pagamentos', 'Como funciona o programa de fidelidade?', 'Nosso programa "Grão de Ouro" tem 3 níveis: • Bronze (0-500 pontos): 1% cashback • Prata (500-1500): 2% cashback + frete grátis • Ouro (1500+): 3% cashback + descontos exclusivos. A cada R$ 1 gasto = 1 ponto. Pontos não expiram e podem ser trocados por produtos.', 2, 278, 65, 8, true),

('faq-11', 'faq-cat-pagamentos', 'Vocês oferecem cupons de desconto?', 'Sim! Enviamos cupons por: • Email newsletter (10-15% desconto) • Primeira compra (15% off) • Aniversário (20% off) • Compras acima de R$ 200 (frete grátis) • Liquidações sazonais (até 30% off). Inscreva-se na newsletter para receber todas as promoções.', 3, 334, 71, 4, true),

-- CATEGORIA: CONTA E CADASTRO
('faq-12', 'faq-cat-conta', 'Como criar uma conta no site?', 'É muito simples: 1) Clique em "Entrar/Cadastrar" 2) Escolha "Criar conta" 3) Preencha: nome, email, telefone e senha 4) Confirme seu email clicando no link enviado. Você também pode fazer login com Google ou Facebook para maior praticidade.', 1, 267, 58, 6, true),

('faq-13', 'faq-cat-conta', 'Esqueci minha senha, como recuperar?', 'Para recuperar: 1) Clique em "Esqueci a senha" na tela de login 2) Digite seu email cadastrado 3) Verifique sua caixa de entrada (e spam) 4) Clique no link recebido 5) Crie uma nova senha. O link expira em 24 horas. Se não receber, verifique se o email está correto.', 2, 198, 44, 9, true),

('faq-14', 'faq-cat-conta', 'Como alterar meus dados pessoais?', 'Acesse "Minha Conta" → "Dados Pessoais" para alterar: nome, telefone, CPF e endereços. Para alterar email ou senha, use as opções específicas no menu. Algumas alterações podem precisar de confirmação por email ou SMS para segurança.', 3, 145, 38, 3, true),

-- CATEGORIA: TROCAS E DEVOLUÇÕES
('faq-15', 'faq-cat-trocas', 'Qual a política de troca e devolução?', 'Você tem 7 dias para trocar/devolver produtos não perecíveis. Para produtos perecíveis, aceite apenas se estiver satisfeito na entrega. Motivos aceitos: produto danificado, diferente do pedido, ou insatisfação. O produto deve estar na embalagem original. Estornamos em até 5 dias úteis.', 1, 312, 67, 11, true),

('faq-16', 'faq-cat-trocas', 'Como solicitar uma troca ou devolução?', 'Processo simples: 1) Acesse "Meus Pedidos" 2) Clique em "Solicitar troca/devolução" 3) Selecione o motivo 4) Envie fotos se necessário 5) Aguarde aprovação (até 24h) 6) Coletamos o produto gratuitamente. Você acompanha todo o processo pelo site.', 2, 189, 45, 7, true),

('faq-17', 'faq-cat-trocas', 'Vocês fazem reembolso em dinheiro?', 'Sim! Fazemos reembolso: • PIX: até 24 horas • Cartão de crédito: 5-10 dias úteis • Boleto: transferência bancária em até 5 dias • Você também pode optar por crédito na loja (disponível imediatamente) com 10% de bônus. O valor inclui o frete pago.', 3, 156, 41, 5, true),

-- CATEGORIA: SUPORTE TÉCNICO
('faq-18', 'faq-cat-tecnico', 'O site está lento ou com erro, o que fazer?', 'Primeiro, tente: 1) Atualizar a página (F5) 2) Limpar cache do navegador 3) Testar em aba anônima 4) Verificar sua conexão. Se persistir, entre em contato informando: navegador usado, tipo de erro e horário. Temos suporte técnico 24/7 via chat.', 1, 234, 52, 8, true),

('faq-19', 'faq-cat-tecnico', 'Como usar o aplicativo mobile?', 'Baixe na App Store ou Google Play. Funcionalidades: • Login com mesma conta do site • Notificações push de ofertas • Escaneamento de código de barras • Localização automática para frete • Chat integrado. O app sincroniza automaticamente com o site.', 2, 178, 43, 6, true),

('faq-20', 'faq-cat-tecnico', 'Meu pagamento foi recusado, por quê?', 'Principais motivos: • Dados do cartão incorretos • Limite insuficiente • Cartão vencido/bloqueado • Problema no banco emissor • CEP não confere. Verifique os dados e tente novamente. Se persistir, use PIX ou entre em contato com seu banco. Oferecemos suporte para resolver.', 3, 267, 48, 12, true);

-- 3. INSERIR ALGUNS FEEDBACKS DE EXEMPLO
INSERT INTO faq_feedback (faq_item_id, session_id, is_helpful, feedback_text, created_at) VALUES
('faq-1', 'session_demo_1', true, NULL, NOW() - INTERVAL '2 days'),
('faq-1', 'session_demo_2', true, NULL, NOW() - INTERVAL '1 day'),
('faq-2', 'session_demo_3', false, 'Poderia ter informações mais específicas sobre entrega expressa', NOW() - INTERVAL '3 hours'),
('faq-9', 'session_demo_4', true, 'Muito claro, obrigado!', NOW() - INTERVAL '1 hour'),
('faq-15', 'session_demo_5', NULL, 'Sugestão: adicionar informações sobre troca por tamanho diferente', NOW() - INTERVAL '30 minutes');

-- 4. ATUALIZAR CONTADORES (caso não estejam corretos)
UPDATE faq_items SET 
  helpful_count = (SELECT COUNT(*) FROM faq_feedback WHERE faq_item_id = faq_items.id AND is_helpful = true),
  not_helpful_count = (SELECT COUNT(*) FROM faq_feedback WHERE faq_item_id = faq_items.id AND is_helpful = false);

-- 5. INSERIR CATEGORIAS DE SUPORTE TAMBÉM
INSERT INTO support_categories (id, name, description, icon, color, order_index, is_active) VALUES
('support-pedidos', 'Problemas com Pedidos', 'Questões sobre pedidos em andamento, atrasos ou problemas na entrega', 'shopping-bag', '#ef4444', 1, true),
('support-produtos', 'Qualidade dos Produtos', 'Reclamações sobre qualidade, produtos danificados ou diferentes do esperado', 'cube', '#f59e0b', 2, true),
('support-pagamento', 'Problemas de Pagamento', 'Dificuldades com pagamento, cobrança indevida ou reembolsos', 'credit-card', '#10b981', 3, true),
('support-tecnico', 'Suporte Técnico', 'Problemas com o site, aplicativo ou dificuldades para usar a plataforma', 'cog', '#6366f1', 4, true),
('support-comercial', 'Comercial e Vendas', 'Dúvidas sobre produtos, orçamentos, parcerias ou venda em grande escala', 'briefcase', '#8b5cf6', 5, true),
('support-geral', 'Outros Assuntos', 'Sugestões, elogios, reclamações gerais ou assuntos não categorizados', 'chat-bubble-left-right', '#6b7280', 6, true);

COMMIT; 